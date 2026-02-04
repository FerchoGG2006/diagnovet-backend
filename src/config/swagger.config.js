/**
 * ============================================
 * Swagger/OpenAPI Configuration
 * ============================================
 * Documentación interactiva de la API.
 * Accesible en /api-docs
 */

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'DiagnoVET API',
            version: '1.0.0',
            description: `
## API para Procesamiento de Reportes de Ultrasonido Veterinario

Esta API permite:
- 📤 Subir reportes de ultrasonido en formato PDF
- 🔍 Extraer información automáticamente usando Google Document AI
- 🖼️ Extraer imágenes incrustadas del PDF
- 💾 Almacenar datos estructurados en Firestore
- 📊 Consultar y gestionar reportes procesados

### Tecnologías
- **Google Cloud Storage**: Almacenamiento de PDFs e imágenes
- **Google Document AI**: Extracción inteligente de datos
- **Google Firestore**: Base de datos NoSQL
- **Google Cloud Run**: Hosting serverless

### Autor
Fernando José Baquero Vergara
            `,
            contact: {
                name: 'Fernando Baquero',
                url: 'https://github.com/FerchoGG2006',
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT',
            },
        },
        servers: [
            {
                url: 'http://localhost:8080',
                description: 'Servidor de desarrollo',
            },
            {
                url: 'https://diagnovet-backend-1091788993867.us-central1.run.app',
                description: 'Servidor de producción (Cloud Run)',
            },
        ],
        tags: [
            {
                name: 'Reports',
                description: 'Operaciones con reportes de ultrasonido',
            },
            {
                name: 'Health',
                description: 'Estado del servicio',
            },
        ],
        components: {
            schemas: {
                Report: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID único del reporte',
                            example: '7fa910c0-b136-4361-bade-cb451405adae',
                        },
                        patient: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'Max' },
                                species: { type: 'string', example: 'Canino' },
                                breed: { type: 'string', example: 'Golden Retriever' },
                                age: { type: 'string', example: '5 años' },
                                weight: { type: 'string', example: '32 kg' },
                                sex: { type: 'string', example: 'Macho' },
                            },
                        },
                        owner: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'Juan Pérez' },
                                phone: { type: 'string', example: '+57 300 123 4567' },
                                email: { type: 'string', example: 'juan@email.com' },
                            },
                        },
                        veterinarian: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', example: 'Dra. María Rodríguez' },
                                license: { type: 'string', example: '12345-VET' },
                                clinic: { type: 'string', example: 'Clínica Veterinaria Central' },
                            },
                        },
                        clinical: {
                            type: 'object',
                            properties: {
                                diagnosis: { type: 'string' },
                                observations: { type: 'string' },
                                recommendations: { type: 'string' },
                            },
                        },
                        files: {
                            type: 'object',
                            properties: {
                                originalPdf: {
                                    type: 'object',
                                    properties: {
                                        url: { type: 'string', format: 'uri' },
                                        path: { type: 'string' },
                                        fileName: { type: 'string' },
                                    },
                                },
                            },
                        },
                        imagesCount: { type: 'integer', example: 3 },
                        processingTime: { type: 'string', example: '2500ms' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        error: { type: 'string' },
                        code: { type: 'string' },
                    },
                },
                HealthCheck: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', example: 'healthy' },
                        timestamp: { type: 'string', format: 'date-time' },
                        services: {
                            type: 'object',
                            properties: {
                                storage: { type: 'string', example: 'connected' },
                                firestore: { type: 'string', example: 'connected' },
                                documentai: { type: 'string', example: 'connected' },
                            },
                        },
                    },
                },
            },
            responses: {
                BadRequest: {
                    description: 'Solicitud inválida',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                        },
                    },
                },
                NotFound: {
                    description: 'Recurso no encontrado',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                        },
                    },
                },
                RateLimited: {
                    description: 'Límite de solicitudes excedido',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' },
                        },
                    },
                },
            },
        },
    },
    apis: ['./src/routes/*.js', './index.js'],
};

const specs = swaggerJsdoc(options);

/**
 * Configuración de Swagger UI
 */
const swaggerUiOptions = {
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info .title { color: #4fc3f7 }
    `,
    customSiteTitle: 'DiagnoVET API - Documentación',
    customfavIcon: '/favicon.ico',
};

/**
 * Middleware para servir Swagger UI
 */
const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, swaggerUiOptions));

    // Endpoint para obtener el JSON de OpenAPI
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
};

module.exports = {
    specs,
    setupSwagger,
};
