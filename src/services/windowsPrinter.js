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
   * Imprimir recibo
   */
  static printReceipt(printerName, receiptData) {
    try {
      const { header, items, total, footer, cut = true } = receiptData;

      let text = '';

      // Header
      if (header) {
        text += '\n' + (header.title || '') + '\n';
        if (header.subtitle) text += header.subtitle + '\n';
        text += '─'.repeat(40) + '\n\n';
      }

      // Items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const line = `${item.name} x${item.quantity}`.padEnd(25) + 
                       `$${item.price.toFixed(2)}`.padStart(10);
          text += line + '\n';
        }
      }

      // Total
      if (total) {
        text += '─'.repeat(40) + '\n';
        const totalLine = 'TOTAL'.padEnd(25) + `$${total.toFixed(2)}`.padStart(10);
        text += totalLine + '\n';
      }

      // Footer
      if (footer) {
        text += '\n' + footer + '\n';
      }

      return this.printText(printerName, text, { cut });

    } catch (error) {
      logger.error('Error al imprimir recibo', { error: error.message });
      throw error;
    }
  }
}

module.exports = WindowsPrinter;
