'use client';

import { useState, useEffect} from 'react';

export default function Home() {
  const[metrics, setMetrics] = useState(null);
  const[loading, setLoading] = useState(true);
  const[error, setError] = useState(null);

  //funcion para consultar api
  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/metrics');
      if(!response.ok){
        throw new Error('Error al obtener metricas del sistema');
      }
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 3000);
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
    </main>
  );
}