"""Punto de entrada para el Cloud Run Job que actualiza la caché cada hora."""

from __future__ import annotations

import asyncio
import logging

from gee import GEECore
from sincronizador_background import cargar_cache_desde_disco, ejecutar_sincronizacion_completa


async def run() -> None:
    logging.basicConfig(level=logging.INFO)
    cargar_cache_desde_disco()
    await asyncio.to_thread(GEECore.initialize)
    await ejecutar_sincronizacion_completa()


if __name__ == "__main__":
    asyncio.run(run())
