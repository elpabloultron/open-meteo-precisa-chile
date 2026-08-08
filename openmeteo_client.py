"""Cliente asíncrono open-source para Open-Meteo API.

Sirve como respaldo (fallback) meteorológico de alta resolución cuando no hay
estaciones terrestres cercanas o sus datos están incompletos.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

OPEN_METEO_BASE_URL = "https://api.open-meteo.com/v1/forecast"


async def obtener_pronostico_openmeteo(
    latitud: float,
    longitud: float,
    dias_pronostico: int = 7,
) -> dict[str, Any] | None:
    """Consulta el pronóstico agroclimático hiperlocal en Open-Meteo."""
    params = {
        "latitude": latitud,
        "longitude": longitud,
        "forecast_days": min(max(dias_pronostico, 1), 16),
        "current": [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "surface_pressure",
            "wind_speed_10m",
            "soil_temperature_0cm",
        ],
        "hourly": [
            "temperature_2m",
            "relative_humidity_2m",
            "soil_temperature_0_to_7cm",
            "soil_moisture_0_to_7cm",
            "et0_fao_evapotranspiration",
        ],
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "et0_fao_evapotranspiration_sum",
            "uv_index_max",
        ],
        "timezone": "auto",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(OPEN_METEO_BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as exc:
        logger.warning(f"Error al consultar Open-Meteo API: {exc}")
        return None
