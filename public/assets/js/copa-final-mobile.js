(function () {
  const letters = ["A", "B", "C", "D"];
  let lastCopaState = null;
  let lastRoundKey = "";
  let answeredLocal = false;

  function safeText(value) { return String(value ?? ""); }
  function esc(value) { return safeText(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function attr(value) { return esc(value).replaceAll("`", "&#096;"); }
  function play(name) { try { if (window.MagicSound && MagicSound.play) MagicSound.play(name); } catch (e) {} }
  function vibrate(pattern) { try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e) {} }
  function show(id) { if (typeof window.showScreen === "function") window.showScreen(id); }
  function isHost() { return Boolean(window.myIsHost || (typeof myIsHost !== "undefined" && myIsHost)); }
  function myRoomValue() { return (window.myRoom || (typeof myRoom !== "undefined" ? myRoom : "") || "").toUpperCase(); }
  function myNameValue() { return window.myName || (typeof myName !== "undefined" ? myName : "") || ""; }
  function myHouseValue() { return window.myHouse || (typeof myHouse !== "undefined" ? myHouse : "") || ""; }
  function hostTokenValue() { return window.myHostToken || (typeof myHostToken !== "undefined" ? myHostToken : "") || ""; }
  function emitSocket(eventName, payload) { try { if (window.socket && window.socket.emit) window.socket.emit(eventName, payload); } catch(e) {} }

  function ensurePanel() {
    let panel = document.getElementById("copa-final-mobile-panel");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "copa-final-mobile-panel";
      panel.className = "copa-mobile-panel";
      const card = document.querySelector("#view-game .card");
      const hostGamePanel = document.getElementById("host-game-panel");
      if (hostGamePanel && hostGamePanel.parentElement) hostGamePanel.parentElement.insertBefore(panel, hostGamePanel);
      else if (card) card.appendChild(panel);
    }
    return panel;
  }
  function hidePanel() { const p = document.getElementById("copa-final-mobile-panel"); if (p) { p.classList.remove("visible"); p.innerHTML = ""; } }
  function setHostExtra(html) {
    try {
      if (typeof window.setHostExtraActions === "function") window.setHostExtraActions(html);
      else document.querySelectorAll(".trivia-mobile-host-extra").forEach((box)=>{ box.innerHTML = html; });
    } catch(e) {}
  }
  function baseScreen(state, title, subtitle) {
    show("view-game");
    const pill = document.getElementById("game-pill"); if (pill) pill.innerText = "🏆 Copa Final";
    const h = document.getElementById("m-pregunta-aviso"); if (h) h.innerText = title;
    const small = document.getElementById("m-question-small"); if (small) small.innerText = subtitle;
    const buttons = document.getElementById("m-botones"); if (buttons) buttons.innerHTML = "";
    const status = document.getElementById("mobile-status"); if (status) status.innerText = state.narrator || "La Copa de las Casas está en juego.";
    const timer = document.getElementById("mobile-timer"); if (timer) timer.style.display = "none";
    if (typeof window.showHostPanels === "function") window.showHostPanels(isHost());
  }
  function renderBetting(state) {
    baseScreen(state, "Apuesta secreta de casa", "Elijan 0, 100, 200, 300 o Todo o nada. Solo cuenta la primera apuesta enviada por tu casa.");
    const panel = ensurePanel(); panel.classList.add("visible");
    const sealed = Boolean((state.wager_status_by_house || {})[myHouseValue()]);
    const options = state.wager_options || [];
    panel.innerHTML = `<div class="copa-mobile-card"><div class="copa-mobile-content"><h2 class="copa-mobile-title">${sealed ? "Apuesta sellada" : "¿Cuánto apuesta tu casa?"}</h2><div id="copa-mobile-feedback" class="copa-mobile-status ${sealed ? "good" : ""}">${sealed ? "Tu casa ya apostó. La cantidad está protegida hasta resultados." : "Piensen bien: una casa que va perdiendo puede remontar, pero una apuesta absurda también puede hundirlos."}</div><div class="copa-mobile-options">${options.map((o)=>`<button class="copa-mobile-btn ${o.all_in ? "danger" : ""}" ${sealed ? "disabled" : ""} onclick="window.copaSubmitWager('${attr(o.value)}')">${esc(o.label)}${o.all_in ? " 🔥" : ""}</button>`).join("")}</div>${isHost() ? `<button class="copa-mobile-btn secondary" onclick="window.hostCopaOpenQuestion()">Revelar pregunta final</button>` : ""}</div></div>`;
    setHostExtra(isHost() ? `<button class="trivia-next-btn" onclick="window.hostCopaOpenQuestion()">Revelar pregunta final</button>` : "");
  }
  function renderQuestion(state) {
    const key = `${state.phase}-${state.round_id}`;
    if (key !== lastRoundKey) { lastRoundKey = key; answeredLocal = false; play("reveal"); vibrate([30,50,30]); }
    baseScreen(state, state.final_label || "Pregunta Final", "Los dos integrantes deben ponerse de acuerdo. Si responden distinto, aplica la regla de conflicto configurada.");
    const panel = ensurePanel(); panel.classList.add("visible");
    const house = myHouseValue();
    const submitted = Boolean((state.house_answers || {})[house]) || answeredLocal;
    const sequence = (state.sequence || []).length ? `<div class="copa-sequence">${state.sequence.map((x)=>`<span>${esc(x)}</span>`).join("")}</div>` : "";
    panel.innerHTML = `<div class="copa-mobile-card"><div class="copa-mobile-content"><h2 class="copa-mobile-title">${esc(state.question || "Pregunta final")}</h2>${sequence}<div class="copa-mobile-options">${(state.options || []).map((option, index)=>`<button class="copa-mobile-btn secondary" ${submitted ? "disabled" : ""} onclick="window.copaSubmitAnswer('${attr(option)}')"><strong>${letters[index] || "?"}</strong> · ${esc(option)}</button>`).join("")}</div><div id="copa-mobile-feedback" class="copa-mobile-status ${submitted ? "good" : ""}">${submitted ? "Respuesta de casa enviada. Mira la TV." : "Contesta cuando tu casa esté de acuerdo."}</div>${isHost() ? `<button class="copa-mobile-btn" onclick="window.hostCopaRevealResults()">Revelar resultados</button>` : ""}</div></div>`;
    setHostExtra(isHost() ? `<button class="trivia-next-btn" onclick="window.hostCopaRevealResults()">Revelar resultados de Copa Final</button>` : "");
  }
  function renderResults(state) {
    show("view-wait");
    const pill = document.getElementById("wait-pill"); if (pill) pill.innerText = isHost() ? "👑 Host" : "🏆 Copa Final";
    const msg = document.getElementById("wait-msg"); if (msg) msg.innerText = "¡Mira la TV!";
    const sub = document.getElementById("wait-subtitle"); if (sub) sub.innerText = "La Copa de las Casas está revelando el resultado final.";
    hidePanel();
    setHostExtra("");
    if (typeof window.showHostPanels === "function") window.showHostPanels(isHost());
  }
  async function postJson(url, payload) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(JSON.stringify(data.detail || data));
    return data;
  }
  window.copaSubmitWager = async function (wager) {
    play("send"); vibrate([20,30,20]);
    const feedback = document.getElementById("copa-mobile-feedback");
    try {
      const data = await postJson("/api/copa-final/submit_wager", { room_code: myRoomValue(), player_name: myNameValue(), wager });
      emitSocket("copa_final:wager_submitted", data);
      play("bell");
      if (feedback) { feedback.className = "copa-mobile-status good"; feedback.innerText = data.message || "Apuesta sellada."; }
    } catch (e) {
      play("wrong");
      if (feedback) { feedback.className = "copa-mobile-status bad"; feedback.innerText = "No se pudo apostar: " + e.message; }
      else alert("No se pudo apostar: " + e.message);
    }
  };
  window.copaSubmitAnswer = async function (answer) {
    answeredLocal = true; play("send"); vibrate([25,40,25]);
    const feedback = document.getElementById("copa-mobile-feedback");
    try {
      const data = await postJson("/api/copa-final/submit_answer", { room_code: myRoomValue(), player_name: myNameValue(), answer, client_elapsed_ms: null });
      emitSocket("copa_final:answer_submitted", data);
      if (feedback) { feedback.className = "copa-mobile-status good"; feedback.innerText = data.message || "Respuesta enviada."; }
    } catch (e) {
      answeredLocal = false; play("wrong");
      if (feedback) { feedback.className = "copa-mobile-status bad"; feedback.innerText = "No se pudo responder: " + e.message; }
    }
  };
  window.hostCopaOpenQuestion = async function () {
    try {
      const data = await postJson(`/api/copa-final/open_question/${myRoomValue()}`, { player_name: myNameValue(), host_token: hostTokenValue() });
      emitSocket("copa_final:question_opened", data); play("reveal");
    } catch (e) { play("wrong"); alert("No se pudo revelar la pregunta: " + e.message); }
  };
  window.hostCopaRevealResults = async function () {
    try {
      const data = await postJson(`/api/copa-final/reveal_results/${myRoomValue()}`, { player_name: myNameValue(), host_token: hostTokenValue() });
      emitSocket("copa_final:results_revealed", data); play("applause");
    } catch (e) { play("wrong"); alert("No se pudieron revelar resultados: " + e.message); }
  };

  const originalHide = window.hideGamePanels;
  if (typeof originalHide === "function") {
    window.hideGamePanels = function () { originalHide(); hidePanel(); };
  }
  const originalRenderMobileGame = window.renderMobileGame;
  window.renderMobileGame = function (state) {
    const phase = state?.phase;
    lastCopaState = state || lastCopaState;
    if (phase === "copa_final_betting" || phase === "copa_final") return renderBetting(state);
    if (phase === "copa_final_question") return renderQuestion(state);
    if (typeof originalRenderMobileGame === "function") return originalRenderMobileGame(state);
  };
  const originalResultsWait = window.renderResultsWait;
  window.renderResultsWait = function (state) {
    if (state?.phase === "results_copa_final") return renderResults(state);
    if (typeof originalResultsWait === "function") return originalResultsWait(state);
  };
  const originalHostReveal = window.hostRevealResults;
  window.hostRevealResults = function () {
    const phase = lastCopaState?.phase;
    if (phase === "copa_final_betting" || phase === "copa_final") return window.hostCopaOpenQuestion();
    if (phase === "copa_final_question") return window.hostCopaRevealResults();
    if (typeof originalHostReveal === "function") return originalHostReveal();
  };
})();
