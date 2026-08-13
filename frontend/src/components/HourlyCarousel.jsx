import React from 'react';
import { Sun, Cloud, CloudSun, CloudRain, CloudLightning, Snowflake, Droplets, Clock } from 'lucide-react';

function getWeatherIcon(code) {
  if (code === undefined || code === null) return <CloudSun className="w-5 h-5 text-amber-400" />;
  if (code === 0) return <Sun className="w-5 h-5 text-amber-400" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-5 h-5 text-sky-400" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-5 h-5 text-blue-400" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-5 h-5 text-cyan-300" />;
  if (code >= 95) return <CloudLightning className="w-5 h-5 text-purple-400" />;
  return <Cloud className="w-5 h-5 text-slate-400" />;
}

export default function HourlyCarousel({ hourlyForecast }) {
  if (!hourlyForecast || !hourlyForecast.time || hourlyForecast.time.length === 0) return null;

  const times = hourlyForecast.time.slice(0, 24);
  const temps = hourlyForecast.temperature_2m?.slice(0, 24) || [];
  const precips = hourlyForecast.precipitation_probability?.slice(0, 24) || [];
  const precipMms = hourlyForecast.precipitation?.slice(0, 24) || [];
  const humidities = hourlyForecast.relative_humidity_2m?.slice(0, 24) || [];
  const codes = hourlyForecast.weather_code?.slice(0, 24) || [];

  return (
    <div className="apple-card p-5 sm:p-6 space-y-4 shadow-xl bg-slate-900/50">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/25">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Pronóstico Hora a Hora (24h)</h3>
            <p className="text-[11px] text-slate-400">Curva de temperatura y lluvia</p>
          </div>
        </div>
        <span className="apple-pill text-[10px] text-sky-300 font-semibold">
          ECMWF / Open-Meteo
        </span>
      </div>

      {/* CARRUSEL DE TARJETAS HORARIAS */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar snap-x">
        {times.map((t, idx) => {
          const hourLabel = idx === 0 ? 'Ahora' : t.split('T')[1]?.slice(0, 5) || t;
          const tempVal = Math.round(temps[idx] ?? 15);
          const pMm = precipMms[idx] || 0;
          const pProb = precips[idx] || (pMm > 0 ? Math.min(100, Math.round(pMm * 35)) : (humidities[idx] > 80 ? Math.round((humidities[idx] - 75) * 2) : 0));
          const codeVal = codes[idx];

          return (
            <div
              key={t + idx}
              className={`flex-shrink-0 snap-start w-20 p-3 rounded-2xl text-center space-y-1.5 transition hover:scale-105 border ${
                idx === 0
                  ? 'bg-sky-500/20 border-sky-500/40 text-white shadow-lg'
                  : 'bg-slate-900/40 border-white/10 text-slate-200'
              }`}
            >
              <div className="text-[11px] font-bold text-slate-300">{hourLabel}</div>
              <div className="flex justify-center my-1">
                {getWeatherIcon(codeVal)}
              </div>
              <div className="text-base font-black text-white font-mono">{tempVal}°</div>
              
              {/* INDICADOR DE LLUVIA */}
              <div className="space-y-0.5 pt-0.5">
                <div className="flex items-center justify-center gap-0.5 text-[9px] text-sky-400 font-bold">
                  <Droplets className="w-2.5 h-2.5" />
                  <span>{pProb}%</span>
                </div>
                <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 rounded-full transition-all"
                    style={{ width: `${pProb}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
