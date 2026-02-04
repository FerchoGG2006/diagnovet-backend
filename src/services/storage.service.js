/**
 * ============================================
 * Cloud Storage Service
 * ============================================
 * Maneja todas las operaciones con Google Cloud Storage:
 * - Subida de PDFs originales
 * - Subida de imágenes extraídas
 * - Generación de URLs públicas
 */

const { storage, config } = require('../config/gcp.config');

const bucket = storage.bucket(config.bucketName);

/**
 * Sube un archivo PDF al bucket de Cloud Storage
 * @param {Buffer} fileBuffer - Contenido del archivo en buffer
 * @param {string} fileName - Nombre original del archivo
 * @returns {Promise<{url: string, path: string}>} URL pública y path del archivo
 */
async function uploadPDF(fileBuffer, fileName) {
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `reports/${timestamp}-${sanitizedName}`;

    const file = bucket.file(filePath);

    await file.save(fileBuffer, {
        metadata: {
            contentType: 'application/pdf',
            cacheControl: 'public, max-age=31536000',
        },
        resumable: false, // Para archivos pequeños, es más eficiente
    });

    // Hacer el archivo público (opcional, depende de tus requerimientos de seguridad)
    // await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${filePath}`;

    return {
        url: publicUrl,
        path: filePath,
    };
}

/**
 * Sube una imagen extraída del PDF al bucket
 * @param {Buffer} imageBuffer - Contenido de la imagen en buffer
 * @param {string} reportId - ID del reporte asociado
 * @param {number} imageIndex - Índice de la imagen en el PDF
 * @param {string} format - Formato de la imagen (png, jpg, etc.)
 * @returns {Promise<{url: string, path: string}>} URL y path de la imagen
 */
async function uploadImage(imageBuffer, reportId, imageIndex, format = 'png') {
    const filePath = `images/${reportId}/image-${imageIndex}.${format}`;

    const file = bucket.file(filePath);

    await file.save(imageBuffer, {
        metadata: {
            contentType: `image/${format}`,
            cacheControl: 'public, max-age=31536000',
        },
        resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/${config.bucketName}/${filePath}`;

    return {
        url: publicUrl,
        path: filePath,
    };
}

/**
 * Obtiene una URL firmada para acceso temporal a un archivo privado
 * @param {string} filePath - Path del archivo en el bucket
 * @param {number} expirationMinutes - Minutos de validez de la URL
 * @returns {Promise<string>} URL firmada
 */
async function getSignedUrl(filePath, expirationMinutes = 60) {
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationMinutes * 60 * 1000,
    });

    return signedUrl;
}

/**
 * Verifica si el bucket existe y está accesible
 * @returns {Promise<boolean>} Estado del bucket
 */
async function checkBucketHealth() {
    try {
        const [exists] = await bucket.exists();
        return exists;
    } catch (error) {
        console.error('Error verificando bucket:', error.message);
        return false;
    }
}

module.exports = {
    uploadPDF,
    uploadImage,
    getSignedUrl,
    checkBucketHealth,
};
