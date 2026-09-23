/**
 * Gestor de Impresoras
 * Compatible con Windows, macOS y Linux
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
   * Escanear impresoras
   */
  async scanPrinters() {
    try {
      logger.debug('Escaneando impresoras...');
      // La detección real dependerá del SO y librerías específicas
    } catch (error) {
      logger.error('Error al escanear impresoras', { error: error.message });
    }
  }

  /**
   * Agregar impresora manualmente (para pruebas)
   */
  addPrinter(name, type = 'thermal') {
    const printerId = uuidv4();
    const printerInfo = {
      id: printerId,
      name: name || `Impresora ${this.printers.size + 1}`,
      type: type,
      status: 'connected',
      lastConnected: new Date().toISOString()
    };

    this.printers.set(printerId, printerInfo);
    logger.info(`✓ Impresora agregada: ${printerInfo.name}`, { printerId });
    
    return printerId;
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
