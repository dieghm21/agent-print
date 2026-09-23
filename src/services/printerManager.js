/**
 * Gestor de Impresoras para Windows
 * Solución simplificada
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class PrinterManager {
  constructor() {
    this.printers = new Map();
    this.scanInterval = null;
    this.SCAN_INTERVAL = process.env.DEVICE_SCAN_INTERVAL || 10000;
  }

  /**
   * Inicializar gestor
   */
  async initialize() {
    logger.info('🖨️  Inicializando gestor de impresoras...');
    
    // Escanear impresoras inicialmente
    await this.scanPrinters();

    // Configurar escaneo periódico
    this.scanInterval = setInterval(() => {
      this.scanPrinters().catch(err => {
        logger.error('Error en escaneo periódico', { error: err.message });
      });
    }, this.SCAN_INTERVAL);

    logger.info('✓ Gestor de impresoras inicializado');
  }

  /**
   * Escanear impresoras - Agregar POS-80C por defecto
   */
  async scanPrinters() {
    try {
      logger.debug('Escaneando impresoras...');

      // Si ya existe POS-80C, no hacer nada
      const existing = Array.from(this.printers.values()).find(p => p.name === 'POS-80C');
      if (existing) {
        logger.debug('POS-80C ya está en la lista');
        return;
      }
      
      // Agregar POS-80C (la que tienes en Windows)
      // Usar un ID fijo para que sea consistente
      const printerId = 'pos80c-usb001-fixed';
      this.printers.set(printerId, {
        id: printerId,
        name: 'POS-80C',
        type: 'thermal',
        status: 'connected',
        port: 'USB001',
        lastConnected: new Date().toISOString()
      });

      logger.info(`✓ Impresora POS-80C disponible`, { 
        printerId,
        port: 'USB001'
      });

    } catch (error) {
      logger.error('Error al escanear impresoras', { error: error.message });
    }
  }

  /**
   * Obtener todas las impresoras
   */
  getPrinters() {
    return Array.from(this.printers.values()).map(printer => ({
      id: printer.id,
      name: printer.name,
      type: printer.type,
      status: printer.status,
      port: printer.port,
      lastConnected: printer.lastConnected
    }));
  }

  /**
   * Obtener información de impresora específica
   */
  getPrinter(printerId) {
    return this.printers.get(printerId);
  }

  /**
   * Conectar a impresora
   */
  async connectPrinter(printerId) {
    try {
      const printerInfo = this.printers.get(printerId);
      
      if (!printerInfo) {
        throw new Error(`Impresora ${printerId} no encontrada`);
      }

      if (printerInfo.status !== 'connected') {
        throw new Error(`Impresora ${printerId} no está disponible`);
      }

      logger.info(`✓ Conectado a: ${printerInfo.name}`, { printerId });
      return { printerId, status: 'connected', name: printerInfo.name };

    } catch (error) {
      logger.error('Error al conectar impresora', { 
        printerId, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Detener gestor
   */
  async stop() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    logger.info('Gestor de impresoras detenido');
  }
}

module.exports = new PrinterManager();
