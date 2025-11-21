// ===================== GERENCIADOR DE CAMADAS COM CATEGORIAS =====================
console.log('🗺️ layers.js iniciando...');

let layersManager = {
  config: null,
  active: {},          // { nomeCamada: L.Layer }
  layerGroup: null,    // L.FeatureGroup
  configCarregada: false,
  tentativasCarregar: 0,
  painelAberto: false
};

// ===================== INICIALIZAÇÃO DO MÓDULO =====================

function initLayersModule() {
  console.log('🔧 initLayersModule chamado...');

  // Garante que Leaflet e o mapa já existem
  if (typeof L === 'undefined' || !window.map) {
    console.warn('⏳ Leaflet ou mapa ainda não disponível, tentando de novo...');
    setTimeout(initLayersModule, 200);
    return;
  }

  // Cria um featureGroup para todas as camadas de layers.js
  if (!layersManager.layerGroup) {
    layersManager.layerGroup = L.featureGroup().addTo(map);
    console.log('✅ Layer group criado');
  }

  carregarConfiguracao();
  console.log('✅ layers.js inicializado');
}

// ===================== CARREGAR CONFIGURAÇÃO (layers-config.json) =====================

async function carregarConfiguracao() {
  try {
    console.log('📥 Buscando layers-config.json...');
    const response = await fetch('layers-config.json');

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + response.statusText);
    }

    layersManager.config = await response.json();
    layersManager.configCarregada = true;

    const qtd = Array.isArray(layersManager.config.categorias)
      ? layersManager.config.categorias.length
      : 0;
    console.log('✅ Configuração de camadas carregada com sucesso:', qtd, 'categorias');
  } catch (error) {
    console.error('❌ Erro ao carregar layers-config.json:', error);
    console.warn('⚠️ Certifique-se de que layers-config.json existe em: frontend/layers-config.json');
  }
}

// ===================== TOGGLE DO PAINEL DE CAMADAS =====================

function showLayersPanel() {
  console.log('📋 showLayersPanel chamada | configCarregada:', layersManager.configCarregada);

  const layersPanel = document.getElementById('layers-panel');
  if (!layersPanel) {
    console.warn('⚠️ Elemento #layers-panel não encontrado no DOM');
    return;
  }

  // Se já está aberto, apenas fecha
  if (layersManager.painelAberto) {
    console.log('🗑️ Fechando painel de camadas');
    layersPanel.classList.add('collapsed');
    layersManager.painelAberto = false;
    return;
  }

  // Se a configuração ainda não carregou, aguarda um pouco
  if (!layersManager.configCarregada) {
    layersManager.tentativasCarregar++;
    if (layersManager.tentativasCarregar > 50) {
      console.error('❌ Config não carregou após 10 segundos');
      alert(
        'Erro: layers-config.json não encontrado ou inválido\n\n' +
        'Verifique se o arquivo existe em: frontend/layers-config.json'
      );
      layersManager.tentativasCarregar = 0;
      return;
    }
    console.log('⏳ Tentativa ' + layersManager.tentativasCarregar + ': Aguardando config...');
    setTimeout(showLayersPanel, 200);
    return;
  }

  layersManager.tentativasCarregar = 0;

  if (!layersManager.config || !Array.isArray(layersManager.config.categorias)) {
    console.warn('⚠️ Config carregada mas sem categorias válidas');
    return;
  }

  // Limpa conteúdo anterior
  const content = document.getElementById('layers-panel-content');
  if (!content) {
    console.warn('⚠️ Elemento #layers-panel-content não encontrado');
    return;
  }

  content.innerHTML = '';

  // ===================== MONTA HTML DAS CATEGORIAS E CAMADAS =====================
  let panelContent = '';

  layersManager.config.categorias.forEach((categoria, catIndex) => {
    const categoriaPadraoAberta = catIndex === 0;

    const camas = (categoria.camadas || [])
      .map((camada, camIndex) => {
        const camadaId = 'layer_' + catIndex + '_' + camIndex;
        const isActive = !!layersManager.active[camada.nome];

        let html = '<div class="form-check form-switch layer-item">';
        html +=   '<input class="form-check-input" type="checkbox" role="switch" ';
        html +=          'id="' + camadaId + '" ';
        html +=          'data-camada="' + camada.nome + '" ';
        html +=          (isActive ? 'checked ' : '');
        html +=   '/>';
        html +=   '<label class="form-check-label" for="' + camadaId + '">';
        html +=      camada.nome;
        html +=   '</label>';
        html += '</div>';

        return html;
      })
      .join('');

    const iconeCategoria = categoria.icone ? categoria.icone : 'fa-layer-group';

    panelContent += `
      <div class="categoria">
        <div class="categoria-header" data-cat-index="${catIndex}">
          <i class="fa-solid ${iconeCategoria} categoria-icone"></i>
          <span class="categoria-titulo">${categoria.nome}</span>
          <i class="bi ${categoriaPadraoAberta ? 'bi-chevron-up' : 'bi-chevron-down'} ms-auto categoria-chevron"></i>
        </div>
        <div class="categoria-content ${categoriaPadraoAberta ? '' : 'collapsed'}">
          ${camas}
        </div>
      </div>
    `;
  });

  content.innerHTML = panelContent;

  // ===================== LISTENERS: ABRIR/FECHAR CATEGORIAS (CHEVRON) =====================

  const headers = content.querySelectorAll('.categoria-header');
  headers.forEach(header => {
    header.addEventListener('click', () => {
      const contentEl = header.nextElementSibling;
      if (!contentEl) return;

      contentEl.classList.toggle('collapsed');
      const isOpen = !contentEl.classList.contains('collapsed');

      const chevron = header.querySelector('.categoria-chevron');
      if (chevron) {
        chevron.classList.toggle('bi-chevron-down', !isOpen);
        chevron.classList.toggle('bi-chevron-up', isOpen);
      }
    });
  });

  // ===================== LISTENERS: SWITCHES DAS CAMADAS =====================

  const switches = content.querySelectorAll('.form-check-input[data-camada]');
  switches.forEach(inputEl => {
    inputEl.addEventListener('change', () => {
      const nomeCamada = inputEl.getAttribute('data-camada');
      if (!nomeCamada) return;

      if (inputEl.checked) {
        carregarCamada(nomeCamada);
      } else {
        descarregarCamada(nomeCamada);
      }
    });
  });

  // ===================== FECHA OUTROS PAINEIS ANTES DE ABRIR O DE CAMADAS =====================

  const rightPanelEl = document.getElementById('right-panel');
  const settingsPanelEl = document.getElementById('settings-panel');
  const settingsBtnEl = document.getElementById('settingsBtn');
  const mapContainerEl = document.getElementById('map');

  // Fecha painel de cenas
  if (rightPanelEl && !rightPanelEl.classList.contains('collapsed')) {
    rightPanelEl.classList.add('collapsed');
  }

  // Fecha painel de configurações
  if (settingsPanelEl && !settingsPanelEl.classList.contains('hidden')) {
    settingsPanelEl.classList.add('hidden');
  }
  if (settingsBtnEl && settingsBtnEl.classList.contains('active')) {
    settingsBtnEl.classList.remove('active');
  }

  // Tira o mapa do modo expand
  if (mapContainerEl) {
    mapContainerEl.classList.remove('expand');
  }

  // ===================== ABRE PAINEL DE CAMADAS =====================

  layersPanel.classList.remove('collapsed');
  layersManager.painelAberto = true;

  console.log('✅ Painel de camadas exibido');
}

// ===================== CARREGAR/DESCARREGAR CAMADA =====================

function obterDefinicaoCamada(nomeCamada) {
  if (!layersManager.config || !Array.isArray(layersManager.config.categorias)) {
    return null;
  }

  for (const cat of layersManager.config.categorias) {
    if (!Array.isArray(cat.camadas)) continue;
    for (const camada of cat.camadas) {
      if (camada.nome === nomeCamada) {
        return camada;
      }
    }
  }
  return null;
}

async function carregarCamada(nomeCamada) {
  try {
    console.log('🟢 Carregar camada:', nomeCamada);

    // Se já existe, não recarrega
    if (layersManager.active[nomeCamada]) {
      console.log('ℹ️ Camada já ativa, ignorando recarregamento:', nomeCamada);
      return;
    }

    const def = obterDefinicaoCamada(nomeCamada);
    if (!def) {
      console.warn('⚠️ Definição de camada não encontrada para:', nomeCamada);
      return;
    }

    const url = def.url || def.arquivo || def.file;
    if (!url) {
      console.warn('⚠️ Camada sem URL/arquivo definido:', nomeCamada);
      return;
    }

    console.log('📥 Buscando GeoJSON de', nomeCamada, 'em', url);
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status + ': ' + resp.statusText);
    }

    const geojson = await resp.json();

    const estilo = def.estilo || def.style || {};
    const layer = L.geoJSON(geojson, {
      // Para features de ponto, usa Font Awesome se houver estilo.icone, senão circleMarker
      pointToLayer: (feature, latlng) => {
        // Se a camada tiver um ícone definido no estilo (como "fa-fire"), usa marker com divIcon
        if (estilo.icone) {
          const corIcone = estilo.cor || estilo.color || '#ff0000ff';

          const iconHtml = `
            <i class="fa-solid ${estilo.icone}"
              style="color:${corIcone}; font-size:14px;"></i>
          `;

          const faIcon = L.divIcon({
            className: 'fa-layer-marker',   // classe base para estilizar se quiser no CSS
            html: iconHtml,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          return L.marker(latlng, { icon: faIcon });
        }

        // Fallback: se não tiver estilo.icone, continua usando circleMarker colorido
        const strokeColor = estilo.color || estilo.cor || '#ff0000ff';
        const fillColor  = estilo.fillColor || estilo.corPreenchimento || strokeColor;

        return L.circleMarker(latlng, {
          radius: estilo.radius || 6,
          color: strokeColor,
          weight: estilo.weight || estilo.espessura || 1,
          opacity: typeof estilo.opacity === 'number' ? estilo.opacity : 1,
          fillColor: fillColor,
          fillOpacity: typeof estilo.fillOpacity === 'number' ? estilo.fillOpacity : 0.7
        });
      },

      // style, onEachFeature permanecem como estão hoje
      style: feature => {
        return {
          color: estilo.color || estilo.cor || '#3B82F6',
          weight: estilo.weight || estilo.espessura || 2,
          opacity: typeof estilo.opacity === 'number' ? estilo.opacity : 1,
          fillColor: estilo.fillColor || estilo.corPreenchimento || '#3B82F6',
          fillOpacity: typeof estilo.fillOpacity === 'number' ? estilo.fillOpacity : 0.15
        };
      },

      onEachFeature: (feature, layerFeat) => {
        if (def.popupTemplate) {
          let html = def.popupTemplate;
          if (feature.properties) {
            Object.keys(feature.properties).forEach(k => {
              const token = '{{' + k + '}}';
              html = html.replaceAll(token, feature.properties[k]);
            });
          }
          layerFeat.bindPopup(html);

        } else if (def.popupField && feature.properties && feature.properties[def.popupField]) {
          layerFeat.bindPopup(
            '<strong>' + nomeCamada + '</strong><br>' +
            String(feature.properties[def.popupField])
          );

        } else if (feature.properties) {
          // tabela com todos os atributos (como você já deixou)
          let popupContent = '<strong>' + nomeCamada + '</strong><br><table class="popup-table">';
          for (const [key, value] of Object.entries(feature.properties)) {
            popupContent +=
              '<tr>' +
                '<td><strong>' + key + '</strong></td>' +
                '<td>' + (value !== null && value !== undefined ? value : '') + '</td>' +
              '</tr>';
          }
          popupContent += '</table>';
          layerFeat.bindPopup(popupContent);

        } else {
          layerFeat.bindPopup('<strong>' + nomeCamada + '</strong>');
        }
      }
    });

    layer.addTo(layersManager.layerGroup);
    layersManager.active[nomeCamada] = layer;

    // Z-index opcional
    if (typeof def.zIndex === 'number') {
      try {
        layer.setZIndex(def.zIndex);
      } catch (e) {
        // nem todo layer suporta setZIndex, ignora silenciosamente
      }
    }

    console.log('✅ Camada carregada e adicionada ao mapa:', nomeCamada);
  } catch (error) {
    console.error('❌ Erro ao carregar camada', nomeCamada, error);
    alert('Erro ao carregar camada "' + nomeCamada + '". Verifique o console para detalhes.');
  }
}

function descarregarCamada(nomeCamada) {
  console.log('🔴 Descarregar camada:', nomeCamada);

  const layer = layersManager.active[nomeCamada];
  if (!layer) {
    console.log('ℹ️ Camada não estava ativa:', nomeCamada);
    return;
  }

  try {
    layersManager.layerGroup.removeLayer(layer);
  } catch (e) {
    console.warn('⚠️ Erro ao remover camada do layerGroup (ignorando):', e);
  }

  delete layersManager.active[nomeCamada];

  console.log('✅ Camada removida do mapa:', nomeCamada);
}

// ===================== EXPOE FUNÇÕES NO ESCOPO GLOBAL =====================

window.initLayersModule = initLayersModule;
window.showLayersPanel = showLayersPanel;
window.carregarCamada = carregarCamada;
window.descarregarCamada = descarregarCamada;

// Inicializa automaticamente (pode ser chamado também em app.js quando o mapa estiver pronto)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(initLayersModule, 500);
});
