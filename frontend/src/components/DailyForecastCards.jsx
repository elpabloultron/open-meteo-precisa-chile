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
    <div className="apple-card p-5 sm:p-6 space-y-4 shadow-xl bg-slate-900/50">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/15 text-sky-400 rounded-xl border border-sky-500/25">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">Pronóstico de 7 Días</h3>
            <p className="text-[11px] text-slate-400">Rango térmico y precipitación acumulada</p>
          </div>
        </div>
        <span className="apple-pill text-[10px] text-sky-300 font-semibold">
          7 Días Multimodelo
        </span>
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

          const handleClick = () => {
            if (onOpenHourly && hourlyForecast && hourlyForecast.time) {
              const targetPrefix = fechaStr;
              const dayHourlyData = {
                dayName: nombreDia,
                hourly: []
              };

              for (let i = 0; i < hourlyForecast.time.length; i++) {
                if (hourlyForecast.time[i] && hourlyForecast.time[i].startsWith(targetPrefix)) {
                  const dt = new Date(hourlyForecast.time[i]);
                  const tHour = isNaN(dt.getHours()) ? '12:00' : dt.getHours().toString().padStart(2, '0') + ':00';
                  
                  let HIcon = '🌤️';
                  const hRain = hourlyForecast.precipitation?.[i] || 0;
                  const hTemp = hourlyForecast.temperature_2m?.[i] || 0;
                  if (hRain > 1) HIcon = '🌧️';
                  else if (hRain > 0) HIcon = '🌦️';
                  else if (hTemp <= 2) HIcon = '❄️';
                  else if (hourlyForecast.weather_code?.[i] === 0) HIcon = '☀️';

                  dayHourlyData.hourly.push({
                    timeLabel: tHour,
                    icon: HIcon,
                    temp: Math.round(hTemp),
                    rainProb: Math.round((hourlyForecast.precipitation_probability?.[i] || 0)),
                    humidity: Math.round(hourlyForecast.relative_humidity_2m?.[i] || 0)
                  });
                }
              }
              onOpenHourly(dayHourlyData);
            }
          };

          return (
            <div
              key={fechaStr || idx}
              onClick={handleClick}
              className="p-3 rounded-2xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-800/50 transition border border-white/5 bg-slate-900/30"
            >
              {/* NOMBRE DEL DÍA */}
              <div className="w-14 font-bold text-white text-xs">
                {nombreDia}
              </div>

              {/* ICONO Y LLUVIA */}
              <div className="flex items-center gap-1.5 w-18">
                <IconComp className={`w-4 h-4 ${iconColor}`} />
                {rain > 0 ? (
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-0.5">
                    <Droplets className="w-2.5 h-2.5" />
                    {rain.toFixed(1)}m
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">0%</span>
                )}
              </div>

              {/* RANGO TÉRMICO GRADIENTE ESTILO APPLE */}
              <div className="flex-1 flex items-center gap-2.5">
                <span className="w-6 text-right font-mono text-cyan-300 font-bold text-xs">{tMin}°</span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 rounded-full"
                    style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
                  />
                </div>
                <span className="w-6 text-left font-mono text-amber-300 font-bold text-xs">{tMax}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
