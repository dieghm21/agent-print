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
 * Imprimir factura profesional
 */
router.post('/receipt', (req, res) => {
  try {
    const { 
      printerId, 
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

    // Validar que la impresora existe
    if (!printerManager.getPrinter(printerId)) {
      return res.status(404).json({ success: false, error: 'Impresora no encontrada' });
    }

    const job = {
      printerId,
      type: 'receipt',
      content: { 
        items,
        total,
        businessName,
        businessNit,
        businessAddress,
        businessPhone,
        invoiceNumber,
        dateTime,
        pointOfSale,
        operator,
        customer,
        paymentMethod,
        change
      },
      cut
    };

    const jobId = printQueue.enqueue(job);

    res.status(202).json({
      success: true,
      message: 'Factura encolada exitosamente',
      jobId,
      status: 'pending',
      receipt: {
        itemsCount: items.length,
        total,
        invoiceNumber
      }
    });

    logger.info('Trabajo de factura encolado', {
      jobId,
      printerId,
      itemCount: items.length,
      total,
      invoiceNumber
    });

  } catch (error) {
    logger.error('Error al encolar factura', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Error al encolar factura',
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
 * POST /api/print/receipt/html
 * Generar HTML del recibo para imprimir desde navegador
 */
router.post('/receipt/html', (req, res) => {
  try {
    const { 
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
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'items es requerido' });
    }

    const html = generateReceiptHTML({
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (error) {
    logger.error('Error al generar HTML', { error: error.message });
    res.status(500).json({ success: false, error: 'Error al generar HTML' });
  }
});

/**
 * Generar HTML del recibo para impresora térmica
 */
function generateReceiptHTML(receiptData) {
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

  let html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recibo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 0;
            background: white;
        }
        
        @page {
            size: 80mm auto;
            margin: 0;
            padding: 0;
        }
        
        .receipt {
            width: 100%;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        
        .title {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
        }
        
        .subtitle {
            font-size: 11px;
            margin-bottom: 5px;
        }
        
        .separator-line {
            display: block;
            margin: 5px 0;
        }
        
        .order-info {
            font-size: 11px;
            margin-bottom: 5px;
        }
        
        .items {
            margin: 10px 0;
        }
        
        .item {
            margin-bottom: 10px;
        }
        
        .item-name {
            font-weight: bold;
            margin-bottom: 2px;
        }
        
        .item-qty-price {
            font-size: 11px;
            display: flex;
            justify-content: space-between;
        }
        
        .item-description {
            font-size: 10px;
            color: #666;
            margin-top: 2px;
            margin-left: 10px;
        }
        
        .summary {
            margin: 10px 0;
            font-size: 11px;
        }
        
        .summary-line {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        
        .summary-label {
            flex: 1;
        }
        
        .summary-value {
            text-align: right;
            min-width: 60px;
        }
        
        .total-line {
            font-weight: bold;
            font-size: 13px;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 3px 0;
            margin: 5px 0;
        }
        
        .payment-method {
            font-size: 11px;
            margin: 5px 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 10px;
            font-size: 11px;
        }
        
        .footer-line {
            margin: 3px 0;
        }
        
        @media print {
            body {
                margin: 0;
                padding: 0;
                width: 80mm;
            }
            .receipt {
                margin: 0;
                padding: 0;
            }
        }
    </style>
</head>
<body>
    <div class="receipt">
`;

  // Encabezado
  if (header) {
    html += '        <div class="header">\n';
    if (header.title) {
      html += `            <div class="title">${escapeHtml(header.title)}</div>\n`;
    }
    if (header.subtitle) {
      html += `            <div class="subtitle">${escapeHtml(header.subtitle)}</div>\n`;
    }
    html += '            <span class="separator-line">=====================================</span>\n';
    html += '        </div>\n';
  }

  // Orden y fecha
  if (orderNumber || dateTime) {
    if (orderNumber) {
      html += `        <div class="order-info">Orden: ${escapeHtml(orderNumber)}</div>\n`;
    }
    if (dateTime) {
      html += `        <div class="order-info">${escapeHtml(dateTime)}</div>\n`;
    }
    html += '        <span class="separator-line">-------------------------------------</span>\n';
  }

  // Items
  html += '        <div class="items">\n';
  if (items && Array.isArray(items)) {
    for (const item of items) {
      const qty = item.quantity || 1;
      const unitPrice = item.price || 0;
      const itemTotal = unitPrice * qty;

      html += '            <div class="item">\n';
      html += `                <div class="item-name">${escapeHtml(item.name)}</div>\n`;
      html += `                <div class="item-qty-price"><span>${qty}x $${unitPrice.toFixed(2)}</span><span>$${itemTotal.toFixed(2)}</span></div>\n`;
      
      if (item.description) {
        html += `                <div class="item-description">${escapeHtml(item.description)}</div>\n`;
      }
      
      html += '            </div>\n';
    }
  }
  html += '        </div>\n';

  // Resumen
  html += '        <span class="separator-line">-------------------------------------</span>\n';
  html += '        <div class="summary">\n';

  if (subtotal || items) {
    const sub = subtotal || items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    html += `            <div class="summary-line"><span class="summary-label">Subtotal</span><span class="summary-value">$${sub.toFixed(2)}</span></div>\n`;
  }

  if (discount && discount > 0) {
    const discountAmount = typeof discount === 'object' ? (discount.amount || 0) : discount;
    html += `            <div class="summary-line"><span class="summary-label">Descuento</span><span class="summary-value">-$${discountAmount.toFixed(2)}</span></div>\n`;
  }

  if (tax && tax > 0) {
    html += `            <div class="summary-line"><span class="summary-label">Impuesto</span><span class="summary-value">$${tax.toFixed(2)}</span></div>\n`;
  }

  if (total) {
    html += `            <div class="total-line"><span class="summary-label">TOTAL</span><span class="summary-value">$${total.toFixed(2)}</span></div>\n`;
  }

  html += '        </div>\n';

  if (paymentMethod) {
    html += `        <div class="payment-method">Pago: ${escapeHtml(paymentMethod)}</div>\n`;
  }

  // Footer
  html += '        <div class="footer">\n';
  if (footer) {
    if (Array.isArray(footer)) {
      for (const line of footer) {
        html += `            <div class="footer-line">${escapeHtml(line)}</div>\n`;
      }
    } else {
      html += `            <div class="footer-line">${escapeHtml(footer)}</div>\n`;
    }
  }
  html += '        </div>\n';

  html += `    </div>
    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>`;

  return html;
}

/**
 * Escapar HTML para prevenir inyecciones
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

/**
 * Generar vista previa en texto del recibo
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
  const WIDTH = 48; // Ancho estándar POS-80C en caracteres

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

      // Nombre del producto
      const name = item.name.substring(0, WIDTH);
      text += name + '\n';

      // Cantidad, precio unitario y total
      const qtyStr = `${qty}x `;
      const priceStr = `$${unitPrice.toFixed(2)}`;
      const totalStr = `$${itemTotal.toFixed(2)}`;
      
      // Espacio disponible
      const availSpace = WIDTH - qtyStr.length - priceStr.length - totalStr.length - 1;
      const line = qtyStr + ' '.repeat(Math.max(0, availSpace)) + priceStr + ' ' + totalStr;
      text += line.substring(0, WIDTH) + '\n';

      // Descripción si existe
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

  return text;
}

module.exports = router;
