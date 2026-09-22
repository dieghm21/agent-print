/**
 * Rutas de Gestión de Impresoras
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const printerManager = require('../services/printerManager');

/**
 * GET /api/printers
 * Obtener lista de todas las impresoras disponibles
 */
router.get('/', (req, res) => {
  try {
    const printers = printerManager.getPrinters();

    res.json({
      success: true,
      count: printers.length,
      printers
    });

    logger.debug('Listado de impresoras solicitado', { count: printers.length });

  } catch (error) {
    logger.error('Error al listar impresoras', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al listar impresoras',
      message: error.message
    });
  }
});

/**
 * GET /api/printers/:id
 * Obtener información de impresora específica
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const printer = printerManager.getPrinter(id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada',
        printerId: id
      });
    }

    res.json({
      success: true,
      printer: {
        id: printer.id,
        name: printer.name,
        vendor: printer.vendor,
        product: printer.product,
        status: printer.status,
        lastConnected: printer.lastConnected,
        busNumber: printer.busNumber,
        deviceAddress: printer.deviceAddress
      }
    });

  } catch (error) {
    logger.error('Error al obtener impresora', {
      printerId: req.params.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Error al obtener impresora',
      message: error.message
    });
  }
});

/**
 * POST /api/printers/:id/test
 * Prueba de conexión a impresora
 */
router.post('/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const printer = printerManager.getPrinter(id);

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    // Intentar conectar
    const escposPrinter = await printerManager.connectPrinter(id);

    // Imprimir texto de prueba
    escposPrinter.initialize();
    escposPrinter.align('ct');
    escposPrinter.setTextSize(2, 2);
    escposPrinter.text('PRUEBA DE IMPRESION');
    escposPrinter.newLine();
    escposPrinter.text(new Date().toLocaleString());
    escposPrinter.cut();

    await new Promise(resolve => {
      escposPrinter.getBuffer((err) => {
        resolve();
      });
    });

    res.json({
      success: true,
      message: 'Impresora probada exitosamente',
      printer: printer.name
    });

    logger.info('Prueba de impresora exitosa', { printerId: id });

  } catch (error) {
    logger.error('Error al probar impresora', {
      printerId: req.params.id,
      error: error.message
    });
    res.status(500).json({
      success: false,
      error: 'Error al probar impresora',
      message: error.message
    });
  }
});

/**
 * GET /api/printers/scan/now
 * Escanear dispositivos ahora
 */
router.post('/scan/now', async (req, res) => {
  try {
    await printerManager.scanPrinters();

    const printers = printerManager.getPrinters();

    res.json({
      success: true,
      message: 'Escaneo completado',
      count: printers.length,
      printers
    });

    logger.info('Escaneo manual de impresoras completado');

  } catch (error) {
    logger.error('Error al escanear impresoras', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al escanear impresoras',
      message: error.message
    });
  }
});

module.exports = router;
