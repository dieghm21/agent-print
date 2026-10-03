# Guía de Integración - Agente de Impresoras Térmicas

## URL Base

```
http://localhost:3002/api
```

---

## Endpoint Principal: Imprimir Recibo

**URL:**
```
POST http://localhost:3002/api/print/receipt
```

**Headers:**
```
Content-Type: application/json
Access-Control-Request-Private-Network: true
```

---

## Body JSON

```json
{
  "printerId": "pos80c-usb001-fixed",
  "businessName": "MI NEGOCIO S.A.S",
  "businessNit": "900.123.456-7",
  "businessAddress": "Carrera 5 Nº 12-34, Bogotá D.C.",
  "businessPhone": "313-5551234",
  "invoiceNumber": "0000001",
  "dateTime": "28/09/2026  |  Hora: 15:30",
  "pointOfSale": "1",
  "operator": "Admin",
  "customer": "Consumidor Final",
  "items": [
    {
      "name": "Café Americano",
      "quantity": 2,
      "price": 5.00,
      "description": "Detalles opcionales"
    },
    {
      "name": "Pan Dulce",
      "quantity": 1,
      "price": 2.00
    }
  ],
  "total": 14.28,
  "paymentMethod": "EFECTIVO",
  "change": 0,
  "cut": true
}
```

---

## Campos del Body

### Obligatorios
- **printerId**: `"pos80c-usb001-fixed"` (siempre este valor)
- **items**: Array con al menos un item
  - `name` (string): Nombre del producto
  - `quantity` (number): Cantidad
  - `price` (number): Precio unitario
- **total** (number): Total a pagar (incluye IVA 19%)

### Datos del Negocio (Recomendados)
- **businessName** (string): Nombre de la empresa
- **businessNit** (string): NIT del negocio
- **businessAddress** (string): Dirección
- **businessPhone** (string): Teléfono de contacto

### Datos de la Factura
- **invoiceNumber** (string): Número secuencial de la factura
- **dateTime** (string): Fecha y hora de emisión
- **pointOfSale** (string): Número de punto de venta
- **operator** (string): Nombre del operador/cajero
- **customer** (string): Nombre del cliente (default: "Consumidor Final")

### Método de Pago
- **paymentMethod** (string): Método de pago (Efectivo, Tarjeta, Transferencia, etc)
- **change** (number): Cambio entregado (opcional)

### Opcionales
- **items[i].description** (string): Descripción adicional del producto
- **cut** (boolean): Cortar papel después de imprimir (default: `true`)

---

## Respuesta Exitosa (202)

```json
{
  "success": true,
  "message": "Recibo encolado exitosamente",
  "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "pending",
  "preview": "... texto formateado del recibo ...",
  "receipt": {
    "itemsCount": 2,
    "total": 24.75,
    "orderNumber": "ORD-12345"
  }
}
```

**Nota:** Guarda el `jobId` para verificar el estado de la impresión después.

---

## Prueba con Curl

Copia y pega en tu terminal:

```bash
curl -X POST http://localhost:3002/api/print/receipt \
  -H "Content-Type: application/json" \
  -H "Access-Control-Request-Private-Network: true" \
  -d '{
    "printerId": "pos80c-usb001-fixed",
    "businessName": "MI NEGOCIO S.A.S",
    "businessNit": "900.123.456-7",
    "businessAddress": "Carrera 5 Nº 12-34, Bogotá D.C.",
    "businessPhone": "313-5551234",
    "invoiceNumber": "0000001",
    "dateTime": "28/09/2026  |  Hora: 15:30",
    "pointOfSale": "1",
    "operator": "Admin",
    "customer": "Consumidor Final",
    "items": [
      {"name": "Café Americano", "quantity": 2, "price": 5},
      {"name": "Pan Dulce", "quantity": 1, "price": 2}
    ],
    "total": 12,
    "paymentMethod": "EFECTIVO",
    "change": 0,
    "cut": true
  }'
```

La impresora debe imprimir la factura en 1-2 segundos.

---

## Verificar Estado de Impresión

**URL:**
```
GET http://localhost:3002/api/print/job/{jobId}
```

Reemplaza `{jobId}` con el ID recibido en la respuesta anterior.

**Ejemplo:**
```
GET http://localhost:3002/api/print/job/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Respuesta:**
```json
{
  "success": true,
  "job": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "completed",
    "printerId": "pos80c-usb001-fixed",
    "type": "receipt",
    "createdAt": "2026-09-28T00:43:43.695Z",
    "startedAt": "2026-09-28T00:43:44.126Z",
    "completedAt": "2026-09-28T00:43:44.742Z",
    "attempts": 0,
    "error": null
  }
}
```

**Estados posibles:**
- `pending` — Esperando en la cola
- `processing` — Se está imprimiendo
- `completed` — Impresión exitosa
- `failed` — Error durante la impresión

---

## Otros Endpoints Útiles

### Health Check

**URL:** `GET http://localhost:3002/api/health`

Verifica que el agente está activo y listo.

### Listar Impresoras

**URL:** `GET http://localhost:3002/api/printers`

Obtiene la lista de impresoras disponibles (actualmente solo `POS-80C`).

### Imprimir Texto Simple

**URL:** `POST http://localhost:3002/api/print/text`

**Body:**
```json
{
  "printerId": "pos80c-usb001-fixed",
  "text": "Hola\nDesde el Front",
  "align": "center",
  "fontSize": 2,
  "cut": true
}
```

---

## Notas Importantes

1. **Impresora fija:** El `printerId` siempre es `"pos80c-usb001-fixed"` (es la única impresora disponible).

2. **Procesamiento asíncrono:** El endpoint devuelve `202 Accepted` inmediatamente. La impresión real ocurre en background. Usa el `jobId` para verificar cuándo terminó.

3. **Formato de factura:** Se imprime con ancho de 48 caracteres (estándar POS-80C). Incluye:
   - Logo (si existe el archivo `logos/business-logo.png`)
   - Datos del negocio (nombre, NIT, dirección, teléfono)
   - Número de factura
   - Fecha, hora, punto de venta, operador
   - Tabla de items con productos, cantidad, precio unitario y total
   - Total con separador de miles
   - Método de pago y cambio
   - Pie de página profesional

4. **Logo del negocio:** 
   - Guarda tu logo como `logos/business-logo.png` (en la carpeta raíz del proyecto)
   - Se carga automáticamente al iniciar el servidor
   - Si no existe, las facturas se imprimen sin logo (no da error)
   - Para actualizar el logo: reemplaza el archivo y reinicia el servidor

5. **Números con separador de miles:** Todos los campos numéricos (precio, total, etc) se formatean con puntos:
   - `1234` → `1.234`
   - `1000000` → `1.000.000`

6. **Acentos y caracteres especiales:** Soportados (ñ, á, é, í, ó, ú, etc).

7. **Corte de papel:** El margen antes de cortar está optimizado para que no corte el texto. Si desactivas el corte (`cut: false`), deberás avanzar manualmente el papel.

8. **CORS:** El header `Access-Control-Request-Private-Network: true` es necesario cuando accedes desde un front remoto (ej. Render) hacia localhost.

---

## Ejemplo Mínimo

Para imprimir una factura simple:

**Headers:**
```
Content-Type: application/json
Access-Control-Request-Private-Network: true
```

**Body:**
```json
{
  "printerId": "pos80c-usb001-fixed",
  "businessName": "Mi Negocio",
  "items": [
    {"name": "Producto", "quantity": 1, "price": 10.00}
  ],
  "total": 11.90,
  "cut": true
}
```

Eso es lo mínimo requerido para que funcione (incluye IVA 19% calculado automáticamente).

---

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `printerId es requerido` | No incluiste el `printerId` | Agrega `"printerId": "pos80c-usb001-fixed"` |
| `items debe ser un array no vacío` | El array `items` está vacío o no existe | Agrega al menos un item |
| `total es requerido` | Falta el campo `total` | Agrega `"total": <número>` |
| `Impresora no encontrada` | El `printerId` es incorrecto | Usa `"pos80c-usb001-fixed"` |
| `Connection refused` | El agente no está corriendo | Ejecuta `node src/index.js` |

---

## Resumen Rápido

| Acción | Método | URL |
|--------|--------|-----|
| Imprimir recibo | POST | `http://localhost:3002/api/print/receipt` |
| Ver estado | GET | `http://localhost:3002/api/print/job/{jobId}` |
| Verificar agente | GET | `http://localhost:3002/api/health` |
| Listar impresoras | GET | `http://localhost:3002/api/printers` |
