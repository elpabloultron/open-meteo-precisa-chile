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
    monkeypatch.setattr(main.GEECore, "initialize", classmethod(lambda _cls: False))
    monkeypatch.setattr(main, "httpx", main.httpx)
    monkeypatch.setattr(main.httpx, "AsyncClient", lambda *_args, **_kwargs: FakeOpenMeteoClient())

    with TestClient(main.app) as test_client:
        yield test_client

    CACHE_MEMORIA.clear()
    CACHE_MEMORIA.update(original_cache)


def test_home_endpoint_reports_real_status(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert isinstance(data["google_earth_engine_activo"], bool)
    assert data["cache_status"] == "ok"


def test_capas_mapa_endpoint_accepts_default_coordinates(client):
    response = client.get("/api/v1/capas-mapa")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "NDVI_layer" in data["capas"]


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


def test_historico_accepts_lng_alias_and_validates_missing_longitude(client):
    response = client.get("/api/v1/weather/historico?lat=-38.7359")
    assert response.status_code == 400


def test_manual_sync_requires_configuration_or_token(client, monkeypatch):
    monkeypatch.setattr(main, "settings", replace(main.settings, admin_sync_token="test-token"))
    response = client.post("/api/v1/admin/sincronizar-ahora")
    assert response.status_code == 401


def test_clean_num_discards_sentinel_values():
    assert clean_num("12,5") == 12.5
    assert clean_num("999.0") is None