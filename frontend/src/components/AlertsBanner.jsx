import React, { useState } from 'react';
import { AlertTriangle, Snowflake, Wind, Sun, Droplets, ChevronRight, X, ShieldAlert } from 'lucide-react';

export default function AlertsBanner({ alertas }) {
  const [selectedAlert, setSelectedAlert] = useState(null);

  if (!alertas || alertas.length === 0) return null;

  const getIcon = (iconoName) => {
    switch (iconoName) {
      case 'Snowflake':
      case 'ThermometerSnow':
        return <Snowflake className="w-5 h-5 text-cyan-300 animate-pulse shrink-0" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-amber-300 animate-bounce shrink-0" />;
      case 'Sun':
        return <Sun className="w-5 h-5 text-amber-400 animate-spin shrink-0" />;
      case 'Droplets':
        return <Droplets className="w-5 h-5 text-blue-300 shrink-0" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-rose-400 animate-pulse shrink-0" />;
    }
  };

  return (
    <div className="space-y-3">
      {/* PÍLDORAS O BANNERS DE ALERTAS ACTIVAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {alertas.map((alerta, idx) => (
          <div
            key={idx}
            onClick={() => setSelectedAlert(alerta)}
            className={`apple-card p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition group shadow-xl ${
              alerta.nivel === 'critico'
                ? 'bg-gradient-to-r from-rose-950/70 via-slate-900 to-rose-950/40 border-rose-500/50 hover:border-rose-400'
                : 'bg-gradient-to-r from-amber-950/60 via-slate-900 to-amber-950/30 border-amber-500/50 hover:border-amber-400'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className={`p-2.5 rounded-xl border ${
                alerta.nivel === 'critico' ? 'bg-rose-500/20 border-rose-500/30' : 'bg-amber-500/20 border-amber-500/30'
              }`}>
                {getIcon(alerta.icono)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white tracking-tight">{alerta.titulo}</h4>
                  <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase tracking-wider ${
                    alerta.nivel === 'critico' ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40' : 'bg-amber-500/30 text-amber-300 border border-amber-500/40'
                  }`}>
                    {alerta.nivel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 line-clamp-1">{alerta.mensaje}</p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition" />
          </div>
        ))}
      </div>

      {/* MODAL DETALLADO DE ACCIÓN ANTE ALERTA */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl">
          <div className="apple-card w-full max-w-lg overflow-hidden border border-rose-500/40 space-y-5 p-6 shadow-2xl bg-slate-900/90">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <span>Protocolo Operativo de Alerta</span>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="apple-pill p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-extrabold text-white">{selectedAlert.titulo}</h3>
              <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/10">
                {selectedAlert.mensaje}
              </p>

              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl space-y-2">
                <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  ⚠️ Acción Inmediata Recomendada:
                </div>
                <p className="text-xs text-white font-medium leading-relaxed">
                  {selectedAlert.recomendacion}
                </p>
              </div>
            </div>

            <button
              onClick={() => setSelectedAlert(null)}
              className="apple-pill w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
            >
              Entendido / Cerrar Alerta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
