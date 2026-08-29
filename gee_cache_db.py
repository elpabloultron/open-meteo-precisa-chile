"""Motor de Almacenamiento Persistente SQLite para Datos Satelitales y Google Earth Engine.

Proporciona indexación por cuadrícula espacial GPS (~1 km) y expiración TTL:
- Evita llamadas repetidas a APIs externas y a Google Cloud.
- Permite que las consultas satelitales sobrevivan a reinicios del servidor.
- Garantiza tiempos de respuesta en disco < 1 milisegundo.
"""

from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
from typing import Any

logger = logging.getLogger("gee_cache_db")

_DB_DIR = os.path.join(os.path.dirname(__file__), "data")
_DB_PATH = os.path.join(_DB_DIR, "cache_satelital.db")


def _obtener_conexion() -> sqlite3.Connection:
    os.makedirs(_DB_DIR, exist_ok=True)
    conn = sqlite3.connect(_DB_PATH, timeout=10.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def inicializar_bd_cache() -> None:
    """Crea la tabla e índices si no existen."""
    with _obtener_conexion() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS cache_satelital (
                tipo TEXT NOT NULL,
                grid_lat REAL NOT NULL,
                grid_lon REAL NOT NULL,
                data_json TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                expires_at INTEGER NOT NULL,
                PRIMARY KEY (tipo, grid_lat, grid_lon)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_satelital(expires_at)")
        conn.commit()


def obtener_cache(tipo: str, lat: float, lon: float) -> dict[str, Any] | None:
    """Recupera un resultado satelital desde SQLite si aún no ha expirado."""
    grid_lat = round(lat, 2)
    grid_lon = round(lon, 2)
    now = int(time.time())

    try:
        with _obtener_conexion() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT data_json FROM cache_satelital WHERE tipo = ? AND grid_lat = ? AND grid_lon = ? AND expires_at > ?",
                (tipo, grid_lat, grid_lon, now),
            )
            row = cursor.fetchone()
            if row:
                return json.loads(row[0])
    except Exception as exc:
        logger.warning(f"Error leyendo SQLite caché satelital: {exc}")

    return None


def guardar_cache(tipo: str, lat: float, lon: float, data: dict[str, Any], ttl_segundos: int = 21600) -> None:
    """Almacena un resultado satelital en SQLite con TTL (por defecto 6 horas)."""
    grid_lat = round(lat, 2)
    grid_lon = round(lon, 2)
    now = int(time.time())
    expires = now + ttl_segundos
    data_str = json.dumps(data, ensure_ascii=False)

    try:
        with _obtener_conexion() as conn:
            conn.execute(
                """
                INSERT INTO cache_satelital (tipo, grid_lat, grid_lon, data_json, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(tipo, grid_lat, grid_lon) DO UPDATE SET
                    data_json = excluded.data_json,
                    created_at = excluded.created_at,
                    expires_at = excluded.expires_at
            """,
                (tipo, grid_lat, grid_lon, data_str, now, expires),
            )
            conn.commit()
    except Exception as exc:
        logger.warning(f"Error guardando SQLite caché satelital: {exc}")


def limpiar_expirados() -> int:
    """Elimina registros obsoletos de la base de datos."""
    now = int(time.time())
    try:
        with _obtener_conexion() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM cache_satelital WHERE expires_at <= ?", (now,))
            eliminados = cursor.rowcount
            conn.commit()
            return eliminados
    except Exception as exc:
        logger.warning(f"Error limpiando caché SQLite: {exc}")
        return 0


# Inicializar automáticamente al importar
inicializar_bd_cache()
