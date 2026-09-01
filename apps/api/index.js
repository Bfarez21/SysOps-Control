// 1. importamos la libreria de express
const express = require('express');
// cors
const cors = require('cors');
// libreria para leer metrica del SO
const si = require('systeminformation');

// docker
const Docker = require('dockerode');

// 2. creamos una instancia de express
const app = express();
// 3. defnicmos el port 
const PORT = process.env.PORT || 3001;

//inicializamos docker
const docker = new Docker({socketPath: '//./pipe/docker_engine'});

app.use(cors()); // habilitamos cors 
//4. 0mitimos que el servidor entida json
app.use(express.json());

// 5. endpoitn de prueba
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        message: 'SysOps-Control API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});


// endpoint para obtener metricas del sistema
app.get('/api/metrics', async (req, res) =>{
    try {
        const [mem, currentLoad, time] = await Promise.all([
            si.mem(),
            si.currentLoad(),
            si.time()
        ]);

        res.json({
            cpu: {
                loadPercentage: currentLoad.currentLoad.toFixed(2), //% cpu
            },
            memory: {
                totalBytes: mem.total,
                usedBytes: mem.active,
                freeBytes: mem.free,
                usagePercentage: ((mem.active / mem.total) * 100).toFixed(2), // % memoria usada
            },
            uptime: time.uptime, // tiempo de actividad del sistema en segundos
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({error: 'Error al obtner datos del sistema'});
    }
});

app.get('/api/containers', async (req, res) => {
    try {
        //listamos todos los contenedores
        const containers = await docker.listContainers({all: true});
        
        const formattedContainers = containers.map(container => ({
            id: container.Id.substring(0, 12), // ID corto
            name: container.Names[0].replace('/', ''), // nombre del contenedor
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


// 6. corremos el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

