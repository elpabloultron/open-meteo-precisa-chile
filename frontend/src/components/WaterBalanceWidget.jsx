import React from 'react';
import { Sprout, Droplets, ArrowDown, ArrowUp, Snowflake, Info, ShieldCheck, Sun } from 'lucide-react';

export default function WaterBalanceWidget({ climaData }) {
  if (!climaData || !climaData.modo_agricola) return null;

  const { modo_agricola, pronostico_numerico_openmeteo } = climaData;

  const etoHoy = modo_agricola?.evapotranspiracion_eto_mm_dia ?? 3.5;
  const lluviaHoy = modo_agricola?.lluvia_caida_hoy_mm ?? 0.0;
  const deficitHoy = (etoHoy - lluviaHoy).toFixed(1);
  const horasFrio = modo_agricola?.horas_frio_acumuladas_24h ?? 0;

  // Extraer serie de 7 días de ETo estimada y lluvia pronosticada
  const daily = pronostico_numerico_openmeteo?.diario || pronostico_numerico_openmeteo?.diario_7dias || {};
  const times = daily.time?.slice(0, 7) || [];
  const rains = daily.precipitation_sum?.slice(0, 7) || [];
  const tMaxs = daily.temperature_2m_max?.slice(0, 7) || [];

  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  return (
    <div className="apple-card p-5 sm:p-6 space-y-5 shadow-2xl bg-slate-900/60 backdrop-blur-3xl border border-emerald-500/20">
      
      {/* CABECERA WIDGET BALANCE HÍDRICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/15 text-emerald-400 rounded-xl border border-emerald-500/25">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-tight">Balance Hídrico Agronómico & ETo</h3>
            <p className="text-[11px] text-slate-400 font-medium">Demanda evapotranspirativa FAO-56 vs reposición natural</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="apple-pill text-[10px] text-emerald-300 font-mono bg-emerald-500/15 border-emerald-500/30">
            Penman-Monteith FAO-56
          </span>
        </div>
      </div>

      {/* METRIC CARDS RESUMEN 24H */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* DEMANDA ETO */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Demanda ETo Hoy</span>
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{etoHoy} <span className="text-xs font-normal text-slate-400">mm/día</span></div>
          <div className="text-[10px] text-amber-300">Pérdida por cultivo de referencia</div>
        </div>

        {/* LLUVIA CAÍDA */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Precipitación Hoy</span>
            <Droplets className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-sky-300 font-mono">{lluviaHoy} <span className="text-xs font-normal text-slate-400">mm</span></div>
          <div className="text-[10px] text-sky-400">Recarga efectiva de suelo</div>
        </div>

        {/* DÉFICIT DE RIEGO */}
        <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Lámina Neta a Reponer</span>
            <Sprout className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300 font-mono">
            {deficitHoy > 0 ? `-${deficitHoy}` : `+${Math.abs(deficitHoy)}`} <span className="text-xs font-normal text-slate-400">mm</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-bold font-mono">
            {deficitHoy > 0 ? 'Déficit Hídrico (Regar)' : 'Superávit Hídrico'}
          </div>
        </div>

      </div>

      {/* PROYECCIÓN COMPARATIVA SEMANAL (BARRAS DE BALANCE) */}
      {times.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Proyección Semanal: Demanda ETo (Ámbar) vs Lluvia Prevista (Azul)</span>
            <span className="text-[10px] text-slate-400">mm/día</span>
          </div>

          <div className="space-y-1.5">
            {times.map((fStr, idx) => {
              const dt = new Date(fStr + 'T12:00:00');
              const dName = idx === 0 ? 'Hoy' : diasSemana[dt.getDay() || 0];
              const tMax = tMaxs[idx] || 20;
              const estEto = Math.max(1.8, ((tMax * 0.18) + (etoHoy * 0.4))).toFixed(1);
              const pSum = (rains[idx] || 0).toFixed(1);

              const etoPct = Math.min(100, (estEto / 7) * 100);
              const rainPct = Math.min(100, (pSum / 7) * 100);

              return (
                <div key={fStr || idx} className="p-2.5 rounded-xl bg-slate-950/30 border border-white/5 flex items-center gap-3 text-xs">
                  <div className="w-10 font-bold text-white text-[11px]">{dName}</div>
                  
                  {/* BARRAS DE PROYECCIÓN */}
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${etoPct}%` }} title={`ETo: ${estEto} mm`} />
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                      <div className="h-full bg-sky-400 rounded-full" style={{ width: `${rainPct}%` }} title={`Lluvia: ${pSum} mm`} />
                    </div>
                  </div>

                  {/* VALORES NUMÉRICOS */}
                  <div className="w-24 text-right font-mono text-[10px] space-x-1.5">
                    <span className="text-amber-300 font-bold">{estEto}m</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-sky-300 font-bold">{pSum}m</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
