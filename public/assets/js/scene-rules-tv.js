(() => {
  function renderRules(data) {
    const state = data.game_state || {};
    window.showScreen("view-rules");

    const titleEl = document.getElementById("rules-title");
    const reasonEl = document.getElementById("rules-reason");
    const container = document.querySelector(".rules-card");

    if (titleEl) titleEl.textContent = state.story_selected_minigame_name || state.title || "Siguiente Prueba";
    if (reasonEl) reasonEl.textContent = state.story_transition_reason || state.subtitle || "Prepárate para la siguiente dinámica...";
    
    // Gestión de audio
    if (window.lastVoicePhase !== "rules") {
      window.lastVoicePhase = "rules";
      const gameId = state.current_game_id || state.mode || "trivia";
      const played = window.VoiceLinesTv?.playInstruction(gameId);
      if (!played) {
        window.VoiceLinesTv?.play("rules", { volume: 0.95 });
      }
      window.currentGameInstructionId = gameId;
    }

    // Lógica de auto-aceptación sincronizada con audio
    if (typeof window.checkAutoAcceptRules === "function") {
      window.checkAutoAcceptRules(data);
    }
  }

  window.SceneRules = { render: renderRules };
})();
