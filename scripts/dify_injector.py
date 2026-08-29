"""Script base para sincronizar PostgreSQL con Dify (Agente RAG)."""

import logging
import os

import psycopg2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("dify_injector")


def inyectar_metadata_dify():
    logger.info("Iniciando sincronización con base vectorial de Dify...")
    try:
        conn = psycopg2.connect(
            dbname=os.getenv("POSTGRES_DB", "meteoprecisa"),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "meteoprecisa2026"),
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5432"),
        )
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM telemetria_historico;")
            count = cur.fetchone()[0]
            logger.info(f"Se encontraron {count} registros listos para el Agente RAG.")
            # Aquí iría la lógica HTTP POST a la API de Dify (Dataset API)
        conn.close()
    except Exception as e:
        logger.error(f"Error conectando a DB: {e}")


if __name__ == "__main__":
    inyectar_metadata_dify()
