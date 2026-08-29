# Historial de Versiones (Changelog) - MeteoPrecisa

## [10.4] - 2026-08-23
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
