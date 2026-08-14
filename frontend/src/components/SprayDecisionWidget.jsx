import React from 'react';
import { Wind, Droplets, Thermometer, CheckCircle2, AlertTriangle, XCircle, Info, ShieldCheck, Gauge } from 'lucide-react';

export default function SprayDecisionWidget({ climaData }) {
  if (!climaData || !climaData.modo_agricola) return null;

  const { modo_urbano, modo_agricola } = climaData;
  const temp = modo_urbano?.temperatura_c ?? 16;
  const rh = modo_urbano?.humedad_relativa_pct ?? 65;
  const windKmh = modo_urbano?.viento_kmh ?? 8;

  // Cálculo aproximado de Punto de Rocío y Delta T (T° seca - T° húmeda)
  const dewPoint = (temp - ((100 - rh) / 5));
  const deltaT = Math.max(0.5, ((temp - dewPoint) * 0.66)).toFixed(1);

  // Evaluación de condiciones agronómicas de aplicación
  let status = 'optimo'; // 'optimo' | 'precaucion' | 'no_aplicar'
  let mainReason = 'Condiciones meteorológicas ideales para pulverización fitosanitaria.';
  let windAdvice = 'Viento en rango seguro (3 - 15 km/h)';
  let deltaAdvice = `Delta T: ${deltaT}°C (Rango óptimo 2 - 8°C)`;

  if (windKmh > 15) {
    status = 'no_aplicar';
    mainReason = `Viento excesivo (${windKmh} km/h). Alto riesgo de deriva hacia cultivos colindantes.`;
  } else if (windKmh < 3) {
    status = 'precaucion';
    mainReason = 'Calma atmosférica (< 3 km/h). Posible inversión térmica; las microgotas pueden quedar en suspensión.';
  } else if (deltaT > 8) {
    status = 'no_aplicar';
    mainReason = `Delta T crítico (${deltaT}°C). Rápida evaporación de gotas antes de alcanzar el objetivo foliar.`;
  } else if (deltaT < 2) {
    status = 'precaucion';
    mainReason = `Delta T bajo (${deltaT}°C). Alta humedad ambiental; el producto tardará en secar aumentando riesgo de lavado.`;
  } else if (temp > 28) {
    status = 'no_aplicar';
    mainReason = `Temperatura alta (${temp}°C). Riesgo de fitotoxicidad y volatilización del activo.`;
  }

  const statusConfig = {
    optimo: {
      label: 'VENTANA ÓPTIMA DE PULVERIZACIÓN',
      color: 'emerald',
      bg: 'bg-emerald-950/25 border-emerald-500/30 text-emerald-400',
      pill: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: CheckCircle2
    },
    precaucion: {
      label: 'PRECAUCIÓN AL APLICAR',
      color: 'amber',
      bg: 'bg-amber-950/25 border-amber-500/30 text-amber-400',
      pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle
    },
    no_aplicar: {
      label: 'NO PULVERIZAR (CONDICIÓN ADVERSA)',
      color: 'rose',
      bg: 'bg-rose-950/25 border-rose-500/30 text-rose-400',
      pill: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: XCircle
    }
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <div className={`apple-card p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-3xl border ${currentStatus.bg}`}>
      
      {/* CABECERA CON SEMÁFORO AGRONÓMICO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl border ${currentStatus.pill}`}>
            <StatusIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Ventana de Pulverización Fitosanitaria
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${currentStatus.pill}`}>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {mainReason}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="apple-pill text-[10px] text-slate-300 font-mono">
            Estándar FAO & Agromet
          </span>
        </div>
      </div>

      {/* PARÁMETROS CRÍTICOS (DELTA T, VIENTO, HUMEDAD) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        
        {/* DELTA T */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Delta T (ΔT)</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{deltaT}°C</div>
          <div className="text-[10px] text-slate-400">{deltaT >= 2 && deltaT <= 8 ? '✓ Rango Óptimo (2-8°C)' : '⚠ Fuera de Rango'}</div>
        </div>

        {/* VELOCIDAD DEL VIENTO */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Viento en Lote</span>
            <Wind className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{windKmh} <span className="text-xs font-normal text-slate-400">km/h</span></div>
          <div className="text-[10px] text-slate-400">{windKmh >= 3 && windKmh <= 15 ? '✓ Seguro (3-15 km/h)' : '⚠ Riesgo de Deriva'}</div>
        </div>

        {/* HUMEDAD RELATIVA */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Humedad Relativa</span>
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{rh}%</div>
          <div className="text-[10px] text-slate-400">{rh >= 50 ? '✓ Humedad Adecuada' : '⚠ Aire Seco'}</div>
        </div>

        {/* TEMPERATURA FOLIAR */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Temperatura</span>
            <Thermometer className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{temp}°C</div>
          <div className="text-[10px] text-slate-400">{temp <= 25 ? '✓ T° Segura (< 25°C)' : '⚠ Alta Evaporación'}</div>
        </div>

      </div>

    </div>
  );
}
