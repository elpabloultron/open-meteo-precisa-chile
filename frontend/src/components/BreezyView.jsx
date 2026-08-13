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
    <div className="space-y-5">
      
      {/* 1. BARRA RÁPIDA DE COMUNAS Y LOCALIDADES */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider whitespace-nowrap">
          Zonas:
        </span>
        {[
          { name: "📍 Chinacahui / Osorno", lat: -40.4000, lon: -73.2800 },
          { name: "📍 Temuco", lat: -38.7359, lon: -72.5904 },
          { name: "📍 Valdivia", lat: -39.8142, lon: -73.2459 },
          { name: "📍 Puerto Montt", lat: -41.4693, lon: -72.9424 },
          { name: "📍 Concepción", lat: -36.8270, lon: -73.0503 },
          { name: "📍 Chillán", lat: -36.6066, lon: -72.1034 },
          { name: "📍 Talca", lat: -35.4264, lon: -71.6554 },
          { name: "📍 Santiago", lat: -33.4450, lon: -70.6830 },
          { name: "📍 La Serena", lat: -29.9027, lon: -71.2520 }
        ].map((loc) => (
          <button
            key={loc.name}
            onClick={() => handleSelectStation && handleSelectStation(loc)}
            className="apple-pill whitespace-nowrap text-xs text-slate-300 hover:text-white bg-slate-900/60 border border-white/10 hover:border-sky-400/50 hover:bg-sky-500/15"
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* 2. BANNER DE ALERTAS AGRO-CLIMÁTICAS */}
      <AlertsBanner alertas={climaData?.alertas_inteligentes} />

      {/* 3. CABECERA HÉROE PRINCIPAL (TEMPERATURA Y ESTACIÓN FÍSICA) */}
      <BreezyHeroBlock
        climaData={climaData}
        onOpenEstacionesCercanas={onOpenEstacionesCercanas}
        onSelectMetric={onSelectMetric}
        onOpenAgroReport={onOpenAgroReport}
      />

      {/* 4. CARRUSEL HORARIO 24H CON PROBABILIDAD DE LLUVIA */}
      <HourlyCarousel
        hourlyForecast={climaData?.pronostico_numerico_openmeteo?.horario}
      />

      {/* 5. ARCO ASTRONÓMICO SOL Y LUNA */}
      <BreezySunMoonWidget
        salidaSol={climaData?.modo_urbano?.salida_sol}
        puestaSol={climaData?.modo_urbano?.puesta_sol}
      />

      {/* 6. GRILLA BENTO DE MÉTRICAS AMBIENTALES & AGRONÓMICAS */}
      <BreezyMetricsGrid
        modo={modo}
        climaData={climaData}
        onSelectMetric={onSelectMetric}
        onOpenAqi={onOpenAqi}
      />

      {/* 7. PRONÓSTICO A 7 DÍAS CON BARRAS DE RANGO TÉRMICO */}
      <div ref={forecastRef} className="space-y-5">
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

        {/* GRÁFICO TÉRMICO Y PRECIPITACIÓN */}
        <ForecastChart
          dmcForecast={climaData?.pronostico_oficial_dmc}
          openMeteoForecast={climaData?.pronostico_numerico_openmeteo}
          onSelectMetric={onSelectMetric}
        />
      </div>

      {/* 8. SECCIÓN MAPA INTERACTIVO WINDY & CAPAS ESPECTRALES GEE */}
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
