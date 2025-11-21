# Estrutura do WebApp Sentinela

## 📁 Estrutura de Pastas

```
D:\CHAPADAO\WebAppSentinela\
├── backend/
│   ├── venv/                          # Ambiente Python (virtual env)
│   ├── app.py                         # Flask Backend (correções aplicadas)
│   └── service_account.json           # Credenciais Google Earth Engine
│
└── frontend/
    ├── index.html                     # Página principal
    ├── css/
    │   ├── style.css                  # Estilos gerais
    │   └── toolbar.css                # Estilos da barra de ferramentas
    │
    └── js/
        ├── app.js                     # Inicialização da aplicação
        ├── map.js                     # Configuração do mapa Leaflet
        ├── gee-handler.js             # Integração Google Earth Engine ⭐
        ├── ui.js                      # Interface do usuário
        ├── coordinates.js             # Sistema de coordenadas
        ├── inspector.js               # Ferramenta de inspeção
        ├── toolbar.js                 # Controle da barra de ferramentas
        └── Fonte_GEE.js              # (arquivo antigo/não usado)
    └── camadas/
            ├─ Rodovias_Vicinais.json
            ├─ Imoveis_Regularizados.json
            ├─ Atividade_Regularizada.json
            ├─ Iteraima_Titulos_Definitivos.json
            ├─ Autorizacao_Ocupacao.json
            ├─ Parcelas_Certificadas.json
            ├─ SIGEF_Tituladas.json
            ├─ Fogo_2023.json
            ├─ Fogo_2024.json
            ├─ Fogo_2025.json
            └─ IBAMA_Embargos.json




```

---

## 🔄 Fluxo de Funcionamento

### 1️⃣ **INICIALIZAÇÃO (ao abrir a página)**
```
index.html carrega
    ↓
Carrega CSS (style.css, toolbar.css)
    ↓
Carrega JS (app.js → map.js → gee-handler.js → ui.js → coordinates.js → inspector.js → toolbar.js)
    ↓
Inicializa mapa Leaflet (map.js)
    ↓
appState configurado (backend, sensor, datas, etc)
    ↓
Interface pronta para usar
```

---

### 2️⃣ **BUSCAR IMAGENS (Clique "Buscar Cenas")**
```
Frontend: gee-handler.js → searchImages()
    ↓
📤 Envia POST para backend/api/search-images
    ├─ bounds (coordenadas do mapa)
    ├─ sensor (sentinel ou landsat)
    ├─ data_start / data_end
    ├─ cloud_cover (% nuvem máx)
    └─ visualization (rgb, ndvi, falsa-cor, agricultura)
    ↓
Backend: app.py → search_images()
    ├─ Descobre órbita MGRS do ponto central
    ├─ Filtra coleção S2_SR_HARMONIZED por órbita
    ├─ Obtém datas distintas (máx 15)
    ├─ Para cada data:
    │  ├─ Calcula vis_params (percentis 2-98)
    │  ├─ Gera thumbnail 100px
    │  └─ Armazena na resposta
    └─ Retorna JSON com 15 imagens máx
    ↓
Frontend: displayImages()
    ├─ Limpa container anterior
    ├─ Para cada imagem:
    │  ├─ Cria card com thumbnail
    │  ├─ Exibe data, % nuvem, satélite
    │  ├─ Exibe código da órbita (ex: 20MRB)
    │  └─ Botão "Comparar"
    └─ Exibe message: "✅ X cenas encontradas"
```

---

### 3️⃣ **CARREGAR IMAGEM (Clique na miniatura)**
```
Frontend: gee-handler.js → toggleImage()
    ↓
Se imagem já carregada → removeImage()
Se não:
    ↓
📤 Envia POST para backend/api/get-image
    ├─ image_id
    ├─ bounds (para TileLayer)
    ├─ visualization
    ├─ sensor
    └─ vis_params (do thumbnail)
    ↓
Backend: app.py → get_image()
    ├─ Seleciona bandas (B4, B3, B2 para RGB)
    ├─ Usa vis_params recebido OU recalcula
    ├─ Gera TileLayer XYZ via ee.data.getMapId()
    └─ Retorna URL formato: {z}/{x}/{y}
    ↓
Frontend: loadImage()
    ├─ Remove layer anterior (map.geeLayer)
    ├─ Cria L.tileLayer() com URL retornado
    ├─ Adiciona ao mapa
    ├─ Marca thumbnail com borda azul
    └─ Exibe message: "✅ Imagem carregada (zoom para ver mais)"
```

---

### 4️⃣ **REMOVER IMAGEM (Clique novamente na miniatura)**
```
Frontend: gee-handler.js → removeImage()
    ↓
Remove map.geeLayer do mapa
    ↓
Remove seleção visual (borda azul)
    ↓
Exibe message: "❌ Imagem removida do mapa"
```

---

### 5️⃣ **COMPARAR IMAGENS (Seleciona 2 + clica "Comparar")**
```
Frontend: gee-handler.js → toggleSelection()
    ├─ Usuário clica "Comparar" em 2 imagens
    ├─ Botão muda para "✓ Selecionada"
    └─ Guarda IDs em selectedImagesForComparison
    ↓
Clica botão "Comparar" principal
    ↓
📤 Envia POST para backend/api/compare-images
    ├─ image_ids (2 imagens)
    └─ visualization
    ↓
Backend: app.py → compare_images()
    ├─ Para cada imagem:
    │  ├─ Calcula vis_params
    │  ├─ Gera TileLayer
    │  └─ Retorna URL
    ↓
Frontend: activateComparisonMode()
    └─ (TODO: implementar split-view)
```

---

## 🔌 **Conexão Backend-Frontend**

| Endpoint | Método | Frontend | Backend | Retorna |
|----------|--------|----------|---------|---------|
| `/api/hello` | GET | - | Teste | `{msg, gee_status}` |
| `/api/search-images` | POST | gee-handler.js | app.py | `{success, total, mgrs_tile, images[]}` |
| `/api/get-image` | POST | gee-handler.js | app.py | `{success, url, visualization, date, type}` |
| `/api/compare-images` | POST | gee-handler.js | app.py | `{success, urls[]}` |

---

## 🛠️ **Tecnologias Utilizadas**

**Backend:**
- Python Flask (servidor)
- Google Earth Engine (imagens de satélite)
- CORS (comunicação cross-origin)

**Frontend:**
- Leaflet.js (mapa interativo)
- Vanilla JavaScript (lógica)
- HTML5 + CSS3 (interface)
- Leaflet TileLayer (imagens em tiles XYZ)

---

## 📊 **Estado da Aplicação (appState)**

```javascript
appState = {
  backend: 'http://127.0.0.1:5000',    // URL do backend
  sensor: 'sentinel',                   // sentinel ou landsat
  dateStart: '2025-11-01',             // Data inicial
  dateEnd: '2025-11-19',               // Data final
  cloudCover: 80,                      // % nuvem máximo
  visualization: 'rgb',                // rgb, ndvi, falsa-cor, agricultura
  gamma: 1.25                          // Ajuste de brilho
}
```

---

## ✅ **Checklist do Sistema**

- ✅ Backend iniciado em http://127.0.0.1:5000
- ✅ Frontend carrega em navegador
- ✅ Mapa Leaflet exibido
- ✅ Botão "Buscar Cenas" funcional
- ✅ Thumbnails exibem com cores corretas (vis_params)
- ✅ Click em thumbnail carrega TileLayer no mapa
- ✅ Pan/zoom da imagem funciona
- ✅ Código da órbita (MGRS) exibido
- ⏳ Split-view de comparação (TODO)


============nova descricao 
O projeto hoje é um WebGIS completo com frontend em HTML/JS/Leaflet e backend em Flask + Google Earth Engine, rodando localmente (dois terminais) e pronto para ser empacotado para nuvem depois.​
Abaixo está um arquivo de documentação em formato “história do sistema” que você pode colar em qualquer nova conversa para explicar o que já existe e como tudo se encaixa.​

Visão geral do projeto
O sistema se chama WebApp Sentinela e é um visualizador de imagens de satélite (Sentinel‑2, Landsat) com ferramentas de busca temporal, ajustes visuais, comparação de cenas e camadas geoespaciais locais (GeoJSON).​

A arquitetura é frontend estático (HTML/CSS/JS + Leaflet) servido via HTTP simples e um backend Flask que conversa com a API Python do Google Earth Engine para buscar imagens, gerar thumbs e servir TileLayers.​

Estrutura de pastas do projeto
A raiz do projeto hoje é algo como:

text
WebAppSentinela/
  backend/
    app.py
    service_account.json  (local)
    venv/                 (ambiente virtual Python)
  frontend/
    index.html
    css/
      style.css
      toolbar.css
    js/
      app.js
      map.js
      layers.js
      toolbar.js
      search.js
      gee-handler.js
      inspector.js
      coordinates.js
      measurement.js
      ui.js
    layers-config.json
    layers-config-template.json
    camadas/
      Fogo_2023.json
      Fogo_2024.json
      Fogo_2025.json
      ... (outros GeoJSON)
  start_sentinela.bat
  stop_sentinela.bat
Tudo que é backend (Flask + GEE) fica em backend/, incluindo o app.py e o venv que contém as bibliotecas Python instaladas.​

Tudo que é frontend (HTML, CSS, JS, camadas GeoJSON e configuração de camadas) fica em frontend/.​

Frontend: HTML principal e layout
O arquivo principal é frontend/index.html, que monta toda a interface: toolbar esquerda, map container central, toolbar direita, painel de cenas, painel de configurações, painel de camadas e footer com coordenadas/escala.​

No <head>, o HTML carrega o CSS do Leaflet, o Font Awesome para ícones, os CSS do projeto (css/style.css e css/toolbar.css) e alguns estilos inline para animação do botão de busca.​

No <body>, existe um container principal #app-container com:

Toolbar vertical esquerda (#toolbar) com botões de zoom, medição, tipo de mapa, inspector, configurações etc.​

Uma search box fixa no topo‐esquerdo para busca de coordenadas/endereço (#searchBox).​

O mapa Leaflet (<div id="map" class="map-container">).​

Toolbar direita (#toolbar-right) com botão para abrir o painel de cenas e botão de camadas (layersBtn).​

Painel direito de cenas (#right-panel) com header, botão de abrir configurações, botão de colapsar e container de thumbnails (.thumbnails-container).​

Painel de camadas (#layers-panel) inicialmente collapsed, cujo conteúdo é preenchido dinamicamente por layers.js.​

Painel de configurações (#settings-panel) com selects e sliders para sensor, tipo de visualização, datas, cobertura de nuvens, gamma, brilho, contraste e botão “Buscar Cenas”.​

Footer com coordenadas atuais, zoom e escala aproximada (.footer-info com #coordsInfo e #distanceInfo).​

Frontend: CSS e identidade visual
O arquivo css/toolbar.css define quase toda a identidade visual: cores escuras de fundo, bordas azuladas, sombras, sliders customizados, layout das toolbars, painel direito, painel de camadas e footer.​

A toolbar esquerda (.toolbar) é fixa na lateral, com largura 60px, fundo #0F1823 e botões quadrados (.toolbar-btn) com ícones do Font Awesome, mudando de cor quando ativos.​

A área do mapa (.map-container) ocupa a faixa central da tela entre as duas toolbars, com position: fixed e height: 100vh, ajustando o right conforme o painel direito está aberto ou fechado.​

O painel de camadas (.layers-panel) é um painel lateral direito colapsável com header em gradiente azul e corpo com scroll; a classe .collapsed move o painel para fora da tela via transform.​

O footer (.footer-info) é um card translúcido com borda e fonte monoespaçada para mostrar coordenadas e escala.​

Frontend: scripts principais e responsabilidades
A ordem dos scripts em index.html é importante para o fluxo de inicialização:​

xml
<script src="js/app.js"></script>
<script src="js/map.js"></script>
<script src="js/layers.js"></script>
<script src="js/toolbar.js"></script>
<script src="js/coordinates.js"></script>
<script src="js/ui.js"></script>
<script src="js/inspector.js"></script>
<script src="js/search.js"></script>
<script src="js/gee-handler.js"></script>
js/app.js
Define o appState global, com URL do backend, sensor padrão, tipo de visualização, gamma, cobertura de nuvens, datas, imagens selecionadas e flag de modo inspector.​

Implementa o teste de status do backend/GEE via /api/hello, atualizando os spans #splash-backend-status e #splash-gee-status na tela de abertura.​

Implementa a lógica da tela de abertura (splash): esconde/remove o overlay #splash-screen ao clicar no botão “Entrar no visualizador”.​

js/map.js
Responsável por inicializar o mapa Leaflet window.map na div #map, definir o centro inicial (Roraima) e adicionar a base de tiles (ESRI World Imagery ou OSM, dependendo do tipo de mapa).​

Expõe o objeto map no escopo global para que outros módulos (layers, inspector, measurement) possam registrar eventos e adicionar camadas.​

js/layers.js
Implementa um gerenciador de camadas com categorias, lendo o arquivo layers-config.json via fetch em carregarConfiguracao().​

Mantém um estado layersManager com config, dicionário de camadas ativas (active), um L.featureGroup para agrupar todas as camadas e flags para painel aberto e tentativas de carregamento.​

A função showLayersPanel() monta o HTML do painel de camadas dinamicamente, criando seções por categoria e um switch (form-check-input) para cada camada; também configura listeners de abrir/fechar categorias (chevrons) e ativar/desativar camadas.​

carregarCamada(nomeCamada) localiza a definição no layers-config.json, faz fetch do GeoJSON (arquivo/url), cria um L.geoJSON com estilo, pointToLayer para pontos e onEachFeature para configurar popups.​

Para pontos com estilo.icone (como as camadas de fogo com "icone": "fa-fire"), o pointToLayer cria um L.marker com L.divIcon usando o ícone do Font Awesome colorido conforme estilo.cor, em vez do marcador azul padrão.​

O onEachFeature monta popups com três modos: template via popupTemplate, valor único via popupField ou uma tabela HTML com todos os atributos (feature.properties) quando nada disso é definido.​

js/toolbar.js
Faz o binding de todos os botões da toolbar: zoom in/out, botão de medição, botão de tipo de mapa, botão de inspector, botão de camadas, botões do painel direito e painel de configurações.​

Para o botão de camadas (layersBtn e closeLayersBtn), chama showLayersPanel() do módulo de layers, usando a mesma função como toggle.​

Para o botão de medição (drawPolyBtn), alterna a classe active: ao ativar, chama showMeasurementOptions() para exibir o mini‑painel com escolha “Área/Distância” e desativa o inspector se estiver ligado; ao desativar, chama clearMeasurements() e remove o #measurementOptions se existir.​

Para o inspector, marca/desmarca appState.inspectorMode, muda o cursor do mapa para crosshair ou grab, e garante que a medição seja desativada quando o inspector é ativado.​

O botão de tipo de mapa remove a camada de tiles atual e alterna entre ESRI World Imagery e OSM, mantendo o restante das camadas.​

js/coordinates.js
Atualiza o footer (#coordsInfo, #distanceInfo) ouvindo eventos de movimento/zoom do Leaflet para mostrar latitude/longitude atual e uma estimativa de escala.​

É responsável por manter o display como “1.9760, -60.3425 | Zoom: 7 | 1:50000 | 3.0 km” (valores aproximados exemplificados no HTML). ​

js/inspector.js
Implementa o modo inspector: quando appState.inspectorMode está true, cliques no mapa geram marcadores/overlays com informação de coordenadas, podendo também disparar chamadas para o backend ou preencher caixas de texto de coordenadas.

Também gerencia a limpeza de marcadores (clearInspectorMarkers) quando o modo é desativado.

js/measurement.js
Implementa a ferramenta de medição de área e distância; cria um measurementLayerGroup, mantém uma lista de pontos (measurementPoints), uma polilinha dinâmica e flags de desenho.​

Registra listeners globais no mapa (map.on('click', handleMeasurementClick) e map.on('mousemove', handleMeasurementMousemove)) ao inicializar o módulo (initMeasurementModule).​

A função showMeasurementOptions() cria um pequeno painel (#measurementOptions) com botões de submodo (área / distância), exibido quando o botão de medição na toolbar é ativado.​

clearMeasurements() remove polígonos/linhas, zera os pontos e limpa o grupo de camadas de medição.​

js/search.js + js/gee-handler.js + js/ui.js
search.js controla o fluxo de busca de cenas: lê parâmetros da UI (datas, sensor, visualização, nuvens, gamma), dispara requisição POST para /api/search-images, gerencia o botão “Buscar Cenas” com animação de spinner e um botão “Cancelar”.​

Preenche a .thumbnails-container do painel direito com cards para cada cena, exibindo thumbnail, data, % nuvem, sensor, órbita MGRS e botões de ação (carregar cena, comparação, etc.).​

gee-handler.js coordena as chamadas para /api/get-image e /api/compare-images, monta as URLs de tile retornadas pelo backend e cria/remova L.TileLayers no mapa para exibir a imagem selecionada e a comparação.​

ui.js centraliza alguns comportamentos de interface, como mensagens ao usuário, toasts, e sincronia entre sliders (gamma, brilho, contraste) e o estado global.​

Backend: Flask + Google Earth Engine
Estrutura do app.py
O backend é um aplicativo Flask simples declarado em backend/app.py: importa Flask, request, jsonify e CORS para habilitar chamadas do frontend local; importa ee para falar com o Google Earth Engine.​

Logo após criar app = Flask(__name__), aplica CORS(app) para permitir requisições cross‑origin vindas do frontend (porta diferente).​

Inicialização do GEE
Na inicialização, o código tenta autenticar e inicializar o Earth Engine, inicialmente lendo um arquivo service_account.json e chamando ee.Initialize(project='webapp-sentinela'); depois essa lógica foi evoluída para usar ServiceAccountCredentials com caminho definido por variável de ambiente em ambientes de nuvem.​

Mensagens de log indicam sucesso ou falha na inicialização, incluindo o nome do projeto GEE (webapp-sentinela).​

Funções auxiliares
apply_scale_factors(img): aplica fator de escala (0.0001) às bandas óticas Sentinel‑2 SR, retornando uma imagem com bandas escaladas adicionadas.​

calculate_dynamic_vis_params(image, bands, geometry_image): calcula percentis 2 e 98 para as bandas especificadas sobre a órbita completa (geometria da imagem), gerando vetores min e max para usar na visualização.​

A função imprime no log os percentis brutos, ajusta um pequeno “buffer” nos limites (-200 e +300) e devolve um dicionário com arrays min e max.​

Endpoint /api/hello
@app.route('/api/hello', methods=['GET']) retorna um JSON simples com mensagem de backend ativo, status do GEE (gee_status: 'conectado') e nome do projeto.​

Esse endpoint é usado pelo frontend no splash para mostrar se o backend e o GEE estão conectados.​

Endpoint /api/search-images
Recebe um POST com JSON contendo bounds (viewport do mapa), sensor (sentinel ou landsat8), date_start, date_end, cloud_cover e visualization.​

Constrói um ponto central e um retângulo de interesse, filtra a coleção do GEE (COPERNICUS/S2_SR_HARMONIZED ou LANDSAT/LC08/...) por bounds, data e nuvens.​

Para Sentinel, determina a órbita (MGRS_TILE) da primeira imagem e refiltra a coleção para essa órbita, mantendo todas as datas disponíveis.​

Gera até ~15 datas distintas (distinct(['system:time_start'])), e para cada uma:

Constrói a imagem, escolhe bandas conforme visualization (B4/B3/B2, B8A/B4/B3, NDVI, agricultura etc.).​

Calcula vis_params dinâmicos via calculate_dynamic_vis_params.​

Gera uma thumbnail com viz_image.visualize(**vis_params).getThumbURL({...}) na órbita completa.​

Extrai % nuvem da propriedade correta (Sentinel ou Landsat).​

Monta um registro com id, date, timestamp, thumbnail, sensor, mgrs_tile, cloud_cover, vis_params.​

Retorna um JSON com success, total, mgrs_tile e a lista images.​

Endpoint /api/get-image
Recebe POST com image_id, visualization, vis_params (opcionais), bounds e gamma.​

Recria a imagem (ee.Image(image_id)), seleciona as bandas de visualização apropriadas ou calcula NDVI, e decide se usa vis_params fornecido pelo frontend ou recalcula.​

Aplica visualize(**vis_params, gamma=gamma) para fixar stretch e gamma, e só então chama ee.data.getMapId({'image': viz_image_colored}) para obter uma URL de tiles.​

Retorna JSON com success, url do TileLayer, visualization e type: 'tilelayer'.​

Endpoint /api/compare-images
Recebe POST com image_ids (lista de 2), visualization, bounds e gamma.​

Para cada imagem: repete o fluxo de seleção de bandas, cálculo de vis_params e visualize(..., gamma=gamma), gerando uma URL de tile.​

Retorna JSON com success e urls (array de duas URLs), usadas pelo frontend para construir um controle de swipe/comparação.​

Fluxo de execução local (modo offline)
Hoje o fluxo “de uso” local é:

O usuário executa um script .bat (por exemplo start_sentinela.bat) na raiz do projeto.

Esse script abre dois terminais:

Um na pasta backend, rodando venv\Scripts\python.exe app.py.​

Outro na pasta frontend, rodando python -m http.server 8000.​

Após alguns segundos, o script abre o navegador em http://127.0.0.1:8000/.​

O navegador carrega frontend/index.html, que por sua vez carrega Leaflet, CSS do projeto e os scripts JS na ordem definida.​

map.js inicializa o mapa; layers.js se prepara para carregar layers-config.json quando o painel de camadas for aberto; toolbar.js registra todos os eventos de botão; search.js e gee-handler.js aguardam o usuário configurar a busca e clicar em “Buscar Cenas”.​

Ao terminar a sessão, os dois terminais permanecem abertos até o usuário fechá‑los manualmente ou usar um .bat de “stop” que mata as janelas específicas pelo título.​

Integração entre frontend e backend (fluxo de imagens)
O usuário define sensor, visualização, datas, cobertura de nuvens e ajusta sliders de gamma/brilho/contraste no painel de configurações.​

Ao clicar em “Buscar Cenas”, o frontend monta um JSON com esses parâmetros, incluindo o bounding box atual do mapa, e manda para /api/search-images do backend.​

O backend consulta o GEE, monta a lista de cenas e devolve uma lista com thumbs e metadados; o frontend mostra essa lista no painel direito como uma sequência de thumbnails clicáveis.​

Ao clicar em uma thumbnail, o frontend chama /api/get-image passando image_id, visualization, vis_params e gamma atual do slider; o backend gera um TileLayer GEE pronto e devolve a URL, que o frontend adiciona ao mapa como camada raster.​

Para comparação, o frontend seleciona duas imagens e chama /api/compare-images, recebendo duas URLs de tiles que são mostradas lado a lado com um controle de swipe.​

Gerenciador de camadas geoespaciais (layers locais)
A configuração das camadas vetoriais é feita em frontend/layers-config.json, com uma lista de categorias, cada uma com nome, icone (para o header) e uma lista de camadas.​

Cada camada tem nome, arquivo (caminho para o GeoJSON dentro de frontend/camadas/), tipo (ponto, linha, poligono), um objeto estilo (cor, espessura, fill, ícone para pontos), flags de visibilidade e, opcionalmente, popupField ou popupTemplate.​

layers.js lê esse JSON, monta o painel com switches, carrega o GeoJSON via fetch e cria um L.geoJSON com estilo uniforme por camada, associando o layer a um featureGroup para facilitar a ativação/desativação.​

Pontos de fogo são configurados com estilo.icone = "fa-fire" e uma cor de contorno, e o código converte isso em L.marker com L.divIcon usando <i class="fa-solid fa-fire"> colorido.​

Ao clicar em qualquer feição vetorial, o popup exibe ou um campo específico (popupField), um template customizado ou uma tabela HTML com todos os atributos de feature.properties.​

Ferramentas de inspeção e medição
Inspector: modo de “cursor cruz” onde cliques no mapa registram coordenadas, adicionam marcadores e podem disparar lógica adicional (ex.: envio de coordenadas para outro painel, inspector GEE etc.).​

Medição de área/distância: modo separado, controlado por drawPolyBtn, que abre o painel #measurementOptions para o usuário escolher se quer medir área ou distância, registrando cliques do mapa para montar polilinhas ou polígonos e mostrar resultados.​

A UI garante que inspector e medição não fiquem ativos ao mesmo tempo: ao ativar um, o outro é desativado automaticamente.​

Tela de abertura (splash screen)
Há um overlay #splash-screen no topo do body, com um cartão central .splash-card contendo o logo, título [Sentinela Sat](pplx://action/translate), subtítulo e botão “Entrar no visualizador”.​

O logo pode ser um PNG próprio em frontend/img/logo-sentinela.png, inserido como <img class="splash-logo-img"> dentro de .splash-logo, com fundo transparente.​

O rodapé da splash mostra duas linhas: “Backend: …” (status de /api/hello) e “GEE: …” (campo gee_status retornado pelo backend).​

app.js inicializa o splash e chama updateStatuses() no load para preencher esses status, e remove o overlay quando o usuário clica no botão de entrar.​