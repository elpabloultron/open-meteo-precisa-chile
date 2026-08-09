import React from 'react';
import { Sun, Moon, Sunrise, Sunset, Compass } from 'lucide-react';

export default function BreezySunMoonWidget({ salidaSol, puestaSol }) {
  const sunriseStr = salidaSol || "07:15";
  const sunsetStr = puestaSol || "19:45";

  // Calcular porcentaje de día transcurrido
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [srH, srM] = sunriseStr.split(':').map(Number);
  const [ssH, ssM] = sunsetStr.split(':').map(Number);
  const srTotal = (srH || 7) * 60 + (srM || 15);
  const ssTotal = (ssH || 19) * 60 + (ssM || 45);

  let progressPercent = 0;
  if (currentMinutes > srTotal && currentMinutes < ssTotal) {
    progressPercent = ((currentMinutes - srTotal) / (ssTotal - srTotal)) * 100;
  } else if (currentMinutes >= ssTotal) {
    progressPercent = 100;
  }

  return (
    <div className="apple-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
            <Sun className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Sol & Astronomía</h3>
            <p className="text-xs text-slate-400">Trayectoria Solar y Luz Diurna</p>
          </div>
        </div>
        <span className="apple-pill text-[10px] text-amber-300 font-bold">
          {progressPercent > 0 && progressPercent < 100 ? 'Luz de Día' : 'Noche'}
        </span>
      </div>

      {/* ARCO SOLAR TIPO BREEZY WEATHER */}
      <div className="relative pt-6 pb-2 text-center space-y-3">
        <div className="relative w-full max-w-md mx-auto h-24 overflow-hidden">
          <div className="absolute inset-0 border-t-2 border-dashed border-white/20 rounded-t-full" />
          {/* Puntero Solar */}
          <div 
            className="absolute bottom-0 left-1/2 w-6 h-6 -ml-3 -mb-3 rounded-full bg-amber-400 border-2 border-white shadow-lg shadow-amber-500/50 transition-all duration-1000"
            style={{ 
              transform: `rotate(${(progressPercent * 1.8) - 90}deg) translate(0, -90px) rotate(-${(progressPercent * 1.8) - 90}deg)` 
            }}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-semibold px-4 pt-1">
          <div className="flex items-center gap-1.5 text-amber-300">
            <Sunrise className="w-4 h-4 text-amber-400" />
            <span>Salida: <strong className="font-mono text-white text-sm">{sunriseStr}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-orange-300">
            <Sunset className="w-4 h-4 text-orange-400" />
            <span>Puesta: <strong className="font-mono text-white text-sm">{sunsetStr}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
