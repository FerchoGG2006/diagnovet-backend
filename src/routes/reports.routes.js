/**
 * Reports Routes - Define las rutas de la API
 */

const express = require('express');
const multer = require('multer');
const reportsController = require('../controllers/reports.controller');

const router = express.Router();

// Configuración de Multer
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos PDF'), false);
        }
    },
});

// Middleware de errores de Multer
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
};

// RUTAS
router.post('/upload', upload.single('report'), handleMulterError, reportsController.uploadReport);
router.get('/reports', reportsController.listReports);
router.get('/reports/stats', reportsController.getStatistics);
router.get('/reports/:id', reportsController.getReportById);
router.delete('/reports/:id', reportsController.deleteReport);

module.exports = router;
