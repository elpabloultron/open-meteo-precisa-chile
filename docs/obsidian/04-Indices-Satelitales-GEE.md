---
title: 04 - Índices Satelitales y Algoritmos GEE
tags:
  - meteoprecisa
  - gee
  - ndvi
  - lst
  - evapotranspiracion
last_updated: 2026-08-08
---

# 🛰️ 04 - Índices Satelitales (Google Earth Engine)

Detalle de cálculos ejecutados en `gee/rural.py` y `gee/urban.py` integrados con [[01-Arquitectura]].

## 📊 Algoritmos

- **NDVI (Sentinel-2 / MODIS)**:
  $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$$
- **LST (Land Surface Temperature)**:
  Cálculo de temperatura superficial de la tierra y detección de islas de calor urbano mediante emissividad térmica MOD11A1.
- **Evapotranspiración ($ET_0$)**:
  Cálculo FAO-56 Penman-Monteith derivado de ERA5-Land para programación de riego.

---

> [!NOTE]
> Regresa al [[Index]].
