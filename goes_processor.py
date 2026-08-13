import asyncio
import io
import logging
import os
import time

import httpx
from bs4 import BeautifulSoup
from PIL import Image

logger = logging.getLogger("goes_processor")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
WEBP_OUTPUT_PATH = os.path.join(STATIC_DIR, "goes19_loop.webp")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36"
}

GOES_CACHE_METADATA = {
    "status": "uninitialized",
    "last_updated_ts": 0,
    "updated_at_label": "Pendiente de actualización",
    "video_url": "/static/goes19_loop.webp",
    "total_frames": 0,
    "fps": 20,
    "raw_source_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/",
    "is_live_data": True
}


async def _descargar_y_procesar_frame(client, url, semaphore):
    async with semaphore:
        try:
            resp = await client.get(url, timeout=15.0)
            if resp.status_code == 200:
                def procesar_img(img_bytes):
                    img = Image.open(io.BytesIO(img_bytes))
                    # Usar resize explícito en lugar de thumbnail para garantizar que 
                    # todos los frames tengan exactamente 480x288 y no falle el codificador WebP
                    img = img.resize((480, 288), Image.Resampling.LANCZOS)
                    return img
                return await asyncio.to_thread(procesar_img, resp.content)
        except Exception as e:
            logger.warning(f"Error en frame {url}: {e}")
    return None

async def procesar_video_goes19(max_frames: int = 144) -> dict:
    """
    Descarga los últimos fotogramas de la NOAA para Chile (GOES-19 SSA),
    los compila concurrentemente en un WebP ultra liviano y lo guarda en static/goes19_loop.webp.
    """
    global GOES_CACHE_METADATA
    url_base = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/"
    logger.info("🛰️ [GOES-19 Processor] Descargando e indexando fotogramas de la NOAA...")

    try:
        os.makedirs(STATIC_DIR, exist_ok=True)
        async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url_base)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                archivos = set()
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if href.endswith('.jpg') and not href.startswith('latest') and 'thumbnail' not in href:
                        archivos.add(href)

                archivos_ordenados = sorted(list(archivos))
                # Filtrar fotogramas 900x540 o 450x270 recientes
                frames_urls = [f"{url_base}{f}" for f in archivos_ordenados if ("900x540" in f or "450x270" in f) and f.startswith("202")][-max_frames:]
                if not frames_urls:
                    frames_urls = [f"{url_base}{f}" for f in archivos_ordenados if f.startswith("202")][-max_frames:]

                if frames_urls:
                    logger.info(f"📥 Descargando {len(frames_urls)} fotogramas concurrentemente para animación WebP...")
                    semaphore = asyncio.Semaphore(10)
                    tasks = [_descargar_y_procesar_frame(client, url, semaphore) for url in frames_urls]
                    
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    images = [res for res in results if res is not None and not isinstance(res, Exception)]

                    if images:
                        def guardar_webp(imgs):
                            imgs[0].save(
                                WEBP_OUTPUT_PATH,
                                format="WEBP",
                                save_all=True,
                                append_images=imgs[1:],
                                duration=50,  # 20 fps
                                loop=0,
                                quality=80
                            )
                        
                        logger.info("⏳ Compilando animación WebP en hilos de fondo...")
                        await asyncio.to_thread(guardar_webp, images)

                        # Respaldar en Supabase Storage (100% Gratuito y CDN de alta velocidad)
                        try:
                            from supabase_store import subir_archivo_supabase
                            await asyncio.to_thread(subir_archivo_supabase, WEBP_OUTPUT_PATH, "goes19_loop.webp", "image/webp")
                        except Exception as supa_err:
                            logger.warning(f"Aviso subiendo GOES-19 a Supabase Storage: {supa_err}")

                        # Si GCS está configurado, persistir también en Cloud Storage
                        from app_config import settings
                        if settings.cache_backend == "gcs" and settings.cache_storage_bucket:
                            try:
                                from google.cloud import storage
                                def subir_gcs():
                                    client_gcs = storage.Client()
                                    bucket = client_gcs.bucket(settings.cache_storage_bucket)
                                    blob = bucket.blob("static/goes19_loop.webp")
                                    with open(WEBP_OUTPUT_PATH, "rb") as f:
                                        blob.upload_from_file(f, content_type="image/webp")
                                await asyncio.to_thread(subir_gcs)
                                logger.info(f"☁️ GOES-19 WebP respaldado en GCS: gs://{settings.cache_storage_bucket}/static/goes19_loop.webp")
                            except Exception as gcs_err:
                                logger.warning(f"Aviso subiendo GOES-19 a GCS: {gcs_err}")
                        
                        now_ts = int(time.time())
                        time_label = time.strftime("%H:%M")
                        
                        GOES_CACHE_METADATA = {
                            "status": "ok",
                            "last_updated_ts": now_ts,
                            "updated_at_label": f"Actualizada a las {time_label} hrs",
                            "video_url": "/static/goes19_loop.webp",
                            "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
                            "total_frames": len(images),
                            "fps": 20,
                            "raw_source_url": url_base,
                            "is_live_data": True
                        }
                        logger.info(f"✅ Animación WebP GOES-19 generada exitosamente ({len(images)} fotogramas)")
                        return GOES_CACHE_METADATA

    except Exception as e:
        logger.error(f"⚠️ Error procesando animación GOES-19: {e}")

    # Fallback si falla la generación dinámica
    now_ts = int(time.time())
    time_label = time.strftime("%H:%M")
    GOES_CACHE_METADATA.update({
        "status": "fallback",
        "last_updated_ts": now_ts,
        "updated_at_label": f"Actualizada a las {time_label} hrs",
        "video_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/1800x1080.jpg",
        "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
        "total_frames": 1,
        "fps": 1,
        "raw_source_url": url_base,
        "is_live_data": True
    })
    return GOES_CACHE_METADATA


def obtener_satellite_latest_loop() -> dict:
    """Devuelve la metadata y URL del bucle animado más reciente de GOES-19."""
    if GOES_CACHE_METADATA["status"] == "uninitialized":
        now_ts = int(time.time())
        time_label = time.strftime("%H:%M")
        return {
            "status": "ok",
            "last_updated_ts": now_ts,
            "updated_at_label": f"Actualizada a las {time_label} hrs",
            "video_url": "/static/goes19_loop.webp",
            "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
            "total_frames": 144,
            "fps": 20,
            "raw_source_url": "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/",
            "is_live_data": True
        }
    return GOES_CACHE_METADATA
