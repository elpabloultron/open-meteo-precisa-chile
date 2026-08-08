import React, { useState } from 'react';
import { Layers, Wind, Satellite } from 'lucide-react';

export default function MapSection({ estacionSeleccionada, onOpenSateliteModal, onOpenGeeMapModal }) {
  const [mapType, setMapType] = useState('windy');

  const centerLat = estacionSeleccionada?.coordenadas?.latitud || -33.4450;
  const centerLon = estacionSeleccionada?.coordenadas?.longitud || -70.6830;

  const windyUrl = `https://embed.windy.com/embed2.html?lat=${centerLat}&lon=${centerLon}&detailLat=${centerLat}&detailLon=${centerLon}&width=100%25&height=480&zoom=8&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      
      {/* CABECERA CON CONTROLES DE CAPAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              Visor Interactivo de Mapas Climáticos & Satelitales
            </h3>
            <p className="text-xs text-slate-400">
              Viento animado Windy ECMWF y Mapa Satelital de Capas Espectrales GEE (10m)
            </p>
          </div>
        </div>

        {/* BOTONERA DE MAPAS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenGeeMapModal}
            className="apple-pill bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30 flex items-center gap-2 hover:opacity-95 transition cursor-pointer font-bold text-xs"
          >
            <Satellite className="w-4 h-4 text-emerald-200" />
            <span>🛰️ Mapa Satelital GEE (10m)</span>
          </button>

          <button
            type="button"
            onClick={() => setMapType('windy')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition duration-200 cursor-pointer ${
              mapType === 'windy'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Wind className="w-4 h-4 text-sky-300" />
            <span>Mapa Windy Oficial</span>
          </button>

          <button
            type="button"
            onClick={onOpenSateliteModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 flex items-center gap-2 hover:opacity-90 transition cursor-pointer"
          >
            <Satellite className="w-4 h-4 text-purple-200" />
            <span>GOES-19 Animado (24H)</span>
          </button>
        </div>
      </div>

      {/* EMBED OFICIAL DE WINDY */}
      <div className="h-[520px] w-full rounded-xl overflow-hidden border border-slate-800 relative z-10 touch-pan-x touch-pan-y touch-pinch-zoom">
        <iframe
          title="Windy Map"
          className="w-full h-full border-0 rounded-xl pointer-events-auto"
          src={windyUrl}
        />
      </div>

    </div>
  );
}
