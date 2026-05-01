/**
 * App Preloader for Jackbox Mágico
 * Maneja la pantalla de carga inicial y asegura que los activos base estén listos.
 */
(function() {
  const loadingStatus = document.getElementById('loading-status');
  const progressBar = document.getElementById('loading-progress-bar');
  const viewLoading = document.getElementById('view-loading');
  const viewInicio = document.getElementById('view-inicio');

  let progress = 0;
  let assetsReady = false;

  function updateProgress(target, statusText) {
    if (statusText && loadingStatus) {
      loadingStatus.textContent = statusText;
    }
    
    // Suavizar la transición de la barra
    const step = () => {
      if (progress < target) {
        progress += 1;
        if (progressBar) progressBar.style.width = progress + '%';
        requestAnimationFrame(step);
      }
    };
    step();
  }

  async function startPreloading() {
    console.log("PRELOADER: Iniciando carga de activos...");
    updateProgress(10, "Invocando el sistema de sonido...");

    // 1. Esperar a que los sistemas base existan
    await new Promise(resolve => {
      const check = () => {
        if (window.VoiceLinesTv && window.MagicSound) {
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });

    updateProgress(30, "Leyendo el Gran Catálogo de Voces...");

    // 2. Cargar el catálogo de voces
    try {
      await window.VoiceLinesTv.loadCatalog();
      updateProgress(60, "Pre-cargando hechizos y efectos...");
    } catch (e) {
      console.warn("PRELOADER: Error cargando catálogo, continuando igual...", e);
    }

    // 3. Simular carga de otros recursos (imágenes, fuentes)
    updateProgress(85, "Alistando el Gran Comedor...");
    
    await new Promise(r => setTimeout(r, 1200));

    updateProgress(100, "¡Todo listo! Bienvenido al castillo.");

    // 4. Finalizar
    setTimeout(() => {
      finishLoading();
    }, 500);
  }

  function finishLoading() {
    if (viewLoading) {
      viewLoading.style.opacity = '0';
      viewLoading.style.transition = 'opacity 0.8s ease';
      
      setTimeout(() => {
        viewLoading.classList.remove('visible');
        if (viewInicio) {
          viewInicio.classList.add('visible');
          // Notificar al app.js principal si es necesario
          window.dispatchEvent(new CustomEvent('app-ready'));
          
          // Iniciar música de fondo si el usuario ya interactuó
          if (typeof window.startBackgroundMusic === 'function') {
            window.startBackgroundMusic();
          } else if (typeof startBackgroundMusic === 'function') {
            startBackgroundMusic();
          }
        }
      }, 800);
    }
  }

  // Iniciar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startPreloading);
  } else {
    startPreloading();
  }

})();
