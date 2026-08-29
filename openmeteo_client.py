"""Cliente asíncrono open-source para Open-Meteo API.

Sirve como respaldo (fallback) meteorológico de alta resolución y generador de
series temporales históricas / pronosticadas para gráficos interactivos.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"


def _calc_vpd_local(temp_c: float, hr: float) -> float:
    """Calcula el Déficit de Presión de Vapor (VPD) en kPa (FAO/Tetens)."""
    try:
        hr = max(0.0, min(100.0, float(hr)))
        es = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
        ea = es * (hr / 100.0)
        return round(max(0.0, es - ea), 2)
    except Exception:
        return 0.5


def _clean_int(val: Any, default: int = 7) -> int:
    try:
        if hasattr(val, "default"):
            val = val.default
        return int(val)
    except Exception:
        return default


async def obtener_pronostico_openmeteo(
    latitud: float,
    longitud: float,
    dias_pronostico: int = 7,
) -> dict[str, Any] | None:
    """Consulta el pronóstico agroclimático hiperlocal en Open-Meteo."""
    dias_clean = _clean_int(dias_pronostico, 7)
    params = {
        "latitude": latitud,
        "longitude": longitud,
        "forecast_days": min(max(dias_clean, 1), 16),
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "dew_point_2m",
            "precipitation",
            "surface_pressure",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "uv_index",
        ],
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "dew_point_2m",
            "precipitation",
            "precipitation_probability",
            "surface_pressure",
            "wind_speed_10m",
            "wind_gusts_10m",
            "uv_index",
            "et0_fao_evapotranspiration",
        ],
        "daily": [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "et0_fao_evapotranspiration",
            "precipitation_sum",
            "precipitation_probability_max",
            "sunrise",
            "sunset",
            "uv_index_max",
        ],
        "timezone": "America/Santiago",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OPEN_METEO_BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning(f"Error al consultar Open-Meteo API: {exc}")
        return None


async def obtener_series_temporales_graficos(
    latitud: float,
    longitud: float,
    horas: int = 24,
    dias: int = 7,
) -> dict[str, Any]:
    """Genera matrices estructuradas de series de tiempo para renderizado directo en gráficos frontend."""
    horas_clean = _clean_int(horas, 24)
    dias_clean = _clean_int(dias, 7)
    data = await obtener_pronostico_openmeteo(latitud, longitud, dias_pronostico=dias_clean)
    if not data:
        return {
            "status": "error",
            "mensaje": "No se pudo obtener datos de series temporales.",
            "curva_termica": {},
            "curva_viento": {},
            "curva_humedad_vpd": {},
            "histograma_precipitacion": {},
            "resumen_diario_7d": [],
        }

    hourly = data.get("hourly", {})
    daily = data.get("daily", {})

    times = hourly.get("time", [])[:horas_clean]
    temps = hourly.get("temperature_2m", [])[:horas_clean]
    dews = hourly.get("dew_point_2m", [])[:horas_clean]
    winds = hourly.get("wind_speed_10m", [])[:horas_clean]
    gusts = hourly.get("wind_gusts_10m", [])[:horas_clean]
    hrs = hourly.get("relative_humidity_2m", [])[:horas_clean]
    precips = hourly.get("precipitation", [])[:horas_clean]
    precip_probs = hourly.get("precipitation_probability", [])[:horas_clean]

    # Calcular VPD horario
    vpds = []
    for t, h in zip(temps, hrs):
        if t is not None and h is not None:
            vpds.append(_calc_vpd_local(t, h))
        else:
            vpds.append(0.5)

    # Formatear etiquetas de tiempo amigables (ej: "14:00")
    etiquetas_horas = [t.split("T")[-1] if "T" in t else t for t in times]

    # Resumen diario 7 días
    dias_fechas = daily.get("time", [])
    dias_tmax = daily.get("temperature_2m_max", [])
    dias_tmin = daily.get("temperature_2m_min", [])
    dias_eto = daily.get("et0_fao_evapotranspiration", [])
    dias_rain = daily.get("precipitation_sum", [])
    dias_uv = daily.get("uv_index_max", [])
    dias_codes = daily.get("weather_code", [])

    resumen_diario = []
    for i in range(len(dias_fechas)):
        resumen_diario.append(
            {
                "fecha": dias_fechas[i],
                "temp_min_c": dias_tmin[i] if i < len(dias_tmin) else None,
                "temp_max_c": dias_tmax[i] if i < len(dias_tmax) else None,
                "et0_fao_mm": dias_eto[i] if i < len(dias_eto) else 0.0,
                "lluvia_total_mm": dias_rain[i] if i < len(dias_rain) else 0.0,
                "uv_index_max": dias_uv[i] if i < len(dias_uv) else 0.0,
                "weather_code": dias_codes[i] if i < len(dias_codes) else 0,
            }
        )

    return {
        "status": "ok",
        "coordenadas": {"latitud": latitud, "longitud": longitud},
        "ventana_horas": len(times),
        "timestamps": times,
        "etiquetas_horas": etiquetas_horas,
        "curva_termica": {
            "etiquetas": etiquetas_horas,
            "temperatura_c": temps,
            "punto_rocio_c": dews,
            "unidad": "°C",
            "descripcion": "Evolución horaria de temperatura y punto de rocío (monitoreo de heladas)",
        },
        "curva_viento": {
            "etiquetas": etiquetas_horas,
            "viento_sostenido_kmh": winds,
            "rafagas_max_kmh": gusts,
            "unidad": "km/h",
            "descripcion": "Velocidad de viento y ráfagas (ventanas de pulverización fitosanitaria)",
        },
        "curva_humedad_vpd": {
            "etiquetas": etiquetas_horas,
            "humedad_relativa": hrs,
            "deficit_presion_vapor_kpa": vpds,
            "descripcion": "Humedad relativa y Déficit de Presión de Vapor (estrés hídrico vegetal)",
        },
        "histograma_precipitacion": {
            "etiquetas": etiquetas_horas,
            "lluvia_horaria_mm": precips,
            "probabilidad_porcentaje": precip_probs,
            "unidad": "mm",
            "descripcion": "Volumen de precipitación y probabilidad horaria",
        },
        "resumen_diario_7d": resumen_diario,
    }
