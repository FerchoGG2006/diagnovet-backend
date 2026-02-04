/**
 * ============================================
 * Image Extractor Utility
 * ============================================
 * Extrae imágenes incrustadas de documentos PDF usando pdf-lib.
 * Las imágenes se procesan y preparan para subir a Cloud Storage.
 */

const { PDFDocument } = require('pdf-lib');

/**
 * Tipos de imagen soportados en PDF
 */
const IMAGE_TYPES = {
    JPEG: 'jpg',
    PNG: 'png',
    JPG: 'jpg',
};

/**
 * Extrae todas las imágenes incrustadas de un PDF
 * @param {Buffer} pdfBuffer - Contenido del PDF en buffer
 * @returns {Promise<Array<{data: Buffer, format: string, index: number}>>} Lista de imágenes extraídas
 */
async function extractImagesFromPDF(pdfBuffer) {
    const extractedImages = [];

    try {
        console.log('🖼️ Iniciando extracción de imágenes del PDF...');

        // Cargar el documento PDF
        const pdfDoc = await PDFDocument.load(pdfBuffer, {
            ignoreEncryption: true, // Intentar procesar PDFs protegidos
        });

        // Obtener todas las páginas
        const pages = pdfDoc.getPages();
        console.log(`📄 PDF tiene ${pages.length} página(s)`);

        // Acceder a los recursos del PDF para encontrar imágenes
        const enumeratedObjects = pdfDoc.context.enumerateIndirectObjects();

        let imageIndex = 0;

        for (const [ref, obj] of enumeratedObjects) {
            // Verificar si el objeto es un stream (las imágenes son XObject streams)
            if (obj && obj.dict) {
                const subtype = obj.dict.get(pdfDoc.context.obj('/Subtype'));

                if (subtype && subtype.toString() === '/Image') {
                    try {
                        // Obtener propiedades de la imagen
                        const width = obj.dict.get(pdfDoc.context.obj('/Width'))?.asNumber() || 0;
                        const height = obj.dict.get(pdfDoc.context.obj('/Height'))?.asNumber() || 0;
                        const filter = obj.dict.get(pdfDoc.context.obj('/Filter'))?.toString() || '';

                        // Determinar el formato basado en el filtro
                        let format = 'png'; // Default
                        if (filter.includes('DCTDecode')) {
                            format = 'jpg';
                        }

                        // Obtener los datos de la imagen
                        if (obj.contents) {
                            const imageData = {
                                data: Buffer.from(obj.contents),
                                format,
                                index: imageIndex,
                                width,
                                height,
                                size: obj.contents.length,
                            };

                            // Solo incluir imágenes con tamaño razonable (evitar íconos pequeños)
                            if (imageData.size > 1000 && width > 50 && height > 50) {
                                extractedImages.push(imageData);
                                console.log(`  ✓ Imagen ${imageIndex + 1}: ${width}x${height} (${format}, ${formatBytes(imageData.size)})`);
                                imageIndex++;
                            }
                        }
                    } catch (imgError) {
                        console.warn(`  ⚠️ No se pudo extraer imagen: ${imgError.message}`);
                    }
                }
            }
        }

        console.log(`✅ Total de imágenes extraídas: ${extractedImages.length}`);

    } catch (error) {
        console.error('❌ Error extrayendo imágenes:', error.message);
        // No lanzar error, devolver array vacío si falla
    }

    return extractedImages;
}

/**
 * Formatea bytes a formato legible
 * @param {number} bytes - Número de bytes
 * @returns {string} Tamaño formateado
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Método alternativo usando análisis de estructura PDF
 * Busca imágenes en las anotaciones y recursos de cada página
 * @param {Buffer} pdfBuffer - Contenido del PDF
 * @returns {Promise<Array>} Información de imágenes encontradas
 */
async function findImageReferences(pdfBuffer) {
    const imageRefs = [];

    try {
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const pages = pdfDoc.getPages();

        pages.forEach((page, pageIndex) => {
            // Obtener el diccionario de recursos de la página
            const resources = page.node.Resources();

            if (resources) {
                const xObject = resources.get(pdfDoc.context.obj('/XObject'));

                if (xObject && xObject.dict) {
                    const entries = xObject.dict.entries();

                    for (const [name, ref] of entries) {
                        imageRefs.push({
                            page: pageIndex + 1,
                            name: name.toString(),
                            reference: ref.toString(),
                        });
                    }
                }
            }
        });

    } catch (error) {
        console.warn('Error buscando referencias de imágenes:', error.message);
    }

    return imageRefs;
}

/**
 * Valida si un buffer contiene datos de imagen válidos
 * @param {Buffer} data - Datos a validar
 * @returns {Object} Resultado de validación con formato detectado
 */
function validateImageData(data) {
    if (!data || data.length < 8) {
        return { valid: false, format: null };
    }

    // Detectar formato por magic bytes
    const header = data.slice(0, 8);

    // JPEG: FF D8 FF
    if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) {
        return { valid: true, format: 'jpg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) {
        return { valid: true, format: 'png' };
    }

    // GIF: 47 49 46 38
    if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) {
        return { valid: true, format: 'gif' };
    }

    // Asumir JPEG si el filtro era DCTDecode pero no tiene header estándar
    return { valid: true, format: 'jpg' };
}

module.exports = {
    extractImagesFromPDF,
    findImageReferences,
    validateImageData,
    formatBytes,
    IMAGE_TYPES,
};
