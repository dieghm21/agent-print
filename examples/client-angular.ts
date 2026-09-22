/**
 * Servicio Angular para Agente de Impresoras Térmicas
 * Ejemplo de integración en una aplicación Angular
 */

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { map, switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

export interface Printer {
  id: string;
  name: string;
  vendor: string;
  product: string;
  status: string;
  lastConnected: string;
}

export interface PrintJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  printerId: string;
  type: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  attempts: number;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

@Injectable({
  providedIn: 'root'
})
export class PrinterService {
  private readonly PRINTER_API = 'http://localhost:3001/api';

  constructor(private http: HttpClient) {}

  /**
   * Obtener lista de impresoras disponibles
   */
  getPrinters(): Observable<Printer[]> {
    return this.http.get<any>(`${this.PRINTER_API}/printers`)
      .pipe(map(response => response.printers || []));
  }

  /**
   * Obtener detalles de una impresora
   */
  getPrinter(printerId: string): Observable<Printer> {
    return this.http.get<any>(`${this.PRINTER_API}/printers/${printerId}`)
      .pipe(map(response => response.printer));
  }

  /**
   * Probar impresora
   */
  testPrinter(printerId: string): Observable<any> {
    return this.http.post(`${this.PRINTER_API}/printers/${printerId}/test`, {});
  }

  /**
   * Escanear impresoras
   */
  scanPrinters(): Observable<Printer[]> {
    return this.http.post<any>(`${this.PRINTER_API}/printers/scan/now`, {})
      .pipe(map(response => response.printers || []));
  }

  /**
   * Imprimir texto
   */
  printText(
    printerId: string,
    text: string,
    align: 'left' | 'center' | 'right' = 'left',
    fontSize: number = 1,
    cut: boolean = true
  ): Observable<string> {
    return this.http.post<any>(`${this.PRINTER_API}/print/text`, {
      printerId,
      text,
      align,
      fontSize,
      cut
    }).pipe(map(response => response.jobId));
  }

  /**
   * Imprimir recibo
   */
  printReceipt(
    printerId: string,
    header: { title: string; subtitle?: string },
    items: ReceiptItem[],
    total: number,
    footer?: string,
    cut: boolean = true
  ): Observable<string> {
    return this.http.post<any>(`${this.PRINTER_API}/print/receipt`, {
      printerId,
      header,
      items,
      total,
      footer,
      cut
    }).pipe(map(response => response.jobId));
  }

  /**
   * Imprimir etiqueta con código de barras
   */
  printLabel(
    printerId: string,
    text: string,
    barcodeData: string,
    barcodeType: string = 'CODE128',
    cut: boolean = true
  ): Observable<string> {
    return this.http.post<any>(`${this.PRINTER_API}/print/label`, {
      printerId,
      text,
      barcode: {
        data: barcodeData,
        type: barcodeType
      },
      cut
    }).pipe(map(response => response.jobId));
  }

  /**
   * Imprimir datos raw
   */
  printRaw(printerId: string, buffer: string, cut: boolean = true): Observable<string> {
    return this.http.post<any>(`${this.PRINTER_API}/print/raw`, {
      printerId,
      buffer,
      cut
    }).pipe(map(response => response.jobId));
  }

  /**
   * Obtener estado de trabajo
   */
  getJobStatus(jobId: string): Observable<PrintJob> {
    return this.http.get<any>(`${this.PRINTER_API}/print/job/${jobId}`)
      .pipe(map(response => response.job));
  }

  /**
   * Monitorear estado de trabajo
   */
  monitorJobStatus(jobId: string, pollInterval: number = 1000): Observable<PrintJob> {
    const stop$ = new Subject<void>();

    return interval(pollInterval).pipe(
      switchMap(() => this.getJobStatus(jobId)),
      takeUntil(stop$)
    );
  }

  /**
   * Obtener estadísticas
   */
  getStats(): Observable<any> {
    return this.http.get<any>(`${this.PRINTER_API}/print/stats`)
      .pipe(map(response => response.stats));
  }

  /**
   * Health check
   */
  healthCheck(): Observable<any> {
    return this.http.get<any>(`${this.PRINTER_API}/health`);
  }
}

// ============================================================================
// COMPONENTE DE EJEMPLO
// ============================================================================

import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-printer-client',
  templateUrl: './printer-client.component.html',
  styleUrls: ['./printer-client.component.css']
})
export class PrinterClientComponent implements OnInit {
  printers: Printer[] = [];
  selectedPrinterId: string | null = null;
  loading = false;
  lastJob: PrintJob | null = null;

  constructor(private printerService: PrinterService) {}

  ngOnInit(): void {
    this.loadPrinters();
  }

  loadPrinters(): void {
    this.printerService.getPrinters().subscribe({
      next: (printers) => {
        this.printers = printers;
        if (printers.length > 0 && !this.selectedPrinterId) {
          this.selectedPrinterId = printers[0].id;
        }
      },
      error: (error) => {
        console.error('Error cargando impresoras:', error);
        alert('Error cargando impresoras');
      }
    });
  }

  testPrinter(): void {
    if (!this.selectedPrinterId) {
      alert('Selecciona una impresora');
      return;
    }

    this.loading = true;
    this.printerService.testPrinter(this.selectedPrinterId).subscribe({
      next: () => {
        alert('Prueba enviada a la impresora');
      },
      error: (error) => {
        alert('Error: ' + error.message);
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  printText(): void {
    if (!this.selectedPrinterId) {
      alert('Selecciona una impresora');
      return;
    }

    this.loading = true;
    this.printerService.printText(
      this.selectedPrinterId,
      'Hola desde Angular!\nAgente de Impresoras',
      'center',
      2,
      true
    ).subscribe({
      next: (jobId) => {
        this.lastJob = { id: jobId, status: 'pending' } as PrintJob;
        this.monitorJob(jobId);
      },
      error: (error) => {
        alert('Error: ' + error.message);
        this.loading = false;
      }
    });
  }

  printReceipt(): void {
    if (!this.selectedPrinterId) {
      alert('Selecciona una impresora');
      return;
    }

    this.loading = true;
    this.printerService.printReceipt(
      this.selectedPrinterId,
      {
        title: 'MI TIENDA',
        subtitle: new Date().toLocaleString()
      },
      [
        { name: 'Producto A', quantity: 2, price: 10.50 },
        { name: 'Producto B', quantity: 1, price: 5.00 }
      ],
      25.50,
      '¡Gracias por su compra!',
      true
    ).subscribe({
      next: (jobId) => {
        this.lastJob = { id: jobId, status: 'pending' } as PrintJob;
        this.monitorJob(jobId);
      },
      error: (error) => {
        alert('Error: ' + error.message);
        this.loading = false;
      }
    });
  }

  private monitorJob(jobId: string): void {
    this.printerService.getJobStatus(jobId).subscribe({
      next: (job) => {
        this.lastJob = job;
        if (job.status === 'processing') {
          setTimeout(() => this.monitorJob(jobId), 1000);
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('Error monitoreando trabajo:', error);
        this.loading = false;
      }
    });
  }
}
