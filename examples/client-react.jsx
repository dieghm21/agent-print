/**
 * Cliente React para Agente de Impresoras Térmicas
 * Ejemplo de integración en una aplicación React
 */

import React, { useState, useEffect } from 'react';

const PRINTER_API = 'http://localhost:3001/api';

export function PrinterClient() {
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastJob, setLastJob] = useState(null);

  // Cargar impresoras disponibles
  useEffect(() => {
    loadPrinters();
  }, []);

  const loadPrinters = async () => {
    try {
      const response = await fetch(`${PRINTER_API}/printers`);
      const data = await response.json();
      
      if (data.success) {
        setPrinters(data.printers);
        if (data.printers.length > 0) {
          setSelectedPrinter(data.printers[0].id);
        }
      }
    } catch (error) {
      console.error('Error cargando impresoras:', error);
    }
  };

  // Imprimir texto
  const printText = async () => {
    if (!selectedPrinter) {
      alert('Selecciona una impresora');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${PRINTER_API}/print/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: selectedPrinter,
          text: 'Hola desde React!\nAgente de Impresoras',
          align: 'center',
          fontSize: 2,
          cut: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setLastJob({ id: data.jobId, status: 'pending' });
        checkJobStatus(data.jobId);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Imprimir recibo
  const printReceipt = async () => {
    if (!selectedPrinter) {
      alert('Selecciona una impresora');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${PRINTER_API}/print/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerId: selectedPrinter,
          header: {
            title: 'MI TIENDA',
            subtitle: new Date().toLocaleString()
          },
          items: [
            { name: 'Producto A', quantity: 2, price: 10.50 },
            { name: 'Producto B', quantity: 1, price: 5.00 }
          ],
          total: 25.50,
          footer: '¡Gracias por su compra!',
          cut: true
        })
      });

      const data = await response.json();
      if (data.success) {
        setLastJob({ id: data.jobId, status: 'pending' });
        checkJobStatus(data.jobId);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Verificar estado del trabajo
  const checkJobStatus = async (jobId) => {
    try {
      const response = await fetch(`${PRINTER_API}/print/job/${jobId}`);
      const data = await response.json();
      
      if (data.success) {
        setLastJob(data.job);
        
        // Si está procesando, reintentar en 1 segundo
        if (data.job.status === 'processing') {
          setTimeout(() => checkJobStatus(jobId), 1000);
        }
      }
    } catch (error) {
      console.error('Error verificando estado:', error);
    }
  };

  // Probar impresora
  const testPrinter = async () => {
    if (!selectedPrinter) {
      alert('Selecciona una impresora');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${PRINTER_API}/printers/${selectedPrinter}/test`,
        { method: 'POST' }
      );
      const data = await response.json();
      
      if (data.success) {
        alert('Prueba enviada a la impresora');
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🖨️ Gestor de Impresoras Térmicas</h1>

      <div style={{ marginBottom: '20px' }}>
        <label>Selecciona una impresora:</label>
        <select
          value={selectedPrinter || ''}
          onChange={(e) => setSelectedPrinter(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="">-- Selecciona --</option>
          {printers.map((printer) => (
            <option key={printer.id} value={printer.id}>
              {printer.name} ({printer.status})
            </option>
          ))}
        </select>
        <button
          onClick={loadPrinters}
          style={{ marginLeft: '10px', padding: '5px 10px' }}
        >
          Recargar
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Pruebas</h3>
        <button
          onClick={testPrinter}
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 15px' }}
        >
          Probar Impresora
        </button>
        <button
          onClick={printText}
          disabled={loading}
          style={{ marginRight: '10px', padding: '8px 15px' }}
        >
          Imprimir Texto
        </button>
        <button
          onClick={printReceipt}
          disabled={loading}
          style={{ padding: '8px 15px' }}
        >
          Imprimir Recibo
        </button>
      </div>

      {loading && <p>⏳ Procesando...</p>}

      {lastJob && (
        <div style={{ 
          padding: '10px', 
          border: '1px solid #ccc',
          borderRadius: '5px',
          backgroundColor: lastJob.status === 'completed' ? '#d4edda' : 
                           lastJob.status === 'failed' ? '#f8d7da' : '#fff3cd'
        }}>
          <h4>Último Trabajo</h4>
          <p><strong>ID:</strong> {lastJob.id}</p>
          <p><strong>Estado:</strong> {lastJob.status}</p>
          <p><strong>Tipo:</strong> {lastJob.type}</p>
          <p><strong>Creado:</strong> {new Date(lastJob.createdAt).toLocaleString()}</p>
          {lastJob.completedAt && (
            <p><strong>Completado:</strong> {new Date(lastJob.completedAt).toLocaleString()}</p>
          )}
          {lastJob.error && (
            <p style={{ color: 'red' }}><strong>Error:</strong> {lastJob.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default PrinterClient;
