# Historial de Versiones (Changelog) - Open Meteo Precisa Chile

## [10.4.0] - 2026-08-29
### Añadido
- **Módulo de Exploración Espacial Dedicado:** El mapa interactivo Leaflet ahora se aloja en un módulo visible (`#modulo-mapa`) integrado de manera nativa en el flujo del dashboard, abandonando el comportamiento previo de mapa en fondo de pantalla.
- **Endpoint Optimizado `/api/v1/estaciones`:** Nuevo endpoint en `main.py` diseñado para exportar el catálogo maestro persistido en RAM junto a sus timestamps de actualización de manera concurrente.
- **Auto-Encuadre Geográfico Inteligente:** Lógica `fitBounds` implementada en el frontend. Si se provee la ubicación del usuario, al consultar una estación el mapa calcula automáticamente el zoom adecuado para enmarcar ambos puntos geográficos en pantalla.
- **Latencia de Telemetría Transparente:** Los popups de cada marcador calculan en el cliente (`Date.now()` vs `timestamp_actualizacion`) la latencia del dato y muestran "⏱️ Actualizado hace X min" antes de consultar la estación completa.

### Corregido
- **Bug de Renderizado Incompleto (Invalidate Size):** Resuelto el clásico fallo donde Leaflet dejaba de pintar texturas por creer que medía 0x0 pixeles. Inyección de `map.invalidateSize()` solucionó los paneles grises a los bordes.


## [10.3.0] - 2026-08-29
### Añadido
- **Mapa Interactivo Multired Completo:** Visualización en Leaflet de más de 700 estaciones en vivo con codificación de color por red (DMC: Azul, Agromet INIA: Verde, RedMeteo: Violeta, SINCA: Rojo).
- **Popups de Previsualización y Carga Directa:** Cada estación en el mapa incluye nombre, red, sector, distancia calculada vía Haversine desde la ubicación del usuario y botón para cargar su telemetría en el panel principal.
- **Baliza de Usuario Persistente y Trazado de Distancia:** Marcador pulsante (`user-pulse-marker`) que permanece fijo en la posición del usuario y dibuja una línea discontinua indicando la distancia a la estación seleccionada.
- **Leyenda Flotante en Mapa:** Panel de referencia visual de redes y contador total de estaciones en vivo (`#map-legend`).

### Corregido
- **Blindaje del Loop de Sincronización:** Agregado `asyncio.wait_for(timeout=45.0)` en tareas de red concurrentes (`asyncio.gather`) y timeout de 20s en `atmchile` para evitar que caídas o demoras de servidores externos bloqueen el candado `_SYNC_LOCK`.
- **Garantía de Refresco de Timestamp:** Bloque `try/except/finally` que asegura que `last_updated` y `status="ok"` siempre se actualicen y persistan en disco en cada ciclo de 15 minutos.

### Corregido
- Solucionado error de renderizado en `app.js` causado por la falta del elemento `sun-times` y variables nulas en el DOM.
- Agregados guards defensivos `setTxt` en toda la interfaz para prevenir excepciones en el cliente.
- Actualizada versión de caché a `10.4`.
### Añadido
- Módulos Urbano y Agrícola separados y mostrados secuencialmente en la interfaz.
- Modal y sistema de consulta para Gráficos Históricos (TimescaleDB).
- Menú "Acerca de" que documenta las fuentes y el uso de modelos globales (Open-Meteo).
- Tooltips en UI para variables complejas (Presión, Horas de Frío, ET0, etc.).
- Advertencia OMS cuando el PM2.5 supera los 15 µg/m³.
- Alerta visual empírica de probabilidad de Inversión Térmica basada en temperatura, viento y PM2.5.
- Parámetro de limpieza de caché dinámica en `index.html` (`?v=10.3`).

### Cambiado
- Backend configurado para auto-recargarse mediante bandera `--reload` en `docker-compose.yml`.
- Loop de sincronización de fondo (`main.py`) reducido de 3600 segundos (1h) a 900 segundos (15 mins).

## [10.2] - 2026-08-23
### Cambiado
- Migración total de arquitectura: Eliminado Vercel/Firebase. Ahora usa Docker + FastAPI + Vanilla JS local.
- Extracción limpia desde DMC, INIA, RedMeteo, PurpleAir y SINCA. Eliminado fallback de simulación para SINCA.
