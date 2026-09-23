/**
 * Gestor de Impresoras para Windows
 * Detecta impresoras USB y térmicas
 */

const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
let usb, EscPosWindows;

// Intentar cargar las librerías
try {
  usb = require('usb');
  logger.debug('Módulo USB cargado');
} catch (err) {
  logger.warn('Módulo USB no disponible', { error: err.message });
}

try {
  EscPosWindows = require('node-escpos-windows');
  logger.debug('Módulo ESCPOS Windows cargado');
} catch (err) {
  logger.warn('Módulo ESCPOS Windows no disponible', { error: err.message });
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
   * Escanear impresoras USB
   */
  async scanPrinters() {
    try {
      if (!usb) {
        logger.debug('USB no disponible, usando mock');
        return;
      }

      const devices = usb.getDeviceList();
      const currentDevices = new Set();

      for (const device of devices) {
        try {
          if (this.isLikelyPrinter(device)) {
            const deviceId = `${device.busNumber}:${device.deviceAddress}`;
            currentDevices.add(deviceId);

            // Si es nuevo, agregarlo
            if (!this.connectedDevices.has(deviceId)) {
              this.addPrinter(device);
            }
          }
        } catch (err) {
          logger.debug('Error procesando dispositivo', { error: err.message });
        }
      }

      // Limpiar dispositivos desconectados
      for (const [deviceId] of this.connectedDevices) {
        if (!currentDevices.has(deviceId)) {
          this.removePrinter(deviceId);
        }
      }

    } catch (error) {
      logger.debug('Error al escanear impresoras USB', { error: error.message });
    }
  }

  /**
   * Verificar si es probablemente una impresora térmica
   */
  isLikelyPrinter(device) {
    // Vendor IDs comunes de impresoras térmicas
    const THERMAL_PRINTER_VENDORS = [
      0x0483, // STMicroelectronics
      0x04b8, // Seiko Epson
      0x0e6e, // Argox
      0x0a81, // Datamax
      0x1504, // Brother
      0x0bbd, // Asante
    ];

    try {
      return THERMAL_PRINTER_VENDORS.includes(device.deviceDescriptor.idVendor);
    } catch (err) {
      return false;
    }
  }

  /**
   * Agregar impresora detectada
   */
  addPrinter(device) {
    try {
      const deviceId = `${device.busNumber}:${device.deviceAddress}`;
      const printerId = uuidv4();

      const printerInfo = {
        id: printerId,
        deviceId,
        name: `Thermal Printer ${device.deviceAddress}`,
        vendor: `0x${device.deviceDescriptor.idVendor.toString(16)}`,
        product: `0x${device.deviceDescriptor.idProduct.toString(16)}`,
        busNumber: device.busNumber,
        deviceAddress: device.deviceAddress,
        status: 'connected',
        lastConnected: new Date().toISOString(),
        device: device
      };

      this.printers.set(printerId, printerInfo);
      this.connectedDevices.set(deviceId, printerId);

      logger.info('🖨️  Impresora detectada', {
        printerId,
        name: printerInfo.name,
        vendor: printerInfo.vendor
      });

    } catch (error) {
      logger.error('Error al agregar impresora', { error: error.message });
    }
  }

  /**
   * Remover impresora
   */
  removePrinter(deviceId) {
    const printerId = this.connectedDevices.get(deviceId);
    if (printerId) {
      this.printers.delete(printerId);
      this.connectedDevices.delete(deviceId);
      logger.info('❌ Impresora desconectada', { printerId, deviceId });
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
   * Imprimir en Windows
   */
  async printOnWindows(printerId, jobData) {
    try {
      if (!EscPosWindows) {
        logger.warn('ESCPOS Windows no disponible, simulando impresión');
        return;
      }

      const printerInfo = this.printers.get(printerId);
      if (!printerInfo) {
        throw new Error(`Impresora ${printerId} no encontrada`);
      }

      // Usar ESCPOS Windows
      const escpos = new EscPosWindows();
      
      // Procesar comando según tipo
      if (jobData.type === 'text') {
        escpos.text(jobData.content.text);
      } else if (jobData.type === 'receipt') {
        escpos.receipt(jobData.content);
      }

      if (jobData.cut !== false) {
        escpos.cut();
      }

      logger.info('✓ Trabajo enviado a impresora', { printerId, type: jobData.type });

    } catch (error) {
      logger.error('Error imprimiendo en Windows', { error: error.message });
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

