/**
 * Rutas de Impresión
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const printQueue = require('../services/printQueue');
const printerManager = require('../services/printerManager');

/**
 * POST /api/print/text
 * Imprimir texto simple
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "text": "Contenido a imprimir",
 *   "align": "left|center|right",
 *   "fontSize": 1|2|3,
 *   "cut": true
 * }
 */
router.post('/text', (req, res) => {
  try {
    const { printerId, text, align = 'left', fontSize = 1, cut = true } = req.body;

    // Validar parámetros
    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text es requerido'
      });
    }

    // Verificar que la impresora existe
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    // Encolar trabajo
    const job = {
      printerId,
      type: 'text',
      content: { text, align, fontSize },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Trabajo encolado exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo de impresión de texto encolado', {
      jobId,
      printerId,
      textLength: text.length
    });

  } catch (error) {
    logger.error('Error al encolar trabajo de texto', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar trabajo',
      message: error.message
    });
  }
});

/**
 * POST /api/print/receipt
 * Imprimir recibo
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "header": {
 *     "title": "Nombre Tienda",
 *     "subtitle": "Dirección"
 *   },
 *   "items": [
 *     { "name": "Producto", "quantity": 1, "price": 10.50 }
 *   ],
 *   "total": 10.50,
 *   "footer": "Gracias por su compra",
 *   "cut": true
 * }
 */
router.post('/receipt', (req, res) => {
  try {
    const { printerId, header, items, total, footer, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'receipt',
      content: { header, items, total, footer },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Recibo encolado exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo de recibo encolado', {
      jobId,
      printerId,
      itemCount: items?.length || 0,
      total
    });

  } catch (error) {
    logger.error('Error al encolar recibo', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar recibo',
      message: error.message
    });
  }
});

/**
 * POST /api/print/label
 * Imprimir etiqueta con código de barras
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "text": "Etiqueta",
 *   "barcode": {
 *     "data": "123456789",
 *     "type": "CODE128"
 *   },
 *   "cut": true
 * }
 */
router.post('/label', (req, res) => {
  try {
    const { printerId, text, barcode, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!barcode?.data) {
      return res.status(400).json({
        success: false,
        error: 'barcode.data es requerido'
      });
    }

    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'label',
      content: { text, barcode },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Etiqueta encolada exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo de etiqueta encolado', {
      jobId,
      printerId,
      barcodeData: barcode.data
    });

  } catch (error) {
    logger.error('Error al encolar etiqueta', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar etiqueta',
      message: error.message
    });
  }
});

/**
 * POST /api/print/raw
 * Imprimir datos raw
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "buffer": "base64 encoded data",
 *   "cut": true
 * }
 */
router.post('/raw', (req, res) => {
  try {
    const { printerId, buffer, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!buffer) {
      return res.status(400).json({
        success: false,
        error: 'buffer es requerido'
      });
    }

    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'raw',
      content: { buffer },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Datos raw encolados exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo raw encolado', { jobId, printerId });

  } catch (error) {
    logger.error('Error al encolar datos raw', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar datos raw',
      message: error.message
    });
  }
});

/**
 * GET /api/print/job/:jobId
 * Obtener estado de trabajo
 */
router.get('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = printQueue.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Trabajo no encontrado'
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        printerId: job.printerId,
        type: job.type,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        attempts: job.attempts
      }
    });

  } catch (error) {
    logger.error('Error al obtener estado del trabajo', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado del trabajo'
    });
  }
});

/**
 * GET /api/print/stats
 * Estadísticas de cola
 */
router.get('/stats', (req, res) => {
  try {
    const stats = printQueue.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error al obtener estadísticas', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;
