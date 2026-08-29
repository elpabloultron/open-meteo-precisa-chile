"""Persistencia atómica y unificada de la caché del servidor (Local + Google Cloud Storage)."""

from __future__ import annotations

import json
import logging
import os
import urllib.parse
from typing import Any

import httpx

from app_config import settings

logger = logging.getLogger("meteoprecisa.cache")


def load_cache() -> dict[str, Any] | None:
    """Carga la instantánea central desde Google Cloud Storage o disco local."""
    if settings.cache_backend == "gcs" and settings.cache_storage_bucket:
        try:
            encoded_obj = urllib.parse.quote(settings.cache_storage_object, safe="")
            url = f"https://storage.googleapis.com/download/storage/v1/b/{settings.cache_storage_bucket}/o/{encoded_obj}?alt=media"
            with httpx.Client(timeout=10.0) as client:
                resp = client.get(url)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict):
                        return data
        except Exception as e:
            logger.warning(f"Aviso leyendo de GCS ({e}), usando fallback local...")

    path = settings.local_cache_path
    if not path.exists():
        return None
    try:
        with path.open("r", encoding="utf-8") as file:
            data = json.load(file)
        return data if isinstance(data, dict) else None
    except Exception:
        logger.exception("Error leyendo caché local")
        return None


def save_cache(data: dict[str, Any]) -> None:
    """Guarda la instantánea de forma atómica en local y en Google Cloud Storage si está configurado."""
    path = settings.local_cache_path
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    try:
        with tmp_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
            file.flush()
            os.fsync(file.fileno())
        os.replace(tmp_path, path)
    except Exception:
        logger.exception("Error guardando caché local")

    if settings.cache_backend == "gcs" and settings.cache_storage_bucket:
        try:
            encoded_obj = urllib.parse.quote(settings.cache_storage_object, safe="")
            upload_url = f"https://storage.googleapis.com/upload/storage/v1/b/{settings.cache_storage_bucket}/o?uploadType=media&name={encoded_obj}"
            raw_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
            with httpx.Client(timeout=20.0) as client:
                client.post(upload_url, headers={"Content-Type": "application/json"}, content=raw_bytes)
        except Exception as e:
            logger.warning(f"Aviso subiendo caché a GCS: {e}")
