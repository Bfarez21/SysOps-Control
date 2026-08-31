// 1. importamos la libreria de express
const express = require('express');
// 2. creamos una instancia de express
const app = express();
// 3. defnicmos el port 
const PORT = process.env.PORT || 3001;

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

// 6. corremos el servidor

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

