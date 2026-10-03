/**
 * Integración con impresoras de Windows
 * Envía datos ESC/POS en modo RAW directamente al spooler de Windows
 * (winspool.drv vía OpenPrinter/StartDocPrinter/WritePrinter), sin depender
 * de módulos nativos USB (evita problemas de compatibilidad con escpos/usb).
 */

const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const logger = require('../utils/logger');
const escposBuilder = require('./escposBuilder');
const imageProcessor = require('./imageProcessor');

const RAW_PRINT_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'send-raw-printer.ps1');

/**
 * Envía un buffer de bytes a una impresora de Windows usando el spooler (modo RAW).
 * Escribe el buffer a un archivo temporal y ejecuta un script de PowerShell que
 * hace P/Invoke sobre winspool.drv para enviarlo tal cual, byte a byte.
 */
function sendRawBuffer(printerName, buffer) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `agent-print-${uuidv4()}.bin`);

    fs.writeFile(tmpFile, buffer, (writeErr) => {
      if (writeErr) {
        return reject(writeErr);
      }

      const args = [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy', 'Bypass',
        '-File', RAW_PRINT_SCRIPT,
        '-PrinterName', printerName,
        '-FilePath', tmpFile
      ];

      execFile('powershell.exe', args, { windowsHide: true, timeout: 15000 }, (error, stdout, stderr) => {
        fs.unlink(tmpFile, () => {}); // limpieza best-effort, no bloquea el resultado

        if (error) {
          const message = (stderr && stderr.trim()) || error.message;
          return reject(new Error(`Error al enviar datos RAW a la impresora: ${message}`));
        }

        logger.debug('Salida del script de impresión RAW', { stdout: stdout?.trim() });
        resolve(true);
      });
    });
  });
}

class WindowsPrinter {
  /**
   * Imprimir texto simple
   */
  static async printText(printerName, text, options = {}) {
    try {
      const buffer = escposBuilder.buildTextJob({
        text,
        align: options.align,
        fontSize: options.fontSize,
        cut: options.cut
      });

      await sendRawBuffer(printerName, buffer);
      logger.info('✓ Impresión enviada al spooler exitosamente', { printerName });
      return true;

    } catch (error) {
      logger.error('Error al imprimir texto', { error: error.message });
      throw error;
    }
  }

  /**
   * Imprimir factura con formato profesional
   */
  static async printReceipt(printerName, receiptData) {
    try {
      const {
        items,
        total,
        cut = true,
        // Datos del negocio
        businessName,
        businessNit,
        businessAddress,
        businessPhone,
        // Datos de la factura
        invoiceNumber,
        dateTime,
        pointOfSale,
        operator,
        // Datos del cliente
        customer,
        // Método de pago
        paymentMethod,
        change
      } = receiptData;

      // Construir el contenido de texto
      let text = '';
      const WIDTH = 48; // Ancho estándar POS-80C

      // Separador superior
      text += '='.repeat(WIDTH) + '\n';

      // Nombre del negocio (centrado)
      if (businessName) {
        const name = businessName.substring(0, WIDTH);
        const padding = Math.floor((WIDTH - name.length) / 2);
        text += ' '.repeat(padding) + name + '\n';
      }

      // NIT del negocio (centrado)
      if (businessNit) {
        const nitLine = `NIT: ${businessNit}`;
        const padding = Math.floor((WIDTH - nitLine.length) / 2);
        text += ' '.repeat(padding) + nitLine + '\n';
      }

      // Dirección del negocio (centrado)
      if (businessAddress) {
        const addr = businessAddress.substring(0, WIDTH);
        const padding = Math.floor((WIDTH - addr.length) / 2);
        text += ' '.repeat(padding) + addr + '\n';
      }

      // Teléfono (centrado)
      if (businessPhone) {
        const phone = `Tel: ${businessPhone}`;
        const padding = Math.floor((WIDTH - phone.length) / 2);
        text += ' '.repeat(padding) + phone + '\n';
      }

      text += '='.repeat(WIDTH) + '\n';

      // Título "FACTURA DE VENTA"
      const title = 'FACTURA DE VENTA';
      const titlePadding = Math.floor((WIDTH - title.length) / 2);
      text += '\n';
      text += ' '.repeat(titlePadding) + title + '\n';
      text += '\n';

      // Número de factura
      if (invoiceNumber) {
        const numLine = `Número: ${invoiceNumber}`;
        const numPadding = Math.floor((WIDTH - numLine.length) / 2);
        text += ' '.repeat(numPadding) + numLine + '\n';
      }

      // Fecha, hora, PV, operador
      text += '\n';
      if (dateTime) {
        text += dateTime + '\n';
      }
      if (pointOfSale || operator) {
        const pvOp = (pointOfSale ? `PV: ${pointOfSale}` : '') + 
                     (operator ? `  |  Operador: ${operator}` : '');
        text += pvOp.substring(0, WIDTH) + '\n';
      }

      text += '-'.repeat(WIDTH) + '\n';

      // Cliente
      if (customer) {
        text += `CLIENTE: ${customer}\n`;
      } else {
        text += 'CLIENTE: Consumidor Final\n';
      }

      text += '-'.repeat(WIDTH) + '\n';

      // Cabeceras de columnas para items
      text += '\n';
      text += this.formatTableRow(['PRODUCTO', 'CANT', 'PRECIO', 'TOTAL'], [24, 6, 7, 9]);
      text += '-'.repeat(WIDTH) + '\n';

      // Items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          const qty = item.quantity || 1;
          const unitPrice = item.price || 0;
          const itemTotal = unitPrice * qty;

          const name = item.name.substring(0, 24);
          const qtyStr = qty.toString();
          const priceStr = this.formatNumberWithThousands(unitPrice);
          const totalStr = this.formatNumberWithThousands(itemTotal);

          text += this.formatTableRow([name, qtyStr, priceStr, totalStr], [24, 6, 7, 9]);

          if (item.description) {
            const desc = `  ${item.description}`.substring(0, WIDTH);
            text += desc + '\n';
          }
        }
      }

      // Total
      text += '='.repeat(WIDTH) + '\n';
      if (total) {
        const label = 'TOTAL';
        const value = `$${this.formatNumberWithThousands(total)}`;
        const padding = WIDTH - label.length - value.length;
        text += (label + ' '.repeat(Math.max(0, padding)) + value).substring(0, WIDTH) + '\n';
      }
      text += '='.repeat(WIDTH) + '\n';

      // Método de pago y cambio
      text += '\n';
      if (paymentMethod) {
        text += `Método de Pago: ${paymentMethod}\n`;
      }
      if (change !== undefined && change !== null) {
        text += `Cambio: $${this.formatNumberWithThousands(change)}\n`;
      }

      text += '='.repeat(WIDTH) + '\n';

      // Pie de página
      text += '\n';
      const leyenda1 = 'Conserve esta factura como comprobante';
      const leyenda1Padding = Math.floor((WIDTH - leyenda1.length) / 2);
      text += ' '.repeat(leyenda1Padding) + leyenda1 + '\n';

      const leyenda2 = 'de pago';
      const leyenda2Padding = Math.floor((WIDTH - leyenda2.length) / 2);
      text += ' '.repeat(leyenda2Padding) + leyenda2 + '\n';

      const leyenda3 = 'Válido sólo con la firma autorizada';
      const leyenda3Padding = Math.floor((WIDTH - leyenda3.length) / 2);
      text += ' '.repeat(leyenda3Padding) + leyenda3 + '\n';

      text += '\n' + '='.repeat(WIDTH) + '\n\n';

      // Construir buffer completo
      const parts = [];

      // Inicializar impresora
      parts.push(escposBuilder.CMD.INIT);

      // Agregar logo si existe (comandos ESC/POS binarios)
      const logoCommand = imageProcessor.getCachedLogo();
      if (logoCommand) {
        parts.push(logoCommand);
      }

      // Agregar contenido de texto (encoded con CP850)
      const iconv = require('iconv-lite');
      parts.push(iconv.encode(String(text), 'CP850'));

      // Agregar corte si es necesario
      if (cut !== false) {
        parts.push(Buffer.from([0x1b, 0x64, 4])); // Avanzar 4 líneas
        parts.push(escposBuilder.CMD.CUT_FULL);
      }

      const buffer = Buffer.concat(parts);
      await sendRawBuffer(printerName, buffer);
      logger.info('✓ Factura enviada al spooler exitosamente', { printerName, hasLogo: !!imageProcessor.getCachedLogo() });
      return true;

    } catch (error) {
      logger.error('Error al imprimir factura', { error: error.message });
      throw error;
    }
  }

  /**
   * Formatea un número con separador de miles (puntos)
   * @param {number} num - Número a formatear
   * @returns {string} Número formateado con puntos de miles
   */
  static formatNumberWithThousands(num) {
    const rounded = Math.round(num);
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /**
   * Formatea una fila de tabla con columnas alineadas
   * @param {Array<string>} columns - Valores de las columnas
   * @param {Array<number>} widths - Ancho de cada columna
   * @returns {string} Fila formateada
   */
  static formatTableRow(columns, widths) {
    let row = '';
    for (let i = 0; i < columns.length; i++) {
      const col = String(columns[i] || '').substring(0, widths[i]);
      
      if (i === columns.length - 1) {
        // Última columna: alineada a derecha
        row += col.padStart(widths[i]);
      } else {
        // Otras columnas: alineadas a izquierda
        row += col.padEnd(widths[i]);
      }
    }
    return row + '\n';
  }
}

module.exports = WindowsPrinter;
