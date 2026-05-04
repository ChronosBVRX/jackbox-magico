(() => {
  if (window.__VoiceResultCuesTvLoaded) return;
  window.__VoiceResultCuesTvLoaded = true;

  let lastResultCueKey = "";
  let debounceTimer = null;

  function getVisibleResultsView() {
    const view = document.getElementById("view-results");
    if (!view) return null;

    const style = window.getComputedStyle(view);
    const visibleByClass = view.classList.contains("visible");
    const visibleByStyle = style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";

    return visibleByClass && visibleByStyle ? view : null;
  }

  function getText(selector) {
    return String(document.querySelector(selector)?.textContent || "").trim();
  }

  function getResultsRoot() {
    return (
      document.getElementById("tv-extra-results") ||
      document.getElementById("results-list") ||
      document.querySelector(".result-list") ||
      document.querySelector(".results-list")
    );
  }

  function hasAny(root, selectors) {
    if (!root) return false;
    return selectors.some((selector) => root.querySelector(selector));
  }

  function shouldSkipFinalWinnerScreen(view) {
    const text = String(view.textContent || "").toLowerCase();
    return (
      text.includes("copa final") ||
      text.includes("pregunta final") ||
      text.includes("resultado final")
    );
  }

  function classifyResult(view) {
    const root = getResultsRoot();
    const fullText = String(view.textContent || "").toLowerCase();

    const hasCorrect = hasAny(root, [
      ".status-correct",
      ".result-status.status-correct",
      ".correct",
      ".is-correct",
      "[data-result='correct']",
      "[data-correct='true']",
    ]) || fullText.includes("¡acertó!") || fullText.includes("acertó") || fullText.includes("correcta");

    const hasWrong = hasAny(root, [
      ".status-wrong",
      ".result-status.status-wrong",
      ".wrong",
      ".is-wrong",
      "[data-result='wrong']",
      "[data-correct='false']",
    ]) || fullText.includes("falló") || fullText.includes("incorrecta") || fullText.includes("sin respuesta");

    const hasTimeout = (
      fullText.includes("se acabó el tiempo") ||
      fullText.includes("tiempo agotado") ||
      fullText.includes("nadie respondió") ||
      fullText.includes("sin respuestas")
    );

    if (hasTimeout && !hasCorrect) return "timeout";
    if (hasCorrect) return "correct";
    if (hasWrong) return "wrong";
    return "";
  }

  function getExplanationText() {
    return (
      getText("#tv-explicacion") ||
      getText("#narrator-comment") ||
      getText(".result-explanation") ||
      getText(".trivia-results-comment")
    );
  }

  function maybePlayResultCues() {
    const view = getVisibleResultsView();
    if (!view) return;
    if (!window.VoiceLinesTv?.playVoiceLine) return;

    // Copa Final ya tiene lógica dedicada para winner/final. Evitamos meter
    // correct/wrong genérico encima del anuncio de casa ganadora.
    if (shouldSkipFinalWinnerScreen(view)) return;

    const correctText = getText("#tv-correcta") || getText("#correct-answer");
    const explanationText = getExplanationText();
    const rootText = String(getResultsRoot()?.textContent || "").trim();
    const cueKey = [correctText, explanationText, rootText].join("|").slice(0, 900);

    if (!cueKey || cueKey === lastResultCueKey) return;
    lastResultCueKey = cueKey;

    const eventName = classifyResult(view);
    if (eventName) {
      window.VoiceLinesTv.playVoiceLine(eventName, {
        volume: 0.85,
        cooldownMs: 0,
      });
    }

    if (explanationText && explanationText.length > 12) {
      setTimeout(() => {
        const stillVisible = getVisibleResultsView();
        if (!stillVisible || !window.VoiceLinesTv?.playVoiceLine) return;
        window.VoiceLinesTv.playVoiceLine("explanation", {
          volume: 0.8,
          cooldownMs: 0,
        });
      }, eventName ? 2600 : 400);
    }
  }

  function scheduleCheck() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(maybePlayResultCues, 220);
  }

  document.addEventListener("DOMContentLoaded", () => {
    scheduleCheck();
    const observer = new MutationObserver(scheduleCheck);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });
  });
})();
