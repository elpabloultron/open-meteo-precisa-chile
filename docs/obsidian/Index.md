---
title: MeteoPrecisa - Bóveda de Conocimiento Obsidian
tags:
  - meteoprecisa
  - index
  - wiki
last_updated: 2026-08-08
---

# 🌩️ Bóveda de Conocimiento MeteoPrecisa

Bienvenido a la documentación interactiva de **MeteoPrecisa** formateada para **Obsidian**.

## 🗺️ Mapa de la Bóveda

```mermaid
graph TD
    Index[[Index]] --> Arch[[01-Arquitectura]]
    Index --> APIs[[02-API-Endpoints]]
    Index --> Fuentes[[03-Estaciones-y-APIs]]
    Index --> GEE[[04-Indices-Satelitales-GEE]]
    
    Arch --> Fuentes
    Arch --> GEE
    APIs --> Arch
```

---

## 📌 Módulos Principales

- [[01-Arquitectura]]: Visión general de componentes de backend (FastAPI), sincronizador en segundo plano y motor de caché RAM.
- [[02-API-Endpoints]]: Catálogo de endpoints de la API en producción.
- [[03-Estaciones-y-APIs]]: Fuentes de datos de entrada (DMC, RedMeteo, SINCA, PurpleAir).
- [[04-Indices-Satelitales-GEE]]: Motor de análisis satelital asíncrono con Google Earth Engine (NDVI, NDWI, LST, ET0).

---

> [!TIP]
> **Navegación Visual**: Presiona `Ctrl + G` en Obsidian para abrir la **Vista de Grafo** interactiva y ver cómo se interconectan estos módulos en tiempo real.
