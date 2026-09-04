# 🏛️ Arquitectura de MeteoPrecisa Chile

## 1. Visión General y Principio Rector

MeteoPrecisa opera bajo el **Principio de Desacoplamiento Estricto entre Ingesta y Consumo**:
- **La ingesta y enriquecimiento de datos** se ejecuta de manera 100% asíncrona mediante workers en segundo plano ([`sincronizador_background.py`](sincronizador_background.py)).
- **El almacenamiento** consolida y acumula los datos en nuestra propia infraestructura ([`db_store.py`](db_store.py) con TimescaleDB y persistencia atómica en disco).
- **El servicio a la aplicación web / PWA** ([`main.py`](main.py)) consulta **exclusivamente** nuestro almacenamiento interno en memoria y base de datos, entregando respuestas en **< 15 ms** sin jamás realizar peticiones salientes a proveedores externos durante el ciclo de vida de un request de usuario.

### Razones Fundamentales del Diseño:
1. **Protección Operativa (Anti-Rate-Limiting / Anti-Baneo):** Consultar APIs o servicios externos bajo demanda cuando los usuarios navegan expondría nuestras IPs a bloqueos por exceso de peticiones.
2. **Propiedad y Soberanía del Activo de Datos:** La data hidrométrica y meteorológica histórica tiene un valor crítico. Guardarla en TimescaleDB nos permite acumular series de tiempo propias para análisis de tendencias, riesgos de sequía y modelos predictivos.
3. **Resiliencia e Inmunidad a Caídas Externas:** Si un servidor gubernamental o proveedor externo (DGA, DMC, SENAPRED) sufre una caída de servicio, MeteoPrecisa continúa operando sin interrupción sirviendo el último estado consistente almacenado.

---

## 2. Diagrama de Flujo del Sistema

```mermaid
flowchart TD
    subgraph FUENTES_EXTERNAS [Fuentes de Datos Oficiales y Ciudadanas]
        DGA_API[DGA MOP: ArcGIS Alertas & Embalses + Caudales Satelitales]
        DMC_API[DMC Chile: Red EMA Oficial + Pronósticos Sinópticos]
        INIA_API[Agromet INIA / RAN: Red Agroclimática]
        RM_API[RedMeteo.cl: Red Meteorológica Ciudadana]
        SINCA_API[SINCA MMA: Red Calidad del Aire MP2.5/MP10]
        GOES_SRC[NOAA GOES-19: Infrarrojo Limpio Canal 13]
        GEE_SRC[Google Earth Engine: Sentinel-2 / ERA5-Land]
        RADAR_SRC[RainViewer: Radar Doppler en Vivo]
    end

    subgraph WORKER_INGESTA [Pipeline Asíncrono de Fondo - sincronizador_background.py]
        SYNC_LOOP[Loop Periódico Horario / 15 Minutos]
        DGA_PROC[dga_scraper.py & dga_telemetria.py<br/>Indexación 3.517 estaciones + Lotes con Semáforo]
        VAL_WMO[telemetry_validator.py<br/>Reglas Físicas WMO-No. 8 + Limpieza Centinelas]
        GOES_PROC[goes_processor.py<br/>Compilación WebP HD de 6 horas]
        SYNC_LOOP --> DGA_PROC
        SYNC_LOOP --> VAL_WMO
        SYNC_LOOP --> GOES_PROC
    end

    DGA_API --> DGA_PROC
    DMC_API --> SYNC_LOOP
    INIA_API --> SYNC_LOOP
    RM_API --> SYNC_LOOP
    SINCA_API --> SYNC_LOOP
    GOES_SRC --> GOES_PROC

    subgraph ALMACENAMIENTO_LOCAL [Capa de Datos Persistente y Memoria]
        T_DB[(TimescaleDB / PostgreSQL + PostGIS<br/>Series Temporales db_store.py)]
        RAM_CACHE[Caché RAM Global CACHE_MEMORIA]
        JSON_DISK[Snapshot Atómico cache_servidor.json]
        SQLITE_WAL[(SQLite WAL gee_cache_db.py)]
        VAL_WMO --> T_DB
        VAL_WMO --> RAM_CACHE
        VAL_WMO --> JSON_DISK
        GEE_SRC --> SQLITE_WAL
    end

    subgraph MOTOR_SERVIMIENTO [FastAPI Engine - main.py]
        KDTREE[Árbol Espacial KDTree O(log N)<br/>scipy.spatial.cKDTree]
        IDW_CALC[Triangulación Ponderada IDW + Gradiente Térmico]
        ALERT_ENG[alertas_engine.py<br/>Heladas, Deriva Fitosanitaria, Inversión Térmica]
        ENDPOINTS[Endpoints REST /api/v1/...<br/>Respuesta en < 15ms]
        RAM_CACHE --> KDTREE
        RAM_CACHE --> IDW_CALC
        RAM_CACHE --> ALERT_ENG
        T_DB --> ENDPOINTS
        KDTREE --> ENDPOINTS
        IDW_CALC --> ENDPOINTS
        ALERT_ENG --> ENDPOINTS
    end

    subgraph CLIENTE [Frontend Web & Móvil]
        PWA[PWA Vanilla JS + Service Worker Offline sw.js]
        MAPA[Mapa Interactivo Leaflet con 4.312 Marcadores]
        DASH[Dashboard Hiperlocal + Modal de Sensores Físicos]
        ENDPOINTS --> PWA
        PWA --> MAPA
        PWA --> DASH
    end
```

---

## 3. Desglose de Módulos y Responsabilidades

### 3.1. Ingesta y Validación (`sincronizador_background.py` & `dga_telemetria.py`)
- **Catálogo Maestro:** Consolida **4.312 estaciones físicas** (DGA: 3.517, Agromet: 422, RedMeteo: 137, SINCA: 101, DMC: 135).
- **DGA Hidrométrica:**
  - `extraer_telemetria_dga_en_vivo`: Consulta `DGA/ALERTAS/MapServer/0` (caudales instantáneos y alertas de crecida) y `DGA/ESTACION_EMBALSE/MapServer/0` (cotas, volumen en $\text{Hm}^3$ y porcentaje de llenado).
  - `enriquecer_telemetria_dga_fluviometrica_lote`: Procesa ríos, esteros y canales en segundo plano con `asyncio.Semaphore(4)` y timeout de 2.5s para no saturar proveedores, almacenando caudales y tendencias en base de datos.
- **Validación Metrológica WMO-No. 8 (`telemetry_validator.py`):**
  - Descarte de valores centinela de hardware (`9900`, `990`, `99`, `sin datos`, `null`).
  - Límite físico psicrométrico ($T_d \le T$).
  - Ajuste barométrico por altitud hasta 500 hPa para cordillera.
  - Validación de temperatura ($-40^\circ\text{C}$ a $+60^\circ\text{C}$) y humedad ($0\%$ a $100\%$).

### 3.2. Capa de Almacenamiento y Persistencia
- **TimescaleDB (`db_store.py`):**
  - Contenedor `meteoprecisa_db_prod` (PostgreSQL 16 + TimescaleDB + PostGIS).
  - Guarda instantáneas horarias de todas las redes, permitiendo graficar curvas históricas multianuales y análisis hidrológicos.
- **Caché en Memoria (`CACHE_MEMORIA`):**
  - Diccionario estructurado en RAM que contiene la última instantánea de estaciones y telemetría para resolución instantánea.
- **Persistencia Atómica (`cache_store.py`):**
  - Escritura segura en disco (`tempfile` + `os.replace` + `fsync`), inmune a caídas repentinas de energía o reinicios de contenedor.

### 3.3. Motor de Cálculo y API (`main.py`)
- **Resolución Espacial KDTree:** Búsqueda en submilisegundos de la estación meteorológica, hidrométrica (DGA) y de calidad del aire (SINCA) más cercana.
- **Triangulación IDW (Inverse Distance Weighting):** Estimación de variables para coordenadas sin estación directa, aplicando gradiente térmico vertical adiabático ($-6.5^\circ\text{C} / 1000\text{m}$).
- **Motor Agroclimático (`alertas_engine.py`):**
  - Cálculo de heladas advectivas y radiativas.
  - Detección de ventana de deriva para aplicaciones fitosanitarias (viento, temperatura, humedad).
  - Evapotranspiración de referencia ($ET_0$) Penman-Monteith FAO-56.
  - Alerta de inversión térmica y acumulación de contaminantes.

### 3.4. Frontend PWA (`static/`)
- Vanilla JavaScript modular sin dependencias pesadas ni compiladores intermedios.
- Mapa Leaflet con renderizado eficiente de clusters y marcadores diferenciados por red física.
- Modal interactivo de telemetría completa: caudal, nivel de río, volumen de embalse, umbral de alerta, temperatura mín/máx, dirección del viento con rosa náutica y coordenadas GPS.
- Service Worker (`sw.js`) con estrategia *Cache-First* para carga instantánea y funcionamiento offline.

---

## 4. Topología de Infraestructura en Producción

El sistema se encuentra desplegado en **Oracle Cloud Infrastructure (OCI)** en la región `sa-santiago-1`:

| Componente | Imagen / Runtime | Puertos | Función |
| :--- | :--- | :--- | :--- |
| `meteoprecisa_api_prod` | Python 3.11-slim + Uvicorn | `80:8000` | API FastAPI principal y worker de sincronización en segundo plano |
| `meteoprecisa_db_prod` | TimescaleDB / PostgreSQL 16 + PostGIS | `5434:5432` (interno) | Almacenamiento histórico de series temporales y geoespaciales |
| `arm-hunter` | PHP OCI CLI Worker | Interno | Automatización de infraestructura OCI |

### Comando de Despliegue en Servidor:
```bash
git pull origin main
sudo docker-compose -f docker-compose.prod.yml up -d --build api
```
