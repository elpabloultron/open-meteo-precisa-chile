import logging
import os

try:
    import ee
    import google.auth
    from google.oauth2 import service_account
    EE_AVAILABLE = True
except ImportError:
    EE_AVAILABLE = False
    ee = None

logger = logging.getLogger("gee.core")

class GEECore:
    _initialized = False

    @classmethod
    def initialize(cls) -> bool:
        if cls._initialized:
            return True
        if not EE_AVAILABLE:
            logger.warning("Google Earth Engine no está instalado o faltan dependencias.")
            return False

        # 1. Intentar Application Default Credentials (Cloud Run)
        try:
            credentials, project = google.auth.default(scopes=['https://www.googleapis.com/auth/earthengine'])
            project_id = project or os.getenv("GCP_PROJECT_ID") or os.getenv("GOOGLE_CLOUD_PROJECT")
            ee.Initialize(credentials=credentials, project=project_id)
            cls._initialized = True
            logger.info(f"🎉 [GEE] Autenticación ADC exitosa (Proyecto: {project_id})")
            return True
        except Exception as adc_err:
            logger.info("[GEE] ADC no disponible; se intentará una ruta de credencial configurada explícitamente.")

        # 2. Intentar claves locales
        key_paths = [
            os.getenv("GOOGLE_APPLICATION_CREDENTIALS", ""),
            os.getenv("GEE_KEY_PATH", ""),
        ]
        key_path = next((p for p in key_paths if p and os.path.exists(p)), None)
        
        if key_path:
            try:
                creds = service_account.Credentials.from_service_account_file(
                    key_path,
                    scopes=['https://www.googleapis.com/auth/earthengine']
                )
                ee.Initialize(credentials=creds)
                cls._initialized = True
                logger.info(f"🎉 [GEE] Autenticado mediante clave local en {os.path.basename(key_path)}")
                return True
            except Exception as e:
                logger.error(f"⚠️ [GEE] Error inicializando con llave local: {e}")

        logger.warning("[GEE] No se encontraron credenciales válidas. Operando en modo fallback.")
        return False

    @classmethod
    def is_active(cls) -> bool:
        return cls._initialized
