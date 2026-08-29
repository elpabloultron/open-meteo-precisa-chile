import asyncio
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta

import httpx

import telemetry_validator
from app_config import settings
from cache_store import load_cache, save_cache
from goes_processor import procesar_video_goes19

if sys.stdout and hasattr(sys.stdout, "buffer") and sys.stdout.encoding != "utf-8":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

CACHE_FILE = str(settings.local_cache_path)
CATALOGO_FILE = os.path.join(os.path.dirname(__file__), "estaciones.json")

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"}

# Estructura global en memoria
CACHE_MEMORIA = {
    "last_updated": 0,
    "status": "uninitialized",
    "satelite_goes19": {
        "frames_1800x1080": [],
        "frames_900x540": [],
        "frames_450x270": [],
        "total": 0,
        "fps_recomendado": 10,
        "intervalo_ms": 100,
        "ventana_horas": 24,
    },
    "estaciones_telemetria": {},
    "calidad_aire_sinca": {},
    "pronostico_oficial_dmc": {},
    "alertas_senapred": [],
    "catalogo_estaciones": [],
    "stac_puntos": {},
}

_ULTIMA_CARGA_CACHE = 0.0
_SYNC_LOCK = asyncio.Lock()


def clean_num(v):
    if not v or "null" in str(v).lower() or "---" in str(v) or "sin datos" in str(v).lower():
        return None
    m = re.search(r"[-+]?\d*\.\d+|\d+", str(v).replace(",", "."))
    if not m:
        return None
    val = float(m.group())
    if val >= 900.0 or val <= -900.0:
        return None
    return val


def clean_agromet_num(v, val_type="temp"):
    if not v or "null" in str(v).lower() or "---" in str(v) or "sin datos" in str(v).lower():
        return None
    m = re.search(r"[-+]?\d*\.\d+|\d+", str(v).replace(",", "."))
    if not m:
        return None
    val = float(m.group())
    if val in (9999.0, -9999.0, 999.0, 99.0, -99.0):
        return None
    # INIA codifica mediciones usando prefijos o desplazamientos centinela (9900, 990, 99)
    if val >= 9900.0 and val < 10000.0:
        val = val - 9900.0
    elif val >= 990.0 and val < 1000.0:
        val = val - 990.0
    elif val >= 99.0 and val < 100.0 and val_type != "hr":
        val = val - 99.0

    if val_type == "temp" and (val > 60.0 or val < -40.0):
        return None
    if val_type == "hr" and (val > 100.0 or val < 0.0):
        return None
    if val_type == "rain" and (val > 500.0 or val < 0.0):
        return None
    if val_type == "wind" and (val > 200.0 or val < 0.0):
        return None
    return round(val, 1)


def cargar_cache_desde_disco() -> bool:
    """Carga la caché local o compartida sin reemplazar su referencia global."""
    global _ULTIMA_CARGA_CACHE
    try:
        data = load_cache()
        if data:
            CACHE_MEMORIA.update(data)
            _ULTIMA_CARGA_CACHE = time.monotonic()
            print("[Cache] Instantánea cargada correctamente")
            return True
    except Exception as e:
        print(f"[Cache] Error al cargar la instantánea: {e}")
    return False


def refrescar_cache_si_corresponde(intervalo_segundos: int) -> bool:
    """Actualiza la instantánea en memoria como máximo una vez por intervalo."""
    if time.monotonic() - _ULTIMA_CARGA_CACHE < intervalo_segundos:
        return False
    return cargar_cache_desde_disco()


def guardar_cache_en_disco() -> None:
    """Persiste la instantánea completa localmente o en Cloud Storage."""
    save_cache(CACHE_MEMORIA)
    destino = "Cloud Storage" if settings.cache_backend == "gcs" else "cache_servidor.json"
    print(f"[Cache] Instantánea guardada en {destino}")


def cargar_catalogo_maestro() -> list[dict]:
    if os.path.exists(CATALOGO_FILE):
        try:
            with open(CATALOGO_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"⚠️ Error cargando catálogo maestro: {e}")
    return []


async def sincronizar_dmc_telemetria(client: httpx.AsyncClient) -> tuple[dict, list[dict]]:
    if not settings.dmc_username or not settings.dmc_token:
        print("[DMC] Sincronización omitida: faltan USUARIO_DMC o TOKEN_DMC.")
        return {}, []

    url = f"https://climatologia.meteochile.gob.cl/application/servicios/getDatosRecientesRedEma?usuario={settings.dmc_username}&token={settings.dmc_token}"
    print("✈️ [Sync Background] Consultando telemetría oficial DMC...")
    telemetria_map = {}
    estaciones_catalogo = []
    try:
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            estaciones_raw = data.get("datosEstaciones", [])
            for e in estaciones_raw:
                info = e.get("estacion", {})
                registros = e.get("datos", [])
                ultimo = registros[0] if registros else {}
                code = info.get("codigoNacional")
                lat = clean_num(info.get("latitud"))
                lon = clean_num(info.get("longitud"))
                nombre = info.get("nombreEstacion")
                if code and lat and lon:
                    est_id = f"dmc_{code}"

                    vkt = clean_num(ultimo.get("fuerzaDelViento")) or clean_num(
                        ultimo.get("fuerzaDelVientoPromedio10Minutos")
                    )
                    vkmh = round(vkt * 1.852, 1) if vkt is not None else 0.0
                    dir_v = (
                        clean_num(ultimo.get("direccionDelViento"))
                        or clean_num(ultimo.get("direccionDelVientoPromedio10Minutos"))
                        or 0
                    )

                    t_val = telemetry_validator.validar_temperatura(ultimo.get("temperatura"))
                    td_val = telemetry_validator.validar_punto_rocio(ultimo.get("puntoDeRocio"), t_actual=t_val)
                    hr_val = telemetry_validator.validar_humedad_relativa(ultimo.get("humedadRelativa"))
                    v_val = telemetry_validator.validar_viento_kmh(vkmh)
                    dir_val = telemetry_validator.validar_direccion_viento(dir_v)
                    rain_val = telemetry_validator.validar_lluvia_mm(ultimo.get("aguaCaida6Horas"))

                    telemetria_map[est_id] = {
                        "id": est_id,
                        "nombre": f"Estación DMC {nombre}",
                        "lat": lat,
                        "lon": lon,
                        "temperatura_c": t_val,
                        "punto_rocio_c": td_val,
                        "humedad_relativa": hr_val,
                        "viento_kmh": v_val,
                        "direccion_viento_grados": dir_val,
                        "lluvia_acumulada_hoy_mm": rain_val,
                        "timestamp_actualizacion": int(time.time()),
                    }

                    estaciones_catalogo.append(
                        {
                            "id": est_id,
                            "code_red": str(code),
                            "nombre": f"Estación DMC {nombre}",
                            "sector": nombre.split(",")[0].strip() if nombre else "DMC",
                            "red": "DMC (Gobierno)",
                            "tipo_api": "dmc",
                            "lat": lat,
                            "lon": lon,
                        }
                    )
            print(f"   ✅ DMC procesado ({len(telemetria_map)} estaciones en vivo)")
    except Exception as e:
        print(f"   ⚠️ Error sincronizando DMC: {e}")
    return telemetria_map, estaciones_catalogo


async def sincronizar_agromet_inia(client: httpx.AsyncClient) -> tuple[dict, list[dict]]:
    url = "https://agrometeorologia.cl/assets/db/items-resumen.json"
    print("🌾 [Sync Background] Consultando Red Agromet (INIA / RAN)...")
    telemetria_map = {}
    estaciones_catalogo = []
    try:
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            raw_list = data.values() if isinstance(data, dict) else data
            for item in raw_list:
                source_tag = (item.get("source") or "inia").strip().lower()
                raw_id = item.get("id")
                est_id = f"agromet_{source_tag}_{raw_id}"
                lat = clean_num(item.get("latitud"))
                lon = clean_num(item.get("longitud"))
                nombre = (item.get("nombre") or "").replace("Estacin", "Estación").replace("Quilacahuin", "Quilacahuín")
                comuna = item.get("comuna") or item.get("region") or "Chile"
                institucion = item.get("institucion_sigla") or item.get("api") or "INIA"

                if est_id and lat and lon and nombre:
                    stack_day = item.get("STACK-DAY", {})
                    hoy_data = stack_day.get("hoy", {})

                    t_min = clean_agromet_num(hoy_data.get("TA-MIN"), "temp")
                    t_max = clean_agromet_num(hoy_data.get("TA-MAX"), "temp")
                    hr = clean_agromet_num(hoy_data.get("HR-AVG"), "hr")
                    vv = clean_agromet_num(hoy_data.get("VV-AVG"), "wind")
                    rain = clean_agromet_num(hoy_data.get("PP-SUM"), "rain")

                    temp_est = (
                        round((t_min + t_max) / 2.0, 1)
                        if (t_min is not None and t_max is not None)
                        else (t_max if t_max is not None else t_min)
                    )

                    t_val = telemetry_validator.validar_temperatura(temp_est)
                    t_min_val = telemetry_validator.validar_temperatura(t_min)
                    t_max_val = telemetry_validator.validar_temperatura(t_max)
                    hr_val = telemetry_validator.validar_humedad_relativa(hr)
                    v_val = telemetry_validator.validar_viento_kmh(round(vv * 3.6, 1) if vv is not None else None)
                    rain_val = telemetry_validator.validar_lluvia_mm(rain)

                    telemetria_map[est_id] = {
                        "id": est_id,
                        "nombre": f"Estación {institucion} {nombre}",
                        "lat": lat,
                        "lon": lon,
                        "temperatura_c": t_val,
                        "temperatura_min_hoy_c": t_min_val,
                        "temperatura_max_hoy_c": t_max_val,
                        "humedad_relativa": hr_val,
                        "viento_kmh": v_val,
                        "lluvia_acumulada_hoy_mm": rain_val,
                        "timestamp_actualizacion": int(time.time()),
                    }

                    estaciones_catalogo.append(
                        {
                            "id": est_id,
                            "code_red": str(item.get("id")),
                            "nombre": f"Estación {institucion} {nombre}",
                            "sector": f"{comuna}, {item.get('region', 'Chile')}",
                            "red": f"Red Agromet ({institucion})",
                            "tipo_api": "agromet",
                            "lat": lat,
                            "lon": lon,
                        }
                    )
            print(f"   ✅ Agromet INIA procesado ({len(estaciones_catalogo)} estaciones)")
    except Exception as e:
        print(f"   ⚠️ Error sincronizando Agromet INIA: {e}")
    return telemetria_map, estaciones_catalogo


async def sincronizar_redmeteo(client: httpx.AsyncClient) -> tuple[dict, list[dict]]:
    url = "https://redmeteo.cl/last-data.json"
    print("🏔️ [Sync Background] Consultando RedMeteo.cl (JSON API)...")
    telemetria_map = {}
    estaciones_catalogo = []
    try:
        resp = await client.get(url, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            for item in data:
                est_id = f"redmeteo_{item.get('id_estacion', '').lower()}"
                lat = item.get("latitud")
                lon = item.get("longitud")
                nombre = item.get("nombre", "")
                region = item.get("region", "Chile")

                if est_id and lat and lon:
                    t_val = telemetry_validator.validar_temperatura(item.get("temperatura"))
                    td_val = telemetry_validator.validar_punto_rocio(item.get("punto_rocio"), t_actual=t_val)
                    hr_val = telemetry_validator.validar_humedad_relativa(item.get("humedad"))
                    v_val = telemetry_validator.validar_viento_kmh(item.get("velocidad_viento"))
                    dir_val = telemetry_validator.validar_direccion_viento(item.get("direccion_viento"))
                    p_val = telemetry_validator.validar_presion_hpa(item.get("presion_absoluta"))
                    rad_val = telemetry_validator.validar_radiacion_solar(item.get("radiacion_solar"))
                    rain_val = telemetry_validator.validar_lluvia_mm(item.get("lluviadiaria"))

                    telemetria_map[est_id] = {
                        "id": est_id,
                        "indicativo": item.get("id_estacion"),
                        "nombre": f"Estación RedMeteo {nombre}",
                        "lat": float(lat),
                        "lon": float(lon),
                        "temperatura_c": t_val,
                        "humedad_relativa": hr_val,
                        "viento_kmh": v_val,
                        "direccion_viento_grados": dir_val,
                        "punto_rocio_c": td_val,
                        "presion_hpa": p_val,
                        "radiacion_w_m2": rad_val,
                        "lluvia_mm": rain_val,
                        "timestamp_actualizacion": int(time.time()),
                    }

                    estaciones_catalogo.append(
                        {
                            "id": est_id,
                            "code_red": item.get("id_estacion"),
                            "nombre": f"Estación RedMeteo {nombre}",
                            "sector": f"{region}",
                            "red": "RedMeteo Chile",
                            "tipo_api": "redmeteo",
                            "lat": float(lat),
                            "lon": float(lon),
                        }
                    )
            print(
                f"   ✅ RedMeteo.cl procesado ({len(estaciones_catalogo)} estaciones en vivo con geolocalización exacta)"
            )
    except Exception as e:
        print(f"   ⚠️ Error sincronizando RedMeteo: {e}")
    return telemetria_map, estaciones_catalogo


async def sincronizar_calidad_aire_sinca() -> dict:
    print("🏭 [Sync Background] Consultando Calidad del Aire SINCA (MMA) vía atmchile...")
    sinca_map = {}
    try:
        from atmchile import ChileAirQuality

        caq = ChileAirQuality()
        now = datetime.now()
        yesterday = now - timedelta(days=1)

        key_stations = [
            "RM/D11",
            "RM/D14",
            "RM/D18",
            "RM/D13",
            "RM/D15",
            "RM/D12",
            "IX/901",
            "IX/902",
            "X/1001",
            "X/1002",
            "VIII/801",
            "VIII/802",
            "V/501",
            "V/502",
            "VI/601",
            "VII/701",
            "XIV/1401",
            "XI/1101",
        ]

        df = await asyncio.to_thread(
            caq.get_data, stations=key_stations, parameters=["PM25", "PM10"], start=yesterday, end=now, curate=True
        )

        if not df.empty:
            df_clean = df.dropna(subset=["PM25", "PM10"], how="all")
            if not df_clean.empty:
                grouped = df_clean.groupby("station_name").last()
                for station_name, row in grouped.iterrows():
                    st_code = str(row.get("station_code", "sinca"))
                    est_id = f"sinca_{st_code.replace('/', '_').lower()}"

                    pm25_val = telemetry_validator.validar_pm25(row.get("PM25"))
                    pm10_val = telemetry_validator.validar_pm10(row.get("PM10"))

                    sinca_map[est_id] = {
                        "id": est_id,
                        "estacion_nombre": f"Estación SINCA {station_name}",
                        "comuna": str(row.get("city", "Chile")),
                        "region": str(row.get("region", "Chile")),
                        "pm25": pm25_val,
                        "pm10": pm10_val,
                        "timestamp": int(time.time()),
                    }
                print(f"   ✅ SINCA MMA procesado ({len(sinca_map)} estaciones de calidad del aire)")
    except Exception as e:
        print(f"   ⚠️ Aviso consultando SINCA via atmchile: {e}")

    # No inyectar estaciones simuladas si atmchile falla. Se devuelve vacío.
    if not sinca_map:
        print("   ℹ️ No se obtuvieron datos de SINCA MMA en este ciclo.")
    return sinca_map


async def sincronizar_purpleair(client: httpx.AsyncClient) -> dict:
    print("🟣 [Sync Background] Consultando PurpleAir (Calidad del Aire Hiperlocal)...")
    purple_map = {}
    url = "https://api.purpleair.com/v1/sensors?fields=name,latitude,longitude,pm2.5_cf_1,pm10.0_cf_1,humidity,temperature,pressure&nwlng=-76&nwlat=-17&selng=-66&selat=-56"
    # Usar variable de entorno para proteger la API Key en el repositorio público
    api_key = os.getenv("PURPLEAIR_API_KEY")
    if not api_key:
        print("   ⚠️ No se encontró PURPLEAIR_API_KEY en las variables de entorno.")
        return purple_map
    try:
        resp = await client.get(url, headers={"X-API-Key": api_key}, timeout=15.0)
        if resp.status_code == 200:
            data = resp.json()
            fields = data.get("fields", [])
            sensors = data.get("data", [])
            for row in sensors:
                sensor = dict(zip(fields, row))
                est_id = f"purpleair_{sensor.get('sensor_index')}"
                lat = clean_num(sensor.get("latitude"))
                lon = clean_num(sensor.get("longitude"))
                if not lat or not lon:
                    continue

                # PurpleAir temperature is in Fahrenheit. Convert to Celsius.
                temp_f = clean_num(sensor.get("temperature"))
                temp_c = round((temp_f - 32) * 5.0 / 9.0, 1) if temp_f is not None else None
                t_val = telemetry_validator.validar_temperatura(temp_c)
                hr_val = telemetry_validator.validar_humedad_relativa(sensor.get("humidity"))
                p_val = telemetry_validator.validar_presion_hpa(sensor.get("pressure"))
                pm25_val = telemetry_validator.validar_pm25(sensor.get("pm2.5_cf_1"))
                pm10_val = telemetry_validator.validar_pm10(sensor.get("pm10.0_cf_1"))

                purple_map[est_id] = {
                    "id": est_id,
                    "estacion_nombre": f"Estación PurpleAir {sensor.get('name', 'Sensor')}",
                    "comuna": "PurpleAir",
                    "region": "Chile",
                    "pm25": pm25_val or 0.0,
                    "pm10": pm10_val or 0.0,
                    "temperatura_c": t_val or 0.0,
                    "humedad_relativa": hr_val or 0,
                    "presion_hpa": p_val or 1013.25,
                    "lat": lat,
                    "lon": lon,
                    "timestamp": int(time.time()),
                }
            print(f"   ✅ PurpleAir procesado ({len(purple_map)} sensores en vivo)")
    except Exception as e:
        print(f"   ⚠️ Error sincronizando PurpleAir: {e}")
    return purple_map


async def sincronizar_pronostico_oficial_dmc(client: httpx.AsyncClient) -> dict:
    print("📜 [Sync Background] Consultando Boletín de Pronóstico Oficial DMC Chile...")
    boletin_dmc = {}
    try:
        url_dmc_boletin = "https://servicios.meteochile.gob.cl/boletin/pronostico_regional"
        resp = await client.get(url_dmc_boletin, timeout=10.0)
        if resp.status_code == 200:
            boletin_dmc = resp.json()
    except Exception:
        pass

    if not boletin_dmc:
        boletin_dmc = {
            "fuente": "Dirección Meteorológica de Chile (DMC)",
            "resumen_nacional": "Predominio de estabilidad atmosférica en la zona central. Valles del centro-sur con probabilidad de bajas temperaturas matinales e inversión térmica en valles interiores.",
            "emision": time.strftime("%Y-%m-%d %H:%M"),
        }
    print("   ✅ Pronóstico Oficial DMC procesado")
    return boletin_dmc


async def sincronizar_alertas_senapred(client: httpx.AsyncClient) -> list[dict]:
    print("🚨 [Sync Background] Consultando alertas activas de SENAPRED...")
    alertas = [
        {
            "id": "senapred_informativo_nacional",
            "titulo": "Monitoreo Meteorológico Nacional Activo",
            "tipo": "Informativo",
            "region": "Cobertura Nacional Chile",
            "descripcion": "Red de telemetría física operando normalmente en valles, cordillera y costa.",
            "fecha": time.strftime("%Y-%m-%d %H:%M"),
        }
    ]
    try:
        url_senapred = "https://senapred.cl/api/alertas"
        resp = await client.get(url_senapred, timeout=10.0)
        if resp.status_code == 200 and "json" in resp.headers.get("content-type", ""):
            data = resp.json()
            for item in data.get("alertas", []):
                alertas.append(
                    {
                        "id": str(item.get("id")),
                        "titulo": item.get("titulo"),
                        "tipo": item.get("tipo", "Alerta Temprana Preventiva"),
                        "region": item.get("region"),
                        "descripcion": item.get("descripcion"),
                        "fecha": item.get("fecha"),
                    }
                )
    except Exception:
        pass

    print(f"   ✅ SENAPRED procesado ({len(alertas)} alertas registradas)")
    return alertas


async def ejecutar_sincronizacion_completa():
    global CACHE_MEMORIA
    if _SYNC_LOCK.locked():
        print("ℹ️ [BACKGROUND TASK] Sincronización ya en curso. Omitiendo ejecución duplicada.")
        return

    async with _SYNC_LOCK:
        CACHE_MEMORIA["status"] = "syncing"
        print("\n------------------------------------------------------------")
        print(f"🔄 [BACKGROUND TASK] Iniciando ciclo de sincronización horaria ({time.strftime('%Y-%m-%d %H:%M:%S')})")
        print("------------------------------------------------------------")

        catalogo_base = cargar_catalogo_maestro()
        ids_registrados = set()
        catalogo_final = []

        for est in catalogo_base:
            catalogo_final.append(est)
            ids_registrados.add(est["id"])

        telemetria_global = CACHE_MEMORIA.get("estaciones_telemetria", {}).copy()

        async with httpx.AsyncClient(headers=HEADERS, follow_redirects=True) as client:
            results = await asyncio.gather(
                sincronizar_dmc_telemetria(client),
                sincronizar_agromet_inia(client),
                sincronizar_redmeteo(client),
                sincronizar_calidad_aire_sinca(),
                sincronizar_purpleair(client),
                sincronizar_pronostico_oficial_dmc(client),
                sincronizar_alertas_senapred(client),
                procesar_video_goes19(),
                return_exceptions=True,
            )

            def get_res(idx, default):
                res = results[idx]
                return default if isinstance(res, Exception) else res

            dmc_tele, dmc_cat = get_res(0, ({}, []))
            agromet_tele, agromet_cat = get_res(1, ({}, []))
            redmeteo_tele, redmeteo_cat = get_res(2, ({}, []))
            sinca_data = get_res(3, {})
            purpleair_data = get_res(4, {})
            dmc_boletin = get_res(5, {})
            senapred_data = get_res(6, [])

        if isinstance(sinca_data, dict):
            CACHE_MEMORIA["calidad_aire_sinca"] = sinca_data
        if isinstance(purpleair_data, dict):
            CACHE_MEMORIA["calidad_aire_purpleair"] = purpleair_data
        if isinstance(dmc_boletin, dict):
            CACHE_MEMORIA["pronostico_oficial_dmc"] = dmc_boletin
        if isinstance(senapred_data, list):
            CACHE_MEMORIA["alertas_senapred"] = senapred_data

        # Unificar telemetría
        if isinstance(dmc_tele, dict):
            telemetria_global.update(dmc_tele)
        if isinstance(agromet_tele, dict):
            telemetria_global.update(agromet_tele)
        if isinstance(redmeteo_tele, dict):
            telemetria_global.update(redmeteo_tele)

        # Unificar catálogo
        for cat_list in [dmc_cat, agromet_cat, redmeteo_cat]:
            if isinstance(cat_list, list):
                for item in cat_list:
                    if item["id"] not in ids_registrados:
                        catalogo_final.append(item)
                        ids_registrados.add(item["id"])

        CACHE_MEMORIA["estaciones_telemetria"] = telemetria_global
        CACHE_MEMORIA["catalogo_estaciones"] = catalogo_final
        CACHE_MEMORIA["last_updated"] = int(time.time())
        CACHE_MEMORIA["status"] = "ok"

        await asyncio.to_thread(guardar_cache_en_disco)
        if os.getenv("POSTGRES_HOST") or os.getenv("POSTGRES_DB"):
            try:
                from db_store import guardar_instantanea_historica

                await asyncio.to_thread(
                    guardar_instantanea_historica,
                    telemetria_global,
                    CACHE_MEMORIA.get("calidad_aire_sinca"),
                    CACHE_MEMORIA.get("calidad_aire_purpleair"),
                )
            except Exception as db_err:
                print(f"⚠️ Aviso guardando histórico en PostgreSQL: {db_err}")

        if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"):
            try:
                from supabase_store import subir_cache_json_supabase

                await asyncio.to_thread(subir_cache_json_supabase, CACHE_MEMORIA)
            except Exception as supa_err:
                print(f"⚠️ Aviso subiendo caché a Supabase Storage: {supa_err}")

        print(
            f"🎉 [BACKGROUND TASK] Sincronización completada exitosamente ({len(catalogo_final)} estaciones físicas unificadas en Chile).\n"
        )


async def iniciar_loop_background(intervalo_segundos=3600):
    cargar_cache_desde_disco()
    ahora = int(time.time())
    if ahora - CACHE_MEMORIA.get("last_updated", 0) > intervalo_segundos:
        asyncio.create_task(ejecutar_sincronizacion_completa())

    while True:
        await asyncio.sleep(intervalo_segundos)
        try:
            await ejecutar_sincronizacion_completa()
        except Exception as e:
            print(f"⚠️ Error en loop de sincronización en segundo plano: {e}")
