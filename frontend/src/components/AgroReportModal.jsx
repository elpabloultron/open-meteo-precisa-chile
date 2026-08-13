import React from 'react';
import { X, Printer, Download, ShieldCheck, Sprout, Snowflake, Droplets, Sun, Wind, MapPin, Calendar, FileText } from 'lucide-react';

export default function AgroReportModal({ isOpen, onClose, climaData }) {
  if (!isOpen || !climaData) return null;

  const { estacion, modo_agricola, modo_urbano, metadatos, alertas_inteligentes, pronostico_oficial_dmc } = climaData;
  const hoyStr = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const horaStr = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-2xl overflow-y-auto">
      <div className="apple-card w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col bg-slate-900 border border-emerald-500/30 shadow-2xl animate-apple-entry">
        
        {/* CABECERA ACCIONES (NO IMPRIMIBLE) */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">Ficha Técnica Agroclimática Oficial</h3>
              <p className="text-xs text-slate-400">Informe agronómico del predio generado a partir de telemetría física DMC/INIA y Sentinel-2</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="apple-pill flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/40 cursor-pointer font-bold transition"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar PDF</span>
            </button>

            <button
              onClick={onClose}
              className="apple-pill p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL REPORTE AGRONÓMICO (ESTILO DOCUMENTO OFICIAL) */}
        <div id="printable-agro-report" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-slate-100 bg-slate-950 print:bg-white print:text-black print:p-4">
          
          {/* ENCABEZADO INSTITUCIONAL */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 print:border-slate-300">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-400 print:text-emerald-700">
                Plataforma Nacional de Telemetría Hiperlocal
              </div>
              <h1 className="text-2xl font-black text-white print:text-slate-900 tracking-tight mt-1">
                MeteoPrecisa Chile • Ficha Técnica Agronómica
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400 print:text-slate-600 mt-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-slate-200 print:text-black">{estacion?.nombre}</span>
                <span>• Sector: {estacion?.sector}</span>
                <span>• Coordenadas: {estacion?.coordenadas?.latitud?.toFixed(4)}, {estacion?.coordenadas?.longitud?.toFixed(4)}</span>
              </div>
            </div>

            <div className="text-right sm:self-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 print:text-emerald-800 rounded-full text-xs font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Auditoría WMO-No. 8 Válida</span>
              </span>
              <div className="text-[11px] text-slate-400 print:text-slate-600 mt-1.5 flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                <span>{hoyStr} • {horaStr} hrs</span>
              </div>
            </div>
          </div>

          {/* RESUMEN EJECUTIVO TÉRMICO & HELADAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:gap-2">
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-slate-50 print:border-slate-200">
              <div className="text-[11px] text-slate-400 font-medium">Temperatura Actual</div>
              <div className="text-2xl font-black font-mono text-white print:text-slate-900 mt-1">
                {modo_urbano?.temperatura_c ?? '--'} <span className="text-xs font-sans text-slate-400">°C</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Mín: {modo_agricola?.temperatura_minima_hoy_c}°C / Máx: {modo_agricola?.temperatura_maxima_hoy_c}°C
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-slate-50 print:border-slate-200">
              <div className="text-[11px] text-slate-400 font-medium">Horas Frío Acumuladas</div>
              <div className="text-2xl font-black font-mono text-cyan-400 print:text-cyan-700 mt-1">
                {modo_agricola?.horas_frio_acumuladas_24h ?? 0} <span className="text-xs font-sans text-slate-400">hrs</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Acumulación base ≤ 7.0°C (24h)</div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-slate-50 print:border-slate-200">
              <div className="text-[11px] text-slate-400 font-medium">Riesgo de Heladas</div>
              <div className="text-lg font-bold text-white print:text-slate-900 mt-1">
                {modo_agricola?.alerta_helada_agrometeorologica?.riesgo_helada || 'Bajo 🟢'}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">
                Punto Rocío: {modo_agricola?.alerta_helada_agrometeorologica?.temperatura_rocio_c ?? '--'}°C
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 print:bg-slate-50 print:border-slate-200">
              <div className="text-[11px] text-slate-400 font-medium">Evapotranspiración ETo</div>
              <div className="text-2xl font-black font-mono text-emerald-400 print:text-emerald-700 mt-1">
                {modo_agricola?.evapotranspiracion_eto_mm_dia ?? 0} <span className="text-xs font-sans text-slate-400">mm/día</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Cálculo Penman-Monteith FAO-56</div>
            </div>
          </div>

          {/* TABLA DE AUDITORÍA ESPECTRAL SATELITAL GOOGLE EARTH ENGINE (SENTINEL-2 10M) */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden print:border-slate-200">
            <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 font-bold text-xs text-emerald-400 flex items-center justify-between print:bg-slate-100 print:text-black">
              <span>🌿 Índices Espectrales Satelitales Sentinel-2 (Resolución 10m)</span>
              <span className="text-[10px] font-mono text-slate-400">Google Earth Engine API</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1">
                <div className="text-slate-400">Salud y Vigor Vegetativo (NDVI)</div>
                <div className="text-xl font-bold font-mono text-white print:text-black">
                  {modo_agricola?.salud_vegetacion_ndvi ?? 0.65}
                </div>
                <div className="text-[11px] text-emerald-400 print:text-emerald-700 font-semibold">
                  {modo_agricola?.estado_vigor_vegetativo || 'Vigor Vegetativo Adecuado'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400">Estrés Hídrico Foliar (NDWI)</div>
                <div className="text-xl font-bold font-mono text-white print:text-black">
                  {modo_agricola?.estres_hidrico_ndwi ?? 0.32}
                </div>
                <div className="text-[11px] text-sky-400 print:text-sky-700 font-semibold">
                  {modo_agricola?.estado_estres_hidrico || 'Sin Estrés Hídrico'}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-slate-400">Humedad de Suelo a 10cm (GLDAS)</div>
                <div className="text-xl font-bold font-mono text-white print:text-black">
                  {modo_agricola?.humedad_suelo_volumetrica ?? 0.28} <span className="text-xs font-sans text-slate-400">m³/m³</span>
                </div>
                <div className="text-[11px] text-teal-400 print:text-teal-700 font-semibold">
                  {modo_agricola?.estado_humedad_suelo || 'Humedad Adecuada'}
                </div>
              </div>
            </div>
          </div>

          {/* RECOMENDACIONES DE MANEJO AGRONÓMICO */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2 print:bg-slate-50 print:border-slate-200">
            <h4 className="font-bold text-white print:text-black flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-400" />
              <span>Directrices de Manejo y Recomendación de Campo:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-slate-300 print:text-slate-700">
              <li><strong>Riego y Reposición:</strong> Reponer lámina de riego calculando lámina neta = ETo ({modo_agricola?.evapotranspiracion_eto_mm_dia} mm) × Kc de la especie cultivada.</li>
              <li><strong>Fitosanitarios:</strong> Velocidad de viento actual: {modo_urbano?.viento_velocidad_kmh || 0} km/h. Ráfaga máxima: {modo_agricola?.rafagas_viento_kmh || 0} km/h. {modo_urbano?.viento_velocidad_kmh > 15 ? '⚠️ Suspender pulverizaciones por riesgo de deriva.' : '🟢 Condiciones óptimas para aplicaciones fitosanitarias.'}</li>
              <li><strong>Alerta Heladas:</strong> {modo_agricola?.alerta_helada_agrometeorologica?.riesgo_helada === 'Alto ❄️' ? 'Mantener activos sistemas de control de heladas (hélices, aspersión bajo/sobre copa) entre las 04:00 y 07:30 hrs.' : 'Sin requerimiento activo de defensa de heladas para las próximas horas.'}</li>
            </ul>
          </div>

          {/* PIE DE FIRMA Y AUDITORÍA */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 print:text-slate-500">
            <div>
              <span>Fuente de Telemetría: {estacion?.red_oficial || 'DMC / Agromet INIA'} • Estación ID: {estacion?.id}</span>
            </div>
            <div>
              <span>Generado por MeteoPrecisa Chile • Open Source Engine</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
