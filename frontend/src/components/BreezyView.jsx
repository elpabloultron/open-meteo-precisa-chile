import React from 'react';
import BreezyHeroBlock from './BreezyHeroBlock';
import HourlyCarousel from './HourlyCarousel';
import BreezySunMoonWidget from './BreezySunMoonWidget';
import BreezyMetricsGrid from './BreezyMetricsGrid';
import DailyForecastCards from './DailyForecastCards';
import MapSection from './MapSection';
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
  handleSelectStation,
  mapRef,
  forecastRef,
  apiBase
}) {
  if (!climaData) return null;

  return (
    <div className="space-y-6">
      
      {/* 1. BANNER DE ALERTAS AGRO-CLIMÁTICAS BREEZY WEATHER */}
      <AlertsBanner alertas={climaData?.alertas_inteligentes} />

      {/* 2. CABECERA HÉROE BREEZY WEATHER (CLIMA ACTUAL & TEMPERATURA MASIVA) */}
      <BreezyHeroBlock
        climaData={climaData}
        onOpenEstacionesCercanas={onOpenEstacionesCercanas}
        onSelectMetric={onSelectMetric}
        onOpenAgroReport={onOpenAgroReport}
      />

      {/* 3. CARRUSEL HORARIO 24H BREEZY WEATHER CON PROBABILIDAD DE LLUVIA */}
      <HourlyCarousel
        hourlyForecast={climaData?.pronostico_numerico_openmeteo?.horario}
      />

      {/* 4. ARCO ASTRONÓMICO SOL Y LUNA BREEZY WEATHER */}
      <BreezySunMoonWidget
        salidaSol={climaData?.modo_urbano?.salida_sol}
        puestaSol={climaData?.modo_urbano?.puesta_sol}
      />

      {/* 5. GRILLA BENTO DE MÉTRICAS AMBIENTALES & AGRONÓMICAS GEE */}
      <BreezyMetricsGrid
        modo={modo}
        climaData={climaData}
        onSelectMetric={onSelectMetric}
        onOpenAqi={onOpenAqi}
      />

      {/* 6. PRONÓSTICO A 7 DÍAS CON BARRAS DE RANGO TÉRMICO */}
      <div ref={forecastRef} className="space-y-6">
        <DailyForecastCards
          dailyForecast={climaData?.pronostico_numerico_openmeteo?.diario || climaData?.pronostico_numerico_openmeteo?.diario_7dias}
          hourlyForecast={climaData?.pronostico_numerico_openmeteo?.horario}
          onSelectMetric={onSelectMetric}
          onOpenHourly={onOpenHourly}
        />

        {/* TABLA COMPARATIVA DE ESTACIONES VECINAS */}
        <ComparisonTable
          estacionActual={climaData?.estacion}
          apiBase={apiBase}
        />

        {/* GRÁFICO TÉRMICO Y PRECIPITACIÓN A 48 HORAS */}
        <ForecastChart
          dmcForecast={climaData?.pronostico_oficial_dmc}
          openMeteoForecast={climaData?.pronostico_numerico_openmeteo}
          onSelectMetric={onSelectMetric}
        />
      </div>

      {/* 7. SECCIÓN MAPA INTERACTIVO WINDY & CAPAS ESPECTRALES GEE */}
      <div ref={mapRef}>
        <MapSection
          estacionSeleccionada={climaData?.estacion}
          apiBase={apiBase}
          onOpenSateliteModal={onOpenSateliteModal}
          onOpenGeeMapModal={onOpenGeeMapModal}
          onSelectStation={handleSelectStation}
        />
      </div>

    </div>
  );
}
