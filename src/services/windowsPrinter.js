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

      // ===== ENCABEZADO =====
      if (header) {
        text += '\n';
        if (header.title) {
          text += header.title + '\n';
        }
        if (header.subtitle) {
          text += header.subtitle + '\n';
        }
        text += '=====================================\n';
      }

      // Número de orden y fecha
      if (orderNumber) {
        text += `Orden: ${orderNumber}\n`;
      }
      if (dateTime) {
        text += `${dateTime}\n`;
      }
      
      if (orderNumber || dateTime) {
        text += '-------------------------------------\n';
      }

      // ===== ITEMS =====
      text += '\n';
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const qty = item.quantity || 1;
          const unitPrice = item.price || 0;
          const itemTotal = unitPrice * qty;
          
          text += item.name + '\n';
          
          const qtyStr = `${qty}x $${unitPrice.toFixed(2)}`;
          const totalStr = `$${itemTotal.toFixed(2)}`;
          const spacing = Math.max(1, 37 - qtyStr.length - totalStr.length);
          text += qtyStr + ' '.repeat(spacing) + totalStr + '\n';
          
          if (item.description) {
            text += `  ${item.description}\n`;
          }
          
          text += '\n';
        }
      }

      // ===== RESUMEN =====
      text += '-------------------------------------\n';
      
      // Subtotal
      if (subtotal || items) {
        const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const subtotalLabel = 'Subtotal';
        const subtotalValue = `$${sub.toFixed(2)}`;
        const subtotalSpacing = Math.max(1, 37 - subtotalLabel.length - subtotalValue.length);
        text += subtotalLabel + ' '.repeat(subtotalSpacing) + subtotalValue + '\n';
      }

      // Descuento
      if (discount && discount > 0) {
        const discountAmount = typeof discount === 'object' ? (discount.amount || 0) : discount;
        const discountLabel = 'Descuento';
        const discountValue = `-$${discountAmount.toFixed(2)}`;
        const discountSpacing = Math.max(1, 37 - discountLabel.length - discountValue.length);
        text += discountLabel + ' '.repeat(discountSpacing) + discountValue + '\n';
      }

      // Impuesto
      if (tax && tax > 0) {
        const taxLabel = 'Impuesto';
        const taxValue = `$${tax.toFixed(2)}`;
        const taxSpacing = Math.max(1, 37 - taxLabel.length - taxValue.length);
        text += taxLabel + ' '.repeat(taxSpacing) + taxValue + '\n';
      }

      // Total
      if (total) {
        text += '=====================================\n';
        const totalLabel = 'TOTAL';
        const totalValue = `$${total.toFixed(2)}`;
        const totalSpacing = Math.max(1, 37 - totalLabel.length - totalValue.length);
        text += totalLabel + ' '.repeat(totalSpacing) + totalValue + '\n';
        text += '=====================================\n';
      }

      if (paymentMethod) {
        text += `\nPago: ${paymentMethod}\n`;
      }

      // ===== PIE DE PÁGINA =====
      text += '\n';
      if (footer) {
        if (Array.isArray(footer)) {
          for (const line of footer) {
            text += line + '\n';
          }
        } else {
          text += footer + '\n';
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
