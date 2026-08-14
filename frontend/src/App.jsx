import React, { useState, useEffect, useRef, useContext } from 'react';
import { WeatherContext } from './context/WeatherContext';
import Navbar from './components/Navbar';
import WeatherSkyCanvas from './components/WeatherSkyCanvas';
import BreezyView from './components/BreezyView';
import MapDrawer from './components/MapDrawer';
import CommandPaletteModal from './components/CommandPaletteModal';
import AgroReportModal from './components/AgroReportModal';
import GeeMapModal from './components/GeeMapModal';
import SatelliteModal from './components/SatelliteModal';
import DetailDrawer from './components/DetailDrawer';
import AqiDrawer from './components/AqiDrawer';
import HourlyForecastDrawer from './components/HourlyForecastDrawer';
import EstacionesCercanasModal from './components/EstacionesCercanasModal';
import LocationFallbackModal from './components/LocationFallbackModal';
import BottomNav from './components/BottomNav';

export default function App() {
  const {
    modo, setModo,
    coords, setCoords,
    climaData,
    loading,
    gpsFallbackOpen, setGpsFallbackOpen,
    handleSelectStation,
    resolvedTheme,
    API_BASE
  } = useContext(WeatherContext);

  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [mapDrawerOpen, setMapDrawerOpen] = useState(false);
  const [sateliteModalOpen, setSateliteModalOpen] = useState(false);
  const [geeMapModalOpen, setGeeMapModalOpen] = useState(false);
  const [agroReportModalOpen, setAgroReportModalOpen] = useState(false);
  const [cercanasModalOpen, setCercanasModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inicio');

  // Estado para el DetailDrawer de métricas y auditoría
  const [selectedMetric, setSelectedMetric] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // Estado para Calidad del Aire (AQI)
  const [selectedAqiData, setSelectedAqiData] = useState(null);
  const [aqiDrawerOpen, setAqiDrawerOpen] = useState(false);

  // Estado para Pronóstico Horario
  const [selectedDayHourly, setSelectedDayHourly] = useState(null);
  const [hourlyDrawerOpen, setHourlyDrawerOpen] = useState(false);

  const mapRef = useRef(null);
  const forecastRef = useRef(null);

  // ATAJOS DE TECLADO GLOBALES ESTILO APPLE / LINEAR (Cmd+K, M, B)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
      
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      } else if (!isInput && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        setMapDrawerOpen(prev => !prev);
      } else if (!isInput && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setAgroReportModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === 'inicio') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (tabId === 'mapa') {
      setMapDrawerOpen(true);
    } else if (tabId === 'satelite') {
      setSateliteModalOpen(true);
    } else if (tabId === 'pronostico') {
      if (forecastRef.current) {
        forecastRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleSelectMetric = (metricInfo) => {
    setSelectedMetric(metricInfo);
    setDrawerOpen(true);
  };

  const handleOpenAqi = (aqiData) => {
    setSelectedAqiData(aqiData);
    setAqiDrawerOpen(true);
  };

  const handleOpenHourly = (dayHourlyData) => {
    setSelectedDayHourly(dayHourlyData);
    setHourlyDrawerOpen(true);
  };

  return (
    <div className={`theme-wrapper ${modo === 'agricola' ? 'theme-agricola' : 'theme-urbano'}`}>
      {/* LIENZO DE CIELO ATMOSFÉRICO DINÁMICO ESTILO APPLE WEATHER */}
      <WeatherSkyCanvas climaData={climaData} resolvedTheme={resolvedTheme} />

      <div className="relative z-10 min-h-screen text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-slate-950">
      
      {/* NAVBAR NAVEGACIÓN PRINCIPAL APPLE HIG */}
      <Navbar
        modo={modo}
        setModo={setModo}
        onSelectStation={handleSelectStation}
        apiBase={API_BASE}
        onOpenMapDrawer={() => setMapDrawerOpen(true)}
      />

      {/* CONTENIDO PRINCIPAL COMPLETO CON SAFE AREA FOOTER PADDING */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 pb-24 md:pb-8">
        
        {loading ? (
          <div className="apple-card p-12 text-center space-y-4 my-12 shadow-2xl backdrop-blur-2xl max-w-lg mx-auto">
            <div className="w-10 h-10 border-3 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="text-base font-extrabold text-white">Sincronizando telemetría en vivo para Chile...</div>
            <p className="text-xs text-slate-400">Consultando 557 estaciones físicas DMC, Agromet INIA y Google Earth Engine</p>
          </div>
        ) : (
          <BreezyView
            climaData={climaData}
            modo={modo}
            onOpenEstacionesCercanas={() => setCercanasModalOpen(true)}
            onSelectMetric={handleSelectMetric}
            onOpenAqi={handleOpenAqi}
            onOpenHourly={handleOpenHourly}
            onOpenSateliteModal={() => setSateliteModalOpen(true)}
            onOpenGeeMapModal={() => setGeeMapModalOpen(true)}
            onOpenAgroReport={() => setAgroReportModalOpen(true)}
            onOpenMapDrawer={() => setMapDrawerOpen(true)}
            handleSelectStation={handleSelectStation}
            mapRef={mapRef}
            forecastRef={forecastRef}
            apiBase={API_BASE}
          />
        )}

      </main>

      {/* PIE DE PÁGINA */}
      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-500 bg-slate-950/80 backdrop-blur-xl pb-20 md:pb-6">
        <p>MeteoPrecisa Chile • Motor Agroclimático de Precisión WMO-No. 8 & Google Earth Engine • <span className="text-slate-400">Presiona <strong>Cmd+K</strong> para buscar</span></p>
      </footer>

      {/* PALETA DE COMANDOS SPOTLIGHT APPLE HIG */}
      <CommandPaletteModal
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSelectStation={handleSelectStation}
        modo={modo}
        setModo={setModo}
        onOpenMapDrawer={() => setMapDrawerOpen(true)}
        onOpenAgroReport={() => setAgroReportModalOpen(true)}
        apiBase={API_BASE}
      />

      {/* DRAWER LATERAL FLOTANTE DE MAPAS & SATÉLITES APPLE HIG */}
      <MapDrawer
        isOpen={mapDrawerOpen}
        onClose={() => setMapDrawerOpen(false)}
        lat={climaData?.estacion?.coordenadas?.latitud || coords.lat}
        lon={climaData?.estacion?.coordenadas?.longitud || coords.lon}
        apiBase={API_BASE}
      />

      {/* MODAL FICHA TÉCNICA AGROCLIMÁTICA IMPRIMIBLE/PDF */}
      <AgroReportModal
        isOpen={agroReportModalOpen}
        onClose={() => setAgroReportModalOpen(false)}
        climaData={climaData}
      />

      {/* MODAL VISOR SATELITAL GEE INTERACTIVO POR CAPAS */}
      <GeeMapModal
        isOpen={geeMapModalOpen}
        onClose={() => setGeeMapModalOpen(false)}
        lat={climaData?.estacion?.coordenadas?.latitud || coords.lat}
        lon={climaData?.estacion?.coordenadas?.longitud || coords.lon}
        apiBase={API_BASE}
      />

      {/* REPRODUCTOR SATELITAL BUCLE WEBP GOES-19 */}
      <SatelliteModal
        isOpen={sateliteModalOpen}
        onClose={() => setSateliteModalOpen(false)}
      />

      {/* DRAWER DETALLES DE MÉTRICA */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        metric={selectedMetric}
      />

      {/* DRAWER AUDITORÍA CALIDAD DEL AIRE SINCA */}
      <AqiDrawer
        isOpen={aqiDrawerOpen}
        onClose={() => setAqiDrawerOpen(false)}
        aqiData={selectedAqiData}
      />

      {/* DRAWER PRONÓSTICO HORARIO DÍA SELECCIONADO */}
      <HourlyForecastDrawer
        isOpen={hourlyDrawerOpen}
        onClose={() => setHourlyDrawerOpen(false)}
        dayData={selectedDayHourly}
      />

      {/* MODAL ESTACIONES CERCANAS */}
      <EstacionesCercanasModal
        isOpen={cercanasModalOpen}
        onClose={() => setCercanasModalOpen(false)}
        lat={coords.lat}
        lon={coords.lon}
        onSelectStation={handleSelectStation}
        apiBase={API_BASE}
      />

      {/* MODAL FALLBACK GPS */}
      <LocationFallbackModal
        isOpen={gpsFallbackOpen}
        onClose={() => setGpsFallbackOpen(false)}
        onSelectStation={handleSelectStation}
        apiBase={API_BASE}
      />

      {/* NAVEGACIÓN INFERIOR MÓVIL TIPO DOCK */}
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      </div>
    </div>
  );
}
