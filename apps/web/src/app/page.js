'use client';

import { useState, useEffect} from 'react';

export default function Home() {
  const[metrics, setMetrics] = useState(null);
  const[containers, setContainers] = useState([]);
  const[loading, setLoading] = useState(true);
  const[error, setError] = useState(null);

  //funcion para consultar api
  const fetchData = async () => {
    // Leemos métricas de forma independiente
    try {
      const resMetrics = await fetch('http://localhost:3001/api/metrics');
      if (resMetrics.ok) {
        const dataMetrics = await resMetrics.json();
        setMetrics(dataMetrics);
        setError(null);
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor Backend (puerto 3001).');
    }

    // Leemos contenedores de forma independiente
    try {
      const resContainers = await fetch('http://localhost:3001/api/containers');
      if (resContainers.ok) {
        const dataContainers = await resContainers.json();
        setContainers(dataContainers);
      }
    } catch (err) {
      console.warn('Docker no disponible');
    } finally {
      setLoading(false);
    }
  };

  // acciones botones contenedores
const handleAction = async (id, action) => {
  try {
    const res = await fetch(`http://localhost:3001/api/containers/${id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    
    if (res.ok) {
      fetchData(); // Recargamos la lista inmediatamente
    } else {
      alert(`Error al ejecutar la acción ${action}`);
    }
  } catch (err) {
    alert('Error al conectar con la API');
  }
};

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return ()=> clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-xl animate-pulse">Cargando telemetría de SysOps-Control...</p>
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

      {/* Tarjetas de Métricas */}
      {metrics && (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tarjeta CPU */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <h2 className="text-slate-400 text-sm font-semibold mb-2">USO DE CPU</h2>
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
            <h2 className="text-slate-400 text-sm font-semibold mb-2">MEMORIA RAM</h2>
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
              No se encontraron contenedores corriendo o Docker Desktop no está activo.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-slate-400 text-xs uppercase font-mono">
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Imagen</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Detalle</th>
                  <th className="p-4">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {containers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition">
                    <td className="p-4 font-semibold text-indigo-300">{c.name}</td>
                    <td className="p-4 font-mono text-xs text-slate-400">{c.image}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        c.state === 'running' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {c.state.toUpperCase()}
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
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}