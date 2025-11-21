// ===== ATUALIZAÇÃO DE COORDENADAS E ZOOM =====

console.log('📍 coordinates.js iniciando...');

const coordsInfo = document.getElementById('coordsInfo');
const distanceInfo = document.getElementById('distanceInfo');
const mapElement = document.getElementById('map');

function updateCoordinatesDisplay() {
  if (!window.map || !coordsInfo || !distanceInfo) return;

  const center = map.getCenter();
  const zoom = map.getZoom();

  const lat = center.lat.toFixed(4);
  const lng = center.lng.toFixed(4);

  coordsInfo.innerText = `${lat}°, ${lng}° | Zoom: ${zoom}`;

  const metersPerPixel = 40075016.686 / Math.pow(2, zoom + 8);
  const distanceKm = (metersPerPixel * 256 / 1000).toFixed(1);
  const scale = `1:${Math.round(metersPerPixel * 256 / 0.0254 / 12)}`;

  distanceInfo.innerText = `${scale} | ${distanceKm} km`;
}

function setupMapEvents() {
  if (!window.map || typeof map.on !== 'function') {
    console.log('⏳ Map ainda não pronto, tentando novamente...');
    setTimeout(setupMapEvents, 200);
    return;
  }

  console.log('✅ Map pronto, configurando eventos de coordenadas...');

  map.off('move', updateCoordinatesDisplay);
  map.off('zoom', updateCoordinatesDisplay);
  map.off('moveend', updateCoordinatesDisplay);
  map.off('zoomend', updateCoordinatesDisplay);

  map.on('move', updateCoordinatesDisplay);
  map.on('zoom', updateCoordinatesDisplay);
  map.on('moveend', updateCoordinatesDisplay);
  map.on('zoomend', updateCoordinatesDisplay);

  updateCoordinatesDisplay();
  console.log('✅ coordinates.js - eventos ligados ao mapa');
}

// Monitor mouse SEMPRE (não apenas em inspector mode)
if (mapElement) {
  console.log('✅ Map element encontrado, configurando mouse listener...');

  mapElement.addEventListener('mousemove', function(e) {
    // Atualiza SEMPRE em tempo real, independente do modo inspector
    if (window.map) {
      const rect = mapElement.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Verifica se o mouse está dentro dos limites do mapa
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        const latlng = map.containerPointToLatLng([x, y]);
        const lat = latlng.lat.toFixed(4);
        const lng = latlng.lng.toFixed(4);

        // Se inspector ativo, mostra (Inspector), senão mostra normalmente
        if (appState && appState.inspectorMode) {
          coordsInfo.innerText = `${lat}°, ${lng}° (Inspector)`;
        } else {
          coordsInfo.innerText = `${lat}°, ${lng}° | Zoom: ${map.getZoom()}`;
        }
      }
    }
  });

  mapElement.addEventListener('mouseleave', function() {
    // Ao sair do mapa, mostra o centro
    updateCoordinatesDisplay();
  });

  mapElement.addEventListener('mouseenter', function() {
    // Ao entrar no mapa
    updateCoordinatesDisplay();
  });

  console.log('✅ Mouse listeners configurados');
}

// Inicializa eventos do mapa
setupMapEvents();

// Atualiza uma vez ao carregar
setTimeout(updateCoordinatesDisplay, 1000);

console.log('✅ coordinates.js carregado completamente');
