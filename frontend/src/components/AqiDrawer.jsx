import React from 'react';
import { X, Wind, Info, ShieldCheck } from 'lucide-react';

export default function AqiDrawer({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const mp25 = data.mp25 !== 'Sin datos' && data.mp25 !== null ? parseFloat(data.mp25) : null;
  const mp10 = data.mp10 !== 'Sin datos' && data.mp10 !== null ? parseFloat(data.mp10) : null;

  // WHO Guidelines 2021
  const whoGuidelines = {
    mp25: 15, // 24h mean
    mp10: 45, // 24h mean
    no2: 25,  // 24h mean
    o3: 100   // 8h mean
  };

  const getAqiRiskColor = (value, pollutant) => {
    if (value === null) return "bg-slate-700";
    const limit = whoGuidelines[pollutant];
    if (value <= limit) return "bg-emerald-500 text-white";
    if (value <= limit * 2) return "bg-yellow-500 text-slate-900";
    if (value <= limit * 4) return "bg-orange-500 text-white";
    return "bg-red-500 text-white";
  };

  const getAqiRiskText = (value, pollutant) => {
    if (value === null) return "Sin datos";
    const limit = whoGuidelines[pollutant];
    if (value <= limit) return "Bueno";
    if (value <= limit * 2) return "Moderado";
    if (value <= limit * 4) return "Malo";
    return "Peligroso";
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* DRAWER CONTENT */}
      <div className="relative w-full max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-x border-blue-500/30 p-5 shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 rounded-xl border border-blue-500/40">
              <Wind className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">Calidad del Aire (AQI)</h3>
              <p className="text-xs text-blue-300/70 font-medium">Desglose de Contaminantes</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="overflow-y-auto pr-1 pb-6 space-y-4">
          
          <div className="p-3 bg-slate-800/50 rounded-xl border border-white/5">
            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Niveles Actuales vs. Directrices OMS (24h)
            </h4>
            
            <div className="space-y-4">
              {/* PM2.5 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">PM2.5 (Fino)</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${getAqiRiskColor(mp25, 'mp25')}`}>
                    {mp25 !== null ? `${mp25} µg/m³ - ${getAqiRiskText(mp25, 'mp25')}` : 'Sin datos'}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getAqiRiskColor(mp25, 'mp25')}`} 
                    style={{ width: mp25 ? `${Math.min((mp25 / (whoGuidelines.mp25 * 5)) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Límite OMS: {whoGuidelines.mp25} µg/m³</div>
              </div>

              {/* PM10 */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">PM10 (Grueso)</span>
                  <span className={`px-2 py-0.5 rounded-full font-bold ${getAqiRiskColor(mp10, 'mp10')}`}>
                    {mp10 !== null ? `${mp10} µg/m³ - ${getAqiRiskText(mp10, 'mp10')}` : 'Sin datos'}
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getAqiRiskColor(mp10, 'mp10')}`} 
                    style={{ width: mp10 ? `${Math.min((mp10 / (whoGuidelines.mp10 * 5)) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <div className="text-[10px] text-slate-500 mt-1">Límite OMS: {whoGuidelines.mp10} µg/m³</div>
              </div>

              {/* NO2 Placeholder */}
              <div className="opacity-50">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">NO2 (Dióxido de nitrógeno)</span>
                  <span className="px-2 py-0.5 rounded-full font-bold bg-slate-700 text-slate-300">
                    Sin sensores reportando
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-700 rounded-full" />
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Recomendaciones de Salud OMS
            </h4>
            <ul className="text-xs text-blue-200/80 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <span><strong>Bueno:</strong> La calidad del aire es satisfactoria y representa poco o ningún riesgo.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1 shrink-0" />
                <span><strong>Moderado:</strong> Las personas inusualmente sensibles deben considerar reducir los esfuerzos prolongados al aire libre.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1 shrink-0" />
                <span><strong>Peligroso:</strong> Todos pueden comenzar a experimentar efectos en la salud. Evitar actividades al aire libre.</span>
              </li>
            </ul>
          </div>
          
        </div>
      </div>
    </div>
  );
}
