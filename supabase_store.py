"""Módulo de persistencia y almacenamiento en la nube para Supabase (Storage y Base de Datos).

Reemplaza completamente a Google Cloud Storage / Firebase Storage sin costos ni requerimientos de tarjeta de crédito.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger("meteoprecisa.supabase")

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent
load_dotenv(PROJECT_ROOT / ".env")

DEFAULT_SUPABASE_URL = "https://qrqhonyympzsmaucbfel.supabase.co"
DEFAULT_BUCKET = "meteoprecisa"


def get_supabase_config() -> tuple[str, str, str]:
    url = (os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL).rstrip("/")
    key = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or ""
    bucket = os.getenv("SUPABASE_BUCKET") or DEFAULT_BUCKET
    return url, key, bucket


def subir_archivo_supabase(
    file_path: Path | str,
    destination_name: str,
    content_type: str = "image/webp"
) -> str | None:
    """Sube un archivo local (ej: goes19_loop.webp) al bucket público de Supabase y devuelve su URL CDN."""
    path = Path(file_path)
    if not path.exists():
        logger.warning(f"⚠️ Archivo no encontrado para subir a Supabase: {path}")
        return None

    url, key, bucket = get_supabase_config()
    upload_url = f"{url}/storage/v1/object/{bucket}/{destination_name}"

    try:
        with open(path, "rb") as f:
            file_bytes = f.read()

        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": content_type,
            "x-upsert": "true"
        }

        with httpx.Client(timeout=45.0) as client:
            resp = client.post(upload_url, headers=headers, content=file_bytes)
            if resp.status_code in (200, 201):
                public_url = f"{url}/storage/v1/object/public/{bucket}/{destination_name}"
                logger.info(f"✅ Archivo subido a Supabase Storage: {public_url}")
                return public_url
            else:
                logger.error(f"⚠️ Error subiendo archivo a Supabase ({resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.error(f"⚠️ Excepción subiendo archivo a Supabase: {e}")
        return None


def subir_cache_json_supabase(cache_data: dict[str, Any], destination_name: str = "cache_servidor.json") -> str | None:
    """Sube la instantánea unificada en formato JSON al bucket de Supabase."""
    url, key, bucket = get_supabase_config()
    upload_url = f"{url}/storage/v1/object/{bucket}/{destination_name}"

    try:
        json_bytes = json.dumps(cache_data, ensure_ascii=False, indent=2).encode("utf-8")
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "x-upsert": "true"
        }

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(upload_url, headers=headers, content=json_bytes)
            if resp.status_code in (200, 201):
                public_url = f"{url}/storage/v1/object/public/{bucket}/{destination_name}"
                logger.info(f"✅ Cache JSON sincronizada en Supabase Storage: {public_url}")
                return public_url
            else:
                logger.error(f"⚠️ Error subiendo cache a Supabase ({resp.status_code}): {resp.text}")
                return None
    except Exception as e:
        logger.error(f"⚠️ Excepción subiendo cache a Supabase: {e}")
        return None


def obtener_url_publica_supabase(destination_name: str) -> str:
    """Genera la URL pública CDN directa para un archivo en Supabase Storage."""
    url, _, bucket = get_supabase_config()
    return f"{url}/storage/v1/object/public/{bucket}/{destination_name}"
