// ===== SELETORES DO DOM =====
const toolbar = document.getElementById('toolbar');
const toggleToolbarBtn = document.getElementById('toggleToolbar');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const drawPolyBtn = document.getElementById('drawPolyBtn');
const mapTypeBtn = document.getElementById('mapTypeBtn');
const inspectorToolbarBtn = document.getElementById('inspectorToolbarBtn');
const settingsBtn = document.getElementById('settingsBtn');
const rightPanel = document.getElementById('right-panel');
const collapseRightPanelBtn = document.getElementById('collapseRightPanel');
const openSettingsBtn = document.getElementById('openSettingsPanel');
const closeSettingsBtn = document.getElementById('closeSettingsPanel');
const settingsPanel = document.getElementById('settings-panel');
const mapContainer = document.getElementById('map');
const toolbarRight = document.getElementById('toolbar-right');
const openRightPanelBtn = document.getElementById('openRightPanel');
const compareBtn = document.getElementById('compareBtn');
const layersBtn = document.getElementById('layersBtn');
const closeLayersBtn = document.getElementById('closeLayers');

let currentMapType = 'satellite';

// ===== ZOOM CONTROLS =====
if (zoomInBtn) {
  zoomInBtn.addEventListener('click', () => {
    if (map) map.zoomIn();
  });
}

if (zoomOutBtn) {
  zoomOutBtn.addEventListener('click', () => {
    if (map) map.zoomOut();
  });
}
// ===== LAYERS BUTTON =====
if (layersBtn) {
  layersBtn.addEventListener('click', () => {
    console.log('🗺️ Botão de camadas clicado');
    if (typeof showLayersPanel === 'function') {
      showLayersPanel();
    } else {
      console.warn('⚠️ showLayersPanel não encontrada');
    }
  });
}
// ===== LAYERS CLOSE BUTTON =====
if (closeLayersBtn) {
  closeLayersBtn.addEventListener('click', () => {
    console.log('🗺️ Botão fechar camadas clicado');
    if (typeof showLayersPanel === 'function') {
      showLayersPanel(); // usa o mesmo toggle da função
    }
  });
}
// ===== MEASUREMENT (ÁREA E DISTÂNCIA) =====
if (drawPolyBtn) {
  drawPolyBtn.addEventListener('click', () => {
    console.log('📏 Botão medição clicado');
    drawPolyBtn.classList.toggle('active');

    if (drawPolyBtn.classList.contains('active')) {
      console.log('✅ Medição ativada - exibindo opções');

      // Desativa inspector se estiver ativo
      if (inspectorToolbarBtn && inspectorToolbarBtn.classList.contains('active')) {
        inspectorToolbarBtn.click();
      }

      // Mostra opções de medição
      if (typeof showMeasurementOptions === 'function') {
        showMeasurementOptions();
        console.log('✅ Opções de medição chamadas');
      } else {
        console.warn('⚠️ showMeasurementOptions não encontrada');
      }

    } else {
      console.log('❌ Medição desativada');

      // Limpa medições
      if (typeof clearMeasurements === 'function') {
        clearMeasurements();
      }

      // Fecha o painel de opções de medição, se estiver aberto
      const optionsEl = document.getElementById('measurementOptions');
      if (optionsEl) {
        optionsEl.remove();
        console.log('🧹 measurementOptions removido ao desativar medição');
      }
    }
  });
}


// ===== INSPECTOR (PRINCIPAL) =====
if (inspectorToolbarBtn) {
  inspectorToolbarBtn.addEventListener('click', () => {
    console.log('🔍 Botão inspector clicado');
    inspectorToolbarBtn.classList.toggle('active');

    // Desativa medição se estiver ativa
    if (drawPolyBtn && drawPolyBtn.classList.contains('active')) {
      console.log('⊘ Desativando medição para ativar inspector');
      drawPolyBtn.click();
    }

    if (appState) {
      appState.inspectorMode = !appState.inspectorMode;

      if (map) {
        if (appState.inspectorMode) {
          map.dragging.enable();
          map.scrollWheelZoom.enable();
          map.getContainer().style.cursor = 'crosshair';

          if (typeof displayMessage === 'function') {
            displayMessage('Modo Inspector Ativado');
            console.log('📣 Mensagem Inspector Ativado enviada');
          }
          console.log('✅ Inspector ATIVADO - appState.inspectorMode =', appState.inspectorMode);
        } else {
          map.dragging.enable();
          map.scrollWheelZoom.enable();
          map.getContainer().style.cursor = 'grab';

          if (typeof clearInspectorMarkers === 'function') {
            clearInspectorMarkers();
          }

          if (typeof displayMessage === 'function') {
            displayMessage('Modo Inspector Desativado');
            console.log('📣 Mensagem Inspector Desativado enviada');
          }
          console.log('❌ Inspector DESATIVADO - appState.inspectorMode =', appState.inspectorMode);
        }
      }
    }
  });
}

// ===== MAP TYPE TOGGLE =====
if (mapTypeBtn) {
  mapTypeBtn.addEventListener('click', () => {
    mapTypeBtn.classList.toggle('active');
    if (map) {
      map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
          map.removeLayer(layer);
        }
      });

      if (currentMapType === 'satellite') {
        currentMapType = 'street';
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© OpenStreetMap'
        }).addTo(map);
      } else {
        currentMapType = 'satellite';
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: '© Esri'
        }).addTo(map);
      }
    }
  });
}

// ===== PAINEL DIREITO =====
if (collapseRightPanelBtn) {
  collapseRightPanelBtn.addEventListener('click', () => {
    if (rightPanel) rightPanel.classList.add('collapsed');
    if (settingsPanel) settingsPanel.classList.add('hidden');
    if (settingsBtn) settingsBtn.classList.remove('active');
    if (mapContainer) mapContainer.classList.remove('expand');
  });
}

if (openRightPanelBtn) {
  openRightPanelBtn.addEventListener('click', () => {
    if (rightPanel) rightPanel.classList.remove('collapsed');
    if (mapContainer) mapContainer.classList.add('expand');
  });
}

// ===== CONFIGURAÇÕES =====
if (settingsBtn) {
  settingsBtn.addEventListener('click', () => {
    if (settingsPanel) settingsPanel.classList.toggle('hidden');
    settingsBtn.classList.toggle('active');
  });
}

if (openSettingsBtn) {
  openSettingsBtn.addEventListener('click', () => {
    if (settingsPanel) settingsPanel.classList.remove('hidden');
  });
}

if (closeSettingsBtn) {
  closeSettingsBtn.addEventListener('click', () => {
    if (settingsPanel) settingsPanel.classList.add('hidden');
    if (settingsBtn) settingsBtn.classList.remove('active');
  });
}

console.log('✅ toolbar.js carregado - eventos configurados');
