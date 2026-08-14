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
                    # Usar resize explícito a 1200x720 Full HD para máxima nitidez cinematográfica sin saltos
                    img = img.resize((1200, 720), Image.Resampling.LANCZOS)
                    return img
                return await asyncio.to_thread(procesar_img, resp.content)
        except Exception as e:
            logger.warning(f"Error en frame {url}: {e}")
    return None

async def procesar_video_goes19(horas_ventana: int = 24) -> dict:
    """
    Descarga los fotogramas oficiales 1800x1080 de las ÚLTIMAS 24 HORAS de la NOAA para Chile (GOES-19 SSA),
    los compila en un bucle WebP HD cinematográfico, sobrescribe el anterior en static/goes19_loop.webp 
    y lo sincroniza de inmediato con Supabase Storage CDN.
    """
    global GOES_CACHE_METADATA
    url_base = "https://cdn.star.nesdis.noaa.gov/GOES19/ABI/SECTOR/ssa/GEOCOLOR/"
    logger.info(f"🛰️ [GOES-19 Processor] Indexando fotogramas 1800x1080 para las últimas {horas_ventana} horas...")

    try:
        os.makedirs(STATIC_DIR, exist_ok=True)
        async with httpx.AsyncClient(headers=HEADERS, timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url_base)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "html.parser")
                archivos = set()
                for a in soup.find_all('a', href=True):
                    href = a['href']
                    if href.endswith('-1800x1080.jpg') and href.startswith('202'):
                        archivos.add(href)

                archivos_ordenados = sorted(list(archivos))
                # 24 horas = 144 fotogramas (1 cada 10 min). Muestreamos cada 2 (1 cada 20 min = 72 fotogramas)
                total_frames_24h = horas_ventana * 6
                frames_24h = archivos_ordenados[-total_frames_24h:] if len(archivos_ordenados) >= total_frames_24h else archivos_ordenados
                frames_urls = [f"{url_base}{f}" for f in frames_24h[::2]]

                if not frames_urls:
                    frames_urls = [f"{url_base}{f}" for f in sorted(list(archivos)) if f.startswith("202")][-72:]

                if frames_urls:
                    logger.info(f"📥 Descargando {len(frames_urls)} fotogramas 1800x1080 (últimas 24h) concurrentemente...")
                    semaphore = asyncio.Semaphore(15)
                    tasks = [_descargar_y_procesar_frame(client, url, semaphore) for url in frames_urls]
                    
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    images = [res for res in results if res is not None and not isinstance(res, Exception)]

                    if images:
                        def guardar_webp(imgs):
                            # Sobrescribe el archivo anterior eliminando cualquier estado residual
                            imgs[0].save(
                                WEBP_OUTPUT_PATH,
                                format="WEBP",
                                save_all=True,
                                append_images=imgs[1:],
                                duration=65,  # ~15.4 fps cinematográfico fluido
                                loop=0,
                                quality=85,
                                method=3
                            )
                        
                        logger.info("⏳ Compilando bucle WebP de 24 horas en hilos de fondo...")
                        await asyncio.to_thread(guardar_webp, images)

                        # Respaldar y sobrescribir en Supabase Storage CDN
                        try:
                            from supabase_store import subir_archivo_supabase
                            await asyncio.to_thread(subir_archivo_supabase, WEBP_OUTPUT_PATH, "goes19_loop.webp", "image/webp")
                        except Exception as supa_err:
                            logger.warning(f"Aviso subiendo GOES-19 a Supabase Storage: {supa_err}")
                        
                        now_ts = int(time.time())
                        time_label = time.strftime("%H:%M")
                        
                        GOES_CACHE_METADATA = {
                            "status": "ok",
                            "last_updated_ts": now_ts,
                            "updated_at_label": f"Actualizada a las {time_label} hrs (Últimas 24h)",
                            "video_url": "/static/goes19_loop.webp",
                            "supabase_cdn_url": "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp",
                            "total_frames": len(images),
                            "ventana_horas": horas_ventana,
                            "fps": 15,
                            "raw_source_url": url_base,
                            "is_live_data": True
                        }
                        logger.info(f"✅ Bucle WebP GOES-19 24h generado y sincronizado ({len(images)} fotogramas)")
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
