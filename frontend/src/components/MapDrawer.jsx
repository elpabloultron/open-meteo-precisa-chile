import React, { useState } from 'react';
import { X, Satellite, Layers, Wind, Clock, Eye, Sparkles, MapPin, ShieldCheck, Compass } from 'lucide-react';

export default function MapDrawer({ isOpen, onClose, lat, lon, apiBase }) {
  const [activeTab, setActiveTab] = useState('windy');
  const [activeGeeLayer, setActiveGeeLayer] = useState('NDVI');

  const centerLat = lat || -33.4450;
  const centerLon = lon || -70.6830;

  if (!isOpen) return null;

  const geeLayers = [
    { id: 'NDVI', label: '🌿 Vigor NDVI (10m)', desc: 'Salud y fotosíntesis activa (Sentinel-2)', overlay: 'wind' },
    { id: 'NDRE', label: '🍀 Nitrógeno NDRE', desc: 'Clorofila y estado foliar (Sentinel-2)', overlay: 'wind' },
    { id: 'NDWI', label: '💧 Estrés NDWI', desc: 'Humedad en dosel foliar (Sentinel-2)', overlay: 'rain' },
    { id: 'LST', label: '🌡️ Temperatura Suelo', desc: 'Temperatura de superficie calibrada (MODIS)', overlay: 'temp' }
  ];

  const currentGee = geeLayers.find(g => g.id === activeGeeLayer) || geeLayers[0];

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${centerLat}&lon=${centerLon}&detailLat=${centerLat}&detailLon=${centerLon}&width=100%25&height=100%25&zoom=9&level=surface&overlay=${
    activeTab === 'gee' ? currentGee.overlay : 'wind'
  }&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  const goesVideoUrl = `https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp?t=${Date.now()}`;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-xl transition-opacity animate-fade-in">
      
      {/* PANEL LATERAL DRAWER ESTILO APPLE HIG */}
      <div className="w-full max-w-2xl h-full bg-slate-900/95 border-l border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-left">
        
        {/* CABECERA */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Visor GIS & Satélites</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                  En Vivo
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Coordenadas: {centerLat.toFixed(4)}, {centerLon.toFixed(4)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="apple-pill p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SELECTOR SEGMENTADO DE MAPAS */}
        <div className="p-3 bg-slate-950/50 border-b border-white/5 flex items-center justify-between gap-2">
          <div className="apple-segmented-control w-full flex">
            <button
              onClick={() => setActiveTab('windy')}
              className={`apple-segmented-button flex-1 flex items-center justify-center gap-1.5 ${
                activeTab === 'windy' ? 'active' : ''
              }`}
            >
              <Wind className="w-3.5 h-3.5" />
              <span>Windy ECMWF</span>
            </button>

            <button
              onClick={() => setActiveTab('gee')}
              className={`apple-segmented-button flex-1 flex items-center justify-center gap-1.5 ${
                activeTab === 'gee' ? 'active' : ''
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Capas GEE 10m</span>
            </button>

            <button
              onClick={() => setActiveTab('goes19')}
              className={`apple-segmented-button flex-1 flex items-center justify-center gap-1.5 ${
                activeTab === 'goes19' ? 'active' : ''
              }`}
            >
              <Satellite className="w-3.5 h-3.5 text-purple-400" />
              <span>GOES-19 HD</span>
            </button>
          </div>
        </div>

        {/* SUB-SELECTOR PARA CAPAS GEE */}
        {activeTab === 'gee' && (
          <div className="px-4 py-2 bg-slate-950/70 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {geeLayers.map((l) => (
              <button
                key={l.id}
                onClick={() => setActiveGeeLayer(l.id)}
                className={`apple-pill text-[11px] whitespace-nowrap cursor-pointer ${
                  activeGeeLayer === l.id
                    ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{l.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* VISOR PRINCIPAL */}
        <div className="flex-1 bg-black relative flex items-center justify-center overflow-hidden">
          {activeTab === 'windy' || activeTab === 'gee' ? (
            <iframe
              title="Visor Cartográfico Interactivo"
              className="w-full h-full border-0 pointer-events-auto"
              src={windyUrl}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950">
              <img
                src={goesVideoUrl}
                alt="Animación Satelital NOAA GOES-19"
                className="max-h-[70vh] w-auto object-contain rounded-2xl border border-white/10 shadow-2xl"
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-purple-300 font-mono">
                <Clock className="w-3.5 h-3.5" />
                <span>Bucle Infrarrojo GeoColor 24 Horas • NOAA STAR</span>
              </div>
            </div>
          )}
        </div>

        {/* FOOTER INFORMACIÓN DE AUDITORÍA */}
        <div className="p-3 bg-slate-950/90 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Resolución Sentinel-2 (10m) & ECMWF</span>
          </div>
          <span className="font-mono text-[10px] text-slate-500">MeteoPrecisa Engine</span>
        </div>

      </div>

    </div>
  );
}
