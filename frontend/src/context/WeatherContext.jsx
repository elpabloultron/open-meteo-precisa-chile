import React, { createContext, useState, useEffect } from 'react';

export const WeatherContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || '';
const BACKEND_URL = 'https://meteoprecisa-backend.onrender.com';

// Coordenadas predeterminadas iniciales (Chinacahui / San Pablo / Osorno)
const DEFAULT_COORDS = { lat: -40.4000, lon: -73.2800, name: "Chinacahui / Osorno" };

export function WeatherProvider({ children }) {
  const [modo, setModo] = useState('agricola');
  const [coords, setCoords] = useState(DEFAULT_COORDS);
  const [climaData, setClimaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [gpsActive, setGpsActive] = useState(false);

  const [theme, setTheme] = useState(() => localStorage.getItem('mp_theme') || 'dark');
  const [systemDark, setSystemDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

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

  // SOLICITUD AUTOMÁTICA DE GEOLOCALIZACIÓN GPS REAL AL ABRIR
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: "Mi Ubicación GPS Actual"
          };
          setCoords(liveCoords);
          setGpsActive(true);
        },
        (err) => {
          console.warn("Aviso GPS:", err.message);
          setGpsActive(false);
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    }
  }, []);

  // CONSULTA DE TELEMETRÍA EN VIVO CADA VEZ QUE CAMBIAN LAS COORDENADAS
  useEffect(() => {
    let isSubscribed = true;
    setLoading(true);
    setErrorMsg(null);

    const queryUrl = `${BACKEND_URL}/api/v1/clima-hiperlocal?lat=${coords.lat}&lon=${coords.lon}`;

    fetch(queryUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (isSubscribed && data && data.estacion) {
          setClimaData(data);
        }
      })
      .catch((err) => {
        console.error("Error consultando backend principal, reintentando:", err);
        // Reintentar vía proxy local si existe
        fetch(`/api/v1/clima-hiperlocal?lat=${coords.lat}&lon=${coords.lon}`)
          .then((res) => res.json())
          .then((data) => {
            if (isSubscribed && data && data.estacion) {
              setClimaData(data);
            }
          })
          .catch((finalErr) => {
            console.error("Error definitivo:", finalErr);
            if (isSubscribed) setErrorMsg("No se pudo conectar a la telemetría en vivo.");
          });
      })
      .finally(() => {
        if (isSubscribed) setLoading(false);
      });

    return () => { isSubscribed = false; };
  }, [coords]);

  const handleSelectStation = (est) => {
    if (est.lat && est.lon) {
      setCoords({ lat: est.lat, lon: est.lon, name: est.nombre || est.sector });
    }
  };

  const handleTriggerGps = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const liveCoords = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: "Mi Ubicación GPS Actual"
          };
          setCoords(liveCoords);
          setGpsActive(true);
        },
        (err) => {
          alert("Por favor permite el acceso al GPS en tu navegador para detectar tu ubicación exacta.");
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  };

  return (
    <WeatherContext.Provider value={{
      modo, setModo,
      coords, setCoords,
      climaData, setClimaData,
      loading, setLoading,
      errorMsg,
      gpsActive,
      handleTriggerGps,
      theme, setTheme, resolvedTheme,
      handleSelectStation,
      API_BASE,
      BACKEND_URL
    }}>
      {children}
    </WeatherContext.Provider>
  );
}
