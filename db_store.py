"""Motor de persistencia en base de datos relacional SQLite para el histórico de telemetría y calidad del aire.

Garantiza:
1. Almacenamiento histórico continuo sin sobrecargar la memoria RAM ni cache_servidor.json.
2. Modo WAL (Write-Ahead Logging) para consultas concurrentes ultrarrápidas sin bloqueos.
3. Consultas optimizadas por índices para gráficos y análisis de tendencias.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger("meteoprecisa.db")

PROJECT_ROOT = Path(__file__).resolve().parent
DB_PATH = PROJECT_ROOT / "historico_telemetria.db"


def get_db_connection(db_path: Path | str | None = None) -> sqlite3.Connection:
    path = db_path or DB_PATH
    conn = sqlite3.connect(str(path), timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    return conn


def init_db(db_path: Path | str | None = None) -> None:
    """Crea las tablas e índices si no existen."""
    conn = get_db_connection(db_path)
    try:
        with conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS telemetria_historico (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    station_id TEXT NOT NULL,
                    nombre TEXT,
                    timestamp INTEGER NOT NULL,
                    fecha_hora_utc TEXT NOT NULL,
                    temperatura_c REAL,
                    humedad_relativa INTEGER,
                    viento_kmh REAL,
                    direccion_viento_grados INTEGER,
                    punto_rocio_c REAL,
                    presion_hpa REAL,
                    lluvia_mm REAL,
                    radiacion_w_m2 REAL,
                    fuente TEXT,
                    UNIQUE(station_id, timestamp)
                );
            """)

            conn.execute("""
                CREATE TABLE IF NOT EXISTS calidad_aire_historico (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    station_id TEXT NOT NULL,
                    nombre TEXT,
                    timestamp INTEGER NOT NULL,
                    fecha_hora_utc TEXT NOT NULL,
                    pm25 REAL,
                    pm10 REAL,
                    comuna TEXT,
                    region TEXT,
                    fuente TEXT,
                    UNIQUE(station_id, timestamp)
                );
            """)

            conn.execute("CREATE INDEX IF NOT EXISTS idx_tele_st_time ON telemetria_historico(station_id, timestamp);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_tele_time ON telemetria_historico(timestamp);")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_caq_st_time ON calidad_aire_historico(station_id, timestamp);")
    finally:
        conn.close()


def guardar_instantanea_historica(
    telemetria_map: dict[str, dict[str, Any]],
    sinca_map: dict[str, dict[str, Any]] | None = None,
    purple_map: dict[str, dict[str, Any]] | None = None,
    db_path: Path | str | None = None
) -> int:
    """Inserta los datos de la última foto horaria en la base de datos histórica."""
    if not telemetria_map and not sinca_map and not purple_map:
        return 0

    init_db(db_path)
    conn = get_db_connection(db_path)
    now_ts = int(time.time())
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ")
    insertados_tele = 0
    insertados_caq = 0

    try:
        with conn:
            # 1. Telemetría de estaciones meteorológicas físicas (DMC, Agromet INIA, RedMeteo)
            rows_tele = []
            for st_id, data in telemetria_map.items():
                if not isinstance(data, dict):
                    continue
                ts = int(data.get("timestamp_actualizacion") or data.get("timestamp") or now_ts)
                
                # Identificar la red/fuente
                if "dmc" in st_id.lower():
                    fuente = "DMC Oficial"
                elif "agromet" in st_id.lower():
                    fuente = "Agromet INIA"
                elif "redmeteo" in st_id.lower():
                    fuente = "RedMeteo Chile"
                else:
                    fuente = "Estación Física"

                lluvia = data.get("lluvia_mm") or data.get("lluvia_acumulada_hoy_mm")

                rows_tele.append((
                    st_id,
                    data.get("nombre"),
                    ts,
                    now_iso,
                    data.get("temperatura_c"),
                    data.get("humedad_relativa"),
                    data.get("viento_kmh"),
                    data.get("direccion_viento_grados"),
                    data.get("punto_rocio_c"),
                    data.get("presion_hpa"),
                    lluvia,
                    data.get("radiacion_w_m2"),
                    fuente
                ))

            if rows_tele:
                cursor = conn.executemany("""
                    INSERT OR IGNORE INTO telemetria_historico (
                        station_id, nombre, timestamp, fecha_hora_utc, temperatura_c,
                        humedad_relativa, viento_kmh, direccion_viento_grados, punto_rocio_c,
                        presion_hpa, lluvia_mm, radiacion_w_m2, fuente
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, rows_tele)
                insertados_tele = cursor.rowcount

            # 2. Calidad del Aire (SINCA MMA y PurpleAir)
            rows_caq = []
            if sinca_map:
                for st_id, data in sinca_map.items():
                    if isinstance(data, dict):
                        ts = int(data.get("timestamp") or now_ts)
                        rows_caq.append((
                            st_id,
                            data.get("estacion_nombre"),
                            ts,
                            now_iso,
                            data.get("pm25"),
                            data.get("pm10"),
                            data.get("comuna"),
                            data.get("region"),
                            "SINCA MMA"
                        ))
            
            if purple_map:
                for st_id, data in purple_map.items():
                    if isinstance(data, dict):
                        ts = int(data.get("timestamp") or now_ts)
                        rows_caq.append((
                            st_id,
                            data.get("estacion_nombre"),
                            ts,
                            now_iso,
                            data.get("pm25"),
                            data.get("pm10"),
                            data.get("comuna"),
                            data.get("region"),
                            "PurpleAir"
                        ))

            if rows_caq:
                cursor_caq = conn.executemany("""
                    INSERT OR IGNORE INTO calidad_aire_historico (
                        station_id, nombre, timestamp, fecha_hora_utc, pm25, pm10,
                        comuna, region, fuente
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
                """, rows_caq)
                insertados_caq = cursor_caq.rowcount

        logger.info(f"📊 [DB Histórica] Guardados {insertados_tele} registros de telemetría y {insertados_caq} de calidad del aire.")
        return insertados_tele + insertados_caq
    except Exception as e:
        logger.error(f"⚠️ Error guardando instantánea en base de datos SQLite: {e}")
        return 0
    finally:
        conn.close()


def obtener_historico_estacion(
    station_id: str,
    horas: int = 24,
    db_path: Path | str | None = None
) -> list[dict[str, Any]]:
    """Devuelve los registros históricos de una estación en las últimas N horas."""
    init_db(db_path)
    conn = get_db_connection(db_path)
    limite_ts = int(time.time()) - (horas * 3600)
    try:
        cursor = conn.execute("""
            SELECT station_id, nombre, timestamp, fecha_hora_utc, temperatura_c,
                   humedad_relativa, viento_kmh, direccion_viento_grados, punto_rocio_c,
                   presion_hpa, lluvia_mm, radiacion_w_m2, fuente
            FROM telemetria_historico
            WHERE station_id = ? AND timestamp >= ?
            ORDER BY timestamp ASC;
        """, (station_id, limite_ts))
        return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def obtener_estadisticas_db(db_path: Path | str | None = None) -> dict[str, Any]:
    """Obtiene el conteo total de registros, tamaño del archivo y rango de fechas."""
    init_db(db_path)
    path = db_path or DB_PATH
    conn = get_db_connection(path)
    try:
        c_tele = conn.execute("SELECT COUNT(*), MIN(timestamp), MAX(timestamp) FROM telemetria_historico;").fetchone()
        c_caq = conn.execute("SELECT COUNT(*) FROM calidad_aire_historico;").fetchone()
        
        tamano_mb = round(os.path.getsize(path) / (1024 * 1024), 2) if os.path.exists(path) else 0.0

        min_ts = c_tele[1] if c_tele and c_tele[1] else None
        max_ts = c_tele[2] if c_tele and c_tele[2] else None

        return {
            "estado": "activo",
            "motor": "SQLite (WAL Mode)",
            "archivo_db": str(os.path.basename(str(path))),
            "tamano_mb": tamano_mb,
            "total_registros_telemetria": c_tele[0] if c_tele else 0,
            "total_registros_calidad_aire": c_caq[0] if c_caq else 0,
            "primer_registro_utc": datetime.fromtimestamp(min_ts, timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ") if min_ts else None,
            "ultimo_registro_utc": datetime.fromtimestamp(max_ts, timezone.utc).strftime("%Y-%m-%d %H:%M:%SZ") if max_ts else None
        }
    finally:
        conn.close()
