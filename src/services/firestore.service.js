/**
 * ============================================
 * Firestore Service
 * ============================================
 * Maneja todas las operaciones de base de datos con Firestore.
 * Almacena y recupera reportes de ultrasonido procesados.
 */

const { firestore } = require('../config/gcp.config');
const { v4: uuidv4 } = require('uuid');

// Nombre de la colección principal
const COLLECTION_NAME = 'ultrasound_reports';

/**
 * Crea un nuevo reporte en Firestore
 * @param {Object} reportData - Datos del reporte procesado
 * @returns {Promise<Object>} Reporte guardado con ID
 */
async function createReport(reportData) {
    const reportId = uuidv4();
    const docRef = firestore.collection(COLLECTION_NAME).doc(reportId);

    const document = {
        id: reportId,
        ...reportData,
        status: 'processed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await docRef.set(document);

    console.log(`💾 Reporte guardado en Firestore: ${reportId}`);

    return document;
}

/**
 * Obtiene un reporte por su ID
 * @param {string} reportId - ID del reporte
 * @returns {Promise<Object|null>} Reporte encontrado o null
 */
async function getReportById(reportId) {
    const docRef = firestore.collection(COLLECTION_NAME).doc(reportId);
    const doc = await docRef.get();

    if (!doc.exists) {
        return null;
    }

    return doc.data();
}

/**
 * Actualiza un reporte existente
 * @param {string} reportId - ID del reporte
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Reporte actualizado
 */
async function updateReport(reportId, updates) {
    const docRef = firestore.collection(COLLECTION_NAME).doc(reportId);

    const updateData = {
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    await docRef.update(updateData);

    return getReportById(reportId);
}

/**
 * Lista reportes con paginación y filtros
 * @param {Object} options - Opciones de consulta
 * @param {number} options.limit - Máximo de resultados (default: 20)
 * @param {string} options.startAfter - ID del último documento para paginación
 * @param {string} options.patientName - Filtro por nombre de paciente
 * @param {string} options.ownerName - Filtro por nombre del dueño
 * @param {string} options.dateFrom - Fecha inicial para filtrar
 * @param {string} options.dateTo - Fecha final para filtrar
 * @returns {Promise<Object>} Lista de reportes con metadata de paginación
 */
async function listReports(options = {}) {
    const {
        limit = 20,
        startAfter,
        patientName,
        ownerName,
        dateFrom,
        dateTo,
    } = options;

    let query = firestore.collection(COLLECTION_NAME)
        .orderBy('createdAt', 'desc')
        .limit(limit);

    // Aplicar paginación
    if (startAfter) {
        const startDoc = await firestore.collection(COLLECTION_NAME).doc(startAfter).get();
        if (startDoc.exists) {
            query = query.startAfter(startDoc);
        }
    }

    const snapshot = await query.get();

    let reports = snapshot.docs.map(doc => doc.data());

    // Filtros en memoria (Firestore tiene limitaciones con múltiples WHERE)
    if (patientName) {
        reports = reports.filter(r =>
            r.patient?.name?.toLowerCase().includes(patientName.toLowerCase())
        );
    }

    if (ownerName) {
        reports = reports.filter(r =>
            r.owner?.name?.toLowerCase().includes(ownerName.toLowerCase())
        );
    }

    if (dateFrom) {
        reports = reports.filter(r => r.createdAt >= dateFrom);
    }

    if (dateTo) {
        reports = reports.filter(r => r.createdAt <= dateTo);
    }

    return {
        reports,
        count: reports.length,
        hasMore: snapshot.docs.length === limit,
        lastId: reports.length > 0 ? reports[reports.length - 1].id : null,
    };
}

/**
 * Elimina un reporte (soft delete)
 * @param {string} reportId - ID del reporte
 * @returns {Promise<boolean>} Éxito de la operación
 */
async function deleteReport(reportId) {
    const docRef = firestore.collection(COLLECTION_NAME).doc(reportId);

    await docRef.update({
        status: 'deleted',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    return true;
}

/**
 * Obtiene estadísticas de los reportes
 * @returns {Promise<Object>} Estadísticas generales
 */
async function getStatistics() {
    const snapshot = await firestore.collection(COLLECTION_NAME)
        .where('status', '==', 'processed')
        .get();

    const reports = snapshot.docs.map(doc => doc.data());

    // Calcular estadísticas
    const stats = {
        totalReports: reports.length,
        speciesDistribution: {},
        reportsPerDay: {},
        averageImagesPerReport: 0,
    };

    let totalImages = 0;

    reports.forEach(report => {
        // Distribución por especie
        const species = report.patient?.species || 'Desconocido';
        stats.speciesDistribution[species] = (stats.speciesDistribution[species] || 0) + 1;

        // Reportes por día
        const day = report.createdAt?.split('T')[0] || 'unknown';
        stats.reportsPerDay[day] = (stats.reportsPerDay[day] || 0) + 1;

        // Contar imágenes
        totalImages += report.images?.length || 0;
    });

    stats.averageImagesPerReport = reports.length > 0
        ? Math.round(totalImages / reports.length * 10) / 10
        : 0;

    return stats;
}

/**
 * Verifica la conexión con Firestore
 * @returns {Promise<boolean>} Estado de la conexión
 */
async function checkHealth() {
    try {
        await firestore.collection(COLLECTION_NAME).limit(1).get();
        return true;
    } catch (error) {
        console.error('Error verificando Firestore:', error.message);
        return false;
    }
}

module.exports = {
    createReport,
    getReportById,
    updateReport,
    listReports,
    deleteReport,
    getStatistics,
    checkHealth,
    COLLECTION_NAME,
};
