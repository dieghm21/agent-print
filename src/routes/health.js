/**
 * Rutas de Salud
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const printQueue = require('../services/printQueue');

/**
 * GET /api/health
 * Estado general del agente
 */
router.get('/', (req, res) => {
  try {
    const stats = printQueue.getStats();

    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'thermal-printer-agent',
      version: '1.0.0',
      queue: stats
    });
  } catch (error) {
    logger.error('Error en health check', { error: error.message });
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/health/ready
 * Liveness probe
 */
router.get('/ready', (req, res) => {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/health/alive
 * Readiness probe
 */
router.get('/alive', (req, res) => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
