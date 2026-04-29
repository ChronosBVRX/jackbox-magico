(() => {
  const PHASE = "patronus_personalizado";
  const PREFIX = "PATRONUS_V1";

  const POINTS = {
    first: 150,
    second: 100,
    vote: 20,
    zero: 10,
    house: 100,
  };

  let lastKey = "";
  let lastRenderSignature = "";

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function d64(value) {
    try {
      const clean = String(value || "")
        .replaceAll("-", "+")
        .replaceAll("_", "/");

      const padded = clean + "=".repeat((4 - (clean.length % 4)) % 4);
      const binary = atob(padded);

      return decodeURIComponent(
        [...binary]
          .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
          .join("")
      );
    } catch (error) {
      return "";
    }
  }

  function parseEventKey(key) {
    const parts = String(key || "").split("::");

    if (parts[0] !== PREFIX) return null;

    if (parts[1] === "ANSWER" && parts.length >= 6) {
      return {
        type: "answer",
        roundId: d64(parts[2]),
        player: d64(parts[3]),
        house: d64(parts[4]),
        answer: d64(parts[5]),
      };
    }

    if (parts[1] === "VOTE" && parts.length >= 5) {
      return {
        type: "vote",
        roundId: d64(parts[2]),
        voter: d64(parts[3]),
        target: d64(parts[4]),
      };
    }

    if (parts[1] === "CTRL" && parts.length >= 5) {
      return {
        type: "control",
        roundId: d64(parts[2]),
        action: d64(parts[3]),
      };
    }

    return null;
  }

  function houseIcon(house) {
    return (
      {
        Gryffindor: "🦁",
        Slytherin: "🐍",
        Ravenclaw: "🦅",
        Hufflepuff: "🦡",
      }[house] || "✨"
    );
  }

  function parseState(state = {}, players = []) {
    const roundId = state.round_id || "";
    const submissions = {};
    const votesByVoter = {};
    const controls = new Set();
    const validPlayers = new Set(players.map((player) => player.name));

    Object.keys(state.votes || {}).forEach((key) => {
      const event = parseEventKey(key);

      if (!event || event.roundId !== roundId) return;

      if (event.type === "answer" && event.player && !submissions[event.player]) {
        submissions[event.player] = {
          player: event.player,
          house:
            event.house ||
            players.find((player) => player.name === event.player)?.house,
          answer: String(event.answer || "").slice(0, 80),
        };
      }

      if (event.type === "vote" && event.voter && event.target) {
        votesByVoter[event.voter] = event.target;
      }

      if (event.type === "control") {
        controls.add(event.action);
      }
    });

    const total = players.length || Number(state.total_players || 0);
    const submitted = Object.keys(submissions).length;
    const voted = Object.keys(votesByVoter).length;

    let stage = "writing";

    if (controls.has("RESULTS") || state.phase === "results_patronus_personalizado") {
      stage = "results";
    } else if (controls.has("VOTING") || (submitted >= total && submitted > 1)) {
      stage = "voting";
    }

    const voteCounts = {};

    Object.keys(submissions).forEach((target) => {
      voteCounts[target] = 0;
    });

    Object.entries(votesByVoter).forEach(([voter, target]) => {
      if (!validPlayers.has(voter)) return;
      if (!(target in voteCounts)) return;
      if (voter === target) return;

      voteCounts[target] += 1;
    });

    const ranking = Object.values(submissions).sort((a, b) => {
      const voteDiff = (voteCounts[b.player] || 0) - (voteCounts[a.player] || 0);

      if (voteDiff !== 0) return voteDiff;

      return a.player.localeCompare(b.player);
    });

    const houseVoteTotals = {};

    Object.entries(voteCounts).forEach(([target, count]) => {
      const house = submissions[target]?.house;

      if (!house) return;

      houseVoteTotals[house] = (houseVoteTotals[house] || 0) + count;
    });

    const bestHouseVotes = Math.max(0, ...Object.values(houseVoteTotals));

    const winningHouses =
      bestHouseVotes > 0
        ? Object.entries(houseVoteTotals)
            .filter(([, count]) => count === bestHouseVotes)
            .map(([house]) => house)
        : [];

    const pointEvents = [];

    Object.values(submissions).forEach((submission) => {
      const count = voteCounts[submission.player] || 0;

      pointEvents.push({
        player: submission.player,
        house: submission.house,
        points: count ? count * POINTS.vote : POINTS.zero,
        label: count ? `${count} voto(s) recibido(s)` : "Lástima mágica",
      });
    });

    if (ranking[0]) {
      pointEvents.push({
        player: ranking[0].player,
        house: ranking[0].house,
        points: POINTS.first,
        label: "Respuesta más votada",
      });
    }

    if (ranking[1] && (voteCounts[ranking[1].player] || 0) > 0) {
      pointEvents.push({
        player: ranking[1].player,
        house: ranking[1].house,
        points: POINTS.second,
        label: "Segundo lugar",
      });
    }

    players.forEach((player) => {
      if (winningHouses.includes(player.house)) {
        pointEvents.push({
          player: player.name,
          house: player.house,
          points: POINTS.house,
          label: "Bonus casa",
        });
      }
    });

    return {
      roundId,
      submissions,
      votesByVoter,
      voteCounts,
      total,
      submitted,
      voted,
      stage,
      ranking,
      houseVoteTotals,
      winningHouses,
      pointEvents,
    };
  }

  function buildRenderSignature(state, parsed, players) {
    return JSON.stringify({
      phase: state.phase,
      roundId: parsed.roundId,
      stage: parsed.stage,
      question: state.question,
      submitted: parsed.submitted,
      voted: parsed.voted,
      total: parsed.total,
      ranking: parsed.ranking.map((item) => ({
        player: item.player,
        house: item.house,
        answer: item.answer,
        votes: parsed.voteCounts[item.player] || 0,
      })),
      players: players.map((player) => ({
        name: player.name,
        house: player.house,
        score: player.score,
      })),
      controlsCount: Object.keys(state.votes || {}).filter((key) =>
        key.includes("CTRL")
      ).length,
    });
  }

  function renderProgress(players, parsed, mode) {
    return players
      .map((player) => {
        const ready =
          mode === "votes"
            ? Boolean(parsed.votesByVoter[player.name])
            : Boolean(parsed.submissions[player.name]);

        return `
          <div class="patronus-player-row ${ready ? "done" : ""}">
            <span>${houseIcon(player.house)} ${esc(player.name)}</span>
            <span class="patronus-status-dot">${ready ? "Listo" : "Pendiente"}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderHouseVotes(parsed) {
    const entries = Object.entries(parsed.houseVoteTotals || {}).sort(
      (a, b) => b[1] - a[1]
    );

    if (!entries.length) {
      return `
        <div class="patronus-empty" style="min-height:120px">
          Aún no hay votos por casa.
        </div>
      `;
    }

    return entries
      .map(
        ([house, votes]) => `
          <div class="patronus-house-row">
            <span>${houseIcon(house)} ${esc(house)}</span>
            <strong>${votes} votos</strong>
          </div>
        `
      )
      .join("");
  }

  function renderAnswers(parsed, state, showVotes = false) {
    if (!parsed.ranking.length) {
      return `
        <div class="patronus-empty">
          Esperando respuestas desde los celulares...<br>
          La luz plateada todavía está cargando.
        </div>
      `;
    }

    const maxVotes = Math.max(1, ...Object.values(parsed.voteCounts || {}));
    const showNames = Boolean(state.settings?.show_names);

    return parsed.ranking
      .map((item, index) => {
        const votes = parsed.voteCounts[item.player] || 0;
        const width = Math.round((votes / maxVotes) * 100);

        const label = showNames
          ? `${item.player} · ${item.house || "Sin casa"}`
          : `Respuesta ${index + 1}`;

        return `
          <article class="patronus-answer-card">
            <div class="patronus-answer-top">
              <span class="patronus-answer-label">${esc(label)}</span>
              <span class="patronus-answer-votes">
                ${parsed.stage !== "writing" || showVotes ? `${votes} voto(s)` : "Oculta"}
              </span>
            </div>

            <p class="patronus-answer-text">“${esc(item.answer)}”</p>

            ${
              parsed.stage !== "writing"
                ? `
                  <div class="patronus-bar">
                    <div style="width:${width}%"></div>
                  </div>
                `
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  function renderResults(parsed, state, players) {
    const first = parsed.ranking[0];
    const second = parsed.ranking[1];
    const totals = {};

    parsed.pointEvents.forEach((event) => {
      totals[event.player] = (totals[event.player] || 0) + Number(event.points || 0);
    });

    const pointRows = Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([name, points]) => {
        const house = players.find((player) => player.name === name)?.house;

        return `
          <div class="patronus-points-chip">
            <span>${houseIcon(house)} ${esc(name)}</span>
            <strong>+${points}</strong>
          </div>
        `;
      })
      .join("");

    return `
      <h2 class="patronus-results-title">El Patronus más poderoso</h2>

      <div class="patronus-podium">
        <div class="patronus-result-card winner">
          <div class="patronus-rank">🏆 Primer lugar</div>

          <div class="patronus-result-answer">
            ${first ? `“${esc(first.answer)}”` : "Sin ganador"}
          </div>

          <div class="patronus-result-meta">
            ${
              first
                ? `${esc(first.player)} · ${parsed.voteCounts[first.player] || 0} voto(s) · +${POINTS.first}`
                : "Nadie invocó nada."
            }
          </div>
        </div>

        <div class="patronus-result-card">
          <div class="patronus-rank">🥈 Segundo lugar</div>

          <div class="patronus-result-answer">
            ${second ? `“${esc(second.answer)}”` : "Sin segundo lugar"}
          </div>

          <div class="patronus-result-meta">
            ${
              second
                ? `${esc(second.player)} · ${parsed.voteCounts[second.player] || 0} voto(s) · +${POINTS.second}`
                : "La magia no alcanzó para tanto drama."
            }
          </div>
        </div>
      </div>

      <div class="patronus-grid">
        <div class="patronus-answers">
          ${renderAnswers(parsed, state, true)}
        </div>

        <aside class="patronus-side-card">
          <h3 class="patronus-side-title">Puntos de la ronda</h3>

          <div class="patronus-points-list">
            ${
              pointRows ||
              `<div class="patronus-empty" style="min-height:120px">
                Sin puntos asignados.
              </div>`
            }
          </div>

          <div class="patronus-narrator">
            ${
              parsed.winningHouses.length
                ? `Bonus de casa: ${parsed.winningHouses
                    .map((house) => `${houseIcon(house)} ${esc(house)}`)
                    .join(", ")}.`
                : "Ninguna casa dominó la votación."
            }
          </div>
        </aside>
      </div>
    `;
  }

  function render(data = {}) {
    const state = data.game_state || {};
    const players = data.players || state.players || [];
    const box = document.getElementById("game-container");

    if (!box) return;

    if (typeof showScreen === "function") {
      showScreen("view-game");
    }

    const parsed = parseState(state, players);

    const signature = buildRenderSignature(state, parsed, players);

    // Esta línea es la que evita el parpadeo:
    // si nada cambió, no se destruye ni se vuelve a crear el HTML.
    if (signature === lastRenderSignature) {
      return;
    }

    lastRenderSignature = signature;

    const key = `${parsed.roundId}-${parsed.stage}`;

    if (key !== lastKey) {
      lastKey = key;

      try {
        if (typeof playMagicSound === "function") {
          playMagicSound(parsed.stage === "results" ? "success" : "start");
        }
      } catch (error) {}
    }

    const counterLabel =
      parsed.stage === "writing"
        ? "Respuestas"
        : parsed.stage === "voting"
          ? "Votos"
          : "Resultado";

    const counterValue =
      parsed.stage === "writing"
        ? `${parsed.submitted}/${parsed.total}`
        : parsed.stage === "voting"
          ? `${parsed.voted}/${parsed.total}`
          : "✨";

    const stageText =
      parsed.stage === "writing"
        ? "Fase 1 · Escriban una respuesta corta desde el celular"
        : parsed.stage === "voting"
          ? "Fase 2 · Voten por la respuesta más graciosa"
          : "Fase 3 · Revelación de puntos";

    const body =
      parsed.stage === "results"
        ? renderResults(parsed, state, players)
        : `
          <section class="patronus-question-card">
            <p class="patronus-pill">${esc(stageText)}</p>

            <h2 class="patronus-question">
              ${esc(state.question || "Tu Patronus aparece, pero viene raro. ¿Qué forma tiene?")}
            </h2>

            <div class="patronus-narrator">
              ${esc(state.narrator || "Tu Patronus ha aparecido… y necesita terapia.")}
            </div>
          </section>

          <div class="patronus-grid">
            <div class="patronus-answers">
              ${
                parsed.stage === "writing"
                  ? `
                    <div class="patronus-empty">
                      Los jugadores están invocando respuestas.<br>
                      Cuando todos terminen, aparecerán para votar.
                    </div>
                  `
                  : renderAnswers(parsed, state, false)
              }
            </div>

            <aside class="patronus-side-card">
              <h3 class="patronus-side-title">
                ${parsed.stage === "writing" ? "Invocaciones" : "Votación"}
              </h3>

              ${renderProgress(
                players,
                parsed,
                parsed.stage === "writing" ? "answers" : "votes"
              )}

              <div class="patronus-narrator">
                ${
                  parsed.stage === "writing"
                    ? "Máximo 80 caracteres. Respuesta corta, golpe directo."
                    : "Nadie puede votar por su propia respuesta. El Patronus odia el autopremio."
                }
              </div>

              <h3 class="patronus-side-title" style="margin-top:14px">
                Votos por casa
              </h3>

              ${renderHouseVotes(parsed)}
            </aside>
          </div>
        `;

    box.innerHTML = `
      <section class="patronus-stage">
        <div class="patronus-orb"></div>
        <div class="patronus-forest"></div>

        <div class="patronus-content">
          <header class="patronus-header">
            <div>
              <div class="patronus-pill">
                🦌 Copa de las Casas · Patronus Personalizado
              </div>

              <h1 class="patronus-title">Patronus Personalizado</h1>

              <p class="patronus-subtitle">
                Respuestas anónimas, votación social y humor mágico en español latino.
              </p>
            </div>

            <div class="patronus-counter-card">
              <span>${esc(counterLabel)}</span>
              <strong>${esc(counterValue)}</strong>
            </div>
          </header>

          ${body}
        </div>
      </section>
    `;
  }

  function install() {
    if (window.__patronusTvInstalled) return;

    window.__patronusTvInstalled = true;

    const originalRenderPlaying = window.renderPlaying;
    const originalRenderResults = window.renderResults;

    if (typeof originalRenderPlaying === "function") {
      window.renderPlaying = function patchedRenderPlaying(data = {}) {
        if (data.game_state?.phase === PHASE || data.game_state?.phase === "results_patronus_personalizado") {
          render(data);
          return;
        }

        originalRenderPlaying(data);
      };
    }

    if (typeof originalRenderResults === "function") {
      window.renderResults = function patchedRenderResults(data = {}) {
        if (data.game_state?.phase === PHASE || data.game_state?.phase === "results_patronus_personalizado") {
          render(data);
          return;
        }

        originalRenderResults(data);
      };
    }
  }

  const timer = setInterval(() => {
    if (typeof window.renderPlaying === "function") {
      clearInterval(timer);
      install();
    }
  }, 80);

  window.PatronusPersonalizadoTv = {
    render,
    parseState,
  };
})();
