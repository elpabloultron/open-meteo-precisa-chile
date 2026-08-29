# Ecosistema Técnico, Skills, Servidores MCP y Repositorios de Referencia

Este documento formaliza los estándares de integración para agentes de IA, servidores MCP (Model Context Protocol) y librerías abiertas utilizadas en MeteoPrecisa Chile.

---

## 1. Servidores MCP Configurados (`mcp.json`)

| Servidor MCP | Paquete / Comando | Propósito en MeteoPrecisa |
| :--- | :--- | :--- |
| **`timescaledb`** | `@modelcontextprotocol/server-postgres` | Inspección de hypertables, particiones por tiempo y optimización de consultas agregadas con `time_bucket('1 day')`. |
| **`chrome-devtools`** | `@modelcontextprotocol/server-puppeteer` | Auditoría de Core Web Vitals, pruebas de accesibilidad (a11y) y ciclo de vida del Service Worker (`sw.js`). |
| **`filesystem`** | `@modelcontextprotocol/server-filesystem` | Acceso y validación de archivos estáticos, caché local SQLite y configuración. |
| **`git`** | `@modelcontextprotocol/server-git` | Control de versiones, trazabilidad de commits y protección de ramas. |

---

## 2. Skills Activas del Proyecto (`.agents/skills/`)

* **`telemetry-integrity` (`telemetry_validator.py`):**
  * Validación física y termodinámica según el estándar OMM WMO-No. 8.
  * Límites: Temperatura ($-50^\circ\text{C}$ a $+60^\circ\text{C}$), Humedad ($0\%$ a $100\%$), Consistencia del punto de rocío ($T_d \le T_{\text{actual}}$), Presión ($800$ a $1085\text{ hPa}$) y Radiación ($\le 1400\text{ W/m}^2$).
* **`tdd-verification`:**
  * Protocolo Red-Green-Refactor obligatorio antes de desplegar cambios en endpoints o motores de cálculo.
* **`ponytail` & `ponytail-review`:**
  * Filosofía de mínima intervención, cero dependencias innecesarias (YAGNI), frontend Vanilla JS/CSS sin frameworks y máximo rendimiento (<50ms).
* **`frontend-design`, `color-expert` y `emilkowalski-motion`:**
  * Diseño Dark Mode First (`#080c14`), tipografías técnicas (`Outfit` y `Space Grotesk`) y animaciones en badges de telemetría en vivo (`live-pulse`).
* **`systematic-debugging` y `diagnosing-bugs`:**
  * Resolución de causa raíz en conectores de APIs externas y normalización de sentinelas.

---

## 3. Repositorios Abiertos de Referencia

1. **[`open-meteo/open-meteo`](https://github.com/open-meteo/open-meteo):**
   * Referencia principal para modelos meteorológicos de alta resolución (ECMWF, GFS, ICON) y serialización binaria/JSON de alto rendimiento.
2. **[`ecmwf/earthkit`](https://github.com/ecmwf/earthkit):**
   * Herramientas de análisis geoespacial y reanálisis ERA5-Land promovidas por el Centro Europeo de Previsiones Meteorológicas a Plazo Medio.
3. **[`openradar/wradlib`](https://github.com/openradar/wradlib):**
   * Biblioteca para procesamiento de reflectividad y datos de radar meteorológico Doppler.
4. **[`google/earthengine-api`](https://github.com/google/earthengine-api):**
   * SDK oficial para reducción zonal, cálculo de índices espectrales (NDVI, NDWI, NDSI) y teledetección multiespectral.
