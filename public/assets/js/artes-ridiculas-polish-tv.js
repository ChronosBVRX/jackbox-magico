/**
 * Artes Ridículas Polish TV
 * Encapsulates rendering for the defense class overhaul.
 */
window.ArtesRidiculasTv = (function() {

    function renderPlaying(state, container) {
        if (!state) return;

        const roundIdx = state.artes_round_index || 0;
        const totalRounds = state.artes_total_rounds || 3;
        const remainingTime = Math.max(0, Math.ceil(state.duration_seconds - (Date.now() / 1000 - state.started_at)));
        
        // If we are in partial reveal mode
        if (state.round_reveal) {
            renderPartialReveal(state, container);
            return;
        }

        container.innerHTML = `
            <div class="artes-ridiculas-container">
                <div class="artes-ridiculas-tv">
                    <div class="artes-header">
                        <div class="artes-round-indicator">Amenaza ${roundIdx + 1} de ${totalRounds}</div>
                        <div class="artes-game-title">Defensa Contra las Artes Ridículas</div>
                    </div>

                    <div class="artes-threat-card">
                        <div class="artes-question">${state.question}</div>
                        <div class="artes-timer-container">
                            <div class="artes-timer-bar" style="width: ${(remainingTime / state.duration_seconds) * 100}%"></div>
                        </div>
                    </div>

                    <div class="artes-options-grid">
                        ${state.options.map(opt => `
                            <div class="artes-option-card">${opt}</div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 30px; color: #b2bec3;">
                        ${Object.keys(state.answered || {}).length} de ${state.total_players || '?'} defensas enviadas
                    </div>
                </div>
            </div>
        `;
    }

    function renderPartialReveal(state, container) {
        container.innerHTML = `
            <div class="artes-ridiculas-container">
                <div class="artes-ridiculas-tv artes-reveal-content">
                    <div class="artes-correct-answer">¡Respuesta Correcta!</div>
                    <div class="artes-question" style="font-size: 2rem;">${state.correct}</div>
                    
                    ${state.funniest ? `<div class="artes-funny-answer">Mención Ridícula: "${state.funniest}"</div>` : ''}
                    
                    <div class="artes-explanation">${state.explanation}</div>
                    
                    <div class="artes-narrator">
                        <em>"${state.narrator}"</em>
                    </div>

                    <div style="margin-top: 40px; font-size: 1.2rem; color: #a29bfe;">
                        Siguiente amenaza en camino...
                    </div>
                </div>
            </div>
        `;
    }

    function renderResults(state, container) {
        const result = state.artes_result;
        if (!result) return;

        const rounds = result.rounds || [];
        
        container.innerHTML = `
            <div class="artes-ridiculas-container">
                <div class="artes-ridiculas-tv">
                    <h1 style="color: #a29bfe; margin-bottom: 20px;">Resumen de la Clase</h1>
                    <div style="margin-bottom: 30px; font-size: 1.4rem;">${result.summary}</div>

                    <div class="artes-rounds-summary" style="display: flex; gap: 20px; justify-content: center;">
                        ${rounds.map((r, i) => `
                            <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 15px; width: 250px;">
                                <div style="font-size: 0.9rem; color: #a29bfe; margin-bottom: 10px;">AMENAZA ${i+1}</div>
                                <div style="font-size: 1.1rem; height: 60px; overflow: hidden; margin-bottom: 10px;">${r.threat.question.substring(0, 60)}...</div>
                                <div style="color: #55efc4; font-weight: bold; font-size: 0.9rem;">${r.threat.correct}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 40px;">
                        <button class="btn-ready" onclick="window.confirmarReady && window.confirmarReady()">Siguiente Lección</button>
                    </div>
                </div>
            </div>
        `;
    }

    return {
        renderPlaying,
        renderResults
    };
})();
