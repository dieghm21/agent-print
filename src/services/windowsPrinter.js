/**
 * Integración con impresoras de Windows
 * Usa Windows Print Spooler directamente
 */

const { execSync } = require('child_process');
const logger = require('../utils/logger');

class WindowsPrinter {
  /**
   * Imprimir en Windows usando comandos ESCPOS correctos
   */
  static printText(printerName, text, options = {}) {
    try {
      const fs = require('fs');
      const { execSync } = require('child_process');
      
      // Crear buffer ESCPOS
      let buffer = Buffer.alloc(0);
      
      // ESC @ - Inicializar impresora
      buffer = Buffer.concat([buffer, Buffer.from('\x1B\x40', 'binary')]);
      
      // Texto sin procesamiento - la impresora interpreta automáticamente
      buffer = Buffer.concat([buffer, Buffer.from(text, 'utf8')]);
      
      // Dos saltos de línea
      buffer = Buffer.concat([buffer, Buffer.from('\n\n', 'utf8')]);
      
      // Corte si está habilitado
      if (options.cut !== false) {
        buffer = Buffer.concat([buffer, Buffer.from('\x1D\x56\x42', 'binary')]);
      }

      // Guardar como archivo binario
      const tmpFile = `C:\\Temp\\print_${Date.now()}.bin`;
      
      try {
        execSync('mkdir C:\\Temp', { stdio: 'ignore' });
      } catch (err) {
        // Ya existe
      }

      fs.writeFileSync(tmpFile, buffer);

      // Enviar directamente a impresora usando PowerShell con encoding binary
      const psCommand = `
        $printerName = "${printerName}"
        $filePath = "${tmpFile}"
        $printer = New-Object System.Drawing.Printing.PrinterSettings
        $printer.PrinterName = $printerName
        
        if (!$printer.IsValid) {
          throw "Impresora no encontrada: $printerName"
        }
        
        $rawFile = [System.IO.File]::ReadAllBytes($filePath)
        $printer = [System.Printing.PrintQueue]::OpenDefaultPrintQueue()
        
        # Enviar datos raw a la impresora
        $connection = $printer.FullName
        
        # Usar net.exe para enviar datos raw
        cmd /c copy /b "${tmpFile}" "${printerName}"
      `;

      const tmpPs = `C:\\Temp\\print_${Date.now()}.ps1`;
      fs.writeFileSync(tmpPs, psCommand);

      try {
        execSync(`powershell -ExecutionPolicy Bypass -File "${tmpPs}"`, { 
          shell: 'cmd.exe',
          stdio: 'pipe'
        });
      } finally {
        try { fs.unlinkSync(tmpPs); } catch (e) {}
      }

      logger.info(`✓ Impresión enviada a ${printerName}`);

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
