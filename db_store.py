"""Motor de persistencia en base de datos relacional PostgreSQL (TimescaleDB) para el histórico de telemetría y calidad del aire.

Garantiza:
1. Almacenamiento histórico continuo.
2. Particionado nativo de series de tiempo gracias a TimescaleDB.
3. Consultas optimizadas para grandes volúmenes.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    psycopg2 = None
    execute_values = None
from typing import Any

logger = logging.getLogger("meteoprecisa.db")


def get_db_connection():
    if psycopg2 is None:
        raise RuntimeError(
            "El controlador 'psycopg2' no está instalado. Configure PostgreSQL o use el backend de caché JSON."
        )
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB", "meteoprecisa"),
        user=os.getenv("POSTGRES_USER", "postgres"),
        password=os.getenv("POSTGRES_PASSWORD", "meteoprecisa2026"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=os.getenv("POSTGRES_PORT", "5432"),
    )


def init_db(db_path: Any = None) -> None:
    """Crea las tablas, las convierte en hypertables de TimescaleDB y crea índices."""
    try:
        conn = get_db_connection()
        conn.autocommit = True
        with conn.cursor() as cur:
            # Habilitar extensión TimescaleDB si no está
            cur.execute("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;")

            cur.execute("""
                CREATE TABLE IF NOT EXISTS telemetria_historico (
                    station_id TEXT NOT NULL,
                    nombre TEXT,
                    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
                    temperatura_c DOUBLE PRECISION,
                    humedad_relativa INTEGER,
                    viento_kmh DOUBLE PRECISION,
                    direccion_viento_grados INTEGER,
                    punto_rocio_c DOUBLE PRECISION,
                    presion_hpa DOUBLE PRECISION,
                    lluvia_mm DOUBLE PRECISION,
                    radiacion_w_m2 DOUBLE PRECISION,
                    fuente TEXT,
                    UNIQUE(station_id, timestamp_utc)
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS calidad_aire_historico (
                    station_id TEXT NOT NULL,
                    nombre TEXT,
                    timestamp_utc TIMESTAMP WITH TIME ZONE NOT NULL,
                    pm25 DOUBLE PRECISION,
                    pm10 DOUBLE PRECISION,
                    comuna TEXT,
                    region TEXT,
                    fuente TEXT,
                    UNIQUE(station_id, timestamp_utc)
                );
            """)

            # Convertir a hypertables si no lo son
            cur.execute("""
                SELECT create_hypertable('telemetria_historico', 'timestamp_utc', if_not_exists => TRUE);
            """)
            cur.execute("""
                SELECT create_hypertable('calidad_aire_historico', 'timestamp_utc', if_not_exists => TRUE);
            """)

            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_tele_st_time ON telemetria_historico(station_id, timestamp_utc DESC);"
            )
            cur.execute(
                "CREATE INDEX IF NOT EXISTS idx_caq_st_time ON calidad_aire_historico(station_id, timestamp_utc DESC);"
            )
        conn.close()
    except Exception as e:
        logger.error(f"Error inicializando TimescaleDB: {e}")


def guardar_instantanea_historica(
    telemetria_map: dict[str, dict[str, Any]],
    sinca_map: dict[str, dict[str, Any]] | None = None,
    purple_map: dict[str, dict[str, Any]] | None = None,
    db_path: Any = None,
) -> int:
    """Inserta los datos de la última foto horaria en la base de datos PostgreSQL."""
    if not telemetria_map and not sinca_map and not purple_map:
        return 0

    init_db()
    insertados_tele = 0
    insertados_caq = 0

    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            # 1. Telemetría de estaciones físicas
            rows_tele = []
            for st_id, data in telemetria_map.items():
                if not isinstance(data, dict):
                    continue

                ts_int = int(data.get("timestamp_actualizacion") or data.get("timestamp") or time.time())
                ts_dt = datetime.fromtimestamp(ts_int, timezone.utc)

                fuente = "Estación Física"
                if "dmc" in st_id.lower():
                    fuente = "DMC Oficial"
                elif "agromet" in st_id.lower():
                    fuente = "Agromet INIA"
                elif "redmeteo" in st_id.lower():
                    fuente = "RedMeteo Chile"

                lluvia = data.get("lluvia_mm") or data.get("lluvia_acumulada_hoy_mm")

                rows_tele.append(
                    (
                        st_id,
                        data.get("nombre"),
                        ts_dt,
                        data.get("temperatura_c"),
                        data.get("humedad_relativa"),
                        data.get("viento_kmh"),
                        data.get("direccion_viento_grados"),
                        data.get("punto_rocio_c"),
                        data.get("presion_hpa"),
                        lluvia,
                        data.get("radiacion_w_m2"),
                        fuente,
                    )
                )

            if rows_tele:
                execute_values(
                    cur,
                    """
                    INSERT INTO telemetria_historico (
                        station_id, nombre, timestamp_utc, temperatura_c,
                        humedad_relativa, viento_kmh, direccion_viento_grados, punto_rocio_c,
                        presion_hpa, lluvia_mm, radiacion_w_m2, fuente
                    ) VALUES %s ON CONFLICT (station_id, timestamp_utc) DO NOTHING;
                """,
                    rows_tele,
                )
                insertados_tele = cur.rowcount

            # 2. Calidad del Aire
            rows_caq = []

            def _procesar_caq(mapa, fuente_nombre):
                if mapa:
                    for s_id, d in mapa.items():
                        if isinstance(d, dict):
                            ts_int = int(d.get("timestamp") or time.time())
                            ts_dt = datetime.fromtimestamp(ts_int, timezone.utc)
                            rows_caq.append(
                                (
                                    s_id,
                                    d.get("estacion_nombre"),
                                    ts_dt,
                                    d.get("pm25"),
                                    d.get("pm10"),
                                    d.get("comuna"),
                                    d.get("region"),
                                    fuente_nombre,
                                )
                            )

            _procesar_caq(sinca_map, "SINCA MMA")
            _procesar_caq(purple_map, "PurpleAir")

            if rows_caq:
                execute_values(
                    cur,
                    """
                    INSERT INTO calidad_aire_historico (
                        station_id, nombre, timestamp_utc, pm25, pm10,
                        comuna, region, fuente
                    ) VALUES %s ON CONFLICT (station_id, timestamp_utc) DO NOTHING;
                """,
                    rows_caq,
                )
                insertados_caq = cur.rowcount

        conn.commit()
        conn.close()
        logger.info(
            f"📊 [TimescaleDB] Guardados {insertados_tele} registros de telemetría y {insertados_caq} de calidad del aire."
        )
        return insertados_tele + insertados_caq
    except Exception as e:
        logger.error(f"⚠️ Error guardando en PostgreSQL: {e}")
        return 0


def obtener_historico_estacion(station_id: str, dias: int = 1, db_path: Any = None) -> list[dict[str, Any]]:
    """Devuelve los registros históricos de una estación, agrupados si es un periodo largo."""
    init_db()
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            if dias <= 7:
                # Datos crudos para periodos cortos
                cur.execute(
                    """
                    SELECT station_id, MAX(nombre) as nombre, EXTRACT(EPOCH FROM timestamp_utc) as timestamp,
                           to_char(timestamp_utc, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as fecha_hora_utc,
                           temperatura_c, humedad_relativa, viento_kmh, direccion_viento_grados,
                           punto_rocio_c, presion_hpa, lluvia_mm, radiacion_w_m2, fuente
                    FROM telemetria_historico
                    WHERE station_id = %s AND timestamp_utc >= NOW() - INTERVAL '%s days'
                    ORDER BY timestamp_utc ASC;
                """,
                    (station_id, dias),
                )
            else:
                # Agrupar por día para periodos largos (TimescaleDB)
                cur.execute(
                    """
                    SELECT station_id, MAX(nombre) as nombre, EXTRACT(EPOCH FROM time_bucket('1 day', timestamp_utc)) as timestamp,
                           to_char(time_bucket('1 day', timestamp_utc), 'YYYY-MM-DD') as fecha_hora_utc,
                           AVG(temperatura_c) as temperatura_c, AVG(humedad_relativa) as humedad_relativa,
                           AVG(viento_kmh) as viento_kmh, AVG(direccion_viento_grados) as direccion_viento_grados,
                           AVG(punto_rocio_c) as punto_rocio_c, AVG(presion_hpa) as presion_hpa,
                           SUM(lluvia_mm) as lluvia_mm, AVG(radiacion_w_m2) as radiacion_w_m2, MAX(fuente) as fuente
                    FROM telemetria_historico
                    WHERE station_id = %s AND timestamp_utc >= NOW() - INTERVAL '%s days'
                    GROUP BY station_id, time_bucket('1 day', timestamp_utc)
                    ORDER BY time_bucket('1 day', timestamp_utc) ASC;
                """,
                    (station_id, dias),
                )

            columns = [desc[0] for desc in cur.description]
            results = [dict(zip(columns, row)) for row in cur.fetchall()]
        conn.close()
        return results
    except Exception as e:
        logger.error(f"Error consultando Postgres: {e}")
        return []


def obtener_estadisticas_db(db_path: Any = None) -> dict[str, Any]:
    """Obtiene conteos y métricas de TimescaleDB."""
    init_db()
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*), MIN(timestamp_utc), MAX(timestamp_utc) FROM telemetria_historico;")
            c_tele = cur.fetchone()
            cur.execute("SELECT COUNT(*) FROM calidad_aire_historico;")
            c_caq = cur.fetchone()

        conn.close()
        return {
            "estado": "activo",
            "motor": "PostgreSQL + TimescaleDB",
            "archivo_db": "meteoprecisa (PG)",
            "tamano_mb": 0.0,  # Se podría usar pg_database_size
            "total_registros_telemetria": c_tele[0] if c_tele else 0,
            "total_registros_calidad_aire": c_caq[0] if c_caq else 0,
            "primer_registro_utc": str(c_tele[1]) if c_tele and c_tele[1] else None,
            "ultimo_registro_utc": str(c_tele[2]) if c_tele and c_tele[2] else None,
        }
    except Exception as e:
        return {"estado": "error", "error": str(e)}
