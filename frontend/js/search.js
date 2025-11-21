// ===== BUSCA DE COORDENADAS E ENDEREÇO =====
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

// Função para buscar coordenadas
function searchCoordinatesOrAddress(query) {
  if (!query.trim()) {
    return;
  }

  // Detecta se é coordenada (formato: -2.8264,-60.6750 ou -2.8264, -60.6750)
  const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/;
  const match = query.match(coordPattern);

  if (match) {
    // É coordenada
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    // Move o mapa para a coordenada
    if (map) {
      map.setView([lat, lng], 15);
      L.marker([lat, lng])
        .bindPopup(`📍 ${lat.toFixed(4)}°, ${lng.toFixed(4)}°`)
        .addTo(map)
        .openPopup();
    }
  } else {
    // É endereço - usar Nominatim (OpenStreetMap)
    searchAddressByNominatim(query);
  }
}

// Função para buscar endereço via Nominatim
function searchAddressByNominatim(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);

        if (map) {
          map.setView([lat, lng], 15);
          L.marker([lat, lng])
            .bindPopup(`
              <strong>${result.name}</strong><br/>
              ${result.display_name}<br/>
              📍 ${lat.toFixed(4)}°, ${lng.toFixed(4)}°
            `)
            .addTo(map)
            .openPopup();
        }
      }
    })
    .catch(error => {
      console.error('Erro ao buscar endereço:', error);
    });
}

// Event listeners
searchBtn.addEventListener('click', () => {
  searchCoordinatesOrAddress(searchInput.value);
  searchInput.value = '';
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    searchCoordinatesOrAddress(searchInput.value);
    searchInput.value = '';
  }
});
