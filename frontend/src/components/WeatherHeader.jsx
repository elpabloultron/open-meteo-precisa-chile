import React from 'react';
import { MapPin, Share2, Radio, ShieldCheck, CloudSun, ArrowUp, ArrowDown } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

export default function WeatherHeader({ climaData, onOpenEstacionesCercanas }) {
  if (!climaData || !climaData.estacion) return null;

  const { estacion, modo_urbano, modo_agricola, metadatos, transparency_metadata } = climaData;

  const temp = modo_urbano?.temperatura_c ?? '--';
  const sensacion = modo_urbano?.sensacion_termica_c ?? temp;
  const tMin = modo_agricola?.temperatura_minima_hoy_c ?? '--';
  const tMax = modo_agricola?.temperatura_maxima_hoy_c ?? '--';

  const isoTimestamp = metadatos?.servidor_timestamp
    ? new Date(metadatos.servidor_timestamp * 1000).toISOString()
    : null;
  const { localTimeLabel } = formatLocalTime(isoTimestamp);

  const compartir = () => {
    if (navigator.share) {
      navigator.share({
        title: `MeteoPrecisa Chile - ${estacion.nombre}`,
        text: `Clima actual en ${estacion.nombre}: ${temp}°C (Sensación ${sensacion}°C). Datos de telemetría hiperlocal OMM.`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('¡Enlace de telemetría copiado al portapapeles!');
    }
  };

  return (
    <div className="space-y-4">
      
      {/* TARJETA HÉROE ESTILO APPLE WEATHER iOS 18 */}
      <div className="apple-card relative p-6 sm:p-10 md:p-14 overflow-hidden text-center space-y-5">
        
        {/* FILA DE CONTROLES FLOTANTES EN LA CABECERA */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs font-bold relative z-10">
          <button 
            onClick={onOpenEstacionesCercanas}
            className="apple-pill flex items-center gap-1.5 hover:scale-105 transition"
          >
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="truncate max-w-[220px] sm:max-w-none font-medium">{estacion?.sector || 'Chile'} • {metadatos?.distancia_km} km</span>
            <span className="text-[10px] text-sky-400 underline font-bold shrink-0">(5 Cercanas)</span>
          </button>

          <button 
            onClick={compartir}
            className="apple-pill flex items-center gap-1.5 hover:scale-105 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            <span>Compartir</span>
          </button>
        </div>

        {/* NOMBRE DE LA CIUDAD O ESTACIÓN */}
        <div className="space-y-1 relative z-10">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight">
            {estacion?.nombre}
          </h1>
          <p className="text-xs sm:text-sm font-semibold opacity-80 flex items-center justify-center gap-2">
            <span>{modo_urbano?.inversion_termica?.estado || 'Despejado'}</span>
            <span>•</span>
            <span>Sensación <strong className="font-mono">{sensacion}°C</strong></span>
          </p>
        </div>

        {/* TEMPERATURA HERO GIGANTE ESTILO NATIVO iOS 18 */}
        <div className="py-2 relative z-10 flex flex-col items-center justify-center">
          <div className="apple-temp-hero text-8xl sm:text-9xl md:text-[11rem] tracking-tighter leading-none my-1">
            {temp}°
          </div>

          {/* RANGO MÍNIMA Y MÁXIMA PÍLDORA SLIM */}
          <div className="apple-pill flex items-center gap-4 px-6 py-2 text-xs font-bold mt-2 shadow-lg">
            <span className="flex items-center gap-1 text-cyan-400">
              <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
              Mín: <strong className="font-mono text-white text-sm">{tMin}°</strong>
            </span>
            <span className="opacity-30">|</span>
            <span className="flex items-center gap-1 text-amber-400">
              <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
              Máx: <strong className="font-mono text-white text-sm">{tMax}°</strong>
            </span>
          </div>
        </div>

        {/* PÍLDORAS DE TRANSMISIÓN EN VIVO Y LINAJE OMM */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs relative z-10">
          {metadatos?.lineage_etiqueta && (
            <span className="apple-pill inline-flex items-center gap-1.5 text-xs">
              {metadatos.lineage_etiqueta}
            </span>
          )}

          <span className="apple-pill inline-flex items-center gap-1.5 text-sky-400">
            <Radio className="w-3.5 h-3.5 animate-pulse text-sky-400" />
            {estacion?.red_oficial || 'DMC Chile'}
          </span>

          <span className="apple-pill inline-flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {localTimeLabel}
          </span>
        </div>

      </div>
    </div>
  );
}
