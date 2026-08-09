import React, { useState } from 'react';
import { X, CheckCircle2, ExternalLink, ShieldCheck, Info, BookOpen, Settings, Lightbulb, FileText, BarChart3 } from 'lucide-react';
import { getEducationalInfo } from '../utils/educationalCatalog';

export default function DetailDrawer({ isOpen, onClose, detailData }) {
  const [activeTab, setActiveTab] = useState('queEs');

  if (!isOpen || !detailData) return null;

  const { title, value, unit, description, advice, stationId, rawSourceUrl, isLiveData, category } = detailData;

  const eduInfo = getEducationalInfo(title);

  const tabs = [
    { id: 'queEs', label: '📘 ¿Qué es?', icon: BookOpen },
    { id: 'comoSeMide', label: '⚙️ ¿Cómo se mide?', icon: Settings },
    { id: 'queHacer', label: '💡 ¿Qué hacer hoy?', icon: Lightbulb },
    { id: 'normaOficial', label: '📜 Norma Oficial', icon: FileText },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/85 backdrop-blur-2xl transition-opacity duration-300">
      <div className="relative w-full max-w-md apple-card border-l border-white/20 h-full p-6 overflow-y-auto space-y-6 shadow-2xl flex flex-col justify-between rounded-none border-t-0 border-b-0 border-r-0">
        
        <div className="space-y-5">
          {/* CABECERA */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-sky-400" />
              <span>Ficha Educativa & Diagnóstico</span>
            </div>
            <button
              onClick={onClose}
              className="apple-pill p-2 text-slate-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TÍTULO Y VALOR DESTACADO */}
          <div className="space-y-2">
            <span className="apple-pill text-sky-300 text-[11px] font-bold">
              {category || eduInfo.categoria}
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight leading-tight">{title}</h2>
            <div className="flex items-baseline gap-2 pt-1">
              <span className="apple-temp-hero text-5xl font-mono">{value}</span>
              {unit && <span className="text-xl text-slate-300 font-medium">{unit}</span>}
            </div>
          </div>

          {/* PÍLDORAS NAVEGABLES EDUCATIVAS ESTILO APPLE */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`apple-pill text-xs font-bold whitespace-nowrap cursor-pointer transition ${
                  activeTab === tab.id
                    ? 'bg-sky-500/25 border-sky-400/50 text-white ring-1 ring-sky-400/40 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* CONTENIDO DE LA PESTAÑA SELECCIONADA */}
          <div className="apple-card p-5 space-y-3 bg-slate-900/60 border border-white/10 rounded-2xl">
            {activeTab === 'queEs' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                  <BookOpen className="w-4 h-4 text-sky-400" />
                  <span>Definición Conceptual</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {description || eduInfo.queEs}
                </p>
              </div>
            )}

            {activeTab === 'comoSeMide' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
                  <Settings className="w-4 h-4 text-cyan-400" />
                  <span>Método e Instrumentación</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  {eduInfo.comoSeMide}
                </p>
              </div>
            )}

            {activeTab === 'queHacer' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <Lightbulb className="w-4 h-4 text-emerald-400" />
                  <span>Recomendación Práctica</span>
                </div>
                <p className="text-xs text-emerald-200 leading-relaxed font-medium">
                  🌱 {advice || eduInfo.queHacer}
                </p>
              </div>
            )}

            {activeTab === 'normaOficial' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span>Estándar / Protocolación</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
                  📜 {eduInfo.normaOficial}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AUDITORÍA DE FUENTE Y TRANSPARENCIA */}
        <div className="space-y-3 pt-4 border-t border-white/10 apple-card p-4 bg-slate-900/80 rounded-2xl">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" />
            <span>Auditoría de Fuente & Transparencia</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Código Estación:</span>
              <span className="font-mono text-slate-200 font-bold">{stationId || 'DMC_CL_OFFICIAL'}</span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span>Estado Telemetría:</span>
              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {isLiveData ? 'Dato Real en Vivo' : 'Estimación Validada'}
              </span>
            </div>

            {rawSourceUrl && (
              <div className="pt-2 border-t border-white/10">
                <a
                  href={rawSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="apple-pill w-full text-slate-200 py-2.5 px-3 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <span>Verificar Fuente Oficial ({new URL(rawSourceUrl).hostname})</span>
                  <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                </a>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
