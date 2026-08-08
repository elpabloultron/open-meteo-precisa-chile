---
name: agronomia-satelital
description: Guía experta en cálculo de índices agrometeorológicos y procesamiento satelital GEE para MeteoPrecisa.
---

# Skill: Inteligencia Agrometeorológica y Satelital (GEE)

Esta guía define las fórmulas, umbrales agronómicos y mejores prácticas para el análisis de datos climáticos y satelitales en **MeteoPrecisa**.

## 1. Índices Satelitales (Google Earth Engine)

### A. NDVI (Normalized Difference Vegetation Index) - Salud Vegetal
- **Fórmula**: `(NIR - Red) / (NIR + Red)`
- **Bandas (Sentinel-2)**: `(B8 - B4) / (B8 + B4)`
- **Bandas (MODIS / Landsat 8/9)**: MODIS: `(sur_refl_b02 - sur_refl_b01) / (...)` | L8: `(SR_B5 - SR_B4) / (...)`
- **Interpretación Agronómica**:
  - `< 0.1`: Suelo desnudo, agua o nieve.
  - `0.2 - 0.4`: Vegetación escasa o cultivos en fase inicial.
  - `0.4 - 0.7`: Cultivos sanos en fase vegetativa.
  - `0.7 - 0.9`: Follaje denso y máxima actividad fotosintética.

### B. NDWI (Normalized Difference Water Index) - Estrés Hídrico
- **Fórmula**: `(NIR - SWIR) / (NIR + SWIR)`
- **Bandas (Sentinel-2)**: `(B8 - B11) / (B8 + B11)`
- **Uso**: Medición directa de contenido de agua en la canopia foliar para programación de riego.

### C. SAVI (Soil Adjusted Vegetation Index)
- **Fórmula**: `((NIR - Red) / (NIR + Red + L)) * (1 + L)`  (donde `L = 0.5`)
- **Uso**: Recomendado para etapas tempranas de cultivo donde el suelo desnudo distorsiona el NDVI.

---

## 2. Alertas de Heladas y Métricas Térmicas

### A. Detección de Heladas
- **Helada Ligera**: $0^\circ\text{C}$ a $-2^\circ\text{C}$
- **Helada Moderada**: $-2^\circ\text{C}$ a $-4^\circ\text{C}$
- **Helada Severa**: $< -4^\circ\text{C}$ (Riesgo crítico para yemas y frutos en desarrollo).

### B. Grados Día Desarrollo (GDD / Heat Units)
- **Fórmula Básica**: $GDD = \frac{T_{max} + T_{min}}{2} - T_{base}$
- **Temperatura Base ($T_{base}$)**:
  - Vides / Frutales de carozo: $10^\circ\text{C}$
  - Cerales de invierno (Trigo/Cebada): $0^\circ\text{C} - 5^\circ\text{C}$
  - Maíz / Hortalizas de verano: $10^\circ\text{C}$

---

## 3. Evapotranspiración y Requerimiento Hídrico (ET0)

- **Referencia**: Modelo FAO-56 Penman-Monteith (usando ERA5-Land en GEE).
- **Cálculo de Requerimiento de Riego ($ET_c$)**:
  $$ET_c = ET_0 \times K_c$$
  - $K_c$ (Coeficiente de cultivo): varía según fenología (Inicial: 0.4, Medio: 1.0 - 1.15, Final: 0.5 - 0.7).

---

## 4. Temperatura de Superficie Terrestre (LST) e Islas de Calor

- **Fuente**: MODIS (MOD11A1) / Landsat 8-9 TIRS.
- **Uso Urbano**: Detección de anomalías térmicas e islas de calor en zonas urbanas.
- **Uso Agrícola**: Alerta temprana de estrés térmico foliar cuando la temperatura foliar supera los $35^\circ\text{C}$.
