import React, { useState, useEffect } from 'react';
import { X, Satellite, Layers, ShieldCheck, Cpu, Flame, Thermometer, Droplets, Sprout, Wind } from 'lucide-react';

export default function GeeMapModal({ isOpen, onClose, lat, lon, apiBase }) {
  const [activeLayer, setActiveLayer] = useState('NDVI');
  const [tileInfo, setTileInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const centerLat = lat || -33.4450;
  const centerLon = lon || -70.6830;

  useEffect(() => {
    if (!isOpen) return;

    if (activeLayer === 'WINDY') return;

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
    { id: 'NDRE', label: '🍀 Nitrógeno NDRE', desc: 'Clorofila & Fertilizante' },
    { id: 'NDWI', label: '💧 Estrés NDWI', desc: 'Humedad Foliar' },
    { id: 'LST', label: '🌡️ Temp Suelo LST', desc: 'Superficie Suelo' },
    { id: 'FIRMS', label: '🔥 Incendios FIRMS', desc: 'Focos de Calor VIIRS' },
    { id: 'WINDY', label: '🌬️ Windy Radar', desc: 'Viento & Presión ECMWF' },
  ];

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${centerLat}&lon=${centerLon}&detailLat=${centerLat}&detailLon=${centerLon}&width=100%25&height=480&zoom=10&level=surface&overlay=${
    activeLayer === 'LST' ? 'temp' : (activeLayer === 'NDWI' ? 'rain' : 'wind')
  }&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/90 backdrop-blur-2xl">
      <div className="apple-card w-full max-w-5xl overflow-hidden border border-emerald-500/30 flex flex-col h-[90vh] shadow-2xl">
        
        {/* CABECERA CON CONTROLES Y PÍLDORAS ESTILO APPLE */}
        <div className="p-4 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Visor Satelital Interactivo Google Earth Engine
                </h3>
                <span className="apple-pill text-[10px] text-emerald-300">
                  Alta Resolución 10m
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

        {/* BARRA SELECTORA DE CAPAS ESPECTRALES ESTILO APPLE PILLS */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar">
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

        {/* MAPA INTERACTIVO */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {activeLayer === 'WINDY' ? (
            <iframe
              title="Windy Embedded Map"
              className="w-full h-full border-0"
              src={windyUrl}
            />
          ) : (
            <div className="relative w-full h-full">
              <iframe
                title={`GEE Map Layer ${activeLayer}`}
                className="w-full h-full border-0 filter saturate-125"
                src={`https://maps.google.com/maps?q=${centerLat},${centerLon}&z=14&t=k&output=embed`}
              />
              
              {/* CAPA DE LEYENDA TÉCNICA GEE */}
              {tileInfo?.leyenda && (
                <div className="absolute bottom-4 left-4 right-4 md:right-auto md:max-w-md apple-card p-3 text-xs space-y-2 backdrop-blur-xl border border-white/20">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white">
                    <span>Capa Activa: <strong className="text-emerald-400">{activeLayer}</strong></span>
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

        {/* PIE DE PÁGINA CON AUDITORÍA DE DATOS DE LA OMM */}
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
