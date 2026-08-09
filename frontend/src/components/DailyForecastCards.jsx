import React from 'react';
import { Sun, CloudSun, CloudRain, Snowflake, Calendar } from 'lucide-react';

export default function DailyForecastCards({ dailyForecast, hourlyForecast, onSelectMetric, onOpenHourly }) {
  if (!dailyForecast || !dailyForecast.time || dailyForecast.time.length === 0) {
    return (
      <div className="glass-panel p-6 text-center text-slate-400 text-xs">
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
    <div className="apple-card p-6 space-y-4">
      
      {/* CABECERA */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-base font-bold text-white">
              Pronóstico a 7 Días
            </h3>
            <p className="text-[11px] text-slate-400">
              Haz clic en cualquier día para abrir el desglose agrometeorológico
            </p>
          </div>
        </div>
        <span className="text-[11px] text-sky-400 font-bold bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
          Oficial DMC & Open-Meteo
        </span>
      </div>

      {/* LISTA ESTILO APPLE WEATHER DE 7 DÍAS INTERACTIVA */}
      <div className="space-y-2 pt-1">
        {time.slice(0, 7).map((fechaStr, idx) => {
          const dateObj = new Date(fechaStr + 'T12:00:00');
          const esHoy = idx === 0;
          const nombreDia = esHoy ? 'Hoy' : diasSemana[dateObj.getDay()];
          const tMax = temperature_2m_max[idx] !== undefined ? Math.round(temperature_2m_max[idx]) : 20;
          const tMin = temperature_2m_min[idx] !== undefined ? Math.round(temperature_2m_min[idx]) : 10;
          const rain = precipitation_sum[idx] || 0.0;
          const eto = et0_fao_evapotranspiration[idx] || 0.0;
          const uv = uv_index_max[idx] || 5.0;

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
              const targetPrefix = fechaStr; // e.g. "2026-08-04"
              const dayHourlyData = {
                dayName: nombreDia === 'Hoy' ? 'Hoy' : diasSemana[dateObj.getDay()],
                hourly: []
              };

              for (let i = 0; i < hourlyForecast.time.length; i++) {
                if (hourlyForecast.time[i].startsWith(targetPrefix)) {
                  const dt = new Date(hourlyForecast.time[i]);
                  const tHour = dt.getHours().toString().padStart(2, '0') + ':00';
                  
                  // Simplified icon logic for drawer
                  let HIcon = '🌤️';
                  const hRain = hourlyForecast.precipitation?.[i] || 0;
                  const hTemp = hourlyForecast.temperature_2m?.[i] || 0;
                  if (hRain > 1) HIcon = '🌧️';
                  else if (hRain > 0) HIcon = '🌦️';
                  else if (hTemp <= 2) HIcon = '❄️';
                  else if (hourlyForecast.weather_code?.[i] === 0) HIcon = '☀️';

                  dayHourlyData.hourly.push({
                    timeLabel: tHour,
                    temp: Math.round(hTemp),
                    precip: hRain,
                    wind: Math.round(hourlyForecast.wind_speed_10m?.[i] || 0),
                    icon: HIcon
                  });
                }
              }
              onOpenHourly(dayHourlyData);
            } else if (onSelectMetric) {
              onSelectMetric({
                title: `Pronóstico ${nombreDia} (${dateObj.getDate()}/${dateObj.getMonth() + 1})`,
                valor: `${tMax}°C / ${tMin}°C`,
                unidad: 'Mín / Máx',
                descripcion: `Mínima: ${tMin}°C, Máxima: ${tMax}°C. Lluvia acumulada estimada: ${rain} mm. Evapotranspiración ETo: ${eto} mm/día. UV Máximo: ${uv}.`,
                recomendacion: rain > 2 ? 'Suspender aplicaciones de fitosanitarios por precipitaciones.' : 'Condiciones óptimas para ventilación de valles.'
              });
            }
          };

          return (
            <div
              key={fechaStr}
              onClick={handleClick}
              className={`p-3.5 rounded-2xl flex items-center justify-between gap-4 transition duration-200 cursor-pointer ${
                esHoy
                  ? 'bg-gradient-to-r from-sky-950/60 to-slate-900 border border-sky-500/40 hover:border-sky-400'
                  : 'bg-slate-950/40 border border-slate-800/60 hover:bg-slate-900/80 hover:border-slate-700'
              }`}
            >
              {/* DÍA & FECHA */}
              <div className="w-24 shrink-0">
                <div className={`text-sm font-bold ${esHoy ? 'text-sky-300' : 'text-white'}`}>
                  {nombreDia}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {dateObj.getDate()}/{dateObj.getMonth() + 1}
                </div>
              </div>

              {/* ÍCONO Y PROBABILIDAD LLUVIA */}
              <div className="flex items-center gap-2 w-20 shrink-0">
                <IconComp className={`w-6 h-6 ${iconColor}`} />
                {rain > 0 ? (
                  <span className="text-[11px] font-bold text-sky-400 font-mono">{rain}mm</span>
                ) : (
                  <span className="text-[10px] text-slate-500">Seco</span>
                )}
              </div>

              {/* TEMPERATURA MÍNIMA */}
              <div className="w-10 text-right font-mono font-bold text-sm text-cyan-300 shrink-0">
                {tMin}°
              </div>

              {/* BARRA DE GRADIENTE DE TEMPERATURA RANGO SEMANAL */}
              <div className="flex-1 hidden sm:block h-2 bg-slate-800/80 rounded-full relative overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 rounded-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400"
                  style={{
                    left: `${leftPct}%`,
                    right: `${rightPct}%`
                  }}
                />
              </div>

              {/* TEMPERATURA MÁXIMA */}
              <div className="w-10 text-left font-mono font-bold text-sm text-amber-300 shrink-0">
                {tMax}°
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
