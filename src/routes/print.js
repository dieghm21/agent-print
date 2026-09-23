/**
 * Rutas de Impresión
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const printQueue = require('../services/printQueue');
const printerManager = require('../services/printerManager');

/**
 * POST /api/print/text
 * Imprimir texto simple
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "text": "Contenido a imprimir",
 *   "align": "left|center|right",
 *   "fontSize": 1|2|3,
 *   "cut": true
 * }
 */
router.post('/text', (req, res) => {
  try {
    const { printerId, text, align = 'left', fontSize = 1, cut = true } = req.body;

    // Validar parámetros
    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'text es requerido'
      });
    }

    // Verificar que la impresora existe
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    // Encolar trabajo
    const job = {
      printerId,
      type: 'text',
      content: { text, align, fontSize },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Trabajo encolado exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo de impresión de texto encolado', {
      jobId,
      printerId,
      textLength: text.length
    });

  } catch (error) {
    logger.error('Error al encolar trabajo de texto', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar trabajo',
      message: error.message
    });
  }
});

/**
 * POST /api/print/receipt
 * Imprimir recibo profesional con formato POS
 * 
 * Body:
 * {
 *   "printerId": "pos80c-usb001-fixed",
 *   "header": {
 *     "title": "Mi Tienda",
 *     "subtitle": "Calle 123, Ciudad"
 *   },
 *   "items": [
 *     {
 *       "name": "Café Espresso",
 *       "description": "Taza de 8oz",
 *       "quantity": 2,
 *       "price": 3.50
 *     },
 *     {
 *       "name": "Croissant",
 *       "quantity": 1,
 *       "price": 4.00
 *     }
 *   ],
 *   "subtotal": 11.00,
 *   "discount": 0,
 *   "tax": 1.10,
 *   "total": 12.10,
 *   "paymentMethod": "Efectivo",
 *   "orderNumber": "00123",
 *   "dateTime": "2024-01-15 14:30",
 *   "footer": [
 *     "¡Gracias por su compra!",
 *     "Vuelva pronto"
 *   ],
 *   "cut": true,
 *   "simulate": true
 * }
 */
router.post('/receipt', (req, res) => {
  try {
    const { 
      printerId, 
      header, 
      items, 
      subtotal,
      discount,
      tax,
      total, 
      footer, 
      paymentMethod,
      orderNumber,
      dateTime,
      cut = true,
      simulate = false
    } = req.body;

    // Validar parámetros requeridos
    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'items debe ser un array no vacío'
      });
    }

    if (total === undefined || total === null) {
      return res.status(400).json({
        success: false,
        error: 'total es requerido'
      });
    }

    // Validar estructura de items
    for (const item of items) {
      if (!item.name || !item.price || !item.quantity) {
        return res.status(400).json({
          success: false,
          error: 'Cada item debe tener name, price y quantity'
        });
      }
    }

    // Generar vista previa del recibo
    const previewText = generateReceiptPreview({
      header,
      items,
      subtotal,
      discount,
      tax,
      total,
      footer,
      paymentMethod,
      orderNumber,
      dateTime
    });

    // Validar que la impresora existe
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'receipt',
      content: { 
        header, 
        items, 
        subtotal,
        discount,
        tax,
        total, 
        footer,
        paymentMethod,
        orderNumber,
        dateTime
      },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Recibo encolado exitosamente',
      jobId,
      status: 'pending',
      preview: previewText,
      receipt: {
        itemsCount: items.length,
        total,
        orderNumber
      }
    });

    logger.info('Trabajo de recibo encolado', {
      jobId,
      printerId,
      itemCount: items.length,
      total,
      orderNumber
    });

  } catch (error) {
    logger.error('Error al encolar recibo', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar recibo',
      message: error.message
    });
  }
});

/**
 * Generar vista previa de recibo
 */
function generateReceiptPreview(receiptData) {
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
    dateTime
  } = receiptData;

  let text = '';
  const width = 48; // Ancho estándar POS-80C (48 caracteres)

  // Encabezado
  if (header) {
    text += '\n';
    if (header.title) {
      const title = header.title;
      const spaces = Math.floor((width - title.length) / 2);
      text += ' '.repeat(Math.max(0, spaces)) + title + '\n';
    }
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

  // Items
  text += '\n';
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const qty = item.quantity || 1;
      const unitPrice = item.price || 0;
      const itemTotal = unitPrice * qty;

      let productLine = item.name;
      if (productLine.length > width - 10) {
        productLine = productLine.substring(0, width - 10) + '...';
      }
      text += productLine + '\n';

      const qtyText = `${qty}x`;
      const priceText = `$${unitPrice.toFixed(2)}`;
      const totalText = `$${itemTotal.toFixed(2)}`;

      const spacing = width - qtyText.length - priceText.length - totalText.length - 3;
      text += `${qtyText} ${' '.repeat(spacing)} ${priceText} ${totalText}\n`;

      if (item.description) {
        const desc = `  ${item.description}`;
        text += desc + '\n';
      }

      text += '\n';
    }
  }

  // Resumen
  text += '-'.repeat(width) + '\n';

  if (subtotal || items) {
    const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotalLine = 'Subtotal'.padEnd(width - 10) + `$${sub.toFixed(2)}`.padStart(10);
    text += subtotalLine + '\n';
  }

  if (discount && discount > 0) {
    const discountAmount = typeof discount === 'object' ? (discount.amount || 0) : discount;
    const discountLine = `Descuento`.padEnd(width - 10) + `-$${discountAmount.toFixed(2)}`.padStart(10);
    text += discountLine + '\n';
  }

  if (tax && tax > 0) {
    const taxLine = 'Impuesto'.padEnd(width - 10) + `$${tax.toFixed(2)}`.padStart(10);
    text += taxLine + '\n';
  }

  if (total) {
    text += '='.repeat(width) + '\n';
    const totalLine = 'TOTAL'.padEnd(width - 12) + `$${total.toFixed(2)}`.padStart(12);
    text += totalLine + '\n';
    text += '='.repeat(width) + '\n';
  }

  if (paymentMethod) {
    text += `\nPago: ${paymentMethod}\n`;
  }

  // Pie de página
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

  return text;
}

/**
 * POST /api/print/label
 * Imprimir etiqueta con código de barras
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "text": "Etiqueta",
 *   "barcode": {
 *     "data": "123456789",
 *     "type": "CODE128"
 *   },
 *   "cut": true
 * }
 */
router.post('/label', (req, res) => {
  try {
    const { printerId, text, barcode, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!barcode?.data) {
      return res.status(400).json({
        success: false,
        error: 'barcode.data es requerido'
      });
    }

    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'label',
      content: { text, barcode },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Etiqueta encolada exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo de etiqueta encolado', {
      jobId,
      printerId,
      barcodeData: barcode.data
    });

  } catch (error) {
    logger.error('Error al encolar etiqueta', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar etiqueta',
      message: error.message
    });
  }
});

/**
 * POST /api/print/raw
 * Imprimir datos raw
 * 
 * Body:
 * {
 *   "printerId": "uuid",
 *   "buffer": "base64 encoded data",
 *   "cut": true
 * }
 */
router.post('/raw', (req, res) => {
  try {
    const { printerId, buffer, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({
        success: false,
        error: 'printerId es requerido'
      });
    }

    if (!buffer) {
      return res.status(400).json({
        success: false,
        error: 'buffer es requerido'
      });
    }

    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({
        success: false,
        error: 'Impresora no encontrada'
      });
    }

    const job = {
      printerId,
      type: 'raw',
      content: { buffer },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Datos raw encolados exitosamente',
      jobId,
      status: 'pending'
    });

    logger.info('Trabajo raw encolado', { jobId, printerId });

  } catch (error) {
    logger.error('Error al encolar datos raw', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar datos raw',
      message: error.message
    });
  }
});

/**
 * GET /api/print/job/:jobId
 * Obtener estado de trabajo
 */
router.get('/job/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const job = printQueue.getJobStatus(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Trabajo no encontrado'
      });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        printerId: job.printerId,
        type: job.type,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        error: job.error,
        attempts: job.attempts
      }
    });

  } catch (error) {
    logger.error('Error al obtener estado del trabajo', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al obtener estado del trabajo'
    });
  }
});

/**
 * GET /api/print/stats
 * Estadísticas de cola
 */
router.get('/stats', (req, res) => {
  try {
    const stats = printQueue.getStats();

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    logger.error('Error al obtener estadísticas', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas'
    });
  }
});

module.exports = router;
