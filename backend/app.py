import os
import json
import ee
from datetime import datetime
from dotenv import load_dotenv

from flask import Flask, request, jsonify
from flask_cors import CORS

load_dotenv()

# Autenticação GEE com arquivo local
service_account_path = os.getenv(
    'GEE_SERVICE_ACCOUNT_JSON', 'service_account.json')

try:
    ee.Authenticate()
    credentials = ee.oauth.ServiceAccountCredentials(service_account_path)
    ee.Initialize(credentials=credentials, project='webapp-sentinela')
    GEE_STATUS = "✅ Conectado"
except Exception as e:
    GEE_STATUS = f"❌ Erro: {str(e)}"


app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:8000",
    "http://localhost:3000",
    "https://webapp-sentinela.web.app",
    "*"
])


def apply_scale_factors(img):
    """⭐ Aplica fatores de escala Sentinel-2 SR (0.0001)"""
    optical = img.select('B.*').multiply(0.0001)
    return img.addBands(optical, overwrite=True)


def calculate_dynamic_vis_params(image, bands, geometry_image):
    """
    ⭐ Calcula vis_params na GEOMETRIA COMPLETA da imagem (órbita inteira)
    Percentis calculados na faixa BRUTA (0-10000), não na faixa escalada (0-1)
    """
    try:
        print(f"\n  📐 Calculando percentis na ÓRBITA COMPLETA:")

        stats = image.select(bands).reduceRegion(
            reducer=ee.Reducer.percentile([2, 98], ['p2', 'p98']),
            geometry=geometry_image,
            scale=30,
            maxPixels=1e9
        ).getInfo()

        print(f"  📊 Percentis (2% e 98%) na faixa BRUTA (0-10000):")
        min_vals = []
        max_vals = []

        for b in bands:
            p2 = stats.get(b + '_p2', 0) or 0
            p98 = stats.get(b + '_p98', 3000) or 3000

            print(f"     {b}: p2={p2:.2f}, p98={p98:.2f}")

            min_v = max(0, float(p2) - 200)
            max_v = min(10000, float(p98) + 300)

            print(f"     {b}: min_v={min_v:.2f}, max_v={max_v:.2f}")

            min_vals.append(min_v)
            max_vals.append(max_v)

        vis_params = {
            'min': min_vals,
            'max': max_vals
        }
        print(f"  ✅ vis_params FINAL: {vis_params}\n")
        return vis_params
    except Exception as e:
        print(f"  ⚠️ Erro ao calcular vis_params: {e}")
        import traceback
        traceback.print_exc()
        return {
            'min': [0, 0, 0],
            'max': [3000, 3000, 3000]
        }


@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({
        'msg': 'WebApp Sentinela Backend ativo',
        'gee_status': 'conectado',
        'projeto': 'webapp-sentinela'
    })


@app.route('/api/search-images', methods=['POST'])
def search_images():
    """Busca imagens por órbita MGRS"""
    try:
        data = request.get_json()

        bounds = data.get('bounds')
        sensor = data.get('sensor', 'sentinel')
        date_start = data.get('date_start')
        date_end = data.get('date_end')
        cloud_cover = data.get('cloud_cover', 80)
        visualization = data.get('visualization', 'rgb')

        if not bounds or len(bounds) != 2:
            return jsonify({'error': 'Bounds inválido'}), 400

        center_lat = (bounds[0][0] + bounds[1][0]) / 2
        center_lng = (bounds[0][1] + bounds[1][1]) / 2
        center_point = ee.Geometry.Point([center_lng, center_lat])

        aoi_bounds = ee.Geometry.Rectangle([
            bounds[0][1], bounds[0][0],
            bounds[1][1], bounds[1][0]
        ])

        print(f"\n🔍 BUSCA DE IMAGENS")
        print(f"   Localização: {center_lat:.4f}, {center_lng:.4f}")
        print(f"   Período: {date_start} a {date_end}")
        print(f"   Visualização: {visualization}")
        print(f"   📐 Bounds viewport: {bounds}")

        mgrs_tile = 'UNKNOWN'

        if sensor == 'sentinel':
            collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                .filterBounds(center_point) \
                .filterDate(date_start, date_end) \
                .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', cloud_cover)) \
                .sort('system:time_start', False)

            first_img = collection.first()
            try:
                mgrs_tile = first_img.get('MGRS_TILE').getInfo()
                print(f"   ✅ Órbita MGRS: {mgrs_tile}")
            except Exception as e:
                print(f"   ⚠️ Não foi possível obter MGRS_TILE: {e}")

            if mgrs_tile != 'UNKNOWN':
                collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED') \
                    .filterBounds(center_point) \
                    .filterDate(date_start, date_end) \
                    .filter(ee.Filter.lte('CLOUDY_PIXEL_PERCENTAGE', cloud_cover)) \
                    .filter(ee.Filter.eq('MGRS_TILE', mgrs_tile)) \
                    .sort('system:time_start', False)
        else:
            collection = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2') \
                .filterBounds(aoi_bounds) \
                .filterDate(date_start, date_end) \
                .filter(ee.Filter.lte('CLOUD_COVER', cloud_cover)) \
                .sort('system:time_start', False)
            mgrs_tile = 'LANDSAT'

        unique_dates = collection.distinct(['system:time_start'])
        image_list = unique_dates.toList(15).getInfo()

        print(f"   📊 {len(image_list)} datas encontradas")

        if not image_list:
            return jsonify({
                'success': False,
                'message': 'Nenhuma imagem encontrada',
                'images': []
            })

        images_data = []

        for idx, item in enumerate(image_list):
            img_id = item['id']
            timestamp = item['properties']['system:time_start']
            date = datetime.fromtimestamp(timestamp / 1000)
            date_str = date.strftime('%Y-%m-%d')

            print(f"\n   📸 [{idx + 1}/{len(image_list)}] {date_str}")

            try:
                image = ee.Image(img_id)

                if visualization == 'ndvi':
                    viz_image = image.normalizedDifference(
                        ['B8A', 'B4']).rename('NDVI')
                    bands = ['NDVI']
                elif visualization == 'falsa-cor':
                    viz_image = image.select(['B8A', 'B4', 'B3'])
                    bands = ['B8A', 'B4', 'B3']
                elif visualization == 'agricultura':
                    viz_image = image.select(['B11', 'B8A', 'B2'])
                    bands = ['B11', 'B8A', 'B2']
                else:
                    viz_image = image.select(['B4', 'B3', 'B2'])
                    bands = ['B4', 'B3', 'B2']

                orbit_geom = image.geometry()
                vis_params = calculate_dynamic_vis_params(
                    viz_image, bands, orbit_geom)

                # ⭐ APLICAR VISUALIZE ANTES DE GERAR THUMB
                thumb_url = viz_image.visualize(**vis_params).getThumbURL({
                    'dimensions': 100,
                    'region': orbit_geom,
                    'format': 'png'
                })

                cloud_pct = float(item['properties'].get(
                    'CLOUDY_PIXEL_PERCENTAGE',
                    item['properties'].get('CLOUD_COVER', 0)
                ))

                images_data.append({
                    'id': img_id,
                    'date': date_str,
                    'timestamp': timestamp,
                    'thumbnail': thumb_url,
                    'sensor': sensor,
                    'mgrs_tile': mgrs_tile,
                    'cloud_cover': cloud_pct,
                    'vis_params': vis_params
                })

                print(f"        ✅ OK")

            except Exception as e:
                print(f"        ❌ {str(e)[:100]}")
                import traceback
                traceback.print_exc()
                continue

        print(f"\n✅ RESULTADO: {len(images_data)} imagens retornadas\n")

        return jsonify({
            'success': True,
            'total': len(images_data),
            'mgrs_tile': mgrs_tile,
            'images': images_data
        })

    except Exception as e:
        print(f"\n❌ ERRO GERAL: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/get-image', methods=['POST'])
def get_image():
    """⭐ Retorna TileLayer com visualize() APLICADO + GAMMA DINÂMICO"""
    try:
        data = request.get_json()

        image_id = data.get('image_id')
        visualization = data.get('visualization', 'rgb')
        vis_params_input = data.get('vis_params')
        bounds = data.get('bounds')
        gamma = float(data.get('gamma', 1.0))  # ⭐ RECEBER GAMMA DO FRONTEND

        image = ee.Image(image_id)

        print(f"\n🎬 CARREGANDO TILELAYER")
        print(f"   Visualização: {visualization}")
        print(f"   🎨 Gamma: {gamma}")

        if bounds:
            print(f"   📐 Bounds viewport: {bounds}")

        if visualization == 'ndvi':
            viz_image = image.normalizedDifference(
                ['B8A', 'B4']).rename('NDVI')
            bands = ['NDVI']
        elif visualization == 'falsa-cor':
            viz_image = image.select(['B8A', 'B4', 'B3'])
            bands = ['B8A', 'B4', 'B3']
        elif visualization == 'agricultura':
            viz_image = image.select(['B11', 'B8A', 'B2'])
            bands = ['B11', 'B8A', 'B2']
        else:
            viz_image = image.select(['B4', 'B3', 'B2'])
            bands = ['B4', 'B3', 'B2']

        # ⭐ USAR VIS_PARAMS DO FRONTEND OU RECALCULAR
        if vis_params_input and isinstance(vis_params_input, dict):
            vis_params = vis_params_input
            print(f"   ✅ Usando vis_params do frontend:")
            print(f"      min={vis_params.get('min')}")
            print(f"      max={vis_params.get('max')}")
        else:
            print(f"   ⚠️ vis_params não fornecido, calculando...")
            orbit_geom = image.geometry()
            vis_params = calculate_dynamic_vis_params(
                viz_image, bands, orbit_geom)

        # ⭐ CRÍTICO: Aplicar visualize() COM GAMMA ANTES de getMapId()!
        print(
            f"\n   🎨 Aplicando visualize() com vis_params e gamma={gamma}...")
        viz_image_colored = viz_image.visualize(**vis_params, gamma=gamma)

        # ⭐ AGORA gerar TileLayer da imagem já visualizada
        map_id = ee.data.getMapId({'image': viz_image_colored})
        tile_url = map_id['tile_fetcher'].url_format

        print(f"   ✅ TileLayer gerado com sucesso (visualize + gamma aplicado)\n")

        return jsonify({
            'success': True,
            'url': tile_url,
            'visualization': visualization,
            'type': 'tilelayer'
        })

    except Exception as e:
        print(f"\n❌ Erro ao carregar imagem: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/compare-images', methods=['POST'])
def compare_images():
    """Compara duas imagens"""
    try:
        data = request.get_json()

        image_ids = data.get('image_ids', [])
        visualization = data.get('visualization', 'rgb')
        bounds = data.get('bounds')
        gamma = float(data.get('gamma', 1.0))  # ⭐ RECEBER GAMMA

        if len(image_ids) != 2:
            return jsonify({'error': 'Selecione 2 imagens'}), 400

        print(f"\n🔄 COMPARANDO 2 IMAGENS")
        print(f"   Visualização: {visualization}")
        print(f"   Gamma: {gamma}")

        urls = []

        for idx, img_id in enumerate(image_ids):
            print(f"\n   [{idx + 1}/2] Processando...")

            try:
                image = ee.Image(img_id)
                orbit_geom = image.geometry()

                if visualization == 'ndvi':
                    viz_image = image.normalizedDifference(
                        ['B8A', 'B4']).rename('NDVI')
                    bands = ['NDVI']
                elif visualization == 'falsa-cor':
                    viz_image = image.select(['B8A', 'B4', 'B3'])
                    bands = ['B8A', 'B4', 'B3']
                elif visualization == 'agricultura':
                    viz_image = image.select(['B11', 'B8A', 'B2'])
                    bands = ['B11', 'B8A', 'B2']
                else:
                    viz_image = image.select(['B4', 'B3', 'B2'])
                    bands = ['B4', 'B3', 'B2']

                vis_params = calculate_dynamic_vis_params(
                    viz_image, bands, orbit_geom)

                # ⭐ Aplicar visualize() COM GAMMA ANTES de getMapId()
                viz_image_colored = viz_image.visualize(
                    **vis_params, gamma=gamma)
                map_id = ee.data.getMapId({'image': viz_image_colored})
                url = map_id['tile_fetcher'].url_format

                urls.append(url)
                print(f"        ✅ OK")

            except Exception as e:
                print(f"        ❌ {str(e)[:100]}")
                continue

        print(f"\n✅ Comparação preparada: {len(urls)} URLs\n")

        return jsonify({'success': True, 'urls': urls})

    except Exception as e:
        print(f"\n❌ Erro ao comparar: {str(e)}\n")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 WebApp Sentinela - Backend iniciado")
    print("="*60)
    print("Backend rodando em: http://127.0.0.1:5000")
    print("Projeto: webapp-sentinela")
    print("🎨 Suporta gamma dinâmico via slider de ajuste!")
    print("="*60 + "\n")
    app.run(host='127.0.0.1', port=5000, debug=True)
