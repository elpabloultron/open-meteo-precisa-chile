---
title: 01 - Arquitectura de MeteoPrecisa
tags:
  - meteoprecisa
  - arquitectura
  - backend
  - fast-api
last_updated: 2026-08-08
---

# 🏗️ 01 - Arquitectura del Sistema

MeteoPrecisa opera bajo una arquitectura desacoplada y orientada a eventos para garantizar tiempos de respuesta menores a 50ms.

## 🧱 Componentes

### 1. Backend API (FastAPI)
- **Archivo**: `main.py`
- Expone servicios RESTful para el cliente PWA.
- Implementa búsquedas espaciales usando `geopy` y `KDTree` (`scipy.spatial`) para relacionar las coordenadas del usuario con las estaciones terrestres más cercanas.
- Se conecta con [[02-API-Endpoints]].

### 2. Worker en Segundo Plano (Data Ingestion)
- **Archivo**: `sincronizador_background.py`
- Tarea perpetua `asyncio` que realiza polling a [[03-Estaciones-y-APIs]] cada 15 y 60 minutos.
- Inyecta datos estructurados en la memoria local `cache_servidor.json` evadiendo la sobrecarga de consultas directas a los servidores climáticos oficiales.

### 3. Motor Satelital GEE
- **Carpeta**: `gee/` (`rural.py`, `urban.py`)
- Ejecuta consultas asíncronas a [[04-Indices-Satelitales-GEE]] utilizando Google Earth Engine para extraer NDVI, LST y parámetros agroclimáticos.

---

> [!NOTE]
> Regresa al [[Index]] para ver la mapa completo de documentación.
