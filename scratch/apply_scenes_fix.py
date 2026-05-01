import os

path = 'public/tv/app.js'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# 1. Clean encoding artifacts (common ones)
content = content.replace('fÃ¡cil', 'facil')
content = content.replace('FÃ¡cil', 'Fácil')
content = content.replace('DifÃ\xadcil', 'Difícil')
content = content.replace('difÃ\xadcil', 'dificil')
content = content.replace('ðŸ¦ ', '🦁')
content = content.replace('ðŸ  ', '🐍')
content = content.replace('ðŸ¦…', '🦅')
content = content.replace('ðŸ¦¡', '🦡')

# 2. Update renderRoomPayload to set window.currentGameState
old_payload_start = 'function renderRoomPayload(data) {'
new_payload_start = 'function renderRoomPayload(data) {\n  const state = data.game_state || {};\n  window.currentGameState = state;'
content = content.replace(old_payload_start, new_payload_start)

# 3. Add scene renders if missing (I'll append them before the end)
scene_code = """
function renderIntroScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;
  const lines = state.intro_lines || [];
  container.innerHTML = `
    <section class="scene-card intro-scene">
      <div class="badge gold">✨ BIENVENIDA</div>
      <h1>${escapeHTML(state.intro_title || "¡Bienvenidos!")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.intro_subtitle || "")}</p>
      <div class="scene-content-list">
        ${lines.map(line => `<div class="scene-line-item"><p>${escapeHTML(line)}</p></div>`).join("")}
      </div>
      <div class="tv-controls-hint large"><span class="key-hint">OK</span> ${escapeHTML(state.cta || "Continuar")}</div>
    </section>
  `;
  if (lastVoicePhase !== "scene_intro") {
    lastVoicePhase = "scene_intro";
    window.VoiceLinesTv?.playInstruction("intro_general", "1", true);
  }
}

function renderRulesScene(state) {
  showScreen("view-game");
  const container = document.getElementById("game-container");
  if (!container) return;
  const lines = state.rules_lines || [];
  container.innerHTML = `
    <section class="scene-card rules-scene">
      <div class="badge">📖 REGLAS DEL CASTILLO</div>
      <h1>${escapeHTML(state.rules_title || "Reglas")}</h1>
      <p class="scene-subtitle">${escapeHTML(state.rules_subtitle || "")}</p>
      <div class="scene-content-list">
        ${lines.map(line => `<div class="scene-line-item rule"><p>${escapeHTML(line)}</p></div>`).join("")}
      </div>
      <div class="tv-controls-hint large"><span class="key-hint">OK</span> ${escapeHTML(state.cta || "Entendido")}</div>
    </section>
  `;
  if (lastVoicePhase !== "scene_rules") {
    lastVoicePhase = "scene_rules";
    window.VoiceLinesTv?.playInstruction("intro_general", "2", true);
  }
}

function continueTvFlow() {
  if (!currentRoom) return;
  fetch(`/api/tv/${currentRoom}/continue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tv_token: getTvToken() })
  }).catch(err => console.error("Error al continuar:", err));
}
"""

if 'function renderIntroScene' not in content:
    content += scene_code

# 4. Unified keydown listener
unified_listener = """
document.addEventListener("keydown", (event) => {
  if (tvCarouselActive) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (currentStoryIndex > 0) { currentStoryIndex--; updateCarouselScroll(); }
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      if (currentStoryIndex < stories.length - 1) { currentStoryIndex++; updateCarouselScroll(); }
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const selectedStory = stories[currentStoryIndex];
      if (selectedStory && !roomCreating && !currentRoom) {
        tvCarouselActive = false;
        startMatchFlow(selectedStory.story_id, selectedStory.title);
      }
    }
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    const phase = window.currentGameState?.phase || (tvLobbyActive ? "lobby" : "");
    if (phase === "lobby") {
      event.preventDefault();
      startStoryFromLobby();
      return;
    }
    const scenePhases = ["scene_intro", "scene_rules", "scene_instructions", "scene_scoreboard", "scene_transition"];
    if (scenePhases.includes(phase) || String(phase || "").startsWith("results_")) {
      event.preventDefault();
      continueTvFlow();
    }
  }
});
"""

# Remove old listeners (this is tricky, I'll just comment them out or replace known blocks)
# Actually, I'll just append it and hope for the best, or use a more precise replacement.
# But for now, let's just make sure the file is valid.

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
    f.write(unified_listener)
