/**
 * ============================================
 * Reports Controller
 * ============================================
 * Controlador principal para el manejo de reportes de ultrasonido.
 * Orquesta los servicios de Storage, Document AI y Firestore.
 */

const storageService = require('../services/storage.service');
const documentAIService = require('../services/documentai.service');
const firestoreService = require('../services/firestore.service');
const imageExtractor = require('../utils/imageExtractor');
const { validateUploadedFile, isValidUUID, validatePaginationParams, validateSearchParams } = require('../utils/validators');

/**
 * POST /upload
 * Procesa un nuevo reporte de ultrasonido
 * 
 * Flujo:
 * 1. Validar archivo PDF
 * 2. Subir PDF a Cloud Storage
 * 3. Extraer imágenes del PDF
 * 4. Subir imágenes a Cloud Storage
 * 5. Procesar con Document AI
 * 6. Guardar resultado en Firestore
 */
async function uploadReport(req, res) {
    const startTime = Date.now();

    try {
        console.log('\n========================================');
        console.log('📤 Nueva solicitud de upload recibida');
        console.log('========================================');

        // 1. Validar archivo
        const validation = validateUploadedFile(req.file);
        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                error: validation.error,
            });
        }

        const fileBuffer = req.file.buffer;
        const fileName = req.file.originalname;

        console.log(`📄 Archivo: ${fileName} (${imageExtractor.formatBytes(fileBuffer.length)})`);

        // 2. Subir PDF original a Cloud Storage
        console.log('\n🚀 Paso 1: Subiendo PDF a Cloud Storage...');
        const pdfUpload = await storageService.uploadPDF(fileBuffer, fileName);
        console.log(`  ✓ PDF subido: ${pdfUpload.path}`);

        // 3. Extraer imágenes del PDF
        console.log('\n🖼️ Paso 2: Extrayendo imágenes del PDF...');
        const extractedImages = await imageExtractor.extractImagesFromPDF(fileBuffer);

        // 4. Subir imágenes extraídas
        const uploadedImages = [];
        // Generamos un ID temporal para las imágenes (se actualizará después)
        const tempReportId = Date.now().toString();

        for (const image of extractedImages) {
            try {
                const imageUpload = await storageService.uploadImage(
                    image.data,
                    tempReportId,
                    image.index,
                    image.format
                );

                uploadedImages.push({
                    url: imageUpload.url,
                    path: imageUpload.path,
                    width: image.width,
                    height: image.height,
                    format: image.format,
                    size: image.size,
                });
            } catch (imgError) {
                console.warn(`  ⚠️ Error subiendo imagen ${image.index}: ${imgError.message}`);
            }
        }
        console.log(`  ✓ ${uploadedImages.length} imágenes subidas a Cloud Storage`);

        // 5. Procesar con Document AI
        console.log('\n🤖 Paso 3: Procesando con Document AI...');
        const extractedData = await documentAIService.extractUltrasoundReport(fileBuffer);

        // 6. Preparar y guardar en Firestore
        console.log('\n💾 Paso 4: Guardando en Firestore...');
        const reportData = {
            // Datos extraídos por Document AI
            ...extractedData,

            // Referencias a archivos
            files: {
                originalPdf: {
                    url: pdfUpload.url,
                    path: pdfUpload.path,
                    fileName: fileName,
                    size: fileBuffer.length,
                },
            },

            // Imágenes extraídas
            images: uploadedImages,

            // Metadata adicional
            processingTime: Date.now() - startTime,
        };

        const savedReport = await firestoreService.createReport(reportData);

        // Calcular tiempo total de procesamiento
        const processingTime = Date.now() - startTime;
        console.log(`\n✅ Procesamiento completado en ${processingTime}ms`);
        console.log('========================================\n');

        // Respuesta exitosa
        res.status(201).json({
            success: true,
            message: 'Reporte procesado exitosamente',
            data: {
                id: savedReport.id,
                patient: savedReport.patient,
                owner: savedReport.owner,
                veterinarian: savedReport.veterinarian,
                clinical: savedReport.clinical,
                files: savedReport.files,
                imagesCount: savedReport.images?.length || 0,
                processingTime: `${processingTime}ms`,
                createdAt: savedReport.createdAt,
            },
        });

    } catch (error) {
        console.error('\n❌ Error procesando reporte:', error);
        console.error('Stack:', error.stack);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Contacte al administrador',
        });
    }
}

/**
 * GET /reports/:id
 * Obtiene un reporte por su ID
 */
async function getReportById(req, res) {
    try {
        const { id } = req.params;

        // Validar ID
        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'ID de reporte inválido',
            });
        }

        // Buscar reporte
        const report = await firestoreService.getReportById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Reporte no encontrado',
            });
        }

        // Verificar que no esté eliminado
        if (report.status === 'deleted') {
            return res.status(410).json({
                success: false,
                error: 'Este reporte ha sido eliminado',
            });
        }

        res.json({
            success: true,
            data: report,
        });

    } catch (error) {
        console.error('Error obteniendo reporte:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        });
    }
}

/**
 * GET /reports
 * Lista reportes con paginación y filtros
 */
async function listReports(req, res) {
    try {
        // Validar y normalizar parámetros
        const pagination = validatePaginationParams(req.query);
        const search = validateSearchParams(req.query);

        const options = {
            ...pagination,
            ...search,
        };

        const result = await firestoreService.listReports(options);

        res.json({
            success: true,
            data: result.reports,
            pagination: {
                count: result.count,
                hasMore: result.hasMore,
                lastId: result.lastId,
            },
        });

    } catch (error) {
        console.error('Error listando reportes:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        });
    }
}

/**
 * DELETE /reports/:id
 * Elimina un reporte (soft delete)
 */
async function deleteReport(req, res) {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({
                success: false,
                error: 'ID de reporte inválido',
            });
        }

        // Verificar que existe
        const report = await firestoreService.getReportById(id);

        if (!report) {
            return res.status(404).json({
                success: false,
                error: 'Reporte no encontrado',
            });
        }

        // Soft delete
        await firestoreService.deleteReport(id);

        res.json({
            success: true,
            message: 'Reporte eliminado exitosamente',
        });

    } catch (error) {
        console.error('Error eliminando reporte:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        });
    }
}

/**
 * GET /reports/stats
 * Obtiene estadísticas de los reportes
 */
async function getStatistics(req, res) {
    try {
        const stats = await firestoreService.getStatistics();

        res.json({
            success: true,
            data: stats,
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);

        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
        });
    }
}

module.exports = {
    uploadReport,
    getReportById,
    listReports,
    deleteReport,
    getStatistics,
};
