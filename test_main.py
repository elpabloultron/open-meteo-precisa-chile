import copy
import time
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

import main
from sincronizador_background import CACHE_MEMORIA, clean_num

SAMPLE_CACHE = {
    "last_updated": int(time.time()),
    "status": "ok",
    "satelite_goes19": {
        "frames_1800x1080": ["https://example.test/goes-1800.webp"],
        "frames_900x540": ["https://example.test/goes-900.webp"],
        "frames_450x270": ["https://example.test/goes-450.webp"],
        "total": 1,
        "fps_recomendado": 10,
        "intervalo_ms": 100,
        "ventana_horas": 24,
    },
    "estaciones_telemetria": {
        "dmc_001": {
            "temperatura_c": 16.5,
            "viento_kmh": 8.0,
            "humedad_relativa": 60,
            "viento_direccion": "S",
            "punto_rocio_c": 8.0,
            "lluvia_acumulada_hoy_mm": 0.0,
        }
    },
    "calidad_aire_sinca": {},
    "calidad_aire_purpleair": {},
    "pronostico_oficial_dmc": {"resumen_nacional": "Sin alertas relevantes."},
    "alertas_senapred": [],
    "catalogo_estaciones": [
        {"id": "dmc_001", "nombre": "Temuco", "sector": "Araucanía", "red": "DMC", "lat": -38.7359, "lon": -72.5904}
    ],
    "gee_puntos": {},
}


class FakeOpenMeteoResponse:
    status_code = 200

    @staticmethod
    def json():
        return {
            "current": {
                "temperature_2m": 16.5,
                "relative_humidity_2m": 60,
                "apparent_temperature": 16.0,
                "dew_point_2m": 8.0,
                "precipitation": 0.0,
                "wind_speed_10m": 8.0,
                "wind_direction_10m": 180,
                "wind_gusts_10m": 12.0,
                "surface_pressure": 1013.0,
            },
            "daily": {
                "sunrise": ["2026-08-08T07:30"],
                "sunset": ["2026-08-08T18:20"],
                "et0_fao_evapotranspiration": [2.0],
                "uv_index_max": [4.0],
                "precipitation_sum": [0.0],
                "temperature_2m_min": [7.0],
                "temperature_2m_max": [18.0],
            },
            "hourly": {"temperature_2m": [8.0, 7.0, 6.0]},
        }


class FakeOpenMeteoClient:
    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False

    async def get(self, *_args, **_kwargs):
        return FakeOpenMeteoResponse()


@pytest.fixture
def client(monkeypatch):
    original_cache = copy.deepcopy(CACHE_MEMORIA)
    CACHE_MEMORIA.clear()
    CACHE_MEMORIA.update(copy.deepcopy(SAMPLE_CACHE))

    monkeypatch.setattr(main, "cargar_cache_desde_disco", lambda: True)
    monkeypatch.setattr(main, "refrescar_cache_si_corresponde", lambda _interval: False)
    monkeypatch.setattr(main, "httpx", main.httpx)
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda *_args, **_kwargs: FakeOpenMeteoClient())

    import gee_service

    monkeypatch.setattr(gee_service, "inicializar_earth_engine", lambda: False)

    with TestClient(main.app) as test_client:
        yield test_client

    CACHE_MEMORIA.clear()
    CACHE_MEMORIA.update(original_cache)


def test_status_endpoint_reports_real_status(client):
    response = client.get("/api/v1/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["cache_status"] == "ok"


def test_capas_mapa_endpoint_accepts_default_coordinates(client):
    response = client.get("/api/v1/capas-mapa")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_capas_mapa_rejects_invalid_coordinates(client):
    response = client.get("/api/v1/capas-mapa?lat=100&lon=-70")
    assert response.status_code == 422


def test_buscar_estaciones_endpoint_uses_cached_catalog(client):
    response = client.get("/api/v1/buscar-estaciones?q=Temuco")
    assert response.status_code == 200
    assert response.json()[0]["nombre"] == "Temuco"


def test_alertas_senapred_endpoint_uses_cached_data(client):
    response = client.get("/api/v1/alertas-senapred")
    assert response.status_code == 200
    assert response.json()["alertas"] == []


def test_weather_current_endpoint_uses_cached_and_mocked_data(client):
    response = client.get("/api/v1/weather/current?lat=-38.7359&lng=-72.5904")
    assert response.status_code == 200
    data = response.json()
    assert data["estacion"]["id"] == "dmc_001"
    assert data["modo_urbano"]["temperatura_c"] == 16.5
    assert "transparency_metadata" in data


def test_weather_current_requires_longitude(client):
    response = client.get("/api/v1/weather/current?lat=-38.7359")
    assert response.status_code == 400


def test_manual_sync_requires_configuration_or_token(client, monkeypatch):
    monkeypatch.setattr(main, "settings", replace(main.settings, admin_sync_token="test-token"))
    response = client.post("/api/v1/admin/sincronizar-ahora")
    assert response.status_code == 401


def test_clean_num_discards_sentinel_values():
    assert clean_num("12,5") == 12.5
    assert clean_num("999.0") is None


def test_historico_estacion_endpoint(client, monkeypatch):
    import db_store

    monkeypatch.setattr(
        db_store,
        "obtener_historico_estacion",
        lambda station_id, dias=1, db_path=None: [
            {"station_id": station_id, "temperatura_c": 18.2, "humedad_relativa": 55}
        ],
    )

    response = client.get("/api/v1/historico/estacion?station_id=dmc_001&dias=1")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["station_id"] == "dmc_001"
    assert len(data["serie_temporal"]) >= 1
    assert data["serie_temporal"][0]["temperatura_c"] == 18.2


def test_historico_stats_endpoint(client, monkeypatch):
    import db_store

    monkeypatch.setattr(
        db_store,
        "obtener_estadisticas_db",
        lambda db_path=None: {
            "estado": "activo",
            "motor": "PostgreSQL + TimescaleDB",
            "total_registros_telemetria": 100,
        },
    )

    response = client.get("/api/v1/historico/stats")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "estadisticas" in data
    assert "TimescaleDB" in data["estadisticas"]["motor"]


def test_clima_hiperlocal_prioritizes_physical_station(client):
    response = client.get("/api/v1/clima-hiperlocal?lat=-38.7359&lon=-72.5904")
    assert response.status_code == 200
    data = response.json()
    assert "estacion" in data
    assert "modo_urbano" in data
    assert data["modo_urbano"]["temperatura_c"] == 16.5
    assert "transparency_metadata" in data


def test_kdtree_spatial_search_returns_nearest():
    from main import buscar_estacion_mas_cercana

    catalogo = [
        {"id": "st_santiago", "nombre": "Santiago", "lat": -33.45, "lon": -70.66},
        {"id": "st_temuco", "nombre": "Temuco", "lat": -38.74, "lon": -72.59},
        {"id": "st_puerto_montt", "nombre": "Puerto Montt", "lat": -41.47, "lon": -72.94},
    ]
    # Consulta cerca de Temuco (-38.73, -72.60)
    est, dist = buscar_estacion_mas_cercana(-38.73, -72.60, catalogo)
    assert est is not None
    assert est["id"] == "st_temuco"
    assert dist < 5.0


def test_calcular_punto_rocio_and_vpd():
    from main import calcular_punto_rocio, calcular_vpd

    # T=20°C, HR=50% -> Punto de rocío aprox 9.3°C
    dew = calcular_punto_rocio(20.0, 50.0)
    assert 8.5 <= dew <= 10.0

    # T=25°C, HR=40% -> VPD alrededor de 1.9 kPa
    vpd = calcular_vpd(25.0, 40.0)
    assert 1.7 <= vpd <= 2.1


def test_calcular_triangulacion_idw_lapse_rate():
    from main import calcular_triangulacion_idw

    catalogo = [
        {"id": "e1", "lat": -33.40, "lon": -70.60, "elevacion": 500.0},
        {"id": "e2", "lat": -33.42, "lon": -70.62, "elevacion": 500.0},
        {"id": "e3", "lat": -33.38, "lon": -70.58, "elevacion": 500.0},
    ]
    tele = {
        "e1": {"temperatura_c": 20.0, "humedad_relativa": 50, "viento_kmh": 10.0},
        "e2": {"temperatura_c": 20.0, "humedad_relativa": 50, "viento_kmh": 10.0},
        "e3": {"temperatura_c": 20.0, "humedad_relativa": 50, "viento_kmh": 10.0},
    }
    # Objetivo a 1500m de elevación (1000m más alto -> debe enfriar 6.5°C)
    res = calcular_triangulacion_idw(-33.40, -70.60, catalogo, tele, elevacion_objetivo=1500.0)
    assert res is not None
    assert round(res["temperatura_c"], 1) == 13.5
    assert len(res["estaciones_utilizadas"]) == 3


def test_alertas_engine_helada_critica():
    from alertas_engine import evaluar_alertas_meteorologicas

    clima_data = {
        "estacion": {"nombre": "Curicó"},
        "modo_agricola": {
            "temperatura_minima_hoy_c": -1.5,
            "punto_rocio_c": -2.0,
            "rafagas_max_kmh": 5.0,
            "deficit_presion_vapor_vpd_kpa": 0.5,
        },
        "modo_urbano": {"indice_uv": 2, "calidad_aire_sinca": {}},
        "metadatos": {"temperatura_c": 0.0, "viento_kmh": 4.0},
    }
    alertas = evaluar_alertas_meteorologicas(clima_data)
    ids = [a["id"] for a in alertas]
    assert "helada_critica" in ids


def test_alertas_engine_deriva_fitosanitaria():
    from alertas_engine import evaluar_alertas_meteorologicas

    clima_data = {
        "estacion": {"nombre": "Rancagua"},
        "modo_agricola": {
            "temperatura_minima_hoy_c": 12.0,
            "punto_rocio_c": 8.0,
            "rafagas_max_kmh": 28.0,
            "deficit_presion_vapor_vpd_kpa": 1.1,
        },
        "modo_urbano": {"indice_uv": 4, "calidad_aire_sinca": {}},
        "metadatos": {"temperatura_c": 18.0, "viento_kmh": 18.5},
    }
    alertas = evaluar_alertas_meteorologicas(clima_data)
    ids = [a["id"] for a in alertas]
    assert "deriva_fitosanitaria" in ids


def test_alertas_engine_uv_and_sinca():
    from alertas_engine import evaluar_alertas_meteorologicas

    clima_data = {
        "estacion": {"nombre": "Santiago Centro"},
        "modo_agricola": {
            "temperatura_minima_hoy_c": 14.0,
            "punto_rocio_c": 10.0,
            "rafagas_max_kmh": 8.0,
            "deficit_presion_vapor_vpd_kpa": 2.2,
        },
        "modo_urbano": {
            "indice_uv": 11,
            "calidad_aire_sinca": {
                "norma_chilena": "Preemergencia Ambiental 🔴",
                "norma_chilena_mma": {"nivel_codigo": "preemergencia"},
            },
        },
        "metadatos": {"temperatura_c": 32.0, "viento_kmh": 6.0},
    }
    alertas = evaluar_alertas_meteorologicas(clima_data)
    ids = [a["id"] for a in alertas]
    assert "uv_extremo" in ids
    assert "aqi_alerta" in ids
    assert "vpd_extremo" in ids


def test_atribucion_sensores_matrix_in_clima_hiperlocal(client):
    response = client.get("/api/v1/clima-hiperlocal?lat=-38.7359&lon=-72.5904")
    assert response.status_code == 200
    data = response.json()
    assert "atribucion_sensores" in data
    matrix = data["atribucion_sensores"]

    expected_vars = [
        "temperatura",
        "humedad_relativa",
        "viento",
        "presion_barometrica",
        "calidad_aire_mp25",
        "calidad_aire_mp10",
        "radiacion_uv",
        "punto_rocio",
        "deficit_presion_vapor",
        "lluvia_hoy",
    ]
    for var in expected_vars:
        assert var in matrix, f"Variable {var} falta en atribucion_sensores"
        entry = matrix[var]
        assert "valor" in entry
        assert "unidad" in entry
        assert "fuente" in entry
        assert "tipo_origen" in entry


def test_historico_curvas_endpoint(client, monkeypatch):
    import openmeteo_client

    fake_curves_payload = {
        "status": "ok",
        "coordenadas": {"latitud": -38.7359, "longitud": -72.5904},
        "ventana_horas": 24,
        "timestamps": ["2026-08-26T00:00"],
        "etiquetas_horas": ["00:00"],
        "curva_termica": {
            "etiquetas": ["00:00"],
            "temperatura_c": [15.0],
            "punto_rocio_c": [8.0],
            "unidad": "°C",
        },
        "curva_viento": {
            "etiquetas": ["00:00"],
            "viento_sostenido_kmh": [10.0],
            "rafagas_max_kmh": [18.0],
            "unidad": "km/h",
        },
        "curva_humedad_vpd": {
            "etiquetas": ["00:00"],
            "humedad_relativa": [60],
            "deficit_presion_vapor_kpa": [0.68],
        },
        "histograma_precipitacion": {
            "etiquetas": ["00:00"],
            "lluvia_horaria_mm": [0.0],
            "probabilidad_porcentaje": [10],
            "unidad": "mm",
        },
        "resumen_diario_7d": [
            {
                "fecha": "2026-08-26",
                "temp_min_c": 6.0,
                "temp_max_c": 18.0,
                "et0_fao_mm": 2.1,
                "lluvia_total_mm": 0.0,
                "uv_index_max": 4.0,
                "weather_code": 1,
            }
        ],
    }
    monkeypatch.setattr(
        openmeteo_client,
        "obtener_series_temporales_graficos",
        lambda latitud, longitud, horas=24, dias=7: asyncio.sleep(0, result=fake_curves_payload),
    )

    import asyncio

    response = client.get("/api/v1/historico/curvas?lat=-38.7359&lon=-72.5904")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "curva_termica" in data
    assert "curva_viento" in data
    assert "curva_humedad_vpd" in data
    assert "histograma_precipitacion" in data
    assert len(data["resumen_diario_7d"]) >= 1


def test_radar_doppler_tiles_endpoint(client, monkeypatch):
    class FakeRainViewerResp:
        status_code = 200

        @staticmethod
        def json():
            return {
                "version": "2.0",
                "generated": 1787783900,
                "host": "https://tilecache.rainviewer.com",
                "radar": {
                    "past": [{"time": 1787780000, "path": "/v2/radar/1787780000"}],
                    "nowcast": [{"time": 1787783600, "path": "/v2/radar/nowcast_1787783600"}],
                },
                "satellite": {"infrared": [{"time": 1787780000, "path": "/v2/satellite/1787780000"}]},
            }

    class FakeRainViewerClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_):
            return False

        async def get(self, *_args, **_kwargs):
            return FakeRainViewerResp()

    monkeypatch.setattr(main.httpx, "AsyncClient", lambda *_args, **_kwargs: FakeRainViewerClient())
    main._RAINVIEWER_CACHE = {"timestamp": 0.0, "data": None}

    response = client.get("/api/v1/radar/doppler-tiles")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["host"] == "https://tilecache.rainviewer.com"
    assert data["total_frames"] == 2
    assert len(data["frames"]) == 2
    assert "{z}/{x}/{y}" in data["frames"][0]["tile_url_pattern"]


def test_satellite_latest_loop_endpoint(client):
    response = client.get("/api/v1/satellite/latest-loop")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ventana_horas"] == 6
    assert data["fps"] == 12
    assert "video_url" in data


def test_parsear_timestamp_noaa():
    from goes_processor import _parsear_timestamp_noaa

    filename = "20262381845_GOES19-ABI-SSA-GEOCOLOR-1800x1080.jpg"
    ts_utc, hora_cl, fecha_cl = _parsear_timestamp_noaa(filename)
    assert "2026" in ts_utc
    assert "hrs" in hora_cl
    assert "/" in fecha_cl


def test_suelo_satelital_endpoint(client):
    response = client.get("/api/v1/agro/suelo-satelital?lat=-40.347946&lon=-73.307493")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "ndvi_vigor_vegetal" in data
    assert "humedad_suelo" in data
    assert "ndwi_estres_hidrico" in data
    assert data["ndvi_vigor_vegetal"]["valor"] >= 0.0


def test_modulos_tierra_vs_espacio_structure(client):
    response = client.get("/api/v1/clima-hiperlocal?lat=-40.347946&lon=-73.307493")
    assert response.status_code == 200
    data = response.json()

    # 1. Modulo Urbano
    assert "modulo_urbano" in data
    assert "en_tierra" in data["modulo_urbano"]
    assert "desde_el_espacio_gee" in data["modulo_urbano"]
    assert "gases_atmosfericos_sentinel5p" in data["modulo_urbano"]["desde_el_espacio_gee"]

    # 2. Modulo Agrícola
    assert "modulo_agricola" in data
    assert "en_tierra" in data["modulo_agricola"]
    assert "desde_el_espacio_gee" in data["modulo_agricola"]
    assert "ndvi_vigor_vegetal" in data["modulo_agricola"]["desde_el_espacio_gee"]

    # 3. Modulo Emergencias y Entorno
    assert "modulo_emergencias_y_entorno" in data
    assert "en_tierra" in data["modulo_emergencias_y_entorno"]
    assert "desde_el_espacio_gee" in data["modulo_emergencias_y_entorno"]
    assert "focos_calor_incendios_nasa_firms" in data["modulo_emergencias_y_entorno"]["desde_el_espacio_gee"]
    assert "cobertura_nieve_cordillera_sentinel2" in data["modulo_emergencias_y_entorno"]["desde_el_espacio_gee"]


def test_calidad_aire_satelital_s5p_endpoint(client):
    response = client.get("/api/v1/urbano/calidad-aire-satelital?lat=-33.45&lon=-70.66")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "gases_atmosfericos_sentinel5p" in data
    assert "isla_calor_urbano_lst" in data


def test_emergencias_focos_calor_firms_endpoint(client):
    response = client.get("/api/v1/emergencias/focos-calor?lat=-38.74&lon=-72.59&radio_km=50")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "total_focos_activos" in data
    assert "nivel_alerta" in data


def test_entorno_nieve_cordillera_endpoint(client):
    response = client.get("/api/v1/entorno/nieve-cordillera?lat=-33.45&lon=-70.66")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "cobertura_nival_porcentaje" in data
    assert "linea_de_nieve_estimada_msnm" in data


def test_solar_fotovoltaico_endpoint(client):
    response = client.get("/api/v1/solar/fotovoltaico?lat=-40.347946&lon=-73.307493")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "generacion_solar_kwh_m2_dia" in data
    assert "horas_solares_pico_hsp" in data
    assert "potencial_bombeo_riego_solar" in data
    assert data["generacion_solar_kwh_m2_dia"] > 0.0


def test_topografia_laderas_endpoint(client):
    response = client.get("/api/v1/agro/topografia-laderas?lat=-40.347946&lon=-73.307493")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "pendiente_porcentaje" in data
    assert "orientacion_ladera_aspect" in data
    assert "evaluacion_microclima_heladas" in data


def test_entorno_costero_endpoint_dynamic_trigger(client):
    # Coordenada cercana a la costa (Valparaíso / Viña -33.02, -71.62)
    resp_costa = client.get("/api/v1/entorno/costero?lat=-33.02&lon=-71.62")
    assert resp_costa.status_code == 200
    data_c = resp_costa.json()
    assert data_c["es_zona_costera"] is True
    assert "temperatura_superficial_mar_sst_c" in data_c

    # Coordenada interior (Santiago Centro -33.45, -70.66)
    resp_interior = client.get("/api/v1/entorno/costero?lat=-33.45&lon=-70.66")
    assert resp_interior.status_code == 200
    data_i = resp_interior.json()
    assert data_i["es_zona_costera"] is False


def test_sqlite_cache_satellite_persistence():
    import gee_cache_db

    test_lat = -40.35
    test_lon = -73.31
    test_data = {"test_val": 42, "status": "ok", "vegetacion": "optima"}

    # Guardar
    gee_cache_db.guardar_cache("test_agro", test_lat, test_lon, test_data, ttl_segundos=3600)

    # Recuperar
    cached = gee_cache_db.obtener_cache("test_agro", test_lat, test_lon)
    assert cached is not None
    assert cached["test_val"] == 42
    assert cached["vegetacion"] == "optima"


def test_gzip_compression_middleware(client):
    headers = {"Accept-Encoding": "gzip"}
    response = client.get("/api/v1/clima-hiperlocal?lat=-40.347946&lon=-73.307493", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("content-encoding") == "gzip"


def test_cache_satelital_status_and_precalentar_endpoints(client):
    # Status
    resp_status = client.get("/api/v1/cache/satelital/status")
    assert resp_status.status_code == 200
    assert resp_status.json()["status"] == "ok"
    assert "registros_expirados_limpiados" in resp_status.json()

    # Precalentar
    resp_pre = client.post("/api/v1/cache/satelital/precalentar")
    assert resp_pre.status_code == 200
    data_pre = resp_pre.json()
    assert data_pre["status"] == "ok"
    assert data_pre["valles_procesados"] > 0


def test_telemetry_validator_wmo_standards():
    import telemetry_validator

    # 1. Temperatura
    assert telemetry_validator.validar_temperatura("18.4") == 18.4
    assert telemetry_validator.validar_temperatura("999.0") is None
    assert telemetry_validator.validar_temperatura(75.0) is None  # Fuera de rango físico

    # 2. Humedad
    assert telemetry_validator.validar_humedad_relativa("65.2") == 65
    assert telemetry_validator.validar_humedad_relativa(120) is None

    # 3. Consistencia Punto de Rocío (Td <= T)
    assert telemetry_validator.validar_punto_rocio(8.0, t_actual=15.0) == 8.0
    # Si el sensor reporta Td mayor a T, se fuerza saturación Td = T
    assert telemetry_validator.validar_punto_rocio(22.0, t_actual=15.0) == 15.0

    # 4. Radiación Solar y Presión
    assert telemetry_validator.validar_radiacion_solar("450.0") == 450.0
    assert telemetry_validator.validar_radiacion_solar("1800.0") is None  # Excede constante solar
    assert telemetry_validator.validar_presion_hpa("1014.2") == 1014.2

    # 5. Paquete completo
    paquete = {
        "temperatura_c": "19.5",
        "humedad_relativa": "55",
        "punto_rocio_c": "25.0",  # Inconsistente -> debe corregirse a 19.5
        "viento_kmh": "12.3",
        "direccion_viento_grados": "180",
        "presion_hpa": "1013.25",
        "lluvia_mm": "0.0",
        "radiacion_w_m2": "650.0",
    }
    limpio = telemetry_validator.validar_paquete_telemetria(paquete)
    assert limpio["temperatura_c"] == 19.5
    assert limpio["humedad_relativa"] == 55
    assert limpio["punto_rocio_c"] == 19.5
    assert limpio["viento_kmh"] == 12.3
    assert limpio["radiacion_w_m2"] == 650.0


def test_historico_alias_path_endpoint(client, monkeypatch):
    import db_store

    monkeypatch.setattr(
        db_store,
        "obtener_historico_estacion",
        lambda station_id, dias=1, db_path=None: [{"fecha_hora_utc": "2026-08-28T12:00:00Z", "temperatura_c": 21.0}],
    )

    response = client.get("/api/history/dmc_002?dias=3")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["station_id"] == "dmc_002"
    assert data["ventana_dias"] == 3
    assert len(data["serie_temporal"]) == 1
    assert data["serie_temporal"][0]["temperatura_c"] == 21.0


def test_response_latency_cached_endpoints(client):
    import time

    t0 = time.perf_counter()
    resp = client.get("/api/v1/alertas-senapred")
    lat_ms = (time.perf_counter() - t0) * 1000.0
    assert resp.status_code == 200
    assert lat_ms < 50.0  # Respuesta en memoria < 50ms

    t0 = time.perf_counter()
    resp2 = client.get("/api/v1/status")
    lat_ms2 = (time.perf_counter() - t0) * 1000.0
    assert resp2.status_code == 200
    assert lat_ms2 < 50.0


def test_atomic_cache_save_and_load(tmp_path, monkeypatch):
    import cache_store
    from app_config import settings

    test_file = tmp_path / "test_atomic_cache.json"
    mocked_settings = replace(settings, local_cache_path=test_file, cache_backend="local")
    monkeypatch.setattr(cache_store, "settings", mocked_settings)

    sample_data = {"test_key": "val_123", "last_updated": 1234567890}
    cache_store.save_cache(sample_data)

    assert test_file.exists()
    loaded = cache_store.load_cache()
    assert loaded is not None
    assert loaded["test_key"] == "val_123"


def test_sqlite_wal_mode_enabled():
    import gee_cache_db

    conn = gee_cache_db._obtener_conexion()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode;")
    mode = cursor.fetchone()[0]
    conn.close()
    assert str(mode).lower() == "wal"


@pytest.mark.asyncio
async def test_gee_service_timeout_fallback():
    import time

    from gee_service import _ejecutar_getInfo_seguro

    def hanging_call():
        time.sleep(2.0)
        return {"data": "late"}

    # Debe expirar en timeout=0.1s y retornar None sin elevar excepción
    t0 = time.perf_counter()
    res = await _ejecutar_getInfo_seguro(hanging_call, timeout=0.1)
    dur = time.perf_counter() - t0

    assert res is None
    assert dur < 1.0


def test_static_assets_and_pwa_serviceworker(client):
    r_idx = client.get("/")
    assert r_idx.status_code == 200
    assert "MeteoPrecisa" in r_idx.text

    r_js = client.get("/static/app.js")
    assert r_js.status_code == 200
    assert "consultarClima" in r_js.text

    r_sw = client.get("/static/sw.js")
    assert r_sw.status_code == 200
    assert "addEventListener" in r_sw.text
