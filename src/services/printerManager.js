/**
 * Gestor de Impresoras
 * Detecta, conecta y gestiona impresoras térmicas ESCPOS
 */

const usb = require('usb');
const escpos = require('escpos');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

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
    logger.info('Inicializando gestor de impresoras...');
    
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
      const devices = usb.getDeviceList();
      const currentDevices = new Set();

      for (const device of devices) {
        // Filtrar dispositivos que podrían ser impresoras térmicas
        if (this.isLikelyPrinter(device)) {
          const deviceId = `${device.busNumber}:${device.deviceAddress}`;
          currentDevices.add(deviceId);

          // Si es nuevo, agregarlo
          if (!this.connectedDevices.has(deviceId)) {
            this.addPrinter(device);
          }
        }
      }

      // Limpiar dispositivos desconectados
      for (const [deviceId] of this.connectedDevices) {
        if (!currentDevices.has(deviceId)) {
          this.removePrinter(deviceId);
        }
      }

    } catch (error) {
      logger.error('Error al escanear impresoras', { error: error.message });
    }
  }

  /**
   * Verificar si es probablemente una impresora térmica
   */
  isLikelyPrinter(device) {
    // Vendor IDs comunes de impresoras térmicas
    const THERMAL_PRINTER_VENDORS = [
      0x0483, // STMicroelectronics (muchas impresoras)
      0x04b8, // Seiko Epson
      0x0e6e, // Argox
      0x0a81, // Datamax
      0x104d, // Sony
      0x1504, // Brother
      0x0bbd, // Asante
      0x0471, // Philips
    ];

    return THERMAL_PRINTER_VENDORS.includes(device.deviceDescriptor.idVendor);
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

      logger.info('Impresora detectada', {
        printerId,
        deviceId,
        name: printerInfo.name
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
      logger.info('Impresora desconectada', { printerId, deviceId });
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
   * Conectar a impresora y obtener device ESCPOS
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

      // Abriendo conexión USB
      const device = printerInfo.device;
      if (!device.opened) {
        device.open();
      }

      // Crear dispositivo ESCPOS
      const printer = new escpos.USB(device);
      
      return printer;

    } catch (error) {
      logger.error('Error al conectar impresora', { 
        printerId, 
        error: error.message 
      });
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

    // Cerrar todas las conexiones
    for (const printerInfo of this.printers.values()) {
      try {
        await this.closePrinter(printerInfo);
      } catch (error) {
        logger.warn('Error al cerrar impresora', { error: error.message });
      }
    }

    logger.info('Gestor de impresoras detenido');
  }
}

module.exports = new PrinterManager();
