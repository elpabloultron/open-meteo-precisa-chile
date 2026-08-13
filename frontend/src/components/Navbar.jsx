import React, { useState, useEffect, useContext } from 'react';
import { CloudSun, Search, Building2, Sprout, Sun, Moon, Laptop, LocateFixed } from 'lucide-react';
import { WeatherContext } from '../context/WeatherContext';

export default function Navbar({ modo, setModo, onSelectStation, apiBase }) {
  const { theme, setTheme, setCoords } = useContext(WeatherContext);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [gpsLocating, setGpsLocating] = useState(false);

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
    }, 200);

    return () => clearTimeout(timer);
  }, [query, apiBase]);

  const handleTriggerGps = () => {
    if ('geolocation' in navigator) {
      setGpsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveCoords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
          setCoords(liveCoords);
          try { localStorage.setItem('mp_coords', JSON.stringify(liveCoords)); } catch {}
          setGpsLocating(false);
        },
        (err) => {
          console.warn("GPS error:", err);
          setGpsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }
  };

  const toggleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-950/60 border-b border-white/10 backdrop-blur-2xl px-4 py-3 shadow-xl transition-colors duration-500">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        
        {/* TITULAR Y MARCA */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25 ring-1 ring-white/20">
              <CloudSun className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  Meteo<span className="text-sky-400">Precisa</span>
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-400 rounded-full border border-emerald-500/30">
                  <span className="live-pulse-dot" />
                  <span>619 Estaciones</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Telemetría Oficial en Vivo de Chile</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* BOTÓN GPS RÁPIDO */}
            <button
              onClick={handleTriggerGps}
              title="Detectar mi ubicación GPS actual"
              className={`apple-pill flex items-center gap-1.5 text-xs font-bold transition ${
                gpsLocating ? 'bg-sky-500/30 text-sky-300 border-sky-400 animate-pulse' : 'text-slate-300'
              }`}
            >
              <LocateFixed className={`w-3.5 h-3.5 ${gpsLocating ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
              <span className="hidden sm:inline">{gpsLocating ? 'Buscando GPS...' : 'Mi GPS'}</span>
            </button>

            {/* SELECTOR TEMA */}
            <button
              onClick={toggleTheme}
              title={`Tema actual: ${theme}`}
              className="apple-pill p-2 text-slate-300 hover:text-white"
            >
              {theme === 'system' && <Laptop className="w-4 h-4 text-sky-400" />}
              {theme === 'light' && <Sun className="w-4 h-4 text-amber-400" />}
              {theme === 'dark' && <Moon className="w-4 h-4 text-purple-400" />}
            </button>
          </div>
        </div>

        {/* BUSCADOR AUTOCOMPLETADO */}
        <div className="relative w-full md:w-96">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar comuna, ciudad o estación..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-white/10 bg-slate-900/60 backdrop-blur-lg rounded-2xl text-xs text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition duration-200 shadow-inner"
            />
          </div>

          {/* DESPLEGABLE RESULTADOS */}
          {resultados.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-h-64 overflow-y-auto z-50 divide-y divide-slate-800 animate-apple-entry">
              {resultados.map((est) => (
                <button
                  key={est.id}
                  onClick={() => {
                    onSelectStation(est);
                    setQuery('');
                    setResultados([]);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/80 transition flex items-center justify-between text-xs cursor-pointer"
                >
                  <div>
                    <div className="font-bold text-white">{est.nombre}</div>
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

        {/* SELECTOR DE MODOS (URBANO / AGRÍCOLA) */}
        <div className="flex items-center p-1 bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl w-full md:w-auto justify-center shadow-inner">
          <button
            type="button"
            onClick={() => setModo('urbano')}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
              modo === 'urbano'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Modo Ciudad</span>
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
            <Sprout className="w-3.5 h-3.5" />
            <span>Modo Campo</span>
          </button>
        </div>

      </div>
    </header>
  );
}
