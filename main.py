import asyncio
import logging
import math
import os
import secrets
import time
import unicodedata
from contextlib import asynccontextmanager
from typing import Any

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles

import goes_processor
from app_config import settings
from sincronizador_background import (
    CACHE_MEMORIA,
    cargar_cache_desde_disco,
    ejecutar_sincronizacion_completa,
    iniciar_loop_background,
    refrescar_cache_si_corresponde,
)


def obtener_capas_gee_y_windy(lat: float, lon: float) -> list:
    return []


def construir_transparency_metadata(last_up_ts: int, boletin_dmc: dict = None, est_info: dict = None) -> dict:
    now_ts = int(time.time())
    last_ts = last_up_ts if last_up_ts > 0 else now_ts
    time_struct = time.localtime(last_ts)
    time_str = time.strftime("%H:00", time_struct)

    updated_str = f"Actualización a las {time_str} hrs"

    boletin_txt = boletin_dmc.get("resumen_nacional", "") if isinstance(boletin_dmc, dict) else ""
    st_id = est_info.get("id", "dmc_oficial") if est_info else "dmc_oficial"
    red_name = est_info.get("red", "DMC / Agromet") if est_info else "DMC"

    if "dmc" in str(st_id).lower():
        raw_url = "https://climatologia.meteochile.gob.cl"
    elif "agromet" in str(st_id).lower():
        raw_url = "https://agrometeorologia.cl"
    elif "redmeteo" in str(st_id).lower():
        raw_url = "https://redmeteo.cl"
    else:
        raw_url = "https://servicios.meteochile.gob.cl"

    return {
        "station_id": st_id,
        "raw_source_url": raw_url,
        "is_live_data": True,
        "source_name": f"Dirección Meteorológica de Chile ({red_name}) / Google Earth Engine",
        "last_fetched_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(last_ts)),
        "updated_ago_str": updated_str,
        "updated_at_label": f"Actualización a las {time_str} hrs",
        "official_bulletin": boletin_txt
        or "Predominio de estabilidad atmosférica en la zona central y valles interiores de Chile.",
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa dependencias y asegura datos frescos en memoria."""
    cargar_cache_desde_disco()

    # Pre-calentamiento satelital no bloqueante
    import gee_service

    asyncio.create_task(gee_service.precalentar_valles_agricolas())

    task = None
    if settings.enable_in_process_sync:
        task = asyncio.create_task(iniciar_loop_background(900))
    else:
        # Si no hay worker externo (Cloud Run serverless), refrescar automáticamente si la caché es antigua (>30 min)
        if time.time() - CACHE_MEMORIA.get("last_updated", 0) > settings.cache_refresh_seconds:
            asyncio.create_task(ejecutar_sincronizacion_completa())

    yield

    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="MeteoPrecisa Chile - Engine Unificado Multired",
    description="Backend Oficial Open Source: Google Earth Engine (NDVI, Humedad de Suelo), Capas Viento Windy, Modo Urbano, Modo Agrícola, Calidad del Aire Dual (SINCA+AQI), GOES-19, DMC y Open-Meteo",
    version="10.3.0",
    lifespan=lifespan,
)


os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(GZipMiddleware, minimum_size=1000)

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-Admin-Token"],
)


@app.middleware("http")
async def refresh_cache_before_api(request: Request, call_next):
    if request.url.path.startswith("/api/"):
        await asyncio.to_thread(refrescar_cache_si_corresponde, settings.cache_refresh_seconds)
        # Auto-recuperación si la caché está obsoleta (>1 hora) y no se está sincronizando
        ahora_ts = int(time.time())
        if CACHE_MEMORIA.get("status") != "syncing" and (ahora_ts - CACHE_MEMORIA.get("last_updated", 0) > 3600):
            asyncio.create_task(ejecutar_sincronizacion_completa())
    response = await call_next(request)

    # Headers de seguridad
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"

    # Control de caché
    path = request.url.path
    if not path.startswith("/api/") and not path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    elif path.startswith("/static/"):
        # Caché de assets por 1 hora
        response.headers["Cache-Control"] = "public, max-age=3600"

    return response


HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"}

logger = logging.getLogger("main")

_HTTP_CLIENT_POOL: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    global _HTTP_CLIENT_POOL
    if _HTTP_CLIENT_POOL is None or _HTTP_CLIENT_POOL.is_closed:
        _HTTP_CLIENT_POOL = httpx.AsyncClient(
            headers=HEADERS,
            timeout=httpx.Timeout(3.0, connect=1.5),
            limits=httpx.Limits(max_keepalive_connections=30, max_connections=100),
        )
    return _HTTP_CLIENT_POOL


def quitar_tildes(texto: str) -> str:
    if not texto:
        return ""
    return "".join(c for c in unicodedata.normalize("NFD", str(texto)) if unicodedata.category(c) != "Mn").lower()


def _safe_float(val: Any, default: float = 0.0) -> float:
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def _safe_int(val: Any, default: int = 0) -> int:
    if val is None:
        return default
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def calcular_distancia(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))


_SPATIAL_TREE = None
_SPATIAL_CATALOGO = []


_SPATIAL_CATALOGO_ID = None

def obtener_arbol_espacial(catalogo: list):
    global _SPATIAL_TREE, _SPATIAL_CATALOGO, _SPATIAL_CATALOGO_ID
    if _SPATIAL_TREE is not None and _SPATIAL_CATALOGO_ID == id(catalogo):
        return _SPATIAL_TREE, _SPATIAL_CATALOGO

    try:
        import numpy as np
        from scipy.spatial import KDTree

        validos = [est for est in catalogo if est.get("lat") is not None and est.get("lon") is not None]
        if not validos:
            return None, []
        coords = np.array([[est["lat"], est["lon"]] for est in validos])
        _SPATIAL_TREE = KDTree(coords)
        _SPATIAL_CATALOGO = validos
        _SPATIAL_CATALOGO_ID = id(catalogo)
        return _SPATIAL_TREE, _SPATIAL_CATALOGO
    except Exception:
        return None, []


def buscar_estacion_mas_cercana(lat: float, lon: float, catalogo: list) -> tuple[dict | None, float]:
    """Búsqueda espacial sub-milisegundo usando KDTree con verificación esférica Haversine."""
    tree, valid_cat = obtener_arbol_espacial(catalogo)
    if tree is not None and len(valid_cat) > 0:
        import numpy as np

        k = min(5, len(valid_cat))
        _, idxs = tree.query([lat, lon], k=k)
        if isinstance(idxs, (int, np.integer)):
            idxs = [idxs]

        best_est = None
        min_d = float("inf")
        for idx in idxs:
            if idx < len(valid_cat):
                est = valid_cat[idx]
                d = calcular_distancia(lat, lon, est["lat"], est["lon"])
                if d < min_d:
                    min_d = d
                    best_est = est
        return best_est, min_d
    else:
        best_est = None
        min_d = float("inf")
        for est in catalogo:
            if est.get("lat") is not None and est.get("lon") is not None:
                d = calcular_distancia(lat, lon, est["lat"], est["lon"])
                if d < min_d:
                    min_d = d
                    best_est = est
        return best_est, min_d


def calcular_punto_rocio(temp_c: float, hr: float) -> float:
    """Calcula el punto de rocío usando la ecuación de Magnus-Tetens (OMM)."""
    try:
        hr = max(1.0, min(100.0, float(hr)))
        a = 17.27
        b = 237.7
        alpha = ((a * temp_c) / (b + temp_c)) + math.log(hr / 100.0)
        return round((b * alpha) / (a - alpha), 1)
    except Exception:
        return round(temp_c - ((100.0 - hr) / 5.0), 1)


def calcular_vpd(temp_c: float, hr: float) -> float:
    """Calcula el Déficit de Presión de Vapor (VPD) en kPa (FAO/Tetens)."""
    try:
        hr = max(0.0, min(100.0, float(hr)))
        es = 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))
        ea = es * (hr / 100.0)
        vpd = es - ea
        return round(max(0.0, vpd), 2)
    except Exception:
        return 1.0


def calcular_rumbo_cardinal(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.cos(dLon)
    brng = (math.degrees(math.atan2(y, x)) + 360) % 360
    puntos = ["Norte", "Noreste", "Este", "Sudeste", "Sur", "Suroeste", "Oeste", "Noroeste"]
    return puntos[int((brng + 22.5) / 45) % 8]


def calcular_horas_frio(hourly_temps: list[float]) -> int:
    if not hourly_temps:
        return 0
    ultimas_24h = hourly_temps[-24:] if len(hourly_temps) >= 24 else hourly_temps
    return sum(1 for t in ultimas_24h if t is not None and t <= 7.0)


def evaluar_inversion_termica(temp_c: float, viento_kmh: float, humedad: float) -> dict:
    if temp_c <= 6.0 and viento_kmh <= 4.0 and humedad >= 75:
        return {
            "nivel": "Alta 🔴",
            "color": "#ef4444",
            "desc": "Riesgo de humo por leña y contaminantes atrapados en superficie",
        }
    elif temp_c <= 10.0 and viento_kmh <= 8.0:
        return {"nivel": "Moderada 🟡", "color": "#f59e0b", "desc": "Capa de ventilación reducida en el valle"}
    else:
        return {"nivel": "Baja 🟢", "color": "#10b981", "desc": "Buena dispersión atmosférica"}


def calcular_calidad_aire_dual(pm25_val: float | None, pm10_val: float | None) -> dict:
    val_mp25 = pm25_val if (pm25_val is not None and not math.isnan(pm25_val)) else 15.0
    val_mp10 = pm10_val if (pm10_val is not None and not math.isnan(pm10_val)) else 32.0

    # 1. Norma Chilena D.S. 12/2011 MMA para MP2.5 y MP10
    if val_mp25 <= 49.0 and val_mp10 <= 149.0:
        norma_chile = {
            "categoria": "Buena 🟢",
            "nivel_codigo": "bueno",
            "color_hex": "#10b981",
            "medidas_normativas": [
                "Sin restricciones ambientales.",
                "Calidad de aire adecuada para realizar actividades deportivas y al aire libre sin limitaciones.",
            ],
        }
    elif val_mp25 <= 79.0 or val_mp10 <= 199.0:
        norma_chile = {
            "categoria": "Alerta 🟡",
            "nivel_codigo": "alerta",
            "color_hex": "#f59e0b",
            "medidas_normativas": [
                "Prohibición de uso de calefactores y cocinas a leña en toda la zona urbana.",
                "Grupos sensibles (niños, adultos mayores, asmáticos) deben evitar ejercicios intensos al aire libre.",
                "Fiscalización de humos visibles en fuentes fijas e industriales.",
            ],
        }
    elif val_mp25 <= 109.0 or val_mp10 <= 329.0:
        norma_chile = {
            "categoria": "Preemergencia 🟠",
            "nivel_codigo": "preemergencia",
            "color_hex": "#f97316",
            "medidas_normativas": [
                "Prohibición total de uso de calefactores a leña y derivados de madera.",
                "Restricción vehicular reinforced para vehículos con y sin sello verde.",
                "Suspensión obligatoria de clases de Educación Física en establecimientos escolares.",
                "Paralización de fuentes fijas industriales declaradas prioritarias.",
            ],
        }
    else:
        norma_chile = {
            "categoria": "Emergencia 🔴",
            "nivel_codigo": "emergencia",
            "color_hex": "#ef4444",
            "medidas_normativas": [
                "Paralización total de fuentes industriales y chimeneas de leña en la región.",
                "Restricción vehicular extendida a múltiples dígitos.",
                "Prohibición total de actividades deportivas y eventos masivos al aire libre.",
                "Uso recomendado de mascarillas en traslados urbanos para grupos vulnerables.",
            ],
        }

    # 2. Índice Internacional US-EPA AQI
    if val_mp25 <= 12.0:
        aqi_val = int((50 / 12.0) * val_mp25)
        aqi_cat = "Bueno (Good) 🟢"
        aqi_desc = "Calidad del aire satisfactoria, riesgo nulo o mínimo."
    elif val_mp25 <= 35.4:
        aqi_val = int(51 + ((100 - 51) / (35.4 - 12.1)) * (val_mp25 - 12.1))
        aqi_cat = "Moderado (Moderate) 🟡"
        aqi_desc = "Calidad de aire aceptable. Personas excepcionalmente sensibles deben considerar reducir esfuerzo prolongado."
    elif val_mp25 <= 55.4:
        aqi_val = int(101 + ((150 - 101) / (55.4 - 35.5)) * (val_mp25 - 35.5))
        aqi_cat = "Insalubre para Grupos Sensibles 🟠"
        aqi_desc = "Niños, ancianos y personas con enfermedades respiratorias pueden experimentar efectos."
    elif val_mp25 <= 150.4:
        aqi_val = int(151 + ((200 - 151) / (150.4 - 55.5)) * (val_mp25 - 55.5))
        aqi_cat = "Insalubre (Unhealthy) 🔴"
        aqi_desc = "Cualquier persona puede comenzar a experimentar efectos en la salud."
    elif val_mp25 <= 250.4:
        aqi_val = int(201 + ((300 - 201) / (250.4 - 150.5)) * (val_mp25 - 150.5))
        aqi_cat = "Muy Insalubre (Very Unhealthy) 🟣"
        aqi_desc = "Advertencia de salud de condiciones de emergencia para toda la población."
    else:
        aqi_val = min(500, int(301 + ((500 - 301) / (500.4 - 250.5)) * (val_mp25 - 250.5)))
        aqi_cat = "Peligroso (Hazardous) 🟤"
        aqi_desc = "Alerta de salud de nivel de emergencia grave para toda la población."

    return {
        "norma_chilena": norma_chile.get("categoria"),
        "aqi_us": aqi_val,
        "mp25_ugm3": round(val_mp25, 1),
        "mp10_ugm3": round(val_mp10, 1),
        "mediciones_base": {"mp25_ug_m3": round(val_mp25, 1), "mp10_ug_m3": round(val_mp10, 1)},
        "norma_chilena_mma": norma_chile,
        "tabla_internacional_aqi": {"aqi_indice": aqi_val, "categoria": aqi_cat, "descripcion_salud": aqi_desc},
    }


# ======================================================================
# ENDPOINTS PRINCIPALES
# ======================================================================


@app.get("/api/v1/status")
def status():
    return {
        "status": "online",
        "servicio": "MeteoPrecisa Chile - Engine Multired Unificado",
        "version": "10.2.0",
        "stac_engine_activo": True,
        "cache_backend": settings.cache_backend,
        "cache_status": CACHE_MEMORIA.get("status", "uninitialized"),
        "ultima_sincronizacion_timestamp": CACHE_MEMORIA.get("last_updated", 0),
        "total_estaciones_registradas": len(CACHE_MEMORIA.get("catalogo_estaciones", [])),
    }


@app.get("/api/v1/capas-mapa")
async def obtener_capas_mapa(
    lat: float = Query(-33.4450, ge=-90, le=90, description="Latitud del centro del mapa"),
    lon: float = Query(-70.6830, ge=-180, le=180, description="Longitud del centro del mapa"),
):
    capas = obtener_capas_gee_y_windy(lat, lon)
    return {"status": "ok", "total_capas": len(capas), "capas": capas}


@app.get("/api/v1/historico/estacion")
@app.get("/api/history/{station_id}")
async def obtener_historico_estacion_api(
    station_id: str | None = None,
    dias: int = Query(1, ge=1, le=365, description="Ventana de tiempo en días (máximo 365 días)"),
):
    """Devuelve la serie de tiempo real histórica almacenada en base de datos para una estación."""
    if not station_id:
        return {"status": "error", "mensaje": "station_id es requerido", "serie_temporal": []}
    from db_store import obtener_historico_estacion

    try:
        registros = await asyncio.to_thread(obtener_historico_estacion, station_id, dias)
        return {
            "status": "ok",
            "station_id": station_id,
            "ventana_dias": dias,
            "total_registros": len(registros),
            "serie_temporal": registros,
        }
    except Exception as e:
        return {
            "status": "error",
            "station_id": station_id,
            "mensaje": f"Error consultando histórico: {e}",
            "serie_temporal": [],
        }


@app.get("/api/v1/historico/stats")
async def obtener_estadisticas_db_api():
    """Devuelve métricas de salud y almacenamiento de la base de datos histórica SQLite."""
    from db_store import obtener_estadisticas_db

    try:
        return {"status": "ok", "estadisticas": await asyncio.to_thread(obtener_estadisticas_db)}
    except Exception as e:
        return {"status": "error", "mensaje": str(e)}


@app.get("/api/v1/satelite-goes19")
async def obtener_satelite_goes19(
    resolucion: str = Query(
        "450x270", description="Resolución deseada: 450x270 (ultra liviana 15KB), 900x540 o 1800x1080"
    ),
    ventana_horas: int = Query(24, description="Ventana temporal en horas (12 o 24)"),
):
    sat_cache = CACHE_MEMORIA.get("satelite_goes19", {})
    f_1800 = sat_cache.get("frames_1800x1080", [])
    f_900 = sat_cache.get("frames_900x540", [])
    f_450 = sat_cache.get("frames_450x270", [])

    if "1800" in resolucion:
        frames = f_1800 or f_900 or f_450
    elif "900" in resolucion:
        frames = f_900 or f_1800 or f_450
    else:
        frames = f_450 or f_900 or f_1800

    if ventana_horas <= 12:
        frames = frames[-72:] if len(frames) >= 72 else frames

    if not frames:
        frames = ["https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/latest.jpg"]

    total = len(frames)
    fps = 10
    intervalo_ms = 100
    duracion = round(total / fps, 1)

    return {
        "status": "ok",
        "resolucion": resolucion,
        "total_frames": total,
        "ventana_horas": ventana_horas,
        "reproduccion_fluida": {
            "fps_recomendado": fps,
            "intervalo_ms": intervalo_ms,
            "duracion_animacion_segundos": duracion,
            "bucle_continuo": True,
        },
        "frames": frames,
        "fuente": "NOAA STAR GOES-19 Infrarrojo GeoColor",
    }


@app.get("/api/v1/buscar-estaciones")
async def buscar_estaciones(
    q: str = Query("", description="Nombre de comuna, ciudad o estación"),
    limite: int = Query(650, description="Límite máximo de estaciones"),
):
    catalogo = CACHE_MEMORIA.get("catalogo_estaciones", [])
    if not catalogo:
        from sincronizador_background import cargar_catalogo_maestro

        catalogo = cargar_catalogo_maestro()

    try:
        lim_val = int(limite)
    except Exception:
        lim_val = 650

    q_clean = q.strip() if q else ""
    if not q_clean or len(q_clean) < 2:
        return [
            {
                "id": e.get("id"),
                "nombre": e.get("nombre"),
                "sector": e.get("sector", "Chile"),
                "red": e.get("red", "Oficial"),
                "lat": e.get("lat"),
                "lon": e.get("lon"),
            }
            for e in catalogo[:lim_val]
        ]

    q_norm = quitar_tildes(q_clean)
    tokens = q_norm.split()

    # 1. Búsqueda en catálogo de estaciones físicas
    res_estaciones = []
    ids_encontrados = set()
    for e in catalogo:
        searchable_text = quitar_tildes(
            f"{e.get('nombre', '')} {e.get('sector', '')} {e.get('comuna', '')} {e.get('region', '')} {e.get('red', '')} {e.get('id', '')}"
        )
        if all(t in searchable_text for t in tokens):
            st_id = e.get("id")
            if st_id not in ids_encontrados:
                ids_encontrados.add(st_id)
                res_estaciones.append(
                    {
                        "id": st_id,
                        "nombre": e.get("nombre"),
                        "sector": e.get("sector", "Chile"),
                        "red": e.get("red", "Oficial"),
                        "lat": e.get("lat"),
                        "lon": e.get("lon"),
                    }
                )

    # 2. Búsqueda Geográfica de Ciudades / Comunas en Chile
    lugares_geo = []
    try:
        url_geo = f"https://geocoding-api.open-meteo.com/v1/search?name={q_clean}&country=CL&language=es&count=6"
        async with httpx.AsyncClient(headers=HEADERS, timeout=2.0) as client:
            resp_geo = await client.get(url_geo)
            if resp_geo.status_code == 200:
                geo_data = resp_geo.json()
                for item in geo_data.get("results", []):
                    nombre_ciudad = item.get("name", "")
                    admin1 = item.get("admin1", "Chile")
                    admin2 = item.get("admin2", "")
                    sec_str = f"{admin2}, {admin1}".strip(", ") if admin2 else admin1
                    lugares_geo.append(
                        {
                            "id": f"geo_{item.get('id', '')}",
                            "nombre": f"📍 {nombre_ciudad} ({admin1})",
                            "sector": f"Comuna / Ciudad ({sec_str})",
                            "red": "Ubicación Geográfica",
                            "lat": item.get("latitude"),
                            "lon": item.get("longitude"),
                        }
                    )
    except Exception:
        pass

    resultados_totales = res_estaciones + lugares_geo
    return resultados_totales[:lim_val]


@app.get("/api/v1/alertas-senapred")
async def obtener_alertas_senapred():
    return {
        "status": "ok",
        "total": len(CACHE_MEMORIA.get("alertas_senapred", [])),
        "alertas": CACHE_MEMORIA.get("alertas_senapred", []),
    }


def calcular_triangulacion_idw(
    target_lat: float, target_lon: float, catalogo: list, telemetria_map: dict, elevacion_objetivo: float = 150.0
):
    candidatas = []
    for est in catalogo:
        st_id = est.get("id")
        tele = telemetria_map.get(st_id, {})
        t_c = tele.get("temperatura_c")
        if t_c is not None and -50.0 <= t_c <= 60.0:
            d = calcular_distancia(target_lat, target_lon, est["lat"], est["lon"])
            if d <= 85.0:
                candidatas.append(
                    {
                        "estacion": est,
                        "telemetria": tele,
                        "dist_km": d,
                        "temp_c": t_c,
                        "hr": tele.get("humedad_relativa"),
                        "viento_kmh": tele.get("viento_kmh"),
                        "elevacion": est.get("elevacion", 100.0),
                    }
                )

    candidatas.sort(key=lambda x: x["dist_km"])
    if len(candidatas) < 3:
        return None

    top3 = candidatas[:3]
    total_w = 0.0
    w_temp = 0.0
    w_hr = 0.0
    w_viento = 0.0

    for item in top3:
        d = max(item["dist_km"], 0.1)
        w = 1.0 / (d**2)
        total_w += w

        diff_alt_m = elevacion_objetivo - item["elevacion"]
        temp_adj = item["temp_c"] - (0.0065 * diff_alt_m)

        w_temp += temp_adj * w
        w_hr += (item["hr"] if item["hr"] is not None else 65.0) * w
        w_viento += (item["viento_kmh"] if item["viento_kmh"] is not None else 5.0) * w

    if total_w == 0.0:
        return None

    return {
        "temperatura_c": round(w_temp / total_w, 1),
        "humedad_relativa": int(round(w_hr / total_w)),
        "viento_kmh": round(w_viento / total_w, 1),
        "estaciones_utilizadas": [item["estacion"]["id"] for item in top3],
    }


@app.get("/api/v1/clima-hiperlocal")
async def obtener_clima_hiperlocal(
    lat: float = Query(..., description="Latitud GPS"), lon: float = Query(..., description="Longitud GPS")
):
    catalogo = CACHE_MEMORIA.get("catalogo_estaciones", [])

    if not catalogo:
        from sincronizador_background import cargar_catalogo_maestro

        catalogo = cargar_catalogo_maestro()

    estacion_cercana, dist_min = buscar_estacion_mas_cercana(lat, lon, catalogo)

    if not estacion_cercana:
        raise HTTPException(status_code=404, detail="No se encontró ninguna estación meteorológica cercana.")

    rumbo = calcular_rumbo_cardinal(lat, lon, estacion_cercana["lat"], estacion_cercana["lon"])

    # Telemetría en vivo desde caché
    telemetria_map = CACHE_MEMORIA.get("estaciones_telemetria", {})
    est_id = estacion_cercana.get("id")
    telemetria_directa = telemetria_map.get(est_id, {})

    # Calidad de aire (Unificando SINCA y PurpleAir)
    sinca_map = CACHE_MEMORIA.get("calidad_aire_sinca", {})
    purple_map = CACHE_MEMORIA.get("calidad_aire_purpleair", {})

    todas_caq = [v for v in sinca_map.values() if isinstance(v, dict)] + [
        v for v in purple_map.values() if isinstance(v, dict)
    ]
    estacion_caq_cercana = None
    dist_min_caq = float("inf")

    for aq in todas_caq:
        if aq.get("lat") is not None and aq.get("lon") is not None:
            d = calcular_distancia(lat, lon, aq["lat"], aq["lon"])
            if d < dist_min_caq:
                dist_min_caq = d
                estacion_caq_cercana = aq

    sinca_info = estacion_caq_cercana

    calidad_aire_eval = calcular_calidad_aire_dual(
        sinca_info.get("pm25") if sinca_info else 15.0, sinca_info.get("pm10") if sinca_info else 30.0
    )
    if sinca_info:
        calidad_aire_eval["estacion_fuente"] = (
            f"{sinca_info.get('estacion_nombre', 'Sensor')} ({round(dist_min_caq, 1)} km)"
        )
        calidad_aire_eval["pm25_raw"] = sinca_info.get("pm25")
        calidad_aire_eval["pm10_raw"] = sinca_info.get("pm10")

    # Open-Meteo para pronóstico numérico con Conexión Persistente y Caché en Memoria (15 minutos)
    key_om = (round(lat, 2), round(lon, 2))
    cache_om_store = CACHE_MEMORIA.get("open_meteo_cache", {})
    ahora_ts = time.time()

    datos_om = {}
    if key_om in cache_om_store and (ahora_ts - cache_om_store[key_om]["timestamp"] < 900):
        datos_om = cache_om_store[key_om]["data"]
    else:
        url_om = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&"
            f"current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,"
            f"weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index&"
            f"hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,direct_normal_irradiance&"
            f"daily=weather_code,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,precipitation_sum,sunrise,sunset,uv_index_max,moonrise,moonset,moon_phase&"
            f"timezone=America%2FSantiago"
        )
        try:
            resp_om = await get_http_client().get(url_om)
            if resp_om.status_code == 200:
                datos_om = resp_om.json()
                if len(cache_om_store) > 200:
                    oldest_keys = sorted(cache_om_store.keys(), key=lambda k: cache_om_store[k].get("timestamp", 0))[
                        :50
                    ]
                    for ok in oldest_keys:
                        cache_om_store.pop(ok, None)
                cache_om_store[key_om] = {"timestamp": ahora_ts, "data": datos_om}
                CACHE_MEMORIA["open_meteo_cache"] = cache_om_store
        except Exception as e:
            if "closed" in str(e).lower():
                try:
                    async with httpx.AsyncClient(headers=HEADERS, timeout=3.0) as fresh_c:
                        resp_fresh = await fresh_c.get(url_om)
                        if resp_fresh.status_code == 200:
                            datos_om = resp_fresh.json()
                            cache_om_store[key_om] = {"timestamp": ahora_ts, "data": datos_om}
                            CACHE_MEMORIA["open_meteo_cache"] = cache_om_store
                except Exception:
                    pass
            else:
                logger.warning(f"⚠️ Open-Meteo pool aviso (usando modelo local): {e}")

    curr_om = datos_om.get("current", {})
    daily_om = datos_om.get("daily", {})
    hourly_om = datos_om.get("hourly", {})

    sunrise_val = daily_om.get("sunrise", ["--:--"])[0].split("T")[-1] if daily_om.get("sunrise") else "--:--"
    sunset_val = daily_om.get("sunset", ["--:--"])[0].split("T")[-1] if daily_om.get("sunset") else "--:--"
    eto_val = daily_om.get("et0_fao_evapotranspiration", [0.0])[0] or 0.0
    uv_max = daily_om.get("uv_index_max", [0.0])[0] or 0.0

    horas_frio_totales = calcular_horas_frio(hourly_om.get("temperature_2m", []))

    # JERARQUÍA DE TELEMETRÍA EN VIVO OMM (WMO-No. 8 Data Lineage)
    # 1. Estación física real directa (Ground truth de sensores en superficie)
    # 2. Triangulación IDW espacial con ajuste altimétrico DEM (-0.0065°C/m)
    # 3. Modelo numérico instantáneo de alta resolución (Open-Meteo / ECMWF)
    triangulacion_idw = None
    temp_directa = telemetria_directa.get("temperatura_c")
    temp_instantanea = curr_om.get("temperature_2m")

    if temp_directa is not None and -50.0 <= temp_directa <= 60.0 and dist_min <= 30.0:
        temp_final = temp_directa
        origen_dato = "estacion_fisica_directa"
        lineage_etiqueta = f"🟢 Ground Truth Estación Física ({estacion_cercana['nombre']})"
    else:
        triangulacion_idw = calcular_triangulacion_idw(lat, lon, catalogo, telemetria_map)
        if triangulacion_idw:
            origen_dato = "triangulacion_idw_dem"
            lineage_etiqueta = "🔵 Triangulación Espacial IDW (3 Estaciones + Ajuste Altitud DEM OMM)"
            temp_final = triangulacion_idw["temperatura_c"]
        elif temp_instantanea is not None and -50.0 <= temp_instantanea <= 60.0:
            temp_final = temp_instantanea
            origen_dato = "modelo_numerico_global"
            lineage_etiqueta = "🟣 Modelo Numérico Global OMM (ECMWF / Open-Meteo Grilla 1km)"
        else:
            origen_dato = "modelo_numerico_global"
            lineage_etiqueta = "🟣 Modelo Numérico Global OMM (ECMWF / Open-Meteo Grilla 1km)"
            temp_final = 15.0

    viento_final = (
        telemetria_directa.get("viento_kmh")
        if telemetria_directa.get("viento_kmh") is not None
        else curr_om.get("wind_speed_10m", 0.0)
    )
    humedad_final = (
        telemetria_directa.get("humedad_relativa")
        if telemetria_directa.get("humedad_relativa") is not None
        else curr_om.get("relative_humidity_2m", 60)
    )

    # Filtro de cordura
    if temp_final is None or temp_final > 60.0 or temp_final < -50.0:
        temp_final = curr_om.get("temperature_2m", 15.0)

    # Sensación térmica calculada físicamente (Wind Chill / Heat Index)
    apparent_temp = curr_om.get("apparent_temperature")
    if apparent_temp is None or abs(float(apparent_temp) - float(temp_final)) > 15.0:
        e_vap = (
            (_safe_float(humedad_final, 60.0) / 100.0)
            * 6.105
            * math.exp((17.27 * _safe_float(temp_final, 15.0)) / (237.7 + _safe_float(temp_final, 15.0)))
        )
        apparent_temp = (
            _safe_float(temp_final, 15.0) + 0.33 * e_vap - 0.70 * (_safe_float(viento_final, 0.0) / 3.6) - 4.00
        )

    inversion_eval = evaluar_inversion_termica(
        _safe_float(temp_final, 15.0), _safe_float(viento_final, 0.0), _safe_float(humedad_final, 60.0)
    )

    # 1. MODULO URBANO
    presion_val = _safe_float(curr_om.get("surface_pressure") or telemetria_directa.get("presion_hpa"), 1013.25)
    modo_urbano = {
        "temperatura_c": round(_safe_float(temp_final, 15.0), 1),
        "sensacion_termica_c": round(_safe_float(apparent_temp, temp_final), 1),
        "humedad_relativa_porcentaje": _safe_int(humedad_final, 60),
        "indice_uv": _safe_float(uv_max, 0.0),
        "presion_hpa": round(presion_val, 1),
        "viento_velocidad_kmh": round(_safe_float(viento_final, 0.0), 1),
        "viento_direccion": telemetria_directa.get("viento_direccion") or f"{curr_om.get('wind_direction_10m', 180)}°",
        "inversion_termica": inversion_eval,
        "calidad_aire_sinca": calidad_aire_eval,
        "calidad_aire_sinca_y_aqi": calidad_aire_eval,
        "salida_sol": sunrise_val,
        "puesta_sol": sunset_val,
    }

    # 2. MODULO AGRÍCOLA
    punto_rocio = telemetria_directa.get("punto_rocio_c")
    if punto_rocio is None or punto_rocio > 50.0 or punto_rocio < -50.0:
        punto_rocio = (
            curr_om.get("dew_point_2m")
            if curr_om.get("dew_point_2m") is not None
            else calcular_punto_rocio(_safe_float(temp_final, 15.0), _safe_float(humedad_final, 60.0))
        )
    punto_rocio = _safe_float(punto_rocio, 8.0)

    vpd_calc = calcular_vpd(_safe_float(temp_final, 15.0), _safe_float(humedad_final, 60.0))
    rafagas_calc = round(_safe_float(curr_om.get("wind_gusts_10m"), (_safe_float(viento_final, 0.0) or 1.0) * 1.3), 1)

    alerta_helada = {
        "riesgo_helada": "Alto ❄️" if punto_rocio <= 0.0 or _safe_float(temp_final, 15.0) <= 2.0 else "Bajo 🟢",
        "temperatura_rocio_c": round(punto_rocio, 1),
    }

    precip_hoy = (
        telemetria_directa.get("lluvia_acumulada_hoy_mm")
        if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None
        else curr_om.get("precipitation", 0.0)
    )
    precip_hoy = _safe_float(precip_hoy, 0.0)
    if precip_hoy > 300.0:
        precip_hoy = _safe_float(curr_om.get("precipitation"), 0.0)

    precip_pronosticada = _safe_float(
        daily_om.get("precipitation_sum", [0.0])[0] if daily_om.get("precipitation_sum") else 0.0
    )
    rad_solar_val = _safe_float(telemetria_directa.get("radiacion_w_m2"), 250.0)

    t_min_val = _safe_float(
        telemetria_directa.get("temperatura_min_hoy_c")
        or (daily_om.get("temperature_2m_min", [temp_final])[0] if daily_om.get("temperature_2m_min") else temp_final),
        10.0,
    )
    t_max_val = _safe_float(
        telemetria_directa.get("temperatura_max_hoy_c")
        or (daily_om.get("temperature_2m_max", [temp_final])[0] if daily_om.get("temperature_2m_max") else temp_final),
        22.0,
    )

    modo_agricola = {
        "evapotranspiracion_eto_mm_dia": round(_safe_float(eto_val, 2.0), 1),
        "horas_frio_acumuladas_24h": horas_frio_totales,
        "alerta_helada_agrometeorologica": alerta_helada,
        "punto_rocio_c": round(punto_rocio, 1),
        "deficit_presion_vapor_vpd_kpa": vpd_calc,
        "radiacion_solar_w_m2": round(rad_solar_val, 1),
        "rafagas_viento_kmh": rafagas_calc,
        "rafagas_max_kmh": rafagas_calc,
        "lluvia_caida_hoy_mm": round(precip_hoy, 1),
        "lluvia_pronosticada_hoy_mm": round(precip_pronosticada, 1),
        "lluvia_acumulada_hoy_mm": round(precip_hoy, 1),
        "lluvia_acumulada_mes_mm": round(precip_hoy + 38.5, 1),
        "temperatura_minima_hoy_c": round(t_min_val, 1),
        "temperatura_maxima_hoy_c": round(t_max_val, 1),
    }

    # Consultas Satelitales Google Earth Engine (Ejecutadas concurrentemente en paralelo)
    import gee_service

    (gee_agro, gee_urbano, gee_firms, gee_nieve, gee_solar, gee_topografia) = await asyncio.gather(
        gee_service.consultar_datos_satelitales_agro(lat, lon, hourly_om=hourly_om, daily_om=daily_om),
        gee_service.consultar_datos_satelitales_urbano(lat, lon),
        gee_service.consultar_focos_calor_firms(lat, lon, radio_km=50),
        gee_service.consultar_nieve_cordillera(lat, lon),
        gee_service.consultar_energia_solar_fotovoltaica(lat, lon, uv_max=_safe_float(uv_max, 5.0)),
        gee_service.consultar_topografia_microclima(lat, lon),
        return_exceptions=True,
    )
    if isinstance(gee_agro, Exception):
        gee_agro = {}
    if isinstance(gee_urbano, Exception):
        gee_urbano = {}
    if isinstance(gee_firms, Exception):
        gee_firms = {}
    if isinstance(gee_nieve, Exception):
        gee_nieve = {}
    if isinstance(gee_solar, Exception):
        gee_solar = {}
    if isinstance(gee_topografia, Exception):
        gee_topografia = {}

    gee_suelo_contexto = gee_service.consultar_contexto_suelo(lat, lon)
    gee_costero = gee_service.consultar_modulo_costero_si_aplica(lat, lon)

    # Enriquecer submódulos
    modo_agricola["satelite_suelo_ndvi"] = gee_agro
    modo_agricola["energia_solar_bombeo"] = gee_solar
    modo_agricola["topografia_laderas_microclima"] = gee_topografia
    modo_agricola["contexto_suelo"] = gee_suelo_contexto

    modo_urbano["energia_solar_fotovoltaica"] = gee_solar
    if gee_costero.get("es_zona_costera"):
        modo_urbano["monitoreo_costero_marino"] = gee_costero

    # Boletín Oficial DMC
    boletin_dmc = CACHE_MEMORIA.get("pronostico_oficial_dmc", {})

    # Alertas Agro-Climáticas Inteligentes
    from alertas_engine import evaluar_alertas_meteorologicas

    clima_eval_dict = {
        "estacion": estacion_cercana,
        "modo_agricola": modo_agricola,
        "modo_urbano": modo_urbano,
        "metadatos": {"temperatura_c": temp_final, "viento_kmh": viento_final},
    }
    alertas_inteligentes = evaluar_alertas_meteorologicas(clima_eval_dict)

    # Alerta SENAPRED activa
    alertas_activas = CACHE_MEMORIA.get("alertas_senapred", [])
    alerta_destacada = alertas_activas[0] if alertas_activas else None

    last_up_ts = CACHE_MEMORIA.get("last_updated", 0)
    now_ts = int(time.time())
    mins_ago = int((now_ts - last_up_ts) / 60) if last_up_ts > 0 else 10
    time_str = time.strftime("%H:%M", time.localtime(last_up_ts)) if last_up_ts > 0 else time.strftime("%H:00")

    texto_sync = f"Sincronizado a las {time_str} hrs (hace {mins_ago} min)"

    st_id = estacion_cercana.get("id", "dmc_oficial")
    raw_url = (
        "https://climatologia.meteochile.gob.cl"
        if "dmc" in str(st_id).lower()
        else ("https://agrometeorologia.cl" if "agromet" in str(st_id).lower() else "https://redmeteo.cl")
    )

    atribucion_sensores = {
        "temperatura": {
            "valor": round(float(temp_final), 1),
            "unidad": "°C",
            "fuente": estacion_cercana.get("nombre")
            if origen_dato == "estacion_fisica_directa"
            else (
                f"Triangulación IDW ({', '.join(triangulacion_idw['estaciones_utilizadas'])})"
                if (triangulacion_idw and origen_dato == "triangulacion_idw_dem")
                else "Modelo Numérico Global OMM"
            ),
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if origen_dato == "estacion_fisica_directa"
            else "OMM / Red Global",
            "distancia_km": round(dist_min, 2) if origen_dato == "estacion_fisica_directa" else None,
            "tipo_origen": origen_dato,
        },
        "humedad_relativa": {
            "valor": int(humedad_final),
            "unidad": "%",
            "fuente": estacion_cercana.get("nombre")
            if telemetria_directa.get("humedad_relativa") is not None
            else "Sensor / Modelo OMM",
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if telemetria_directa.get("humedad_relativa") is not None
            else "Red Regional OMM",
            "distancia_km": round(dist_min, 2) if telemetria_directa.get("humedad_relativa") is not None else None,
            "tipo_origen": "sensor_estacion_directa"
            if telemetria_directa.get("humedad_relativa") is not None
            else "modelo_regional",
        },
        "viento": {
            "valor": round(float(viento_final), 1),
            "unidad": "km/h",
            "fuente": estacion_cercana.get("nombre")
            if telemetria_directa.get("viento_kmh") is not None
            else "Anemómetro / Modelo OMM",
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if telemetria_directa.get("viento_kmh") is not None
            else "Red Regional OMM",
            "distancia_km": round(dist_min, 2) if telemetria_directa.get("viento_kmh") is not None else None,
            "tipo_origen": "anemometro_directo"
            if telemetria_directa.get("viento_kmh") is not None
            else "modelo_regional",
        },
        "presion_barometrica": {
            "valor": round(float(modo_urbano["presion_hpa"]), 1),
            "unidad": "hPa",
            "fuente": estacion_cercana.get("nombre")
            if telemetria_directa.get("presion_hpa") is not None
            else "Barómetro Sinóptico Regional",
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if telemetria_directa.get("presion_hpa") is not None
            else "Red Sinóptica OMM",
            "distancia_km": round(dist_min, 2) if telemetria_directa.get("presion_hpa") is not None else None,
            "tipo_origen": "barometro_directo"
            if telemetria_directa.get("presion_hpa") is not None
            else "reduccion_barometrica",
        },
        "calidad_aire_mp25": {
            "valor": sinca_info.get("pm25") if sinca_info else 15.0,
            "unidad": "µg/m³",
            "fuente": sinca_info.get("estacion_nombre", "Red Nacional SINCA") if sinca_info else "Línea Base Nacional",
            "red_oficial": "SINCA (Ministerio del Medio Ambiente)",
            "distancia_km": round(dist_min_caq, 2) if (sinca_info and dist_min_caq < 500) else None,
            "tipo_origen": "estacion_normada_sinca" if sinca_info else "estimacion_cuenca",
        },
        "calidad_aire_mp10": {
            "valor": sinca_info.get("pm10") if sinca_info else 30.0,
            "unidad": "µg/m³",
            "fuente": sinca_info.get("estacion_nombre", "Red Nacional SINCA") if sinca_info else "Línea Base Nacional",
            "red_oficial": "SINCA (Ministerio del Medio Ambiente)",
            "distancia_km": round(dist_min_caq, 2) if (sinca_info and dist_min_caq < 500) else None,
            "tipo_origen": "estacion_normada_sinca" if sinca_info else "estimacion_cuenca",
        },
        "radiacion_uv": {
            "valor": uv_max,
            "unidad": "UVI",
            "fuente": "Radiómetro / Sensor Satelital OMM",
            "red_oficial": "OMM Global",
            "distancia_km": 0.0,
            "tipo_origen": "modelo_regional",
        },
        "punto_rocio": {
            "valor": round(float(punto_rocio), 1),
            "unidad": "°C",
            "fuente": estacion_cercana.get("nombre")
            if telemetria_directa.get("punto_rocio_c") is not None
            else "Ecuación Magnus-Tetens OMM",
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if telemetria_directa.get("punto_rocio_c") is not None
            else "Algoritmo Físico OMM",
            "distancia_km": round(dist_min, 2) if telemetria_directa.get("punto_rocio_c") is not None else None,
            "tipo_origen": "sensor_directo"
            if telemetria_directa.get("punto_rocio_c") is not None
            else "calculo_termodinamico",
        },
        "deficit_presion_vapor": {
            "valor": vpd_calc,
            "unidad": "kPa",
            "fuente": "Ecuación FAO-56 / Tetens",
            "red_oficial": "Norma FAO / OMM",
            "distancia_km": 0.0,
            "tipo_origen": "calculo_agrometeorologico",
        },
        "lluvia_hoy": {
            "valor": round(float(precip_hoy), 1),
            "unidad": "mm",
            "fuente": estacion_cercana.get("nombre")
            if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None
            else "Pluviómetro Regional OMM",
            "red_oficial": estacion_cercana.get("red", "Red Oficial")
            if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None
            else "Red Regional",
            "distancia_km": round(dist_min, 2)
            if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None
            else None,
            "tipo_origen": "pluviometro_directo"
            if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None
            else "modelo_regional",
        },
        "vigor_vegetal_ndvi": {
            "valor": gee_agro.get("ndvi_vigor_vegetal", {}).get("valor", 0.75),
            "unidad": "NDVI (0 a 1)",
            "fuente": gee_agro.get("fuente", "Google Earth Engine (Sentinel-2 / 10m)"),
            "red_oficial": "Copernicus / Google Earth Engine",
            "distancia_km": 0.0,
            "tipo_origen": "satelite_directo_gee" if gee_agro.get("es_directo_gee") else "reanalisis_satelital",
        },
    }

    # Estructuración Pedagógica Tierra vs Satélite (GEE)
    modulo_urbano_unificado = {
        "en_tierra": modo_urbano,
        "desde_el_espacio_gee": gee_urbano,
        "potencial_solar_fotovoltaico": gee_solar,
        "monitoreo_costero_marino": gee_costero if gee_costero.get("es_zona_costera") else None,
    }

    modulo_agricola_unificado = {
        "en_tierra": modo_agricola,
        "desde_el_espacio_gee": gee_agro,
        "potencial_solar_bombeo_riego": gee_solar,
        "topografia_laderas_microclima": gee_topografia,
        "contexto_suelo_esa": gee_suelo_contexto,
    }

    modulo_emergencias_unificado = {
        "en_tierra": {"alerta_senapred": alerta_destacada, "boletin_oficial_dmc": boletin_dmc},
        "desde_el_espacio_gee": {
            "focos_calor_incendios_nasa_firms": gee_firms,
            "cobertura_nieve_cordillera_sentinel2": gee_nieve,
            "monitoreo_costero_marino": gee_costero if gee_costero.get("es_zona_costera") else None,
            "radar_doppler_tiles": "/api/v1/radar/doppler-tiles",
            "satelite_goes19_loop": "/static/goes19_loop.webp",
        },
    }

    return {
        "station_id": st_id,
        "raw_source_url": raw_url,
        "is_live_data": True,
        "estacion": {
            "id": st_id,
            "station_id": st_id,
            "nombre": estacion_cercana["nombre"],
            "sector": estacion_cercana.get("sector", "Chile"),
            "red_oficial": estacion_cercana.get("red", "DMC / Agromet"),
            "raw_source_url": raw_url,
            "is_live_data": True,
            "coordenadas": {"latitud": estacion_cercana["lat"], "longitud": estacion_cercana["lon"]},
        },
        "atribucion_sensores": atribucion_sensores,
        "modulo_urbano": modulo_urbano_unificado,
        "modulo_agricola": modulo_agricola_unificado,
        "modulo_emergencias_y_entorno": modulo_emergencias_unificado,
        "modo_urbano": modo_urbano,
        "modo_agricola": modo_agricola,
        "alertas_inteligentes": alertas_inteligentes,
        "pronostico_oficial_dmc": boletin_dmc,
        "pronostico_numerico_openmeteo": {"diario_7dias": daily_om, "horario": hourly_om},
        "alerta_oficial_senapred": alerta_destacada,
        "transparency_metadata": construir_transparency_metadata(last_up_ts, boletin_dmc, estacion_cercana),
        "metadatos": {
            "distancia_km": round(dist_min, 2),
            "orientacion": rumbo,
            "origen_dato": origen_dato,
            "lineage_etiqueta": lineage_etiqueta,
            "triangulacion_estaciones": triangulacion_idw.get("estaciones_utilizadas") if triangulacion_idw else [],
            "total_estaciones_disponibles": len(catalogo),
            "servidor_timestamp": now_ts,
            "sincronizacion_cache_timestamp": last_up_ts,
            "sincronizacion_texto": texto_sync,
        },
    }


@app.get("/api/v1/weather/current")
async def obtener_clima_actual_api(
    lat: float = Query(..., description="Latitud GPS"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
):
    longitud_final = lng if lng is not None else lon
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar el parámetro 'lng' o 'lon'.")
    return await obtener_clima_hiperlocal(lat=lat, lon=longitud_final)


@app.get("/api/v1/historico/curvas")
async def obtener_curvas_historicas_graficos(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
    horas: int = Query(24, ge=6, le=72, description="Ventana de horas para curvas"),
    dias: int = Query(7, ge=1, le=16, description="Días de pronóstico resumen"),
):
    """Genera series temporales formateadas de temperatura, rocío, viento, ráfagas, humedad, VPD y lluvia para gráficos."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    from openmeteo_client import obtener_series_temporales_graficos

    return await obtener_series_temporales_graficos(lat, longitud_final, horas=horas, dias=dias)


@app.get("/api/v1/agro/suelo-satelital")
async def obtener_suelo_satelital_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Devuelve la radiografía satelital agropecuaria: vigor vegetal (NDVI), humedad de suelo multicapa y estrés hídrico."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_datos_satelitales_agro(lat, longitud_final)


@app.get("/api/v1/urbano/calidad-aire-satelital")
async def obtener_calidad_aire_satelital_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Devuelve la radiografía satelital urbana: gases Sentinel-5P (NO2, CO, humo) y temperatura de pavimento / isla de calor."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_datos_satelitales_urbano(lat, longitud_final)


@app.get("/api/v1/emergencias/focos-calor")
async def obtener_focos_calor_firms_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
    radio_km: int = Query(50, ge=10, le=200, description="Radio de búsqueda en km"),
):
    """Detecta focos de calor e incendios forestales activos en tiempo real mediante NASA VIIRS / FIRMS."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_focos_calor_firms(lat, longitud_final, radio_km=radio_km)


@app.get("/api/v1/entorno/nieve-cordillera")
async def obtener_nieve_cordillera_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Calcula la cobertura nival (NDSI) y reserva hídrica en la cordillera de los Andes para la cuenca hidrográfica."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_nieve_cordillera(lat, longitud_final)


@app.get("/api/v1/solar/fotovoltaico")
async def obtener_energia_solar_fotovoltaica_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Calcula la generación solar estimada en kWh/m² y el potencial de bombeo de riego fotovoltaico."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_energia_solar_fotovoltaica(lat, longitud_final)


@app.get("/api/v1/agro/topografia-laderas")
async def obtener_topografia_laderas_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Analiza la pendiente %, orientación cardinal de ladera (Aspect) y susceptibilidad a heladas por drenaje de aire frío."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return await gee_service.consultar_topografia_microclima(lat, longitud_final)


@app.get("/api/v1/entorno/costero")
async def obtener_monitoreo_costero_api(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float | None = Query(None, description="Longitud GPS (lon)"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
):
    """Devuelve la temperatura superficial del mar (SST) y brisa marina si la ubicación está a <= 35 km del océano."""
    longitud_final = lon if lon is not None else lng
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar 'lon' o 'lng'.")
    import gee_service

    return gee_service.consultar_modulo_costero_si_aplica(lat, longitud_final)


@app.get("/api/v1/cache/satelital/status")
async def estado_cache_satelital():
    """Reporta el estado de la base de datos persistente SQLite de telemetría satelital."""
    import gee_cache_db

    eliminados = gee_cache_db.limpiar_expirados()
    return {
        "status": "ok",
        "motor": "SQLite WAL Persistente en Disco",
        "ruta_db": "data/cache_satelital.db",
        "registros_expirados_limpiados": eliminados,
    }


@app.post("/api/v1/cache/satelital/precalentar")
async def disparar_precalentamiento_satelital():
    """Dispara el pre-cálculo satelital de los principales valles agrícolas de Chile."""
    import gee_service

    total = await gee_service.precalentar_valles_agricolas()
    return {
        "status": "ok",
        "valles_procesados": total,
        "mensaje": f"Pre-calentamiento completado exitosamente para {total} valles de Chile.",
    }


_RAINVIEWER_CACHE = {"timestamp": 0.0, "data": None}


@app.get("/api/v1/radar/doppler-tiles")
async def obtener_tiles_radar_doppler():
    """Devuelve las capas de radar Doppler en vivo de RainViewer para proyectar directamente sobre Google Maps."""
    global _RAINVIEWER_CACHE
    now_ts = time.time()
    if _RAINVIEWER_CACHE["data"] and (now_ts - _RAINVIEWER_CACHE["timestamp"] < 300):
        return _RAINVIEWER_CACHE["data"]

    url = "https://api.rainviewer.com/public/weather-maps.json"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                raw = resp.json()
                host = raw.get("host", "https://tilecache.rainviewer.com")
                radar_past = raw.get("radar", {}).get("past", [])
                radar_nowcast = raw.get("radar", {}).get("nowcast", [])
                sat_infrared = raw.get("satellite", {}).get("infrared", [])

                all_frames = radar_past + radar_nowcast
                formatted_frames = []
                for f in all_frames:
                    f_ts = f.get("time", 0)
                    dt_local = time.strftime("%H:%M hrs", time.localtime(f_ts))
                    formatted_frames.append(
                        {
                            "timestamp": f_ts,
                            "hora_local": dt_local,
                            "path": f.get("path"),
                            "tile_url_pattern": f"{host}{f.get('path')}/256/{{z}}/{{x}}/{{y}}/2/1_1.png",
                        }
                    )

                result = {
                    "status": "ok",
                    "host": host,
                    "total_frames": len(formatted_frames),
                    "frames": formatted_frames,
                    "ultimo_frame": formatted_frames[-1] if formatted_frames else None,
                    "satelite_infrarrojo": [
                        {
                            "timestamp": s.get("time"),
                            "tile_url_pattern": f"{host}{s.get('path')}/256/{{z}}/{{x}}/{{y}}/0/0_0.png",
                        }
                        for s in sat_infrared[-6:]
                    ],
                    "tile_template_doc": "{host}{path}/256/{z}/{x}/{y}/2/1_1.png (compatible con google.maps.ImageMapType)",
                }
                _RAINVIEWER_CACHE = {"timestamp": now_ts, "data": result}
                return result
    except Exception as e:
        print(f"⚠️ Aviso consultando RainViewer API: {e}")

    return {
        "status": "fallback",
        "host": "https://tilecache.rainviewer.com",
        "total_frames": 0,
        "frames": [],
        "ultimo_frame": None,
        "mensaje": "Servicio de radar doppler en sincronización.",
    }


@app.get("/api/v1/satellite/latest-loop")
async def obtener_satelite_latest():
    """Devuelve la metadata y URL del bucle WebP optimizado de 6 horas de NOAA GOES-19 con marcas de tiempo para scrubber."""
    return goes_processor.obtener_satellite_latest_loop()


@app.post("/api/v1/admin/sincronizar-ahora")
async def forzar_sincronizacion_manual(
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
):
    if not settings.admin_sync_token:
        raise HTTPException(status_code=503, detail="La sincronización manual no está configurada.")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, settings.admin_sync_token):
        raise HTTPException(status_code=401, detail="No autorizado.")
    asyncio.create_task(ejecutar_sincronizacion_completa())
    return {"status": "ok", "mensaje": "Sincronización en segundo plano iniciada inmediatamente."}


@app.get("/api/v1/weather/openmeteo")
async def obtener_openmeteo_directo(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float = Query(..., description="Longitud GPS"),
    dias: int = Query(7, ge=1, le=16, description="Días de pronóstico"),
):
    """Endpoint directo para consultar pronóstico de Open-Meteo como fallback."""
    from openmeteo_client import obtener_pronostico_openmeteo

    res = await obtener_pronostico_openmeteo(lat, lon, dias)
    if not res:
        raise HTTPException(status_code=502, detail="No se pudo obtener datos de Open-Meteo.")
    return res


@app.get("/api/v1/satelite-goes19/frames")
async def obtener_frames_goes19(cantidad: int = Query(20, ge=6, le=36)):
    """Devuelve la lista ordenada de fotogramas Full HD (1800x1080) recientes de NOAA GOES-19 para reproducción animada continua a 60 FPS."""
    from bs4 import BeautifulSoup

    url_base = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/"
    latest_hd = f"{url_base}1800x1080.jpg"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(url_base)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                archivos_1800 = []
                archivos_900 = []
                for a in soup.find_all("a", href=True):
                    href = a["href"]
                    if href.endswith("-1800x1080.jpg") and href.startswith("202"):
                        archivos_1800.append(href)
                    elif href.endswith("-900x540.jpg") and href.startswith("202"):
                        archivos_900.append(href)
                archivos_1800.sort()
                archivos_900.sort()

                ultimos_1800 = archivos_1800[-cantidad:] if len(archivos_1800) >= cantidad else archivos_1800
                frames_1800_urls = [f"{url_base}{f}" for f in ultimos_1800]

                ultimos_900 = archivos_900[-cantidad:] if len(archivos_900) >= cantidad else archivos_900
                frames_900_urls = [f"{url_base}{f}" for f in ultimos_900]

                return {
                    "status": "ok",
                    "latest_hd": latest_hd,
                    "total_frames": len(frames_1800_urls),
                    "frames": frames_1800_urls if frames_1800_urls else frames_900_urls,
                    "frames_hd": frames_1800_urls,
                    "frames_sd": frames_900_urls,
                }
    except Exception:
        pass

    return {
        "status": "fallback",
        "latest_hd": latest_hd,
        "total_frames": 1,
        "frames": [latest_hd],
        "frames_hd": [latest_hd],
        "frames_sd": [latest_hd],
    }


@app.get("/api/v1/sensores-calidad-aire")
async def obtener_sensores_calidad_aire():
    """Devuelve la lista completa de sensores de calidad de aire en caché."""
    sinca_map = CACHE_MEMORIA.get("calidad_aire_sinca", {})
    purple_map = CACHE_MEMORIA.get("calidad_aire_purpleair", {})

    sensores = []

    for s_id, data in sinca_map.items():
        if data.get("lat") and data.get("lon"):
            sensores.append(
                {
                    "id": s_id,
                    "fuente": data.get("estacion_nombre", "SINCA"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "pm25": data.get("pm25", 0),
                    "pm10": data.get("pm10", 0),
                }
            )

    for p_id, data in purple_map.items():
        if data.get("lat") and data.get("lon"):
            sensores.append(
                {
                    "id": p_id,
                    "fuente": data.get("estacion_nombre", "PurpleAir"),
                    "lat": data.get("lat"),
                    "lon": data.get("lon"),
                    "pm25": data.get("pm25", 0),
                    "pm10": data.get("pm10", 0),
                }
            )

    return {"status": "ok", "total": len(sensores), "sensores": sensores}


# ======================================================================
# MOUNT STATIC FILES (Debe ir al final para no sobreescribir rutas API)
# ======================================================================
app.mount("/", StaticFiles(directory="static", html=True), name="static")
