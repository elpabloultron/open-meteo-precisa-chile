import React from 'react';
import { MapPin, Radio, ShieldCheck, Share2, ArrowUp, ArrowDown, Sun, CloudSun, CloudRain, Snowflake, CloudLightning, Cloud, FileText } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

function getWeatherVectorIcon(code, temp) {
  if (code === 0) return <Sun className="w-20 h-20 text-amber-400 drop-shadow-[0_10px_20px_rgba(251,191,36,0.3)] animate-pulse" />;
  if (code >= 1 && code <= 3) return <CloudSun className="w-20 h-20 text-sky-300 drop-shadow-[0_10px_20px_rgba(56,189,248,0.3)]" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-20 h-20 text-blue-400 drop-shadow-[0_10px_20px_rgba(96,165,250,0.3)]" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-20 h-20 text-cyan-300 drop-shadow-[0_10px_20px_rgba(103,232,249,0.3)]" />;
  if (code >= 95) return <CloudLightning className="w-20 h-20 text-purple-400 drop-shadow-[0_10px_20px_rgba(192,132,252,0.3)]" />;
  return <Cloud className="w-20 h-20 text-slate-400 drop-shadow-[0_10px_20px_rgba(148,163,184,0.3)]" />;
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
        title: "Linaje de Datos OMM (3 Niveles)",
        value: metadatos?.origen_dato === 'estacion_fisica_directa' ? 'Nivel 1 (Directo)' : (metadatos?.origen_dato === 'triangulacion_espacial_idw' ? 'Nivel 2 (Triangulación IDW)' : 'Nivel 3 (Satelital ERA5)'),
        unit: "",
        description: `Origen del dato: ${metadatos?.lineage_etiqueta}. Nivel 1: Estación física directa (<25 km). Nivel 2: Triangulación IDW de 3 estaciones (<85 km) con ajuste de altitud por modelo digital de elevación DEM (-0.65°C por cada 100m de elevación). Nivel 3: Reanálisis satelital GEE ERA5-Land.`,
        advice: "Garantiza continuidad de telemetría bajo estándares internacionales de la OMM WMO-No. 8.",
        category: "Linaje & Algoritmo",
        stationId: estacion?.id,
        rawSourceUrl: estacion?.raw_source_url,
        isLiveData: true
      });
    }
  };

  return (
    <div className="apple-card p-6 sm:p-10 relative overflow-hidden space-y-6 shadow-2xl border border-white/15">
      
      {/* BARRA SUPERIOR DE UBICACIÓN & METADATOS BREEZY WEATHER */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <button
          onClick={onOpenEstacionesCercanas}
          className="apple-pill flex items-center gap-2 text-sky-300 font-bold hover:scale-105 transition cursor-pointer"
        >
          <MapPin className="w-4 h-4 text-sky-400" />
          <span>{estacion?.nombre}</span>
          <span className="text-[10px] text-slate-400 font-normal">({metadatos?.distancia_km || 0} km)</span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenAgroReport && (
            <button
              onClick={onOpenAgroReport}
              className="apple-pill flex items-center gap-1.5 text-emerald-300 bg-emerald-500/15 border-emerald-500/30 font-bold hover:scale-105 transition cursor-pointer shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ficha Técnica Agrícola</span>
            </button>
          )}

          <button
            onClick={handleLineageClick}
            className="apple-pill flex items-center gap-1.5 text-emerald-300 font-bold hover:scale-105 transition cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{metadatos?.lineage_etiqueta || 'Telemetría Directa OMM'}</span>
          </button>
        </div>
      </div>

      {/* BLOQUE HÉROE PRINCIPAL DE CLIMA BREEZY WEATHER */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
        
        {/* ICONO Y TEMPERATURA MASIVA */}
        <div className="flex items-center gap-6">
          {getWeatherVectorIcon(0, temp)}
          <div>
            <div className="text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-white font-mono leading-none">
              {temp}°
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-300 mt-2 flex items-center gap-2">
              <span>{modo_urbano?.inversion_termica?.estado || 'Despejado / Normal'}</span>
              <span>•</span>
              <span>Sensación <strong className="font-mono text-amber-300">{sensacion}°C</strong></span>
            </div>
          </div>
        </div>

        {/* PÍLDORA SLIM MIN/MAX Y SECTOR */}
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
            <Radio className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>{estacion?.red_oficial || 'DMC / Agromet INIA'}</span>
            <span>•</span>
            <span>{localTimeLabel}</span>
          </div>
        </div>

      </div>

    </div>
  );
}
