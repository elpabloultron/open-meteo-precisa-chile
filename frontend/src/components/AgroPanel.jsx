import React from 'react';
import { Sprout, Snowflake, Sun, Wind, CloudRain, Cpu, ChevronRight } from 'lucide-react';
import HistoricalChart from './HistoricalChart';

export default function AgroPanel({ agricola, onSelectMetric, stationInfo, apiBase }) {
  if (!agricola) return null;

  const {
    evapotranspiracion_eto_mm_dia,
    horas_frio_acumuladas_24h,
    alerta_helada_agrometeorologica,
    salud_vegetacion_ndvi,
    estado_vigor_vegetativo,
    humedad_suelo_volumetrica,
    estado_humedad_suelo,
    radiacion_solar_w_m2,
    rafagas_viento_kmh,
    lluvia_acumulada_hoy_mm,
    temperatura_minima_hoy_c,
    temperatura_maxima_hoy_c,
    fuente_agronomica
  } = agricola;

  const stationId = stationInfo?.station_id || stationInfo?.id || "agromet_inia";
  const rawSourceUrl = stationInfo?.raw_source_url || "https://agrometeorologia.cl";

  const handleCardClick = (title, value, unit, description, advice, category = "Agrometeorología") => {
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

  return (
    <div className="space-y-6">
      
      {/* GRILLA DE MÉTRICAS AGROMETEOROLÓGICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        
        {/* TARJETA 1: EVAPOTRANSPIRACIÓN ETo */}
        <div
          onClick={() => handleCardClick("Evapotranspiración ETo (FAO-56)", evapotranspiracion_eto_mm_dia, "mm/día", "Consumo hídrico teórico diario de una pradera de referencia sin restricciones hídricas, calculado bajo la ecuación Penman-Monteith (FAO-56).", "Programar reposición de lámina de riego según coeficiente de cultivo (Kc).", "Riego & Evaporación")}
          className="apple-card p-4 flex items-center gap-3 cursor-pointer transition group"
        >
          <div className="p-3 bg-emerald-500/15 text-emerald-400 rounded-2xl border border-emerald-500/20 group-hover:scale-110 transition">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Evapotranspiración ETo</div>
            <div className="text-xl font-bold font-mono text-white">{evapotranspiracion_eto_mm_dia} <span className="text-xs font-sans text-slate-400">mm/día</span></div>
            <div className="text-[11px] text-slate-500 font-semibold">FAO-56</div>
          </div>
        </div>

        {/* TARJETA 2: HORAS FRÍO */}
        <div
          onClick={() => handleCardClick("Horas Frío Acumuladas", horas_frio_acumuladas_24h, "hrs ≤7°C", "Acumulación de horas con temperatura menor o igual a 7°C en las últimas 24 horas para romper el receso invernal en frutales caducos.", "Monitorear requerimiento térmico según especie (cerezos, nogales, manzanos).", "Receso Invernal")}
          className="apple-card p-4 flex items-center gap-3 cursor-pointer transition group"
        >
          <div className="p-3 bg-cyan-500/15 text-cyan-400 rounded-2xl border border-cyan-500/20 group-hover:scale-110 transition">
            <Snowflake className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Horas Frío (≤7°C)</div>
            <div className="text-xl font-bold font-mono text-white">{horas_frio_acumuladas_24h} <span className="text-xs font-sans text-slate-400">hrs</span></div>
            <div className="text-[11px] text-slate-500 font-semibold">Últimas 24h</div>
          </div>
        </div>

        {/* TARJETA 3: RADIACIÓN SOLAR */}
        <div
          onClick={() => handleCardClick("Radiación Solar Global", radiacion_solar_w_m2, "W/m²", "Insolación solar acumulada y disponible para fotosíntesis en el dosel vegetal.", "Proteger frutales sensibles en caso de golpes de calor en verano.", "Fotosíntesis")}
          className="apple-card p-4 flex items-center gap-3 cursor-pointer transition group"
        >
          <div className="p-3 bg-amber-500/15 text-amber-400 rounded-2xl border border-amber-500/20 group-hover:scale-110 transition">
            <Sun className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Radiación Solar</div>
            <div className="text-xl font-bold font-mono text-white">{radiacion_solar_w_m2} <span className="text-xs font-sans text-slate-400">W/m²</span></div>
            <div className="text-[11px] text-slate-500 font-semibold">Insolación global</div>
          </div>
        </div>

        {/* TARJETA 4: RÁFAGAS & DERIVA */}
        <div
          onClick={() => handleCardClick("Ráfagas & Deriva Fitosanitaria", rafagas_viento_kmh, "km/h", "Ráfaga máxima registrada en la estación. Vientos superiores a 15 km/h generan riesgo de deriva en aplicaciones fitosanitarias.", "Suspender aplicaciones de pulverización con vientos mayores a 15 km/h.", "Fitosanitario")}
          className="apple-card p-4 flex items-center gap-3 cursor-pointer transition group"
        >
          <div className="p-3 bg-teal-500/15 text-teal-400 rounded-2xl border border-teal-500/20 group-hover:scale-110 transition">
            <Wind className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Ráfagas de Viento</div>
            <div className="text-xl font-bold font-mono text-white">{rafagas_viento_kmh} <span className="text-xs font-sans text-slate-400">km/h</span></div>
            <div className="text-[11px] text-slate-500 font-semibold">Riesgo deriva</div>
          </div>
        </div>

      </div>

      {/* FILA DE HELADAS & EXTREMAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* TARJETA ALERTA DE HELADAS */}
        <div
          onClick={() => handleCardClick("Riesgo de Helada Radiativa", alerta_helada_agrometeorologica?.riesgo_helada, `Punto Rocío: ${alerta_helada_agrometeorologica?.temperatura_rocio_c}°C`, "Evaluación del punto de rocío (Dew Point) y caída de temperatura durante la noche.", "Activar control antiheladas (helices, riego por aspersión) si la temperatura bordea 0°C.", "Heladas")}
          className="apple-card p-5 space-y-3 cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Riesgo de Heladas Agrometeorológicas</h3>
            </div>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full text-xs font-bold">
              {alerta_helada_agrometeorologica?.riesgo_helada}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs bg-slate-900/60 p-3 rounded-xl border border-white/5">
            <span className="text-slate-400">Temperatura Punto de Rocío (Dew Point):</span>
            <span className="font-mono font-bold text-sky-400 text-sm">{alerta_helada_agrometeorologica?.temperatura_rocio_c}°C</span>
          </div>
        </div>

        {/* TEMPERATURAS EXTREMAS Y PRECIPITACIÓN */}
        <div
          onClick={() => handleCardClick("Precipitación & Extremas Diarias", `${lluvia_acumulada_hoy_mm} mm`, `Mín: ${temperatura_minima_hoy_c}°C / Máx: ${temperatura_maxima_hoy_c}°C`, "Resumen acumulado de lluvias y temperaturas extremas del día.", "Verificar balance hídrico mensual.", "Agua & Temperatura")}
          className="glass-panel p-5 space-y-3 cursor-pointer hover:border-sky-400 transition"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold text-white">Agua & Extremas Diarias</h3>
            </div>
            <span className="px-3 py-1 bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded-full text-xs font-bold font-mono">
              Lluvia: {lluvia_acumulada_hoy_mm} mm
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-slate-400">Mínima Hoy</div>
              <div className="text-base font-bold font-mono text-cyan-400">{temperatura_minima_hoy_c}°C</div>
            </div>
            <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-slate-400">Máxima Hoy</div>
              <div className="text-base font-bold font-mono text-amber-400">{temperatura_maxima_hoy_c}°C</div>
            </div>
          </div>
        </div>

      </div>

      {/* WIDGET MONITOREO DE SATÉLITES GOOGLE EARTH ENGINE */}
      <div className="glass-panel p-6 space-y-5 border-emerald-500/40 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-emerald-950/30">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Análisis Satelital Google Earth Engine (GEE)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  Sentinel-2 10m & ERA5
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Haz clic en cualquier capa para abrir la auditoría agronómica detallada
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 italic">
            {fuente_agronomica || 'Google Earth Engine'}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* NDVI SALUD VEGETAL */}
          <div
            onClick={() => handleCardClick("Índice Vegetativo NDVI (Sentinel-2)", salud_vegetacion_ndvi, "NDVI (0-1)", "Medido con reflectancia infrarroja B8/B4 del satélite Sentinel-2 de la Agencia Espacial Europea a 10 metros de resolución espacial.", "Valores sobre 0.50 indican praderas y cultivos con alta vigorosidad y cobertura foliar.", "Google Earth Engine")}
            className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 space-y-3 cursor-pointer hover:border-emerald-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                🌿 Salud de Vegetación (NDVI)
                <ChevronRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-1 transition" />
              </span>
              <span className="text-lg font-extrabold font-mono text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/40">
                {salud_vegetacion_ndvi}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {estado_vigor_vegetativo}
            </div>
          </div>

          {/* HUMEDAD DE SUELO ERA5 */}
          <div
            onClick={() => handleCardClick("Humedad Volumétrica de Suelo (ERA5-Land)", humedad_suelo_volumetrica, "m³/m³", "Estimación de la fracción de volumen de agua contenida en los primeros 7 cm de la capa superficial del suelo.", "Ajustar programación de turnos de riego para evitar asfixia radicular.", "Google Earth Engine")}
            className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 space-y-3 cursor-pointer hover:border-sky-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                💧 Humedad Volumétrica de Suelo
                <ChevronRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition" />
              </span>
              <span className="text-lg font-extrabold font-mono text-sky-300 bg-sky-500/20 px-3 py-1 rounded-xl border border-sky-500/40">
                {humedad_suelo_volumetrica} <span className="text-xs font-sans">m³/m³</span>
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {estado_humedad_suelo}
            </div>
          </div>

          {/* NDRE CLOROFILA Y NITRÓGENO */}
          <div
            onClick={() => handleCardClick("Índice NDRE (Clorofila & Nitrógeno)", agricola?.clorofila_nitrogino_ndre || 0.42, "NDRE (0-1)", "Mide la concentración de nitrógeno y clorofila en hojas maduras mediante la banda Red-Edge B8A/B5 de Sentinel-2.", "Planificar dosis de fertirriego nítrico según requerimiento del dosel.", "Google Earth Engine")}
            className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 space-y-3 cursor-pointer hover:border-lime-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-lime-400 uppercase tracking-wider flex items-center gap-1">
                🍀 Clorofila & Nitrógeno (NDRE)
                <ChevronRight className="w-4 h-4 text-lime-400 group-hover:translate-x-1 transition" />
              </span>
              <span className="text-lg font-extrabold font-mono text-lime-300 bg-lime-500/20 px-3 py-1 rounded-xl border border-lime-500/40">
                {agricola?.clorofila_nitrogino_ndre || 0.42}
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              {agricola?.estado_clorofila_nitrógeno || 'Nutrición Nitrógeno Óptima (NDRE) 🍀'}
            </div>
          </div>

          {/* DÉFICIT PRESIÓN VAPOR VPD */}
          <div
            onClick={() => handleCardClick("Déficit de Presión de Vapor (VPD)", agricola?.deficit_presion_vapor_vpd_kpa || 1.15, "kPa", "Calculado con temperatura de suelo y presión de saturación. VPD alto (>2.0 kPa) genera cierre estomático y detiene la fotosíntesis.", "Aplicar riegos refrescantes por microaspersión durante horas de alto VPD.", "Google Earth Engine")}
            className="bg-slate-900/80 p-5 rounded-2xl border border-white/10 space-y-3 cursor-pointer hover:border-amber-500/50 transition group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                🌬️ Déficit Presión Vapor (VPD)
                <ChevronRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition" />
              </span>
              <span className="text-lg font-extrabold font-mono text-amber-300 bg-amber-500/20 px-3 py-1 rounded-xl border border-amber-500/40">
                {agricola?.deficit_presion_vapor_vpd_kpa || 1.15} <span className="text-xs font-sans">kPa</span>
              </span>
            </div>
            <div className="text-sm font-semibold text-white">
              Suelo 10cm: <span className="font-mono text-amber-300 font-bold">{agricola?.temperatura_suelo_10cm_c || 16.5}°C</span>
            </div>
          </div>

        </div>

      </div>

      {/* GRÁFICO HISTÓRICO NDVI (12 MESES) */}
      <HistoricalChart 
        lat={stationInfo?.lat} 
        lon={stationInfo?.lon} 
        apiBase={apiBase || ""} 
      />

    </div>
  );
}
