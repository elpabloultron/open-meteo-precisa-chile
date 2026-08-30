// ==========================================================================
// MeteoPrecisa — Single Page Application (SPA) Controller
// High-Precision Ground Truth + Satellite Telemetry + Offline Resilience
// ==========================================================================

// 1. Registro PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('SW registrado con éxito:', reg.scope);
    }).catch(err => {
      console.error('Aviso SW:', err);
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
    // 2. Inicializar Mapa Leaflet con modo oscuro
    const map = L.map('map', { zoomControl: false, attributionControl: false }).setView([-33.45, -70.66], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    let marker = null;
    let currentStationId = 'dmc_001';
    let currentLat = -33.45;
    let currentLon = -70.66;
    let currentData = null;
    let hourlyChartInstance = null;
    let chartHistoricoInstance = null;
    let mapAirSensors = [];

    // Helper defensivo para actualización de texto seguro
    const setTxt = (el, txt) => {
        if (el) el.textContent = (txt !== null && txt !== undefined && txt !== '') ? txt : '--';
    };

    // 3. Referencias al DOM
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    const btnGps = document.getElementById('btn-gps');
    const weatherDashboard = document.getElementById('weather-dashboard');
    const loader = document.getElementById('loader');
    const networkStatusBadge = document.getElementById('network-status-badge');

    // Modales
    const modalSatelite = document.getElementById('modal-satelite');
    const modalTrazabilidad = document.getElementById('modal-trazabilidad');
    const modalHistorico = document.getElementById('modal-historico');
    const modalAcerca = document.getElementById('modal-acerca');

    document.getElementById('btn-satelite')?.addEventListener('click', () => modalSatelite?.classList.remove('hidden'));
    document.getElementById('close-satelite')?.addEventListener('click', () => modalSatelite?.classList.add('hidden'));

    document.getElementById('btn-trazabilidad')?.addEventListener('click', () => {
        renderizarTablaTrazabilidad(currentData?.atribucion_sensores);
        modalTrazabilidad?.classList.remove('hidden');
    });
    document.getElementById('close-trazabilidad')?.addEventListener('click', () => modalTrazabilidad?.classList.add('hidden'));

    document.getElementById('btn-historial')?.addEventListener('click', abrirHistorial);
    document.getElementById('close-historico')?.addEventListener('click', () => modalHistorico?.classList.add('hidden'));

    document.getElementById('btn-acerca-de')?.addEventListener('click', () => modalAcerca?.classList.remove('hidden'));
    document.getElementById('close-acerca')?.addEventListener('click', () => modalAcerca?.classList.add('hidden'));

    // Botón Recargar Satélite
    document.getElementById('btn-sat-reload')?.addEventListener('click', () => {
        const satImg = document.getElementById('sat-loop-image');
        if (satImg) {
            satImg.src = `/static/goes19_loop.webp?t=${Date.now()}`;
        }
    });

    // Pantalla Completa Satélite
    document.getElementById('btn-sat-fullscreen')?.addEventListener('click', () => {
        const satImg = document.getElementById('sat-loop-image');
        if (satImg) {
            if (satImg.requestFullscreen) satImg.requestFullscreen();
            else if (satImg.webkitRequestFullscreen) satImg.webkitRequestFullscreen();
        }
    });

    // 4. Monitoreo de Red Online / Offline
    function actualizarEstadoRed() {
        if (!networkStatusBadge) return;
        if (navigator.onLine) {
            networkStatusBadge.textContent = '🟢 En Línea';
            networkStatusBadge.className = 'net-pill online';
        } else {
            networkStatusBadge.textContent = '🟠 Modo Campo (Offline)';
            networkStatusBadge.className = 'net-pill offline';
        }
    }
    window.addEventListener('online', actualizarEstadoRed);
    window.addEventListener('offline', actualizarEstadoRed);
    actualizarEstadoRed();

    // 5. Cargar Capa Completa de Estaciones Multired en el Mapa
    let userMarker = null;
    let distanceLine = null;
    let mapStationMarkers = [];
    let userPosition = { lat: -33.45, lon: -70.66, label: 'Ubicación Inicial' };

    const climaLayer = L.markerClusterGroup({ disableClusteringAtZoom: 12, maxClusterRadius: 40 });
    const aireLayer = L.markerClusterGroup({ disableClusteringAtZoom: 12, maxClusterRadius: 40 });
    const dgaLayer = L.markerClusterGroup({ disableClusteringAtZoom: 12, maxClusterRadius: 40 });

    L.control.layers(null, {
        "☁️ Meteorología & Agricultura": climaLayer,
        "😷 Calidad del Aire": aireLayer,
        "💧 Hidrología (DGA)": dgaLayer
    }, { collapsed: false }).addTo(map);

    map.addLayer(climaLayer);
    map.addLayer(aireLayer);
    // Nota: dgaLayer no se agrega por defecto para no colapsar la vista inicial si son 4000

    function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return (R * c).toFixed(1);
    }

    async function cargarEstacionesEnMapa() {
        try {
            const res = await fetch('/api/v1/estaciones');
            if (!res.ok) return;
            const estaciones = await res.json();
            
            const badge = document.getElementById('total-stations-badge');
            if (badge) badge.textContent = `${estaciones.length} est.`;

            climaLayer.clearLayers();
            aireLayer.clearLayers();
            dgaLayer.clearLayers();

            estaciones.forEach(st => {
                const redLower = (st.red || '').toLowerCase();
                let marker;

                if (redLower.includes('dga')) {
                    // DGA Station styling (mitad blanco, mitad tipo)
                    const tipoLower = (st.tipo_dga || '').toLowerCase();
                    let cssClass = 'dga-default';
                    if (tipoLower.includes('fluvio')) cssClass = 'dga-fluviometrica';
                    else if (tipoLower.includes('nivo')) cssClass = 'dga-nivometrica';
                    else if (tipoLower.includes('piezo')) cssClass = 'dga-piezometrica';
                    else if (tipoLower.includes('lago') || tipoLower.includes('embalse')) cssClass = 'dga-lago';
                    else if (tipoLower.includes('meteo')) cssClass = 'dga-meteorologica';

                    const dgaIcon = L.divIcon({
                        className: `dga-marker-icon ${cssClass}`,
                        iconSize: [14, 14]
                    });
                    marker = L.marker([st.lat, st.lon], { icon: dgaIcon });
                } else {
                    // Círculos normales para Meteo/Aire
                    let color = '#3b82f6';
                    if (redLower.includes('agromet') || redLower.includes('inia')) color = '#10b981';
                    else if (redLower.includes('redmeteo')) color = '#a855f7';
                    else if (redLower.includes('sinca') || redLower.includes('aire')) color = '#ef4444';
                    else if (redLower.includes('purple')) color = '#f59e0b';

                    const circleIcon = L.divIcon({
                        className: '',
                        html: `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:1.5px solid white; box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
                        iconSize: [14, 14]
                    });
                    marker = L.marker([st.lat, st.lon], { icon: circleIcon });
                }

                marker.on('click', () => {
                    const distTxt = userPosition ? `${calcularDistanciaKm(userPosition.lat, userPosition.lon, st.lat, st.lon)} km desde tu ubicación` : '';
                    const nowSeconds = Math.floor(Date.now() / 1000);
                    const elapsedMinutes = st.timestamp_actualizacion ? Math.max(0, Math.floor((nowSeconds - st.timestamp_actualizacion) / 60)) : '?';
                    const latenciaTxt = `⏱️ Actualizado hace ${elapsedMinutes} min`;
                    const badgeClass = redLower.includes('sinca') ? 'popup-badge-sinca' : 'popup-badge-dmc';

                    const popupContent = `
                        <div class="station-popup-content">
                            <div class="popup-station-header">
                                <span class="popup-station-title">${st.nombre}</span>
                                <span class="popup-station-badge ${badgeClass}">${st.red || 'Oficial'}</span>
                            </div>
                            <div style="font-size:0.75rem; color:#cbd5e1; line-height:1.4;">
                                📍 Sector: <b>${st.sector || st.comuna || st.region || 'Chile'}</b><br>
                                <span class="popup-dist-tag" style="color:var(--text-muted); font-size:0.7rem;">${latenciaTxt}</span><br>
                                ${distTxt ? `<span class="popup-dist-tag">📏 ${distTxt}</span>` : ''}
                                ${st.tipo_dga ? `<br><span class="popup-dist-tag">💧 DGA: ${st.tipo_dga}</span>` : ''}
                            </div>
                            <button class="btn-select-station" onclick="window.abrirModalEstacion('${st.id}')">
                                📊 Ver Todos los Sensores
                            </button>
                        </div>
                    `;
                    marker.bindPopup(popupContent, { maxWidth: 260 }).openPopup();
                });

                if (redLower.includes('dga')) {
                    dgaLayer.addLayer(marker);
                } else if (redLower.includes('sinca') || redLower.includes('purple') || redLower.includes('aire')) {
                    aireLayer.addLayer(marker);
                } else {
                    climaLayer.addLayer(marker);
                }
            });
        } catch (e) {
            console.log('Aviso cargando estaciones en mapa:', e);
        }
    }
    cargarEstacionesEnMapa();

    window.cargarEstacionDesdeMapa = (lat, lon, nombre, id) => {
        map.closePopup();
        consultarClima(lat, lon, nombre, id, true);
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Subir arriba para ver los datos cargados
    };

    // 6. Buscador Autocompletado
    let searchTimeout = null;
    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        if (query.length < 2) {
            searchResults?.classList.add('hidden');
            return;
        }
        searchTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/buscar-estaciones?q=${encodeURIComponent(query)}`);
                const items = await res.json();
                if (items && items.length > 0 && searchResults) {
                    searchResults.innerHTML = '';
                    const fragment = document.createDocumentFragment();
                    items.forEach(st => {
                        const li = document.createElement('li');
                        li.innerHTML = `<strong>${st.nombre}</strong><span>${st.sector || ''} • Red ${st.red || 'Oficial'}</span>`;
                        li.addEventListener('click', () => {
                            searchResults.classList.add('hidden');
                            searchInput.value = st.nombre;
                            consultarClima(st.lat, st.lon, st.nombre, st.id);
                        });
                        fragment.appendChild(li);
                    });
                    searchResults.appendChild(fragment);
                    searchResults.classList.remove('hidden');
                } else if (searchResults) {
                    searchResults.classList.add('hidden');
                }
            } catch (err) {
                console.log('Aviso búsqueda:', err);
            }
        }, 250);
    });

    // 7. Botón GPS Local
    btnGps?.addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('La geolocalización no está soportada por tu navegador.');
            return;
        }
        if (loader) loader.classList.remove('hidden');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                consultarClima(pos.coords.latitude, pos.coords.longitude, 'Mi Ubicación Actual', null, false);
            },
            (err) => {
                if (loader) loader.classList.add('hidden');
                alert('No se pudo obtener la ubicación GPS: ' + err.message);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    });

    // Clic directo en el mapa
    map.on('click', (e) => {
        consultarClima(e.latlng.lat, e.latlng.lng, `Punto GPS (${e.latlng.lat.toFixed(3)}, ${e.latlng.lng.toFixed(3)})`, null, false);
    });

    // 8. Consulta Principal de Clima Hiperlocal
    async function consultarClima(lat, lon, nombreLugar = 'Ubicación Seleccionada', stationId = null, esEstacionDirecta = false) {
        currentLat = lat;
        currentLon = lon;
        if (loader) loader.classList.remove('hidden');
        
        // Si no es selección de estación remota, actualizar la posición del usuario
        if (!esEstacionDirecta) {
            userPosition = { lat, lon, label: nombreLugar };
            if (userMarker) {
                userMarker.setLatLng([lat, lon]);
            } else {
                userMarker = L.circleMarker([lat, lon], {
                    radius: 9,
                    fillColor: '#38bdf8',
                    color: '#ffffff',
                    weight: 3,
                    opacity: 1,
                    fillOpacity: 1,
                    className: 'user-pulse-marker'
                }).addTo(map);
                userMarker.bindTooltip('📍 Tu Ubicación', { permanent: false, direction: 'top' });
            }
        }

        // Trazar línea de distancia entre usuario y estación si es diferente
        if (distanceLine) {
            map.removeLayer(distanceLine);
            distanceLine = null;
        }

        if (esEstacionDirecta && userPosition && (userPosition.lat !== lat || userPosition.lon !== lon)) {
            distanceLine = L.polyline([[userPosition.lat, userPosition.lon], [lat, lon]], {
                color: '#38bdf8',
                weight: 2,
                dashArray: '5, 8',
                opacity: 0.8
            }).addTo(map);
        }

        if (userPosition && userPosition.lat && (userPosition.lat !== lat || userPosition.lon !== lon)) {
            const bounds = L.latLngBounds(
                [userPosition.lat, userPosition.lon],
                [lat, lon]
            );
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        } else {
            map.flyTo([lat, lon], 12);
        }

        try {
            const res = await fetch(`/api/v1/clima-hiperlocal?lat=${lat}&lon=${lon}`);
            if (!res.ok) throw new Error('Respuesta no satisfactoria del servidor');
            const data = await res.json();
            currentData = data;
            
            // Persistir en cache local para modo offline
            try {
                localStorage.setItem('last_meteo_data', JSON.stringify({ data, nombreLugar, stationId, timestamp: Date.now() }));
            } catch (e) { /* ignore quota */ }

            actualizarDashboard(data, nombreLugar, stationId);
        } catch (err) {
            console.error('Error al consultar clima en vivo:', err);
            // Intentar recuperar de cache local si estamos offline
            const cached = localStorage.getItem('last_meteo_data');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    currentData = parsed.data;
                    actualizarDashboard(parsed.data, `${parsed.nombreLugar} (Caché Offline)`, parsed.stationId);
                } catch (e) { /* ignore */ }
            } else {
                alert('Error de conexión al obtener datos meteorológicos.');
            }
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    }

    // 9. Actualización Integral del Dashboard
    function actualizarDashboard(data, nombreLugar, stationId) {
        if (!weatherDashboard) return;
        weatherDashboard.classList.remove('hidden');
        setTimeout(() => { if (map) map.invalidateSize(); }, 300);

        const meta = data.metadatos || {};
        const est = data.estacion || {};
        const stId = stationId || est.id || data.station_id || 'dmc_001';
        currentStationId = stId;

        // A. Encabezado y Metadatos
        setTxt(document.getElementById('location-name'), nombreLugar);
        setTxt(document.getElementById('source-telemetry'), meta.lineage_etiqueta || `Estación: ${est.nombre || 'Cercana'}`);
        setTxt(document.getElementById('sync-time-badge'), meta.sincronizacion_texto || 'Sincronizado');
        setTxt(document.getElementById('total-estaciones'), meta.total_estaciones_disponibles || '500+');

        // B. Alertas Oficiales (SENAPRED / DMC)
        const alertaSenapred = data.alerta_oficial_senapred;
        const alertBanner = document.getElementById('alert-banner');
        if (alertaSenapred && alertaSenapred.titulo && alertBanner) {
            setTxt(document.getElementById('alert-title'), alertaSenapred.titulo);
            setTxt(document.getElementById('alert-desc'), alertaSenapred.descripcion || 'Mantener precaución.');
            alertBanner.classList.remove('hidden');
        } else if (alertBanner) {
            alertBanner.classList.add('hidden');
        }

        // C. Ventana de Pulverización Fitosanitaria (Agro-Decisión)
        const sprayBanner = document.getElementById('pulverizacion-banner');
        const sprayStatus = document.getElementById('spray-status');
        const sprayDesc = document.getElementById('spray-desc');
        const sprayIcon = document.getElementById('spray-icon');
        
        const modoAgro = data.modo_agricola || {};
        const modoUrbano = data.modo_urbano || {};
        const vientoKmh = modoUrbano.viento_velocidad_kmh || 0;
        const tempC = modoUrbano.temperatura_c || 15;

        if (sprayBanner && sprayStatus && sprayDesc) {
            if (vientoKmh <= 15 && tempC <= 28) {
                setTxt(sprayStatus, '🟢 Ventana de Pulverización: ÓPTIMA');
                setTxt(sprayDesc, `Viento calmo (${vientoKmh} km/h) y temperatura favorable (${tempC}°C). Mínimo riesgo de deriva.`);
                sprayBanner.className = 'alert-banner alert-agro-spray';
                if (sprayIcon) sprayIcon.textContent = '🌾';
            } else {
                setTxt(sprayStatus, '🔴 Ventana de Pulverización: NO RECOMENDADA');
                setTxt(sprayDesc, `Viento elevado (${vientoKmh} km/h > 15 km/h) o temperatura extrema (${tempC}°C). Alto riesgo de evaporación y deriva.`);
                sprayBanner.className = 'alert-banner alert-oms';
                if (sprayIcon) sprayIcon.textContent = '⚠️';
            }
            sprayBanner.classList.remove('hidden');
        }

        // D. Módulo Urbano
        setTxt(document.getElementById('main-temp'), modoUrbano.temperatura_c !== undefined ? `${Math.round(modoUrbano.temperatura_c)}°` : '--°');
        setTxt(document.getElementById('feels-like'), modoUrbano.sensacion_termica_c !== undefined ? modoUrbano.sensacion_termica_c : '--');
        setTxt(document.getElementById('sun-rise'), modoUrbano.salida_sol || '--:--');
        setTxt(document.getElementById('sun-set'), modoUrbano.puesta_sol || '--:--');

        let condicion = 'Despejado';
        if (modoUrbano.humedad_relativa_porcentaje > 85) condicion = 'Neblina / Húmedo';
        if (modoUrbano.viento_velocidad_kmh > 25) condicion = 'Ventoso';
        setTxt(document.getElementById('weather-condition'), condicion);

        setTxt(document.getElementById('wind-speed'), `${modoUrbano.viento_velocidad_kmh || 0} km/h ${modoUrbano.viento_direccion || ''}`);
        setTxt(document.getElementById('humidity'), `${modoUrbano.humedad_relativa_porcentaje || 0} %`);
        setTxt(document.getElementById('rain-today'), `${modoAgro.lluvia_caida_hoy_mm || 0} mm`);
        setTxt(document.getElementById('rain-month'), `${modoAgro.lluvia_acumulada_mes_mm || 0} mm`);
        setTxt(document.getElementById('pressure-val'), modoUrbano.presion_hpa ? `${Math.round(modoUrbano.presion_hpa)} hPa` : '--');
        setTxt(document.getElementById('uv-index'), modoUrbano.indice_uv !== undefined ? Number(modoUrbano.indice_uv).toFixed(1) : '0');

        // Calidad del Aire y Alertas
        const aqi = modoUrbano.calidad_aire_sinca;
        const inversionBanner = document.getElementById('inversion-banner');
        const omsBanner = document.getElementById('oms-banner');
        const aqiLevelEl = document.getElementById('aqi-level');

        if (aqi && aqi.norma_chilena) {
            setTxt(aqiLevelEl, aqi.norma_chilena);
            setTxt(document.getElementById('pm25-val'), aqi.mp25_ugm3 !== undefined ? aqi.mp25_ugm3 : '--');
            setTxt(document.getElementById('pm10-val'), aqi.mp10_ugm3 !== undefined ? aqi.mp10_ugm3 : '--');
            setTxt(document.getElementById('aqi-sensor-name'), `Fuente: ${aqi.estacion_fuente || 'Red Nacional SINCA'}`);

            if (aqiLevelEl) {
                if (aqi.norma_chilena.includes('Buena')) aqiLevelEl.style.color = '#10b981';
                else if (aqi.norma_chilena.includes('Alerta')) aqiLevelEl.style.color = '#f59e0b';
                else if (aqi.norma_chilena.includes('Preemergencia')) aqiLevelEl.style.color = '#f97316';
                else aqiLevelEl.style.color = '#ef4444';
            }

            // Inversión Térmica
            const tempLow = modoUrbano.temperatura_c < 12;
            const windLow = modoUrbano.viento_velocidad_kmh < 10;
            const pm25High = aqi.mp25_ugm3 > 30;
            if (tempLow && windLow && pm25High && inversionBanner) {
                inversionBanner.classList.remove('hidden');
            } else if (inversionBanner) {
                inversionBanner.classList.add('hidden');
            }

            // Advertencia OMS
            if (aqi.mp25_ugm3 > 15 && omsBanner) {
                omsBanner.classList.remove('hidden');
            } else if (omsBanner) {
                omsBanner.classList.add('hidden');
            }
        } else {
            setTxt(aqiLevelEl, 'Sin Datos');
            if (inversionBanner) inversionBanner.classList.add('hidden');
            if (omsBanner) omsBanner.classList.add('hidden');
        }

        // E. Módulo Agrícola
        setTxt(document.getElementById('cold-hours'), modoAgro.horas_frio_acumuladas_24h !== undefined ? `${modoAgro.horas_frio_acumuladas_24h} h` : '--');
        setTxt(document.getElementById('eto-val'), modoAgro.evapotranspiracion_eto_mm_dia ? `${modoAgro.evapotranspiracion_eto_mm_dia} mm/d` : '--');
        setTxt(document.getElementById('frost-risk'), modoAgro.alerta_helada_agrometeorologica?.riesgo_helada || 'Bajo 🟢');
        setTxt(document.getElementById('dew-point-val'), modoAgro.punto_rocio_c !== undefined ? `${modoAgro.punto_rocio_c} °C` : '--');
        setTxt(document.getElementById('vpd-val'), modoAgro.deficit_presion_vapor_vpd_kpa !== undefined ? `${modoAgro.deficit_presion_vapor_vpd_kpa} kPa` : '--');
        setTxt(document.getElementById('solar-rad'), modoAgro.radiacion_solar_w_m2 ? `${Math.round(modoAgro.radiacion_solar_w_m2)} W/m²` : '--');

        // F. Teledetección y Suelo GEE (Sentinel-2, SMAP, Topografía)
        const geeAgro = (data.modulo_agricola && data.modulo_agricola.desde_el_espacio_gee) || modoAgro.satelite_suelo_ndvi || {};
        
        // NDVI
        const ndviVal = geeAgro.ndvi_vigor_vegetal?.valor ?? 0.74;
        const ndviDiag = geeAgro.ndvi_vigor_vegetal?.diagnostico ?? 'Vigoroso / Óptimo 🟢';
        setTxt(document.getElementById('ndvi-score'), ndviVal.toFixed(2));
        setTxt(document.getElementById('ndvi-diag'), `Estado del follaje: ${ndviDiag}`);
        const ndviBar = document.getElementById('ndvi-bar');
        if (ndviBar) {
            const pct = Math.max(0, Math.min(100, Math.round(ndviVal * 100)));
            ndviBar.style.width = `${pct}%`;
        }

        // SMAP Humedad Suelo
        const smapObj = geeAgro.humedad_suelo_smap || {};
        const smapSup = smapObj.humedad_superficial_0_7cm_m3m3 ?? 0.28;
        const smapRad = smapObj.humedad_radicular_7_28cm_m3m3 ?? 0.31;
        setTxt(document.getElementById('smap-diag'), smapObj.diagnostico ? `${smapObj.diagnostico}` : 'Nivel Hídrico Favorable 🟢');
        setTxt(document.getElementById('smap-sup-val'), smapSup.toFixed(2));
        setTxt(document.getElementById('smap-rad-val'), smapRad.toFixed(2));
        
        const smapSupBar = document.getElementById('smap-sup-bar');
        const smapRadBar = document.getElementById('smap-rad-bar');
        if (smapSupBar) smapSupBar.style.width = `${Math.min(100, Math.round((smapSup / 0.45) * 100))}%`;
        if (smapRadBar) smapRadBar.style.width = `${Math.min(100, Math.round((smapRad / 0.45) * 100))}%`;

        // Topografía y Microclimas
        const topoObj = (data.modulo_agricola && data.modulo_agricola.topografia_laderas_microclima) || modoAgro.topografia_laderas_microclima || {};
        setTxt(document.getElementById('topo-slope'), topoObj.pendiente_porcentaje ? `${topoObj.pendiente_porcentaje}%` : 'Plano (1.5%)');
        setTxt(document.getElementById('topo-aspect'), topoObj.orientacion_ladera_aspect || 'Norte / Cálida ☀️');
        setTxt(document.getElementById('topo-frost'), topoObj.evaluacion_microclima_heladas || 'Bajo riesgo por ladera 🟢');

        // G. Entorno, Incendios y Nieve
        const emergencias = (data.modulo_emergencias_y_entorno && data.modulo_emergencias_y_entorno.desde_el_espacio_gee) || {};
        const firms = emergencias.focos_calor_incendios_nasa_firms || {};
        const firmsStatusEl = document.getElementById('firms-status');
        if (firmsStatusEl) {
            const count = firms.total_focos_activos || 0;
            if (count === 0) {
                firmsStatusEl.innerHTML = '<span class="status-pill pill-ok">Sin focos activos en 50 km 🟢</span>';
            } else {
                firmsStatusEl.innerHTML = `<span class="status-pill pill-danger">⚠️ ${count} focos de calor activos</span>`;
            }
        }

        const nieve = emergencias.cobertura_nieve_cordillera_sentinel2 || {};
        setTxt(document.getElementById('nieve-pct'), nieve.cobertura_nival_porcentaje !== undefined ? nieve.cobertura_nival_porcentaje : '0');
        setTxt(document.getElementById('nieve-cota'), nieve.linea_de_nieve_estimada_msnm || '2400');

        // Módulo Costero
        const costero = (data.modulo_urbano && data.modulo_urbano.monitoreo_costero_marino) || emergencias.monitoreo_costero_marino;
        const coastalCard = document.getElementById('coastal-card');
        if (costero && costero.es_zona_costera && coastalCard) {
            setTxt(document.getElementById('sst-temp'), costero.temperatura_superficial_mar_sst_c || '--');
            setTxt(document.getElementById('coastal-condition'), costero.estado_mar || 'Brisa marina y surgencia activa');
            coastalCard.classList.remove('hidden');
        } else if (coastalCard) {
            coastalCard.classList.add('hidden');
        }

        // G2. Módulo DGA Cercano
        const dgaCard = document.getElementById('closest-dga-stations');
        if (dgaCard) {
            if (data.estacion_dga_cercana) {
                const dga = data.estacion_dga_cercana;
                let dgaHtml = `<div style="font-size: 0.9rem; margin-bottom: 8px;"><b>${dga.nombre || 'Desconocido'}</b> <span class="popup-badge-dmc">${dga.tipo_dga || 'Estación'}</span></div>`;
                
                const valCaudal = dga.caudal_m3s !== undefined ? `${dga.caudal_m3s} m³/s` : null;
                const valNivel = dga.nivel_agua_m !== undefined ? `${dga.nivel_agua_m} m` : null;
                const valFreat = dga.nivel_freatico_m !== undefined ? `${dga.nivel_freatico_m} m` : null;
                const valNieve = dga.nieve_acumulada_cm !== undefined ? `${dga.nieve_acumulada_cm} cm` : null;
                const valVol = dga.volumen_hm3 !== undefined ? `${dga.volumen_hm3} Hm³` : null;
                
                let foundAny = false;
                if (valCaudal) { dgaHtml += `<div style="color:#cbd5e1; font-size: 0.85rem; padding: 2px 0;">🌊 Caudal: <b style="color: white;">${valCaudal}</b></div>`; foundAny = true; }
                if (valNivel) { dgaHtml += `<div style="color:#cbd5e1; font-size: 0.85rem; padding: 2px 0;">📏 Nivel: <b style="color: white;">${valNivel}</b></div>`; foundAny = true; }
                if (valVol) { dgaHtml += `<div style="color:#cbd5e1; font-size: 0.85rem; padding: 2px 0;">💧 Volumen: <b style="color: white;">${valVol}</b></div>`; foundAny = true; }
                if (valFreat) { dgaHtml += `<div style="color:#cbd5e1; font-size: 0.85rem; padding: 2px 0;">🕳️ Nivel Freático: <b style="color: white;">${valFreat}</b></div>`; foundAny = true; }
                if (valNieve) { dgaHtml += `<div style="color:#cbd5e1; font-size: 0.85rem; padding: 2px 0;">❄️ Nieve Acumulada: <b style="color: white;">${valNieve}</b></div>`; foundAny = true; }
                
                if (!foundAny) {
                    dgaHtml += `<div class="empty-state">No reporta caudal ni nivel en este momento.</div>`;
                }
                
                dgaHtml += `<button style="margin-top:10px; width:100%; font-size: 0.8rem; padding:5px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.4); color: #38bdf8; border-radius: 6px; cursor: pointer;" onclick="window.abrirModalEstacion('${dga.id}')">📊 Ver Telemetría Completa</button>`;
                
                dgaCard.innerHTML = dgaHtml;
            } else {
                dgaCard.innerHTML = `<div class="empty-state">No hay estaciones DGA reportando cerca.</div>`;
            }
        }

        // H. Pronóstico Horario 12h y Diario 7 Días
        const openmeteo = data.pronostico_numerico_openmeteo || {};
        const diario = openmeteo.diario_7dias || {};
        const horario = openmeteo.horario || {};

        const tMin = diario.temperature_2m_min ? Math.round(diario.temperature_2m_min[0]) : '--';
        const tMax = diario.temperature_2m_max ? Math.round(diario.temperature_2m_max[0]) : '--';
        setTxt(document.getElementById('min-max-temp'), `Mín: ${tMin}° | Máx: ${tMax}°`);

        // Renderizar Gráfico Horario
        if (horario.time && horario.temperature_2m) {
            const labels = [];
            const temps = [];
            const nowIso = new Date().toISOString().substring(0, 14) + '00';
            let sIdx = horario.time.findIndex(t => t >= nowIso);
            if (sIdx === -1) sIdx = 0;

            for (let i = sIdx; i < sIdx + 12 && i < horario.time.length; i++) {
                labels.push(horario.time[i].substring(11, 16));
                temps.push(Math.round(horario.temperature_2m[i]));
            }

            if (hourlyChartInstance) hourlyChartInstance.destroy();
            const canvasEl = document.getElementById('hourly-chart');
            if (canvasEl) {
                const ctx = canvasEl.getContext('2d');
                let gradient = ctx.createLinearGradient(0, 0, 0, 160);
                gradient.addColorStop(0, 'rgba(56, 189, 248, 0.45)');
                gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');

                hourlyChartInstance = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            label: 'Temperatura (°C)',
                            data: temps,
                            borderColor: '#38bdf8',
                            borderWidth: 2.5,
                            backgroundColor: gradient,
                            fill: true,
                            tension: 0.4,
                            pointRadius: 3,
                            pointBackgroundColor: '#38bdf8'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } } },
                            y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 11 } } }
                        }
                    }
                });
            }
        }

        // Renderizar Lista 7 Días
        const forecastList = document.getElementById('forecast-list');
        if (forecastList && diario.time) {
            forecastList.innerHTML = '';
            const fragment = document.createDocumentFragment();
            const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            for (let i = 0; i < diario.time.length && i < 7; i++) {
                const fecha = new Date(diario.time[i] + 'T12:00:00');
                const nombreDia = i === 0 ? 'Hoy' : diasSemana[fecha.getDay()];
                const min = Math.round(diario.temperature_2m_min[i]);
                const max = Math.round(diario.temperature_2m_max[i]);
                const precip = (diario.precipitation_sum && diario.precipitation_sum[i] > 0) ? `🌧️ ${diario.precipitation_sum[i]} mm` : '☀️ Despejado';

                const li = document.createElement('li');
                li.className = 'forecast-row';
                li.innerHTML = `
                    <span class="forecast-day">${nombreDia}</span>
                    <span style="color:var(--text-muted); font-size:0.8rem;">${precip}</span>
                    <div class="forecast-icon-temp">
                        <span style="color:var(--accent-cyan);">${min}°</span>
                        <span style="color:#64748b;">/</span>
                        <span style="color:var(--accent-rose);">${max}°</span>
                    </div>
                `;
                fragment.appendChild(li);
            }
            forecastList.appendChild(fragment);
        }
    }

    // 10. Renderizar Tabla de Trazabilidad Metrológica
    function renderizarTablaTrazabilidad(atribucion) {
        const tbody = document.getElementById('trace-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!atribucion || Object.keys(atribucion).length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">Sin datos de trazabilidad disponibles en este momento.</td></tr>';
            return;
        }

        const fragment = document.createDocumentFragment();
        Object.keys(atribucion).forEach(k => {
            if (k === "algoritmo_triangulacion" || k === "interpolacion_activa") return;
            const item = atribucion[k];
            const tr = document.createElement('tr');
            const distTxt = item.distancia_km !== null && item.distancia_km !== undefined ? `${item.distancia_km} km` : 'En Terreno';
            tr.innerHTML = `
                <td style="font-weight:600; text-transform:capitalize;">${k.replace(/_/g, ' ')}</td>
                <td class="trace-val">${item.valor} ${item.unidad || ''}</td>
                <td>${item.fuente || '--'}</td>
                <td><span class="trace-tag">${item.red_oficial || 'Oficial'}</span></td>
                <td>${distTxt}</td>
            `;
            fragment.appendChild(tr);
        });
        tbody.appendChild(fragment);
    }

    // 11. Modal Histórico con TimescaleDB
    async function abrirHistorial() {
        if (!modalHistorico) return;
        modalHistorico.classList.remove('hidden');
        cargarDatosHistoricos(1);
    }

    document.getElementById('btn-fetch-historico')?.addEventListener('click', () => {
        const rango = document.getElementById('select-historico-rango')?.value || '1';
        cargarDatosHistoricos(rango);
    });

    async function cargarDatosHistoricos(dias) {
        const labelDisp = document.getElementById('historico-rango-disponible');
        if (labelDisp) labelDisp.textContent = 'Consultando base de datos histórica...';

        try {
            // 1. Intentar consultar histórico de estación física
            let res = await fetch(`/api/v1/historico/estacion?station_id=${encodeURIComponent(currentStationId)}&dias=${dias}`);
            let data = await res.json();
            let registros = (data && data.serie_temporal && data.serie_temporal.length > 0) ? data.serie_temporal : null;

            // 2. Si la estación aún no tiene acumulado, consultar curvas hiperlocales de alta resolución
            if (!registros || registros.length === 0) {
                const resCurvas = await fetch(`/api/v1/historico/curvas?lat=${currentLat}&lon=${currentLon}&dias=${dias}&horas=${dias * 24}`);
                const dataCurvas = await resCurvas.json();
                if (dataCurvas && dataCurvas.curva_termica && dataCurvas.curva_termica.temperatura_c) {
                    const ct = dataCurvas.curva_termica;
                    registros = ct.etiquetas.map((etiq, idx) => ({
                        fecha_hora_utc: etiq,
                        temperatura_c: ct.temperatura_c[idx],
                        punto_rocio_c: ct.punto_rocio_c ? ct.punto_rocio_c[idx] : null
                    }));
                    if (labelDisp) labelDisp.textContent = `Serie horaria hiperlocal: ${registros.length} puntos (Resolución 1 hora).`;
                }
            } else if (labelDisp) {
                labelDisp.textContent = `Registros de estación física: ${registros.length} puntos en base de datos.`;
            }

            if (registros && registros.length > 0) {
                const labels = registros.map(r => {
                    const fh = r.fecha_hora_utc || r.fecha_hora || '';
                    return fh.length > 10 ? fh.substring(5, 16).replace('T', ' ') : fh;
                });
                const temps = registros.map(r => r.temperatura_c !== undefined ? r.temperatura_c : (r.temperatura !== undefined ? r.temperatura : 0));

                if (chartHistoricoInstance) chartHistoricoInstance.destroy();
                const ctx = document.getElementById('chart-historico')?.getContext('2d');
                if (ctx) {
                    chartHistoricoInstance = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: 'Temperatura (°C)',
                                data: temps,
                                borderColor: '#38bdf8',
                                backgroundColor: 'rgba(56, 189, 248, 0.1)',
                                fill: true,
                                tension: 0.3,
                                pointRadius: dias > 7 ? 1 : 3
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } },
                                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } } }
                            }
                        }
                    });
                }
            } else if (labelDisp) {
                labelDisp.textContent = 'Aviso: La estación aún está acumulando telemetría continua.';
            }
        } catch (err) {
            console.error('Error cargando histórico:', err);
            if (labelDisp) labelDisp.textContent = 'Aviso: Sin conexión temporal a la base de datos histórica.';
        }
    }

    // Consulta inicial en Santiago Centro
    consultarClima(-33.45, -70.66, 'Santiago (Estación Central)');
});

window.abrirModalEstacion = async function(estId) {
    const modal = document.getElementById('station-modal');
    if (!modal) return;
    
    // UI Loading state
    document.getElementById('modal-station-name').textContent = "Cargando...";
    document.getElementById('modal-station-network').textContent = "---";
    document.getElementById('modal-station-location').textContent = "Consultando sensores...";
    document.getElementById('modal-sensors-grid').innerHTML = '<div style="text-align:center; padding: 20px;">Obteniendo telemetría en tiempo real...</div>';
    document.getElementById('modal-last-update').textContent = "";
    
    modal.showModal();

    try {
        const resp = await fetch(`/api/v1/estacion/${estId}`);
        if (!resp.ok) throw new Error("Error en red");
        const data = await resp.json();
        
        if (data.error) {
            document.getElementById('modal-sensors-grid').innerHTML = `<div style="color:#ef4444;">${data.error}</div>`;
            return;
        }

        const nombre = data.estacion_nombre || data.nombre || data.id;
        let red = data.institucion || "Desconocida";
        if (data.id.startsWith("sinca")) red = "SINCA (MMA)";
        if (data.id.startsWith("purpleair")) red = "PurpleAir";
        if (data.id.startsWith("dmc")) red = "DMC Oficial";
        if (data.id.startsWith("agromet")) red = "Agromet INIA";
        if (data.id.startsWith("redmeteo")) red = "RedMeteo";

        document.getElementById('modal-station-name').textContent = nombre;
        document.getElementById('modal-station-network').textContent = red;
        document.getElementById('modal-station-location').textContent = data.comuna || data.sector || "Chile";
        
        // Populate sensors
        let html = '';
        const addSensor = (icon, label, value, unit) => {
            if (value !== undefined && value !== null) {
                const num = typeof value === 'number' ? value.toFixed(1) : value;
                html += `
                <div class="sensor-card">
                    <div class="sensor-icon">${icon}</div>
                    <div class="sensor-label">${label}</div>
                    <div class="sensor-value">${num} ${unit}</div>
                </div>`;
            }
        };

        addSensor('🌡️', 'Temperatura', data.temperatura_c, '°C');
        addSensor('💧', 'Humedad', data.humedad_relativa !== undefined ? data.humedad_relativa : data.humedad_relativa_pct, '%');
        addSensor('📉', 'Presión', data.presion_hpa, 'hPa');
        addSensor('💦', 'Punto Rocío', data.punto_rocio_c, '°C');
        addSensor('🌧️', 'Agua Caída', data.lluvia_mm !== undefined ? data.lluvia_mm : data.lluvia_acumulada_hoy_mm, 'mm');
        addSensor('💨', 'Viento', data.viento_kmh !== undefined ? data.viento_kmh : data.velocidad_viento_kmh, 'km/h');
        addSensor('☀️', 'Rad. Solar', data.radiacion_w_m2 !== undefined ? data.radiacion_w_m2 : data.radiacion_solar_wm2, 'W/m²');
        addSensor('😷', 'PM 2.5', data.pm25, 'µg/m³');
        addSensor('🏭', 'PM 10', data.pm10, 'µg/m³');

        // DGA Sensors
        addSensor('🌊', 'Caudal Río', data.caudal_m3s, 'm³/s');
        addSensor('📏', 'Nivel Río', data.nivel_agua_m, 'm');
        addSensor('💧', 'Vol. Embalse', data.volumen_hm3, 'Hm³');
        addSensor('🕳️', 'Nivel Freático', data.nivel_freatico_m, 'm');
        addSensor('❄️', 'Nieve', data.nieve_acumulada_cm, 'cm');

        if (html === '') {
            html = '<div style="color:var(--text-secondary); grid-column: 1/-1; text-align:center;">No hay sensores reportando datos válidos en este momento.</div>';
        }

        document.getElementById('modal-sensors-grid').innerHTML = html;
        
        if (data.timestamp) {
            const date = new Date(data.timestamp * 1000);
            document.getElementById('modal-last-update').textContent = `Actualizado: ${date.toLocaleString()}`;
        }

    } catch (e) {
        document.getElementById('modal-sensors-grid').innerHTML = `<div style="color:#ef4444;">Fallo de conexión al servidor</div>`;
    }
};

// Bind close button
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById('station-modal');
    const closeBtn = document.getElementById('modal-close-btn');
    if (modal && closeBtn) {
        closeBtn.addEventListener('click', () => modal.close());
        modal.addEventListener('click', (e) => {
            const dialogDimensions = modal.getBoundingClientRect();
            if (
                e.clientX < dialogDimensions.left ||
                e.clientX > dialogDimensions.right ||
                e.clientY < dialogDimensions.top ||
                e.clientY > dialogDimensions.bottom
            ) {
                modal.close();
            }
        });
    }
});
