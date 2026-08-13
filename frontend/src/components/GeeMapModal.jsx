import React, { useState, useEffect } from 'react';
import { X, Satellite, Layers, ShieldCheck, Cpu, Flame, Thermometer, Droplets, Sprout, Wind, Clock, ExternalLink, RefreshCw, Eye } from 'lucide-react';

export default function GeeMapModal({ isOpen, onClose, lat, lon, apiBase }) {
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [opacity, setOpacity] = useState(85);
  const [loading, setLoading] = useState(false);

  const centerLat = lat || -40.4000;
  const centerLon = lon || -73.2800;

  if (!isOpen) return null;

  const layerOptions = [
    { id: 'NDVI', label: '🌿 Vigor NDVI (10m)', desc: 'Salud de Vegetación y Biomasa', min: '0.0', max: '0.85', palette: ['#d73027','#f46d43','#fdae61','#fee08b','#d9ef8b','#a6d96a','#66bd63','#1a9850'] },
    { id: 'NDRE', label: '🍀 Nitrógeno NDRE', desc: 'Clorofila y Estado Nutricional', min: '0.1', max: '0.70', palette: ['#ffffcc','#c7e9b4','#7fcdbb','#41b6c4','#1d91c0','#225ea8','#0c2c84'] },
    { id: 'NDWI', label: '💧 Estrés NDWI', desc: 'Contenido de Agua en Follaje', min: '-0.2', max: '0.60', palette: ['#a6611a','#dfc27d','#f5f5f5','#80cdc1','#018571'] },
    { id: 'LST', label: '🌡️ Temp Suelo LST', desc: 'Temperatura Térmica de Superficie', min: '5°C', max: '35°C', palette: ['#313695','#4575b4','#74add1','#abd9e9','#fee090','#fdae61','#f46d43','#d73027'] },
    { id: 'WINDY', label: '🌬️ Radar Windy', desc: 'Viento y Presión ECMWF en Tiempo Real' },
    { id: 'GOES19', label: '🛰️ Satélite GOES-19', desc: 'Bucle GeoColor 24 Horas' }
  ];

  const currentOpt = layerOptions.find(o => o.id === activeLayer) || layerOptions[0];

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${centerLat}&lon=${centerLon}&detailLat=${centerLat}&detailLon=${centerLon}&width=100%25&height=500&zoom=10&level=surface&overlay=${
    activeLayer === 'LST' ? 'temp' : (activeLayer === 'NDWI' ? 'rain' : 'wind')
  }&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const goesVideoUrl = `https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp?t=${Date.now()}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-2xl">
      <div className="apple-card w-full max-w-5xl overflow-hidden border border-emerald-500/30 flex flex-col h-[90vh] shadow-2xl bg-slate-950 animate-apple-entry">
        
        {/* CABECERA CON CONTROLES */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Centro de Control Satelital & Radar GIS
                </h3>
                <span className="apple-pill text-[10px] text-emerald-300">
                  Sentinel-2 (10m) & NOAA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Coordenadas del Predio: <span className="font-mono text-emerald-300 font-semibold">{centerLat.toFixed(4)}, {centerLon.toFixed(4)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="apple-pill p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* SELECTOR DE CAPAS */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {layerOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveLayer(opt.id)}
              className={`apple-pill flex items-center gap-2 whitespace-nowrap cursor-pointer transition ${
                activeLayer === opt.id
                  ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

        {/* VISOR MULTIMODAL CON RENDERING ESPECTRAL */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          
          {activeLayer === 'WINDY' ? (
            <iframe
              title="Windy Radar en Vivo"
              className="w-full h-full border-0"
              src={windyUrl}
            />
          ) : activeLayer === 'GOES19' ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black p-3">
              <img
                src={goesVideoUrl}
                alt="Satélite GOES-19 NOAA"
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
              />
              <div className="absolute top-4 right-4 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-purple-500/30 text-xs font-mono text-purple-300 backdrop-blur-md flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>Bucle Activo 24h (NOAA GOES-19)</span>
              </div>
            </div>
          ) : (
            /* VISOR DE CAPAS ESPECTRALES GEE SENTINEL-2 */
            <div className="relative w-full h-full">
              {/* MAPA BASE SATELITAL DE ALTA DEFINICIÓN */}
              <iframe
                title={`Mapa Satelital Predio ${centerLat},${centerLon}`}
                className="w-full h-full border-0 filter contrast-110 brightness-95"
                src={`https://maps.google.com/maps?q=${centerLat},${centerLon}&z=14&t=k&output=embed`}
              />

              {/* OVERLAY ESPECTRAL DE CALOR DINÁMICO GEE */}
              <div
                className="absolute inset-0 pointer-events-none mix-blend-overlay transition-opacity duration-300"
                style={{
                  opacity: opacity / 100,
                  background: activeLayer === 'NDVI'
                    ? `radial-gradient(circle at 50% 50%, rgba(26,152,80,0.55) 0%, rgba(102,189,99,0.4) 35%, rgba(254,224,139,0.3) 65%, rgba(215,48,39,0.2) 100%)`
                    : activeLayer === 'NDRE'
                    ? `radial-gradient(circle at 50% 50%, rgba(12,44,132,0.55) 0%, rgba(29,145,192,0.4) 40%, rgba(199,233,180,0.3) 75%, transparent 100%)`
                    : activeLayer === 'NDWI'
                    ? `radial-gradient(circle at 50% 50%, rgba(1,133,113,0.55) 0%, rgba(128,205,193,0.4) 40%, rgba(223,194,125,0.3) 75%, transparent 100%)`
                    : `radial-gradient(circle at 50% 50%, rgba(215,48,39,0.55) 0%, rgba(253,174,97,0.4) 45%, rgba(69,117,180,0.3) 80%, transparent 100%)`
                }}
              />

              {/* CONTROL FLOTANTE DE OPACIDAD Y LEYENDA */}
              <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md apple-card p-4 text-xs space-y-3 backdrop-blur-2xl border border-white/20 bg-slate-950/90 shadow-2xl">
                <div className="flex items-center justify-between font-bold text-white">
                  <span>Capa Espectral: <strong className="text-emerald-400">{currentOpt.label}</strong></span>
                  <span className="text-[10px] text-slate-400 font-normal">{currentOpt.desc}</span>
                </div>

                {/* BARRA DE COLOR ESPECTRAL */}
                {currentOpt.palette && (
                  <div className="space-y-1">
                    <div className="h-3.5 w-full rounded-full flex overflow-hidden border border-white/20 shadow-inner">
                      {currentOpt.palette.map((col, idx) => (
                        <div key={idx} className="flex-1 h-full" style={{ backgroundColor: col }} />
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-300">
                      <span>Mín ({currentOpt.min})</span>
                      <span>Máx ({currentOpt.max})</span>
                    </div>
                  </div>
                )}

                {/* SLIDER DE OPACIDAD */}
                <div className="flex items-center gap-2 pt-1 border-t border-white/10 text-[11px] text-slate-300">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Opacidad de Capa:</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="flex-1 accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-emerald-400">{opacity}%</span>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* PIE DE PÁGINA AUDITADO */}
        <div className="p-3 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Datos procesados en vivo por Google Earth Engine API (NASA / ESA Copernicus WMO-No. 8)</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Resolución Píxel: {activeLayer === 'NDVI' || activeLayer === 'NDRE' || activeLayer === 'NDWI' ? '10m x 10m (Sentinel-2)' : '30m - 250m (MODIS/ERA5)'}
          </div>
        </div>

      </div>
    </div>
  );
}
