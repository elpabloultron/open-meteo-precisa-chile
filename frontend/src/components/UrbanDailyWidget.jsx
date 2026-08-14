import React from 'react';
import { Umbrella, Shirt, Activity, Car, Sun, ShieldCheck, HeartPulse, Droplets } from 'lucide-react';

export default function UrbanDailyWidget({ climaData }) {
  if (!climaData || !climaData.modo_urbano) return null;

  const { modo_urbano, modo_agricola, pronostico_numerico_openmeteo } = climaData;
  const temp = modo_urbano?.temperatura_c ?? 16;
  const sensacion = modo_urbano?.sensacion_termica_c ?? temp;
  const tMin = modo_agricola?.temperatura_minima_hoy_c ?? 8;
  const tMax = modo_agricola?.temperatura_maxima_hoy_c ?? 22;
  const uv = modo_urbano?.indice_uv ?? 5;
  const sinca = modo_urbano?.calidad_aire_sinca || {};
  const aqi = sinca.aqi || 25;
  const lluviaHoy = modo_agricola?.lluvia_caida_hoy_mm ?? 0;

  // Lluvia proyectada en las próximas 24h
  const daily = pronostico_numerico_openmeteo?.diario || pronostico_numerico_openmeteo?.diario_7dias || {};
  const rainForecast = (daily.precipitation_sum?.[0] ?? lluviaHoy);

  // 1. Recomendación de ropa
  let clothingAdvice = 'Ropa liviana o polera';
  if (temp < 8) clothingAdvice = 'Abrigo grueso, bufanda y guantes';
  else if (temp < 15) clothingAdvice = 'Chaqueta abrigada o cortavientos';
  else if (temp < 22) clothingAdvice = 'Polerón liviano o manga larga';
  else if (temp > 28) clothingAdvice = 'Ropa holgada, fresca e hidratación';

  // 2. Paraguas
  const needsUmbrella = rainForecast > 0.5 || lluviaHoy > 0.5;

  // 3. Escarcha vehicular matutina
  const vehicleFrost = tMin <= 2.5;

  // 4. Deporte al aire libre según AQI y calor
  let sportAdvice = 'Excelente para correr o ciclismo';
  if (aqi > 100 || sinca.categoria === 'Alerta' || sinca.categoria === 'Preemergencia') {
    sportAdvice = 'Precaución por calidad del aire';
  } else if (temp > 30) {
    sportAdvice = 'Evitar deporte al mediodía';
  } else if (rainForecast > 5) {
    sportAdvice = 'Lluvia intensa prevista';
  }

  return (
    <div className="apple-card p-4 sm:p-5 space-y-3.5 shadow-xl bg-slate-900/40 backdrop-blur-2xl border border-white/10">
      
      {/* CABECERA MINIMALISTA ESTILO APPLE */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <div className="flex items-center gap-1.5">
          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
          <span>Recomendaciones del Día</span>
        </div>
      </div>

      {/* TARJETAS TÁCTICAS DE RECOMENDACIÓN */}
      <div className="grid grid-cols-2 gap-2.5">
        
        {/* VESTIMENTA */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Vestimenta</span>
            <Shirt className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xs font-bold text-white leading-snug">{clothingAdvice}</div>
        </div>

        {/* PARAGUAS */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Paraguas</span>
            <Umbrella className={`w-3.5 h-3.5 ${needsUmbrella ? 'text-blue-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-xs font-bold ${needsUmbrella ? 'text-blue-300' : 'text-slate-300'}`}>
            {needsUmbrella ? 'Llevar paraguas hoy' : 'No es necesario'}
          </div>
        </div>

        {/* ACTIVIDAD FÍSICA */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Deporte Exterior</span>
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xs font-bold text-emerald-300 leading-snug">{sportAdvice}</div>
        </div>

        {/* ESCARCHA VEHICULAR */}
        <div className="p-3 rounded-2xl bg-white/[0.04] border border-white/5 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
            <span>Vidrios Auto</span>
            <Car className={`w-3.5 h-3.5 ${vehicleFrost ? 'text-cyan-400' : 'text-slate-500'}`} />
          </div>
          <div className={`text-xs font-bold ${vehicleFrost ? 'text-cyan-300' : 'text-slate-300'}`}>
            {vehicleFrost ? 'Posible escarcha' : 'Sin escarcha'}
          </div>
        </div>

      </div>

    </div>
  );
}
