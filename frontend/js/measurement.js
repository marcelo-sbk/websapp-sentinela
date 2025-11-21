// ===================== FERRAMENTA DE MEDIÇÃO (ÁREA E DISTÂNCIA) =====================

console.log('📏 measurement.js iniciando...');

let measurementMode = null; // 'area' ou 'distance'
let currentMeasurementType = null; // Armazena o tipo ativo (persiste entre medições)
let measurementLayerGroup = null;
let measurementPoints = [];
let measurementPolyline = null;
let measurementLabel = null;
let isDrawing = false;
let lastClickTime = 0;

// ⭐ NOVA: Acumula totais de área e distância
let totalAreaHectares = 0;
let totalDistanceMeters = 0;
let measurementCount = 0;

function initMeasurementModule() {
  console.log('🔧 initMeasurementModule chamado...');

  if (typeof L === 'undefined' || !window.map) {
    setTimeout(initMeasurementModule, 200);
    return;
  }

  if (!measurementLayerGroup) {
    measurementLayerGroup = L.layerGroup().addTo(map);
    console.log('✅ Measurement layer group criado');
  }

  // Garante que scroll wheel funciona
  if (map && map.scrollWheelZoom) {
    map.scrollWheelZoom.enable();
  }

  if (map && map.dragging) {
    map.dragging.enable();
  }

  console.log('✅ measurement.js inicializado');
}

function showMeasurementOptions() {
  console.log('📋 Exibindo opções de medição...');

  const optionsHtml = `
    <div id="measurementOptions" style="
      position: absolute;
      top: 80px;
      left: 60px;
      background: #1F2937;
      border: 1px solid #3B8FFF;
      border-radius: 6px;
      padding: 8px;
      display: flex;
      gap: 8px;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <button id="measureAreaBtn" style="
        padding: 8px 12px;
        background: #3B8FFF;
        color: #FFFFFF;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: Roboto, sans-serif;
        font-size: 13px;
      ">
        <i class="fas fa-draw-polygon"></i> Área
      </button>
      <button id="measureDistanceBtn" style="
        padding: 8px 12px;
        background: #3B8FFF;
        color: #FFFFFF;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: Roboto, sans-serif;
        font-size: 13px;
      ">
        <i class="fas fa-ruler"></i> Distância
      </button>
    </div>
  `;

  const existing = document.getElementById('measurementOptions');
  if (existing) existing.remove();

  document.body.insertAdjacentHTML('beforeend', optionsHtml);

  document.getElementById('measureAreaBtn').addEventListener('click', () => {
    startAreaMeasurement();
    document.getElementById('measurementOptions').remove();
  });

  document.getElementById('measureDistanceBtn').addEventListener('click', () => {
    startDistanceMeasurement();
    document.getElementById('measurementOptions').remove();
  });

  console.log('✅ Opções de medição exibidas');
}

function startAreaMeasurement() {
  console.log('🔷 Iniciando medição de ÁREA...');

  currentMeasurementType = 'area';
  measurementMode = 'area';
  measurementPoints = [];
  isDrawing = true;
  lastClickTime = 0;

  // Reset preview
  if (measurementPolyline) {
    measurementLayerGroup.removeLayer(measurementPolyline);
    measurementPolyline = null;
  }
  if (measurementLabel) {
    measurementLayerGroup.removeLayer(measurementLabel);
    measurementLabel = null;
  }

  if (map) {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.getContainer().style.cursor = 'crosshair';
  }

  // ⭐ REMOVIDO: Mensagem de instrução que atrapalhava
  // if (typeof displayMessage === 'function') {
  //   displayMessage('Clique para desenhar polígono (duplo-clique para finalizar)');
  // }

  console.log('✅ Modo área ativado - pan habilitado');
}

function startDistanceMeasurement() {
  console.log('📏 Iniciando medição de DISTÂNCIA...');

  currentMeasurementType = 'distance';
  measurementMode = 'distance';
  measurementPoints = [];
  isDrawing = true;
  lastClickTime = 0;

  // Reset preview
  if (measurementPolyline) {
    measurementLayerGroup.removeLayer(measurementPolyline);
    measurementPolyline = null;
  }
  if (measurementLabel) {
    measurementLayerGroup.removeLayer(measurementLabel);
    measurementLabel = null;
  }

  if (map) {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.getContainer().style.cursor = 'crosshair';
  }

  // ⭐ REMOVIDO: Mensagem de instrução que atrapalhava
  // if (typeof displayMessage === 'function') {
  //   displayMessage('Clique para desenhar linha (duplo-clique para finalizar)');
  // }

  console.log('✅ Modo distância ativado - pan habilitado');
}

function handleMeasurementClick(e) {
  if (!isDrawing || !measurementMode) return;

  const now = Date.now();
  const isDoubleClick = (now - lastClickTime) < 300;
  lastClickTime = now;

  // Se duplo-clique, finaliza ESTA medição mas continua desenhando
  if (isDoubleClick && measurementPoints.length >= 2) {
    console.log('✅ Duplo-clique detectado - finalizando esta medição');
    finalizeMeasurement();

    // REINICIA COM O MESMO TIPO
    console.log('🔄 Reiniciando com mesmo tipo:', currentMeasurementType);
    if (currentMeasurementType === 'area') {
      startAreaMeasurement();
    } else if (currentMeasurementType === 'distance') {
      startDistanceMeasurement();
    }

    return;
  }

  const { lat, lng } = e.latlng;
  measurementPoints.push([lat, lng]);

  console.log(`📍 Ponto adicionado (${measurementMode}):`, lat, lng, 'Total:', measurementPoints.length);

  // Desenha marcador no ponto
  L.circleMarker([lat, lng], {
    radius: 5,
    fillColor: '#FF4444',
    color: '#FF4444',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  }).addTo(measurementLayerGroup);

  // Se tem pelo menos 2 pontos, desenha linha/polígono
  if (measurementPoints.length >= 2) {
    if (measurementMode === 'area') {
      updateAreaPreview();
    } else if (measurementMode === 'distance') {
      updateDistancePreview();
    }
  }
}

function updateAreaPreview() {
  // Remove polígono anterior
  if (measurementPolyline) {
    measurementLayerGroup.removeLayer(measurementPolyline);
  }

  if (measurementPoints.length < 2) return;

  const displayPoints = measurementPoints;

  // Desenha polígono em tempo real
  measurementPolyline = L.polygon(displayPoints, {
    color: '#FF4444',
    weight: 1,
    fillColor: '#FF4444',
    fillOpacity: 0.15
  }).addTo(measurementLayerGroup);

  // Remove label anterior
  if (measurementLabel) {
    measurementLayerGroup.removeLayer(measurementLabel);
    measurementLabel = null;
  }

  // Se tem 3+ pontos, calcula e mostra área
  if (measurementPoints.length >= 3) {
    const area = calculatePolygonArea(measurementPoints);
    const hectares = (area / 10000).toFixed(2);
    const centroid = calculatePolygonCentroid(measurementPoints);

    measurementLabel = L.marker(centroid, {
      icon: L.divIcon({
        html: `<div style="
          background: #FF4444;
          color: #FFFFFF;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          font-family: Roboto, sans-serif;
        ">${hectares} ha</div>`,
        iconSize: [80, 24],
        className: 'area-label'
      })
    }).addTo(measurementLayerGroup);
  }
}

function updateDistancePreview() {
  // Remove linha anterior
  if (measurementPolyline) {
    measurementLayerGroup.removeLayer(measurementPolyline);
  }

  if (measurementPoints.length < 2) return;

  // Desenha linha em tempo real
  measurementPolyline = L.polyline(measurementPoints, {
    color: '#FF4444',
    weight: 1,
    opacity: 0.7
  }).addTo(measurementLayerGroup);

  // Remove label anterior
  if (measurementLabel) {
    measurementLayerGroup.removeLayer(measurementLabel);
    measurementLabel = null;
  }

  // Calcula distância total
  let totalDistance = 0;
  for (let i = 0; i < measurementPoints.length - 1; i++) {
    totalDistance += calculateDistance(measurementPoints[i], measurementPoints[i + 1]);
  }

  // Adiciona label no final
  const lastPoint = measurementPoints[measurementPoints.length - 1];

  measurementLabel = L.marker(lastPoint, {
    icon: L.divIcon({
      html: `<div style="
        background: #FF4444;
        color: #FFFFFF;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        white-space: nowrap;
        font-family: Roboto, sans-serif;
      ">${totalDistance.toFixed(2)} m</div>`,
      iconSize: [100, 24],
      className: 'distance-label'
    })
  }).addTo(measurementLayerGroup);
}

function finalizeMeasurement() {
  if (measurementPoints.length < 2) {
    console.warn('⚠️ Não há pontos suficientes para finalizar');
    return;
  }

  console.log('✅ Medição finalizada com', measurementPoints.length, 'pontos');

  // Remove preview (linha/polígono temporário)
  if (measurementPolyline) {
    measurementLayerGroup.removeLayer(measurementPolyline);
    measurementPolyline = null;
  }

  // Remove label temporário
  if (measurementLabel) {
    measurementLayerGroup.removeLayer(measurementLabel);
    measurementLabel = null;
  }

  // Desenha resultado final PERMANENTEMENTE
  if (measurementMode === 'area') {
    if (measurementPoints.length >= 3) {
      // Polígono final
      const polygon = L.polygon(measurementPoints, {
        color: '#FF4444',
        weight: 1,
        fillColor: '#FF4444',
        fillOpacity: 0.15
      }).addTo(measurementLayerGroup);

      // Label permanente
      const area = calculatePolygonArea(measurementPoints);
      const hectares = (area / 10000).toFixed(2);
      const centroid = calculatePolygonCentroid(measurementPoints);

      // ⭐ ACUMULA A ÁREA
      totalAreaHectares += parseFloat(hectares);
      measurementCount++;

      L.marker(centroid, {
        icon: L.divIcon({
          html: `<div style="
            background: #FF4444;
            color: #FFFFFF;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            font-family: Roboto, sans-serif;
          ">${hectares} ha</div>`,
          iconSize: [80, 24],
          className: 'area-label-final'
        })
      }).addTo(measurementLayerGroup);

      // ⭐ EXIBE MENSAGEM COM SOMA ACUMULADA
      if (typeof displayMessage === 'function') {
        displayMessage(`✅ Área: ${hectares} ha - Área total = ${totalAreaHectares.toFixed(2)} ha`);
      }
      console.log(`📊 Polígono ${measurementCount}: ${hectares} ha | Total: ${totalAreaHectares.toFixed(2)} ha`);
    }
  } else if (measurementMode === 'distance') {
    // Linha final
    L.polyline(measurementPoints, {
      color: '#FF4444',
      weight: 1,
      opacity: 1
    }).addTo(measurementLayerGroup);

    // Label permanente
    let totalDistance = 0;
    for (let i = 0; i < measurementPoints.length - 1; i++) {
      totalDistance += calculateDistance(measurementPoints[i], measurementPoints[i + 1]);
    }

    // ⭐ ACUMULA A DISTÂNCIA
    totalDistanceMeters += totalDistance;
    measurementCount++;

    const lastPoint = measurementPoints[measurementPoints.length - 1];

    L.marker(lastPoint, {
      icon: L.divIcon({
        html: `<div style="
          background: #FF4444;
          color: #FFFFFF;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: bold;
          white-space: nowrap;
          font-family: Roboto, sans-serif;
        ">${totalDistance.toFixed(2)} m</div>`,
        iconSize: [100, 24],
        className: 'distance-label-final'
      })
    }).addTo(measurementLayerGroup);

    // ⭐ EXIBE MENSAGEM COM SOMA ACUMULADA
    if (typeof displayMessage === 'function') {
      displayMessage(`✅ Distância: ${totalDistance.toFixed(2)} m - Distância total = ${totalDistanceMeters.toFixed(2)} m`);
    }
    console.log(`📊 Linha ${measurementCount}: ${totalDistance.toFixed(2)} m | Total: ${totalDistanceMeters.toFixed(2)} m`);
  }

  // REINICIA PONTOS PARA PRÓXIMA MEDIÇÃO
  measurementPoints = [];
}

function calculatePolygonArea(points) {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i][1] * points[j][0];
    area -= points[j][1] * points[i][0];
  }
  area = Math.abs(area) / 2;

  const metersPerDegree = 111000;
  const areaMeters = area * metersPerDegree * metersPerDegree;

  return areaMeters;
}

function calculatePolygonCentroid(points) {
  let lat = 0, lng = 0;
  for (let p of points) {
    lat += p[0];
    lng += p[1];
  }
  return [lat / points.length, lng / points.length];
}

function calculateDistance(p1, p2) {
  const R = 6371000;
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

function clearMeasurements() {
  console.log('🧹 Limpando TODAS as medições...');

  if (measurementLayerGroup) {
    measurementLayerGroup.clearLayers();
  }

  // ⭐ RESETA TOTAIS
  totalAreaHectares = 0;
  totalDistanceMeters = 0;
  measurementCount = 0;

  measurementMode = null;
  currentMeasurementType = null;
  measurementPoints = [];
  measurementPolyline = null;
  measurementLabel = null;
  isDrawing = false;

  if (map) {
    map.dragging.enable();
    map.scrollWheelZoom.enable();
    map.getContainer().style.cursor = 'grab';
  }

  console.log('✅ Todas as medições e totais limpas');
}

// Inicializa após load
setTimeout(initMeasurementModule, 500);

// Registra listeners do mapa
if (typeof window !== 'undefined') {
  window.addEventListener('load', function() {
    if (map) {
      map.on('click', handleMeasurementClick);
      console.log('✅ Click listener de medição registrado');
    }
  });
}

console.log('✅ measurement.js carregado');
