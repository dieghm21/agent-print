/**
 * Integración con impresoras de Windows
 * Usa acceso directo USB con escpos-usb (después de instalar WinUSB con Zadig)
 */

const logger = require('../utils/logger');
let escpos;
let usbPrinter;

// Intentar cargar escpos (puede no estar disponible en macOS)
try {
  escpos = require('escpos');
  usbPrinter = require('escpos-usb');
  escpos.USB = usbPrinter;
} catch (err) {
  logger.warn('escpos-usb no disponible (esperado en macOS)', { error: err.message });
  escpos = null;
}

class WindowsPrinter {
  /**
   * Conectar a impresora térmica por USB
   */
  static async connectUSB() {
    try {
      if (!escpos) {
        throw new Error('escpos-usb no está disponible. Instala con: npm install escpos escpos-usb');
      }

      // Buscar impresoras USB conectadas
      const devices = escpos.USB.findPrinter();
      
      if (!devices || devices.length === 0) {
        throw new Error('No se encontró impresora térmica USB conectada');
      }

      // Conectar a la primera impresora encontrada
      const device = new escpos.USB(devices[0]);
      const printer = new escpos.Printer(device);

      return { device, printer };
    } catch (error) {
      logger.error('Error conectando a impresora USB', { error: error.message });
      throw error;
    }
  }

  /**
   * Imprimir en Windows usando acceso directo USB
   */
  static async printText(printerName, text, options = {}) {
    let device = null;
    let printer = null;

    try {
      const connection = await this.connectUSB();
      device = connection.device;
      printer = connection.printer;

      // Inicializar impresora
      printer.initialize();

      // Enviar texto
      printer.text(text);

      // Dos saltos de línea
      printer.feed(2);

      // Corte si está habilitado
      if (options.cut !== false) {
        printer.cut();
      }

      // Ejecutar comandos enviados
      await printer.close();

      logger.info(`✓ Impresión enviada por USB`);

      return true;

    } catch (error) {
      logger.error('Error al imprimir por USB', { error: error.message });
      
      // Intentar cerrar conexión si falla
      if (device) {
        try {
          await device.close();
        } catch (err) {
          logger.debug('Error cerrando dispositivo', { error: err.message });
        }
      }

      throw error;
    }
  }

  /**
   * Imprimir recibo con formato profesional POS
   */
  static async printReceipt(printerName, receiptData) {
    let device = null;
    let printer = null;

    try {
      const { 
        header, 
        items, 
        subtotal,
        discount = 0,
        tax = 0,
        total, 
        footer, 
        paymentMethod,
        orderNumber,
        dateTime,
        cut = true 
      } = receiptData;

      let text = '';
      const WIDTH = 48; // Ancho estándar POS-80C

      // Encabezado
      if (header) {
        text += '\n';
        if (header.title) {
          const title = header.title.substring(0, WIDTH);
          const padding = Math.floor((WIDTH - title.length) / 2);
          text += ' '.repeat(padding) + title + '\n';
        }
        if (header.subtitle) {
          const subtitle = header.subtitle.substring(0, WIDTH);
          const padding = Math.floor((WIDTH - subtitle.length) / 2);
          text += ' '.repeat(padding) + subtitle + '\n';
        }
        text += '='.repeat(WIDTH) + '\n';
      }

      // Número de orden y fecha
      if (orderNumber || dateTime) {
        if (orderNumber) {
          text += `Orden: ${orderNumber}\n`;
        }
        if (dateTime) {
          text += `${dateTime}\n`;
        }
        text += '-'.repeat(WIDTH) + '\n';
      }

      // Items
      text += '\n';
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const qty = item.quantity || 1;
          const unitPrice = item.price || 0;
          const itemTotal = unitPrice * qty;

          const name = item.name.substring(0, WIDTH);
          text += name + '\n';

          const qtyStr = `${qty}x `;
          const priceStr = `$${unitPrice.toFixed(2)}`;
          const totalStr = `$${itemTotal.toFixed(2)}`;
          
          const availSpace = WIDTH - qtyStr.length - priceStr.length - totalStr.length - 1;
          const line = qtyStr + ' '.repeat(Math.max(0, availSpace)) + priceStr + ' ' + totalStr;
          text += line.substring(0, WIDTH) + '\n';

          if (item.description) {
            const desc = `  ${item.description}`.substring(0, WIDTH);
            text += desc + '\n';
          }

          text += '\n';
        }
      }

      // Resumen
      text += '-'.repeat(WIDTH) + '\n';

      if (subtotal || items) {
        const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const label = 'Subtotal';
        const value = `$${sub.toFixed(2)}`;
        const padding = WIDTH - label.length - value.length;
        text += (label + ' '.repeat(Math.max(0, padding)) + value).substring(0, WIDTH) + '\n';
      }

      if (discount && discount > 0) {
        const discountAmount = typeof discount === 'object' ? (discount.amount || 0) : discount;
        const label = 'Descuento';
        const value = `-$${discountAmount.toFixed(2)}`;
        const padding = WIDTH - label.length - value.length;
        text += (label + ' '.repeat(Math.max(0, padding)) + value).substring(0, WIDTH) + '\n';
      }

      if (tax && tax > 0) {
        const label = 'Impuesto';
        const value = `$${tax.toFixed(2)}`;
        const padding = WIDTH - label.length - value.length;
        text += (label + ' '.repeat(Math.max(0, padding)) + value).substring(0, WIDTH) + '\n';
      }

      if (total) {
        text += '='.repeat(WIDTH) + '\n';
        const label = 'TOTAL';
        const value = `$${total.toFixed(2)}`;
        const padding = WIDTH - label.length - value.length;
        text += (label + ' '.repeat(Math.max(0, padding)) + value).substring(0, WIDTH) + '\n';
        text += '='.repeat(WIDTH) + '\n';
      }

      if (paymentMethod) {
        text += `\nPago: ${paymentMethod}\n`;
      }

      // Pie de página
      text += '\n';
      if (footer) {
        if (Array.isArray(footer)) {
          for (const line of footer) {
            const footerLine = line.substring(0, WIDTH);
            const padding = Math.floor((WIDTH - footerLine.length) / 2);
            text += ' '.repeat(padding) + footerLine + '\n';
          }
        } else {
          const footerLine = footer.substring(0, WIDTH);
          const padding = Math.floor((WIDTH - footerLine.length) / 2);
          text += ' '.repeat(padding) + footerLine + '\n';
        }
      }

      text += '\n';

      // Usar printText para enviar por USB
      return await this.printText(printerName, text, { cut });

    } catch (error) {
      logger.error('Error al imprimir recibo', { error: error.message });
      throw error;
    }
  }
}

module.exports = WindowsPrinter;
