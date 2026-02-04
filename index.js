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
 * @author Fernando José Baquero Vergara
 * @version 1.0.0
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const reportsRoutes = require('./src/routes/reports.routes');
const { checkBucketHealth } = require('./src/services/storage.service');
const { checkHealth: checkFirestoreHealth } = require('./src/services/firestore.service');
const { setupSwagger } = require('./src/config/swagger.config');
const { globalLimiter, healthLimiter } = require('./src/middleware/rateLimiter');
const { logger, logRequest, logResponse, logError } = require('./src/utils/logger');

const app = express();
const PORT = process.env.PORT || 8080;

// ================================
// MIDDLEWARES DE SEGURIDAD
// ================================

// Rate Limiting global
app.use(globalLimiter);

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

// Logger estructurado de requests
app.use((req, res, next) => {
    const startTime = Date.now();
    logRequest(req);

    // Capturar respuesta
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        logResponse(req, res.statusCode, duration);
    });

    next();
});

// ================================
// SWAGGER DOCUMENTATION
// ================================

setupSwagger(app);
logger.info('📚 Swagger UI disponible en /api-docs');

// ================================
// RUTAS
// ================================

// Health check endpoint (requerido para Cloud Run)
app.get('/health', healthLimiter, async (req, res) => {
    try {
        const storageOk = await checkBucketHealth();
        const firestoreOk = await checkFirestoreHealth();
        const allHealthy = storageOk && firestoreOk;

        res.status(allHealthy ? 200 : 503).json({
            status: allHealthy ? 'healthy' : 'degraded',
            services: {
                storage: storageOk ? 'ok' : 'error',
                firestore: firestoreOk ? 'ok' : 'error',
            },
            uptime: process.uptime(),
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        logError(error, req);
        res.status(503).json({
            status: 'unhealthy',
            error: error.message,
        });
    }
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
            'GET /api-docs': '📚 Documentación interactiva (Swagger)',
        },
        documentation: 'https://github.com/FerchoGG2006/diagnovet-backend',
        swagger: '/api-docs',
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
        suggestion: 'Visita /api-docs para ver los endpoints disponibles',
    });
});

// Error handler global
app.use((err, req, res, next) => {
    logError(err, req);

    res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Error interno del servidor',
        code: err.code || 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ================================
// INICIO DEL SERVIDOR
// ================================

app.listen(PORT, () => {
    logger.info('');
    logger.info('╔════════════════════════════════════════════════╗');
    logger.info('║        🐾 DiagnoVET Backend API 🐾             ║');
    logger.info('╠════════════════════════════════════════════════╣');
    logger.info(`║  🚀 Puerto: ${PORT}                                 ║`);
    logger.info(`║  🌎 Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(30)}║`);
    logger.info('║                                                ║');
    logger.info('║  📍 Endpoints:                                 ║');
    logger.info('║     POST   /upload      - Subir PDF            ║');
    logger.info('║     GET    /reports     - Listar reportes      ║');
    logger.info('║     GET    /reports/:id - Obtener reporte      ║');
    logger.info('║     DELETE /reports/:id - Eliminar reporte     ║');
    logger.info('║     GET    /health      - Estado del servicio  ║');
    logger.info('║     GET    /api-docs    - 📚 Documentación     ║');
    logger.info('╚════════════════════════════════════════════════╝');
    logger.info('');
});

module.exports = app;
