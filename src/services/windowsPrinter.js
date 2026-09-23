/**
 * Integración con impresoras de Windows
 * Usa Windows Print Spooler directamente
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

      // Crear contenido ESCPOS básico
      let escposData = '\x1B\x40'; // Inicializar impresora

      // Alineación
      if (align === 'center') escposData += '\x1B\x61\x01';
      else if (align === 'right') escposData += '\x1B\x61\x02';

      // Tamaño de fuente
      if (fontSize === 2) escposData += '\x1D\x21\x11';
      else if (fontSize === 3) escposData += '\x1D\x21\x22';

      // Texto
      escposData += text + '\n\n';

      // Corte si está habilitado
      if (cut) escposData += '\x1D\x56\x42'; // Partial cut

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
      const width = 42; // Ancho estándar para ticket de 80mm

      // ===== ENCABEZADO =====
      if (header) {
        text += '\n';
        // Título centrado
        if (header.title) {
          const title = header.title;
          const spaces = Math.floor((width - title.length) / 2);
          text += ' '.repeat(Math.max(0, spaces)) + title + '\n';
        }
        // Subtítulo centrado
        if (header.subtitle) {
          const subtitle = header.subtitle;
          const spaces = Math.floor((width - subtitle.length) / 2);
          text += ' '.repeat(Math.max(0, spaces)) + subtitle + '\n';
        }
        text += '='.repeat(width) + '\n';
      }

      // Número de orden y fecha
      if (orderNumber) {
        text += `Orden: ${orderNumber}\n`;
      }
      if (dateTime) {
        text += `${dateTime}\n`;
      }
      
      if (orderNumber || dateTime) {
        text += '-'.repeat(width) + '\n';
      }

      // ===== ITEMS =====
      text += '\n';
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const qty = item.quantity || 1;
          const unitPrice = item.price || 0;
          const itemTotal = unitPrice * qty;
          
          // Nombre del producto
          let productLine = item.name;
          if (productLine.length > width - 10) {
            productLine = productLine.substring(0, width - 10) + '...';
          }
          text += productLine + '\n';
          
          // Cantidad, precio unitario y total
          const qtyText = `${qty}x`;
          const priceText = `$${unitPrice.toFixed(2)}`;
          const totalText = `$${itemTotal.toFixed(2)}`;
          
          const spacing = width - qtyText.length - priceText.length - totalText.length - 3;
          text += `${qtyText} ${' '.repeat(spacing)} ${priceText} ${totalText}\n`;
          
          // Descripción si existe
          if (item.description) {
            const desc = `  ${item.description}`;
            text += desc + '\n';
          }
          
          text += '\n';
        }
      }

      // ===== RESUMEN =====
      text += '-'.repeat(width) + '\n';
      
      // Subtotal
      if (subtotal || items) {
        const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotalLine = 'Subtotal'.padEnd(width - 10) + `$${sub.toFixed(2)}`.padStart(10);
        text += subtotalLine + '\n';
      }

      // Descuento
      if (discount && discount > 0) {
        const discountLine = `Descuento (${discount.percentage || 0}%)`.padEnd(width - 10) + 
                            `-$${discount.amount?.toFixed(2) || discount.toFixed(2)}`.padStart(10);
        text += discountLine + '\n';
      }

      // Impuesto
      if (tax && tax > 0) {
        const taxLine = 'Impuesto'.padEnd(width - 10) + `$${tax.toFixed(2)}`.padStart(10);
        text += taxLine + '\n';
      }

      // Total
      if (total) {
        text += '='.repeat(width) + '\n';
        const totalLine = 'TOTAL'.padEnd(width - 10) + `$${total.toFixed(2)}`.padStart(10);
        text += totalLine + '\n';
        text += '='.repeat(width) + '\n';
      }

      // Método de pago
      if (paymentMethod) {
        text += `\nPago: ${paymentMethod}\n`;
      }

      // ===== PIE DE PÁGINA =====
      text += '\n';
      if (footer) {
        if (Array.isArray(footer)) {
          for (const line of footer) {
            const spaces = Math.floor((width - line.length) / 2);
            text += ' '.repeat(Math.max(0, spaces)) + line + '\n';
          }
        } else {
          const spaces = Math.floor((width - footer.length) / 2);
          text += ' '.repeat(Math.max(0, spaces)) + footer + '\n';
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
