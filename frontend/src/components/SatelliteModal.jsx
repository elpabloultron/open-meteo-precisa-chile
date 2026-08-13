import React, { useState } from 'react';
import { X, Satellite, Clock, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react';
import { formatLocalTime } from '../utils/timeUtils';

export default function SatelliteModal({ isOpen, onClose, apiBase }) {
  const [loading, setLoading] = useState(false);
  const [imageKey, setImageKey] = useState(Date.now());

  if (!isOpen) return null;

  const publicCdnUrl = "https://qrqhonyympzsmaucbfel.supabase.co/storage/v1/object/public/meteoprecisa/goes19_loop.webp";
  const videoUrl = `${publicCdnUrl}?t=${imageKey}`;

  const handleRefresh = () => {
    setImageKey(Date.now());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-2xl">
      <div className="apple-card w-full max-w-4xl overflow-hidden border border-purple-500/30 flex flex-col max-h-[90vh] shadow-2xl bg-slate-950 animate-apple-entry">
        
        {/* CABECERA */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/20 text-purple-300 rounded-2xl border border-purple-500/30">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white">
                  Satélite Meteorológico NOAA GOES-19
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                  Bucle 24h en Vivo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Secuencia GeoColor Sudamérica & Chile (Resolución Completa Sector SSA)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Refrescar imagen"
              className="apple-pill p-2 text-purple-300 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="apple-pill p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* VISOR DE ANIMACIÓN SATELITAL WEBP */}
        <div className="flex-1 bg-black relative flex items-center justify-center min-h-[380px] overflow-hidden p-3">
          <img
            src={videoUrl}
            alt="Bucle Animado Satélite GOES-19 NOAA Chile"
            className="max-h-[62vh] w-auto object-contain rounded-xl shadow-2xl border border-white/10"
            onLoad={() => setLoading(false)}
          />

          <div className="absolute top-4 right-4 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-purple-500/30 text-xs font-mono text-purple-300 backdrop-blur-md flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-purple-400" />
            <span>Últimas 24 Horas Continuas</span>
          </div>
        </div>

        {/* PIE DE PÁGINA CON AUDITORÍA */}
        <div className="p-3.5 bg-slate-900/90 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Datos provistos directamente por NOAA NESDIS (STAR ABI Sensor)</span>
          </div>

          <a
            href="https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G19&sector=ssa"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-300 hover:text-purple-200 underline font-semibold flex items-center gap-1"
          >
            <span>Ver fuente oficial NOAA</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

      </div>
    </div>
  );
}
