/**
 * Integración con impresoras de Windows
 * Usa Windows Print Spooler directamente con ESCPOS
 */

const { execSync } = require('child_process');
const logger = require('../utils/logger');

class WindowsPrinter {
  /**
   * Imprimir en Windows usando Print Spooler
   */
  static printText(printerName, text, options = {}) {
    try {
      const { align = 'left', fontSize = 1, cut = true } = options;

      // Crear contenido ESCPOS
      let escposData = '\x1B\x40'; // ESC @ - Inicializar impresora
      
      // ESC ! n - Selecciona modo de impresión (tamaño de fuente)
      let fontMode = 0x00; // Normal por defecto
      if (fontSize === 2) fontMode = 0x11; // 2x alto, 2x ancho
      else if (fontSize === 3) fontMode = 0x22; // 3x alto, 3x ancho
      
      escposData += String.fromCharCode(0x1B, 0x21, fontMode);

      // ESC a n - Alineación (0=izquierda, 1=centro, 2=derecha)
      let alignCode = 0;
      if (align === 'center') alignCode = 1;
      else if (align === 'right') alignCode = 2;
      escposData += String.fromCharCode(0x1B, 0x61, alignCode);

      // Texto
      escposData += text + '\n\n';

      // Corte si está habilitado
      if (cut) escposData += '\x1D\x56\x42'; // GS V 42 - Partial cut

      // Guardarlo en un archivo temporal
      const fs = require('fs');
      const tmpFile = `C:\\Temp\\print_${Date.now()}.txt`;
      
      // Crear directorio Temp si no existe
      try {
        execSync('mkdir C:\\Temp', { stdio: 'ignore' });
      } catch (err) {
        // Ya existe
      }

      fs.writeFileSync(tmpFile, escposData);

      // Enviar a impresora usando Print Spooler
      const command = `powershell -Command "Get-Content '${tmpFile}' | Out-Printer -Name '${printerName}'"`;
      execSync(command, { shell: 'cmd.exe' });

      logger.info(`✓ Impresión enviada a ${printerName}`);

      // Limpiar archivo temporal
      try {
        fs.unlinkSync(tmpFile);
      } catch (err) {
        logger.debug('No se pudo eliminar archivo temporal', { file: tmpFile });
      }

      return true;

    } catch (error) {
      logger.error('Error al imprimir', { error: error.message });
      throw error;
    }
  }

  /**
   * Imprimir recibo con formato profesional POS
   */
  static printReceipt(printerName, receiptData) {
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

      return this.printText(printerName, text, { cut });

    } catch (error) {
      logger.error('Error al imprimir recibo', { error: error.message });
      throw error;
    }
  }
}

module.exports = WindowsPrinter;
