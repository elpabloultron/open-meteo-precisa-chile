# Contribuir a Open Meteo Precisa Chile 🌩️

¡Gracias por tu interés en contribuir a MeteoPrecisa! Este es un proyecto open-source dedicado a democratizar los datos meteorológicos y satelitales en Chile.

## 🛠️ Cómo Contribuir

1. **Haz un Fork del Repositorio** y crea tu rama desde `main`:
   ```bash
   git checkout -b feature/mi-nueva-funcionalidad
   ```
2. **Instala las dependencias y corre las pruebas:**
   ```bash
   pip install -r requirements.txt
   pytest -v
   ruff check .
   ```
3. **Asegúrate de que todo el código nuevo cumpla con:**
   - Estándares físicos metrológicos WMO-No. 8 en `telemetry_validator.py`.
   - Formato y linting limpio con Ruff (`ruff check --fix .`).
   - Pruebas unitarias en `test_main.py`.
4. **Envía un Pull Request** con una descripción clara de tus cambios.

## 🐛 Reporte de Errores y Sugerencias
Si encuentras un bug o tienes una idea para mejorar la plataforma, por favor abre un [Issue en GitHub](https://github.com/elpabloultron/open-meteo-precisa-chile/issues).
