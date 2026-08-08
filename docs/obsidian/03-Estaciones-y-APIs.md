---
title: 03 - Fuentes de Datos y Estaciones Terrestres
tags:
  - meteoprecisa
  - dmc
  - sinca
  - purpleair
  - redmeteo
last_updated: 2026-08-08
---

# 🌡️ 03 - Fuentes de Datos Terrestres

Consolidación de APIs e ingesta de datos coordinados por el sincronizador en [[01-Arquitectura]].

## 🛰️ Fuentes Oficiales y Ciudadanas

1. **DMC (Dirección Meteorológica de Chile)**:
   - Estaciones agroclimáticas oficiales. Autenticado vía token en `.env`.
2. **RedMeteo**:
   - Red de estaciones meteorológicas ciudadanas a lo largo de Chile.
3. **SINCA (Sistema de Información Nacional de Calidad del Aire)**:
   - Medición de material particulado ($MP_{2.5}$, $MP_{10}$) del Ministerio del Medio Ambiente.
4. **PurpleAir**:
   - Red IoT global de sensores de calidad de aire hiperlocales.

---

> [!NOTE]
> Regresa al [[Index]].
