import React, { useState } from 'react';
import { Wind, Thermometer, Droplets, Sun, Activity, ShieldCheck, Sprout, Snowflake, CloudRain, Cpu, Gauge, Compass, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from 'lucide-react';

function MiniSparkline({ data = [12, 14, 15, 18, 17, 16, 15], color = "#38bdf8", height = 18, width = 50 }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data
    .map((val, idx) => {
      const x = idx * step;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible inline-block opacity-85 ml-auto">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function BreezyMetricsGrid({ modo, climaData, onSelectMetric, onOpenAqi }) {
  const [expandedKey, setExpandedKey] = useState(null);

  if (!climaData) return null;

  const { modo_urbano, modo_agricola, estacion, pronostico_numerico_openmeteo } = climaData;
  const stationId = estacion?.id || "dmc_oficial";
  const rawSourceUrl = estacion?.raw_source_url || "https://climatologia.meteochile.gob.cl";

  const daily = pronostico_numerico_openmeteo?.diario || pronostico_numerico_openmeteo?.diario_7dias || {};
  const tMaxTrend = daily.temperature_2m_max?.slice(0, 7) || [14, 16, 17, 18, 19, 18, 17];
  const humTrend = [65, 60, 55, 58, 62, 60, 58];
  const windTrend = [8, 12, 14, 10, 8, 11, 9];
  const etoTrend = [3.2, 3.5, 3.8, 3.6, 3.4, 3.5, 3.7];

  const toggleExpand = (key) => {
    setExpandedKey(prev => prev === key ? null : key);
  };

  if (modo === 'urbano') {
    const temp = modo_urbano?.temperatura_c ?? 18;
    const sens = modo_urbano?.sensacion_termica_c ?? temp;
    const hum = modo_urbano?.humedad_relativa_pct ?? 55;
    const wind = modo_urbano?.viento_kmh ?? 12;
    const windDir = modo_urbano?.viento_direccion_grados ?? 215;
    const press = modo_urbano?.presion_hpa ?? 1014;
    const uv = modo_urbano?.indice_uv ?? 5;
    const sinca = modo_urbano?.calidad_aire_sinca || {};
    const aqi = sinca.aqi || 25;
    const mp25 = sinca.mp25 || 12;

    return (
      <div className="space-y-4">
        {/* BANNER SINCA CALIDAD DEL AIRE CON EXPANSIÓN IN-SITU */}
        <div className="apple-card p-4 sm:p-5 border border-emerald-500/30 bg-emerald-950/20 backdrop-blur-2xl shadow-xl transition-all duration-300">
          <div
            onClick={() => toggleExpand('aqi')}
            className="flex items-center justify-between gap-4 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="font-extrabold text-white text-sm">
                  Calidad del Aire SINCA (MMA): <span className="text-emerald-300 font-mono font-bold">{sinca.categoria || 'Bueno'}</span> (AQI {aqi})
                </div>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  MP2.5: <strong className="font-mono text-emerald-400">{mp25} µg/m³</strong> • Toca para desplegar auditoría técnica
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="apple-pill text-[10px] text-emerald-300 font-bold bg-emerald-500/20 border-emerald-500/40">
                {expandedKey === 'aqi' ? 'Cerrar' : 'Ver Detalles'}
              </span>
              {expandedKey === 'aqi' ? <ChevronUp className="w-4 h-4 text-emerald-400" /> : <ChevronDown className="w-4 h-4 text-emerald-400" />}
            </div>
          </div>

          {/* PANEL EXPANDIDO IN-SITU DE CALIDAD DEL AIRE */}
          {expandedKey === 'aqi' && (
            <div className="mt-4 pt-4 border-t border-white/10 space-y-3 animate-apple-entry">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <div className="text-slate-400 font-bold">Norma Primaria Chilena (MMA)</div>
                  <div className="text-emerald-300 font-extrabold mt-0.5">{sinca.categoria || 'Bueno'} (0 - 50 µg/m³)</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <div className="text-slate-400 font-bold">Estándar OMS (24h)</div>
                  <div className="text-white font-extrabold mt-0.5">{mp25 <= 15 ? '✓ Cumple Límite OMS (15 µg/m³)' : '⚠ Supera Límite OMS'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <div className="text-slate-400 font-bold">Estación de Monitoreo</div>
                  <div className="text-sky-300 font-extrabold mt-0.5 font-mono">{sinca.estacion_nombre || estacion?.nombre}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* GRILLA BENTO DE MÉTRICAS URBANAS CON SPARKLINES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* TEMPERATURA */}
          <div
            onClick={() => toggleExpand('temp')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'temp' ? 'border-amber-400/60 bg-amber-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Temperatura</span>
              <MiniSparkline data={tMaxTrend} color="#fbbf24" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{temp}°C</div>
            <div className="text-[10px] text-slate-400">Sensación: <strong className="text-amber-300 font-mono font-bold">{sens}°C</strong></div>
          </div>

          {/* HUMEDAD RELATIVA */}
          <div
            onClick={() => toggleExpand('hum')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'hum' ? 'border-blue-400/60 bg-blue-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Humedad</span>
              <MiniSparkline data={humTrend} color="#60a5fa" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{hum}%</div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-blue-400 rounded-full transition-all duration-300" style={{ width: `${hum}%` }} />
            </div>
          </div>

          {/* VIENTO & DIRECCIÓN */}
          <div
            onClick={() => toggleExpand('wind')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'wind' ? 'border-sky-400/60 bg-sky-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Viento</span>
              <MiniSparkline data={windTrend} color="#38bdf8" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono flex items-center gap-1">
              <span>{wind}</span>
              <span className="text-xs font-sans text-slate-400 font-normal">km/h</span>
            </div>
            <div className="text-[10px] text-slate-400">Ángulo: <strong className="text-sky-300 font-mono font-bold">{windDir}°</strong></div>
          </div>

          {/* ÍNDICE UV */}
          <div
            onClick={() => toggleExpand('uv')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'uv' ? 'border-amber-400/60 bg-amber-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Índice UV</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono flex items-center gap-1.5">
              <span>{uv}</span>
              <span className="text-[11px] font-sans text-amber-300 font-bold">{uv >= 8 ? 'Extremo' : (uv >= 6 ? 'Alto' : 'Normal')}</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full transition-all duration-300" style={{ width: `${(uv / 12) * 100}%` }} />
            </div>
          </div>

          {/* PRESIÓN ATMOSFÉRICA */}
          <div
            onClick={() => toggleExpand('press')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'press' ? 'border-purple-400/60 bg-purple-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Presión</span>
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">{press} <span className="text-xs font-sans text-slate-400 font-normal">hPa</span></div>
            <div className="text-[10px] text-slate-400">Barómetro oficial</div>
          </div>

          {/* CALIDAD DEL AIRE AQI */}
          <div
            onClick={() => toggleExpand('aqi')}
            className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
              expandedKey === 'aqi' ? 'border-emerald-400/60 bg-emerald-950/20' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>AQI Aire</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-300 font-mono">{aqi}</div>
            <div className="text-[10px] text-slate-400">MP2.5: <strong className="text-emerald-400 font-mono font-bold">{mp25} µg</strong></div>
          </div>

        </div>

        {/* DETALLE IN-SITU EXPANDIBLE PARA MÉTRICAS SELECCIONADAS */}
        {expandedKey && expandedKey !== 'aqi' && (
          <div className="apple-card p-4 bg-slate-950/80 border border-white/10 animate-apple-entry text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="font-bold text-white uppercase tracking-wider text-[11px] text-sky-400">
                Auditoría Física OMM • Sensor: {estacion?.nombre} (ID: {stationId})
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Datos transmitidos por la red oficial {estacion?.red_oficial || 'DMC / INIA'}. Calibrados según norma WMO-No. 8.
              </p>
            </div>
            <button
              onClick={() => setExpandedKey(null)}
              className="apple-pill text-[10px] text-slate-400 hover:text-white"
            >
              Cerrar
            </button>
          </div>
        )}

      </div>
    );
  }

  // MODO AGRÍCOLA GEE (SENTINEL-2 10M & FAO-56)
  const eto = modo_agricola?.evapotranspiracion_eto_mm_dia ?? 3.8;
  const horasFrio = modo_agricola?.horas_frio_acumuladas_24h ?? 0;
  const ndvi = modo_agricola?.salud_vegetacion_ndvi ?? 0.62;
  const ndre = modo_agricola?.clorofila_nitrogino_ndre ?? 0.45;
  const ndwi = modo_agricola?.estres_hidrico_ndwi ?? 0.28;
  const vpd = modo_agricola?.deficit_presion_vapor_vpd_kpa ?? 0.95;
  const tSuelo = modo_agricola?.temperatura_suelo_10cm_c ?? 14.5;
  const lluvia = modo_agricola?.lluvia_caida_hoy_mm ?? 0.0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* EVAPOTRANSPIRACIÓN ETo */}
        <div
          onClick={() => toggleExpand('eto')}
          className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
            expandedKey === 'eto' ? 'border-emerald-400/60 bg-emerald-950/20' : 'bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Evapotranspiración ETo</span>
            <MiniSparkline data={etoTrend} color="#10b981" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">{eto} <span className="text-xs font-sans text-slate-400 font-normal">mm/día</span></div>
          <div className="text-[10px] text-emerald-300 font-bold font-mono">FAO-56 Penman-Monteith</div>
        </div>

        {/* SALUD VEGETAL NDVI */}
        <div
          onClick={() => toggleExpand('ndvi')}
          className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
            expandedKey === 'ndvi' ? 'border-teal-400/60 bg-teal-950/20' : 'bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>NDVI Vigor (10m)</span>
            <MiniSparkline data={[0.55, 0.58, 0.60, 0.61, 0.62, 0.62, 0.63]} color="#14b8a6" />
          </div>
          <div className="text-2xl font-extrabold text-teal-300 font-mono">{ndvi}</div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
            <div className="h-full bg-teal-400 rounded-full transition-all duration-300" style={{ width: `${ndvi * 100}%` }} />
          </div>
        </div>

        {/* CLOROFILA / NITRÓGENO NDRE */}
        <div
          onClick={() => toggleExpand('ndre')}
          className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
            expandedKey === 'ndre' ? 'border-green-400/60 bg-green-950/20' : 'bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>NDRE Nitrógeno</span>
            <MiniSparkline data={[0.40, 0.42, 0.44, 0.45, 0.45, 0.46, 0.45]} color="#22c55e" />
          </div>
          <div className="text-2xl font-extrabold text-green-300 font-mono">{ndre}</div>
          <div className="text-[10px] text-green-400 font-bold font-mono">Fertirriego Red-Edge</div>
        </div>

        {/* ESTRÉS HÍDRICO NDWI */}
        <div
          onClick={() => toggleExpand('ndwi')}
          className={`apple-card p-4 space-y-1.5 cursor-pointer transition hover:scale-105 backdrop-blur-2xl ${
            expandedKey === 'ndwi' ? 'border-cyan-400/60 bg-cyan-950/20' : 'bg-slate-900/50'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>NDWI Humedad Foliar</span>
            <MiniSparkline data={[0.22, 0.25, 0.26, 0.28, 0.28, 0.27, 0.28]} color="#06b6d4" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300 font-mono">{ndwi}</div>
          <div className="text-[10px] text-cyan-400 font-bold font-mono">Humedad de Hoja</div>
        </div>

      </div>

      {/* DETALLE IN-SITU EXPANDIBLE EN MODO AGRÍCOLA */}
      {expandedKey && (
        <div className="apple-card p-4 bg-slate-950/85 border border-emerald-500/30 animate-apple-entry text-xs text-slate-300 flex items-center justify-between">
          <div>
            <span className="font-bold text-white uppercase tracking-wider text-[11px] text-emerald-400">
              Índice Satelital Sentinel-2 (Copernicus ESA) • Resolución 10m
            </span>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Pixel analizado en coordenadas: {estacion?.coordenadas?.latitud?.toFixed(4)}, {estacion?.coordenadas?.longitud?.toFixed(4)} mediante Google Earth Engine.
            </p>
          </div>
          <button
            onClick={() => setExpandedKey(null)}
            className="apple-pill text-[10px] text-slate-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      )}

    </div>
  );
}
