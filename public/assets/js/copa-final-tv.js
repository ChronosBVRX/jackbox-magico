(function () {
  const houseIcons = { Gryffindor: "🦁", Slytherin: "🐍", Ravenclaw: "🦅", Hufflepuff: "🦡" };
  const houseColors = { Gryffindor: "#c0392b", Slytherin: "#27ae60", Ravenclaw: "#2980b9", Hufflepuff: "#f1c40f" };
  const letters = ["A", "B", "C", "D"];
  let lastCueKey = "";

  function safeText(value) { return String(value ?? ""); }
  function esc(value) { return safeText(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function play(name) { try { if (window.MagicSound && MagicSound.play) MagicSound.play(name); } catch (e) {} }
  function show(id) { if (typeof window.showScreen === "function") window.showScreen(id); }
  function scores(players) {
    const totals = { Gryffindor: 0, Slytherin: 0, Ravenclaw: 0, Hufflepuff: 0 };
    (players || []).forEach((p) => { totals[p.house] = (totals[p.house] || 0) + Number(p.score || 0); });
    return totals;
  }
  function activeHouses(players) {
    const set = new Set((players || []).map((p) => p.house).filter(Boolean));
    return ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"].filter((h) => set.has(h));
  }
  function statusCount(state, players) {
    const active = activeHouses(players);
    const status = state.wager_status_by_house || {};
    return { done: active.filter((h) => status[h]).length, total: active.length || 4 };
  }
  function answerCount(state, players) {
    const active = activeHouses(players);
    const answers = state.house_answers || {};
    return { done: active.filter((h) => answers[h]).length, total: active.length || 4 };
  }
  function houseCards(state, players, mode) {
    const totals = scores(players);
    const active = activeHouses(players);
    const wagerStatus = state.wager_status_by_house || {};
    const answers = state.house_answers || {};
    const conflicts = state.answer_conflicts || {};
    return ["Gryffindor", "Slytherin", "Ravenclaw", "Hufflepuff"].map((house) => {
      const isActive = active.includes(house);
      const sealed = Boolean(wagerStatus[house]);
      const answered = Boolean(answers[house]);
      const conflict = Boolean(conflicts[house]);
      let status = "Esperando jugadores";
      let cls = "";
      if (isActive && mode === "bet") { status = sealed ? "Apuesta sellada" : "Eligiendo apuesta secreta"; cls = sealed ? "done" : ""; }
      if (isActive && mode === "answer") { status = conflict ? "Conflicto de respuestas" : answered ? "Respuesta enviada" : "Deliberando como casa"; cls = conflict ? "danger" : answered ? "done" : ""; }
      return `<div class="copa-house" style="box-shadow:inset 5px 0 0 ${houseColors[house] || "#facc15"}"><div class="copa-house-top"><div class="copa-house-name">${houseIcons[house] || "✨"} ${esc(house)}</div><div class="copa-score">${Number(totals[house] || 0)}</div></div><div class="copa-status ${cls}">${esc(status)}</div></div>`;
    }).join("");
  }
  function sideScore(players) {
    const totals = scores(players);
    return Object.keys(totals).sort((a,b)=>totals[b]-totals[a]).map((h)=>`<div class="copa-small-row"><span>${houseIcons[h] || "✨"} ${esc(h)}</span><strong>${Number(totals[h] || 0)}</strong></div>`).join("");
  }
  function frame(inner) {
    return `<section class="copa-stage"><div class="copa-light"></div><div class="copa-table"></div><div class="copa-content">${inner}</div></section>`;
  }
  function header(state, kicker) {
    return `<div class="copa-header"><div><div class="copa-pill">🏆 ${esc(kicker)}</div><h1 class="copa-title">${esc(state.title || "Copa Final")}</h1><p class="copa-subtitle">${esc(state.subtitle || "La última ronda puede cambiarlo todo.")}</p></div><div class="copa-trophy"><div class="cup">🏆</div><span>${esc(state.final_label || "Pregunta Final")}</span><strong>${esc(state.final_type || "final")}</strong></div></div>`;
  }
  function renderBetting(data) {
    const state = data.game_state || {}; const players = data.players || []; const count = statusCount(state, players); const pct = count.total ? Math.round(count.done / count.total * 100) : 0;
    const key = `${state.phase}-${count.done}`; if (key !== lastCueKey) { lastCueKey = key; play(count.done ? "send" : "reveal"); }
    return frame(`${header(state, "Apuesta secreta")}<div class="copa-grid"><div class="copa-card"><h2 class="copa-question">Las casas están sellando su destino.</h2><div class="copa-narrator">“${esc(state.narrator || "La Copa de las Casas está en juego.")}”</div><div class="copa-houses" style="margin-top:18px">${houseCards(state, players, "bet")}</div><div class="copa-progress"><div style="width:${pct}%"></div></div></div><aside class="copa-side"><h3 class="copa-side-title">Marcador actual</h3>${sideScore(players)}<div class="copa-narrator">${count.done}/${count.total} casas ya apostaron. La cantidad permanece secreta hasta resultados.</div></aside></div>`);
  }
  function renderQuestion(data) {
    const state = data.game_state || {}; const players = data.players || []; const count = answerCount(state, players); const pct = count.total ? Math.round(count.done / count.total * 100) : 0;
    const key = `${state.phase}-${state.round_id}`; if (key !== lastCueKey) { lastCueKey = key; play("reveal"); }
    const sequence = (state.sequence || []).length ? `<div class="copa-sequence">${state.sequence.map((x)=>`<span>${esc(x)}</span>`).join("")}</div>` : "";
    const options = (state.options || []).map((o,i)=>`<div class="copa-option"><div class="copa-letter">${letters[i] || "?"}</div><div class="copa-option-text">${esc(o)}</div></div>`).join("");
    return frame(`${header(state, "Pregunta revelada")}<div class="copa-grid"><div class="copa-card"><h2 class="copa-question">${esc(state.question || "Pregunta final")}</h2>${sequence}<div class="copa-options">${options}</div><div class="copa-narrator">“${esc(state.narrator || "Una sola pregunta puede cambiar la historia de la Copa.")}”</div></div><aside class="copa-side"><h3 class="copa-side-title">Respuestas de casa</h3>${houseCards(state, players, "answer")}<div class="copa-progress"><div style="width:${pct}%"></div></div></aside></div>`);
  }
  function renderResults(data) {
    const state = data.game_state || {}; const result = state.copa_final_result || {}; const houses = result.houses || []; const key = `${state.phase}-${houses.map(h=>h.delta).join("|")}`;
    if (key !== lastCueKey) {
      lastCueKey = key;
      play("applause");
      
      const totals = scores(data.players || []);
      const houseList = Object.keys(totals);
      if (houseList.length > 0) {
        const topScore = Math.max(...houseList.map(h => totals[h]));
        const winners = houseList.filter(h => totals[h] === topScore);
        
        if (winners.length > 1) {
          window.VoiceLinesTv?.playWinnerVoice("empate");
        } else {
          window.VoiceLinesTv?.playWinnerVoice(winners[0]);
        }
        
        setTimeout(() => {
          window.VoiceLinesTv?.play("final", { volume: 0.9 });
        }, 9000);
      }
    }
    const cards = houses.map((h)=>`<div class="copa-result-house ${Number(h.delta || 0) >= 0 ? "good" : "bad"}"><div class="copa-house-top"><div class="copa-house-name">${houseIcons[h.house] || "✨"} ${esc(h.house)}</div><div class="copa-delta">${Number(h.delta || 0) >= 0 ? "+" : ""}${Number(h.delta || 0)}</div></div><div class="copa-answer-line">Apuesta: ${esc(h.wager?.label || "0 puntos")} ${h.wager?.all_in ? "· Todo o nada" : ""}</div><div class="copa-answer-line">Respuesta: ${esc(h.answer || "Sin respuesta")}</div><div class="copa-answer-line">${h.correct ? "✅ Correcta" : "❌ Incorrecta"}${h.bonus ? ` · Bonus +${h.bonus}` : ""}</div>${h.narrator ? `<div class="copa-narrator">${esc(h.narrator)}</div>` : ""}</div>`).join("");
    return frame(`<div class="copa-pill" style="margin:auto">🏆 Resultado final</div><h1 class="copa-result-title">${esc(result.title || "Resultado de la Pregunta Final")}</h1><div class="copa-card" style="margin-bottom:14px;text-align:center"><h2 class="copa-question" style="font-size:clamp(1.7rem,3vw,3.2rem)">${esc(result.question || state.question || "Pregunta final")}</h2><div class="copa-narrator">Respuesta correcta: <strong>${esc(result.correct_answer || state.correct_label || "")}</strong><br>${esc(result.explanation || "")}</div></div><div class="copa-results-grid">${cards}</div><div class="copa-narrator" style="text-align:center;margin-top:16px">${esc(result.narrator || state.narrator || "La Copa de las Casas ha decidido.")}</div>`);
  }
  function renderCopa(data) {
    show("view-game");
    const container = document.getElementById("game-container"); if (!container) return;
    const phase = data.game_state?.phase;
    if (phase === "copa_final_betting" || phase === "copa_final") container.innerHTML = renderBetting(data);
    if (phase === "copa_final_question") container.innerHTML = renderQuestion(data);
    if (phase === "results_copa_final") container.innerHTML = renderResults(data);
  }
  const originalPlaying = window.renderPlaying;
  const originalResults = window.renderResults;
  window.renderPlaying = function (data) {
    const phase = data?.game_state?.phase;
    if (["copa_final_betting", "copa_final_question", "copa_final"].includes(phase)) return renderCopa(data);
    if (typeof originalPlaying === "function") return originalPlaying(data);
  };
  window.renderResults = function (data) {
    if (data?.game_state?.phase === "results_copa_final") return renderCopa(data);
    if (typeof originalResults === "function") return originalResults(data);
  };
})();
