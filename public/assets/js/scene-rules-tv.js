(() => {
  function renderRules(data) {
    const state = data.game_state || {};
    window.showScreen("view-rules");

    const titleEl = document.getElementById("rules-title");
    const reasonEl = document.getElementById("rules-reason");
    const container = document.querySelector(".rules-card");

    // Ocultar transición si venimos de otra pantalla
    window.SceneTransition?.hide();

    if (titleEl) titleEl.textContent = state.story_selected_minigame_name || state.title || "Siguiente Prueba";
    if (reasonEl) {
      const isWaiting = window.VoiceLinesTv?.isProcessing?.();
      reasonEl.textContent = isWaiting 
        ? "Escuchando instrucciones del narrador..." 
        : (state.story_transition_reason || state.subtitle || "Prepárate para la siguiente dinámica...");
    }
    
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

    // Función global para que story-ready la llame al avanzar
    window.acceptRules = async () => {
      window.SceneTransition?.show("¡Que comience la magia!");
      const room = typeof getRoomCode === "function" ? getRoomCode() : (window.currentRoom || "");
      const token = typeof getTvToken === "function" ? getTvToken() : "";
      
      try {
        await fetch(`/api/story-tv/${room}/accept-rules`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tv_token: token }),
        });
      } catch (e) {
        console.error("Error aceptando reglas", e);
        window.SceneTransition?.hide();
      }
    };

    // Lógica de auto-aceptación sincronizada con audio
    if (typeof window.checkAutoAcceptRules === "function") {
      window.checkAutoAcceptRules(data);
    }
  }

  window.SceneRules = { render: renderRules };
})();
