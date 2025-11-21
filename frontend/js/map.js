// ===================== MAPA LEAFLET =====================
let map;

function initMap() {
  if (document.getElementById('map')) {
    map = L.map('map').setView([1.9760, -60.3425], 7);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© Esri'
    }).addTo(map);

    console.log('✅ map.js carregado - mapa inicializado');
  }
}

// Inicializa quando o DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMap);
} else {
  initMap();
}
