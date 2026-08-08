---
name: obsidian-docs
description: Guía para mantener la bóveda de documentación Obsidian formateada e interconectada.
---

# Skill: Gestión de Bóveda Obsidian para MeteoPrecisa

Este skill guía la creación y actualización de documentación en formato Obsidian Markdown dentro del directorio `docs/obsidian/`.

## 1. Estructura de Enlaces (Wikilinks)
Utilizar la sintaxis nativa de enlaces de Obsidian `[[Nombre-Nota]]` para interconectar conceptos:
- `[[01-Arquitectura]]` -> Visión general de componentes backend/frontend.
- `[[02-API-Endpoints]]` -> Catálogo de rutas de FastAPI.
- `[[03-Estaciones-y-APIs]]` -> Integración DMC, SINCA, RedMeteo, PurpleAir.
- `[[04-Indices-Satelitales-GEE]]` -> Algoritmos de Google Earth Engine.

## 2. Metadatos de Encabezado (YAML Frontmatter)
Cada nota de Obsidian debe incluir metadatos estructurados:
```yaml
---
title: Título de la Nota
tags:
  - meteoprecisa
  - arquitectura
  - backend
last_updated: YYYY-MM-DD
---
```

## 3. Callouts de Obsidian
Usar bloques de llamada nativos de Obsidian para destacar avisos técnicos:
```markdown
> [!NOTE]
> Nota de infraestructura o caché.

> [!WARNING]
> Restricciones de API key o cuotas de GEE.
```
