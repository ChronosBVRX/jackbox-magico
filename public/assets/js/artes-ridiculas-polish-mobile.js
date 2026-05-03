/**
 * Artes Ridículas Polish Mobile
 * Encapsulates rendering for the defense class overhaul.
 */
window.ArtesRidiculasMobile = (function() {

    let lastRoundId = null;
    let selectedOption = null;

    function renderPlaying(state, container, player_name) {
        if (!state) return;

        // Reset if new round or new sub-round
        const currentRoundKey = `${state.round_id}_${state.artes_round_index}`;
        if (lastRoundId !== currentRoundKey) {
            lastRoundId = currentRoundKey;
            selectedOption = null;
        }

        const roundIdx = state.artes_round_index || 0;
        const totalRounds = state.artes_total_rounds || 3;
        const answered = state.answered || {};
        const playerAnswer = answered[player_name];

        if (playerAnswer || selectedOption) {
            container.innerHTML = `
                <div class="artes-mobile-wait">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🛡️</div>
                    <h3>Defensa enviada</h3>
                    <p style="margin-top: 10px; color: #b2bec3;">
                        Mira la TV para ver si sobreviviste a la amenaza ${roundIdx + 1}.
                    </p>
                </div>
            `;
            return;
        }

        if (state.round_reveal) {
            container.innerHTML = `
                <div class="artes-mobile-wait">
                    <div style="font-size: 3rem; margin-bottom: 20px;">📜</div>
                    <h3>Resultados Parciales</h3>
                    <p>Preparándote para la siguiente amenaza...</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9rem; color: #a29bfe;">
                    <span>Defensa Contra las Artes Ridículas</span>
                    <span>${roundIdx + 1}/${totalRounds}</span>
                </div>
                
                <h2 style="margin-bottom: 20px; font-size: 1.4rem;">${state.question}</h2>
                
                <div class="artes-options-list">
                    ${state.options.map(opt => `
                        <div class="artes-mobile-card" onclick="ArtesRidiculasMobile.selectOption('${opt}', '${player_name}')">
                            ${opt}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function selectOption(option, player_name) {
        if (selectedOption) return;
        selectedOption = option;
        
        // Haptic feedback if available
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(30);
        }

        if (window.submitAnswer) {
            window.submitAnswer(option);
        }
    }

    return {
        renderPlaying,
        selectOption
    };
})();
