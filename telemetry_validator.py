"""Validador de Integridad Física y Consistencia Metrológica (OMM / WMO-No. 8).

Aplica filtros de rango físico y coherencia termodinámica a toda lectura
proveniente de redes terrestres (DMC, Agromet INIA, RedMeteo, SINCA, PurpleAir).
"""

from __future__ import annotations

import math
import re
from typing import Any


def validar_temperatura(v: Any) -> float | None:
    """Rango físico OMM para Chile/Sudamérica: -50.0°C a +60.0°C."""
    val = sanitizar_numero(v)
    if val is None or val < -50.0 or val > 60.0:
        return None
    return round(val, 1)


def validar_humedad_relativa(v: Any) -> int | None:
    """Rango físico: 0% a 100%."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 100.0:
        return None
    return round(val)


def validar_punto_rocio(td: Any, t_actual: float | None = None) -> float | None:
    """
    Rango físico y consistencia termodinámica.
    Por ley física (WMO-No. 8), el punto de rocío nunca puede ser superior a la temperatura seca.
    """
    val = sanitizar_numero(td)
    if val is None or val < -60.0 or val > 50.0:
        return None
    val = round(val, 1)
    if t_actual is not None and val > t_actual:
        val = t_actual  # Saturación al 100% de humedad relativa
    return val


def validar_viento_kmh(v: Any) -> float | None:
    """Rango físico anemométrico: 0.0 a 300.0 km/h."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 300.0:
        return None
    return round(val, 1)


def validar_direccion_viento(v: Any) -> int | None:
    """Rango azimutal: 0° a 360°."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 360.0:
        return None
    return round(val) % 360


def validar_presion_hpa(v: Any) -> float | None:
    """Rango barométrico terrestre (incluyendo cordillera de los Andes): 500.0 a 1085.0 hPa."""
    val = sanitizar_numero(v)
    if val is None or val < 500.0 or val > 1085.0:
        return None
    return round(val, 1)


def validar_lluvia_mm(v: Any) -> float | None:
    """Rango pluviométrico: >= 0.0 mm y <= 500.0 mm/día."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 500.0:
        return None
    return round(val, 1)


def validar_radiacion_solar(v: Any) -> float | None:
    """Rango piranométrico: 0.0 a 1400.0 W/m² (Constante solar ~1361 W/m²)."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 1400.0:
        return None
    return round(val, 1)


def validar_pm25(v: Any) -> float | None:
    """Concentración MP2.5: 0.0 a 1000.0 µg/m³."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 1000.0:
        return None
    return round(val, 1)


def validar_pm10(v: Any) -> float | None:
    """Concentración MP10: 0.0 a 2000.0 µg/m³."""
    val = sanitizar_numero(v)
    if val is None or val < 0.0 or val > 2000.0:
        return None
    return round(val, 1)


def sanitizar_numero(v: Any) -> float | None:
    """Extrae un número flotante válido descartando sentinelas y textos nulos."""
    if v is None:
        return None
    if isinstance(v, (int, float)):
        if math.isnan(v) or math.isinf(v):
            return None
        if v in (9999.0, -9999.0, 999.0, 99.0, -99.0, 9900.0):
            return None
        return float(v)

    s = str(v).strip().lower()
    if not s or "null" in s or "none" in s or "---" in s or "sin datos" in s or "s/d" in s:
        return None

    m = re.search(r"[-+]?\d*\.\d+|\d+", s.replace(",", "."))
    if not m:
        return None
    try:
        val = float(m.group())
        if val in (9999.0, -9999.0, 999.0, 99.0, -99.0, 9900.0):
            return None
        if val >= 9000.0 or val <= -9000.0:
            return None
        return val
    except (ValueError, TypeError):
        return None


def validar_paquete_telemetria(data: dict[str, Any]) -> dict[str, Any]:
    """Aplica el conjunto de validaciones WMO-No. 8 a un registro completo de telemetría."""
    t = validar_temperatura(data.get("temperatura_c") or data.get("temperatura"))
    hr = validar_humedad_relativa(data.get("humedad_relativa") or data.get("humedad"))
    td = validar_punto_rocio(data.get("punto_rocio_c") or data.get("punto_rocio"), t_actual=t)
    v_kmh = validar_viento_kmh(data.get("viento_kmh") or data.get("velocidad_viento"))
    v_dir = validar_direccion_viento(data.get("direccion_viento_grados") or data.get("direccion_viento"))
    p_hpa = validar_presion_hpa(data.get("presion_hpa") or data.get("presion_absoluta"))
    rain = validar_lluvia_mm(data.get("lluvia_mm") or data.get("lluvia_acumulada_hoy_mm") or data.get("lluviadiaria"))
    rad = validar_radiacion_solar(data.get("radiacion_w_m2") or data.get("radiacion_solar"))

    return {
        "temperatura_c": t,
        "humedad_relativa": hr,
        "punto_rocio_c": td,
        "viento_kmh": v_kmh,
        "direccion_viento_grados": v_dir,
        "presion_hpa": p_hpa,
        "lluvia_mm": rain,
        "radiacion_w_m2": rad,
    }
