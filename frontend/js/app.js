// ===================== APP STATE =====================
const appState = {
  backend: 'http://127.0.0.1:5000',
  sensor: 'sentinel',
  visualization: 'rgb',
  gamma: 1.25,
  cloudCover: 80,
  dateStart: null,
  dateEnd: null,
  selectedImages: [],
  inspectorMode: false
};

console.log('✅ app.js carregado - appState criado');

// ===================== STATUS BACKEND + GEE =====================

function updateStatuses() {
  const backendEl = document.getElementById('splash-backend-status');
  const geeEl = document.getElementById('splash-gee-status');

  fetch(appState.backend + '/api/hello')
    .then(r => r.json())
    .then(data => {
      // Backend OK se a rota respondeu
      if (backendEl) {
        backendEl.textContent = 'conectado';
        backendEl.style.color = '#22C55E';
      }

      // GEE: usa o campo gee_status que o backend já envia
      if (geeEl) {
        const status = data.gee_status || 'desconhecido';
        geeEl.textContent = status;
        geeEl.style.color = (status.toLowerCase() === 'conectado')
          ? '#22C55E'
          : '#F97316'; // laranja se vier algo diferente
      }

      console.log('✅ /api/hello:', data);
    })
    .catch(err => {
      // Se nem /api/hello respondeu, marca os dois como offline
      if (backendEl) {
        backendEl.textContent = 'offline';
        backendEl.style.color = '#EF4444';
      }
      if (geeEl) {
        geeEl.textContent = 'offline';
        geeEl.style.color = '#EF4444';
      }
      console.warn('⚠️ Erro ao consultar /api/hello:', err);
    });
}

// ===================== SPLASH SCREEN =====================

function initSplashScreen() {
  const splash = document.getElementById('splash-screen');
  const btn = document.getElementById('startAppBtn');

  if (!splash || !btn) {
    console.warn('⚠️ splash-screen ou startAppBtn não encontrados');
    return;
  }

  btn.addEventListener('click', () => {
    splash.classList.add('hidden');
    setTimeout(() => {
      if (splash && splash.parentNode) {
        splash.parentNode.removeChild(splash);
      }
    }, 400);
  });
}

// ===================== INICIALIZAÇÃO GERAL =====================

window.addEventListener('load', () => {
  initSplashScreen();
  updateStatuses();
});
