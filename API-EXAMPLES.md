# 📚 Ejemplos de Uso de API

## 1. cURL - Ejemplos Básicos

### Verificar que el agente está corriendo

```bash
curl http://localhost:3001/api/health
```

### Obtener lista de impresoras

```bash
curl http://localhost:3001/api/printers
```

### Obtener detalles de una impresora

```bash
curl http://localhost:3001/api/printers/{printerId}
```

### Probar impresora

```bash
curl -X POST http://localhost:3001/api/printers/{printerId}/test
```

### Imprimir texto simple

```bash
curl -X POST http://localhost:3001/api/print/text \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "12345-67890",
    "text": "Hola Mundo\nPrueba de impresión",
    "align": "center",
    "fontSize": 2,
    "cut": true
  }'
```

### Imprimir recibo

```bash
curl -X POST http://localhost:3001/api/print/receipt \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "12345-67890",
    "header": {
      "title": "MI TIENDA",
      "subtitle": "Calle Principal 123"
    },
    "items": [
      {
        "name": "Café Americano",
        "quantity": 2,
        "price": 3.50
      },
      {
        "name": "Croissant",
        "quantity": 1,
        "price": 2.50
      }
    ],
    "total": 9.50,
    "footer": "¡Gracias por tu compra!",
    "cut": true
  }'
```

### Imprimir etiqueta con código de barras

```bash
curl -X POST http://localhost:3001/api/print/label \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "12345-67890",
    "text": "Producto XYZ",
    "barcode": {
      "data": "9780134685991",
      "type": "EAN13"
    },
    "cut": true
  }'
```

### Obtener estado de trabajo

```bash
curl http://localhost:3001/api/print/job/{jobId}
```

### Ver estadísticas

```bash
curl http://localhost:3001/api/print/stats
```

## 2. JavaScript/Node.js

### Cliente HTTP básico

```javascript
const http = require('http');

function printText(printerId, text) {
  const postData = JSON.stringify({
    printerId,
    text,
    align: 'center',
    fontSize: 1,
    cut: true
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/print/text',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve(JSON.parse(data));
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Usar
printText('printer-uuid-123', 'Hola desde Node.js')
  .then(result => console.log('Job ID:', result.jobId))
  .catch(error => console.error('Error:', error));
```

### Con Fetch API (Node 18+)

```javascript
async function printReceipt(printerId, items, total) {
  const response = await fetch('http://localhost:3001/api/print/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerId,
      header: {
        title: 'Ticket de Venta',
        subtitle: new Date().toLocaleString()
      },
      items,
      total,
      footer: 'Gracias'
    })
  });

  const data = await response.json();
  return data.jobId;
}

// Usar
const jobId = await printReceipt('printer-id', [
  { name: 'Item 1', quantity: 1, price: 10 }
], 10);

console.log('Trabajo encolado:', jobId);
```

### Con Axios

```javascript
const axios = require('axios');

const client = axios.create({
  baseURL: 'http://localhost:3001/api'
});

async function getPrinters() {
  const { data } = await client.get('/printers');
  return data.printers;
}

async function printText(printerId, text) {
  const { data } = await client.post('/print/text', {
    printerId,
    text,
    align: 'center',
    cut: true
  });
  return data.jobId;
}

async function checkJobStatus(jobId) {
  const { data } = await client.get(`/print/job/${jobId}`);
  return data.job;
}

// Usar
(async () => {
  const printers = await getPrinters();
  console.log('Impresoras:', printers);

  if (printers.length > 0) {
    const jobId = await printText(printers[0].id, 'Prueba');
    console.log('Job ID:', jobId);

    // Monitorear estado
    const status = await checkJobStatus(jobId);
    console.log('Estado:', status.status);
  }
})();
```

## 3. Python

### Con requests

```python
import requests
import json

BASE_URL = 'http://localhost:3001/api'

def get_printers():
    response = requests.get(f'{BASE_URL}/printers')
    return response.json()['printers']

def print_text(printer_id, text):
    payload = {
        'printerId': printer_id,
        'text': text,
        'align': 'center',
        'fontSize': 1,
        'cut': True
    }
    
    response = requests.post(f'{BASE_URL}/print/text', json=payload)
    return response.json()['jobId']

def print_receipt(printer_id, items, total):
    payload = {
        'printerId': printer_id,
        'header': {
            'title': 'RECIBO',
            'subtitle': 'Fecha: ' + str(datetime.now())
        },
        'items': items,
        'total': total,
        'footer': 'Gracias',
        'cut': True
    }
    
    response = requests.post(f'{BASE_URL}/print/receipt', json=payload)
    return response.json()['jobId']

def check_job_status(job_id):
    response = requests.get(f'{BASE_URL}/print/job/{job_id}')
    return response.json()['job']

# Usar
printers = get_printers()
print(f'Impresoras disponibles: {len(printers)}')

if printers:
    job_id = print_text(printers[0]['id'], 'Prueba desde Python')
    print(f'Job ID: {job_id}')
    
    status = check_job_status(job_id)
    print(f'Estado: {status["status"]}')
```

### Con asyncio y aiohttp

```python
import asyncio
import aiohttp

BASE_URL = 'http://localhost:3001/api'

async def print_text(session, printer_id, text):
    payload = {
        'printerId': printer_id,
        'text': text,
        'cut': True
    }
    
    async with session.post(f'{BASE_URL}/print/text', json=payload) as resp:
        return (await resp.json())['jobId']

async def monitor_job(session, job_id):
    while True:
        async with session.get(f'{BASE_URL}/print/job/{job_id}') as resp:
            job = (await resp.json())['job']
            print(f"Estado: {job['status']}")
            
            if job['status'] in ['completed', 'failed']:
                break
        
        await asyncio.sleep(1)

async def main():
    async with aiohttp.ClientSession() as session:
        job_id = await print_text(session, 'printer-id', 'Hola Async')
        await monitor_job(session, job_id)

asyncio.run(main())
```

## 4. PHP

```php
<?php

class PrinterClient {
    private $baseUrl = 'http://localhost:3001/api';
    
    public function getPrinters() {
        return $this->request('GET', '/printers');
    }
    
    public function printText($printerId, $text, $options = []) {
        $payload = array_merge([
            'printerId' => $printerId,
            'text' => $text,
            'align' => 'left',
            'fontSize' => 1,
            'cut' => true
        ], $options);
        
        return $this->request('POST', '/print/text', $payload);
    }
    
    public function printReceipt($printerId, $header, $items, $total, $options = []) {
        $payload = array_merge([
            'printerId' => $printerId,
            'header' => $header,
            'items' => $items,
            'total' => $total,
            'cut' => true
        ], $options);
        
        return $this->request('POST', '/print/receipt', $payload);
    }
    
    public function getJobStatus($jobId) {
        return $this->request('GET', "/print/job/$jobId");
    }
    
    private function request($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $options = [
            'http' => [
                'method' => $method,
                'header' => 'Content-Type: application/json',
                'timeout' => 30
            ]
        ];
        
        if ($data) {
            $options['http']['content'] = json_encode($data);
        }
        
        $context = stream_context_create($options);
        $response = file_get_contents($url, false, $context);
        
        return json_decode($response, true);
    }
}

// Usar
$client = new PrinterClient();

$printers = $client->getPrinters();
echo "Impresoras: " . count($printers['printers']) . "\n";

if (!empty($printers['printers'])) {
    $result = $client->printText(
        $printers['printers'][0]['id'],
        'Hola desde PHP'
    );
    
    echo "Job ID: " . $result['jobId'] . "\n";
}
?>
```

## 5. PowerShell

```powershell
function Get-Printers {
    $uri = "http://localhost:3001/api/printers"
    $response = Invoke-RestMethod -Uri $uri -Method Get
    return $response.printers
}

function Print-Text {
    param(
        [Parameter(Mandatory=$true)] $PrinterId,
        [Parameter(Mandatory=$true)] $Text,
        $Align = "left",
        $FontSize = 1
    )
    
    $body = @{
        printerId = $PrinterId
        text = $Text
        align = $Align
        fontSize = $FontSize
        cut = $true
    } | ConvertTo-Json
    
    $uri = "http://localhost:3001/api/print/text"
    $response = Invoke-RestMethod -Uri $uri -Method Post -Body $body -ContentType "application/json"
    return $response.jobId
}

function Get-JobStatus {
    param([Parameter(Mandatory=$true)] $JobId)
    
    $uri = "http://localhost:3001/api/print/job/$JobId"
    $response = Invoke-RestMethod -Uri $uri -Method Get
    return $response.job
}

# Usar
$printers = Get-Printers
Write-Host "Impresoras: $($printers.Count)"

if ($printers.Count -gt 0) {
    $jobId = Print-Text -PrinterId $printers[0].id -Text "Hola PowerShell"
    Write-Host "Job ID: $jobId"
    
    $status = Get-JobStatus -JobId $jobId
    Write-Host "Estado: $($status.status)"
}
```

## 6. Bash/Shell Script

```bash
#!/bin/bash

BASE_URL="http://localhost:3001/api"

# Obtener impresoras
get_printers() {
    curl -s "$BASE_URL/printers" | jq '.printers'
}

# Imprimir texto
print_text() {
    local printer_id=$1
    local text=$2
    
    curl -s -X POST "$BASE_URL/print/text" \
        -H "Content-Type: application/json" \
        -d "{
            \"printerId\": \"$printer_id\",
            \"text\": \"$text\",
            \"align\": \"center\",
            \"cut\": true
        }" | jq '.jobId'
}

# Obtener estado
check_status() {
    local job_id=$1
    curl -s "$BASE_URL/print/job/$job_id" | jq '.job.status'
}

# Uso
echo "Obteniendo impresoras..."
printers=$(get_printers)
printer_id=$(echo "$printers" | jq -r '.[0].id')

echo "Enviando trabajo de impresión..."
job_id=$(print_text "$printer_id" "Hola desde Bash")

echo "Job ID: $job_id"
echo "Estado: $(check_status $job_id)"
```

## 7. cURL con Proxy/Headers Personalizados

```bash
# Usando proxy
curl -x http://proxy.empresa.com:8080 \
  http://localhost:3001/api/printers

# Con autenticación personalizada
curl -H "Authorization: Bearer token123" \
  http://localhost:3001/api/printers

# Con múltiples headers
curl -H "Content-Type: application/json" \
  -H "X-Custom-Header: valor" \
  -H "User-Agent: MiApp/1.0" \
  http://localhost:3001/api/health

# Mostrar headers de respuesta
curl -i http://localhost:3001/api/health

# Guardar respuesta en archivo
curl http://localhost:3001/api/printers > printers.json
```

---

Para más información, consulta `README.md` o `DEPLOYMENT.md`
