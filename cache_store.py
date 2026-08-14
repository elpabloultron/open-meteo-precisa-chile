"""Persistencia atómica de la caché del servidor."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

from app_config import settings

logger = logging.getLogger("meteoprecisa.cache")


def load_cache() -> dict[str, Any] | None:
    """Carga la instantánea central desde disco local."""
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
    """Guarda la instantánea de forma atómica usando reemplazo de archivo temporal."""
    path = settings.local_cache_path
    tmp_path = path.with_suffix(path.suffix + ".tmp")
    try:
        with tmp_path.open("w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)
    except Exception:
        logger.exception("Error guardando caché local")
