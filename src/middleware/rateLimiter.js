/**
 * ============================================
 * Rate Limiting Middleware
 * ============================================
 * Protección contra abuso de la API.
 * Límites diferentes para diferentes endpoints.
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');

/**
 * Límite global para todas las requests
 * 100 requests por 15 minutos por IP
 */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests
    message: {
        success: false,
        error: 'Demasiadas solicitudes. Por favor espera 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
    },
    standardHeaders: true, // Incluir headers RateLimit-*
    legacyHeaders: false, // Deshabilitar X-RateLimit-*
    handler: (req, res, next, options) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            limit: options.max,
        });
        res.status(429).json(options.message);
    },
});

/**
 * Límite estricto para upload de archivos
 * 10 uploads por hora por IP (procesamiento costoso)
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10, // máximo 10 uploads
    message: {
        success: false,
        error: 'Límite de uploads alcanzado. Máximo 10 por hora.',
        code: 'UPLOAD_LIMIT_EXCEEDED',
        retryAfter: '1 hour',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Usar IP + User-Agent para identificar cliente
        return `${req.ip}-${req.get('User-Agent') || 'unknown'}`;
    },
    handler: (req, res, next, options) => {
        logger.warn('Upload rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
        res.status(429).json(options.message);
    },
});

/**
 * Límite para endpoints de lectura
 * 200 requests por 15 minutos (más permisivo)
 */
const readLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests
    message: {
        success: false,
        error: 'Demasiadas consultas. Por favor espera.',
        code: 'READ_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Límite para health check (muy permisivo)
 * Para monitoreo continuo
 */
const healthLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 60, // 1 por segundo
    message: { error: 'Too many health checks' },
});

/**
 * Skip rate limiting para IPs confiables (opcional)
 */
const trustedIPs = process.env.TRUSTED_IPS
    ? process.env.TRUSTED_IPS.split(',')
    : [];

const skipIfTrusted = (req) => {
    return trustedIPs.includes(req.ip);
};

module.exports = {
    globalLimiter,
    uploadLimiter,
    readLimiter,
    healthLimiter,
    skipIfTrusted,
};
