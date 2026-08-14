import React from 'react';
import { Snowflake, Thermometer, Droplets, Clock, AlertTriangle, ShieldCheck, Moon } from 'lucide-react';

export default function FrostMonitorWidget({ climaData }) {
  if (!climaData || !climaData.modo_agricola) return null;

  const { modo_urbano, modo_agricola, pronostico_numerico_openmeteo } = climaData;
  const tMinHoy = modo_agricola?.temperatura_minima_hoy_c ?? 4;
  const tempActual = modo_urbano?.temperatura_c ?? 14;
  const rh = modo_urbano?.humedad_relativa_pct ?? 70;

  // Punto de rocío
  const dewPoint = (tempActual - ((100 - rh) / 5)).toFixed(1);

  // Determinar nivel de riesgo de helada en la madrugada
  let frostRisk = 'bajo'; // 'bajo' | 'medio' | 'alto' | 'critico'
  let riskTitle = 'Bajo Riesgo de Helada';
  let riskDesc = 'Temperaturas nocturnas sobre 3°C. No se prevé daño en yemas ni tejidos sensibles.';
  let criticalHour = '06:30 AM';

  if (tMinHoy <= -1.5) {
    frostRisk = 'critico';
    riskTitle = 'ALERTA: HELADA NEGRA / SEVERA PROYECTADA';
    riskDesc = `Temperatura mínima prevista de ${tMinHoy}°C con punto de rocío bajo (${dewPoint}°C). Se aconseja activar control activo (torres de viento / aspersores).`;
    criticalHour = '05:00 AM - 07:30 AM';
  } else if (tMinHoy <= 1.0) {
    frostRisk = 'alto';
    riskTitle = 'ALERTA: RIESGO DE HELADA RADIANTE MATUTINA';
    riskDesc = `Temperatura mínima proyectada en ${tMinHoy}°C. Riesgo de escarcha y congelamiento superficial en sectores bajos.`;
    criticalHour = '05:30 AM - 07:00 AM';
  } else if (tMinHoy <= 3.0) {
    frostRisk = 'medio';
    riskTitle = 'PRECAUCIÓN: TEMPERATURAS CERCANAS A 0°C';
    riskDesc = `Mínima prevista de ${tMinHoy}°C. Monitorear inversión térmica en valles y depresiones.`;
    criticalHour = '06:00 AM';
  }

  const riskColors = {
    bajo: {
      card: 'border-cyan-500/20 bg-slate-900/60',
      pill: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      icon: ShieldCheck
    },
    medio: {
      card: 'border-amber-500/30 bg-amber-950/20',
      pill: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: AlertTriangle
    },
    alto: {
      card: 'border-cyan-400/40 bg-cyan-950/30',
      pill: 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50',
      icon: Snowflake
    },
    critico: {
      card: 'border-rose-500/50 bg-rose-950/30',
      pill: 'bg-rose-500/30 text-rose-200 border-rose-500/60',
      icon: Snowflake
    }
  };

  const currentConf = riskColors[frostRisk];
  const IconComponent = currentConf.icon;

  return (
    <div className={`apple-card p-5 sm:p-6 space-y-4 shadow-2xl backdrop-blur-3xl border ${currentConf.card}`}>
      
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-2xl border ${currentConf.pill}`}>
            <IconComponent className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-white tracking-tight">
                Monitor Preventivo de Heladas & Rocío
              </h3>
              <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${currentConf.pill}`}>
                {riskTitle}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5 font-medium">
              {riskDesc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="apple-pill text-[10px] text-cyan-300 font-mono">
            Agroclimatología DMC/INIA
          </span>
        </div>
      </div>

      {/* METRICAS PREDICTIVAS DE MADRUGADA */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        
        {/* T° MÍNIMA MADRUGADA */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>T° Mínima Prevista</span>
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-extrabold text-cyan-300 font-mono">{tMinHoy}°C</div>
          <div className="text-[10px] text-slate-400">Punto más frío del día</div>
        </div>

        {/* PUNTO DE ROCÍO */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Punto de Rocío (Td)</span>
            <Droplets className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{dewPoint}°C</div>
          <div className="text-[10px] text-slate-400">{dewPoint < 0 ? '⚠ Helada Negra (Seca)' : '✓ Helada Blanca (Escarcha)'}</div>
        </div>

        {/* VENTANA CRÍTICA */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Ventana Crítica</span>
            <Clock className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-extrabold text-white font-mono">{criticalHour}</div>
          <div className="text-[10px] text-purple-300">Horario de alerta térmica</div>
        </div>

        {/* RECOMENDACIÓN DE CONTROL */}
        <div className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>Protocolo de Riego</span>
            <Moon className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-sm font-extrabold text-white">
            {tMinHoy <= 1 ? 'Activar a 2.0°C' : 'Sin Alerta Activa'}
          </div>
          <div className="text-[10px] text-slate-400">Protección en floración/brote</div>
        </div>

      </div>

    </div>
  );
}
