from __future__ import annotations

import asyncio
import logging

from sincronizador_background import (
    cargar_cache_desde_disco,
    ejecutar_sincronizacion_completa,
)


async def run() -> None:
    logging.basicConfig(level=logging.INFO)
    cargar_cache_desde_disco()
    await ejecutar_sincronizacion_completa()


if __name__ == "__main__":
    asyncio.run(run())
