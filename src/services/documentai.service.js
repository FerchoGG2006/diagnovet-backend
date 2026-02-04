/**
 * ============================================
 * Document AI Service
 * ============================================
 * Procesa documentos PDF usando Google Document AI.
 * Extrae campos estructurados de reportes de ultrasonido veterinario.
 */

const { documentAIClient, getProcessorName } = require('../config/gcp.config');

/**
 * Campos esperados en un reporte de ultrasonido veterinario
 * Se usan para mapear las entidades detectadas por Document AI
 */
const EXPECTED_FIELDS = {
    // Información del paciente (mascota)
    patient_name: ['Patient', 'Patient Name', 'Paciente', 'Nombre Paciente', 'Pet Name', 'Animal'],
    patient_species: ['Species', 'Especie', 'Animal Type', 'Tipo Animal'],
    patient_breed: ['Breed', 'Raza', 'Race'],
    patient_age: ['Age', 'Edad', 'Patient Age'],
    patient_weight: ['Weight', 'Peso', 'Patient Weight'],
    patient_sex: ['Sex', 'Sexo', 'Gender', 'Género'],

    // Información del dueño
    owner_name: ['Owner', 'Owner Name', 'Dueño', 'Propietario', 'Client', 'Cliente'],
    owner_phone: ['Phone', 'Teléfono', 'Contact', 'Contacto'],
    owner_email: ['Email', 'Correo', 'E-mail'],
    owner_address: ['Address', 'Dirección', 'Domicilio'],

    // Información del veterinario
    veterinarian_name: ['Veterinarian', 'Vet', 'Veterinario', 'Doctor', 'Dr.', 'Médico'],
    veterinarian_license: ['License', 'Licencia', 'Cédula', 'Registration'],
    clinic_name: ['Clinic', 'Clínica', 'Hospital', 'Centro Veterinario'],

    // Información del estudio
    study_date: ['Date', 'Fecha', 'Study Date', 'Fecha Estudio', 'Exam Date'],
    study_type: ['Study Type', 'Tipo Estudio', 'Exam Type', 'Examination'],

    // Hallazgos clínicos
    diagnosis: ['Diagnosis', 'Diagnóstico', 'Findings', 'Hallazgos', 'Impression', 'Impresión'],
    observations: ['Observations', 'Observaciones', 'Notes', 'Notas', 'Comments'],
    recommendations: ['Recommendations', 'Recomendaciones', 'Treatment', 'Tratamiento', 'Follow-up'],

    // Mediciones
    measurements: ['Measurements', 'Mediciones', 'Dimensions', 'Dimensiones'],
};

/**
 * Procesa un documento PDF con Document AI
 * @param {Buffer} pdfBuffer - Contenido del PDF en buffer
 * @returns {Promise<Object>} Documento procesado con texto y entidades
 */
async function processDocument(pdfBuffer) {
    const processorName = getProcessorName();

    const request = {
        name: processorName,
        rawDocument: {
            content: pdfBuffer.toString('base64'),
            mimeType: 'application/pdf',
        },
    };

    console.log('📄 Procesando documento con Document AI...');
    const [result] = await documentAIClient.processDocument(request);

    return result.document;
}

/**
 * Mapea las entidades detectadas a un objeto estructurado
 * @param {Object} document - Documento procesado por Document AI
 * @returns {Object} Datos estructurados del reporte
 */
function mapEntitiesToFields(document) {
    const entities = document.entities || [];
    const extractedData = {
        patient: {},
        owner: {},
        veterinarian: {},
        study: {},
        clinical: {},
        rawText: document.text || '',
    };

    // Procesar cada entidad detectada
    entities.forEach(entity => {
        const type = entity.type?.toLowerCase() || '';
        const value = entity.mentionText?.trim() || '';
        const confidence = entity.confidence || 0;

        // Mapear a campos conocidos
        for (const [fieldKey, possibleNames] of Object.entries(EXPECTED_FIELDS)) {
            const matchesField = possibleNames.some(name =>
                type.includes(name.toLowerCase()) ||
                name.toLowerCase().includes(type)
            );

            if (matchesField) {
                const [category, field] = fieldKey.split('_');

                if (!extractedData[category]) {
                    extractedData[category] = {};
                }

                // Solo actualizar si tiene mayor confianza o no existe
                if (!extractedData[category][field] || confidence > 0.7) {
                    extractedData[category][field] = {
                        value,
                        confidence: Math.round(confidence * 100),
                    };
                }
                break;
            }
        }
    });

    return extractedData;
}

/**
 * Extrae texto de regiones específicas del documento
 * Útil cuando Document AI no detecta entidades pero sí texto
 * @param {Object} document - Documento procesado
 * @returns {Object} Texto extraído por secciones
 */
function extractTextBySections(document) {
    const text = document.text || '';
    const sections = {
        patient: '',
        diagnosis: '',
        recommendations: '',
    };

    // Patrones para identificar secciones en el texto
    const patterns = {
        patient: /(?:paciente|patient|datos del animal)[:\s]*([\s\S]*?)(?=diagnóstico|diagnosis|hallazgos|$)/i,
        diagnosis: /(?:diagnóstico|diagnosis|hallazgos|findings|impresión)[:\s]*([\s\S]*?)(?=recomendaciones|recommendations|tratamiento|$)/i,
        recommendations: /(?:recomendaciones|recommendations|tratamiento|treatment|seguimiento)[:\s]*([\s\S]*?)$/i,
    };

    for (const [section, pattern] of Object.entries(patterns)) {
        const match = text.match(pattern);
        if (match && match[1]) {
            sections[section] = match[1].trim().substring(0, 500); // Limitar longitud
        }
    }

    return sections;
}

/**
 * Procesa un reporte de ultrasonido y extrae toda la información
 * @param {Buffer} pdfBuffer - Contenido del PDF
 * @returns {Promise<Object>} Información estructurada del reporte
 */
async function extractUltrasoundReport(pdfBuffer) {
    try {
        // 1. Procesar con Document AI
        const document = await processDocument(pdfBuffer);

        // 2. Mapear entidades a campos estructurados
        const mappedData = mapEntitiesToFields(document);

        // 3. Extraer texto por secciones como respaldo
        const textSections = extractTextBySections(document);

        // 4. Combinar resultados
        const result = {
            // Datos del paciente
            patient: {
                name: mappedData.patient?.name?.value || 'No detectado',
                species: mappedData.patient?.species?.value || 'No detectado',
                breed: mappedData.patient?.breed?.value || 'No detectado',
                age: mappedData.patient?.age?.value || 'No detectado',
                weight: mappedData.patient?.weight?.value || 'No detectado',
                sex: mappedData.patient?.sex?.value || 'No detectado',
            },

            // Datos del dueño
            owner: {
                name: mappedData.owner?.name?.value || 'No detectado',
                phone: mappedData.owner?.phone?.value || 'No detectado',
                email: mappedData.owner?.email?.value || 'No detectado',
                address: mappedData.owner?.address?.value || 'No detectado',
            },

            // Datos del veterinario
            veterinarian: {
                name: mappedData.veterinarian?.name?.value || 'No detectado',
                license: mappedData.veterinarian?.license?.value || 'No detectado',
                clinic: mappedData.clinic?.name?.value || 'No detectado',
            },

            // Información del estudio
            study: {
                date: mappedData.study?.date?.value || new Date().toISOString().split('T')[0],
                type: mappedData.study?.type?.value || 'Ultrasonido',
            },

            // Hallazgos clínicos
            clinical: {
                diagnosis: mappedData.clinical?.diagnosis?.value || textSections.diagnosis || 'Pendiente de revisión',
                observations: mappedData.clinical?.observations?.value || 'Sin observaciones adicionales',
                recommendations: mappedData.clinical?.recommendations?.value || textSections.recommendations || 'Consultar con especialista',
                measurements: mappedData.clinical?.measurements?.value || 'No especificadas',
            },

            // Metadatos de procesamiento
            processingMetadata: {
                pagesProcessed: document.pages?.length || 1,
                entitiesDetected: document.entities?.length || 0,
                textLength: document.text?.length || 0,
                processedAt: new Date().toISOString(),
            },
        };

        console.log(`✅ Documento procesado: ${result.processingMetadata.entitiesDetected} entidades detectadas`);

        return result;

    } catch (error) {
        console.error('❌ Error procesando documento:', error.message);
        throw new Error(`Error en Document AI: ${error.message}`);
    }
}

module.exports = {
    processDocument,
    mapEntitiesToFields,
    extractTextBySections,
    extractUltrasoundReport,
    EXPECTED_FIELDS,
};
