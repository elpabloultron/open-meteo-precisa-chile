import React from 'react';
import { X, Wind, Info, ShieldCheck, AlertTriangle, Scale } from 'lucide-react';

export default function AqiDrawer({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const mp25 = data.mp25 !== 'Sin datos' && data.mp25 !== null ? parseFloat(data.mp25) : null;
  const mp10 = data.mp10 !== 'Sin datos' && data.mp10 !== null ? parseFloat(data.mp10) : null;

  // Límite OMS 24h
  const whoGuidelines = { mp25: 15, mp10: 45 };

  // Evaluación Norma Chilena (MMA DS 12/2011)
  const getChileanStatus = (val) => {
    if (val === null) return { texto: 'Sin Datos', color: 'bg-slate-800 text-slate-300' };
    if (val < 50) return { texto: 'Bueno', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (val < 80) return { texto: 'Regular 🟡', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
    if (val < 110) return { texto: 'Alerta 🟠', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    if (val < 170) return { texto: 'Preemergencia 🔴', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
    return { texto: 'Emergencia 🟣', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' };
  };

  // Evaluación Norma Internacional OMS / US-EPA AQI
  const getWhoStatus = (val) => {
    if (val === null) return { texto: 'Sin Datos', color: 'bg-slate-800 text-slate-300' };
    if (val <= 12) return { texto: 'Bueno (OMS)', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
    if (val <= 35.4) return { texto: 'Moderado', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' };
    if (val <= 55.4) return { texto: 'Insalubre Sensibles ⚠️', color: 'bg-orange-500/20 text-orange-300 border-orange-500/40' };
    if (val <= 150.4) return { texto: 'INSALUBRE (Dañino) 🚨', color: 'bg-rose-500/30 text-rose-300 border-rose-500/60 font-black' };
    if (val <= 250.4) return { texto: 'Muy Insalubre 🟣', color: 'bg-purple-500/30 text-purple-300 border-purple-500/60' };
    return { texto: 'Peligroso / Azaroso ☠️', color: 'bg-red-600 text-white font-black' };
  };

  const statusChile = getChileanStatus(mp25);
  const statusWho = getWhoStatus(mp25);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-2xl">
      <div className="apple-card w-full max-w-2xl overflow-hidden border border-blue-500/40 space-y-5 p-6 shadow-2xl bg-slate-900/90 max-h-[90vh] overflow-y-auto">
        
        {/* CABECERA */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Scale className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Auditoría Comparativa Calidad del Aire
              </h3>
              <p className="text-xs text-blue-300/80">
                Norma Chilena MMA vs. Estándar Salud OMS / US-EPA AQI
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="apple-pill p-2 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ALERTA DE BRECHA DE SALUD PÚBLICA */}
        <div className="p-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-rose-950/50 rounded-2xl border border-amber-500/40 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>⚠️ Brecha de Salud Pública (Deficiencia de la Norma Local)</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            La <strong>Norma Chilena (DS 12/2011 MMA)</strong> cataloga hasta <strong>79 µg/m³</strong> de MP2.5 como un nivel <span className="text-amber-300 font-bold">"Regular"</span>. Sin embargo, para la <strong>OMS y la US-EPA AQI</strong>, cualquier nivel sobre <strong>55.5 µg/m³</strong> es clasificado como <span className="text-rose-400 font-extrabold uppercase">"INSALUBRE Y DAÑINO A LA SALUD"</span> para toda la población.
          </p>
        </div>

        {/* TABLA COMPARATIVA LADO A LADO */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Comparación Lado a Lado para MP2.5 ({mp25 !== null ? `${mp25} µg/m³` : 'Sin datos'})
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* NORMA CHILENA */}
            <div className="apple-card p-4 space-y-3 border border-white/10 bg-slate-950/50">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-slate-300">🇨🇱 Norma Chilena MMA</span>
                <span className="text-[10px] text-slate-400">DS 12/2011</span>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Estado Actual Asignado:</div>
                <div className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${statusChile.color}`}>
                  {statusChile.texto}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5 space-y-1">
                <div>• Bueno: 0 - 49 µg/m³</div>
                <div>• Regular: 50 - 79 µg/m³</div>
                <div>• Alerta: 80 - 109 µg/m³</div>
                <div>• Preemergencia: 110 - 169 µg/m³</div>
              </div>
            </div>

            {/* NORMA OMS / US-EPA */}
            <div className="apple-card p-4 space-y-3 border border-rose-500/30 bg-slate-950/80 shadow-lg">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs font-bold text-rose-300">🌐 Estándar OMS / US-EPA</span>
                <span className="text-[10px] text-rose-400 font-bold">Guía OMS 2021</span>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] text-slate-400">Diagnóstico Médico OMS:</div>
                <div className={`px-3 py-2 rounded-xl text-xs font-extrabold border ${statusWho.color}`}>
                  {statusWho.texto}
                </div>
              </div>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-white/5 space-y-1">
                <div>• Bueno OMS: 0 - 12 µg/m³</div>
                <div>• Moderado: 12.1 - 35.4 µg/m³</div>
                <div className="text-amber-300 font-semibold">• Insalubre Sensibles: 35.5 - 55.4 µg/m³</div>
                <div className="text-rose-400 font-bold">• INSALUBRE (Dañino): 55.5 - 150.4 µg/m³</div>
              </div>
            </div>
          </div>
        </div>

        {/* MEDIDAS DE PROTECCIÓN OMS */}
        <div className="apple-card p-4 bg-slate-950/60 border border-white/10 space-y-2">
          <div className="text-xs font-bold text-sky-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400" />
            <span>Medidas de Protección Recomendadas por la OMS:</span>
          </div>
          <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
            <li>Si el MP2.5 supera <strong>35.5 µg/m³</strong>, adultos mayores, niños y asmáticos deben evitar ejercicios intensos al aire libre.</li>
            <li>Si el MP2.5 supera <strong>55.5 µg/m³ (Insalubre)</strong>, toda la población debe usar mascarilla N95/KN95 en el exterior y cerrar ventanas en el hogar.</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
