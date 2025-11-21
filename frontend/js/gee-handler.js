// ===== INTEGRAÇÃO GOOGLE EARTH ENGINE =====
// Busca de imagens + TileLayer com vis_params calculados NA ÓRBITA COMPLETA
// Gamma + Brilho + Contraste dinâmicos ajustáveis pelo slider - TODOS EM TEMPO REAL

const geeHandler = {
    backend: appState.backend,
    currentBounds: null,
    lastSearch: null,
    isSearching: false,
    currentImageId: null,
    imageCache: {},

    /**
     * Busca imagens de satélite na região do mapa
     */
    async searchImages() {
        if (!map || this.isSearching) return;
        this.isSearching = true;
        this.setSearchButtonLoading(true);

        const bounds = map.getBounds();
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        this.currentBounds = [
            [sw.lat, sw.lng],
            [ne.lat, ne.lng]
        ];

        console.log('📤 Buscando com bounds (viewport):', this.currentBounds);

        const payload = {
            bounds: this.currentBounds,
            sensor: appState.sensor || 'sentinel',
            date_start: appState.dateStart || getDefaultDateStart(),
            date_end: appState.dateEnd || getDefaultDateEnd(),
            cloud_cover: appState.cloudCover || 80,
            visualization: appState.visualization || 'rgb'
        };

        try {
            const response = await fetch(`${this.backend}/api/search-images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (data.success && data.images && data.images.length > 0) {
                console.log(`✅ ${data.images.length} imagens encontradas`);
                
                data.images.forEach(img => {
                    this.imageCache[img.id] = {
                        vis_params: img.vis_params,
                        date: img.date,
                        sensor: img.sensor,
                        mgrs_tile: img.mgrs_tile
                    };
                    console.log(`📊 Cache: ${img.date}`, img.vis_params);
                });

                this.displayImages(data.images);
                this.lastSearch = data.images;
                displayMessage(`✅ ${data.images.length} cenas encontradas`);
            } else {
                displayMessage('Nenhuma imagem encontrada', 'warning');
            }
        } catch (error) {
            console.error('❌ Erro:', error);
            displayMessage('Erro ao buscar imagens', 'error');
        } finally {
            this.isSearching = false;
            this.setSearchButtonLoading(false);
        }
    },

    /**
     * Ativa/desativa estado de loading do botão
     */
    setSearchButtonLoading(isLoading) {
        const btn = document.getElementById('searchScenesBtn');
        if (!btn) return;

        if (isLoading) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner" style="animation: spin 1s linear infinite;"></i> Buscando...';
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-search"></i> Buscar Cenas';
        }
    },

    /**
     * ⭐ Exibe thumbnails das imagens COM LAYOUT COMPACTO (thumbnail + metadados lado a lado)
     */
    displayImages(images) {
        const container = document.querySelector('.thumbnails-container');
        if (!container) return;

        container.innerHTML = '';

        images.forEach((img, index) => {
            // ⭐ Formatar data como "19 Nov 2025"
            const dateObj = new Date(img.date);
            const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            }).replace('de ', '');

            const thumbnail = document.createElement('div');
            thumbnail.className = 'thumbnail-item';
            thumbnail.dataset.imageId = img.id;
            thumbnail.dataset.date = img.date;

            // ⭐ NOVO LAYOUT: THUMBNAIL À ESQUERDA + METADADOS À DIREITA
            thumbnail.innerHTML = `
                <div style="display: flex; gap: 12px; cursor: pointer; padding: 10px; border-radius: 8px; transition: all 0.2s ease; border: 2px solid transparent; align-items: flex-start;"
                     onclick="geeHandler.toggleImage('${img.id}', '${img.date}')"
                     onmouseover="this.style.backgroundColor = 'rgba(74, 158, 255, 0.1); this.style.borderColor = '#4A9EFF';"
                     onmouseout="this.style.backgroundColor = 'transparent'; this.style.borderColor = 'transparent';">
                    
                    <!-- THUMBNAIL À ESQUERDA -->
                    <img src="${img.thumbnail}" 
                         style="width: 80px; height: 80px; border-radius: 6px; object-fit: cover; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2); flex-shrink: 0;">
                    
                    <!-- METADADOS À DIREITA -->
                    <div style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
                        <!-- DATA COM ÍCONE -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="color: #4A9EFF; font-size: 12px;">●</span>
                            <span style="color: #9CA3AF; font-size: 12px; font-weight: 500;">${dateFormatted}</span>
                        </div>
                        
                        <!-- SATÉLITE COM ÍCONE -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-satellite" style="color: #9CA3AF; font-size: 12px; width: 12px; text-align: center;"></i>
                            <span style="color: #9CA3AF; font-size: 12px;">${img.sensor === 'sentinel' ? 'Sentinel-2 L2A' : img.sensor}</span>
                        </div>
                        
                        <!-- NUVEM COM ÍCONE -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-cloud" style="color: #9CA3AF; font-size: 12px; width: 12px; text-align: center;"></i>
                            <span style="color: #9CA3AF; font-size: 12px;">${img.cloud_cover.toFixed(1)}%</span>
                        </div>
                        
                        <!-- ÓRBITA COM ÍCONE -->
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <i class="fas fa-th" style="color: #9CA3AF; font-size: 12px; width: 12px; text-align: center;"></i>
                            <span style="color: #9CA3AF; font-size: 12px;">${img.mgrs_tile}</span>
                        </div>
                    </div>
                </div>
            `;

            container.appendChild(thumbnail);
        });
    },

    /**
     * Toggle: Carrega ou remove a imagem do mapa
     */
    async toggleImage(imageId, imageDate) {
        if (this.currentImageId === imageId) {
            this.removeImage();
        } else {
            await this.loadImage(imageId, imageDate);
        }
    },

    /**
     * ⭐ Carrega TileLayer (SEM gamma/brilho/contraste - será aplicado via CSS em tempo real!)
     */
    async loadImage(imageId, imageDate) {
        if (!this.currentBounds) {
            console.error('currentBounds não definido');
            return;
        }

        try {
            console.log('🎬 Carregando TileLayer:', imageId);

            const cachedData = this.imageCache[imageId];
            const visParams = cachedData ? cachedData.vis_params : null;

            console.log('📊 vis_params recuperados:', visParams);
            console.log('📍 bounds:', this.currentBounds);

            if (map.geeLayer) {
                map.removeLayer(map.geeLayer);
            }

            const response = await fetch(`${this.backend}/api/get-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_id: imageId,
                    bounds: this.currentBounds,
                    visualization: appState.visualization || 'rgb',
                    sensor: appState.sensor || 'sentinel',
                    vis_params: visParams,
                    gamma: 1.0
                })
            });

            const data = await response.json();

            if (data.success && data.url) {
                console.log('✅ TileLayer URL gerada!');

                const layer = L.tileLayer(data.url, {
                    maxZoom: 20,
                    minZoom: 1,
                    attribution: 'Google Earth Engine',
                    zIndex: 100,
                    noWrap: true,
                    crossOrigin: 'anonymous'
                }).addTo(map);

                map.geeLayer = layer;
                this.currentImageId = imageId;

                this.applyFilters();

                // ⭐ Atualizar feedback visual nos cards
                document.querySelectorAll('.thumbnail-item').forEach(item => {
                    item.style.opacity = '0.6';
                });
                
                const selectedThumbnail = document.querySelector(`[data-image-id="${imageId}"]`);
                if (selectedThumbnail) {
                    selectedThumbnail.style.opacity = '1';
                    selectedThumbnail.style.borderLeft = '3px solid #4A9EFF';
                }

                displayMessage(`✅ Imagem carregada - ${cachedData.date}`);
            } else {
                console.error('Erro:', data);
                displayMessage('Erro ao carregar imagem', 'error');
            }

        } catch (error) {
            console.error('❌ Erro:', error);
            displayMessage('Erro ao carregar imagem', 'error');
        }
    },

    /**
     * ⭐ Aplica GAMMA + BRILHO + CONTRASTE em tempo real (SEM recarregar)
     */
    applyFilters() {
        const gamma = parseFloat(document.getElementById('gammaSlider')?.value || 1.0);
        const brightness = parseFloat(document.getElementById('brightnessSlider')?.value || 1.0);
        const contrast = parseFloat(document.getElementById('contrastSlider')?.value || 1.0);
        
        if (map.geeLayer) {
            const tileElement = document.querySelector('.leaflet-tile-pane');
            if (tileElement) {
                const filterValue = `brightness(${brightness}) contrast(${contrast}) saturate(1)`;
                tileElement.style.filter = filterValue;
                tileElement.style.opacity = gamma;
                
                console.log(`🎨 Filtros: Gamma ${gamma}, Brilho ${brightness}, Contraste ${contrast}`);
            }
        }
    },

    /**
     * Remove a imagem do mapa
     */
    removeImage() {
        if (map.geeLayer) {
            map.removeLayer(map.geeLayer);
        }
        map.geeLayer = null;
        this.currentImageId = null;

        document.querySelectorAll('.thumbnail-item').forEach(item => {
            item.style.opacity = '1';
            item.style.borderLeft = 'none';
        });

        displayMessage('❌ Imagem removida');
    }
};

// ===== FUNÇÕES AUXILIARES =====

function getDefaultDateStart() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return start.toISOString().split('T')[0];
}

function getDefaultDateEnd() {
    return new Date().toISOString().split('T')[0];
}

function displayMessage(message, type = 'info') {
    console.log(type.toUpperCase() + ':', message);
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 12px 16px;
        background: ${type === 'error' ? '#C0152F' : type === 'warning' ? '#A84B2F' : '#4A9EFF'};
        color: #FFFFFF;
        border-radius: 4px;
        z-index: 10000;
        font-size: 13px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.innerText = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 4000);
}

console.log('✅ gee-handler.js carregado (layout compacto: thumbnail + metadados lado a lado)');

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchScenesBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', () => geeHandler.searchImages());
    }

    const gammaSlider = document.getElementById('gammaSlider');
    if (gammaSlider) {
        gammaSlider.addEventListener('input', function() {
            const gammaValue = document.getElementById('gammaValue');
            if (gammaValue) {
                gammaValue.innerText = this.value;
            }
            geeHandler.applyFilters();
        });
    }

    const brightnessSlider = document.getElementById('brightnessSlider');
    if (brightnessSlider) {
        brightnessSlider.addEventListener('input', function() {
            const brightnessValue = document.getElementById('brightnessValue');
            if (brightnessValue) {
                brightnessValue.innerText = this.value;
            }
            geeHandler.applyFilters();
        });
    }

    const contrastSlider = document.getElementById('contrastSlider');
    if (contrastSlider) {
        contrastSlider.addEventListener('input', function() {
            const contrastValue = document.getElementById('contrastValue');
            if (contrastValue) {
                contrastValue.innerText = this.value;
            }
            geeHandler.applyFilters();
        });
    }
});
