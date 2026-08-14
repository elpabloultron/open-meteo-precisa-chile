import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, Sprout, Layers, FileText, X, Radio, ArrowRight, CornerDownLeft } from 'lucide-react';

export default function CommandPaletteModal({
  isOpen,
  onClose,
  onSelectStation,
  modo,
  setModo,
  onOpenMapDrawer,
  onOpenAgroReport,
  apiBase
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${apiBase}/api/v1/buscar-estaciones?q=${encodeURIComponent(query)}`);
        if (resp.ok) {
          const data = await resp.json();
          setResults(data);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error("Error buscando en paleta:", err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, apiBase]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectStation(results[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-slate-950/80 backdrop-blur-2xl animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-slate-900/95 border border-white/15 rounded-3xl shadow-2xl overflow-hidden animate-apple-entry flex flex-col divide-y divide-white/10"
      >
        {/* INPUT DE BÚSQUEDA SPOTLIGHT */}
        <div className="flex items-center px-4 py-3.5 gap-3 bg-slate-950/60">
          <Search className="w-5 h-5 text-sky-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar estación, comuna o comando rápido..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-400 font-medium"
          />
          {loading && <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded-md">
            ESC
          </kbd>
        </div>

        {/* ACCIONES RÁPIDAS SI NO HAY TEXTO */}
        {query.trim().length < 2 && (
          <div className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Acciones Rápidas
            </div>

            <button
              onClick={() => {
                setModo(modo === 'urbano' ? 'agricola' : 'urbano');
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-slate-800/60 text-xs flex items-center justify-between transition text-slate-200 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                {modo === 'urbano' ? <Sprout className="w-4 h-4 text-emerald-400" /> : <Building2 className="w-4 h-4 text-sky-400" />}
                <span>Cambiar a {modo === 'urbano' ? 'Modo Campo 🌾' : 'Modo Ciudad 🏙️'}</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
            </button>

            <button
              onClick={() => {
                onOpenMapDrawer();
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-slate-800/60 text-xs flex items-center justify-between transition text-slate-200 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Abrir Visor de Mapas y Satélites</span>
              </div>
              <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">M</kbd>
            </button>

            <button
              onClick={() => {
                onOpenAgroReport();
                onClose();
              }}
              className="w-full text-left px-3 py-2.5 rounded-2xl hover:bg-slate-800/60 text-xs flex items-center justify-between transition text-slate-200 group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Ver Boletín Agrícola Oficial (PDF)</span>
              </div>
              <kbd className="px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">B</kbd>
            </button>
          </div>
        )}

        {/* LISTA DE ESTACIONES RESULTANTES */}
        {results.length > 0 && (
          <div className="max-h-72 overflow-y-auto p-2 divide-y divide-white/5 no-scrollbar">
            {results.map((est, idx) => (
              <div
                key={est.id}
                onClick={() => {
                  onSelectStation(est);
                  onClose();
                }}
                className={`px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-xs cursor-pointer transition ${
                  idx === selectedIndex ? 'bg-sky-500/20 text-white border border-sky-400/40' : 'hover:bg-slate-800/50 text-slate-300'
                }`}
              >
                <div>
                  <div className="font-extrabold text-white flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>{est.nombre}</span>
                  </div>
                  <div className="text-slate-400 text-[11px] pl-5">{est.sector}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-slate-950 text-sky-300 rounded-full text-[10px] font-mono border border-white/10">
                    {est.red}
                  </span>
                  {idx === selectedIndex && (
                    <CornerDownLeft className="w-3.5 h-3.5 text-sky-400" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* FOOTER INFORMACIÓN DE ATAJOS */}
        <div className="p-3 bg-slate-950/80 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span>↑↓ Navegar</span>
            <span>↵ Seleccionar</span>
            <span>ESC Salir</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">MeteoPrecisa Spotlight</span>
        </div>

      </div>
    </div>
  );
}
