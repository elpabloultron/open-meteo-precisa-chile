import React from 'react';
import { MapPin, X } from 'lucide-react';

const REGIONES = [
  { nombre: "🌾 Quilacahuín (San Pablo, Osorno)", lat: -40.4000, lon: -73.2800 },
  { nombre: "Los Lagos (Osorno / Puerto Montt)", lat: -40.5739, lon: -73.1353 },
  { nombre: "Arica y Parinacota", lat: -18.4783, lon: -70.3126 },
  { nombre: "Tarapacá", lat: -20.2133, lon: -70.1503 },
  { nombre: "Antofagasta", lat: -23.6500, lon: -70.4000 },
  { nombre: "Atacama", lat: -27.3667, lon: -70.3333 },
  { nombre: "Coquimbo", lat: -29.9533, lon: -71.3395 },
  { nombre: "Valparaíso", lat: -33.0472, lon: -71.6127 },
  { nombre: "Metropolitana (Santiago)", lat: -33.4489, lon: -70.6693 },
  { nombre: "O'Higgins (Rancagua)", lat: -34.1701, lon: -70.7444 },
  { nombre: "Maule (Curicó / Talca)", lat: -35.4264, lon: -71.6554 },
  { nombre: "Ñuble (Chillán)", lat: -36.6066, lon: -72.1034 },
  { nombre: "Biobío (Concepción)", lat: -36.8270, lon: -73.0503 },
  { nombre: "La Araucanía (Temuco)", lat: -38.7397, lon: -72.5901 },
  { nombre: "Los Ríos (Valdivia)", lat: -39.8142, lon: -73.2459 },
  { nombre: "Aysén", lat: -45.5752, lon: -72.0662 },
  { nombre: "Magallanes", lat: -53.1638, lon: -70.9171 }
];

export default function LocationFallbackModal({ isOpen, onClose, onSelect }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="bg-slate-900/90 border border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-xl">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-white">Elige tu Región</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          No pudimos acceder a tu ubicación GPS. Por favor, selecciona una región para buscar la estación más cercana:
        </p>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {REGIONES.map((r, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(r.lat, r.lon);
                onClose();
              }}
              className="w-full text-left px-4 py-3 bg-slate-800/50 hover:bg-sky-600/30 border border-slate-700/50 hover:border-sky-500/50 rounded-xl transition flex justify-between items-center cursor-pointer group"
            >
              <span className="text-slate-200 group-hover:text-sky-300 font-medium">{r.nombre}</span>
              <span className="text-xs text-slate-500 group-hover:text-sky-400 font-mono">{r.lat.toFixed(1)}, {r.lon.toFixed(1)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
