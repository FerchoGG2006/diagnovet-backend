/**
 * ============================================
 * GCP Configuration Module
 * ============================================
 * Centraliza la configuración de todos los servicios de Google Cloud Platform.
 * Esto facilita la gestión de credenciales y el testing.
 */

const { Storage } = require('@google-cloud/storage');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai');
const { Firestore } = require('@google-cloud/firestore');
const path = require('path');

// Configuración de credenciales para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        path.join(__dirname, '../../pure-archive-486405-n4-eaf2d456bbda.json');
}

/**
 * Configuración centralizada del proyecto
 */
const config = {
    projectId: process.env.GCP_PROJECT_ID || 'the-delight-382903',
    location: process.env.GCP_LOCATION || 'us',
    processorId: process.env.GCP_PROCESSOR_ID || '',
    bucketName: process.env.GCS_BUCKET_NAME || 'diagnovet-reports',
};

/**
 * Cliente de Cloud Storage
 * Maneja la subida y descarga de archivos PDF e imágenes
 */
const storage = new Storage({
    projectId: config.projectId,
});

/**
 * Cliente de Document AI
 * Procesa los PDFs y extrae información estructurada
 */
const documentAIClient = new DocumentProcessorServiceClient();

/**
 * Cliente de Firestore
 * Base de datos NoSQL para almacenar los reportes procesados
 */
const firestore = new Firestore({
    projectId: config.projectId,
});

/**
 * Genera el nombre completo del procesador de Document AI
 * Formato: projects/{projectId}/locations/{location}/processors/{processorId}
 */
const getProcessorName = () => {
    return `projects/${config.projectId}/locations/${config.location}/processors/${config.processorId}`;
};

module.exports = {
    config,
    storage,
    documentAIClient,
    firestore,
    getProcessorName,
};
