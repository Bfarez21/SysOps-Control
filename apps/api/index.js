require('dotenv').config();

const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const Docker = require('dockerode');

const app = express();
const PORT = process.env.PORT || 3001;

// Conexión dinámica a Docker: detecta Windows local o Socket Unix en Linux/Ubuntu
const socketPath = process.env.DOCKER_SOCKET_PATH || '//./pipe/docker_engine';
const docker = new Docker({ socketPath });

app.use(cors());
app.use(express.json());

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
    timestamp: new Date().toISOString()
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

    const formattedContainers = containers.map(container => ({
      id: container.Id.substring(0, 12),
      name: container.Names[0].replace('/', ''),
      image: container.Image,
      state: container.State,
      status: container.Status
    }));

    res.json(formattedContainers);
  } catch (error) {
    console.warn(' Docker Engine no está respondiendo:', error.message);
    res.json([]);
  }
});

// Endpoint blindado para ejecutar acciones en contenedores
app.post('/api/containers/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;

  try {
    const container = docker.getContainer(id);

    if (action === 'restart') {
      await container.restart();
      return res.json({ message: `Contenedor ${id} reiniciado con éxito` });
    }

    if (action === 'stop') {
      try {
        await container.stop();
      } catch (err) {
        console.warn(`El contenedor ${id} ya estaba detenido o no respondió a tiempo.`);
      }
      return res.json({ message: `Contenedor ${id} detenido con éxito` });
    }

    res.status(400).json({ error: 'Acción no válida. Usa restart o stop' });
  } catch (error) {
    console.error(`Error al ejecutar ${action}:`, error.message);
    res.status(500).json({ error: `Error al ejecutar ${action}`, details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(` Servidor corriendo en http://localhost:${PORT}`);
});