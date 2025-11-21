// ===================== INSPECTOR DE COORDENADAS =====================

console.log('🔧 inspector.js iniciando...');

let inspectorLayerGroup = null;
let inspectorClickBound = false;

function initInspectorModule() {
  console.log('🔧 initInspectorModule chamado...');

  // Aguarda map estar pronto
  if (typeof L === 'undefined' || !window.map) {
    setTimeout(initInspectorModule, 200);
    return;
  }

  // Cria layer group
  if (!inspectorLayerGroup) {
    inspectorLayerGroup = L.layerGroup().addTo(map);
    console.log('✅ Layer group criado');
  }

  // Registra click handler UMA VEZ
  if (!inspectorClickBound) {
    map.on('click', function(e) {
      handleInspectorClick(e);
    });
    inspectorClickBound = true;
    console.log('✅ inspector.js - click handler registrado no mapa');
  }

  // Garante que scroll wheel funciona
  if (map && map.scrollWheelZoom) {
    map.scrollWheelZoom.enable();
    console.log('✅ Scroll wheel zoom habilitado');
  }
}

function handleInspectorClick(e) {
  // SILENCIOSAMENTE ignora se inspector não está ativo
  // (não loga para não poluir console com "⊘ Inspector não está ativo")
  if (!appState || !appState.inspectorMode) {
    return;
  }

  const { lat, lng } = e.latlng;
  const coordStr = `${lat.toFixed(8)}, ${lng.toFixed(8)}`;

  console.log('📍 Inspector click:', coordStr, 'inspectorMode=', appState.inspectorMode);

  // Limpa e adiciona marcador
  if (inspectorLayerGroup) {
    inspectorLayerGroup.clearLayers();
  }

  const marker = L.circleMarker([lat, lng], {
    radius: 8,
    fillColor: '#FF6B35',
    color: '#FFFFFF',
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7
  });

  if (inspectorLayerGroup) {
    marker.addTo(inspectorLayerGroup);
  }

  marker.bindPopup(`<b>Coordenadas</b><br>${coordStr}`).openPopup();

  // Copia para clipboard
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(coordStr).then(() => {
      console.log('✅ Copiado para clipboard:', coordStr);
    });
  } else {
    console.warn('⚠️ Clipboard API não disponível');
  }
}

// Função para limpar marcadores ao desativar inspector
function clearInspectorMarkers() {
  if (inspectorLayerGroup) {
    inspectorLayerGroup.clearLayers();
    console.log('🧹 Marcadores inspector limpos');
  }
}

// Inicializa após load
console.log('⏳ Aguardando window.load para inicializar inspector...');
window.addEventListener('load', function() {
  console.log('📦 Window load disparado, inicializando inspector em 500ms...');
  setTimeout(initInspectorModule, 500);
});

console.log('✅ inspector.js carregado');
