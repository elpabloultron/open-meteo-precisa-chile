# DESIGN.md - Open Design Specification for MeteoPrecisa

This document defines the Open Design System contract for `MeteoPrecisa` (Agrometeorological & Air Quality PWA).

## 🎨 Brand & Color Palette

- **Mode**: Dark Mode First (`#080c14`)
- **Primary Cyan**: `#38bdf8` / `#06b6d4` (Urban mode, cold telemetry)
- **Primary Emerald**: `#34d399` / `#10b981` (Agro mode, vegetation, NDVI)
- **Warning Amber**: `#f59e0b` (Moderate risk / frost warnings)
- **Alert Red**: `#ef4444` (Severe frost / SENAPRED emergency)
- **Glass Panel Background**: `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(28px)`

## 📐 Typography & Font System

- **Primary Font**: `Outfit` (Google Fonts, sans-serif) - used for headings, cards, labels.
- **Data & Mono Font**: `Space Grotesk` (Google Fonts, monospace) - used for numerical metrics, temperature displays (`18°`), and telemetry timestamps.

## 🧩 Component UI Standards

- **Cards**: Glassmorphism 2.0 with `.glass-panel-glow` and subtle inset highlights.
- **Live Badges**: `.live-pulse-dot` with CSS `pulse-ring` animation for real-time station heartbeats.
- **Navigation**: Dual-mode toggle pills (`Modo Urbano` vs `Modo Agrícola`).
- **Charts**: Minimalist gradient area charts built with `Chart.js` / `MapLibre GL`.

## ⚙️ Target Framework

- **Frontend**: React 19 + Vite + TailwindCSS v4
- **Icons**: Lucide React (`lucide-react`)
- **PWA**: Native installable PWA via `vite-plugin-pwa`
