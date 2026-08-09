# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 756 nodes · 1264 edges · 68 communities (54 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `51342355`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- react
- sincronizador_background.py
- prepare_chat_overlay_bundle.py
- generate_pet_images.py
- prepare_pet_run.py
- BubbleScene.tsx
- app_config.py
- devDependencies
- finalize_pet_run.py
- compare-recon.mjs
- od-preview-rewrite.mjs
- extract_strip_frames.py
- record_imagegen_result.py
- audit-clone.mjs
- playwright-loader.mjs
- mirror-site.mjs
- compilerOptions
- inspect_frames.py
- interaction-probe.mjs
- manifest.json
- main
- config.sh
- compose_atlas.py
- queue_pet_repairs.py
- frontend/package.json
- dependencies
- devDependencies
- derive_running_left_from_running_right.py
- extract_pptx.py
- asset-harvest.mjs
- mapa.js
- remotion-template/package.json
- main
- obsidian/.obsidian/app.json
- .oxlintrc.json
- .obsidian/app.json
- main
- render_state
- install.sh
- dna-scaffold.mjs
- recon-site.mjs
- dependencies
- MeteoPrecisaUser
- validate-skill-submission.sh
- verify
- discover-doc-gaps.sh
- discover-i18n-gaps.sh
- checker
- alpha_nonzero_count
- check-prereqs.sh
- validate-design-system.sh
- validate-markdown.sh
- render_animation_videos.sh script
- create-issue.sh
- create-pr.sh
- setup-workspace.sh
- service-worker.js
- configurar_sync_horario.sh script
- deploy.sh script

## God Nodes (most connected - your core abstractions)
1. `react` - 27 edges
2. `ejecutar_sincronizacion_completa()` - 18 edges
3. `main()` - 15 edges
4. `obtener_clima_hiperlocal()` - 13 edges
5. `main()` - 11 edges
6. `compilerOptions` - 10 edges
7. `main()` - 10 edges
8. `main()` - 9 edges
9. `report()` - 9 edges
10. `build_spec()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `sincronizar_puntos_gee()` --indirect_call--> `extraer_metricas_urbanas()`  [INFERRED]
  sincronizador_background.py → gee/urban.py
- `obtener_openmeteo_directo()` --calls--> `obtener_pronostico_openmeteo()`  [INFERRED]
  main.py → openmeteo_client.py
- `refresh_cache_before_api()` --indirect_call--> `refrescar_cache_si_corresponde()`  [INFERRED]
  main.py → sincronizador_background.py
- `sincronizar_puntos_gee()` --indirect_call--> `extraer_metricas_agricolas()`  [INFERRED]
  sincronizador_background.py → gee/rural.py
- `cargar_cache_desde_disco()` --calls--> `load_cache()`  [EXTRACTED]
  sincronizador_background.py → cache_store.py

## Import Cycles
- None detected.

## Communities (68 total, 14 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.07
Nodes (47): evaluar_alertas_meteorologicas(), Motor de Alertas Agro-Climáticas e Higiénico-Ambientales para MeteoPrecisa…, FastAPI, GEECore, extraer_historico_ndvi(), extraer_metricas_agricolas(), fallback_rural(), Extrae serie de tiempo NDVI de los últimos 12 meses usando MODIS MOD13Q1. (+39 more)

### Community 1 - "react"
Cohesion: 0.06
Nodes (14): App(), AlertsBanner(), DetailDrawer(), getWeatherIcon(), HourlyCarousel(), REGIONES, SatelliteModal(), WeatherHeader() (+6 more)

### Community 2 - "sincronizador_background.py"
Cohesion: 0.08
Nodes (40): AsyncClient, fixture, _descargar_y_procesar_frame(), procesar_video_goes19(), Descarga los últimos fotogramas de la NOAA para Chile (GOES-19 SSA), los…, forzar_sincronizacion_manual(), post, cargar_cache_desde_disco() (+32 more)

### Community 3 - "prepare_chat_overlay_bundle.py"
Cohesion: 0.16
Nodes (30): auto_avatar_for_participant(), build_spec(), configured_participant(), is_flag(), is_side(), load_config(), main(), parse_args() (+22 more)

### Community 4 - "generate_pet_images.py"
Cohesion: 0.15
Nodes (23): complete_job(), decode_response(), file_sha256(), load_manifest(), main(), manifest_jobs(), _multipart_body(), parse_states() (+15 more)

### Community 5 - "prepare_pet_run.py"
Cohesion: 0.18
Nodes (27): base_pet_prompt(), choose_chroma_key(), color_distance(), concept_words(), create_layout_guide(), create_layout_guides(), default_output_dir(), display_from_slug() (+19 more)

### Community 6 - "BubbleScene.tsx"
Cohesion: 0.15
Nodes (17): chatSpec, AvatarImage(), avatarSrcFor(), PRESET_FILES, Bubble(), BubbleScene(), bubbleWidthFor(), CONTAINER_THEME (+9 more)

### Community 7 - "app_config.py"
Cohesion: 0.15
Nodes (17): Any, _as_bool(), _as_origins(), get_settings(), Configuración centralizada de MeteoPrecisa. Los valores sensibles nunca tienen…, Settings, load_cache(), _load_local() (+9 more)

### Community 8 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, knip, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react-dom, vite (+11 more)

### Community 9 - "finalize_pet_run.py"
Cohesion: 0.33
Nodes (15): default_codex_home(), default_generated_images_root(), file_sha256(), is_relative_to(), load_json(), main(), manifest_path(), CompletedProcess (+7 more)

### Community 10 - "compare-recon.mjs"
Cohesion: 0.24
Nodes (12): boolList(), changedActionCount(), firstSignals(), inferComplexity(), interactionSection(), line(), ratioScore(), report() (+4 more)

### Community 11 - "od-preview-rewrite.mjs"
Cohesion: 0.20
Nodes (12): hostRootPrefixes, includeExt, projectAssetPrefixes, relativeRef(), rewriteCssUrls(), rewriteFile(), rewriteHtmlAttrs(), rewriteRootRef() (+4 more)

### Community 12 - "extract_strip_frames.py"
Cohesion: 0.31
Nodes (14): color_distance(), component_group_image(), connected_components(), extract_component_frames(), extract_slot_frames(), extract_state(), fit_to_cell(), load_chroma_key() (+6 more)

### Community 13 - "record_imagegen_result.py"
Cohesion: 0.35
Nodes (14): completed_job_ids(), default_generated_images_root(), file_sha256(), find_job(), image_metadata(), is_relative_to(), job_list(), load_jobs() (+6 more)

### Community 14 - "audit-clone.mjs"
Cohesion: 0.19
Nodes (10): collectCloneColors(), collectMatches(), customFontFamilies(), fidelityFindings(), GENERIC_FONT_FAMILIES, includeExt, lineNumber(), normalizeColor() (+2 more)

### Community 16 - "mirror-site.mjs"
Cohesion: 0.14
Nodes (10): all, args, failed, outRoot, ownUrls, pw, responses, siteDir (+2 more)

### Community 17 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, jsx, module, moduleResolution, resolveJsonModule, skipLibCheck (+4 more)

### Community 18 - "inspect_frames.py"
Cohesion: 0.35
Nodes (12): alpha_nonzero_count(), chroma_adjacent_count(), color_distance(), edge_alpha_count(), frame_files(), inspect_state(), load_chroma_key(), load_manifest() (+4 more)

### Community 19 - "interaction-probe.mjs"
Cohesion: 0.24
Nodes (6): captureAction(), hasChanged(), hashSnapshot(), safeFileName(), shortHash(), snapshot()

### Community 20 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, categories, display, icons, name, orientation, short_name, start_url (+3 more)

### Community 21 - "main"
Cohesion: 0.36
Nodes (10): base_config(), main(), parse_args(), participant(), CompletedProcess, Namespace, Path, read_generated_chat_spec() (+2 more)

### Community 22 - "config.sh"
Cohesion: 0.24
Nodes (6): od::assert_in_workroot(), od::die(), od::err(), od::require(), OD_TARGET_REPO, config.sh script

### Community 23 - "compose_atlas.py"
Cohesion: 0.51
Nodes (9): compose_from_frames(), compose_from_source_atlas(), find_row_frames(), image_files(), main(), paste_centered(), Image, Path (+1 more)

### Community 24 - "queue_pet_repairs.py"
Cohesion: 0.47
Nodes (9): append_repair_note(), archive_decoded_output(), job_list(), load_json(), main(), next_archive_path(), Path, queue_repair() (+1 more)

### Community 25 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 26 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, react, react-dom, remotion, react, react-dom, react, react-dom (+1 more)

### Community 27 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @remotion/cli, @types/react, typescript, @types/react, typescript, @remotion/cli, @types/react (+1 more)

### Community 28 - "derive_running_left_from_running_right.py"
Cohesion: 0.50
Nodes (8): file_sha256(), find_job(), image_metadata(), job_list(), load_manifest(), main(), manifest_relative(), Path

### Community 29 - "extract_pptx.py"
Cohesion: 0.39
Nodes (8): color_repr(), emu_to_in(), extract_pptx(), extract_runs(), extract_shape(), main(), Path, Best-effort color extraction. Returns hex string or None.

### Community 30 - "asset-harvest.mjs"
Cohesion: 0.28
Nodes (3): downloadAll(), localPathFor(), safeName()

### Community 31 - "mapa.js"
Cohesion: 0.58
Nodes (8): Angulos(), creaCapasMarcadores(), creaMarcador(), creaMarcadorLluvia(), creaMarcadorTemperatura(), creaMarcadorViento(), procesarmapa(), rosadelosvientos()

### Community 32 - "remotion-template/package.json"
Cohesion: 0.25
Nodes (7): name, private, scripts, render:mov, render:webm, start, version

### Community 33 - "main"
Cohesion: 0.57
Nodes (7): completed_ids(), job_view(), jobs(), load_manifest(), main(), missing_deps(), Path

### Community 35 - "obsidian/.obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 36 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 37 - ".obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 38 - "main"
Cohesion: 0.62
Nodes (6): default_codex_home(), main(), Path, slugify(), validate_spritesheet(), write_webp_spritesheet()

### Community 39 - "render_state"
Cohesion: 0.57
Nodes (6): checker(), main(), Image, Path, render_state(), shell_quote_for_concat()

### Community 40 - "install.sh"
Cohesion: 0.62
Nodes (6): cyan(), die(), gray(), green(), install_skill_to(), install.sh script

### Community 44 - "dependencies"
Cohesion: 0.29
Nodes (7): chart.js, dependencies, chart.js, lucide-react, react-chartjs-2, lucide-react, react-chartjs-2

### Community 45 - "MeteoPrecisaUser"
Cohesion: 0.33
Nodes (4): HttpUser, MeteoPrecisaUser, Locust Load Test Script para MeteoPrecisa API. Para ejecutar: pip install…, task

### Community 46 - "validate-skill-submission.sh"
Cohesion: 0.60
Nodes (5): escapes_root(), fail(), pass(), validate-skill-submission.sh script, warn()

### Community 47 - "verify"
Cohesion: 0.53
Nodes (5): emu_to_in(), is_footer_by_name(), main(), Path, verify()

### Community 48 - "discover-doc-gaps.sh"
Cohesion: 0.70
Nodes (4): emit_todo(), extract_links(), GREP(), discover-doc-gaps.sh script

### Community 51 - "checker"
Cohesion: 0.67
Nodes (3): checker(), main(), Image

### Community 52 - "alpha_nonzero_count"
Cohesion: 0.67
Nodes (3): alpha_nonzero_count(), main(), Image

## Knowledge Gaps
- **97 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+92 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `.oxlintrc.json`, `BubbleScene.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`, `devDependencies`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `frontend/package.json`, `dependencies`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _97 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.06688311688311688 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.0641025641025641 - nodes in this community are weakly interconnected._
- **Should `sincronizador_background.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._