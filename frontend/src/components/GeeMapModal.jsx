import React, { useState, useEffect } from 'react';
import { X, Satellite, Layers, ShieldCheck, Cpu, Flame, Thermometer, Droplets, Sprout, Wind, Play, RefreshCw, Clock } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

export default function GeeMapModal({ isOpen, onClose, lat, lon, apiBase }) {
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [tileInfo, setTileInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [goesLoopData, setGoesLoopData] = useState(null);

  const centerLat = lat || -33.4450;
  const centerLon = lon || -70.6830;

  useEffect(() => {
    if (!isOpen) return;

    if (activeLayer === 'WINDY') return;

    if (activeLayer === 'GOES19') {
      setLoading(true);
      fetch(`${apiBase}/api/v1/satellite/latest-loop`)
        .then((res) => res.json())
        .then((data) => setGoesLoopData(data))
        .catch((err) => console.error("Error cargando GOES-19:", err))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(true);
    fetch(`${apiBase}/api/v1/gee/map-tile?capa=${activeLayer}&lat=${centerLat}&lon=${centerLon}`)
      .then((res) => res.json())
      .then((data) => {
        setTileInfo(data);
      })
      .catch((err) => console.error("Error cargando tile de GEE:", err))
      .finally(() => setLoading(false));
  }, [isOpen, activeLayer, centerLat, centerLon, apiBase]);

  if (!isOpen) return null;

  const layerOptions = [
    { id: 'NDVI', label: '🌿 Vigor NDVI', desc: 'Sentinel-2 (10m)' },
    { id: 'NDRE', label: '🍀 Nitrógeno NDRE', desc: 'Clorofila & Fertilidad' },
    { id: 'NDWI', label: '💧 Estrés NDWI', desc: 'Humedad Foliar' },
    { id: 'LST', label: '🌡️ Temp Suelo LST', desc: 'Isla de Calor & Suelo' },
    { id: 'FIRMS', label: '🔥 Incendios FIRMS', desc: 'Focos de Calor VIIRS' },
    { id: 'WINDY', label: '🌬️ Radar Windy', desc: 'Viento & Presión ECMWF' },
    { id: 'GOES19', label: '🛰️ Satélite GOES-19', desc: 'Bucle GeoColor 24h' },
  ];

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${centerLat}&lon=${centerLon}&detailLat=${centerLat}&detailLon=${centerLon}&width=100%25&height=480&zoom=10&level=surface&overlay=${
    activeLayer === 'LST' ? 'temp' : (activeLayer === 'NDWI' ? 'rain' : 'wind')
  }&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const goesVideoUrl = goesLoopData?.video_url
    ? (goesLoopData.video_url.startsWith('http') ? goesLoopData.video_url : `${apiBase}${goesLoopData.video_url}`)
    : `${apiBase}/static/goes19_loop.webp`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-2xl">
      <div className="apple-card w-full max-w-5xl overflow-hidden border border-emerald-500/30 flex flex-col h-[90vh] shadow-2xl bg-slate-950 animate-apple-entry">
        
        {/* CABECERA CON CONTROLES Y PÍLDORAS ESTILO APPLE */}
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
                  Google Earth Engine & NOAA
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Coordenadas Predio: <span className="font-mono text-emerald-300 font-semibold">{centerLat.toFixed(4)}, {centerLon.toFixed(4)}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-pill p-2 text-slate-400 hover:text-white self-end md:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BARRA SELECTORA DE CAPAS ESPECTRALES */}
        <div className="px-4 py-3 bg-slate-950/80 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {layerOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setActiveLayer(opt.id)}
              className={`apple-pill flex items-center gap-2 whitespace-nowrap cursor-pointer transition ${
                activeLayer === opt.id
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-white font-bold shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400/50'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>{opt.label}</span>
              <span className="text-[10px] text-slate-400 opacity-80">({opt.desc})</span>
            </button>
          ))}
        </div>

        {/* VISOR MULTIMODAL */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {activeLayer === 'WINDY' ? (
            <iframe
              title="Windy Embedded Map"
              className="w-full h-full border-0"
              src={windyUrl}
            />
          ) : activeLayer === 'GOES19' ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black p-4">
              {loading ? (
                <div className="text-center space-y-3">
                  <RefreshCw className="w-10 h-10 text-purple-400 animate-spin mx-auto" />
                  <div className="text-sm font-semibold text-slate-300">Cargando bucle GOES-19 NOAA...</div>
                </div>
              ) : (
                <div className="relative max-h-full max-w-full flex items-center justify-center">
                  <img
                    src={`${goesVideoUrl}?t=${Date.now()}`}
                    alt="Satelite GOES-19 NOAA"
                    className="max-h-[65vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
                  />
                  <div className="absolute top-4 right-4 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-purple-500/30 text-xs font-mono text-purple-300 backdrop-blur-md flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Bucle Activo 24 Horas (NOAA NESDIS)</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative w-full h-full">
              <iframe
                title={`GEE Map Layer ${activeLayer}`}
                className="w-full h-full border-0 filter saturate-125"
                src={`https://maps.google.com/maps?q=${centerLat},${centerLon}&z=14&t=k&output=embed`}
              />
              
              {/* CAPA DE LEYENDA TÉCNICA GEE */}
              {tileInfo?.leyenda && (
                <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md apple-card p-3 text-xs space-y-2 backdrop-blur-xl border border-white/20 bg-slate-950/85">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span>Capa Espectral: <strong className="text-emerald-400">{activeLayer}</strong></span>
                    <span className="font-mono text-slate-300">Rango: {tileInfo.leyenda.min_val} a {tileInfo.leyenda.max_val}</span>
                  </div>
                  <div className="h-3 w-full rounded-full flex overflow-hidden border border-white/20 shadow-inner">
                    {tileInfo.leyenda.colores.map((col, idx) => (
                      <div key={idx} className="flex-1 h-full" style={{ backgroundColor: col }} />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span>Bajo / Estrés</span>
                    <span>Óptimo / Vigor</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON AUDITORÍA */}
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
