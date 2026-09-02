require('dotenv').config();

const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const Docker = require('dockerode');
const { getContainerStates, setIntentionalStop } = require('./db');
const app = express();
const PORT = process.env.PORT || 3001;

// Conexión dinámica a Docker: detecta Windows local o Socket Unix en Linux/Ubuntu
const socketPath = process.env.DOCKER_SOCKET_PATH || '//./pipe/docker_engine';
const docker = new Docker({ socketPath });

app.use(cors());
app.use(express.json());

// Función helper para forzar el timestamp local
const getLocalTimestamp = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  return date.toLocaleString('es-EC', {
    timeZone: 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// --- ESTADO PREVIO PARA DETECTAR CAÍDAS ---
let previousContainerStates = {};

// --- VIGILANTE (WATCHDOG) DE CONTENEDORES ---
const monitorContainers = async () => {
  try {
    const containers = await docker.listContainers({ all: true });

    containers.forEach(container => {
      const name = container.Names[0].replace('/', '');
      const currentState = container.State;
      const previousState = previousContainerStates[name];

      // Detectamos si el contenedor ESTABA corriendo y AHORA se detuvo
      if (previousState === 'running' && currentState !== 'running') {
        console.log(` ALERTA: El contenedor [${name}] se ha DETENIDO!`);
        triggerAlert(name, currentState);
      }

      // Guardamos el estado actual para la siguiente comparación
      previousContainerStates[name] = currentState;
    });
  } catch (error) {
    // Si Docker está apagado se omite la revisión
  }
};

// Función para enviar la alerta mediante un Webhook a n8n
const triggerAlert = async (containerName, state) => {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn(' No hay N8N_WEBHOOK_URL configurada en el .env');
    return;
  }

  const payload = {
    event: 'CONTAINER_DOWN',
    service: containerName,
    status: state,
    timestamp: getLocalTimestamp()
  };

  console.log(' Enviando Webhook de Alerta a n8n:', payload);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(' Alerta entregada a n8n con éxito');
    } else {
      console.warn(` n8n respondió con estado: ${response.status}`);
    }
  } catch (err) {
    console.error(' Error enviando webhook a n8n:', err.message);
  }
};

// Ejecutamos la vigilancia cada 5 segundos
setInterval(monitorContainers, 5000);

// --- ENDPOINTS DE LA API ---

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    message: 'SysOps-Control API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/metrics', async (req, res) => {
  try {
    const [mem, currentLoad, time] = await Promise.all([
      si.mem(),
      si.currentLoad(),
      si.time()
    ]);

    res.json({
      cpu: {
        loadPercentage: currentLoad.currentLoad.toFixed(2),
      },
      memory: {
        totalBytes: mem.total,
        usedBytes: mem.active,
        freeBytes: mem.free,
        usagePercentage: ((mem.active / mem.total) * 100).toFixed(2),
      },
      uptime: time.uptime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener métricas del sistema' });
  }
});

app.get('/api/containers', async (req, res) => {
  try {
    const containers = await docker.listContainers({ all: true });
    const statesMap = await getContainerStates();

    const result = containers.map(container => ({
      id: container.Id,
      name: container.Names[0].replace('/', ''),
      image: container.Image,
      state: container.State,
      status: container.Status,
      intentionalStop: statesMap[container.Id] || false
    }));

    res.json(result);
  } catch (error) {
    console.warn(' Error al obtener contenedores:', error);
    res.status(500).json({ error: 'Docker Engine no está respondiendo' });
  }
});

// Endpoint blindado para ejecutar acciones en contenedores
app.post('/api/containers/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  // Validar la acción de entrada de inmediato
  if (!['stop', 'start', 'restart'].includes(action)) {
    return res.status(400).json({ error: 'Acción no válida. Usa start, restart o stop.' });
  }

  try {
    const container = docker.getContainer(id);
    const inspectData = await container.inspect();
    const containerName = inspectData.Name.replace('/', '');

    if (action === 'stop') {
      try {
        await container.stop();
      } catch (err) {
        console.warn(`El contenedor ${containerName} (${id}) ya estaba detenido o no respondió a tiempo.`);
      }
      // Marcar como parada manual intencional
      await setIntentionalStop(id, containerName, true);
    } else if (action === 'restart' || action === 'start') {
      if (action === 'restart') await container.restart();
      if (action === 'start') await container.start();
      // Limpiar la bandera al encender/reiniciar manualmente
      await setIntentionalStop(id, containerName, false);
    }

    return res.json({ message: `Acción '${action}' ejecutada con éxito en ${containerName}` });
  } catch (error) {
    console.error(`Error al ejecutar ${action} en ${id}:`, error.message);
    return res.status(500).json({ 
      error: `Error al ejecutar la acción ${action}`, 
      details: error.message 
    });
  }
});

// metricas por contenedor
app.get('/api/containers/:id/stats', async (req, res) =>{
  try {
    const container = docker.getContainer(req.params.id);
    const inspectData = await container.inspect();
    const statsData = await container.stats({stream: false});

    // calculo cpu %
    const cpuDelta = statsData.cpu_stats.cpu_usage.total_usage - statsData.precpu_stats.cpu_usage.total_usage;
    const systemDelta = statsData.cpu_stats.system_cpu_usage - statsData.precpu_stats.system_cpu_usage;
    const onlineCpus = statsData.cpu_stats.online_cpus || 1;
    const cpuPercent = systemDelta > 0 && cpuDelta > 0 ? ((cpuDelta / systemDelta) * onlineCpus * 100).toFixed(2) : '0.00';

    // Cálculo de Memoria
    const memUsed = statsData.memory_stats?.usage || 0;
    const memLimit = statsData.memory_stats?.limit || 1;
    const memPercent = ((memUsed / memLimit) * 100).toFixed(2);

    // Red (Network RX/TX)
    let rxBytes = 0, txBytes = 0;
    if (statsData.networks) {
      Object.values(statsData.networks).forEach(net => {
        rxBytes += net.rx_bytes || 0;
        txBytes += net.tx_bytes || 0;
      });
    }

    res.json({
      id: req.params.id,
      cpuPercent: parseFloat(cpuPercent),
      memory: {
        usedBytes: memUsed,
        limitBytes: memLimit,
        usagePercentage: parseFloat(memPercent)
      },
      network: {
        rxMb: (rxBytes / (1024 * 1024)).toFixed(2),
        txMb: (txBytes / (1024 * 1024)).toFixed(2)
      },
      startedAt: inspectData.State.StartedAt,
      pids: statsData.pids_stats.current || 0
    });
  } catch (err) {
    console.error(`Error al obtener stats del contenedor ${req.params.id}:`, err);
    res.status(500).json({ error: 'No se pudieron obtener las métricas del contenedor' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`API corriendo en el puerto ${PORT}`);
});