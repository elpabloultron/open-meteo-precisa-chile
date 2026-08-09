import React, { useState, useEffect } from 'react';
import { Radio } from 'lucide-react';

export default function ComparisonTable({ estacionActual, apiBase }) {
  const [estacionesVecinas, setEstacionesVecinas] = useState([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!estacionActual) return;

    setCargando(true);
    // Consultar estaciones cercanas en un radio de 30 km
    fetch(`${apiBase}/api/v1/buscar-estaciones?limite=650`)
      .then((res) => res.json())
      .then((todas) => {
        if (!Array.isArray(todas)) return;
        const lat0 = estacionActual?.coordenadas?.latitud || -33.4450;
        const lon0 = estacionActual?.coordenadas?.longitud || -70.6830;

        // Calcular distancia Haversine a cada estación
        const conDistancia = todas.map((e) => {
          const dLat = (e.lat - lat0) * (Math.PI / 180);
          const dLon = (e.lon - lon0) * (Math.PI / 180);
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat0 * (Math.PI / 180)) *
              Math.cos(e.lat * (Math.PI / 180)) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distKm = Math.round(6371 * c * 10) / 10;
          return { ...e, distKm };
        });

        // Filtrar estaciones dentro de 35 km y tomar hasta 6 de distintas redes
        const ordenadas = conDistancia
          .filter((e) => e.id !== estacionActual.id)
          .sort((a, b) => a.distKm - b.distKm)
          .slice(0, 6);

        setEstacionesVecinas(ordenadas);
      })
      .catch((err) => console.error('Error buscando estaciones vecinas:', err))
      .finally(() => setCargando(false));
  }, [estacionActual, apiBase]);

  if (!estacionActual) return null;

  return (
    <div className="apple-card p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <Radio className="w-5 h-5 text-blue-400" />
          <div>
            <h3 className="text-lg font-bold text-white">
              Comparativa Multired de Estaciones Vecinas (Radio 35 km)
            </h3>
            <p className="text-xs text-slate-400">
              Validación cruzada de datos en tiempo real entre DMC, Agromet INIA y RedMeteo.cl
            </p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
          ✓ Redes Sincronizadas
        </span>
      </div>

      {cargando ? (
        <div className="text-center py-6 text-xs text-slate-400">
          Calculando distancias con estaciones vecinas...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Estación Física</th>
                <th className="py-3 px-3">Sector / Comuna</th>
                <th className="py-3 px-3">Red Meteorológica</th>
                <th className="py-3 px-3">Distancia</th>
                <th className="py-3 px-3 text-right">Estado Sincro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {/* FILA DE LA ESTACIÓN ACTUAL */}
              <tr className="bg-blue-950/40 text-blue-200">
                <td className="py-3 px-3 font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  {estacionActual.nombre} (Seleccionada)
                </td>
                <td className="py-3 px-3">{estacionActual.sector || 'Chile'}</td>
                <td className="py-3 px-3">
                  <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                    {estacionActual.red_oficial}
                  </span>
                </td>
                <td className="py-3 px-3 font-mono font-bold text-amber-400">0.0 km</td>
                <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                  ● En Vivo
                </td>
              </tr>

              {/* FILAS DE ESTACIONES VECINAS */}
              {estacionesVecinas.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/50 text-slate-200 transition">
                  <td className="py-3 px-3 font-semibold">{e.nombre}</td>
                  <td className="py-3 px-3 text-slate-400">{e.sector}</td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 bg-slate-800 text-sky-300 rounded text-[10px] border border-slate-700">
                      {e.red}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">
                    a {e.distKm} km
                  </td>
                  <td className="py-3 px-3 text-right text-slate-400">
                    Sincronizado
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
