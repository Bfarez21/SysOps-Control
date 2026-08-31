// 1. importamos la libreria de express
const express = require('express');
// cors
const cors = require('cors');
// libreria para leer metrica del SO
const si = require('systeminformation');

// 2. creamos una instancia de express
const app = express();
// 3. defnicmos el port 
const PORT = process.env.PORT || 3001;

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
// 6. corremos el servidor

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

