import React, { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { WeatherProvider } from './context/WeatherContext.jsx'

// Limpiar cualquier Service Worker antiguo o defectuoso que esté bloqueando el navegador
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister().catch(() => {});
    }
  }).catch(() => {});
}

// Error Boundary global para diagnosticar exactamente cualquier excepción
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("React Error Boundary atrapó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '700px',
            width: '100%'
          }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#f87171' }}>
              MeteoPrecisa — Diagnóstico de Renderizado
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', marginBottom: '1rem' }}>
              Se ha capturado el siguiente error en el cliente:
            </p>
            <pre style={{ 
              textAlign: 'left', 
              backgroundColor: 'rgba(0,0,0,0.6)', 
              padding: '1rem', 
              borderRadius: '0.5rem', 
              fontSize: '0.75rem', 
              overflowX: 'auto', 
              marginBottom: '1.5rem', 
              color: '#fca5a5',
              fontFamily: 'monospace'
            }}>
              {this.state.error ? this.state.error.toString() : 'Error desconocido'}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              style={{
                backgroundColor: '#38bdf8',
                color: '#0f172a',
                fontWeight: 'bold',
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Recargar y Limpiar Caché
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <WeatherProvider>
          <App />
        </WeatherProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
