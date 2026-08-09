import React from 'react';

export default function WeatherSkyCanvas({ climaData, resolvedTheme }) {
  const temp = climaData?.modo_urbano?.temperatura_c ?? 15;
  const precip = climaData?.modo_agricola?.lluvia_caida_hoy_mm ?? 0;
  const isNight = climaData?.modo_urbano?.salida_sol ? false : false;

  // Determinar la atmósfera según el clima real
  let skyType = 'day-sunny';
  if (precip > 0.5) {
    skyType = 'rainy';
  } else if (temp <= 4) {
    skyType = 'frost-cold';
  } else if (temp >= 26) {
    skyType = 'warm-sunny';
  }

  if (resolvedTheme === 'dark') {
    skyType = 'night-clear';
  }

  return (
    <div className={`weather-sky-canvas sky-${skyType}`}>
      {/* Esferas ambientales de luz y bruma dinámica */}
      <div className="sky-orb orb-primary" />
      <div className="sky-orb orb-secondary" />
      <div className="sky-orb orb-tertiary" />
      <div className="sky-mist" />
    </div>
  );
}
