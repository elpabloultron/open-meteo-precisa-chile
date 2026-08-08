# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 269 nodes · 440 edges · 21 communities (18 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4a8fd0af`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.jsx
- main.py
- sincronizador_background.py
- devDependencies
- package.json
- GEECore
- test_main.py
- app_config.py
- manifest.json
- mapa.js
- obsidian/.obsidian/app.json
- .oxlintrc.json
- .obsidian/app.json
- MeteoPrecisaUser
- service-worker.js
- configurar_sync_horario.sh script
- deploy.sh script

## God Nodes (most connected - your core abstractions)
1. `react` - 21 edges
2. `ejecutar_sincronizacion_completa()` - 18 edges
3. `obtener_clima_hiperlocal()` - 11 edges
4. `GEECore` - 8 edges
5. `clean_num()` - 8 edges
6. `cargar_cache_desde_disco()` - 8 edges
7. `extraer_metricas_agricolas()` - 7 edges
8. `extraer_metricas_urbanas()` - 7 edges
9. `load_cache()` - 6 edges
10. `save_cache()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `obtener_gee_punto_seguro()` --calls--> `fallback_rural()`  [INFERRED]
  main.py → gee/rural.py
- `obtener_historico_clima()` --indirect_call--> `extraer_historico_ndvi()`  [INFERRED]
  main.py → gee/rural.py
- `obtener_capas_mapa()` --calls--> `obtener_capas_gee_y_windy()`  [INFERRED]
  main.py → gee/tiles.py
- `obtener_gee_punto_seguro()` --calls--> `fallback_urbano()`  [INFERRED]
  main.py → gee/urban.py
- `procesar_video_goes19()` --indirect_call--> `client()`  [INFERRED]
  goes_processor.py → test_main.py

## Import Cycles
- None detected.

## Communities (21 total, 3 thin omitted)

### Community 0 - "App.jsx"
Cohesion: 0.09
Nodes (24): App(), AgroPanel(), AqiDrawer(), BottomNav(), ComparisonTable(), DailyForecastCards(), DetailDrawer(), EstacionesCercanasModal() (+16 more)

### Community 1 - "main.py"
Cohesion: 0.09
Nodes (34): FastAPI, get, obtener_satellite_latest_loop(), Devuelve la metadata y URL del bucle animado más reciente de GOES-19., buscar_estaciones(), calcular_calidad_aire_dual(), calcular_distancia(), calcular_horas_frio() (+26 more)

### Community 2 - "sincronizador_background.py"
Cohesion: 0.17
Nodes (23): AsyncClient, _descargar_y_procesar_frame(), procesar_video_goes19(), Descarga los últimos fotogramas de la NOAA para Chile (GOES-19 SSA), los…, cargar_cache_desde_disco(), cargar_catalogo_maestro(), clean_num(), ejecutar_sincronizacion_completa() (+15 more)

### Community 3 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, knip, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom (+15 more)

### Community 4 - "package.json"
Cohesion: 0.10
Nodes (20): chart.js, dependencies, chart.js, lucide-react, react, react-chartjs-2, react-dom, name (+12 more)

### Community 5 - "GEECore"
Cohesion: 0.18
Nodes (14): GEECore, extraer_historico_ndvi(), extraer_metricas_agricolas(), fallback_rural(), Extrae serie de tiempo NDVI de los últimos 12 meses usando MODIS MOD13Q1., Extrae métricas satelitales (Sentinel-2, ERA5, MODIS) orientadas a la…, _create_tile_url(), obtener_capas_gee_y_windy() (+6 more)

### Community 6 - "test_main.py"
Cohesion: 0.19
Nodes (13): fixture, client(), FakeOpenMeteoClient, FakeOpenMeteoResponse, test_alertas_senapred_endpoint_uses_cached_data(), test_buscar_estaciones_endpoint_uses_cached_catalog(), test_capas_mapa_endpoint_accepts_default_coordinates(), test_capas_mapa_rejects_invalid_coordinates() (+5 more)

### Community 7 - "app_config.py"
Cohesion: 0.20
Nodes (14): Any, _as_bool(), _as_origins(), get_settings(), Configuración centralizada de MeteoPrecisa. Los valores sensibles nunca tienen…, Settings, load_cache(), _load_local() (+6 more)

### Community 8 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, categories, display, icons, name, orientation, short_name, start_url (+3 more)

### Community 9 - "mapa.js"
Cohesion: 0.58
Nodes (8): Angulos(), creaCapasMarcadores(), creaMarcador(), creaMarcadorLluvia(), creaMarcadorTemperatura(), creaMarcadorViento(), procesarmapa(), rosadelosvientos()

### Community 10 - "obsidian/.obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 11 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 12 - ".obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 13 - "MeteoPrecisaUser"
Cohesion: 0.33
Nodes (4): HttpUser, MeteoPrecisaUser, Locust Load Test Script para MeteoPrecisa API. Para ejecutar: pip install…, task

## Knowledge Gaps
- **56 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `react` connect `App.jsx` to `.oxlintrc.json`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `obtener_pronostico_openmeteo()` connect `main.py` to `app_config.py`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.09365079365079365 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._