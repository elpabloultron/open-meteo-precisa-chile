import React from 'react';
import { Sun, CloudSun, CloudRain, Snowflake, Calendar, Droplets } from 'lucide-react';

export default function DailyForecastCards({ dailyForecast, hourlyForecast, onOpenHourly }) {
  if (!dailyForecast || !dailyForecast.time || !Array.isArray(dailyForecast.time) || dailyForecast.time.length === 0) {
    return (
      <div className="apple-card p-6 text-center text-slate-400 text-xs">
        Cargando pronóstico diario a 7 días...
      </div>
    );
  }

  const {
    time = [],
    temperature_2m_max = [],
    temperature_2m_min = [],
    precipitation_sum = []
  } = dailyForecast || {};

  const safeTimeList = Array.isArray(time) ? time.slice(0, 7) : [];
  const safeMinList = Array.isArray(temperature_2m_min) ? temperature_2m_min.slice(0, 7).filter(n => typeof n === 'number') : [];
  const safeMaxList = Array.isArray(temperature_2m_max) ? temperature_2m_max.slice(0, 7).filter(n => typeof n === 'number') : [];

  const globalMin = safeMinList.length > 0 ? Math.min(...safeMinList) : 5;
  const globalMax = safeMaxList.length > 0 ? Math.max(...safeMaxList) : 25;
  const tempRange = (globalMax - globalMin) || 1;

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="apple-card p-4 sm:p-5 space-y-3 shadow-xl bg-slate-900/40 backdrop-blur-2xl border border-white/10">
      
      {/* CABECERA MINIMALISTA ESTILO APPLE */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-sky-400" />
          <span>Pronóstico de 7 Días</span>
        </div>
      </div>

      {/* LISTA DE 7 DÍAS CON BARRAS TÉRMICAS ESTILO APPLE WEATHER */}
      <div className="space-y-2 pt-1">
        {safeTimeList.map((fechaStr, idx) => {
          const dateObj = new Date(fechaStr + 'T12:00:00');
          const esHoy = idx === 0;
          const dayIndex = isNaN(dateObj.getDay()) ? 0 : dateObj.getDay();
          const nombreDia = esHoy ? 'Hoy' : diasSemana[dayIndex];
          const tMax = Array.isArray(temperature_2m_max) && typeof temperature_2m_max[idx] === 'number' ? Math.round(temperature_2m_max[idx]) : 20;
          const tMin = Array.isArray(temperature_2m_min) && typeof temperature_2m_min[idx] === 'number' ? Math.round(temperature_2m_min[idx]) : 10;
          const rain = Array.isArray(precipitation_sum) && typeof precipitation_sum[idx] === 'number' ? precipitation_sum[idx] : 0.0;

          let IconComp = Sun;
          let iconColor = 'text-amber-400';
          if (rain > 1.0) {
            IconComp = CloudRain;
            iconColor = 'text-blue-400';
          } else if (tMin <= 2) {
            IconComp = Snowflake;
            iconColor = 'text-cyan-300';
          } else if (rain > 0.1 || tMax < 18) {
            IconComp = CloudSun;
            iconColor = 'text-sky-300';
          }

          const leftPct = Math.max(0, Math.min(100, ((tMin - globalMin) / tempRange) * 100));
          const rightPct = Math.max(0, Math.min(100, ((globalMax - tMax) / tempRange) * 100));

          return (
            <div
              key={fechaStr}
              className="flex items-center gap-3 text-xs sm:text-sm font-semibold text-slate-200 py-1"
            >
              {/* NOMBRE DÍA */}
              <div className="w-10 text-left font-bold text-white">
                {nombreDia}
              </div>

              {/* ICONO Y LLUVIA */}
              <div className="w-16 flex items-center gap-1">
                <IconComp className={`w-4 h-4 ${iconColor}`} />
                {rain > 0.1 && (
                  <span className="text-[10px] text-sky-400 font-mono font-bold">
                    {rain.toFixed(1)}mm
                  </span>
                )}
              </div>

              {/* T MIN */}
              <div className="w-8 text-right font-mono text-slate-400 font-bold">
                {tMin}°
              </div>

              {/* BARRA DE RANGO TÉRMICO GRADIENTE CONTINUO APPLE */}
              <div className="flex-1 h-1.5 bg-slate-800/80 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-amber-400"
                  style={{
                    left: `${leftPct}%`,
                    right: `${rightPct}%`
                  }}
                />
              </div>

              {/* T MAX */}
              <div className="w-8 text-right font-mono text-white font-bold">
                {tMax}°
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
