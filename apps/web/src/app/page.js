'use client';

import React, { useState, useEffect } from 'react';
// URL base administrada vía variable de entorno 
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Home() {
  const [metrics, setMetrics] = useState(null);
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para controlar los acordes desplegables e información individual
  const [expandedContainers, setExpandedContainers] = useState({});
  const [containerStats, setContainerStats] = useState({});

    //funcion para consultar api
  const fetchData = async () => {
    try {
      const resMetrics = await fetch(`${API_URL}/api/metrics`);
      if (resMetrics.ok) {
        setMetrics(await resMetrics.json());
        setError(null);
      }
    } catch (err) {
      setError(`No se pudo conectar con el servidor Backend en ${API_URL}`);
    }

      // Leemos contenedores de forma independiente
    try {
      const resContainers = await fetch(`${API_URL}/api/containers`);
      if (resContainers.ok) setContainers(await resContainers.json());
    } catch (err) {
      console.warn('Docker no disponible');
    } finally {
      setLoading(false);
    }
  };

  // Alternar el desplegable y consultar stats individuales
  const toggleExpand = async (id) => {
    const isExpanded = !!expandedContainers[id];
    setExpandedContainers(prev => ({ ...prev, [id]: !isExpanded }));

    // Cargar estadísticas si se abre por primera vez o refrescar
    if (!isExpanded) {
      try {
        const res = await fetch(`${API_URL}/api/containers/${id}/stats`);
        if (res.ok) {
          const stats = await res.json();
          setContainerStats(prev => ({ ...prev, [id]: stats }));
        }
      } catch (err) {
        console.error(`Error leyendo métricas del contenedor ${id}`);
      }
    }
  };

    // acciones botones contenedores
  const handleAction = async (id, action) => {
    try {
      const res = await fetch(`${API_URL}/api/containers/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) fetchData();  // Recargamos la lista inmediatamente
    } catch (err) {
      alert('Error al ejecutar acción en la API');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl animate-pulse font-mono">Cargando telemetría de SysOps-Control...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* Encabezado */}
      <header className="max-w-6xl mx-auto mb-8 flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-bold text-indigo-400">SysOps-Control</h1>
          <p className="text-slate-400 text-sm">Application Health & Automation Hub</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-xs text-emerald-400 font-mono">LIVE TELEMETRY</span>
        </div>
      </header>

      {/* Alerta de Error */}
      {error && (
        <div className="max-w-6xl mx-auto mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
          {error}. Asegúrate de que el backend está encendido en el puerto 3001.
        </div>
      )}

      {/* Tarjetas de Métricas del Servidor Host */}
      {metrics && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Tarjeta CPU */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-slate-400 text-sm font-semibold mb-2">USO DE CPU (HOST)</h2>
            <div className="text-4xl font-extrabold text-indigo-400 mb-4">
              {metrics.cpu.loadPercentage}%
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div
                className="bg-indigo-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(metrics.cpu.loadPercentage, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Tarjeta RAM */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-slate-400 text-sm font-semibold mb-2">MEMORIA RAM (HOST)</h2>
            <div className="text-4xl font-extrabold text-emerald-400 mb-4">
              {metrics.memory.usagePercentage}%
            </div>
            <div className="w-full bg-slate-800 rounded-full h-2.5">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${metrics.memory.usagePercentage}%` }}
              ></div>
            </div>
            <p className="text-xs text-slate-500 mt-3 font-mono">
              {(metrics.memory.usedBytes / 1024 / 1024 / 1024).toFixed(2)} GB usados
            </p>
          </div>

          {/* Tarjeta Uptime */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-slate-400 text-sm font-semibold mb-2">TIEMPO ENCENDIDO (UPTIME)</h2>
            <div className="text-3xl font-extrabold text-amber-400 mb-2">
              {(metrics.uptime / 3600).toFixed(1)} horas
            </div>
            <p className="text-xs text-slate-400 mt-4">
              Última actualización: <br />
              <span className="font-mono text-slate-500">
                {new Date(metrics.timestamp).toLocaleTimeString()}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Sección de Contenedores Docker */}
      <section className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-200">Servicios y Contenedores Monitoreados</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          {containers.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No se encontraron contenedores corriendo o Docker no está activo.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase font-mono">
                  <th className="p-4 w-10 text-center"></th>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Imagen</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {containers.map(c => (
                  <React.Fragment key={c.id}>
                    {/* Fila Principal */}
                    <tr className="hover:bg-slate-800/50 transition">
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleExpand(c.id)}
                          className="text-slate-400 hover:text-indigo-400 transition font-bold text-xs p-1 focus:outline-none"
                          title="Ver métricas detalladas"
                        >
                          {expandedContainers[c.id] ? '▼' : '▶'}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-indigo-300">{c.name}</td>
                      <td className="p-4 font-mono text-xs text-slate-400">{c.image}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          c.state === 'running' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {(c.state || '').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-400 font-mono">{c.status}</td>
                      <td className="p-4 flex gap-2">
                        <button
                          onClick={() => handleAction(c.id, 'restart')}
                          className="px-2.5 py-1 text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded hover:bg-indigo-600/40 transition"
                        >
                          Reiniciar
                        </button>
                        <button
                          onClick={() => handleAction(c.id, 'stop')}
                          className="px-2.5 py-1 text-xs font-semibold bg-red-600/20 text-red-300 border border-red-500/30 rounded hover:bg-red-600/40 transition"
                        >
                          Detener
                        </button>
                      </td>
                    </tr>

                    {/* Fila Desplegable con Métricas del Contenedor */}
                    {expandedContainers[c.id] && (
                      <tr className="bg-slate-950/70 border-b border-slate-800">
                        <td colSpan="6" className="p-6">
                          {containerStats[c.id] ? (
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-400 block font-mono">CPU (Contenedor)</span>
                                <span className="text-xl font-bold text-indigo-400 mt-1 block">
                                  {containerStats[c.id].cpuPercent}%
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-400 block font-mono">RAM (Contenedor)</span>
                                <span className="text-xl font-bold text-emerald-400 mt-1 block">
                                  {containerStats[c.id].memory.usagePercentage}%
                                </span>
                                <span className="text-xs text-slate-500 block mt-1 font-mono">
                                  {(containerStats[c.id].memory.usedBytes / 1024 / 1024).toFixed(1)} MB usados
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-400 block font-mono">Tráfico Red (RX / TX)</span>
                                <span className="text-sm font-bold text-sky-400 font-mono block mt-2">
                                  ↓ {containerStats[c.id].network.rxMb} MB | ↑ {containerStats[c.id].network.txMb} MB
                                </span>
                              </div>

                              <div className="bg-slate-900/90 p-4 rounded-lg border border-slate-800">
                                <span className="text-xs text-slate-400 block font-mono">Hilos / PIDs</span>
                                <span className="text-xl font-bold text-amber-400 mt-1 block">
                                  {containerStats[c.id].pids} procesos
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono py-2">
                              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
                              Obteniendo estadísticas del socket de Docker...
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}