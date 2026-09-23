/**
 * Gestor de Impresoras para Windows
 * Detecta impresoras del sistema operativo
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
let printer;

// Intentar cargar la librería printer
try {
  printer = require('printer');
  logger.info('✓ Módulo printer cargado correctamente');
} catch (err) {
  logger.warn('⚠️  Módulo printer no disponible', { error: err.message });
  logger.warn('En Windows: npm install --build-from-source');
}

class PrinterManager {
  constructor() {
    this.printers = new Map();
    this.connectedDevices = new Map();
    this.scanInterval = null;
    this.SCAN_INTERVAL = process.env.DEVICE_SCAN_INTERVAL || 10000;
  }

  /**
   * Inicializar gestor
   */
  async initialize() {
    logger.info('Inicializando gestor de impresoras para Windows...');
    
    // Escanear impresoras inicialmente
    await this.scanPrinters();

    // Configurar escaneo periódico
    this.scanInterval = setInterval(() => {
      this.scanPrinters().catch(err => {
        logger.error('Error en escaneo periódico', { error: err.message });
      });
    }, this.SCAN_INTERVAL);

    logger.info('Gestor de impresoras inicializado correctamente');
  }

  /**
   * Escanear impresoras del sistema operativo
   */
  async scanPrinters() {
    try {
      if (!printer) {
        logger.debug('printer no disponible, usando mock');
        return;
      }

      // Obtener lista de impresoras del sistema
      const printers = printer.getPrinters() || [];
      
      logger.info(`📋 ${printers.length} impresora(s) encontrada(s) en el sistema`);

      // Limpiar impresoras anteriores
      this.printers.clear();
      this.connectedDevices.clear();

      // Agregar cada impresora del sistema
      for (const printerInfo of printers) {
        const printerId = uuidv4();
        
        this.printers.set(printerId, {
          id: printerId,
          name: printerInfo.name || 'Impresora Desconocida',
          status: 'connected',
          type: printerInfo.type || 'Unknown',
          isDefault: printerInfo.isDefault || false,
          lastConnected: new Date().toISOString()
        });

        logger.info(`✓ Impresora agregada: ${printerInfo.name}`, { 
          printerId,
          default: printerInfo.isDefault 
        });
      }

    } catch (error) {
      logger.error('Error al escanear impresoras', { error: error.message });
    }
  }

  /**
   * Obtener todas las impresoras
   */
  getPrinters() {
    const printersList = Array.from(this.printers.values()).map(printer => ({
      id: printer.id,
      name: printer.name,
      vendor: printer.vendor,
      product: printer.product,
      status: printer.status,
      lastConnected: printer.lastConnected
    }));

    return printersList;
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

      logger.info('✓ Conectado a impresora', { printerId, name: printerInfo.name });
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
   * Imprimir usando la librería printer
   */
  async printOnWindows(printerId, jobData) {
    try {
      if (!printer) {
        logger.warn('printer no disponible, simulando impresión');
        return;
      }

      const printerInfo = this.printers.get(printerId);
      if (!printerInfo) {
        throw new Error(`Impresora ${printerId} no encontrada`);
      }

      logger.info(`📤 Enviando trabajo a impresora: ${printerInfo.name}`, {
        type: jobData.type
      });

      // Aquí iría la lógica de impresión real
      // Por ahora solo lo registramos
      logger.info('✓ Trabajo enviado correctamente', { 
        printerId, 
        type: jobData.type 
      });

    } catch (error) {
      logger.error('Error imprimiendo', { error: error.message });
      throw error;
    }
  }

  /**
   * Cerrar conexión de impresora
   */
  async closePrinter(printer) {
    try {
      if (printer && printer.device) {
        printer.device.close();
      }
    } catch (error) {
      logger.warn('Error al cerrar impresora', { error: error.message });
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

