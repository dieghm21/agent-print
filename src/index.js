/**
 * Agente Local de Impresoras Térmicas
 * Servidor API REST para gestionar impresoras térmicas ESCPOS
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('./utils/logger');
const printerManager = require('./services/printerManager');
const printQueue = require('./services/printQueue');

// Routers
const printerRoutes = require('./routes/printers');
const printRoutes = require('./routes/print');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));

// Middleware de logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, { body: req.body });
  next();
});

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/printers', printerRoutes);
app.use('/api/print', printRoutes);

// Manejo de errores global
app.use((err, req, res, next) => {
  logger.error('Error en request', {
    method: req.method,
    path: req.path,
    error: err.message,
    stack: err.stack
  });

  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.path
  });
});

// Iniciar servidor
const startServer = async () => {
  try {
    // Inicializar gestor de impresoras
    await printerManager.initialize();
    logger.info('Gestor de impresoras inicializado');

    // Inicializar cola de impresión
    printQueue.start();
    logger.info('Cola de impresión iniciada');

    // Iniciar servidor
    app.listen(PORT, HOST, () => {
      logger.info(`🖨️  Agente de Impresoras Térmicas escuchando en http://${HOST}:${PORT}`);
      logger.info(`Versión: 1.0.0`);
      logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Error al iniciar el servidor', { error: error.message });
    process.exit(1);
  }
};

// Manejo de señales
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, apagando gracefully...');
  await printQueue.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, apagando gracefully...');
  await printQueue.stop();
  process.exit(0);
});

startServer();

module.exports = app;
