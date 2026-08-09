# Graph Report - .  (2026-08-08)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 767 nodes · 1277 edges · 73 communities (58 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4751397f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.py
- sincronizador_background.py
- react
- prepare_chat_overlay_bundle.py
- generate_pet_images.py
- prepare_pet_run.py
- test_main.py
- devDependencies
- finalize_pet_run.py
- compare-recon.mjs
- od-preview-rewrite.mjs
- BubbleScene.tsx
- extract_strip_frames.py
- record_imagegen_result.py
- audit-clone.mjs
- playwright-loader.mjs
- mirror-site.mjs
- compilerOptions
- inspect_frames.py
- WeatherContext.jsx
- interaction-probe.mjs
- manifest.json
- main
- config.sh
- ChatMotionOverlay.tsx
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
- SatelliteModal.jsx
- discover-doc-gaps.sh
- discover-i18n-gaps.sh
- DetailDrawer.jsx
- checker
- alpha_nonzero_count
- check-prereqs.sh
- validate-design-system.sh
- validate-markdown.sh
- LocationFallbackModal.jsx
- render_animation_videos.sh script
- create-issue.sh
- create-pr.sh
- setup-workspace.sh
- service-worker.js
- configurar_sync_horario.sh script
- deploy.sh script

## God Nodes (most connected - your core abstractions)
1. `react` - 29 edges
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
- `procesar_video_goes19()` --indirect_call--> `client()`  [INFERRED]
  goes_processor.py → test_main.py
- `ejecutar_sincronizacion_completa()` --indirect_call--> `client()`  [INFERRED]
  sincronizador_background.py → test_main.py
- `test_clean_num_discards_sentinel_values()` --calls--> `clean_num()`  [EXTRACTED]
  test_main.py → sincronizador_background.py
- `obtener_openmeteo_directo()` --calls--> `obtener_pronostico_openmeteo()`  [INFERRED]
  main.py → openmeteo_client.py

## Import Cycles
- None detected.

## Communities (73 total, 15 thin omitted)

### Community 0 - "main.py"
Cohesion: 0.06
Nodes (52): evaluar_alertas_meteorologicas(), Motor de Alertas Agro-Climáticas e Higiénico-Ambientales para MeteoPrecisa…, FastAPI, GEECore, extraer_historico_ndvi(), extraer_metricas_agricolas(), fallback_rural(), Extrae serie de tiempo NDVI de los últimos 12 meses usando MODIS MOD13Q1. (+44 more)

### Community 1 - "sincronizador_background.py"
Cohesion: 0.09
Nodes (39): Any, _as_bool(), _as_origins(), get_settings(), Configuración centralizada de MeteoPrecisa. Los valores sensibles nunca tienen…, Settings, AsyncClient, load_cache() (+31 more)

### Community 2 - "react"
Cohesion: 0.08
Nodes (4): BreezySunMoonWidget(), getWeatherIcon(), HourlyCarousel(), react

### Community 3 - "prepare_chat_overlay_bundle.py"
Cohesion: 0.16
Nodes (30): auto_avatar_for_participant(), build_spec(), configured_participant(), is_flag(), is_side(), load_config(), main(), parse_args() (+22 more)

### Community 4 - "generate_pet_images.py"
Cohesion: 0.15
Nodes (23): complete_job(), decode_response(), file_sha256(), load_manifest(), main(), manifest_jobs(), _multipart_body(), parse_states() (+15 more)

### Community 5 - "prepare_pet_run.py"
Cohesion: 0.18
Nodes (27): base_pet_prompt(), choose_chroma_key(), color_distance(), concept_words(), create_layout_guide(), create_layout_guides(), default_output_dir(), display_from_slug() (+19 more)

### Community 6 - "test_main.py"
Cohesion: 0.19
Nodes (13): fixture, client(), FakeOpenMeteoClient, FakeOpenMeteoResponse, test_alertas_senapred_endpoint_uses_cached_data(), test_buscar_estaciones_endpoint_uses_cached_catalog(), test_capas_mapa_endpoint_accepts_default_coordinates(), test_capas_mapa_rejects_invalid_coordinates() (+5 more)

### Community 7 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, knip, oxlint, tailwindcss, @tailwindcss/vite, @types/node, @types/react-dom, vite (+11 more)

### Community 8 - "finalize_pet_run.py"
Cohesion: 0.33
Nodes (15): default_codex_home(), default_generated_images_root(), file_sha256(), is_relative_to(), load_json(), main(), manifest_path(), CompletedProcess (+7 more)

### Community 9 - "compare-recon.mjs"
Cohesion: 0.24
Nodes (12): boolList(), changedActionCount(), firstSignals(), inferComplexity(), interactionSection(), line(), ratioScore(), report() (+4 more)

### Community 10 - "od-preview-rewrite.mjs"
Cohesion: 0.20
Nodes (12): hostRootPrefixes, includeExt, projectAssetPrefixes, relativeRef(), rewriteCssUrls(), rewriteFile(), rewriteHtmlAttrs(), rewriteRootRef() (+4 more)

### Community 11 - "BubbleScene.tsx"
Cohesion: 0.27
Nodes (12): AvatarImage(), avatarSrcFor(), PRESET_FILES, Bubble(), bubbleWidthFor(), CONTAINER_THEME, estimateCharWidth(), maxTextWidthFor() (+4 more)

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

### Community 19 - "WeatherContext.jsx"
Cohesion: 0.18
Nodes (5): FALLBACK_CLIMA_DATA, WeatherContext, WeatherProvider(), ErrorBoundary, rootElement

### Community 20 - "interaction-probe.mjs"
Cohesion: 0.24
Nodes (6): captureAction(), hasChanged(), hashSnapshot(), safeFileName(), shortHash(), snapshot()

### Community 21 - "manifest.json"
Cohesion: 0.17
Nodes (11): background_color, categories, display, icons, name, orientation, short_name, start_url (+3 more)

### Community 22 - "main"
Cohesion: 0.36
Nodes (10): base_config(), main(), parse_args(), participant(), CompletedProcess, Namespace, Path, read_generated_chat_spec() (+2 more)

### Community 23 - "config.sh"
Cohesion: 0.24
Nodes (6): od::assert_in_workroot(), od::die(), od::err(), od::require(), OD_TARGET_REPO, config.sh script

### Community 24 - "ChatMotionOverlay.tsx"
Cohesion: 0.29
Nodes (5): chatSpec, BubbleScene(), ChatMotionOverlay(), DeviceFrame(), RemotionRoot()

### Community 25 - "compose_atlas.py"
Cohesion: 0.51
Nodes (9): compose_from_frames(), compose_from_source_atlas(), find_row_frames(), image_files(), main(), paste_centered(), Image, Path (+1 more)

### Community 26 - "queue_pet_repairs.py"
Cohesion: 0.47
Nodes (9): append_repair_note(), archive_decoded_output(), job_list(), load_json(), main(), next_archive_path(), Path, queue_repair() (+1 more)

### Community 27 - "frontend/package.json"
Cohesion: 0.20
Nodes (9): name, private, scripts, build, dev, lint, preview, type (+1 more)

### Community 28 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, react, react-dom, remotion, react, react-dom, react, react-dom (+1 more)

### Community 29 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, @remotion/cli, @types/react, typescript, @types/react, typescript, @remotion/cli, @types/react (+1 more)

### Community 30 - "derive_running_left_from_running_right.py"
Cohesion: 0.50
Nodes (8): file_sha256(), find_job(), image_metadata(), job_list(), load_manifest(), main(), manifest_relative(), Path

### Community 31 - "extract_pptx.py"
Cohesion: 0.39
Nodes (8): color_repr(), emu_to_in(), extract_pptx(), extract_runs(), extract_shape(), main(), Path, Best-effort color extraction. Returns hex string or None.

### Community 32 - "asset-harvest.mjs"
Cohesion: 0.28
Nodes (3): downloadAll(), localPathFor(), safeName()

### Community 33 - "mapa.js"
Cohesion: 0.58
Nodes (8): Angulos(), creaCapasMarcadores(), creaMarcador(), creaMarcadorLluvia(), creaMarcadorTemperatura(), creaMarcadorViento(), procesarmapa(), rosadelosvientos()

### Community 34 - "remotion-template/package.json"
Cohesion: 0.25
Nodes (7): name, private, scripts, render:mov, render:webm, start, version

### Community 35 - "main"
Cohesion: 0.57
Nodes (7): completed_ids(), job_view(), jobs(), load_manifest(), main(), missing_deps(), Path

### Community 37 - "obsidian/.obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 38 - ".oxlintrc.json"
Cohesion: 0.25
Nodes (7): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, warn

### Community 39 - ".obsidian/app.json"
Cohesion: 0.25
Nodes (7): alwaysUpdateLinks, foldHeading, foldIndent, showFrontmatter, showLineNumber, tabSize, useMarkdownLinks

### Community 40 - "main"
Cohesion: 0.62
Nodes (6): default_codex_home(), main(), Path, slugify(), validate_spritesheet(), write_webp_spritesheet()

### Community 41 - "render_state"
Cohesion: 0.57
Nodes (6): checker(), main(), Image, Path, render_state(), shell_quote_for_concat()

### Community 42 - "install.sh"
Cohesion: 0.62
Nodes (6): cyan(), die(), gray(), green(), install_skill_to(), install.sh script

### Community 46 - "dependencies"
Cohesion: 0.29
Nodes (7): chart.js, dependencies, chart.js, lucide-react, react-chartjs-2, lucide-react, react-chartjs-2

### Community 47 - "MeteoPrecisaUser"
Cohesion: 0.33
Nodes (4): HttpUser, MeteoPrecisaUser, Locust Load Test Script para MeteoPrecisa API. Para ejecutar: pip install…, task

### Community 48 - "validate-skill-submission.sh"
Cohesion: 0.60
Nodes (5): escapes_root(), fail(), pass(), validate-skill-submission.sh script, warn()

### Community 49 - "verify"
Cohesion: 0.53
Nodes (5): emu_to_in(), is_footer_by_name(), main(), Path, verify()

### Community 50 - "SatelliteModal.jsx"
Cohesion: 0.60
Nodes (3): SatelliteModal(), WeatherHeader(), formatLocalTime()

### Community 51 - "discover-doc-gaps.sh"
Cohesion: 0.70
Nodes (4): emit_todo(), extract_links(), GREP(), discover-doc-gaps.sh script

### Community 54 - "DetailDrawer.jsx"
Cohesion: 0.60
Nodes (3): DetailDrawer(), EDUCATIONAL_METRICS, getEducationalInfo()

### Community 55 - "checker"
Cohesion: 0.67
Nodes (3): checker(), main(), Image

### Community 56 - "alpha_nonzero_count"
Cohesion: 0.67
Nodes (3): alpha_nonzero_count(), main(), Image

## Knowledge Gaps
- **99 isolated node(s):** `$schema`, `oxc`, `react/rules-of-hooks`, `warn`, `name` (+94 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `.oxlintrc.json`, `BubbleScene.tsx`, `SatelliteModal.jsx`, `WeatherContext.jsx`, `DetailDrawer.jsx`, `ChatMotionOverlay.tsx`, `LocationFallbackModal.jsx`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `frontend/package.json`, `devDependencies`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `frontend/package.json`, `dependencies`?**
  _High betweenness centrality (0.002) - this node is a cross-community bridge._
- **What connects `$schema`, `oxc`, `react/rules-of-hooks` to the rest of the system?**
  _99 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `main.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05817028027498678 - nodes in this community are weakly interconnected._
- **Should `sincronizador_background.py` be split into smaller, more focused modules?**
  _Cohesion score 0.08879492600422834 - nodes in this community are weakly interconnected._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.08412698412698413 - nodes in this community are weakly interconnected._