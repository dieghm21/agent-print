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
 */
router.post('/text', (req, res) => {
  try {
    const { printerId, text, align = 'left', fontSize = 1, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({ success: false, error: 'printerId es requerido' });
    }
    if (!text) {
      return res.status(400).json({ success: false, error: 'text es requerido' });
    }
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
    }

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

    logger.info('Trabajo de impresión de texto encolado', { jobId, printerId, textLength: text.length });

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
 * Imprimir recibo profesional
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
      cut = true 
    } = req.body;

    if (!printerId) {
      return res.status(400).json({ success: false, error: 'printerId es requerido' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items debe ser un array no vacío' });
    }
    if (total === undefined || total === null) {
      return res.status(400).json({ success: false, error: 'total es requerido' });
    }

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
      return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
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
 * POST /api/print/label
 * Imprimir etiqueta con código de barras
 */
router.post('/label', (req, res) => {
  try {
    const { printerId, text, barcode, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({ success: false, error: 'printerId es requerido' });
    }
    if (!barcode?.data) {
      return res.status(400).json({ success: false, error: 'barcode.data es requerido' });
    }
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
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

    logger.info('Trabajo de etiqueta encolado', { jobId, printerId, barcodeData: barcode.data });

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
 */
router.post('/raw', (req, res) => {
  try {
    const { printerId, buffer, cut = true } = req.body;

    if (!printerId) {
      return res.status(400).json({ success: false, error: 'printerId es requerido' });
    }
    if (!buffer) {
      return res.status(400).json({ success: false, error: 'buffer es requerido' });
    }
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
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
      return res.status(404).json({ success: false, error: 'Trabajo no encontrado' });
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
    res.status(500).json({ success: false, error: 'Error al obtener estado del trabajo' });
  }
});

/**
 * GET /api/print/stats
 * Estadísticas de cola
 */
router.get('/stats', (req, res) => {
  try {
    const stats = printQueue.getStats();
    res.json({ success: true, stats });
  } catch (error) {
    logger.error('Error al obtener estadísticas', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
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

  // Encabezado
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

  // Items
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

  // Resumen
  text += '-------------------------------------\n';

  if (subtotal || items) {
    const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const subtotalLabel = 'Subtotal';
    const subtotalValue = `$${sub.toFixed(2)}`;
    const subtotalSpacing = Math.max(1, 37 - subtotalLabel.length - subtotalValue.length);
    text += subtotalLabel + ' '.repeat(subtotalSpacing) + subtotalValue + '\n';
  }

  if (discount && discount > 0) {
    const discountAmount = typeof discount === 'object' ? (discount.amount || 0) : discount;
    const discountLabel = 'Descuento';
    const discountValue = `-$${discountAmount.toFixed(2)}`;
    const discountSpacing = Math.max(1, 37 - discountLabel.length - discountValue.length);
    text += discountLabel + ' '.repeat(discountSpacing) + discountValue + '\n';
  }

  if (tax && tax > 0) {
    const taxLabel = 'Impuesto';
    const taxValue = `$${tax.toFixed(2)}`;
    const taxSpacing = Math.max(1, 37 - taxLabel.length - taxValue.length);
    text += taxLabel + ' '.repeat(taxSpacing) + taxValue + '\n';
  }

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

  // Pie de página
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

  return text;
}

module.exports = router;
