import React from 'react';
import { Sun, CloudSun, CloudRain, Snowflake, Calendar, Droplets } from 'lucide-react';

export default function DailyForecastCards({ dailyForecast, hourlyForecast, onOpenHourly }) {
  if (!dailyForecast || !dailyForecast.time || dailyForecast.time.length === 0) {
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
    precipitation_sum = [],
    et0_fao_evapotranspiration = [],
    uv_index_max = []
  } = dailyForecast;

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const globalMin = Math.min(...temperature_2m_min.slice(0, 7).filter(n => n !== undefined));
  const globalMax = Math.max(...temperature_2m_max.slice(0, 7).filter(n => n !== undefined));
  const tempRange = (globalMax - globalMin) || 1;

  return (
    <div className="apple-card p-5 sm:p-6 space-y-4 shadow-xl">
      
      {/* CABECERA ESTILO BREEZY WEATHER */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white tracking-tight">Pronóstico 7 Días</h3>
            <p className="text-xs text-slate-400">Rango térmico y precipitación esperada</p>
          </div>
        </div>
        <span className="apple-pill text-[10px] text-sky-300 font-bold">
          7 Días DMC & GEE
        </span>
      </div>

      {/* LISTA ESTILO BREEZY WEATHER DE 7 DÍAS INTERACTIVA */}
      <div className="space-y-2.5 pt-1">
        {time.slice(0, 7).map((fechaStr, idx) => {
          const dateObj = new Date(fechaStr + 'T12:00:00');
          const esHoy = idx === 0;
          const nombreDia = esHoy ? 'Hoy' : diasSemana[dateObj.getDay()];
          const tMax = temperature_2m_max[idx] !== undefined ? Math.round(temperature_2m_max[idx]) : 20;
          const tMin = temperature_2m_min[idx] !== undefined ? Math.round(temperature_2m_min[idx]) : 10;
          const rain = precipitation_sum[idx] || 0.0;

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
                dayName: nombreDia === 'Hoy' ? 'Hoy' : diasSemana[dateObj.getDay()],
                hourly: []
              };

              for (let i = 0; i < hourlyForecast.time.length; i++) {
                if (hourlyForecast.time[i].startsWith(targetPrefix)) {
                  const dt = new Date(hourlyForecast.time[i]);
                  const tHour = dt.getHours().toString().padStart(2, '0') + ':00';
                  
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
                    temp: Math.round(hourlyForecast.temperature_2m?.[i] || 0),
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
              key={fechaStr}
              onClick={handleClick}
              className="apple-card p-3.5 flex items-center justify-between gap-3 text-xs cursor-pointer hover:scale-[1.01] transition border border-white/10"
            >
              {/* NOMBRE DEL DÍA */}
              <div className="w-16 font-bold text-white text-sm">
                {nombreDia}
              </div>

              {/* ICONO Y LLUVIA */}
              <div className="flex items-center gap-2 w-20">
                <IconComp className={`w-5 h-5 ${iconColor}`} />
                {rain > 0 ? (
                  <span className="text-[11px] font-bold text-sky-400 flex items-center gap-0.5">
                    <Droplets className="w-3 h-3" />
                    {rain.toFixed(1)}m
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">0%</span>
                )}
              </div>

              {/* RANGO TÉRMICO Y BARRA ESTILO BREEZY WEATHER */}
              <div className="flex-1 flex items-center gap-3">
                <span className="w-7 text-right font-mono text-cyan-300 font-bold text-xs">{tMin}°</span>
                <div className="flex-1 h-2 bg-slate-800/80 rounded-full relative overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400 rounded-full"
                    style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
                  />
                </div>
                <span className="w-7 text-left font-mono text-amber-300 font-bold text-xs">{tMax}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
