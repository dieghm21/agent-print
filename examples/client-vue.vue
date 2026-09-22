<!--
  Cliente Vue 3 para Agente de Impresoras Térmicas
  Ejemplo de integración en una aplicación Vue
-->

<template>
  <div class="printer-client">
    <h1>🖨️ Gestor de Impresoras Térmicas</h1>

    <div class="section">
      <label for="printer-select">Selecciona una impresora:</label>
      <select
        id="printer-select"
        v-model="selectedPrinter"
        @change="onPrinterChange"
      >
        <option value="">-- Selecciona --</option>
        <option v-for="printer in printers" :key="printer.id" :value="printer.id">
          {{ printer.name }} ({{ printer.status }})
        </option>
      </select>
      <button @click="loadPrinters">Recargar</button>
    </div>

    <div class="section">
      <h3>Pruebas</h3>
      <button @click="testPrinter" :disabled="loading">Probar Impresora</button>
      <button @click="printText" :disabled="loading">Imprimir Texto</button>
      <button @click="printReceipt" :disabled="loading">Imprimir Recibo</button>
    </div>

    <div v-if="loading" class="loading">
      ⏳ Procesando...
    </div>

    <div v-if="lastJob" :class="['job-status', lastJob.status]">
      <h4>Último Trabajo</h4>
      <p><strong>ID:</strong> {{ lastJob.id }}</p>
      <p><strong>Estado:</strong> {{ lastJob.status }}</p>
      <p><strong>Tipo:</strong> {{ lastJob.type }}</p>
      <p><strong>Creado:</strong> {{ formatDate(lastJob.createdAt) }}</p>
      <p v-if="lastJob.completedAt">
        <strong>Completado:</strong> {{ formatDate(lastJob.completedAt) }}
      </p>
      <p v-if="lastJob.error" class="error">
        <strong>Error:</strong> {{ lastJob.error }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const PRINTER_API = 'http://localhost:3001/api';

const printers = ref([]);
const selectedPrinter = ref(null);
const loading = ref(false);
const lastJob = ref(null);

// Cargar impresoras disponibles
const loadPrinters = async () => {
  try {
    const response = await fetch(`${PRINTER_API}/printers`);
    const data = await response.json();

    if (data.success) {
      printers.value = data.printers;
      if (data.printers.length > 0 && !selectedPrinter.value) {
        selectedPrinter.value = data.printers[0].id;
      }
    }
  } catch (error) {
    console.error('Error cargando impresoras:', error);
  }
};

// Cuando cambia la impresora seleccionada
const onPrinterChange = () => {
  lastJob.value = null;
};

// Imprimir texto
const printText = async () => {
  if (!selectedPrinter.value) {
    alert('Selecciona una impresora');
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(`${PRINTER_API}/print/text`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: selectedPrinter.value,
        text: 'Hola desde Vue!\nAgente de Impresoras',
        align: 'center',
        fontSize: 2,
        cut: true
      })
    });

    const data = await response.json();
    if (data.success) {
      lastJob.value = { id: data.jobId, status: 'pending' };
      checkJobStatus(data.jobId);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// Imprimir recibo
const printReceipt = async () => {
  if (!selectedPrinter.value) {
    alert('Selecciona una impresora');
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(`${PRINTER_API}/print/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: selectedPrinter.value,
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
      lastJob.value = { id: data.jobId, status: 'pending' };
      checkJobStatus(data.jobId);
    } else {
      alert('Error: ' + data.error);
    }
  } catch (error) {
    alert('Error: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// Verificar estado del trabajo
const checkJobStatus = async (jobId) => {
  try {
    const response = await fetch(`${PRINTER_API}/print/job/${jobId}`);
    const data = await response.json();

    if (data.success) {
      lastJob.value = data.job;

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
  if (!selectedPrinter.value) {
    alert('Selecciona una impresora');
    return;
  }

  loading.value = true;
  try {
    const response = await fetch(
      `${PRINTER_API}/printers/${selectedPrinter.value}/test`,
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
    loading.value = false;
  }
};

// Formatear fecha
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleString();
};

onMounted(() => {
  loadPrinters();
});
</script>

<style scoped>
.printer-client {
  padding: 20px;
  font-family: Arial, sans-serif;
  max-width: 600px;
  margin: 0 auto;
}

.section {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f5f5;
  border-radius: 5px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

select {
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ddd;
  border-radius: 3px;
}

button {
  padding: 8px 15px;
  margin-right: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.loading {
  padding: 10px;
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 5px;
  margin-bottom: 15px;
}

.job-status {
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-top: 15px;
}

.job-status.pending {
  background-color: #fff3cd;
  border-color: #ffc107;
}

.job-status.processing {
  background-color: #e7f3ff;
  border-color: #2196f3;
}

.job-status.completed {
  background-color: #d4edda;
  border-color: #28a745;
}

.job-status.failed {
  background-color: #f8d7da;
  border-color: #dc3545;
}

.error {
  color: #dc3545;
}

h1, h3, h4 {
  margin-top: 0;
}

p {
  margin: 8px 0;
}
</style>
