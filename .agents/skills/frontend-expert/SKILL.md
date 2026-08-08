---
name: frontend-expert
description: Guía experta en desarrollo Frontend moderno con React 19, Vite, TailwindCSS v4 y PWAs.
---

# Skill: Experto en Frontend Moderno (React 19 + Vite + TailwindCSS)

Esta guía establece los estándares de desarrollo, optimización y diseño UI/UX para el cliente PWA de **MeteoPrecisa**.

## 1. Arquitectura del Frontend (React 19 + Vite)
- **Estado Reactivo**: Uso de `React Context` (`WeatherContext`) y hooks locales para evitar props drilling.
- **Componentes Modulares**: Diseñados para responsabilidad única (p. ej., `WeatherHeader`, `AgroPanel`, `UrbanPanel`).
- **Renderizado Dinámico**: Evaluación condicional de datos climáticos sin parpadeos ni pantallas en blanco (*layout shifts*).

## 2. Estándares de Diseño y UI (TailwindCSS v4 + Glassmorphism 2.0)
- **Glassmorphism**: `.glass-panel-glow` (`backdrop-filter: blur(28px)`).
- **Tipografía**: `Outfit` para títulos y sans-serif; `Space Grotesk` para métricas numéricas y monoespaciadas.
- **Micro-Animaciones**: Indicadores en vivo con `.live-pulse-dot` y transiciones suaves (`duration-300`, `ease-out`).
- **Accesibilidad (a11y)**: Botones interactivos con estados `:hover`, `:focus-visible`, etiquetas `aria-label` y zonas táctiles mínimas de 44x44px para dispositivos móviles en terreno.

## 3. Optimización de PWA y Core Web Vitals
- **Caché Offline**: Manejo de Service Workers (`vite-plugin-pwa` / Workbox) para permitir visualización en zonas rurales sin cobertura 4G/5G.
- **LCP (Largest Contentful Paint)**: El héroe de temperatura (`WeatherHeader`) debe renderizar en <300ms.
- **Chart.js Optimization**: Gráficos con destrucción limpia de instancias (`useEffect` cleanup) para prevenir memory leaks en sesiones largas.
