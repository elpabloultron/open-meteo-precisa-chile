import React from 'react';
import { Wind, Thermometer, Droplets, Sun, Activity, ShieldCheck, AlertTriangle, ChevronRight } from 'lucide-react';

export default function UrbanPanel({ urbano, onSelectMetric, stationInfo, onOpenAqi }) {
  if (!urbano) return null;

  const {
    temperatura_c,
    sensacion_termica_c,
    humedad_relativa_porcentaje,
    viento_velocidad_kmh,
    viento_direccion,
    presion_hpa,
    indice_uv,
    calidad_aire_sinca
  } = urbano;

  const sincaNom = String(calidad_aire_sinca?.norma_chilena || calidad_aire_sinca?.norma_chilena_mma?.categoria || 'Bueno');
  const aqiVal = calidad_aire_sinca?.aqi_us || calidad_aire_sinca?.tabla_internacional_aqi?.aqi_indice || 25;
  const mp25Val = calidad_aire_sinca?.mp25_ugm3 || calidad_aire_sinca?.mediciones_base?.mp25_ug_m3 || 12.0;

  const stationId = stationInfo?.station_id || stationInfo?.id || "dmc_330020";
  const rawSourceUrl = stationInfo?.raw_source_url || "https://climatologia.meteochile.gob.cl";

  let statusBg = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200';
  let statusIcon = <ShieldCheck className="w-5 h-5 text-emerald-400" />;
  let statusText = `✓ Calidad del Aire Excelente (MP2.5: ${mp25Val} µg/m³ - Norma Cumplida)`;

  if (sincaNom.includes('Alerta') || aqiVal > 100) {
    statusBg = 'bg-amber-950/50 border-amber-500/40 text-amber-200';
    statusIcon = <AlertTriangle className="w-5 h-5 text-amber-400" />;
    statusText = `⚠ Alerta Ambiental por MP2.5 (${mp25Val} µg/m³ - Restricción de Humos Visible)`;
  } else if (sincaNom.includes('Preemergencia') || sincaNom.includes('Emergencia') || aqiVal > 150) {
    statusBg = 'bg-red-950/50 border-red-500/40 text-red-200';
    statusIcon = <AlertTriangle className="w-5 h-5 text-red-400" />;
    statusText = `🔴 Emergencia / Preemergencia Ambiental (${mp25Val} µg/m³ - Prohibido Calefactores a Leña)`;
  }

  const handleCardClick = (title, value, unit, description, advice, category = "Urbano") => {
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
    <div className="space-y-4">
      
      {/* CAJA DE ESTADO Y AUDITORÍA SINCA MMA */}
      <div
        onClick={() => onOpenAqi && onOpenAqi({ mp25: mp25Val, mp10: calidad_aire_sinca?.mediciones_base?.mp10_ug_m3 || null, aqi: aqiVal, norma: sincaNom })}
        className={`apple-card p-5 flex items-center justify-between gap-4 font-medium text-sm cursor-pointer transition ${statusBg}`}
      >
        <div className="flex items-center gap-3">
          {statusIcon}
          <div>
            <div className="font-bold">{statusText}</div>
            <p className="text-xs opacity-80 mt-0.5">
              Estación SINCA MMA • Haz clic para auditoría de fuente cruda ↗
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 opacity-60" />
      </div>

      {/* GRILLA DE MÉTRICAS URBANAS INTERACTIVAS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        
        {/* TEMPERATURA */}
        <div
          onClick={() => handleCardClick("Temperatura Ambiente", temperatura_c, "°C", `Lectura de temperatura en aire a 2 metros del suelo. Sensación térmica: ${sensacion_termica_c}°C.`, "Mantener ventilación adecuada.", "Temperatura")}
          className="apple-card p-5 space-y-3 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Temperatura</span>
            <Thermometer className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{temperatura_c}°C</div>
          <p className="text-[11px] text-slate-400">Sensación: <span className="text-amber-300 font-bold font-mono">{sensacion_termica_c}°C</span></p>
        </div>

        {/* HUMEDAD RELATIVA */}
        <div
          onClick={() => handleCardClick("Humedad Relativa", humedad_relativa_porcentaje, "%", "Porcentaje de saturación de vapor de agua en el aire.", "Altas humedades aumentan la sensación de frío invernal.", "Humedad")}
          className="apple-card p-5 space-y-3 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Humedad</span>
            <Droplets className="w-4 h-4 text-blue-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{humedad_relativa_porcentaje}%</div>
          <p className="text-[11px] text-slate-400">Superficie</p>
        </div>

        {/* VIENTO */}
        <div
          onClick={() => handleCardClick("Velocidad y Dirección del Viento", viento_velocidad_kmh, "km/h", `Viento sostenido con dirección proveniente del ${viento_direccion}.`, "Vientos sostenidos superiores a 40 km/h requieren precaución en estructuras livianas.", "Viento")}
          className="apple-card p-5 space-y-3 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Viento</span>
            <Wind className="w-4 h-4 text-sky-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{viento_velocidad_kmh} <span className="text-xs text-slate-400 font-normal">km/h</span></div>
          <p className="text-[11px] text-slate-400">Dirección: <span className="text-sky-300 font-bold">{viento_direccion}</span></p>
        </div>

        {/* ÍNDICE UV */}
        <div
          onClick={() => handleCardClick("Índice de Radiación UV", indice_uv, "UV", "Medición de radiación ultravioleta máxima estimada para el día.", "Usar bloqueador solar FPS 50+ durante horas centrales.", "Radiación")}
          className="apple-card p-5 space-y-3 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Índice UV</span>
            <Sun className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{indice_uv}</div>
          <p className="text-[11px] text-slate-400">Máximo estimado</p>
        </div>

        {/* CALIDAD DEL AIRE SINCA */}
        <div
          onClick={() => onOpenAqi && onOpenAqi({ mp25: mp25Val, mp10: calidad_aire_sinca?.mediciones_base?.mp10_ug_m3 || null, aqi: aqiVal, norma: sincaNom })}
          className="apple-card p-5 space-y-3 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Norma MMA</span>
            <Activity className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-lg font-extrabold text-emerald-400">{sincaNom}</div>
          <p className="text-[11px] text-slate-400">MP2.5: <span className="font-mono font-bold text-white">{mp25Val} µg/m³</span></p>
        </div>

        {/* PRESIÓN ATMOSFÉRICA */}
        <div
          onClick={() => handleCardClick("Presión Atmosférica", presion_hpa, "hPa", "Presión barométrica reducida al nivel del mar.", "Altas presiones sostenidas indican estabilidad atmosférica e inversión térmica.", "Presión")}
          className="glass-panel p-5 space-y-3 cursor-pointer group hover:bg-sky-500/5 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Presión</span>
            <Activity className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white font-mono">{presion_hpa} <span className="text-xs text-slate-400 font-normal">hPa</span></div>
          <p className="text-[11px] text-slate-400">Nivel del mar</p>
        </div>

      </div>
    </div>
  );
}
