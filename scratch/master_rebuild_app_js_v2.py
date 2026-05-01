import subprocess
import os

def run_git_show():
    result = subprocess.run(['git', 'show', 'main:public/tv/app.js'], 
                           capture_output=True, text=False)
    if result.returncode != 0:
        return None
    # Use bytes and replace directly to avoid encoding mess
    return result.stdout

raw_content = run_git_show()
if raw_content:
    # Cleanup messy emojis from origin if they are there
    raw_content = raw_content.replace(b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\x81', '🦁'.encode('utf-8'))
    raw_content = raw_content.replace(b'\xc3\xb0\xc5\xb8\xc2\x90\xc2\x8d', '🐍'.encode('utf-8'))
    raw_content = raw_content.replace(b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\x85', '🦅'.encode('utf-8'))
    raw_content = raw_content.replace(b'\xc3\xb0\xc5\xb8\xc2\xa6\xc2\xa1', '🦡'.encode('utf-8'))
    
    # Fix encoding artifacts if any
    raw_content = raw_content.replace(b'f\xc3\x83\xc2\xa1cil', 'facil'.encode('utf-8'))
    
    # Final cleanup of common artifacts
    raw_content = raw_content.replace(b'\xc3\xb0\xc5\xb8', b'\xf0\x9f')

    # Convert to string to apply logic
    content = raw_content.decode('utf-8', errors='ignore')
    
    # Remove any excessive double newlines that might have been introduced
    content = content.replace('\r\n\r\n', '\n').replace('\n\n', '\n')

    # Re-apply our logic
    if 'window.currentGameState = state;' not in content:
        content = content.replace('function renderRoomPayload(data) {', 
                               'function renderRoomPayload(data) {\n  const state = data.game_state || {};\n  window.currentGameState = state;')

    if 'function renderIntroScene' not in content:
        content += """
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

    if 'document.addEventListener("keydown"' not in content:
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

    with open('public/tv/app.js', 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print("Reconstrucción final exitosa.")
