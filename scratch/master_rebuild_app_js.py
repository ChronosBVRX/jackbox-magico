import subprocess
import os

def run_git_show():
    # Use subprocess to get the file content directly in memory
    result = subprocess.run(['git', 'show', 'main:public/tv/app.js'], 
                           capture_output=True, text=False)
    if result.returncode != 0:
        print("Error al obtener el archivo de git")
        return None
    
    # Try to decode safely
    for enc in ['utf-8', 'latin-1', 'cp1252']:
        try:
            return result.stdout.decode(enc)
        except:
            continue
    return None

content = run_git_show()
if content:
    # 1. Basic Cleaning
    content = content.replace('ðŸ¦ ', '🦁').replace('ðŸ  ', '🐍').replace('ðŸ¦…', '🦅').replace('ðŸ¦¡', '🦡')
    content = content.replace('fÃ¡cil', 'facil').replace('FÃ¡cil', 'Fácil')
    
    # 2. Update renderRoomPayload
    if 'window.currentGameState = state;' not in content:
        content = content.replace('function renderRoomPayload(data) {', 
                               'function renderRoomPayload(data) {\n  const state = data.game_state || {};\n  window.currentGameState = state;')

    # 3. Add Scene Renderers (only if missing)
    if 'function renderIntroScene' not in content:
        scene_logic = """
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
        content += scene_logic

    # 4. Unified Keydown Listener
    # We should find the end of the file or replace an existing listener
    if 'document.addEventListener("keydown"' not in content:
         # Append at the end if missing
         content += """
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

    with open('public/tv/app.js', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Archivo app.js reconstruido exitosamente.")
else:
    print("Falla crítica en la reconstrucción.")
