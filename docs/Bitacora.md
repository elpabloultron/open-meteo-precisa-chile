# BitÃ¡cora de Desarrollo - MeteoPrecisa

Este archivo sirve como registro de las decisiones arquitectÃ³nicas, tareas completadas y estado del proyecto para mantener el contexto entre sesiones.

## SesiÃ³n Anterior y Estado Actual (RefactorizaciÃ³n a Open Source)
**Fecha:** 23 de Agosto 2026

**Hitos alcanzados:**
1. **Limpieza de Stack:** Se eliminÃ³ Firebase, Vercel, Render y el framework React pesado. Todo se unificÃ³ en un backend local (FastAPI) que sirve directamente los archivos del frontend Vanilla JS (`static/`).
2. **DockerizaciÃ³n (PostgreSQL + TimescaleDB):** Se creÃ³ el entorno `docker-compose.yml` que levanta la API y una base de datos local potente (PostgreSQL con TimescaleDB) para la telemetrÃ­a en vivo, abandonando el modelo SaaS.
3. **InstalaciÃ³n de Skills y MCP:**
   - Se activaron los **skills de Obsidian** (`obsidian-cli`, `obsidian-markdown`, `obsidian-bases`) para poder interactuar y generar notas si es necesario.
   - Se configuraron los **Servidores MCP**, dejÃ¡ndonos con mÃºltiples herramientas de recolecciÃ³n de datos y utilidades locales.
4. **Agente RAG (Dify):** Se dejÃ³ preparado el script inyector (`scripts/dify_injector.py`) que conecta nuestra base de datos SQL con Dify, para tener una IA local que pueda responder basÃ¡ndose en los datos de las estaciones.

## Siguientes Pasos Pendientes:
- [ ] Definir los esquemas de tablas/hipertablas en TimescaleDB para guardar la telemetrÃ­a y crear el script de migraciÃ³n inicial.
- [ ] Conectar la interfaz estÃ¡tica (`app.js`) con la base de datos o asegurarse de que consume la API actual correctamente.
- [ ] Levantar Dify (Agente RAG) e integrar su orquestaciÃ³n.

- **Revisión de Sincronizador:** Se revisó el pipeline de sincronizador_background.py. Se confirmó que extrae datos 100% reales (INIA, DMC, RedMeteo, SINCA, PurpleAir). Se eliminó un fallback con datos simulados en SINCA. Frecuencia actual: 1 hora.


- **Solución Definitiva Caché PWA y Docker:** Se configuró Network-First en sw.js, se añadió middleware Cache-Control: no-cache, no-store en main.py y script de autodestrucción de cachés antiguas en index.html para garantizar actualización inmediata de la UI.

