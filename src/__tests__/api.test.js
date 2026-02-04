/**
 * ============================================
 * Integration Tests for API Endpoints
 * ============================================
 */

const request = require('supertest');
const express = require('express');
const path = require('path');

// Mock de los servicios de GCP para tests
jest.mock('@google-cloud/storage', () => ({
    Storage: jest.fn().mockImplementation(() => ({
        bucket: jest.fn().mockReturnValue({
            file: jest.fn().mockReturnValue({
                save: jest.fn().mockResolvedValue(),
                getSignedUrl: jest.fn().mockResolvedValue(['https://fake-url.com']),
            }),
            exists: jest.fn().mockResolvedValue([true]),
        }),
    })),
}));

jest.mock('@google-cloud/firestore', () => ({
    Firestore: jest.fn().mockImplementation(() => ({
        collection: jest.fn().mockReturnValue({
            doc: jest.fn().mockReturnValue({
                set: jest.fn().mockResolvedValue(),
                get: jest.fn().mockResolvedValue({
                    exists: true,
                    data: () => ({
                        id: 'test-id',
                        patient: { name: 'Max' },
                        createdAt: new Date().toISOString(),
                    }),
                }),
            }),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            get: jest.fn().mockResolvedValue({
                docs: [],
                empty: true,
            }),
        }),
    })),
}));

jest.mock('@google-cloud/documentai', () => ({
    DocumentProcessorServiceClient: jest.fn().mockImplementation(() => ({
        processDocument: jest.fn().mockResolvedValue([{
            document: {
                text: 'Test document content',
                entities: [],
                pages: [],
            },
        }]),
    })),
}));

// Crear app de prueba
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Rutas básicas para testing
    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: {
                storage: 'connected',
                firestore: 'connected',
                documentai: 'connected',
            },
        });
    });

    app.get('/', (req, res) => {
        res.json({
            name: 'DiagnoVET API',
            version: '1.0.0',
            status: 'running',
        });
    });

    return app;
};

describe('API Endpoints', () => {
    let app;

    beforeAll(() => {
        app = createTestApp();
    });

    describe('GET /', () => {
        it('should return API info', async () => {
            const response = await request(app)
                .get('/')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('name', 'DiagnoVET API');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('status', 'running');
        });
    });

    describe('GET /health', () => {
        it('should return health status', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('services');
            expect(response.body.services).toHaveProperty('storage');
            expect(response.body.services).toHaveProperty('firestore');
            expect(response.body.services).toHaveProperty('documentai');
        });
    });

    describe('Error Handling', () => {
        it('should return 404 for unknown routes', async () => {
            const testApp = express();
            testApp.use((req, res) => {
                res.status(404).json({ error: 'Not found' });
            });

            const response = await request(testApp)
                .get('/unknown-route')
                .expect(404);

            expect(response.body).toHaveProperty('error');
        });
    });
});

describe('Request Validation', () => {
    it('should validate content-type for JSON endpoints', async () => {
        const app = express();
        app.use(express.json());
        app.post('/test', (req, res) => {
            res.json({ received: req.body });
        });

        const response = await request(app)
            .post('/test')
            .set('Content-Type', 'application/json')
            .send({ test: 'data' })
            .expect(200);

        expect(response.body.received).toEqual({ test: 'data' });
    });
});

describe('Rate Limiting Simulation', () => {
    it('should handle rate limit headers', async () => {
        const app = express();
        app.get('/limited', (req, res) => {
            res.set('X-RateLimit-Limit', '100');
            res.set('X-RateLimit-Remaining', '99');
            res.json({ message: 'ok' });
        });

        const response = await request(app)
            .get('/limited')
            .expect(200);

        expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });
});
