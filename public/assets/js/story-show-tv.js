(() => {
  const HOUSE_ICONS = {
    Gryffindor: "🦁",
    Slytherin: "🐍",
    Ravenclaw: "🦅",
    Hufflepuff: "🦡",
  };

  let lastRoom = "";
  let lastRevealKey = "";
  let lastAwardsKey = "";
  let lastLeader = "";
  let lastFinaleKey = "";

  function getRoomCode() {
    const domCode = document.getElementById("tv-code")?.textContent?.trim();
    if (domCode && domCode !== "----") {
      lastRoom = domCode.toUpperCase();
      return lastRoom;
    }
    try {
      if (typeof currentRoom !== "undefined" && currentRoom) {
        lastRoom = String(currentRoom).toUpperCase();
        return lastRoom;
      }
    } catch (error) {}
    return lastRoom;
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getPhase(data) {
    return data?.game_state?.phase || data?.status || "lobby";
  }

  function isResults(data) {
    return String(getPhase(data)).startsWith("results_");
  }

  function getCorrectAnswer(state = {}) {
    return state.correct_label || state.correct || state.answer || state.correct_answer || "La Copa se niega a decirlo";
  }

  function getQuestionText(state = {}) {
    return state.question || state.question_text || state.attack_msg || state.prompt || "Pregunta misteriosa";
  }

  function extractPlayerAnswers(data) {
    const state = data.game_state || {};
    const players = data.players || [];
    const answers = state.answers || state.player_answers || state.responses || {};

    return players.map((player) => {
      const name = player.name || "Jugador";
      const raw = answers[name] || answers[player.id] || answers[player.player_id] || player.last_answer || player.answer || "respuesta secreta";
      const value = typeof raw === "object" ? (raw.label || raw.answer || raw.value || raw.choice || "respuesta enviada") : raw;
      return {
        name,
        house: player.house || "",
        score: Number(player.score || 0),
        answer: String(value || "respuesta enviada"),
      };
    });
  }

  function scoreByHouse(players = []) {
    const scores = {};
    players.forEach((player) => {
      const house = player.house || "Sin casa";
      scores[house] = (scores[house] || 0) + Number(player.score || 0);
    });
    return scores;
  }

  function sortedHouses(data) {
    return Object.entries(scoreByHouse(data.players || [])).sort((a, b) => b[1] - a[1]);
  }

  async function fetchStatus(room) {
    try {
      const res = await fetch(`/api/room/${room}/status?storyShowTs=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (error) {
      return null;
    }
  }

  function ensureOverlay(id) {
    let el = document.getElementById(id);
    if (el) return el;
    el = document.createElement("div");
    el.id = id;
    document.body.appendChild(el);
    return el;
  }

  function showDramaticReveal(data) {
    if (!isResults(data)) return;
    const state = data.game_state || {};
    const key = `${getPhase(data)}:${state.round_id || state.question || state.correct_label || state.correct || "result"}`;
    if (key === lastRevealKey) return;
    lastRevealKey = key;

    const answers = extractPlayerAnswers(data).slice(0, 8);
    const overlay = ensureOverlay("story-dramatic-reveal");
    overlay.innerHTML = `
      <div class="story-reveal-card">
        <div class="story-reveal-kicker">La Copa revisa las respuestas</div>
        <h2>${escapeHTML(getQuestionText(state))}</h2>
        <div class="story-reveal-answers">
          ${answers.map((item) => `
            <div class="story-reveal-answer">
              <span>${escapeHTML(HOUSE_ICONS[item.house] || "✨")} ${escapeHTML(item.name)}</span>
              <strong>${escapeHTML(item.answer)}</strong>
            </div>
          `).join("")}
        </div>
        <div class="story-reveal-correct">Respuesta correcta: <strong>${escapeHTML(getCorrectAnswer(state))}</strong></div>
      </div>
    `;
    overlay.classList.add("visible");
    setTimeout(() => overlay.classList.remove("visible"), 6500);
  }

  function buildAwards(data) {
    const players = [...(data.players || [])];
    if (!players.length) return [];
    const sorted = [...players].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const low = [...players].sort((a, b) => Number(a.score || 0) - Number(b.score || 0));
    const random = players[Math.abs((getPhase(data) + JSON.stringify(data.game_state || {})).length) % players.length];

    return [
      {
        title: "Premio Hermione",
        text: `${sorted[0]?.name || "Alguien"} trae la mano caliente. Sospechosamente preparado.`,
      },
      {
        title: "Premio Ron",
        text: `${low[0]?.name || "Alguien"} respondió con valor, aunque la realidad opinó diferente.`,
      },
      {
        title: "Premio Peeves",
        text: `${random?.name || "Alguien"} aporta caos narrativo. No suma mucho, pero entretiene.`,
      },
    ];
  }

  function showAbsurdAwards(data) {
    if (!isResults(data)) return;
    const state = data.game_state || {};
    const key = `${getPhase(data)}:${state.round_id || state.question || state.correct_label || "awards"}`;
    if (key === lastAwardsKey) return;
    lastAwardsKey = key;

    const awards = buildAwards(data);
    if (!awards.length) return;

    const overlay = ensureOverlay("story-awards-overlay");
    overlay.innerHTML = `
      <div class="story-awards-card">
        <div class="story-awards-kicker">Premios absurdos de la ronda</div>
        <div class="story-awards-grid">
          ${awards.map((award) => `
            <div class="story-award">
              <strong>${escapeHTML(award.title)}</strong>
              <span>${escapeHTML(award.text)}</span>
            </div>
          `).join("")}
        </div>
      </div>
    `;
    setTimeout(() => {
      overlay.classList.add("visible");
      setTimeout(() => overlay.classList.remove("visible"), 7600);
    }, 6600);
  }

  function checkLeaderChange(data) {
    const entries = sortedHouses(data);
    if (!entries.length) return;
    const leader = entries[0][0];
    if (!lastLeader) {
      lastLeader = leader;
      return;
    }
    if (leader === lastLeader) return;

    const previous = lastLeader;
    lastLeader = leader;

    const overlay = ensureOverlay("story-leader-change");
    overlay.innerHTML = `
      <div class="story-leader-card">
        <div>⚡ Cambio de líder</div>
        <h2>${escapeHTML(HOUSE_ICONS[leader] || "🏆")} ${escapeHTML(leader)}</h2>
        <p>acaba de superar a ${escapeHTML(previous)}. El Gran Comedor está incómodo.</p>
      </div>
    `;
    overlay.classList.add("visible");
    setTimeout(() => overlay.classList.remove("visible"), 6000);
  }

  function isFinalResults(data) {
    const state = data.game_state || {};
    return isResults(data) && (state.current_game_id === "copa_final" || getPhase(data).includes("copa"));
  }

  function showFinalCeremony(data) {
    if (!isFinalResults(data)) return;
    const key = `${getPhase(data)}:${data.game_state?.round_id || "final"}`;
    if (key === lastFinaleKey) return;
    lastFinaleKey = key;

    const houses = sortedHouses(data);
    const players = [...(data.players || [])].sort((a, b) => Number(b.score || 0) - Number(a.score || 0));
    const overlay = ensureOverlay("story-final-ceremony");
    overlay.innerHTML = `
      <div class="story-final-card">
        <div class="story-final-kicker">Ceremonia de la Copa</div>
        <h2>Casa ganadora: ${escapeHTML(houses[0]?.[0] || "La amistad, aparentemente")}</h2>
        <div class="story-final-places">
          ${houses.map(([house, score], index) => `
            <div class="story-final-place">
              <strong>${index + 1}. ${escapeHTML(HOUSE_ICONS[house] || "✨")} ${escapeHTML(house)}</strong>
              <span>${Number(score || 0)} pts</span>
            </div>
          `).join("")}
        </div>
        <div class="story-final-extra">
          <b>Jugador revelación:</b> ${escapeHTML(players[0]?.name || "La Copa se quedó pensando")} ·
          <b>Jugador caótico:</b> ${escapeHTML(players[players.length - 1]?.name || "Peeves")}
        </div>
      </div>
    `;
    setTimeout(() => overlay.classList.add("visible"), 5000);
  }

  function injectStyles() {
    if (document.getElementById("story-show-tv-style")) return;
    const style = document.createElement("style");
    style.id = "story-show-tv-style";
    style.textContent = `
      #story-dramatic-reveal,
      #story-awards-overlay,
      #story-leader-change,
      #story-final-ceremony {
        position: fixed;
        inset: 0;
        z-index: 10100;
        display: grid;
        place-items: center;
        padding: 30px;
        opacity: 0;
        pointer-events: none;
        transition: opacity .25s ease;
        background: radial-gradient(circle at center, rgba(255,216,121,.12), rgba(3,7,18,.68));
      }
      #story-dramatic-reveal.visible,
      #story-awards-overlay.visible,
      #story-leader-change.visible,
      #story-final-ceremony.visible { opacity: 1; }

      .story-reveal-card,
      .story-awards-card,
      .story-leader-card,
      .story-final-card {
        width: min(980px, 94vw);
        padding: clamp(24px, 4vw, 46px);
        border-radius: 36px;
        color: #fff7dc;
        text-align: center;
        background:
          radial-gradient(circle at 18% 0%, rgba(255,216,121,.24), transparent 36%),
          rgba(5,10,24,.88);
        border: 1px solid rgba(255,216,121,.34);
        box-shadow: 0 40px 130px rgba(0,0,0,.62);
        backdrop-filter: blur(18px);
      }
      .story-reveal-kicker,
      .story-awards-kicker,
      .story-final-kicker,
      .story-leader-card div:first-child {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        color: #271600;
        background: linear-gradient(135deg, #fff8d6, #facc15);
        font-weight: 1000;
        text-transform: uppercase;
        letter-spacing: .1em;
      }
      .story-reveal-card h2,
      .story-leader-card h2,
      .story-final-card h2 {
        margin: 14px 0;
        font-size: clamp(2rem, 5vw, 5rem);
        line-height: .95;
        letter-spacing: -.06em;
      }
      .story-reveal-answers,
      .story-awards-grid,
      .story-final-places {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin: 18px 0;
      }
      .story-reveal-answer,
      .story-award,
      .story-final-place {
        padding: 13px;
        border-radius: 18px;
        background: rgba(255,255,255,.075);
        border: 1px solid rgba(255,255,255,.10);
      }
      .story-reveal-answer span,
      .story-award strong,
      .story-final-place strong {
        display: block;
        color: #ffe7a3;
        font-weight: 1000;
      }
      .story-reveal-answer strong,
      .story-award span,
      .story-final-place span {
        display: block;
        color: rgba(255,248,221,.82);
        margin-top: 4px;
        font-weight: 850;
      }
      .story-reveal-correct,
      .story-final-extra {
        display: inline-block;
        margin-top: 8px;
        padding: 11px 15px;
        border-radius: 18px;
        color: #bbf7d0;
        background: rgba(34,197,94,.12);
        border: 1px solid rgba(74,222,128,.22);
        font-weight: 1000;
      }
      .story-leader-card p {
        color: rgba(255,248,221,.82);
        font-size: clamp(1rem, 2vw, 1.6rem);
        font-weight: 900;
      }
      @media (max-width: 760px) {
        .story-reveal-answers,
        .story-awards-grid,
        .story-final-places { grid-template-columns: 1fr; }
      }
    `;
    document.head.appendChild(style);
  }

  async function tick() {
    injectStyles();
    const room = getRoomCode();
    if (!room) return;
    const data = await fetchStatus(room);
    if (!data || data.game_state?.mode !== "story") return;
    
    const phase = getPhase(data);
    if (["scene_instructions", "scene_rules", "rules"].includes(phase)) return;

    showDramaticReveal(data);
    showAbsurdAwards(data);
    checkLeaderChange(data);
    showFinalCeremony(data);
  }

  document.addEventListener("DOMContentLoaded", () => {
    injectStyles();
    setInterval(tick, 1000);
    setTimeout(tick, 900);
  });
})();
