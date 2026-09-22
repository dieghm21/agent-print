/**
 * Script de Prueba de API
 * Prueba los endpoints del agente de impresión
 */

const http = require('http');

const BASE_URL = 'http://127.0.0.1:3001';

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data
          });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Iniciando pruebas de API...\n');

  try {
    // Prueba 1: Health Check
    console.log('1️⃣  Prueba de Health Check...');
    let result = await makeRequest('GET', '/api/health');
    console.log('   Status:', result.statusCode);
    console.log('   Respuesta:', JSON.stringify(result.data, null, 2));
    console.log();

    // Prueba 2: Listar Impresoras
    console.log('2️⃣  Prueba de Listar Impresoras...');
    result = await makeRequest('GET', '/api/printers');
    console.log('   Status:', result.statusCode);
    console.log('   Respuesta:', JSON.stringify(result.data, null, 2));
    
    if (result.data.printers && result.data.printers.length > 0) {
      const printerId = result.data.printers[0].id;
      console.log('\n   Impresora disponible:', printerId);

      // Prueba 3: Obtener Detalles de Impresora
      console.log('\n3️⃣  Prueba de Obtener Detalles de Impresora...');
      result = await makeRequest('GET', `/api/printers/${printerId}`);
      console.log('   Status:', result.statusCode);
      console.log('   Respuesta:', JSON.stringify(result.data, null, 2));

      // Prueba 4: Encolar Trabajo de Impresión
      console.log('\n4️⃣  Prueba de Encolar Trabajo de Texto...');
      const printJob = {
        printerId,
        text: 'Prueba de Impresión\nAgente de Impresoras Térmicas\n' + new Date().toLocaleString(),
        align: 'center',
        fontSize: 1,
        cut: true
      };
      result = await makeRequest('POST', '/api/print/text', printJob);
      console.log('   Status:', result.statusCode);
      console.log('   Respuesta:', JSON.stringify(result.data, null, 2));

      if (result.data.jobId) {
        const jobId = result.data.jobId;
        
        // Esperar un segundo y verificar estado
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n5️⃣  Prueba de Estado del Trabajo...');
        result = await makeRequest('GET', `/api/print/job/${jobId}`);
        console.log('   Status:', result.statusCode);
        console.log('   Respuesta:', JSON.stringify(result.data, null, 2));
      }

      // Prueba 6: Estadísticas
      console.log('\n6️⃣  Prueba de Estadísticas...');
      result = await makeRequest('GET', '/api/print/stats');
      console.log('   Status:', result.statusCode);
      console.log('   Respuesta:', JSON.stringify(result.data, null, 2));

    } else {
      console.log('\n   ⚠️  No hay impresoras disponibles');
      console.log('   Conecta una impresora térmica USB y reinicia el agente');
    }

    console.log('\n✅ Pruebas completadas');

  } catch (error) {
    console.error('❌ Error en pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
runTests().catch(console.error);
