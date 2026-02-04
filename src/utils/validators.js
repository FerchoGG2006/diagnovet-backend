/**
 * ============================================
 * Validators Utility
 * ============================================
 * Funciones de validación para la API.
 * Asegura que los datos de entrada cumplan con los requisitos.
 */

/**
 * Tamaño máximo de archivo PDF (10 MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Tipos MIME permitidos para upload
 */
const ALLOWED_MIME_TYPES = [
    'application/pdf',
];

/**
 * Valida un archivo subido
 * @param {Object} file - Objeto de archivo de multer
 * @returns {{valid: boolean, error: string|null}} Resultado de validación
 */
function validateUploadedFile(file) {
    if (!file) {
        return {
            valid: false,
            error: 'No se proporcionó ningún archivo',
        };
    }

    // Validar tipo MIME
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return {
            valid: false,
            error: `Tipo de archivo no permitido: ${file.mimetype}. Solo se aceptan archivos PDF.`,
        };
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `El archivo excede el tamaño máximo permitido (${MAX_FILE_SIZE / 1024 / 1024} MB)`,
        };
    }

    // Validar que tenga buffer
    if (!file.buffer || file.buffer.length === 0) {
        return {
            valid: false,
            error: 'El archivo está vacío o corrupto',
        };
    }

    // Validar magic bytes del PDF (%PDF-)
    const pdfHeader = file.buffer.slice(0, 5).toString();
    if (pdfHeader !== '%PDF-') {
        return {
            valid: false,
            error: 'El archivo no es un PDF válido',
        };
    }

    return {
        valid: true,
        error: null,
    };
}

/**
 * Valida un UUID
 * @param {string} id - ID a validar
 * @returns {boolean} Es válido
 */
function isValidUUID(id) {
    if (!id || typeof id !== 'string') {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

/**
 * Sanitiza una cadena para prevenir inyección
 * @param {string} str - Cadena a sanitizar
 * @returns {string} Cadena sanitizada
 */
function sanitizeString(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    return str
        .trim()
        .replace(/[<>]/g, '') // Remover caracteres de HTML
        .replace(/\\/g, '')   // Remover backslashes
        .substring(0, 1000);  // Limitar longitud
}

/**
 * Valida parámetros de paginación
 * @param {Object} params - Parámetros de query
 * @returns {Object} Parámetros validados y normalizados
 */
function validatePaginationParams(params) {
    const { limit, startAfter, page } = params;

    return {
        limit: Math.min(Math.max(parseInt(limit) || 20, 1), 100), // Entre 1 y 100
        startAfter: startAfter && isValidUUID(startAfter) ? startAfter : null,
        page: Math.max(parseInt(page) || 1, 1),
    };
}

/**
 * Valida parámetros de búsqueda
 * @param {Object} params - Parámetros de búsqueda
 * @returns {Object} Parámetros validados
 */
function validateSearchParams(params) {
    const { patientName, ownerName, dateFrom, dateTo } = params;

    return {
        patientName: sanitizeString(patientName),
        ownerName: sanitizeString(ownerName),
        dateFrom: isValidDate(dateFrom) ? dateFrom : null,
        dateTo: isValidDate(dateTo) ? dateTo : null,
    };
}

/**
 * Valida el formato de fecha ISO
 * @param {string} dateStr - Cadena de fecha
 * @returns {boolean} Es válida
 */
function isValidDate(dateStr) {
    if (!dateStr) return false;

    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date);
}

module.exports = {
    validateUploadedFile,
    isValidUUID,
    sanitizeString,
    validatePaginationParams,
    validateSearchParams,
    isValidDate,
    MAX_FILE_SIZE,
    ALLOWED_MIME_TYPES,
};
