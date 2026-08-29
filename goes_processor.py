import asyncio
import io
import logging
import os
import time
from datetime import datetime, timedelta, timezone

import httpx
from PIL import Image

logger = logging.getLogger("goes_processor")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
WEBP_OUTPUT_PATH = os.path.join(STATIC_DIR, "goes19_loop.webp")

HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"}

GOES_CACHE_METADATA = {
    "status": "uninitialized",
    "last_updated_ts": 0,
    "updated_at_label": "Pendiente de actualización",
    "video_url": "/static/goes19_loop.webp",
    "total_frames": 0,
    "ventana_horas": 6,
    "fps": 12,
    "frames_metadata": [],
    "raw_source_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/",
    "is_live_data": True,
}


def _parsear_timestamp_noaa(filename: str) -> tuple[str, str, str]:
    """Extrae timestamps UTC y hora local de Chile a partir del nombre de archivo NOAA."""
    try:
        prefix = filename.split("_")[0]
        year = int(prefix[:4])
        day_of_year = int(prefix[4:7])
        hour = int(prefix[7:9])
        minute = int(prefix[9:11])
        dt_utc = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day_of_year - 1, hours=hour, minutes=minute)
        # Chile Continental (UTC-4)
        dt_cl = dt_utc - timedelta(hours=4)
        return dt_utc.isoformat(), dt_cl.strftime("%H:%M hrs"), dt_cl.strftime("%d/%m/%Y")
    except Exception:
        now_utc = datetime.now(timezone.utc)
        now_cl = now_utc - timedelta(hours=4)
        return now_utc.isoformat(), now_cl.strftime("%H:%M hrs"), now_cl.strftime("%d/%m/%Y")


async def _descargar_y_procesar_frame(client, url, filename, semaphore):
    async with semaphore:
        try:
            resp = await client.get(url, timeout=15.0)
            if resp.status_code == 200:

                def procesar_img(img_bytes):
                    with Image.open(io.BytesIO(img_bytes)) as img:
                        # Reducir a 900x540 uniforme para máxima nitidez y peso liviano (<1.5MB)
                        return img.convert("RGB").resize((900, 540), Image.Resampling.BILINEAR)

                img_obj = await asyncio.to_thread(procesar_img, resp.content)
                ts_utc, hora_cl, fecha_cl = _parsear_timestamp_noaa(filename)
                meta = {
                    "archivo": filename,
                    "url": url,
                    "timestamp_utc": ts_utc,
                    "hora_local_chile": hora_cl,
                    "fecha_local": fecha_cl,
                }
                return img_obj, meta
        except Exception as e:
            logger.warning(f"Error en frame {url}: {e}")
    return None, None


async def procesar_video_goes19(horas_ventana: int = 6) -> dict:
    """
    Descarga los fotogramas oficiales de la NOAA para Chile (GOES-19 SSA),
    compila un bucle WebP optimizado de 6 horas (24 cuadros a intervalos de 15 min),
    y genera la metadata horaria para el scrubber interactivo.
    """
    global GOES_CACHE_METADATA
    url_base = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/"
    logger.info(f"🛰️ [GOES-19 Processor] Indexando fotogramas para ventana de {horas_ventana} horas...")

    try:
        os.makedirs(STATIC_DIR, exist_ok=True)
        async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url_base)
            if resp.status_code == 200:
                import re
                hrefs = re.findall(r'href="([^"]+)"', resp.text)
                archivos = {h for h in hrefs if h.endswith("-1800x1080.jpg") and h.startswith("202")}

                archivos_ordenados = sorted(list(archivos))
                # 24 cuadros para 6 horas (cadencia ~15 min)
                total_necesarios = horas_ventana * 4
                frames_seleccionados = (
                    archivos_ordenados[-total_necesarios:]
                    if len(archivos_ordenados) >= total_necesarios
                    else archivos_ordenados
                )

                if frames_seleccionados:
                    logger.info(
                        f"📥 Descargando {len(frames_seleccionados)} fotogramas GOES-19 (resolución uniforme 900x540)..."
                    )
                    semaphore = asyncio.Semaphore(4)
                    tasks = [
                        _descargar_y_procesar_frame(client, f"{url_base}{f}", f, semaphore)
                        for f in frames_seleccionados
                    ]

                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    valid_pairs = [
                        res for res in results if res and not isinstance(res, Exception) and res[0] is not None
                    ]

                    images = [p[0] for p in valid_pairs]
                    frames_meta = [p[1] for p in valid_pairs]

                    for idx, fm in enumerate(frames_meta):
                        fm["indice"] = idx

                    if images:

                        def guardar_webp(imgs):
                            try:
                                imgs[0].save(
                                    WEBP_OUTPUT_PATH,
                                    format="WEBP",
                                    save_all=True,
                                    append_images=imgs[1:],
                                    duration=85,  # ~12 fps
                                    loop=0,
                                    quality=78,
                                    method=1,
                                )
                            finally:
                                for i in imgs:
                                    i.close()

                        logger.info("⏳ Compilando bucle WebP HD de 6 horas...")
                        await asyncio.to_thread(guardar_webp, images)

                        import gc

                        num_imgs = len(images)
                        del images
                        gc.collect()

                        # Respaldar en Supabase si está configurado
                        if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_KEY"):
                            try:
                                from supabase_store import subir_archivo_supabase

                                await asyncio.to_thread(
                                    subir_archivo_supabase, WEBP_OUTPUT_PATH, "goes19_loop.webp", "image/webp"
                                )
                            except Exception as supa_err:
                                logger.warning(f"Aviso subiendo GOES-19 a Supabase: {supa_err}")

                        now_ts = int(time.time())
                        ultima_hora = frames_meta[-1]["hora_local_chile"] if frames_meta else time.strftime("%H:%M hrs")

                        GOES_CACHE_METADATA = {
                            "status": "ok",
                            "last_updated_ts": now_ts,
                            "updated_at_label": f"Actualizado a las {ultima_hora} (Últimas {horas_ventana}h)",
                            "video_url": "/static/goes19_loop.webp",
                            "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
                            "total_frames": num_imgs,
                            "ventana_horas": horas_ventana,
                            "fps": 12,
                            "frames_metadata": frames_meta,
                            "raw_source_url": url_base,
                            "is_live_data": True,
                        }
                        logger.info(f"🎞️ Bucle WebP GOES-19 HD generado ({num_imgs} cuadros, última hora {ultima_hora})")
                        return GOES_CACHE_METADATA

    except Exception as e:
        logger.error(f"⚠️ Error procesando animación GOES-19: {e}")

    # Fallback
    now_ts = int(time.time())
    time_label = time.strftime("%H:%M hrs")
    GOES_CACHE_METADATA.update(
        {
            "status": "fallback",
            "last_updated_ts": now_ts,
            "updated_at_label": f"Actualizada a las {time_label}",
            "video_url": "/static/goes19_loop.webp",
            "total_frames": 1,
            "ventana_horas": horas_ventana,
            "fps": 1,
            "frames_metadata": [
                {
                    "indice": 0,
                    "url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/1800x1080.jpg",
                    "hora_local_chile": time_label,
                    "timestamp_utc": datetime.now(timezone.utc).isoformat(),
                }
            ],
            "raw_source_url": url_base,
            "is_live_data": True,
        }
    )
    return GOES_CACHE_METADATA


def obtener_satellite_latest_loop() -> dict:
    """Devuelve la metadata y URL del bucle animado más reciente de GOES-19."""
    if GOES_CACHE_METADATA["status"] == "uninitialized":
        now_ts = int(time.time())
        time_label = time.strftime("%H:%M hrs")
        return {
            "status": "ok",
            "last_updated_ts": now_ts,
            "updated_at_label": f"Actualizado a las {time_label} (Últimas 6h)",
            "video_url": "/static/goes19_loop.webp",
            "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
            "total_frames": 24,
            "ventana_horas": 6,
            "fps": 12,
            "frames_metadata": [],
            "raw_source_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/",
            "is_live_data": True,
        }
    return GOES_CACHE_METADATA
