/**
 * Logger configurado con Winston
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

const LOG_PATH = process.env.LOG_PATH || './logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Crear directorio de logs si no existe
if (!fs.existsSync(LOG_PATH)) {
  fs.mkdirSync(LOG_PATH, { recursive: true });
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'thermal-printer-agent' },
  transports: [
    // Archivo de todos los logs
    new winston.transports.File({
      filename: path.join(LOG_PATH, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: path.join(LOG_PATH, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// En desarrollo, también loguear en consola
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} [${level}]: ${message} ${metaStr}`;
      })
    )
  }));
}

module.exports = logger;
