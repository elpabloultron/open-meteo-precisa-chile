import React from 'react';
import { Wind, Compass, ArrowUp, ShieldCheck } from 'lucide-react';

function getCardinalDirection(degrees) {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export default function WindCompassWidget({ windKmh, windDegrees, windGusts }) {
  const speed = windKmh ?? 12;
  const deg = windDegrees ?? 215;
  const gusts = windGusts ?? (speed * 1.35).toFixed(0);
  const cardinal = getCardinalDirection(deg);

  return (
    <div className="apple-card p-5 sm:p-6 space-y-4 shadow-2xl bg-slate-900/60 backdrop-blur-3xl border border-sky-500/20">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/25">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">Rosa de los Vientos & Ráfagas</h3>
            <p className="text-[11px] text-slate-400 font-medium">Vector aerodinámico y dirección cardinal</p>
          </div>
        </div>

        <span className="apple-pill text-[10px] text-sky-300 font-mono">
          Anemómetro a 10m
        </span>
      </div>

      {/* COMPÁS CIRCULAR Y MÉTRICAS */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
        
        {/* COMPÁS VECTORIAL ANIMADO */}
        <div className="relative w-36 h-36 flex items-center justify-center rounded-full bg-slate-950/60 border border-white/10 shadow-inner">
          {/* MARCAS CARDINALES */}
          <span className="absolute top-2 text-[10px] font-black text-sky-400 font-mono">N</span>
          <span className="absolute bottom-2 text-[10px] font-black text-slate-400 font-mono">S</span>
          <span className="absolute left-2 text-[10px] font-black text-slate-400 font-mono">O</span>
          <span className="absolute right-2 text-[10px] font-black text-slate-400 font-mono">E</span>

          {/* CÍRCULO INTERIOR */}
          <div className="w-24 h-24 rounded-full border border-dashed border-white/15 flex items-center justify-center">
            {/* AGUJA VECTORIAL */}
            <div
              className="w-full h-full flex items-center justify-center transition-transform duration-700 ease-out"
              style={{ transform: `rotate(${deg}deg)` }}
            >
              <div className="w-1.5 h-14 bg-gradient-to-t from-transparent via-sky-400 to-amber-400 rounded-full flex items-start justify-center shadow-lg shadow-sky-500/40">
                <div className="w-2.5 h-2.5 bg-amber-300 rounded-full -mt-0.5 border border-slate-950" />
              </div>
            </div>
          </div>

          {/* VALOR CENTRAL */}
          <div className="absolute flex flex-col items-center">
            <span className="text-xs font-black text-white font-mono">{cardinal}</span>
            <span className="text-[9px] text-slate-400 font-mono">{deg}°</span>
          </div>
        </div>

        {/* MÉTRICAS DE VELOCIDAD Y RÁFAGAS */}
        <div className="space-y-3 w-full sm:w-52">
          
          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Velocidad Sostenida</span>
              <Wind className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{speed} <span className="text-xs font-normal text-slate-400">km/h</span></div>
            <div className="text-[10px] text-slate-400">Viento medio continuo</div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-0.5">
            <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
              <span>Ráfagas Máximas</span>
              <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-300 font-mono">{gusts} <span className="text-xs font-normal text-slate-400">km/h</span></div>
            <div className="text-[10px] text-slate-400">Pico de viento en 24h</div>
          </div>

        </div>

      </div>

    </div>
  );
}
