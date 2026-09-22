/**
 * Cola de Impresión
 * Gestiona trabajos de impresión de forma asíncrona
 */

const logger = require('../utils/logger');
const printerManager = require('./printerManager');
const { v4: uuidv4 } = require('uuid');

class PrintQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.jobs = new Map();
    this.MAX_QUEUE_SIZE = process.env.MAX_QUEUE_SIZE || 100;
    this.AUTO_RETRY = process.env.AUTO_RETRY === 'true';
    this.RETRY_ATTEMPTS = parseInt(process.env.RETRY_ATTEMPTS) || 3;
    this.RETRY_DELAY = parseInt(process.env.RETRY_DELAY) || 2000;
  }

  /**
   * Iniciar procesamiento de cola
   */
  start() {
    logger.info('Cola de impresión iniciada');
    this.processQueue();
  }

  /**
   * Agregar trabajo a la cola
   */
  enqueue(printJob) {
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      throw new Error(`Cola llena. Máximo: ${this.MAX_QUEUE_SIZE}`);
    }

    const job = {
      id: uuidv4(),
      ...printJob,
      status: 'pending',
      createdAt: new Date().toISOString(),
      attempts: 0
    };

    this.queue.push(job);
    this.jobs.set(job.id, job);

    logger.info('Trabajo de impresión encolado', {
      jobId: job.id,
      printerId: job.printerId,
      queueLength: this.queue.length
    });

    return job.id;
  }

  /**
   * Obtener estado de trabajo
   */
  getJobStatus(jobId) {
    return this.jobs.get(jobId);
  }

  /**
   * Procesar cola
   */
  async processQueue() {
    while (true) {
      try {
        if (this.queue.length > 0 && !this.processing) {
          this.processing = true;
          const job = this.queue.shift();

          await this.executeJob(job);

          this.processing = false;
        } else {
          // Esperar antes de verificar nuevamente
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        logger.error('Error en cola de procesamiento', { error: error.message });
        this.processing = false;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Ejecutar trabajo de impresión
   */
  async executeJob(job) {
    try {
      job.status = 'processing';
      job.startedAt = new Date().toISOString();

      logger.info('Procesando trabajo de impresión', { jobId: job.id });

      const printer = await printerManager.connectPrinter(job.printerId);

      // Ejecutar comando ESCPOS
      await this.executePrintCommands(printer, job);

      // Cortar papel
      if (job.cut !== false) {
        printer.cut();
      }

      await new Promise(resolve => {
        printer.getBuffer((err, buffer) => {
          if (err) {
            logger.error('Error al obtener buffer', { error: err.message });
          }
          resolve();
        });
      });

      job.status = 'completed';
      job.completedAt = new Date().toISOString();

      logger.info('Trabajo de impresión completado', { jobId: job.id });

    } catch (error) {
      logger.error('Error al ejecutar trabajo', {
        jobId: job.id,
        attempt: job.attempts + 1,
        error: error.message
      });

      job.attempts++;

      // Reintentar si está habilitado
      if (this.AUTO_RETRY && job.attempts < this.RETRY_ATTEMPTS) {
        job.status = 'pending';
        job.nextRetry = new Date(Date.now() + this.RETRY_DELAY).toISOString();
        this.queue.push(job); // Re-encolar

        logger.info('Trabajo re-encolado para reintentos', {
          jobId: job.id,
          attempt: job.attempts,
          nextRetryIn: this.RETRY_DELAY
        });
      } else {
        job.status = 'failed';
        job.error = error.message;
        job.failedAt = new Date().toISOString();

        logger.error('Trabajo de impresión falló definitivamente', {
          jobId: job.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Ejecutar comandos ESCPOS
   */
  async executePrintCommands(printer, job) {
    return new Promise((resolve, reject) => {
      try {
        const printTimeout = parseInt(process.env.PRINT_TIMEOUT) || 30000;

        const timeout = setTimeout(() => {
          reject(new Error('Timeout en operación de impresión'));
        }, printTimeout);

        // Inicializar impresora
        printer.initialize();

        // Procesar comandos según tipo
        if (job.type === 'text') {
          this.printText(printer, job);
        } else if (job.type === 'receipt') {
          this.printReceipt(printer, job);
        } else if (job.type === 'label') {
          this.printLabel(printer, job);
        } else if (job.type === 'raw') {
          this.printRaw(printer, job);
        }

        // Obtener buffer para completar
        printer.getBuffer((err) => {
          clearTimeout(timeout);
          if (err) reject(err);
          else resolve();
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Imprimir texto simple
   */
  printText(printer, job) {
    const { text, align = 'left', fontSize = 1 } = job.content;

    if (align === 'center') printer.align('ct');
    else if (align === 'right') printer.align('rt');

    if (fontSize === 2) printer.setTextSize(2, 2);
    else if (fontSize === 3) printer.setTextSize(3, 3);

    printer.text(text);
    printer.newLine();
  }

  /**
   * Imprimir recibo
   */
  printReceipt(printer, job) {
    const { header, items, footer, total } = job.content;

    printer.align('ct');
    printer.setTextSize(2, 2);

    if (header) {
      printer.text(header.title);
      printer.newLine();
      if (header.subtitle) {
        printer.setTextSize(1, 1);
        printer.text(header.subtitle);
        printer.setTextSize(2, 2);
      }
    }

    printer.newLine();
    printer.align('lt');
    printer.setTextSize(1, 1);
    printer.line('─'.repeat(40));

    if (items && Array.isArray(items)) {
      for (const item of items) {
        const { name, quantity, price } = item;
        const line = `${name} x${quantity}`.padEnd(25) + 
                     `$${price.toFixed(2)}`.padStart(10);
        printer.text(line);
      }
    }

    printer.line('─'.repeat(40));

    if (total) {
      const totalLine = 'TOTAL'.padEnd(25) + `$${total.toFixed(2)}`.padStart(10);
      printer.text(totalLine);
    }

    printer.newLine();
    if (footer) {
      printer.align('ct');
      printer.text(footer);
    }
  }

  /**
   * Imprimir etiqueta
   */
  printLabel(printer, job) {
    const { text, barcode } = job.content;

    printer.align('ct');
    
    if (text) {
      printer.setTextSize(2, 2);
      printer.text(text);
      printer.newLine();
    }

    if (barcode) {
      printer.setTextSize(1, 1);
      printer.barcode(barcode.data, barcode.type || 'CODE128');
    }
  }

  /**
   * Imprimir raw (datos crudos)
   */
  printRaw(printer, job) {
    const { buffer } = job.content;
    
    if (buffer) {
      // Convertir de base64 si es necesario
      const data = typeof buffer === 'string' 
        ? Buffer.from(buffer, 'base64')
        : buffer;
      printer.raw(data);
    }
  }

  /**
   * Detener procesamiento
   */
  async stop() {
    logger.info('Deteniendo cola de impresión...');
    // La función processQueue se detendrá naturalmente
  }

  /**
   * Obtener estadísticas
   */
  getStats() {
    const completed = Array.from(this.jobs.values())
      .filter(job => job.status === 'completed').length;
    
    const failed = Array.from(this.jobs.values())
      .filter(job => job.status === 'failed').length;

    return {
      queueLength: this.queue.length,
      totalJobs: this.jobs.size,
      completedJobs: completed,
      failedJobs: failed,
      isProcessing: this.processing
    };
  }
}

module.exports = new PrintQueue();
