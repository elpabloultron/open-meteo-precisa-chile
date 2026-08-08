"""Persistencia de la caché compartida entre el job y las instancias API."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from app_config import settings

logger = logging.getLogger("meteoprecisa.cache")


def _load_local(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    with path.open("r", encoding="utf-8") as file:
        data = json.load(file)
    return data if isinstance(data, dict) else None


def _save_local(path: Path, data: dict[str, Any]) -> None:
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    with tmp_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def load_cache() -> dict[str, Any] | None:
    """Carga la instantánea central; en desarrollo usa el archivo local."""
    if settings.cache_backend == "gcs":
        if not settings.cache_storage_bucket:
            raise RuntimeError("CACHE_STORAGE_BUCKET es obligatorio cuando CACHE_BACKEND=gcs.")
        try:
            from google.cloud import storage

            blob = storage.Client().bucket(settings.cache_storage_bucket).blob(settings.cache_storage_object)
            if not blob.exists():
                logger.info("Aún no existe una caché en gs://%s/%s", settings.cache_storage_bucket, settings.cache_storage_object)
                return None
            data = json.loads(blob.download_as_bytes())
            return data if isinstance(data, dict) else None
        except Exception:
            logger.exception("No fue posible cargar la caché de Cloud Storage")
            # Permite seguir atendiendo si la instancia conserva una instantánea local.
            return _load_local(settings.local_cache_path)

    return _load_local(settings.local_cache_path)


def save_cache(data: dict[str, Any]) -> None:
    """Guarda una instantánea completa. Reemplazar un objeto GCS es atómico."""
    if settings.cache_backend == "gcs":
        if not settings.cache_storage_bucket:
            raise RuntimeError("CACHE_STORAGE_BUCKET es obligatorio cuando CACHE_BACKEND=gcs.")
        from google.cloud import storage

        payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        blob = storage.Client().bucket(settings.cache_storage_bucket).blob(settings.cache_storage_object)
        blob.upload_from_string(payload, content_type="application/json")
        return

    _save_local(settings.local_cache_path, data)
