/**
 * Cola de Impresión
 * Gestiona trabajos de impresión de forma asíncrona
 */

const logger = require('../utils/logger');
const printerManager = require('./printerManager');
const windowsPrinter = require('./windowsPrinter');
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

      // Ejecutar comandos de impresión (windowsPrinter maneja todo)
      await this.executePrintCommands(job);

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
   * Ejecutar comandos de impresión
   */
  async executePrintCommands(job) {
    return new Promise((resolve, reject) => {
      try {
        const printTimeout = parseInt(process.env.PRINT_TIMEOUT) || 30000;

        const timeout = setTimeout(() => {
          reject(new Error('Timeout en operación de impresión'));
        }, printTimeout);

        // Procesar según tipo
        try {
          if (job.type === 'text') {
            windowsPrinter.printText('POS-80C', job.content.text, {
              align: job.content.align || 'left',
              fontSize: job.content.fontSize || 1,
              cut: job.cut !== false
            });
          } else if (job.type === 'receipt') {
            windowsPrinter.printReceipt('POS-80C', job.content);
          } else if (job.type === 'label') {
            const text = job.content.text || '';
            const barcode = job.content.barcode?.data || '';
            windowsPrinter.printText('POS-80C', text + '\n' + barcode, { cut: job.cut !== false });
          }

          clearTimeout(timeout);
          logger.info('✓ Impresión completada', { jobId: job.id, type: job.type });
          resolve();

        } catch (printError) {
          clearTimeout(timeout);
          reject(printError);
        }

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Imprimir texto simple
   */
  printText(printer, job) {
    logger.info('Texto a imprimir', { text: job.content.text });
  }

  /**
   * Imprimir recibo
   */
  printReceipt(printer, job) {
    logger.info('Recibo a imprimir', { items: job.content.items?.length });
  }

  /**
   * Imprimir etiqueta
   */
  printLabel(printer, job) {
    logger.info('Etiqueta a imprimir', { barcode: job.content.barcode?.data });
  }

  /**
   * Imprimir raw
   */
  printRaw(printer, job) {
    logger.info('Datos raw a imprimir');
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
