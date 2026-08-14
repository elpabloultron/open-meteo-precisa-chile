import React from 'react';
import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, Snowflake, Droplets, Clock, Sparkles } from 'lucide-react';

function getWeatherIcon(code, temp) {
  if (temp <= 2) return <Snowflake className="w-5 h-5 text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.5)]" />;
  if (code === undefined || code === null) return <CloudSun className="w-5 h-5 text-amber-400" />;
  if (code === 0) return <Sun className="w-5 h-5 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-5 h-5 text-sky-400" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-5 h-5 text-cyan-300" />;
  if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-400" />;
  return <Cloud className="w-5 h-5 text-slate-300" />;
}

export default function HourlyCarousel({ hourlyForecast, selectedHourIndex, onSelectHourIndex }) {
  if (!hourlyForecast || !hourlyForecast.time || hourlyForecast.time.length === 0) return null;

  const times = hourlyForecast.time.slice(0, 24);
  const temps = hourlyForecast.temperature_2m?.slice(0, 24) || [];
  const precips = hourlyForecast.precipitation_probability?.slice(0, 24) || [];
  const precipMms = hourlyForecast.precipitation?.slice(0, 24) || [];
  const humidities = hourlyForecast.relative_humidity_2m?.slice(0, 24) || [];
  const codes = hourlyForecast.weather_code?.slice(0, 24) || [];

  return (
    <div className="apple-card p-4 sm:p-5 space-y-3.5 shadow-xl bg-slate-900/40 backdrop-blur-2xl border border-white/10">
      
      {/* CABECERA MINIMALISTA ESTILO APPLE */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>Pronóstico por Horas</span>
        </div>

        {selectedHourIndex !== null && selectedHourIndex !== 0 && onSelectHourIndex && (
          <button
            onClick={() => onSelectHourIndex(0)}
            className="apple-pill text-[10px] text-sky-300 bg-sky-500/20 border-sky-400/40 font-bold hover:scale-105"
          >
            Volver a En Vivo
          </button>
        )}
      </div>

      {/* CARRUSEL DE TARJETAS HORARIAS SIN SCROLLBAR HORIZONTAL MOLESTA */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {times.map((t, idx) => {
          const hourLabel = idx === 0 ? 'Ahora' : (t.includes('T') ? t.split('T')[1].slice(0, 5) : `${idx}:00`);
          const tempVal = Math.round(temps[idx] ?? 15);
          const pMm = precipMms[idx] || 0;
          const pProb = precips[idx] || (pMm > 0 ? Math.min(100, Math.round(pMm * 35)) : (humidities[idx] > 80 ? Math.round((humidities[idx] - 75) * 2) : 0));
          const codeVal = codes[idx];
          const isSelected = selectedHourIndex === idx;

          return (
            <div
              key={t + idx}
              onClick={() => onSelectHourIndex && onSelectHourIndex(idx)}
              className={`flex-shrink-0 snap-start w-[72px] p-2.5 rounded-2xl text-center space-y-1.5 transition-all duration-200 hover:scale-105 border cursor-pointer ${
                isSelected
                  ? 'bg-sky-500/30 border-sky-400 text-white shadow-lg ring-1 ring-sky-400'
                  : idx === 0 && (selectedHourIndex === null || selectedHourIndex === 0)
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-white/[0.04] border-white/5 text-slate-300 hover:bg-white/[0.08]'
              }`}
            >
              <div className="text-[11px] font-semibold text-slate-300 font-mono">{hourLabel}</div>
              <div className="flex justify-center my-0.5">
                {getWeatherIcon(codeVal, tempVal)}
              </div>
              <div className="text-base font-extrabold text-white font-mono">
                {tempVal}°
              </div>
              
              {/* INDICADOR DE LLUVIA */}
              {pProb > 0 ? (
                <div className="flex items-center justify-center gap-0.5 text-[10px] text-sky-300 font-bold font-mono">
                  <Droplets className="w-2.5 h-2.5 text-sky-400" />
                  <span>{pProb}%</span>
                </div>
              ) : (
                <div className="text-[10px] text-transparent select-none">-</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
