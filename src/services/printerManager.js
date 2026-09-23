/**
 * Gestor de Impresoras para Windows
 * Lee impresoras del Sistema Operativo
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { execSync } = require('child_process');

class PrinterManager {
  constructor() {
    this.printers = new Map();
    this.scanInterval = null;
    this.SCAN_INTERVAL = process.env.DEVICE_SCAN_INTERVAL || 10000;
    this.isWindows = process.platform === 'win32';
  }

  /**
   * Inicializar gestor
   */
  async initialize() {
    logger.info('🖨️  Inicializando gestor de impresoras...');
    logger.info(`Sistema Operativo: ${process.platform}`);
    
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
   * Escanear impresoras del sistema Windows
   */
  async scanPrinters() {
    try {
      if (!this.isWindows) {
        logger.debug('No es Windows, escaneo limitado');
        return;
      }

      logger.debug('Escaneando impresoras de Windows...');

      // Ejecutar comando PowerShell para obtener impresoras
      const command = `powershell -Command "Get-Printer | ConvertTo-Json -AsArray"`;
      
      let output;
      try {
        output = execSync(command, { encoding: 'utf-8' });
      } catch (err) {
        logger.warn('Error ejecutando Get-Printer', { error: err.message });
        return;
      }

      if (!output || output.trim() === '') {
        logger.warn('No se obtuvieron impresoras de Windows');
        return;
      }

      // Parsear JSON
      let printerList = [];
      try {
        printerList = JSON.parse(output);
      } catch (err) {
        logger.error('Error parseando JSON de impresoras', { error: err.message });
        return;
      }

      // Limpiar impresoras anteriores
      this.printers.clear();

      // Si es un objeto único, convertir a array
      if (!Array.isArray(printerList)) {
        printerList = [printerList];
      }

      // Agregar cada impresora
      for (const printer of printerList) {
        const printerId = uuidv4();
        
        this.printers.set(printerId, {
          id: printerId,
          name: printer.Name || 'Impresora Desconocida',
          type: printer.Type || 'Unknown',
          status: 'connected',
          portName: printer.PortName,
          driverName: printer.DriverName,
          lastConnected: new Date().toISOString()
        });

        logger.info(`✓ Impresora detectada: ${printer.Name}`, { 
          printerId,
          port: printer.PortName,
          type: printer.Type
        });
      }

      logger.info(`📋 Total impresoras encontradas: ${this.printers.size}`);

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
    logger.info(`✓ Impresora manual agregada: ${printerInfo.name}`, { printerId });
    
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
