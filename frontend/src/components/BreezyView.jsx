import React, { useState } from 'react';
import BreezyHeroBlock from './BreezyHeroBlock';
import HourlyCarousel from './HourlyCarousel';
import SprayDecisionWidget from './SprayDecisionWidget';
import FrostMonitorWidget from './FrostMonitorWidget';
import UrbanDailyWidget from './UrbanDailyWidget';
import WaterBalanceWidget from './WaterBalanceWidget';
import WindCompassWidget from './WindCompassWidget';
import BreezyMetricsGrid from './BreezyMetricsGrid';
import DailyForecastCards from './DailyForecastCards';
import BreezySunMoonWidget from './BreezySunMoonWidget';
import ComparisonTable from './ComparisonTable';
import ForecastChart from './ForecastChart';
import AlertsBanner from './AlertsBanner';

export default function BreezyView({
  climaData,
  modo,
  onOpenEstacionesCercanas,
  onSelectMetric,
  onOpenAqi,
  onOpenHourly,
  onOpenSateliteModal,
  onOpenGeeMapModal,
  onOpenAgroReport,
  onOpenMapDrawer,
  handleSelectStation,
  forecastRef,
  apiBase
}) {
  const [selectedHourIndex, setSelectedHourIndex] = useState(0);

  if (!climaData) return null;

  const hourly = climaData?.pronostico_numerico_openmeteo?.horario;
  let previewHourData = null;

  if (selectedHourIndex > 0 && hourly && hourly.time && hourly.time[selectedHourIndex]) {
    const rawTime = hourly.time[selectedHourIndex];
    previewHourData = {
      timeLabel: rawTime.includes('T') ? rawTime.split('T')[1].slice(0, 5) : `${selectedHourIndex}:00`,
      temp: Math.round(hourly.temperature_2m?.[selectedHourIndex] ?? 15),
      rainProb: Math.round(hourly.precipitation_probability?.[selectedHourIndex] ?? 0),
      code: hourly.weather_code?.[selectedHourIndex] ?? 0
    };
  }

  const windKmh = climaData?.modo_urbano?.viento_kmh ?? 12;
  const windDeg = climaData?.modo_urbano?.viento_direccion_grados ?? 215;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-2 sm:px-4">
      
      {/* 1. BANNER DE ALERTAS AGRO-CLIMÁTICAS OFICIALES */}
      <AlertsBanner alertas={climaData?.alertas_inteligentes} />

      {/* 2. CABECERA HÉROE CENTRADA ESTILO APPLE WEATHER */}
      <BreezyHeroBlock
        climaData={climaData}
        onOpenEstacionesCercanas={onOpenEstacionesCercanas}
        onSelectMetric={onSelectMetric}
        onOpenAgroReport={onOpenAgroReport}
        onOpenMapDrawer={onOpenMapDrawer}
        previewHourData={previewHourData}
        onResetPreview={() => setSelectedHourIndex(0)}
      />

      {/* 3. CARRUSEL HORARIO 24H ENCAPSULADO CON SCRUBBER */}
      <HourlyCarousel
        hourlyForecast={hourly}
        selectedHourIndex={selectedHourIndex}
        onSelectHourIndex={(idx) => setSelectedHourIndex(idx)}
      />

      {/* 4. SUITE TÁCTICA ESPECIALIZADA (BENTO GRID 2-COLUMNAS APPLE HIG) */}
      {modo === 'agricola' ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* FILA 1: PULVERIZACIÓN FITOSANITARIA + MONITOR DE HELADAS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <SprayDecisionWidget climaData={climaData} />
            <FrostMonitorWidget climaData={climaData} />
          </div>

          {/* FILA 2: BALANCE HÍDRICO FAO-56 + BRÚJULA DE VIENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <WaterBalanceWidget climaData={climaData} />
            <WindCompassWidget windKmh={windKmh} windDegrees={windDeg} />
          </div>

          {/* FILA 3: PRONÓSTICO 7 DÍAS CONTINUO */}
          <div ref={forecastRef}>
            <DailyForecastCards
              dailyForecast={climaData?.pronostico_numerico_openmeteo?.diario || climaData?.pronostico_numerico_openmeteo?.diario_7dias}
              hourlyForecast={hourly}
              onSelectMetric={onSelectMetric}
              onOpenHourly={onOpenHourly}
            />
          </div>

          {/* FILA 4: SATÉLITE SENTINEL-2 GEE (10m) */}
          <BreezyMetricsGrid
            modo="agricola"
            climaData={climaData}
            onSelectMetric={onSelectMetric}
            onOpenAqi={onOpenAqi}
          />

          {/* ARCO SOLAR Y LUNAR */}
          <BreezySunMoonWidget
            salidaSol={climaData?.modo_urbano?.salida_sol}
            puestaSol={climaData?.modo_urbano?.puesta_sol}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          
          {/* FILA 1: ASISTENTE URBANO + BRÚJULA DE VIENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <UrbanDailyWidget climaData={climaData} />
            <WindCompassWidget windKmh={windKmh} windDegrees={windDeg} />
          </div>

          {/* FILA 2: PRONÓSTICO 7 DÍAS CONTINUO */}
          <div ref={forecastRef}>
            <DailyForecastCards
              dailyForecast={climaData?.pronostico_numerico_openmeteo?.diario || climaData?.pronostico_numerico_openmeteo?.diario_7dias}
              hourlyForecast={hourly}
              onSelectMetric={onSelectMetric}
              onOpenHourly={onOpenHourly}
            />
          </div>

          {/* FILA 3: GRILLA BENTO URBANA CON SINCA MMA */}
          <BreezyMetricsGrid
            modo="urbano"
            climaData={climaData}
            onSelectMetric={onSelectMetric}
            onOpenAqi={onOpenAqi}
          />

          {/* ARCO SOLAR Y LUNAR */}
          <BreezySunMoonWidget
            salidaSol={climaData?.modo_urbano?.salida_sol}
            puestaSol={climaData?.modo_urbano?.puesta_sol}
          />
        </div>
      )}

      {/* 5. TABLA COMPARATIVA DE TRIANGULACIÓN (PLEGABLE / AUDITORÍA) */}
      <div className="pt-2">
        <ComparisonTable
          estacionActual={climaData?.estacion}
          apiBase={apiBase}
        />
      </div>

    </div>
  );
}
