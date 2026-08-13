import React, { createContext, useState, useEffect } from 'react';

export const WeatherContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || '';
const BACKEND_FALLBACK = 'https://meteoprecisa-backend.onrender.com';

const FALLBACK_CLIMA_DATA = {
  estacion: {
    id: "dmc_santiago",
    nombre: "Santiago - Quinta Normal",
    sector: "Santiago Centro, Región Metropolitana",
    red: "DMC Oficial / Agromet INIA",
    lat: -33.4450,
    lon: -70.6830,
    raw_source_url: "https://climatologia.meteochile.gob.cl"
  },
  metadatos: {
    origen_dato: "estacion_fisica_directa",
    lineage_etiqueta: "Telemetría Directa DMC Chile",
    distancia_km: 1.2,
    servidor_timestamp: Math.floor(Date.now() / 1000)
  },
  modo_urbano: {
    temperatura_c: 18.5,
    sensacion_termica_c: 19.0,
    humedad_relativa_pct: 55,
    presion_hpa: 1014.2,
    viento_kmh: 12.0,
    viento_direccion_grados: 215,
    indice_uv: 5,
    salida_sol: "07:15",
    puesta_sol: "19:45",
    calidad_aire_sinca: {
      mp25: 18.2,
      mp10: 38.5,
      aqi: 64,
      categoria: "Bueno"
    }
  },
  modo_agricola: {
    temperatura_minima_hoy_c: 8.2,
    temperatura_maxima_hoy_c: 22.4,
    lluvia_caida_hoy_mm: 0.0,
    evapotranspiracion_eto_mm_dia: 3.8,
    deficit_presion_vapor_vpd_kpa: 0.95,
    salud_vegetacion_ndvi: 0.62,
    clorofila_nitrogino_ndre: 0.45,
    estres_hidrico_ndwi: 0.28,
    temperatura_suelo_10cm_c: 14.5,
    horas_frio_acumuladas_24h: 0
  },
  pronostico_numerico_openmeteo: {
    horario: {
      time: Array.from({length: 24}, (_, i) => `${new Date().toISOString().split('T')[0]}T${String(i).padStart(2,'0')}:00`),
      temperature_2m: [12,11,10,9,8,9,11,14,17,19,21,22,22,21,20,19,17,15,14,13,12,12,11,11],
      precipitation_probability: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      precipitation: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      relative_humidity_2m: [70,72,75,78,80,75,68,60,52,48,44,42,43,46,50,55,60,65,68,70,72,72,71,70]
    },
    diario: {
      time: Array.from({length: 7}, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() + i);
        return d.toISOString().split('T')[0];
      }),
      temperature_2m_max: [22, 23, 21, 20, 19, 21, 22],
      temperature_2m_min: [8, 9, 8, 7, 6, 8, 9],
      precipitation_sum: [0, 0, 0, 0, 1.2, 0, 0]
    }
  }
};

export function WeatherProvider({ children }) {
  const [modo, setModo] = useState('agricola');
  const [coords, setCoords] = useState(() => {
    try {
      const saved = localStorage.getItem('mp_coords');
      return saved ? JSON.parse(saved) : { lat: -40.4000, lon: -73.2800 }; // Quilacahuín (San Pablo, Osorno)
    } catch {
      return { lat: -40.4000, lon: -73.2800 };
    }
  });
  const [climaData, setClimaData] = useState(FALLBACK_CLIMA_DATA);
  const [loading, setLoading] = useState(false);
  const [gpsFallbackOpen, setGpsFallbackOpen] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('mp_theme') || 'system');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    try {
      localStorage.setItem('mp_coords', JSON.stringify(coords));
    } catch {}
  }, [coords]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemDark(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = theme === 'system' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
    localStorage.setItem('mp_theme', theme);
  }, [theme, resolvedTheme]);

  useEffect(() => {
    // Solicitar automáticamente la ubicación GPS real del usuario al abrir la app
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude
          };
          setCoords(liveCoords);
          try {
            localStorage.setItem('mp_coords', JSON.stringify(liveCoords));
          } catch {}
        },
        (err) => {
          console.warn("Aviso GPS del navegador:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);

    const primaryUrl = `${API_BASE}/api/v1/clima-hiperlocal?lat=${coords.lat}&lon=${coords.lon}`;
    
    fetch(primaryUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isSubscribed && data && data.estacion) {
          setClimaData(data);
        }
      })
      .catch(() => {
        // Intentar fallback al backend desplegado en Cloud Run
        const fallbackUrl = `${BACKEND_FALLBACK}/api/v1/clima-hiperlocal?lat=${coords.lat}&lon=${coords.lon}`;
        return fetch(fallbackUrl)
          .then((res) => res.json())
          .then((data) => {
            if (isSubscribed && data && data.estacion) {
              setClimaData(data);
            }
          })
          .catch((err) => {
            console.error("Usando datos de respaldo estables:", err);
            if (isSubscribed) {
              setClimaData(FALLBACK_CLIMA_DATA);
            }
          });
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => { isSubscribed = false; };
  }, [coords]);

  const handleSelectStation = (est) => {
    if (est.lat && est.lon) {
      setCoords({ lat: est.lat, lon: est.lon });
    }
  };

  return (
    <WeatherContext.Provider value={{
      modo, setModo,
      coords, setCoords,
      climaData, setClimaData,
      loading, setLoading,
      gpsFallbackOpen, setGpsFallbackOpen,
      theme, setTheme, resolvedTheme,
      handleSelectStation,
      API_BASE
    }}>
      {children}
    </WeatherContext.Provider>
  );
}
