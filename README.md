# 🖨️ Agente Local de Impresoras Térmicas

Servicio API REST que actúa como intermediario entre aplicaciones web y impresoras térmicas ESCPOS. Permite que fronts se conecten a impresoras térmicas locales mediante una API REST simple.

**📚 [Ver Resumen Ejecutivo](SUMMARY.md)** | **⚡ [Inicio Rápido](QUICKSTART.md)** | **📁 [Estructura](STRUCTURE.md)**

## Características

✅ **API REST** - Endpoints simples para gestionar impresoras y trabajos de impresión
✅ **Auto-detección USB** - Detecta automáticamente impresoras térmicas conectadas
✅ **Cola de Impresión** - Gestiona trabajos de forma asíncrona
✅ **Reintentos Automáticos** - Reintenta trabajos fallidos
✅ **Múltiples Formatos** - Soporte para texto, recibos, etiquetas y datos raw
✅ **Instalador Automático** - Se instala como servicio del sistema
✅ **Cross-platform** - Windows, macOS y Linux

## Instalación

### 1. Clonar/Descargar el repositorio

```bash
cd agent-print
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
# Editar .env si es necesario
```

### 4. (Opcional) Instalar como servicio del sistema

**Windows (como Administrador):**
```bash
npm run install-service
```

**macOS:**
```bash
npm run install-service
```

**Linux (con sudo):**
```bash
sudo npm run install-service
```

## Uso

### Iniciar el agente

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

El agente escuchará en `http://127.0.0.1:3001` por defecto.

### Pruebas

```bash
npm test
```

Esto ejecutará pruebas básicas de los endpoints.

## Documentación de API

### 1. Health Check

```http
GET /api/health
```

Respuesta:
```json
{
  "success": true,
  "status": "healthy",
  "queue": {
    "queueLength": 0,
    "totalJobs": 5,
    "completedJobs": 5,
    "failedJobs": 0
  }
}
```

### 2. Listar Impresoras

```http
GET /api/printers
```

Respuesta:
```json
{
  "success": true,
  "count": 2,
  "printers": [
    {
      "id": "uuid-1",
      "name": "Thermal Printer 001",
      "vendor": "0x0483",
      "product": "0x1234",
      "status": "connected",
      "lastConnected": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Obtener Detalles de Impresora

```http
GET /api/printers/{printerId}
```

### 4. Probar Impresora

```http
POST /api/printers/{printerId}/test
```

Imprime un mensaje de prueba.

### 5. Imprimir Texto

```http
POST /api/print/text
Content-Type: application/json

{
  "printerId": "uuid",
  "text": "Contenido a imprimir",
  "align": "center",
  "fontSize": 1,
  "cut": true
}
```

**Parámetros:**
- `printerId` (requerido): ID de la impresora
- `text` (requerido): Texto a imprimir
- `align`: `left|center|right` (default: `left`)
- `fontSize`: `1|2|3` (default: `1`)
- `cut`: `true|false` (default: `true`) - Cortar papel

Respuesta:
```json
{
  "success": true,
  "jobId": "uuid-job",
  "status": "pending"
}
```

### 6. Imprimir Recibo

```http
POST /api/print/receipt
Content-Type: application/json

{
  "printerId": "uuid",
  "header": {
    "title": "Mi Tienda",
    "subtitle": "Dirección"
  },
  "items": [
    {
      "name": "Producto A",
      "quantity": 2,
      "price": 10.50
    },
    {
      "name": "Producto B",
      "quantity": 1,
      "price": 5.00
    }
  ],
  "total": 25.50,
  "footer": "¡Gracias por su compra!",
  "cut": true
}
```

### 7. Imprimir Etiqueta

```http
POST /api/print/label
Content-Type: application/json

{
  "printerId": "uuid",
  "text": "Código de Producto",
  "barcode": {
    "data": "123456789",
    "type": "CODE128"
  },
  "cut": true
}
```

**Tipos de código de barras:** `CODE128`, `CODE39`, `EAN13`, `EAN8`, `UPCA`, `UPCE`

### 8. Imprimir Datos Raw

```http
POST /api/print/raw
Content-Type: application/json

{
  "printerId": "uuid",
  "buffer": "base64-encoded-data",
  "cut": true
}
```

### 9. Obtener Estado de Trabajo

```http
GET /api/print/job/{jobId}
```

Respuesta:
```json
{
  "success": true,
  "job": {
    "id": "uuid-job",
    "status": "completed|pending|processing|failed",
    "printerId": "uuid",
    "type": "text|receipt|label|raw",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "startedAt": "2024-01-15T10:30:01.000Z",
    "completedAt": "2024-01-15T10:30:02.000Z",
    "attempts": 1
  }
}
```

### 10. Estadísticas

```http
GET /api/print/stats
```

Respuesta:
```json
{
  "success": true,
  "stats": {
    "queueLength": 2,
    "totalJobs": 15,
    "completedJobs": 12,
    "failedJobs": 1,
    "isProcessing": true
  }
}
```

## Ejemplo de Uso desde Frontend

### React/Vue/Angular

```javascript
// Obtener lista de impresoras
async function getPrinters() {
  const response = await fetch('http://localhost:3001/api/printers');
  const data = await response.json();
  return data.printers;
}

// Imprimir recibo
async function printReceipt(printerId, receiptData) {
  const response = await fetch('http://localhost:3001/api/print/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerId,
      header: {
        title: 'Mi Tienda',
        subtitle: 'Fecha: ' + new Date().toLocaleString()
      },
      items: receiptData.items,
      total: receiptData.total,
      footer: '¡Gracias!',
      cut: true
    })
  });
  
  const result = await response.json();
  return result.jobId;
}

// Verificar estado de impresión
async function checkPrintStatus(jobId) {
  const response = await fetch(`http://localhost:3001/api/print/job/${jobId}`);
  const data = await response.json();
  return data.job.status; // 'pending', 'processing', 'completed', 'failed'
}
```

## Configuración

Edita `.env` para personalizar:

```env
PORT=3001                          # Puerto del servidor
HOST=127.0.0.1                    # Host (127.0.0.1 = solo local)
LOG_LEVEL=info                    # debug, info, warn, error
LOG_PATH=./logs                   # Directorio de logs
PRINT_TIMEOUT=30000               # Timeout de impresión (ms)
MAX_QUEUE_SIZE=100                # Máximo de trabajos en cola
CORS_ORIGIN=*                     # Orígenes CORS permitidos
DEVICE_SCAN_INTERVAL=10000        # Escaneo de dispositivos USB
AUTO_RETRY=true                   # Reintentar en caso de fallo
RETRY_ATTEMPTS=3                  # Número de reintentos
RETRY_DELAY=2000                  # Delay entre reintentos (ms)
```

## Troubleshooting

### Las impresoras no se detectan

1. Verifica que la impresora está conectada por USB
2. Revisa los logs: `cat logs/combined.log`
3. Ejecuta escaneo manual:
   ```bash
   curl http://localhost:3001/api/printers/scan/now -X POST
   ```

### Error: "Permission denied" (Linux)

Necesitas permisos para acceder a dispositivos USB:

```bash
# Crear regla udev
sudo tee /etc/udev/rules.d/99-thermal-printer.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="0483", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666"
EOF

# Recargar reglas
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### La impresora no imprime

1. Prueba primero con `/api/printers/{id}/test`
2. Verifica el estado con `/api/print/job/{jobId}`
3. Revisa los logs de error

## Desinstalación

Para desinstalar el servicio del sistema:

```bash
npm run uninstall-service
```

## Logs

Los logs se guardan en `./logs/`:
- `combined.log` - Todos los eventos
- `error.log` - Solo errores

## Soporte de Impresoras

Soporta impresoras ESCPOS de marcas como:
- Epson
- Zebra
- Star Micronics
- Bixolon
- Daruma
- Posiflex

## Requisitos

- Node.js 14+
- npm o yarn
- Impresora térmica ESCPOS compatible
- Puerto USB disponible

## Licencia

MIT

## Contribuciones

Las contribuciones son bienvenidas. Por favor abre un issue o pull request.

---

**Versión:** 1.0.0  
**Última actualización:** Enero 2024
