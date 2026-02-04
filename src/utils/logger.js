/**
 * ============================================
 * Winston Logger Configuration
 * ============================================
 * Logging estructurado para producción y desarrollo.
 * Incluye rotación de logs y diferentes formatos.
 */

const winston = require('winston');

// Definir niveles personalizados con colores
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue',
};

winston.addColors(colors);

// Formato para desarrollo (colorido y legible)
const devFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let metaStr = Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
    })
);

// Formato para producción (JSON estructurado)
const prodFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Determinar el nivel según el entorno
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'info';
};

// Crear transports
const transports = [
    // Siempre logear a consola
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? prodFormat : devFormat,
    }),
];

// En producción, también guardar errores en archivo
if (process.env.NODE_ENV === 'production') {
    transports.push(
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            format: prodFormat,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({
            filename: 'logs/combined.log',
            format: prodFormat,
            maxsize: 5242880,
            maxFiles: 5,
        })
    );
}

// Crear logger
const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
    // No salir en errores no manejados
    exitOnError: false,
});

// Stream para Morgan (HTTP logging)
logger.stream = {
    write: (message) => logger.http(message.trim()),
};

/**
 * Funciones helper para logging estructurado
 */
const logRequest = (req, additionalData = {}) => {
    logger.http('Request received', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        ...additionalData,
    });
};

const logResponse = (req, statusCode, duration, additionalData = {}) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger[level]('Response sent', {
        method: req.method,
        url: req.url,
        statusCode,
        duration: `${duration}ms`,
        ...additionalData,
    });
};

const logError = (error, req = null, additionalData = {}) => {
    const errorData = {
        message: error.message,
        stack: error.stack,
        ...additionalData,
    };

    if (req) {
        errorData.method = req.method;
        errorData.url = req.url;
        errorData.ip = req.ip;
    }

    logger.error('Error occurred', errorData);
};

const logProcessing = (action, data = {}) => {
    logger.info(`Processing: ${action}`, data);
};

module.exports = {
    logger,
    logRequest,
    logResponse,
    logError,
    logProcessing,
};
