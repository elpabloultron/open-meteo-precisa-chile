# Plan de Implementación: Mejoras Arquitectónicas y UI/UX de MeteoPrecisa

## 1. Objetivo
Atender las solicitudes de separación de módulos (urbano vs agrícola), incorporar análisis avanzado (Inversión Térmica, Alarmas OMS), habilitar la visualización histórica (TimescaleDB) y ajustar la frecuencia de muestreo para optimizar la frescura de datos.

## User Review Required
> [!IMPORTANT]
> **Orquestación de Inversión Térmica:** La Organización Meteorológica Mundial (OMM) usa sondeos verticales para medir inversión térmica. Como usamos estaciones de superficie, aproximaremos la *probabilidad de inversión térmica* usando un índice empírico nocturno/invernal (baja temperatura + bajo viento + alta concentración PM2.5/PM10). ¿Estás de acuerdo con esta aproximación empírica para la alerta?
> 
> **Gráficos Históricos:** Implementar un menú histórico para "el último mes o año" requiere cargar una librería de gráficos (ej. Chart.js) en Vanilla JS. ¿Prefieres que los históricos se muestren como gráficos interactivos o en una tabla de resumen?

## Cambios Propuestos

### Backend (`main.py`, `db_store.py`)
---
#### [MODIFY] `main.py`
- Ajustar `iniciar_loop_background(3600)` a `iniciar_loop_background(900)` (15 minutos).
- Añadir el endpoint `GET /api/history/{station_id}` que reciba un parámetro `rango` (ej: 24h, 30d, 1y).

#### [MODIFY] `db_store.py`
- Ampliar `obtener_historico_estacion` para que agrupe por día (usando `time_bucket` de TimescaleDB) si la consulta supera las 48 horas. Esto evitará enviar gigabytes de datos al cliente al consultar 1 año entero.

### Frontend (`static/`)
---
#### [MODIFY] `static/index.html`
- **Separación de Módulos:** Eliminar el toggle Urbano/Agrícola. Crear `<section id="urbano">` y debajo `<section id="agricola">` con variables mutuamente excluyentes (sin redundancia).
- **Herramientas Educativas:** Agregar íconos de tooltip `[?]` al lado de métricas como "Presión Atmosférica" que, al hacer clic/hover, expliquen qué significa (ej. Normal = 1013 hPa).
- **Módulo de Calidad del Aire (OMS):** Agregar un badge/alerta visual comparativa. (Ej: "Buena según Norma Chilena, pero Peligrosa según Guía OMS de 15 µg/m³").
- **Módulo de Alerta de Inversión Térmica:** Añadir un banner que se encienda si se detectan condiciones de inversión en valles (frío + sin viento + alta contaminación).
- **Sección Acerca De:** Agregar una sección en el footer con un botón para abrir un modal que explique cómo se calculan los datos (incluyendo la interpolación para zonas sin estaciones usando modelos numéricos globales).
- **Menú Histórico:** Agregar un botón "Ver Histórico" en la cabecera de la estación que abra un modal o sección con los gráficos/datos.

#### [MODIFY] `static/app.js`
- Modificar el renderizado para poblar ambas secciones (Urbana y Agrícola) de forma independiente.
- Implementar la lógica para las alertas de Inversión Térmica y OMS.
- Crear la función para hacer fetch al endpoint histórico (`/api/history`) y renderizar el modal/gráfico.

#### [MODIFY] `static/style.css`
- Estilos para tooltips educativos.
- Estilos para los nuevos modales de Histórico y Acerca De.
- Estilos para el banner de advertencia OMS e Inversión Térmica.

## Plan de Verificación
### Verificación Manual
1. Abrir la app web y constatar que las secciones Urbana y Agrícola se renderizan de forma serial (una debajo de otra) sin datos duplicados.
2. Hacer clic en los tooltips `[?]` de presión atmosférica para verificar la explicación.
3. Comprobar que, en estaciones con PM2.5 alto, salte la alarma diferencial de la OMS.
4. Clicar en "Ver Histórico", asegurando que el backend de TimescaleDB agrupa correctamente la data (15 mins para el día, medias diarias para meses).
5. Revisar logs del contenedor Docker para asegurar que la frecuencia de sincronización bajó a 15 minutos sin ser baneados por DMC.
