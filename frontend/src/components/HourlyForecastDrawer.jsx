import React from 'react';
import { X, Calendar, Droplets, Wind } from 'lucide-react';

export default function HourlyForecastDrawer({ isOpen, onClose, dayData }) {
  if (!isOpen || !dayData) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* OVERLAY */}
      <div 
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* DRAWER CONTENT */}
      <div className="relative w-full max-w-md mx-auto bg-slate-900/95 backdrop-blur-2xl rounded-t-3xl border-t border-x border-sky-500/30 p-5 shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 rounded-xl border border-sky-500/40">
              <Calendar className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                Pronóstico Hora a Hora
              </h3>
              <p className="text-xs text-sky-300/70 font-medium capitalize">
                {dayData.dayName} - 24 Horas
              </p>
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
        <div className="overflow-y-auto pr-1 pb-6 space-y-2">
          {dayData.hourly.length === 0 ? (
            <div className="text-center text-slate-400 py-10 text-sm">
              No hay datos horarios disponibles para este día.
            </div>
          ) : (
            dayData.hourly.map((hour, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-white/5"
              >
                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-slate-200 w-12 text-center bg-slate-900 px-2 py-1 rounded-md border border-slate-700">
                    {hour.timeLabel}
                  </div>
                  <div className="text-2xl">{hour.icon}</div>
                  <div>
                    <div className="font-bold text-white text-base">
                      {hour.temp}°C
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  {hour.precip > 0 ? (
                    <div className="flex items-center gap-1 text-[11px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      <Droplets className="w-3 h-3" />
                      {hour.precip.toFixed(1)} mm
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 px-2 py-0.5">Sin lluvia</div>
                  )}
                  <div className="flex items-center gap-1 text-[11px] text-sky-300">
                    <Wind className="w-3 h-3" />
                    {hour.wind} km/h
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
