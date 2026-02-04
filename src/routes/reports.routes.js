/**
 * ============================================
 * Reports Routes with Swagger Documentation
 * ============================================
 * Rutas de la API con documentación OpenAPI.
 */

const express = require('express');
const multer = require('multer');
const reportsController = require('../controllers/reports.controller');
const { uploadLimiter, readLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Configurar Multer para archivos en memoria
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB máximo
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    },
});

/**
 * @swagger
 * /upload:
 *   post:
 *     summary: Subir y procesar un reporte de ultrasonido
 *     description: |
 *       Recibe un archivo PDF, lo procesa con Google Document AI,
 *       extrae información estructurada y la almacena en Firestore.
 *       También extrae imágenes incrustadas y las guarda en Cloud Storage.
 *     tags: [Reports]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - report
 *             properties:
 *               report:
 *                 type: string
 *                 format: binary
 *                 description: Archivo PDF del reporte de ultrasonido
 *     responses:
 *       201:
 *         description: Reporte procesado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Reporte procesado exitosamente
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 *       500:
 *         description: Error interno del servidor
 */
router.post('/upload', uploadLimiter, upload.single('report'), reportsController.uploadReport);

/**
 * @swagger
 * /reports:
 *   get:
 *     summary: Obtener lista de reportes
 *     description: Retorna una lista paginada de todos los reportes procesados.
 *     tags: [Reports]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Cantidad de resultados por página
 *       - in: query
 *         name: species
 *         schema:
 *           type: string
 *         description: Filtrar por especie del paciente
 *     responses:
 *       200:
 *         description: Lista de reportes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Report'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 */
router.get('/reports', readLimiter, reportsController.listReports);

/**
 * @swagger
 * /reports/stats:
 *   get:
 *     summary: Obtener estadísticas de reportes
 *     description: Retorna estadísticas agregadas de los reportes procesados.
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Estadísticas de reportes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalReports:
 *                       type: integer
 *                     totalImages:
 *                       type: integer
 *                     speciesBreakdown:
 *                       type: object
 *                     reportsThisMonth:
 *                       type: integer
 */
router.get('/reports/stats', readLimiter, reportsController.getStatistics);

/**
 * @swagger
 * /reports/{id}:
 *   get:
 *     summary: Obtener un reporte por ID
 *     description: Retorna los detalles completos de un reporte específico.
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del reporte
 *     responses:
 *       200:
 *         description: Detalles del reporte
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Report'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/reports/:id', readLimiter, reportsController.getReportById);

/**
 * @swagger
 * /reports/{id}:
 *   delete:
 *     summary: Eliminar un reporte
 *     description: Elimina un reporte y sus archivos asociados (soft delete).
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID único del reporte
 *     responses:
 *       200:
 *         description: Reporte eliminado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/reports/:id', reportsController.deleteReport);

// Manejo de errores de Multer
router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                error: 'El archivo excede el tamaño máximo permitido (20MB)',
                code: 'FILE_TOO_LARGE',
            });
        }
    }

    if (error.message === 'Solo se permiten archivos PDF') {
        return res.status(400).json({
            success: false,
            error: error.message,
            code: 'INVALID_FILE_TYPE',
        });
    }

    next(error);
});

module.exports = router;
