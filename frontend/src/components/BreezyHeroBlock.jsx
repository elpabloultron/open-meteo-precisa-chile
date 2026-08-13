import React from 'react';
import { MapPin, ShieldCheck, ArrowUp, ArrowDown, Sun, CloudSun, CloudRain, Snowflake, CloudLightning, Cloud, FileText, Radio, Navigation, Activity } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

function getWeatherVectorIcon(code) {
  if (code === 0) return <Sun className="w-16 h-16 sm:w-20 sm:h-20 text-amber-400 drop-shadow-[0_8px_25px_rgba(251,191,36,0.35)] animate-pulse" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-16 h-16 sm:w-20 sm:h-20 text-sky-300 drop-shadow-[0_8px_25px_rgba(56,189,248,0.35)]" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400 drop-shadow-[0_8px_25px_rgba(96,165,250,0.35)]" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-300 drop-shadow-[0_8px_25px_rgba(103,232,249,0.35)]" />;
  if (code >= 95) return <CloudLightning className="w-16 h-16 sm:w-20 sm:h-20 text-purple-400 drop-shadow-[0_8px_25px_rgba(192,132,252,0.35)]" />;
  return <Cloud className="w-16 h-16 sm:w-20 sm:h-20 text-slate-400 drop-shadow-[0_8px_25px_rgba(148,163,184,0.35)]" />;
}

export default function BreezyHeroBlock({ climaData, onOpenEstacionesCercanas, onSelectMetric, onOpenAgroReport }) {
  if (!climaData || !climaData.estacion) return null;

  const { estacion, modo_urbano, modo_agricola, metadatos } = climaData;

  const temp = modo_urbano?.temperatura_c ?? 15;
  const sensacion = modo_urbano?.sensacion_termica_c ?? temp;
  const tMin = modo_agricola?.temperatura_minima_hoy_c ?? 8;
  const tMax = modo_agricola?.temperatura_maxima_hoy_c ?? 20;

  const isoTimestamp = metadatos?.servidor_timestamp
    ? new Date(metadatos.servidor_timestamp * 1000).toISOString()
    : null;
  const { localTimeLabel } = formatLocalTime(isoTimestamp);

  const handleLineageClick = () => {
    if (onSelectMetric) {
      onSelectMetric({
        title: `Estación Física: ${estacion?.nombre}`,
        value: `${temp}°C`,
        unit: "Telemetría Directa en Terreno",
        description: `Esta medición proviene directamente de los sensores físicos oficiales de la red ${estacion?.red_oficial || 'Agromet INIA / DMC'} (Estación ID: ${estacion?.id}). Coordenadas: ${estacion?.coordenadas?.latitud}, ${estacion?.coordenadas?.longitud}. Distancia: ${metadatos?.distancia_km || 0} km de tu ubicación GPS.`,
        advice: "Datos auditados bajo los estándares de la Organización Meteorológica Mundial (OMM WMO-No. 8).",
        category: "Telemetría Física Oficial",
        stationId: estacion?.id,
        rawSourceUrl: estacion?.raw_source_url || "https://agrometeorologia.cl",
        isLiveData: true
      });
    }
  };

  return (
    <div className="apple-card p-6 sm:p-8 relative overflow-hidden space-y-6 shadow-2xl border border-white/15 bg-slate-900/60">
      
      {/* 1. DISTINCIÓN CLARA: TU UBICACIÓN GPS vs ESTACIÓN FÍSICA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs border-b border-white/10 pb-4">
        
        {/* TU UBICACIÓN GPS */}
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-sm text-white flex items-center gap-1.5">
              <span>{estacion?.sector || 'Tu Ubicación'}</span>
              <span className="text-[10px] text-sky-400 font-normal px-2 py-0.5 bg-sky-500/10 rounded-full border border-sky-500/20">
                GPS Exacto
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Coordenadas: {estacion?.coordenadas?.latitud?.toFixed(4)}, {estacion?.coordenadas?.longitud?.toFixed(4)}
            </p>
          </div>
        </div>

        {/* ESTACIÓN DE REFERENCIA Y BOTÓN DE INFORME */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenAgroReport && (
            <button
              onClick={onOpenAgroReport}
              className="apple-pill flex items-center gap-1.5 text-emerald-300 bg-emerald-500/15 border-emerald-500/30 font-bold hover:scale-105 transition cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ver Boletín Agrícola Completo (PDF)</span>
            </button>
          )}

          <button
            onClick={onOpenEstacionesCercanas}
            className="apple-pill flex items-center gap-1.5 text-slate-300 hover:text-white font-semibold cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Estación: {estacion?.nombre}</span>
            <span className="text-[10px] text-emerald-400 font-mono">({metadatos?.distancia_km || 0} km)</span>
          </button>
        </div>

      </div>

      {/* 2. BLOQUE HÉROE PRINCIPAL: TEMPERATURA Y ESTADO */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-1">
        
        {/* ICONO Y TEMPERATURA MASIVA */}
        <div className="flex items-center gap-6">
          {getWeatherVectorIcon(0)}
          <div>
            <div className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-white font-mono leading-none">
              {temp}°
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-200 mt-2 flex items-center gap-2">
              <span>{modo_urbano?.inversion_termica?.estado || 'Despejado / Normal'}</span>
              <span className="opacity-40">•</span>
              <span>Sensación <strong className="font-mono text-amber-300">{sensacion}°C</strong></span>
            </div>
          </div>
        </div>

        {/* MIN/MAX Y TIMESTAMP EN VIVO */}
        <div className="flex flex-col items-end gap-2 text-right">
          <div className="apple-pill flex items-center gap-4 px-5 py-2 text-xs font-bold shadow-lg">
            <span className="flex items-center gap-1 text-cyan-300">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              Mín: <strong className="font-mono text-white">{tMin}°</strong>
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1 text-amber-300">
              <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
              Máx: <strong className="font-mono text-white">{tMax}°</strong>
            </span>
          </div>

          <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-semibold">{estacion?.red_oficial || 'Red Agromet INIA'}</span>
            <span className="opacity-40">•</span>
            <span>{localTimeLabel}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
