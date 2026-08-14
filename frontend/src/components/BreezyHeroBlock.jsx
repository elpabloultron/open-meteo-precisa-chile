import React from 'react';
import { MapPin, ShieldCheck, ArrowUp, ArrowDown, Sun, CloudSun, CloudRain, Snowflake, CloudLightning, Cloud, FileText, Radio, Navigation, Activity, Sparkles, Clock, RefreshCw, Share2 } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

function getWeatherVectorIcon(code, temp) {
  if (temp <= 2) return <Snowflake className="w-12 h-12 text-cyan-300 drop-shadow-[0_8px_25px_rgba(103,232,249,0.5)] animate-pulse" />;
  if (code === 0) return <Sun className="w-12 h-12 text-amber-400 drop-shadow-[0_8px_25px_rgba(251,191,36,0.5)] animate-pulse" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-12 h-12 text-sky-300 drop-shadow-[0_8px_25px_rgba(56,189,248,0.5)]" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-12 h-12 text-blue-400 drop-shadow-[0_8px_25px_rgba(96,165,250,0.5)]" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-12 h-12 text-cyan-300 drop-shadow-[0_8px_25px_rgba(103,232,249,0.5)]" />;
  if (code >= 95) return <CloudLightning className="w-12 h-12 text-purple-400 drop-shadow-[0_8px_25px_rgba(192,132,252,0.5)]" />;
  return <Cloud className="w-12 h-12 text-slate-300 drop-shadow-[0_8px_25px_rgba(148,163,184,0.5)]" />;
}

export default function BreezyHeroBlock({
  climaData,
  onOpenEstacionesCercanas,
  onSelectMetric,
  onOpenAgroReport,
  onOpenMapDrawer,
  previewHourData,
  onResetPreview
}) {
  if (!climaData || !climaData.estacion) return null;

  const { estacion, modo_urbano, modo_agricola, metadatos } = climaData;

  const isPreview = Boolean(previewHourData);
  const temp = isPreview ? previewHourData.temp : (modo_urbano?.temperatura_c ?? 15);
  const sensacion = isPreview ? previewHourData.temp : (modo_urbano?.sensacion_termica_c ?? temp);
  const tMin = modo_agricola?.temperatura_minima_hoy_c ?? 8;
  const tMax = modo_agricola?.temperatura_maxima_hoy_c ?? 20;
  const weatherCode = isPreview ? previewHourData.code : 0;

  const handleShareReport = () => {
    const wind = modo_urbano?.viento_kmh ?? 10;
    const rh = modo_urbano?.humedad_relativa_pct ?? 65;
    const dewPoint = (temp - ((100 - rh) / 5)).toFixed(1);
    const eto = modo_agricola?.evapotranspiracion_eto_mm_dia ?? 3.5;
    
    const text = `🌤️ *MeteoPrecisa Chile — Reporte Operativo*\n` +
      `📍 *Ubicación:* ${estacion?.sector || 'Predio'} (${estacion?.nombre})\n` +
      `🌡️ *Temperatura:* ${Math.round(temp)}°C (Mín: ${Math.round(tMin)}° / Máx: ${Math.round(tMax)}°)\n` +
      `💨 *Viento:* ${wind} km/h • *Humedad:* ${rh}%\n` +
      `💧 *Demanda ETo:* ${eto} mm/día • *Punto de Rocío:* ${dewPoint}°C\n` +
      `🔗 Telemetría en vivo: https://frontend-vert-seven-61.vercel.app`;

    if (navigator.share) {
      navigator.share({ title: 'MeteoPrecisa Chile', text }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  return (
    <div className="text-center py-6 sm:py-10 space-y-3 relative">
      
      {/* 1. COMUNA / SECTOR PRINCIPAL */}
      <div className="space-y-1">
        <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-md flex items-center justify-center gap-2">
          <span>{estacion?.sector || 'Tu Ubicación'}</span>
          <span className="text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/30">
            GPS Exacto
          </span>
        </h2>
        
        <p className="text-xs text-slate-300/80 font-medium">
          Estación Física: <strong className="text-white">{estacion?.nombre}</strong> ({metadatos?.distancia_km || 0} km)
        </p>
      </div>

      {/* 2. TEMPERATURA MASIVA ESTILO APPLE WEATHER (SF PRO NUMERICAL) */}
      <div className="flex items-center justify-center my-2">
        <div className="relative inline-flex items-start">
          <span className="text-8xl sm:text-9xl font-extralight tracking-tighter text-white font-mono leading-none drop-shadow-xl">
            {Math.round(temp)}
          </span>
          <span className="text-4xl sm:text-6xl font-thin text-slate-300 ml-1 mt-1">
            °
          </span>
        </div>
      </div>

      {/* 3. ESTADO DEL CIELO Y CONDICIÓN */}
      <div className="space-y-1">
        <div className="text-base sm:text-xl font-medium text-slate-100 drop-shadow-sm flex items-center justify-center gap-2">
          {getWeatherVectorIcon(weatherCode, temp)}
          <span>{isPreview ? `Proyección para las ${previewHourData.timeLabel}` : (modo_urbano?.inversion_termica?.estado || 'Despejado')}</span>
        </div>

        {/* 4. SENSACIÓN TÉRMICA & EXTREMOS DEL DÍA */}
        <div className="text-xs sm:text-sm font-medium text-slate-300 flex items-center justify-center gap-3">
          <span>Sensación <strong className="text-amber-300 font-bold font-mono">{Math.round(sensacion)}°</strong></span>
          <span className="opacity-40">•</span>
          <span>Mín: <strong className="text-cyan-300 font-mono">{Math.round(tMin)}°</strong></span>
          <span className="opacity-40">•</span>
          <span>Máx: <strong className="text-amber-300 font-mono">{Math.round(tMax)}°</strong></span>
        </div>
      </div>

      {/* 5. PÍLDORAS DE ACCIÓN OPERATIVA */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
        {isPreview && (
          <button
            onClick={onResetPreview}
            className="apple-pill text-xs text-sky-300 bg-sky-500/25 border-sky-400/50 font-bold hover:scale-105 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Volver a Tiempo Real</span>
          </button>
        )}

        <button
          onClick={handleShareReport}
          title="Compartir reporte operativo por WhatsApp"
          className="apple-pill text-xs text-emerald-300 bg-emerald-500/20 border-emerald-500/40 font-bold hover:scale-105 transition cursor-pointer shadow-sm"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Compartir WhatsApp</span>
        </button>

        {onOpenAgroReport && (
          <button
            onClick={onOpenAgroReport}
            className="apple-pill text-xs text-slate-200 bg-white/10 border-white/20 font-bold hover:scale-105 transition cursor-pointer shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-sky-400" />
            <span>Boletín Oficial (PDF)</span>
          </button>
        )}

        <button
          onClick={onOpenEstacionesCercanas}
          className="apple-pill text-xs text-slate-300 hover:text-white font-semibold cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cambiar Estación</span>
        </button>
      </div>

    </div>
  );
}
