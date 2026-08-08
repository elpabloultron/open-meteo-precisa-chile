# Arquitectura de MeteoPrecisa

## Flujo de datos

```text
Cloud Scheduler (cada hora, America/Santiago)
  -> Cloud Run Job (sync_job.py)
  -> proveedores meteorológicos y satelitales
  -> Cloud Storage: cache/cache_servidor.json
  -> Cloud Run API (main.py)
  -> Firebase Hosting / frontend React
```

Firebase Hosting sólo entrega los archivos de la interfaz y redirige `/api/**` a Cloud Run. Las instancias de la API leen la instantánea compartida y la refrescan en memoria como máximo una vez por minuto; no realizan la sincronización horaria por sí mismas.

## Módulos

- `app_config.py`: variables de entorno, CORS y configuración del almacenamiento.
- `cache_store.py`: lectura y escritura atómica de la instantánea local o GCS.
- `sync_job.py`: entrada de una ejecución única del proceso horario.
- `sincronizador_background.py`: conectores de proveedores y composición de la caché.
- `main.py`: API FastAPI y reglas de presentación de los datos.
- `gee/`: autenticación y análisis Earth Engine.
- `goes_processor.py`: procesamiento de imágenes GOES-19.
- `frontend/`: interfaz React/PWA.

## Producción

1. Rota las credenciales DMC que estuvieron en el código y crea los secretos `meteoprecisa-dmc-user`, `meteoprecisa-dmc-token` y `meteoprecisa-purpleair-key` en Secret Manager.
2. Crea una cuenta de servicio de ejecución con acceso a esos secretos, a Earth Engine y a `Storage Object Admin` sobre el bucket de caché.
3. Da a la cuenta de servicio del Scheduler permiso para ejecutar el Cloud Run Job.
4. Ejecuta `scripts/configurar_sync_horario.ps1` con el bucket y ambas cuentas de servicio.
5. Despliega la API configurando `CACHE_BACKEND=gcs`, el bucket y `ENABLE_IN_PROCESS_SYNC=false`.

El endpoint de sincronización manual requiere ahora el encabezado `X-Admin-Token`; configura `ADMIN_SYNC_TOKEN` desde Secret Manager si se quiere habilitar.
