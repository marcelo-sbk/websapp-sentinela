// ===================== EVENTOS DOS CONTROLES =====================

// Sensor
document.getElementById('sensorSelect').addEventListener('change', (e) => {
  appState.sensor = e.target.value;
});

// Visualização
document.getElementById('visSelect').addEventListener('change', (e) => {
  appState.visualization = e.target.value;
});

// Gamma Slider
document.getElementById('gammaSlider').addEventListener('input', (e) => {
  appState.gamma = parseFloat(e.target.value);
  document.getElementById('gammaValue').innerText = appState.gamma.toFixed(2);
});

// Cloud Cover Slider
document.getElementById('cloudSlider').addEventListener('input', (e) => {
  appState.cloudCover = parseInt(e.target.value);
  document.getElementById('cloudValue').innerText = appState.cloudCover + '%';
});

// Data Inicial
document.getElementById('dateStart').addEventListener('change', (e) => {
  appState.dateStart = e.target.value;
});

// Data Final
document.getElementById('dateEnd').addEventListener('change', (e) => {
  appState.dateEnd = e.target.value;
});

// Buscar Cenas
document.getElementById('searchScenesBtn').addEventListener('click', () => {
  // Será implementado na integração com GEE
});
