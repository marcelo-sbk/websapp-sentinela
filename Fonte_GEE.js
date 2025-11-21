// ===================== AOI Inicial =====================
var roraima = ee.FeatureCollection('FAO/GAUL_SIMPLIFIED_500m/2015/level1')
  .filter(ee.Filter.eq('ADM1_NAME', 'Roraima'))
  .geometry();
var roraimaCenterCoords = roraima.centroid(1).coordinates().getInfo();
var roraimaLon = roraimaCenterCoords[0];
var roraimaLat = roraimaCenterCoords[1];
Map.setCenter(roraimaLon, roraimaLat, 8);

// ===================== Stretch Dinâmico =====================
function getDynamicVisParams(img, bands, aoi, gamma) {
  var stats = img.select(bands).reduceRegion({
    reducer: ee.Reducer.percentile([2, 98], ["p2", "p98"]),
    geometry: aoi,
    scale: 30,
    maxPixels: 1e9
  });
  var min = bands.map(function(b) { return ee.Number(stats.get(b + "_p2")).subtract(100); });
  var max = bands.map(function(b) { return ee.Number(stats.get(b + "_p98")).add(100); });
  return {
    bands: bands,
    min: min,
    max: max,
    gamma: gamma
  };
}

function getDynamicVisParamsPan(img, aoi, gamma) {
  var stats = img.select(['red', 'green', 'blue']).reduceRegion({
    reducer: ee.Reducer.percentile([2, 98], ["p2", "p98"]),
    geometry: aoi,
    scale: 15,
    maxPixels: 1e9
  });
  var min = ['red', 'green', 'blue'].map(function(b) { return ee.Number(stats.get(b + "_p2")).subtract(0.02); });
  var max = ['red', 'green', 'blue'].map(function(b) { return ee.Number(stats.get(b + "_p98")).add(0.02); });
  return {
    bands: ['red', 'green', 'blue'],
    min: min,
    max: max,
    gamma: gamma
  };
}

// ===================== Funções de Índices e Composições =====================
function getNDVI(img, sensor) {
  if (sensor === 'Sentinel-2 L2A') {
    return img.normalizedDifference(['B8A', 'B4']).rename('NDVI');
  } else {
    return img.normalizedDifference(['B5', 'B4']).rename('NDVI');
  }
}

function getNBR(img, sensor) {
  if (sensor === 'Sentinel-2 L2A') {
    return img.normalizedDifference(['B8A', 'B12']).rename('NBR');
  } else {
    return img.normalizedDifference(['B5', 'B7']).rename('NBR');
  }
}

function getNDWI(img, sensor) {
  if (sensor === 'Sentinel-2 L2A') {
    return img.normalizedDifference(['B8A', 'B11']).rename('NDWI');
  } else {
    return img.normalizedDifference(['B5', 'B6']).rename('NDWI');
  }
}

function getFalseColor(img, sensor) {
  if (sensor === 'Sentinel-2 L2A') {
    return img.select(['B8A', 'B4', 'B3']).rename(['NIR', 'RED', 'GREEN']);
  } else {
    return img.select(['B5', 'B4', 'B3']).rename(['NIR', 'RED', 'GREEN']);
  }
}

// ===================== PanSharpening HSV para Landsat 8 =====================
function pansharpenL8(img) {
  var rgb = img.select(['B4', 'B3', 'B2']).divide(10000).toFloat().rename(['red','green','blue']);
  var pan = img.select('B8').divide(10000).toFloat();
  var hsv = rgb.rgbToHsv();
  var fused = ee.Image.cat([
    hsv.select('hue'),
    hsv.select('saturation'),
    pan
  ]).hsvToRgb().rename(['red', 'green', 'blue']).toFloat();
  return fused;
}

// ===================== FUNÇÃO DE NOTIFICAÇÃO (CORRIGIDA) =====================
function showNotification(message) {
  var notificationPanel = ui.Panel({
    style: {
      position: 'bottom-right',
      width: 'auto',
      height: 'auto',
      backgroundColor: 'rgba(255,255,255,0.95)',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '2px solid #68BF50',
      margin: '10px'
    },
    layout: ui.Panel.Layout.flow('vertical')
  });
  var notificationLabel = ui.Label({
    value: message,
    style: { 
      color: '#403C3B', 
      textAlign: 'center', 
      fontSize: '13px',
      fontWeight: '500'
    }
  });
  notificationPanel.add(notificationLabel);
  Map.add(notificationPanel);
  ui.util.setTimeout(function() {
    Map.remove(notificationPanel);
  }, 4000);
}

// ===================== FERRAMENTA INSPECTOR - CORRIGIDA (SEM document) =====================
var inspectorModeActive = false;
var inspectorListenerId = null;
var inspectorBtn = ui.Button({
  label: '🔍 Inspector',
  onClick: toggleInspectorMode
});
inspectorBtn.style().set({
  stretch: 'horizontal',
  margin: '5px 0',
  backgroundColor: '#68BF50',
  color: '#403C3B',
  border: '1px solid #403C3B'
});

function toggleInspectorMode() {
  inspectorModeActive = !inspectorModeActive;
  if (inspectorModeActive) {
    inspectorBtn.style().set('backgroundColor', '#FF6B35');
    inspectorBtn.setLabel('🔍 Inspector (ATIVO)');
    Map.style().set('cursor', 'crosshair');
    showNotification('🔍 Inspector ATIVADO - Clique no mapa para coordenadas');
    activateInspectorMode();
  } else {
    inspectorBtn.style().set('backgroundColor', '#68BF50');
    inspectorBtn.setLabel('🔍 Inspector');
    Map.style().set('cursor', 'default');
    deactivateInspectorMode();
    showNotification('🔍 Inspector DESATIVADO');
  }
}

function activateInspectorMode() {
  if (inspectorListenerId) {
    Map.unlisten(inspectorListenerId);
  }
  inspectorListenerId = Map.onClick(function(coords) {
    if (inspectorModeActive) {
      // Formato: lat, lon (8 casas decimais)
      var message = coords.lat.toFixed(8) + ', ' + coords.lon.toFixed(8);

      // Apenas notificação (sem círculo, sem painel extra)
      showNotification(message);

      // Se INSISTIR em tentar copiar, pode usar isso (mas não funciona em GEE padrão por limitação):
      // try { navigator.clipboard.writeText(message); } catch(e) {}

      // Não deixar círculo!
      // Não adicionar nenhum marcador, nada além da notificação!
    }
  });
}

function deactivateInspectorMode() {
  inspectorModeActive = false;
  if (inspectorListenerId) {
    Map.unlisten(inspectorListenerId);
    inspectorListenerId = null;
  }
}

// ======= Notificação visual simples =======
function showNotification(message) {
  var notificationPanel = ui.Panel({
    style: {
      position: 'bottom-right',
      width: 'auto',
      height: 'auto',
      backgroundColor: 'rgba(255,255,255,0.95)',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '2px solid #68BF50',
      margin: '10px'
    },
    layout: ui.Panel.Layout.flow('vertical')
  });
  var notificationLabel = ui.Label({
    value: message,
    style: {
      color: '#403C3B',
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: '500'
    }
  });
  notificationPanel.add(notificationLabel);
  Map.add(notificationPanel);
  ui.util.setTimeout(function() {
    Map.remove(notificationPanel);
  }, 5000);
}

// Adicione inspectorBtn ao seu painel

// ===================== Medições e Painel =====================
var originalWidget;
var toolsDraw = Map.drawingTools();
toolsDraw.setShown(true);

function atualizarMedicoes() {
  measPanel.clear();
  measPanel.add(refreshBtn);
  measPanel.add(ui.Label('📏 Medições:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
  toolsDraw.layers().forEach(function(layer) {
    var geom = layer.getEeObject();
    var name = layer.getName();
    var type = geom.type().getInfo();
    if (type === 'Polygon') {
      var measurement = geom.area().divide(10000).getInfo().toFixed(2) + ' ha';
      measPanel.add(ui.Label(name + ': ' + measurement, {color: '#403C3B'}));
    } else if (type === 'LineString') {
      var measurement = geom.length().getInfo().toFixed(2) + ' m';
      measPanel.add(ui.Label(name + ': ' + measurement, {color: '#403C3B'}));
    } else if (type === 'Point') {
      var coords = geom.coordinates().getInfo();
      var coordStr = coords[1].toFixed(6) + ', ' + coords[0].toFixed(6);
      var coordTextbox = ui.Textbox({
        value: coordStr,
        style: {stretch: 'horizontal', margin: '0 5px 0 0', color: '#403C3B', backgroundColor: '#FFFFFF'}
      });
      var linha = ui.Panel({
        widgets: [
          ui.Label(name + ':', {color: '#403C3B'}),
          coordTextbox
        ],
        layout: ui.Panel.Layout.flow('horizontal'),
        style: {stretch: 'horizontal', margin: '4px 0'}
      });
      measPanel.add(linha);
    }
  });
}
toolsDraw.onDraw(function(geometry, layer, drawingTools) {
  atualizarMedicoes();
});

// ===================== Interface =====================
var painel = ui.Panel({style: {width: '250px', padding: '3px', backgroundColor: '#FFFFFF'}});

var seletorSensor = ui.Select({
  items: ['Sentinel-2 L2A', 'Landsat 8 RT PanSharpen'],
  value: 'Sentinel-2 L2A',
  onChange: function() { buscarCenas(); }
});
seletorSensor.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF', border: '1px solid #403C3B'
});

var seletorVis = ui.Select({
  items: ['RGB', 'Falsa Cor', 'NDVI', 'NDWI', 'NBR', 'Agricultura'],
  value: 'RGB',
  onChange: function() { buscarCenas(); }
});
seletorVis.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF', border: '1px solid #403C3B'
});

var gammaLabel = ui.Label('1.25', {color: '#403C3B'});
var gammaSlider = ui.Slider({
  min: 0.1, max: 2.5, value: 1.25, step: 0.05,
  onChange: function(val) { gammaLabel.setValue(val.toFixed(2)); buscarCenas(); }
});
gammaSlider.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF'
});

function toDateBR(d) {
  return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)+'/'+d.getFullYear();
}
function toIso(str) {
  var p = str.split('/');
  return p[2] + '-' + p[1] + '-' + p[0];
}
var hoje = new Date(), ano = hoje.getFullYear(), mes = hoje.getMonth();
var inicioPadrao = new Date(ano, mes, 1);
var fimPadrao    = new Date(ano, mes+1, 0);
var inputInicio = ui.Textbox({value: toDateBR(inicioPadrao)});
inputInicio.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF', border: '1px solid #403C3B'
});
var inputFim = ui.Textbox({value: toDateBR(fimPadrao)});
inputFim.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF', border: '1px solid #403C3B'
});

var nuvemLabel = ui.Label('80%', {color: '#403C3B'});
var nuvemSlider = ui.Slider({
  min: 0, max: 100, value: 80, step: 1,
  onChange: function(v) { nuvemLabel.setValue(v + '%'); }
});
nuvemSlider.style().set({
  stretch: 'horizontal', color: '#403C3B',
  backgroundColor: '#FFFFFF'
});

var buscarBtn = ui.Button({ label: '🔍 Buscar Cenas', onClick: buscarCenas });
buscarBtn.style().set({
  stretch: 'horizontal', margin: '10px 0', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B'
});

var compararBtn = ui.Button({ label: '🆚 Comparar Imagens', onClick: compararImagens });
compararBtn.style().set({
  stretch: 'horizontal', margin: '5px 0', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B'
});

var sairBtn = ui.Button({ label: '❌ Sair da Comparação', onClick: sairComparacao });
sairBtn.style().set({
  stretch: 'horizontal', margin: '5px 0', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B', shown: false
});

var refreshBtn = ui.Button({ label: '🔄 Atualizar Medições', onClick: atualizarMedicoes });
refreshBtn.style().set({
  stretch: 'horizontal', margin: '5px 0', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B'
});

var miniaturasPainel = ui.Panel({
  layout: ui.Panel.Layout.flow('vertical'),
  style: {height: '250px', backgroundColor: '#FFFFFF'}
});
var measPanel = ui.Panel({style: {margin: '10px 0 0 0', color: '#403C3B', backgroundColor: '#FFFFFF'}});
measPanel.add(refreshBtn);
measPanel.add(ui.Label('📏 Medições:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));

painel.add(ui.Label('🛰️ Sensor:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(seletorSensor);
painel.add(ui.Label('🖼️ Visualização:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(seletorVis);
painel.add(ui.Label('⚡ Gamma:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(gammaSlider);
painel.add(gammaLabel);
painel.add(ui.Label('📆 Início (DD/MM/AAAA):', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(inputInicio);
painel.add(ui.Label('📆 Fim    (DD/MM/AAAA):', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(inputFim);
painel.add(ui.Label('☁️ % nuvens:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(nuvemSlider);
painel.add(nuvemLabel);
painel.add(buscarBtn);
painel.add(inspectorBtn);
painel.add(compararBtn);
painel.add(sairBtn);
painel.add(ui.Label('🖼️ Cenas disponíveis:', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
painel.add(miniaturasPainel);
painel.add(measPanel);
ui.root.insert(0, painel);

var painelVisivel = true;
var btnAlternarPainel = ui.Button({
  label: '🧭 Ocultar Painel',
  onClick: alternarPainel
});
btnAlternarPainel.style().set({
  position: 'top-left', margin: '5px', backgroundColor: '#FFFFFF', color: '#403C3B', border: '1px solid #403C3B'
});
function alternarPainel() {
  painelVisivel = !painelVisivel;
  painel.style().set('shown', painelVisivel);
  btnAlternarPainel.setLabel(painelVisivel ? '🧭 Ocultar Painel' : '🧭 Mostrar Painel');
}
Map.add(btnAlternarPainel);

// ===================== Buscar Cenas e Visualização ⬇️ =====================
var selectedImages = [];
function buscarCenas() {
  Map.layers().reset();
  miniaturasPainel.clear();
  selectedImages = [];
  var bounds = Map.getBounds();
  var aoi = ee.Geometry.Rectangle(bounds);
  var sensor = seletorSensor.getValue();
  var visType = seletorVis.getValue();
  var gamma = gammaSlider.getValue();
  var maxNuvem = nuvemSlider.getValue();
  var inicio = toIso(inputInicio.getValue());
  var fim    = toIso(inputFim.getValue());
  var colecao;
  if (sensor === 'Sentinel-2 L2A') {
    colecao = ee.ImageCollection('COPERNICUS/S2_SR').filterBounds(aoi).filterDate(inicio, fim).filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', maxNuvem));
  } else {
    colecao = ee.ImageCollection('LANDSAT/LC08/C02/T1_RT').filterBounds(aoi).filterDate(inicio, fim).filter(ee.Filter.lte('CLOUD_COVER', maxNuvem));
  }
  var lista = colecao.sort('system:time_start', false).distinct(['system:time_start']).toList(30);
  var infoList = lista.getInfo();
  if (!infoList || !infoList.length) {
    miniaturasPainel.add(ui.Label('❌ Nenhuma imagem encontrada.', {color: '#403C3B', backgroundColor: '#FFFFFF'}));
    return;
  }
  infoList.forEach(function(item) {
    var img = ee.Image(item.id);
    var ts = item.properties['system:time_start'];
    var date = new Date(ts);
    var dateBR = ('0'+date.getDate()).slice(-2)+'/'+('0'+(date.getMonth()+1)).slice(-2)+'/'+date.getFullYear();
    var checkbox = ui.Checkbox({label: '', style: {margin: '0', color: '#403C3B', backgroundColor: '#FFFFFF'}});
    checkbox.onChange(function(checked) {
      if (checked) {
        if (selectedImages.length < 2) {
          selectedImages.push({img: img, date: dateBR});
        } else {
          checkbox.setValue(false);
          showNotification('Selecione no máximo duas imagens para comparação.');
        }
      } else {
        selectedImages = selectedImages.filter(function(sel) {
          return sel.date !== dateBR;
        });
      }
    });

    var vis, thumbImage;

    if (visType === 'Falsa Cor') {
      thumbImage = getFalseColor(img, sensor);
      vis = getDynamicVisParams(thumbImage, ['NIR', 'RED', 'GREEN'], aoi, gamma);
    }
    else if (visType === 'NDVI') {
      thumbImage = getNDVI(img, sensor);
      vis = {min: 0.08, max: 0.66, palette: ['FF0000','FF4500','FFD700','F0E68C','98FB98','90EE90','3CB371','32CD32','228B22','006400']};
      if (sensor === 'Landsat 8 RT PanSharpen') { vis = {min: 0.06, max: 0.57, palette: vis.palette}; }
    }
    else if (visType === 'NDWI') {
      thumbImage = getNDWI(img, sensor);
      vis = {min: -0.5, max: 1, palette: ['brown', 'orange', 'yellow', 'white', 'lightgreen', 'green', 'darkgreen']};
    }
    else if (visType === 'NBR') {
      thumbImage = getNBR(img, sensor);
      vis = {min: -0.5, max: 1, palette: ['white', 'yellow', 'orange', 'brown', 'lightgreen', 'green', 'darkgreen']};
    }
    else if (visType === 'Agricultura') {
      thumbImage = img;
      vis = getDynamicVisParams(img, ['B11', 'B8A', 'B2'], aoi, gamma);
      if (sensor === 'Landsat 8 RT PanSharpen') { vis = getDynamicVisParams(img, ['B6', 'B5', 'B2'], aoi, gamma); }
    }
    else if (sensor === 'Landsat 8 RT PanSharpen') {
      if (visType === 'RGB') {
        thumbImage = pansharpenL8(img);
        vis = getDynamicVisParamsPan(thumbImage, aoi, gamma);
      }
    }
    else {
      thumbImage = img;
      vis = getDynamicVisParams(img, ['B4', 'B3', 'B2'], aoi, gamma);
    }

    var thumb = ui.Thumbnail({
      image: thumbImage.visualize(vis),
      params: {dimensions:180, region: aoi, format:'png'},
      style: {margin:'1px', border:'1px solid #403C3B', backgroundColor: '#FFFFFF'}
    });
    thumb.onClick(function() {
      Map.layers().reset();
      Map.addLayer(thumbImage.visualize(vis), {}, sensor + ' – ' + dateBR);
    });
    var subPanel = ui.Panel([thumb, checkbox], ui.Panel.Layout.flow('horizontal'), {backgroundColor: '#FFFFFF', stretch: 'horizontal'});
    var thumbPanel = ui.Panel({
      widgets: [ui.Label(dateBR, {fontWeight: 'bold', color: '#403C3B', backgroundColor: '#FFFFFF'}), subPanel],
      layout: ui.Panel.Layout.flow('vertical'),
      style: {backgroundColor: '#FFFFFF', margin: '5px 0', width: '100%'}
    });
    miniaturasPainel.add(thumbPanel);
  });
}

// ===================== Comparação e Painel lateral =====================
var leftMap, rightMap;
var isComparisonMode = false;
function compararImagens() {
  if (selectedImages.length !== 2) {
    showNotification('Selecione exatamente duas imagens para comparação.');
    return;
  }
  var centerCoords = Map.getCenter().coordinates().getInfo();
  var lon = centerCoords[0];
  var lat = centerCoords[1];
  var scale = Map.getScale();
  var zoomLevel = Math.round(Math.log(40075016.686/(256*scale))/Math.log(2));
  var sensor = seletorSensor.getValue();
  var visType = seletorVis.getValue();
  var gamma = gammaSlider.getValue();
  var bounds = Map.getBounds();
  var aoi = ee.Geometry.Rectangle(bounds);

  var leftImg, visLeft, rightImg, visRight;

  if (visType === 'Falsa Cor') {
    leftImg = getFalseColor(selectedImages[0].img, sensor);
    rightImg = getFalseColor(selectedImages[1].img, sensor);
    visLeft  = getDynamicVisParams(leftImg, ['NIR','RED','GREEN'], aoi, gamma);
    visRight = getDynamicVisParams(rightImg, ['NIR','RED','GREEN'], aoi, gamma);
  } else if (visType === 'NDVI') {
    leftImg  = getNDVI(selectedImages[0].img, sensor);
    rightImg = getNDVI(selectedImages[1].img, sensor);
    visLeft = visRight = {min: 0.08, max: 0.66, palette: ['FF0000','FF4500','FFD700','F0E68C','98FB98','90EE90','3CB371','32CD32','228B22','006400']};
    if (sensor === 'Landsat 8 RT PanSharpen') { visLeft = visRight = {min: 0.06, max: 0.57, palette: visLeft.palette}; }
  } else if (visType === 'NDWI') {
    leftImg  = getNDWI(selectedImages[0].img, sensor);
    rightImg = getNDWI(selectedImages[1].img, sensor);
    visLeft = visRight = {min: -0.5, max: 1, palette: ['brown','orange','yellow','white','lightgreen','green','darkgreen']};
  } else if (visType === 'NBR') {
    leftImg  = getNBR(selectedImages[0].img, sensor);
    rightImg = getNBR(selectedImages[1].img, sensor);
    visLeft = visRight = {min: -0.5, max: 1, palette: ['white','yellow','orange','brown','lightgreen','green','darkgreen']};
  } else if (visType === 'Agricultura') {
    leftImg = selectedImages[0].img;
    rightImg = selectedImages[1].img;
    visLeft  = getDynamicVisParams(leftImg, ['B11','B8A','B2'], aoi, gamma);
    visRight = getDynamicVisParams(rightImg, ['B11','B8A','B2'], aoi, gamma);
    if (sensor === 'Landsat 8 RT PanSharpen') {
      visLeft  = getDynamicVisParams(leftImg, ['B6','B5','B2'], aoi, gamma);
      visRight = getDynamicVisParams(rightImg, ['B6','B5','B2'], aoi, gamma);
    }
  } else if (sensor === 'Landsat 8 RT PanSharpen' && visType === 'RGB') {
    leftImg  = pansharpenL8(selectedImages[0].img);
    rightImg = pansharpenL8(selectedImages[1].img);
    visLeft  = getDynamicVisParamsPan(leftImg, aoi, gamma);
    visRight = getDynamicVisParamsPan(rightImg, aoi, gamma);
  } else {
    leftImg  = selectedImages[0].img;
    rightImg = selectedImages[1].img;
    visLeft  = getDynamicVisParams(leftImg, ['B4','B3','B2'], aoi, gamma);
    visRight = getDynamicVisParams(rightImg, ['B4','B3','B2'], aoi, gamma);
  }
  leftMap = ui.Map();
  leftMap.addLayer(leftImg.visualize(visLeft), {}, sensor + ' – ' + selectedImages[0].date);
  leftMap.setCenter(lon, lat, zoomLevel);
  var btnLeft = ui.Button({ label: '🧭 Ocultar Painel', onClick: alternarPainel });
  btnLeft.style().set({ position: 'top-left', margin: '5px', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B' });
  leftMap.add(btnLeft);

  rightMap = ui.Map();
  rightMap.addLayer(rightImg.visualize(visRight), {}, sensor + ' – ' + selectedImages[1].date);
  rightMap.setCenter(lon, lat, zoomLevel);
  var btnRight = ui.Button({ label: '🧭 Ocultar Painel', onClick: alternarPainel });
  btnRight.style().set({ position: 'top-left', margin: '5px', backgroundColor: '#68BF50', color: '#403C3B', border: '1px solid #403C3B' });
  rightMap.add(btnRight);

  var linker = ui.Map.Linker([leftMap, rightMap]);
  var splitPanel = ui.SplitPanel({
    firstPanel: leftMap,
    secondPanel: rightMap,
    orientation: 'horizontal',
    wipe: true
  });
  isComparisonMode = true;
  var widgets = ui.root.widgets();
  originalWidget = widgets.get(1);
  widgets.set(1, splitPanel);
  sairBtn.style().set('shown', true);
  showNotification('Modo de comparação ativado. Use a barra deslizante para comparar.');
}

function sairComparacao() {
  isComparisonMode = false;
  var widgets = ui.root.widgets();
  widgets.set(1, originalWidget);
  Map.setCenter(roraimaLon, roraimaLat, 8);
  var layers = Map.layers();
  var comparisonDates = selectedImages.map(function(item) { return item.date; });
  for (var i = layers.length()-1; i >= 0; i--) {
    var layer = layers.get(i);
    var layerName = layer.getName();
    for (var j = 0; j < comparisonDates.length; j++) {
      if (layerName && layerName.indexOf(comparisonDates[j]) !== -1) {
        Map.remove(layer);
        break;
      }
    }
  }
  selectedImages = [];
  sairBtn.style().set('shown', false);
  showNotification('Retornado ao modo normal.');
}
