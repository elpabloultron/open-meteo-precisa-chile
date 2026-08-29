"""Configuración centralizada de MeteoPrecisa.

Los valores sensibles nunca tienen valores por defecto en el código. En local se
pueden definir en ``.env`` y en Cloud Run se inyectan desde Secret Manager.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent

# Es intencional cargar .env sólo para desarrollo local. Cloud Run provee las
# mismas variables directamente en el entorno.
load_dotenv(PROJECT_ROOT / ".env")


def _as_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _as_origins(value: str | None) -> tuple[str, ...]:
    default = (
        "https://meteoprecisachile.web.app",
        "https://meteoprecisachile.firebaseapp.com",
        "http://localhost:5173",
    )
    if not value:
        return default
    return tuple(origin.strip().rstrip("/") for origin in value.split(",") if origin.strip())


@dataclass(frozen=True)
class Settings:
    app_env: str
    allowed_origins: tuple[str, ...]
    admin_sync_token: str | None
    dmc_username: str | None
    dmc_token: str | None
    cache_backend: str
    cache_storage_bucket: str | None
    cache_storage_object: str
    cache_refresh_seconds: int
    enable_in_process_sync: bool
    local_cache_path: Path


def get_settings() -> Settings:
    bucket = os.getenv("CACHE_STORAGE_BUCKET")
    cache_backend = os.getenv("CACHE_BACKEND") or ("gcs" if bucket else "local")
    if cache_backend not in {"local", "gcs"}:
        raise ValueError("CACHE_BACKEND debe ser 'local' o 'gcs'.")

    return Settings(
        app_env=os.getenv("APP_ENV", "development"),
        allowed_origins=_as_origins(os.getenv("ALLOWED_ORIGINS")),
        admin_sync_token=os.getenv("ADMIN_SYNC_TOKEN") or None,
        dmc_username=os.getenv("USUARIO_DMC") or None,
        dmc_token=os.getenv("TOKEN_DMC") or None,
        cache_backend=cache_backend,
        cache_storage_bucket=bucket,
        cache_storage_object=os.getenv("CACHE_STORAGE_OBJECT", "cache/cache_servidor.json"),
        cache_refresh_seconds=max(5, int(os.getenv("CACHE_REFRESH_SECONDS", "60"))),
        enable_in_process_sync=_as_bool(os.getenv("ENABLE_IN_PROCESS_SYNC")),
        local_cache_path=PROJECT_ROOT / "cache_servidor.json",
    )


settings = get_settings()
