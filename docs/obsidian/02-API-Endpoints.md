---
title: 02 - Catálogo de Endpoints de la API
tags:
  - meteoprecisa
  - api
  - endpoints
  - fast-api
last_updated: 2026-08-08
---

# 📡 02 - Catálogo de API Endpoints

Documentación de las rutas principales expuestas por FastAPI en [[01-Arquitectura]].

## 📍 Endpoints Principales

### `GET /api/v1/weather/nearby`
- **Descripción**: Obtiene los datos meteorológicos y de calidad de aire de la estación más cercana al punto solicitado.
- **Parámetros Query**:
  - `lat` (float, requerido): Latitud en WGS84.
  - `lon` (float, requerido): Longitud en WGS84.
- **Respuesta**: Datos consolidados de estaciones [[03-Estaciones-y-APIs]] en caché RAM.

### `GET /api/v1/weather/historico`
- **Descripción**: Recupera la serie de tiempo agrícola histórica (NDVI / Humedad) de los últimos 12 meses.
- **Módulo**: Integrado con [[04-Indices-Satelitales-GEE]].

### `GET /api/v1/health`
- **Descripción**: Endpoint de salud del servidor y estado del motor de caché.

---

> [!NOTE]
> Regresa al [[Index]].
