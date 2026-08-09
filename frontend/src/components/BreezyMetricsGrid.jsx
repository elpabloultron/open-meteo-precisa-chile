import React from 'react';
import { Wind, Thermometer, Droplets, Sun, Activity, ShieldCheck, AlertTriangle, Sprout, Snowflake, CloudRain, Cpu, Gauge, Compass } from 'lucide-react';

export default function BreezyMetricsGrid({ modo, climaData, onSelectMetric, onOpenAqi }) {
  if (!climaData) return null;

  const { modo_urbano, modo_agricola, estacion } = climaData;
  const stationId = estacion?.id || "dmc_oficial";
  const rawSourceUrl = estacion?.raw_source_url || "https://climatologia.meteochile.gob.cl";

  const handleMetricClick = (title, value, unit, description, advice, category) => {
    if (onSelectMetric) {
      onSelectMetric({
        title,
        value,
        unit,
        description,
        advice,
        category,
        stationId,
        rawSourceUrl,
        isLiveData: true
      });
    }
  };

  if (modo === 'urbano') {
    const temp = modo_urbano?.temperatura_c ?? 18;
    const sens = modo_urbano?.sensacion_termica_c ?? temp;
    const hum = modo_urbano?.humedad_relativa_pct ?? 55;
    const wind = modo_urbano?.viento_kmh ?? 12;
    const windDir = modo_urbano?.viento_direccion_grados ?? 215;
    const press = modo_urbano?.presion_hpa ?? 1014;
    const uv = modo_urbano?.indice_uv ?? 5;
    const sinca = modo_urbano?.calidad_aire_sinca || {};
    const aqi = sinca.aqi || 25;
    const mp25 = sinca.mp25 || 12;

    return (
      <div className="space-y-4">
        {/* BANNER SINCA CALIDAD DEL AIRE BREEZY WEATHER */}
        <div
          onClick={() => onOpenAqi && onOpenAqi({ mp25, mp10: sinca.mp10 || null, aqi, norma: sinca.categoria || 'Bueno' })}
          className="apple-card p-5 flex items-center justify-between gap-4 cursor-pointer hover:scale-[1.01] transition border border-emerald-500/30 bg-emerald-950/20"
        >
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Calidad del Aire SINCA MMA: <span className="text-emerald-300 font-mono">{sinca.categoria || 'Bueno'}</span> (AQI {aqi})</div>
              <p className="text-xs text-slate-400 mt-0.5">MP2.5: {mp25} µg/m³ • Haz clic para auditoría comparativa MMA vs OMS 2021 ↗</p>
            </div>
          </div>
          <span className="apple-pill text-[10px] text-emerald-300 font-bold">Ver Auditoría</span>
        </div>

        {/* GRILLA BENTO MATERIAL 3 URBAN METRICS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          
          {/* TEMPERATURA */}
          <div
            onClick={() => handleMetricClick("Temperatura Ambiente", temp, "°C", `Temperatura medida a 2m del suelo. Sensación térmica: ${sens}°C.`, "Recomendado abrigo liviano.", "Temperatura")}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Temperatura</span>
              <Thermometer className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{temp}°C</div>
            <div className="text-[10px] text-slate-400">Sensación: <strong className="text-amber-300 font-mono">{sens}°C</strong></div>
          </div>

          {/* HUMEDAD RELATIVA */}
          <div
            onClick={() => handleMetricClick("Humedad Relativa", hum, "%", "Saturación de agua en la atmósfera.", "Niveles altos aumentan la sensación de frío.", "Humedad")}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Humedad</span>
              <Droplets className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{hum}%</div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-blue-400 rounded-full" style={{ width: `${hum}%` }} />
            </div>
          </div>

          {/* VIENTO & ROSA DE VIENTOS */}
          <div
            onClick={() => handleMetricClick("Viento & Dirección", wind, "km/h", `Velocidad del viento medida a 10m de altura con ángulo ${windDir}°.`, "Condición adecuada para actividades al aire libre.", "Viento")}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Viento</span>
              <Wind className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono flex items-center gap-1.5">
              <span>{wind}</span>
              <span className="text-xs font-sans text-slate-400 font-normal">km/h</span>
              <Compass className="w-4 h-4 text-sky-300 ml-auto" style={{ transform: `rotate(${windDir}deg)` }} />
            </div>
            <div className="text-[10px] text-slate-400">Ángulo: <strong className="text-sky-300 font-mono">{windDir}°</strong></div>
          </div>

          {/* ÍNDICE UV */}
          <div
            onClick={() => handleMetricClick("Índice UV Solar", uv, "", "Nivel de radiación ultravioleta en superficie.", uv >= 6 ? "Usar protector solar FPS 50+ y lentes con filtro UV." : "Radiación moderada.", "Radiación")}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Índice UV</span>
              <Sun className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{uv} <span className="text-xs font-sans text-amber-300">{uv >= 8 ? 'Extremo' : (uv >= 6 ? 'Alto' : 'Normal')}</span></div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 rounded-full" style={{ width: `${(uv / 12) * 100}%` }} />
            </div>
          </div>

          {/* PRESIÓN ATMOSFÉRICA */}
          <div
            onClick={() => handleMetricClick("Presión Atmosférica", press, "hPa", "Presión barométrica a nivel de estación.", "Presiones estables indican tiempo despejado.", "Presión")}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Presión</span>
              <Gauge className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{press} <span className="text-xs font-sans text-slate-400">hPa</span></div>
            <div className="text-[10px] text-slate-400">Normal: <strong>1013 hPa</strong></div>
          </div>

          {/* CALIDAD DEL AIRE AQI */}
          <div
            onClick={() => onOpenAqi && onOpenAqi({ mp25, mp10: sinca.mp10 || null, aqi, norma: sinca.categoria || 'Bueno' })}
            className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>AQI Aire</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-300 font-mono">{aqi}</div>
            <div className="text-[10px] text-slate-400">MP2.5: <strong className="text-emerald-400">{mp25} µg</strong></div>
          </div>

        </div>
      </div>
    );
  }

  // MODO AGRÍCOLA GEE
  const eto = modo_agricola?.evapotranspiracion_eto_mm_dia ?? 3.8;
  const horasFrio = modo_agricola?.horas_frio_acumuladas_24h ?? 0;
  const ndvi = modo_agricola?.salud_vegetacion_ndvi ?? 0.62;
  const ndre = modo_agricola?.clorofila_nitrogino_ndre ?? 0.45;
  const ndwi = modo_agricola?.estres_hidrico_ndwi ?? 0.28;
  const vpd = modo_agricola?.deficit_presion_vapor_vpd_kpa ?? 0.95;
  const tSuelo = modo_agricola?.temperatura_suelo_10cm_c ?? 14.5;
  const lluvia = modo_agricola?.lluvia_caida_hoy_mm ?? 0.0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      
      {/* EVAPOTRANSPIRACIÓN ETo */}
      <div
        onClick={() => handleMetricClick("Evapotranspiración ETo (FAO-56)", eto, "mm/día", "Consumo hídrico teórico Penman-Monteith (FAO-56).", "Ajustar lámina de reposición de riego según Kc de cultivo.", "Agronomía")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Evapotranspiración ETo</span>
          <Sprout className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-2xl font-black text-white font-mono">{eto} <span className="text-xs font-sans text-slate-400">mm/día</span></div>
        <div className="text-[10px] text-emerald-300 font-bold">FAO-56 Penman-Monteith</div>
      </div>

      {/* SALUD VEGETAL NDVI */}
      <div
        onClick={() => handleMetricClick("Índice Vigor Vegetal NDVI (Sentinel-2 10m)", ndvi, "", "Densidad fotosintética del follaje observada por Sentinel-2.", "Valores > 0.6 representan biomasa verde densa sin estrés.", "Satélite GEE")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>NDVI Vigor (10m)</span>
          <Cpu className="w-4 h-4 text-teal-400" />
        </div>
        <div className="text-2xl font-black text-teal-300 font-mono">{ndvi}</div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
          <div className="h-full bg-teal-400 rounded-full" style={{ width: `${ndvi * 100}%` }} />
        </div>
      </div>

      {/* CLOROFILA / NITRÓGENO NDRE */}
      <div
        onClick={() => handleMetricClick("Clorofila/Nitrógeno NDRE (Red-Edge 10m)", ndre, "", "Contenido de nitrógeno foliar medido en la banda Red-Edge de Sentinel-2.", "Permite dosificar fertirriego nítrico localizado.", "Satélite GEE")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>NDRE Nitrógeno</span>
          <Sprout className="w-4 h-4 text-green-400" />
        </div>
        <div className="text-2xl font-black text-green-300 font-mono">{ndre}</div>
        <div className="text-[10px] text-green-400 font-bold">Fertirriego Red-Edge</div>
      </div>

      {/* ESTRÉS HÍDRICO NDWI */}
      <div
        onClick={() => handleMetricClick("Estrés Hídrico Foliar NDWI", ndwi, "", "Contenido de agua en el tejido celular foliar.", "Valores < 0.1 indican necesidad de riego inmediato.", "Satélite GEE")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>NDWI Humedad Foliar</span>
          <Droplets className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-black text-cyan-300 font-mono">{ndwi}</div>
        <div className="text-[10px] text-cyan-400 font-bold">Humedad de Hoja</div>
      </div>

      {/* DÉFICIT PRESIÓN VAPOR VPD */}
      <div
        onClick={() => handleMetricClick("Déficit Presión Vapor VPD", vpd, "kPa", "Diferencia de presión de vapor de agua entre el interior estomático y el aire.", "VPD entre 0.8 y 1.2 kPa es el rango fotosintético óptimo.", "Fisiología Vegetal")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Déficit Vapor VPD</span>
          <Gauge className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-black text-white font-mono">{vpd} <span className="text-xs font-sans text-slate-400">kPa</span></div>
        <div className="text-[10px] text-amber-300 font-bold">{vpd >= 2.0 ? '⚠ Estrés Estomático' : '✓ Fotosíntesis Óptima'}</div>
      </div>

      {/* TEMPERATURA SUELO 10CM */}
      <div
        onClick={() => handleMetricClick("Temperatura Suelo 10cm", tSuelo, "°C", "Temperatura en la zona radicular activa.", "T° suelo > 12°C favorece absorción de nutrientes.", "Suelo")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>T° Suelo 10cm</span>
          <Thermometer className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-black text-white font-mono">{tSuelo}°C</div>
        <div className="text-[10px] text-slate-400">Zona Radicular</div>
      </div>

      {/* HORAS FRÍO */}
      <div
        onClick={() => handleMetricClick("Horas Frío (T < 7.2°C)", horasFrio, "hrs", "Acumulación de horas de temperatura por debajo de 7.2°C en 24h.", "Requerido para romper dormancia en frutales caducos.", "Fruticultura")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Horas Frío (24h)</span>
          <Snowflake className="w-4 h-4 text-cyan-300" />
        </div>
        <div className="text-2xl font-black text-cyan-300 font-mono">{horasFrio} <span className="text-xs font-sans text-slate-400">hrs</span></div>
        <div className="text-[10px] text-slate-400">Umbral 7.2°C</div>
      </div>

      {/* LLUVIA ACUMULADA */}
      <div
        onClick={() => handleMetricClick("Precipitación Hoy", lluvia, "mm", "Precipitación acumulada en las últimas 24h.", "Monitorear drenaje en suelos pesados.", "Lluvia")}
        className="apple-card p-4 space-y-2 cursor-pointer transition hover:scale-105"
      >
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
          <span>Lluvia Caída Hoy</span>
          <CloudRain className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-black text-blue-300 font-mono">{lluvia} <span className="text-xs font-sans text-slate-400">mm</span></div>
        <div className="text-[10px] text-slate-400">Telemetría Directa</div>
      </div>

    </div>
  );
}
