/**
 * ============================================
 * DiagnoVET Backend - API Principal
 * ============================================
 * API para procesar reportes de ultrasonido veterinario
 * usando servicios de Google Cloud Platform
 * 
 * Tecnologías: Node.js, Express, Cloud Run, Cloud Storage,
 *              Document AI, Firestore
 * 
 * @author DiagnoVET Team
 * @version 1.0.0
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const reportsRoutes = require('./src/routes/reports.routes');
const { checkBucketHealth } = require('./src/services/storage.service');
const { checkHealth: checkFirestoreHealth } = require('./src/services/firestore.service');

const app = express();
const PORT = process.env.PORT || 8080;

// ================================
// MIDDLEWARES DE SEGURIDAD
// ================================

// Helmet: Protección de cabeceras HTTP
app.use(helmet({
    contentSecurityPolicy: false, // Desactivar para APIs
}));

// CORS: Permitir peticiones cross-origin
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Parser JSON para requests
app.use(express.json({ limit: '1mb' }));

// Logger de requests (solo en desarrollo)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} | ${req.method} ${req.path}`);
        next();
    });
}

// ================================
// RUTAS
// ================================

// Health check endpoint (requerido para Cloud Run)
app.get('/health', async (req, res) => {
    const storageOk = await checkBucketHealth();
    const firestoreOk = await checkFirestoreHealth();

    const allHealthy = storageOk && firestoreOk;

    res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'degraded',
        services: {
            storage: storageOk ? 'ok' : 'error',
            firestore: firestoreOk ? 'ok' : 'error',
        },
        timestamp: new Date().toISOString(),
    });
});

// Ruta raíz - Información de la API
app.get('/', (req, res) => {
    res.json({
        name: 'DiagnoVET API',
        version: '1.0.0',
        description: 'API para procesar reportes de ultrasonido veterinario',
        endpoints: {
            'POST /upload': 'Sube y procesa un reporte PDF',
            'GET /reports': 'Lista todos los reportes',
            'GET /reports/:id': 'Obtiene un reporte por ID',
            'GET /reports/stats': 'Estadísticas de reportes',
            'DELETE /reports/:id': 'Elimina un reporte',
            'GET /health': 'Estado de los servicios',
        },
        documentation: 'https://github.com/tu-usuario/diagnovet-backend',
    });
});

// Rutas de reportes
app.use('/', reportsRoutes);

// ================================
// MANEJO DE ERRORES
// ================================

// 404 - Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.path,
    });
});

// Error handler global
app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);

    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

// ================================
// INICIO DEL SERVIDOR
// ================================

app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║     🐾 DiagnoVET Backend API 🐾        ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Servidor corriendo en puerto ${PORT}      ║`);
    console.log(`║  Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(23)}║`);
    console.log('║                                        ║');
    console.log('║  Endpoints disponibles:                ║');
    console.log('║  • POST   /upload                      ║');
    console.log('║  • GET    /reports                     ║');
    console.log('║  • GET    /reports/:id                 ║');
    console.log('║  • GET    /reports/stats               ║');
    console.log('║  • DELETE /reports/:id                 ║');
    console.log('║  • GET    /health                      ║');
    console.log('╚════════════════════════════════════════╝\n');
});

module.exports = app;
