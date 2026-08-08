import React from 'react';
import { MapPin, ShieldAlert, Radio, ShieldCheck, Share2, Clock } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

export default function WeatherHeader({ climaData, onOpenEstacionesCercanas }) {
  if (!climaData) return null;

  const { estacion, modo_urbano, modo_agricola, metadatos, alerta_oficial_senapred, transparency_metadata } = climaData;

  const temp = modo_urbano?.temperatura_c ?? 18;
  const sensacion = modo_urbano?.sensacion_termica_c ?? 18;
  const tMin = modo_agricola?.temperatura_minima_hoy_c ?? 10;
  const tMax = modo_agricola?.temperatura_maxima_hoy_c ?? 22;

  const isoTimestamp = transparency_metadata?.last_fetched_timestamp;
  const { localTimeLabel, relativeTimeLabel } = formatLocalTime(isoTimestamp);

  const compartir = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: `MeteoPrecisa Chile — ${estacion?.nombre || 'Clima'}`,
        text: `Revisa el clima en vivo para ${estacion?.nombre}:`,
        url: url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert(`🔗 Enlace copiado al portapapeles: ${url}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* BANNER ALERTA SENAPRED SI EXISTE */}
      {alerta_oficial_senapred && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-orange-950/80 to-slate-900 border border-red-500/50 text-red-200 flex items-start gap-3.5 shadow-2xl animate-pulse-soft">
          <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold bg-red-500/30 text-red-200 rounded-full border border-red-500/40 uppercase tracking-wider">
                Alerta SENAPRED Oficial
              </span>
              <span className="text-xs text-red-300 font-bold">{alerta_oficial_senapred.nivel}</span>
            </div>
            <h4 className="text-sm font-extrabold text-white">{alerta_oficial_senapred.evento || 'Alerta Meteorológica Nacional'}</h4>
            <p className="text-xs text-red-200/90 leading-relaxed">{alerta_oficial_senapred.comunas || alerta_oficial_senapred.descripcion}</p>
          </div>
        </div>
      )}

      {/* HERO CARD ESTILO APPLE WEATHER CON BOTÓN COMPARTIR Y VER ESTACIONES CERCANAS */}
      <div className="apple-card relative p-8 md:p-12 overflow-hidden text-center space-y-6">
        {/* Radial ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* BOTÓN COMPARTIR Y UBICACIÓN CERCANA */}
        <div className="flex items-center justify-between text-xs font-bold">
          <button 
            onClick={onOpenEstacionesCercanas}
            className="apple-pill flex items-center gap-2 text-sky-300 hover:text-white"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>{estacion?.sector || 'Chile'} • A {metadatos?.distancia_km} km</span>
            <span className="text-[10px] text-sky-400 underline">(5 Cercanas)</span>
          </button>

          <button 
            onClick={compartir}
            className="apple-pill flex items-center gap-1.5 text-slate-200 hover:text-white"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-300" />
            <span>Compartir</span>
          </button>
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">
          {estacion?.nombre}
        </h1>

        {/* TEMPERATURA GIGANTE ESTILO APPLE WEATHER */}
        <div className="py-2 relative z-10 flex flex-col items-center justify-center transition-transform hover:scale-[1.02] duration-500">
          <div className="apple-temp-hero text-8xl md:text-9xl tracking-tighter">
            {temp}°
          </div>
          <div className="text-xs font-semibold text-slate-300 flex items-center justify-center gap-3 md:gap-5 mt-4 apple-pill px-6 py-2.5">
            <span>Sensación <strong className="text-sky-300 ml-1 font-mono">{sensacion}°</strong></span>
            <span className="text-white/20">|</span>
            <span>Mín <strong className="text-cyan-300 ml-1 font-mono">{tMin}°</strong></span>
            <span className="text-white/20">|</span>
            <span>Máx <strong className="text-amber-300 ml-1 font-mono">{tMax}°</strong></span>
          </div>
        </div>

        {/* PILLS DE RED Y TRANSPARENCIA CON HORA CERRADA */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
          <span className="apple-pill inline-flex items-center gap-1.5 text-sky-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            {estacion?.red_oficial || 'DMC Chile'}
          </span>

          <span className="apple-pill inline-flex items-center gap-1.5 text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {localTimeLabel}
          </span>
          <span className="apple-pill inline-flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {relativeTimeLabel}
          </span>
        </div>

      </div>
    </div>
  );
}
