import React, { createContext, useState, useEffect } from 'react';

export const WeatherContext = createContext();

const API_BASE = import.meta.env.VITE_API_URL || '';
const BACKEND_URL = 'https://meteoprecisa-backend.onrender.com';

// Coordenadas predeterminadas iniciales (Chinacahui / San Pablo / Osorno)
const DEFAULT_COORDS = { lat: -40.4000, lon: -73.2800, name: "Chinacahui / Osorno" };

function sanitizeClimaData(data) {
  if (!data || !data.estacion) return data;

  const hourlyTemps = data?.pronostico_numerico_openmeteo?.horario?.temperature_2m;
  const currentHourlyTemp = (hourlyTemps && hourlyTemps.length > 0) ? hourlyTemps[0] : null;

  // Si la temperatura en modo_urbano difiere de forma inverosímil del modelo horario instantáneo (> 4°C de diferencia),
  // sincronizamos con la temperatura actual en tiempo real
  if (currentHourlyTemp !== null && data.modo_urbano) {
    const rawTemp = data.modo_urbano.temperatura_c;
    if (rawTemp === null || isNaN(rawTemp) || Math.abs(rawTemp - currentHourlyTemp) > 2.0) {
      data.modo_urbano.temperatura_c = Math.round(currentHourlyTemp * 10) / 10;
      data.modo_urbano.sensacion_termica_c = Math.round((currentHourlyTemp - 1.2) * 10) / 10;
    }
  }

  return data;
}

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
          setClimaData(sanitizeClimaData(data));
        }
      })
      .catch((err) => {
        console.error("Error consultando backend principal, reintentando:", err);
        // Reintentar vía proxy local si existe
        fetch(`/api/v1/clima-hiperlocal?lat=${coords.lat}&lon=${coords.lon}`)
          .then((res) => res.json())
          .then((data) => {
            if (isSubscribed && data && data.estacion) {
              setClimaData(sanitizeClimaData(data));
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

  return (
    <WeatherContext.Provider
      value={{
        modo,
        setModo,
        coords,
        setCoords,
        climaData,
        loading,
        errorMsg,
        gpsActive,
        theme,
        setTheme,
        resolvedTheme,
        handleSelectStation,
        apiBase: BACKEND_URL
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}
