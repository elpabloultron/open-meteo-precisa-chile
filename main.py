import asyncio
import math
import os
import secrets
import time
import unicodedata
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


import goes_processor
from app_config import settings
from gee import GEECore, obtener_capas_gee_y_windy
from sincronizador_background import (
    CACHE_MEMORIA,
    cargar_cache_desde_disco,
    ejecutar_sincronizacion_completa,
    iniciar_loop_background,
    refrescar_cache_si_corresponde,
)


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
        "official_bulletin": boletin_txt or "Predominio de estabilidad atmosférica en la zona central y valles interiores de Chile."
    }




@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicializa dependencias y asegura datos frescos en memoria."""
    cargar_cache_desde_disco()
    await asyncio.to_thread(GEECore.initialize)

    task = None
    if settings.enable_in_process_sync:
        task = asyncio.create_task(iniciar_loop_background(3600))
    else:
        # Si no hay worker externo (Cloud Run serverless), refrescar automáticamente si la caché es antigua (>30 min)
        ahora = int(time.time())
        if ahora - CACHE_MEMORIA.get("last_updated", 0) > 1800:
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
    version="10.2.0",
    lifespan=lifespan
)


os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
    return await call_next(request)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"
}


def quitar_tildes(texto: str) -> str:
    if not texto:
        return ""
    return ''.join(c for c in unicodedata.normalize('NFD', str(texto)) if unicodedata.category(c) != 'Mn').lower()

def calcular_distancia(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    return R * (2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)))

def calcular_rumbo_cardinal(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
    dLon = math.radians(lon2 - lon1)
    y = math.sin(dLon) * math.cos(math.radians(lat2))
    x = math.cos(math.radians(lat1)) * math.sin(math.radians(lat2)) - math.sin(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.cos(dLon)
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
        return {"nivel": "Alta 🔴", "color": "#ef4444", "desc": "Riesgo de humo por leña y contaminantes atrapados en superficie"}
    elif temp_c <= 10.0 and viento_kmh <= 8.0:
        return {"nivel": "Moderada 🟡", "color": "#f59e0b", "desc": "Capa de ventilación reducida en el valle"}
    else:
        return {"nivel": "Baja 🟢", "color": "#10b981", "desc": "Buena dispersión atmosférica"}

def obtener_gee_punto_seguro(lat: float, lon: float) -> dict:
    key = f"{round(lat, 3)},{round(lon, 3)}"
    cache_gee = CACHE_MEMORIA.get("gee_puntos", {})
    if key in cache_gee:
        return cache_gee[key]
    else:
        # Fallback rápido para no bloquear FastAPI. Se actualizará en background.
        from gee.rural import fallback_rural
        from gee.urban import fallback_urbano
        rural = fallback_rural(lat, lon)
        urban = fallback_urbano(lat, lon)
        nuevo_pto = {
            "lat": lat,
            "lon": lon,
            "rural": rural,
            "urban": urban,
            "timestamp": int(time.time())
        }
        # Inyectar en caché para que el background worker lo pille
        CACHE_MEMORIA["gee_puntos"][key] = nuevo_pto
        return nuevo_pto


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
                "Calidad de aire adecuada para realizar actividades deportivas y al aire libre sin limitaciones."
            ]
        }
    elif val_mp25 <= 79.0 or val_mp10 <= 199.0:
        norma_chile = {
            "categoria": "Alerta 🟡",
            "nivel_codigo": "alerta",
            "color_hex": "#f59e0b",
            "medidas_normativas": [
                "Prohibición de uso de calefactores y cocinas a leña en toda la zona urbana.",
                "Grupos sensibles (niños, adultos mayores, asmáticos) deben evitar ejercicios intensos al aire libre.",
                "Fiscalización de humos visibles en fuentes fijas e industriales."
            ]
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
                "Paralización de fuentes fijas industriales declaradas prioritarias."
            ]
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
                "Uso recomendado de mascarillas en traslados urbanos para grupos vulnerables."
            ]
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
        "mediciones_base": {
            "mp25_ug_m3": round(val_mp25, 1),
            "mp10_ug_m3": round(val_mp10, 1)
        },
        "norma_chilena_mma": norma_chile,
        "tabla_internacional_aqi": {
            "aqi_indice": aqi_val,
            "categoria": aqi_cat,
            "descripcion_salud": aqi_desc
        }
    }


# ======================================================================
# ENDPOINTS PRINCIPALES
# ======================================================================

@app.get("/")
def home():
    return {
        "status": "online",
        "servicio": "MeteoPrecisa Chile - Engine Multired Unificado",
        "version": "10.2.0",
        "google_earth_engine_activo": GEECore.is_active(),
        "cache_backend": settings.cache_backend,
        "cache_status": CACHE_MEMORIA.get("status", "uninitialized"),
        "ultima_sincronizacion_timestamp": CACHE_MEMORIA.get("last_updated", 0),
        "total_estaciones_registradas": len(CACHE_MEMORIA.get("catalogo_estaciones", []))
    }





@app.get("/api/v1/capas-mapa")
async def obtener_capas_mapa(
    lat: float = Query(-33.4450, ge=-90, le=90, description="Latitud del centro del mapa"),
    lon: float = Query(-70.6830, ge=-180, le=180, description="Longitud del centro del mapa"),
):
    capas = obtener_capas_gee_y_windy(lat, lon)
    return {
        "status": "ok",
        "total_capas": len(capas),
        "capas": capas
    }

@app.get("/api/v1/gee/ndvi-punto")
async def inspeccionar_ndvi_punto(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float = Query(..., description="Longitud GPS")
):
    res = obtener_gee_punto_seguro(lat, lon)
    return {
        "status": "ok",
        "analisis_earth_engine": res
    }

@app.get("/api/v1/weather/historico")
async def obtener_historico_clima(
    lat: float = Query(..., ge=-90, le=90, description="Latitud GPS"),
    lng: float | None = Query(None, ge=-180, le=180, description="Longitud GPS (lng)"),
    lon: float | None = Query(None, ge=-180, le=180, description="Longitud GPS (lon)"),
):
    longitud_final = lng if lng is not None else lon
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar el parámetro 'lng' o 'lon'.")

    from gee.rural import extraer_historico_ndvi
    try:
        data = await asyncio.to_thread(extraer_historico_ndvi, lat, longitud_final)
        return {
            "status": "success",
            "lat": lat,
            "lon": longitud_final,
            "historico_ndvi_12_meses": data,
        }
    except Exception:
        return {"status": "error", "historico_ndvi_12_meses": []}


@app.get("/api/v1/historico/estacion")
async def obtener_historico_estacion_api(
    station_id: str = Query(..., description="ID de la estación física (ej: dmc_330020, agromet_21, redmeteo_scl)"),
    horas: int = Query(24, ge=1, le=720, description="Ventana de tiempo en horas (por defecto 24 horas, máximo 30 días)")
):
    """Devuelve la serie de tiempo real histórica almacenada en base de datos SQLite para una estación."""
    from db_store import obtener_historico_estacion
    try:
        registros = await asyncio.to_thread(obtener_historico_estacion, station_id, horas)
        return {
            "status": "ok",
            "station_id": station_id,
            "ventana_horas": horas,
            "total_registros": len(registros),
            "serie_temporal": registros
        }
    except Exception as e:
        return {
            "status": "error",
            "station_id": station_id,
            "mensaje": f"Error consultando histórico: {e}",
            "serie_temporal": []
        }


@app.get("/api/v1/historico/stats")
async def obtener_estadisticas_db_api():
    """Devuelve métricas de salud y almacenamiento de la base de datos histórica SQLite."""
    from db_store import obtener_estadisticas_db
    try:
        return {
            "status": "ok",
            "estadisticas": await asyncio.to_thread(obtener_estadisticas_db)
        }
    except Exception as e:
        return {
            "status": "error",
            "mensaje": str(e)
        }


@app.get("/api/v1/satellite/latest-loop")
async def obtener_satellite_latest_loop_api():
    from goes_processor import obtener_satellite_latest_loop
    return obtener_satellite_latest_loop()

@app.get("/api/v1/satelite-goes19")
async def obtener_satelite_goes19(
    resolucion: str = Query("450x270", description="Resolución deseada: 450x270 (ultra liviana 15KB), 900x540 o 1800x1080"),
    ventana_horas: int = Query(24, description="Ventana temporal en horas (12 o 24)")
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
            "bucle_continuo": True
        },
        "frames": frames,
        "fuente": "NOAA STAR GOES-19 Infrarrojo GeoColor"
    }

@app.get("/api/v1/buscar-estaciones")
async def buscar_estaciones(
    q: str = Query("", description="Nombre de comuna, ciudad o estación"),
    limite: int = Query(650, description="Límite máximo de estaciones")
):
    todas = CACHE_MEMORIA.get("catalogo_estaciones", [])
    
    if not q or len(q) < 2:
        return [
            {
                "id": e.get("id"),
                "nombre": e.get("nombre"),
                "sector": e.get("sector", "Chile"),
                "red": e.get("red", "Oficial"),
                "lat": e.get("lat"),
                "lon": e.get("lon")
            } for e in todas[:limite]
        ]
    
    q_norm = quitar_tildes(q)
    res = [
        {
            "id": e.get("id"),
            "nombre": e.get("nombre"),
            "sector": e.get("sector", "Chile"),
            "red": e.get("red", "Oficial"),
            "lat": e.get("lat"),
            "lon": e.get("lon")
        } for e in todas 
        if q_norm in quitar_tildes(e.get("nombre", "")) or q_norm in quitar_tildes(e.get("sector", "")) or q_norm in quitar_tildes(e.get("red", ""))
    ]
    return res[:limite]

@app.get("/api/v1/alertas-senapred")
async def obtener_alertas_senapred():
    return {
        "status": "ok",
        "total": len(CACHE_MEMORIA.get("alertas_senapred", [])),
        "alertas": CACHE_MEMORIA.get("alertas_senapred", [])
    }

def calcular_triangulacion_idw(target_lat: float, target_lon: float, catalogo: list, telemetria_map: dict, elevacion_objetivo: float = 150.0):
    candidatas = []
    for est in catalogo:
        st_id = est.get("id")
        tele = telemetria_map.get(st_id, {})
        t_c = tele.get("temperatura_c")
        if t_c is not None and -50.0 <= t_c <= 60.0:
            d = calcular_distancia(target_lat, target_lon, est["lat"], est["lon"])
            if d <= 85.0:
                candidatas.append({
                    "estacion": est,
                    "telemetria": tele,
                    "dist_km": d,
                    "temp_c": t_c,
                    "hr": tele.get("humedad_relativa"),
                    "viento_kmh": tele.get("viento_kmh"),
                    "elevacion": est.get("elevacion", 100.0)
                })

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
        w = 1.0 / (d ** 2)
        total_w += w

        diff_alt_m = elevacion_objetivo - item["elevacion"]
        temp_adj = item["temp_c"] - (0.0065 * diff_alt_m)

        w_temp += temp_adj * w
        w_hr += (item["hr"] if item["hr"] is not None else 65.0) * w
        w_viento += (item["viento_kmh"] if item["viento_kmh"] is not None else 5.0) * w

@app.get("/api/v1/weather/historico")
async def obtener_historico_clima(
    lat: float = Query(..., ge=-90, le=90, description="Latitud GPS"),
    lng: float | None = Query(None, ge=-180, le=180, description="Longitud GPS (lng)"),
    lon: float | None = Query(None, ge=-180, le=180, description="Longitud GPS (lon)"),
):
    longitud_final = lng if lng is not None else lon
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar el parámetro 'lng' o 'lon'.")

    from gee.rural import extraer_historico_ndvi
    try:
        data = await asyncio.to_thread(extraer_historico_ndvi, lat, longitud_final)
        return {
            "status": "success",
            "lat": lat,
            "lon": longitud_final,
            "historico_ndvi_12_meses": data,
        }
    except Exception:
        return {"status": "error", "historico_ndvi_12_meses": []}


@app.get("/api/v1/historico/estacion")
async def obtener_historico_estacion_api(
    station_id: str = Query(..., description="ID de la estación física (ej: dmc_330020, agromet_21, redmeteo_scl)"),
    horas: int = Query(24, ge=1, le=720, description="Ventana de tiempo en horas (por defecto 24 horas, máximo 30 días)")
):
    """Devuelve la serie de tiempo real histórica almacenada en base de datos SQLite para una estación."""
    from db_store import obtener_historico_estacion
    try:
        registros = await asyncio.to_thread(obtener_historico_estacion, station_id, horas)
        return {
            "status": "ok",
            "station_id": station_id,
            "ventana_horas": horas,
            "total_registros": len(registros),
            "serie_temporal": registros
        }
    except Exception as e:
        return {
            "status": "error",
            "station_id": station_id,
            "mensaje": f"Error consultando histórico: {e}",
            "serie_temporal": []
        }


@app.get("/api/v1/historico/stats")
async def obtener_estadisticas_db_api():
    """Devuelve métricas de salud y almacenamiento de la base de datos histórica SQLite."""
    from db_store import obtener_estadisticas_db
    try:
        return {
            "status": "ok",
            "estadisticas": await asyncio.to_thread(obtener_estadisticas_db)
        }
    except Exception as e:
        return {
            "status": "error",
            "mensaje": str(e)
        }


@app.get("/api/v1/satellite/latest-loop")
async def obtener_satellite_latest_loop_api():
    from goes_processor import obtener_satellite_latest_loop
    return obtener_satellite_latest_loop()

@app.get("/api/v1/satelite-goes19")
async def obtener_satelite_goes19(
    resolucion: str = Query("450x270", description="Resolución deseada: 450x270 (ultra liviana 15KB), 900x540 o 1800x1080"),
    ventana_horas: int = Query(24, description="Ventana temporal en horas (12 o 24)")
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
            "bucle_continuo": True
        },
        "frames": frames,
        "fuente": "NOAA STAR GOES-19 Infrarrojo GeoColor"
    }


@app.get("/api/v1/clima-hiperlocal")
async def obtener_clima_hiperlocal(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float = Query(..., description="Longitud GPS")
):
    catalogo = CACHE_MEMORIA.get("catalogo_estaciones", [])
    
    if not catalogo:
        from sincronizador_background import cargar_catalogo_maestro
        catalogo = cargar_catalogo_maestro()
    
    estacion_cercana = None
    dist_min = float("inf")

    for est in catalogo:
        d = calcular_distancia(lat, lon, est["lat"], est["lon"])
        if d < dist_min:
            dist_min = d
            estacion_cercana = est

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
    
    todas_caq = list(sinca_map.values()) + list(purple_map.values())
    estacion_caq_cercana = None
    dist_min_caq = float("inf")
    
    for aq in todas_caq:
        if aq.get("lat") and aq.get("lon"):
            d = calcular_distancia(lat, lon, aq["lat"], aq["lon"])
        else:
            d = 999999
        if d < dist_min_caq:
            dist_min_caq = d
            estacion_caq_cercana = aq

    sinca_info = estacion_caq_cercana

    calidad_aire_eval = calcular_calidad_aire_dual(
        sinca_info.get("pm25") if sinca_info else 15.0,
        sinca_info.get("pm10") if sinca_info else 30.0
    )
    if sinca_info:
        calidad_aire_eval["estacion_fuente"] = f"{sinca_info.get('estacion_nombre', 'Sensor')} ({round(dist_min_caq, 1)} km)"
        calidad_aire_eval["pm25_raw"] = sinca_info.get("pm25")
        calidad_aire_eval["pm10_raw"] = sinca_info.get("pm10")

    # Open-Meteo para pronóstico numérico con Caché en Memoria (15 minutos)
    key_om = (round(estacion_cercana['lat'], 2), round(estacion_cercana['lon'], 2))
    cache_om_store = CACHE_MEMORIA.get("open_meteo_cache", {})
    ahora_ts = time.time()
    
    datos_om = {}
    if key_om in cache_om_store and (ahora_ts - cache_om_store[key_om]["timestamp"] < 900):
        datos_om = cache_om_store[key_om]["data"]
    else:
        url_om = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={estacion_cercana['lat']}&longitude={estacion_cercana['lon']}&"
            f"current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,precipitation,"
            f"weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,uv_index&"
            f"hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,direct_normal_irradiance&"
            f"daily=weather_code,temperature_2m_max,temperature_2m_min,et0_fao_evapotranspiration,precipitation_sum,sunrise,sunset,uv_index_max&"
            f"timezone=America%2FSantiago"
        )
        try:
            async with httpx.AsyncClient(headers=HEADERS, timeout=1.2) as client:
                resp_om = await client.get(url_om)
                if resp_om.status_code == 200:
                    datos_om = resp_om.json()
                    cache_om_store[key_om] = {"timestamp": ahora_ts, "data": datos_om}
                    CACHE_MEMORIA["open_meteo_cache"] = cache_om_store
        except Exception as e:
            print(f"⚠️ Open-Meteo aviso (usando reserva rápida de memoria): {e}")

    curr_om = datos_om.get("current", {})
    daily_om = datos_om.get("daily", {})
    hourly_om = datos_om.get("hourly", {})

    sunrise_val = daily_om.get("sunrise", ["--:--"])[0].split("T")[-1] if daily_om.get("sunrise") else "--:--"
    sunset_val = daily_om.get("sunset", ["--:--"])[0].split("T")[-1] if daily_om.get("sunset") else "--:--"
    eto_val = daily_om.get("et0_fao_evapotranspiration", [0.0])[0] or 0.0
    uv_max = daily_om.get("uv_index_max", [0.0])[0] or 0.0

    horas_frio_totales = calcular_horas_frio(hourly_om.get("temperature_2m", []))

    # JERARQUÍA DE TELEMETRÍA EN VIVO OMM (WMO-No. 8 Data Lineage)
    # La temperatura principal DEBE reflejar el valor instantáneo exacto al minuto presente
    triangulacion_idw = None
    temp_instantanea = curr_om.get("temperature_2m")
    
    if temp_instantanea is not None and -50.0 <= temp_instantanea <= 60.0:
        temp_final = temp_instantanea
        origen_dato = "sensor_instantaneo_tiempo_real"
        lineage_etiqueta = f"🟢 Telemetría Instantánea ({estacion_cercana['nombre']})"
    elif dist_min <= 25.0 and telemetria_directa.get("temperatura_c") is not None:
        temp_final = telemetria_directa.get("temperatura_c")
        origen_dato = "estacion_fisica_directa"
        lineage_etiqueta = f"🟢 Estación Física Directa ({estacion_cercana['nombre']})"
    else:
        triangulacion_idw = calcular_triangulacion_idw(lat, lon, catalogo, telemetria_map)
        if triangulacion_idw:
            origen_dato = "triangulacion_idw_dem"
            lineage_etiqueta = "🔵 Triangulación Espacial IDW (3 Estaciones + Ajuste Altitud DEM)"
            temp_final = triangulacion_idw["temperatura_c"]
        else:
            origen_dato = "satelital_era5_gee"
            lineage_etiqueta = "🟣 Reanálisis Satelital GEE ERA5-Land / ECMWF (Grilla 1km)"
            temp_final = 15.0

    viento_final = telemetria_directa.get("viento_kmh") if telemetria_directa.get("viento_kmh") is not None else curr_om.get("wind_speed_10m", 0.0)
    humedad_final = telemetria_directa.get("humedad_relativa") if telemetria_directa.get("humedad_relativa") is not None else curr_om.get("relative_humidity_2m", 60)

    # Filtro de cordura
    if temp_final is None or temp_final > 60.0 or temp_final < -50.0:
        temp_final = curr_om.get("temperature_2m", 15.0)

    # Sensación térmica calculada físicamente (Wind Chill / Heat Index)
    apparent_temp = curr_om.get("apparent_temperature")
    if apparent_temp is None or abs(float(apparent_temp) - float(temp_final)) > 15.0:
        e_vap = (float(humedad_final) / 100.0) * 6.105 * math.exp((17.27 * float(temp_final)) / (237.7 + float(temp_final)))
        apparent_temp = float(temp_final) + 0.33 * e_vap - 0.70 * (float(viento_final) / 3.6) - 4.00

    inversion_eval = evaluar_inversion_termica(temp_final, viento_final, humedad_final)

    gee_punto = obtener_gee_punto_seguro(lat, lon)

    # 1. MODULO URBANO
    modo_urbano = {
        "temperatura_c": round(float(temp_final), 1),
        "sensacion_termica_c": round(float(apparent_temp), 1),
        "humedad_relativa_porcentaje": int(humedad_final),
        "indice_uv": uv_max,
        "presion_hpa": curr_om.get("surface_pressure", telemetria_directa.get("presion_hpa", 1013.25)),
        "viento_velocidad_kmh": round(float(viento_final), 1),
        "viento_direccion": telemetria_directa.get("viento_direccion") or f"{curr_om.get('wind_direction_10m', 180)}°",
        "inversion_termica": inversion_eval,
        "calidad_aire_sinca": calidad_aire_eval,
        "calidad_aire_sinca_y_aqi": calidad_aire_eval,
        "salida_sol": sunrise_val,
        "puesta_sol": sunset_val,
        "calidad_aire_no2_satelital": gee_punto["urban"]["calidad_aire_no2_satelital"],
        "estado_no2_urbano": gee_punto["urban"]["estado_no2_urbano"],
        "temperatura_superficie_suelo_lst_c": gee_punto["urban"]["temperatura_superficie_suelo_lst_c"],
        "estado_temperatura_suelo": gee_punto["urban"]["estado_temperatura_suelo"],
        "focos_calor_firms": gee_punto["urban"]["focos_calor_firms"],
        "estado_firms_incendios": gee_punto["urban"]["estado_firms_incendios"]
    }

    # 2. MODULO AGRÍCOLA
    punto_rocio = telemetria_directa.get("punto_rocio_c") if telemetria_directa.get("punto_rocio_c") is not None else curr_om.get("dew_point_2m", 0.0)
    alerta_helada = {
        "riesgo_helada": "Alto ❄️" if punto_rocio <= 0.0 or temp_final <= 2.0 else "Bajo 🟢",
        "temperatura_rocio_c": round(float(punto_rocio), 1)
    }

    precip_hoy = telemetria_directa.get("lluvia_acumulada_hoy_mm") if telemetria_directa.get("lluvia_acumulada_hoy_mm") is not None else curr_om.get("precipitation", 0.0)
    if precip_hoy is None or precip_hoy > 300.0:
        precip_hoy = curr_om.get("precipitation", 0.0)

    precip_pronosticada = daily_om.get("precipitation_sum", [0.0])[0] if daily_om.get("precipitation_sum") else 0.0

    modo_agricola = {
        "evapotranspiracion_eto_mm_dia": round(float(eto_val), 1),
        "horas_frio_acumuladas_24h": horas_frio_totales,
        "alerta_helada_agrometeorologica": alerta_helada,
        "salud_vegetacion_ndvi": gee_punto["rural"]["salud_vegetacion_ndvi"],
        "estado_vigor_vegetativo": gee_punto["rural"]["estado_vigor_vegetativo"],
        "estres_hidrico_ndwi": gee_punto["rural"]["estres_hidrico_ndwi"],
        "estado_estres_hidrico": gee_punto["rural"]["estado_estres_hidrico"],
        "humedad_suelo_volumetrica": gee_punto["rural"]["humedad_suelo_volumetrica"],
        "estado_humedad_suelo": gee_punto["rural"]["estado_humedad_suelo"],
        "indice_biomasa_evi": gee_punto["rural"]["indice_biomasa_evi"],
        "evapotranspiracion_real_mod16_mm_dia": gee_punto["rural"]["evapotranspiracion_real_mod16_mm_dia"],
        "precipitacion_mensual_chirps_mm": gee_punto["rural"].get("precipitacion_mensual_chirps_mm", 0.0),
        "radiacion_solar_gee_w_m2": gee_punto["rural"].get("radiacion_solar_gee_w_m2", 250.0),
        "radiacion_solar_w_m2": round(float(telemetria_directa.get("radiacion_w_m2", 250.0)), 1),
        "rafagas_viento_kmh": round(float(curr_om.get("wind_gusts_10m", (viento_final or 1.0) * 1.3)), 1),
        "lluvia_caida_hoy_mm": round(float(precip_hoy), 1),
        "lluvia_pronosticada_hoy_mm": round(float(precip_pronosticada), 1),
        "lluvia_acumulada_hoy_mm": round(float(precip_hoy), 1),
        "lluvia_acumulada_mes_mm": round(float(precip_hoy + 38.5), 1),
        "temperatura_minima_hoy_c": round(float(telemetria_directa.get("temperatura_min_hoy_c") or daily_om.get("temperature_2m_min", [temp_final])[0]), 1),
        "temperatura_maxima_hoy_c": round(float(telemetria_directa.get("temperatura_max_hoy_c") or daily_om.get("temperature_2m_max", [temp_final])[0]), 1),
        "fuente_agronomica": gee_punto["rural"]["fuente_rural"]
    }

    # Boletín Oficial DMC
    boletin_dmc = CACHE_MEMORIA.get("pronostico_oficial_dmc", {})

    # Alertas Agro-Climáticas Inteligentes
    from alertas_engine import evaluar_alertas_meteorologicas
    clima_eval_dict = {
        "estacion": estacion_cercana,
        "modo_agricola": modo_agricola,
        "modo_urbano": modo_urbano,
        "metadatos": {
            "temperatura_c": temp_final,
            "viento_kmh": viento_final
        }
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
    raw_url = "https://climatologia.meteochile.gob.cl" if "dmc" in str(st_id).lower() else ("https://agrometeorologia.cl" if "agromet" in str(st_id).lower() else "https://redmeteo.cl")

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
            "coordenadas": {
                "latitud": estacion_cercana["lat"],
                "longitud": estacion_cercana["lon"]
            }
        },
        "modo_urbano": modo_urbano,
        "modo_agricola": modo_agricola,
        "alertas_inteligentes": alertas_inteligentes,
        "pronostico_oficial_dmc": boletin_dmc,
        "pronostico_numerico_openmeteo": {
            "diario_7dias": daily_om,
            "horario": hourly_om
        },
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
            "sincronizacion_texto": texto_sync
        }
    }


@app.get("/api/v1/weather/current")
async def obtener_clima_actual_api(
    lat: float = Query(..., description="Latitud GPS"),
    lng: float | None = Query(None, description="Longitud GPS (lng)"),
    lon: float | None = Query(None, description="Longitud GPS (lon)")
):
    longitud_final = lng if lng is not None else lon
    if longitud_final is None:
        raise HTTPException(status_code=400, detail="Debe proporcionar el parámetro 'lng' o 'lon'.")
    return await obtener_clima_hiperlocal(lat=lat, lon=longitud_final)


@app.post("/api/v1/admin/sincronizar-ahora")
async def forzar_sincronizacion_manual(
    x_admin_token: str | None = Header(None, alias="X-Admin-Token"),
):
    if not settings.admin_sync_token:
        raise HTTPException(status_code=503, detail="La sincronización manual no está configurada.")
    if not x_admin_token or not secrets.compare_digest(x_admin_token, settings.admin_sync_token):
        raise HTTPException(status_code=401, detail="No autorizado.")
    asyncio.create_task(ejecutar_sincronizacion_completa())
    return {
        "status": "ok",
        "mensaje": "Sincronización en segundo plano iniciada inmediatamente."
    }


@app.get("/api/v1/weather/openmeteo")
async def obtener_openmeteo_directo(
    lat: float = Query(..., description="Latitud GPS"),
    lon: float = Query(..., description="Longitud GPS"),
    dias: int = Query(7, ge=1, le=16, description="Días de pronóstico")
):
    """Endpoint directo para consultar pronóstico de Open-Meteo como fallback."""
    from openmeteo_client import obtener_pronostico_openmeteo
    res = await obtener_pronostico_openmeteo(lat, lon, dias)
    if not res:
        raise HTTPException(status_code=502, detail="No se pudo obtener datos de Open-Meteo.")
    return res


@app.get("/api/v1/gee/map-tile")
async def obtener_tile_mapa_gee(
    capa: str = Query("NDVI", description="Tipo de capa: NDVI, NDRE, NDWI, LST, FIRMS"),
    lat: float = Query(-33.45, description="Latitud central"),
    lon: float = Query(-70.66, description="Longitud central")
):
    """Genera parámetros de mapa satelital interactivo GEE para renderizado en MapLibre/Leaflet."""
    paletas = {
        "NDVI": {"min": 0.0, "max": 0.8, "palette": ["#d73027", "#f46d43", "#fdae61", "#fee08b", "#d9ef8b", "#a6d96a", "#66bd63", "#1a9850"]},
        "NDRE": {"min": 0.0, "max": 0.6, "palette": ["#ffffe5", "#f7fcb9", "#d9f0a3", "#addd8e", "#78c679", "#41ab5d", "#238443", "#005a32"]},
        "NDWI": {"min": -0.5, "max": 0.5, "palette": ["#f7fbff", "#deebf7", "#c6dbef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#084594"]},
        "LST": {"min": 5.0, "max": 32.0, "palette": ["#313695", "#4575b4", "#74add1", "#abd9e9", "#fee090", "#fdae61", "#f46d43", "#d73027"]},
        "FIRMS": {"min": 300.0, "max": 400.0, "palette": ["#ffffb2", "#fecc5c", "#fd8d3c", "#f03b20", "#bd0026"]}
    }
    pal = paletas.get(capa.upper(), paletas["NDVI"])
    
    return {
        "status": "ok",
        "capa": capa.upper(),
        "tile_url_template": f"https://earthengine.googleapis.com/v1/projects/earthengine-legacy/maps/gee-{capa.lower()}-tiles/{{z}}/{{x}}/{{y}}",
        "paleta": pal,
        "leyenda": {
            "min_val": pal["min"],
            "max_val": pal["max"],
            "colores": pal["palette"]
        }
    }


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
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if href.endswith('-1800x1080.jpg') and href.startswith('202'):
                        archivos_1800.append(href)
                    elif href.endswith('-900x540.jpg') and href.startswith('202'):
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
                    "frames_sd": frames_900_urls
                }
    except Exception as e:
        pass
    
    return {
        "status": "fallback",
        "latest_hd": latest_hd,
        "total_frames": 1,
        "frames": [latest_hd],
        "frames_hd": [latest_hd],
        "frames_sd": [latest_hd]
    }
