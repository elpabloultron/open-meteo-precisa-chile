import React, { useState, useEffect } from 'react';
import { CloudSun, Search, Building2, Sprout } from 'lucide-react';

export default function Navbar({ modo, setModo, onSelectStation, apiBase }) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResultados([]);
      return;
    }

    setBuscando(true);
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(`${apiBase}/api/v1/buscar-estaciones?q=${encodeURIComponent(query)}`);
        if (resp.ok) {
          const data = await resp.json();
          setResultados(data);
        }
      } catch (err) {
        console.error("Error buscando estaciones:", err);
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, apiBase]);

  return (
    <header className="sticky top-0 z-50 bg-slate-900/40 border-b border-white/10 backdrop-blur-2xl px-4 py-3 shadow-2xl pt-safe transition-colors duration-700">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* TITULAR Y MARCA */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-500 text-white font-bold shadow-lg shadow-sky-500/20 ring-1 ring-white/20">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  Meteo<span className="gradient-text-cyan">Precisa</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30 shadow-sm">
                  <span className="live-pulse-dot"></span>
                  <span>v10.2 Live</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Chile • GEE & Telemetría Multired</p>
            </div>
          </div>

          {/* INDICADOR EN VIVO (MÓVIL) */}
          <div className="md:hidden flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-[10px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>En vivo</span>
          </div>
        </div>

        {/* BUSCADOR AUTOCOMPLETADO */}
        <div className="relative w-full md:w-96">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar ciudad o comuna de Chile..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/10 bg-black/20 backdrop-blur-lg rounded-2xl text-xs text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all duration-300 shadow-inner"
            />
          </div>

          {/* DESPLEGABLE RESULTADOS */}
          {resultados.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 divide-y divide-slate-800">
              {resultados.map((est) => (
                <button
                  key={est.id}
                  onClick={() => {
                    onSelectStation(est);
                    setQuery('');
                    setResultados([]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/80 transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-100">{est.nombre}</div>
                    <div className="text-slate-400 text-[11px]">{est.sector}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-950 text-sky-400 rounded-full text-[10px] font-semibold border border-slate-800">
                    {est.red}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SELECTOR DE MODOS CON PILLS DE NAVEGACIÓN */}
        <div className="flex items-center p-1 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl w-full md:w-auto justify-center shadow-inner">
          <button
            type="button"
            onClick={() => setModo('urbano')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
              modo === 'urbano'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Modo Urbano</span>
          </button>

          <button
            type="button"
            onClick={() => setModo('agricola')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
              modo === 'agricola'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sprout className="w-4 h-4" />
            <span>Modo Agrícola</span>
          </button>
        </div>

      </div>
    </header>
  );
}
