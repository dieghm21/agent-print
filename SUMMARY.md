# 📊 Resumen del Proyecto

## ¿Qué es?

**Agente Local de Impresoras Térmicas** es un servicio API REST que actúa como puente entre aplicaciones web y impresoras térmicas ESCPOS conectadas por USB.

## ¿Por qué?

Las aplicaciones web no pueden acceder directamente a dispositivos USB por razones de seguridad. Este agente corre localmente en cada PC y expone una API segura para que frontends remotos envíen comandos de impresión.

## ¿Cómo funciona?

```
Frontend Web (en navegador)
           ↓
API HTTP (puerto 3001)
           ↓
Agente Local (Node.js)
           ↓
Driver ESCPOS
           ↓
Impresora Térmica USB
           ↓
Papel impreso 🖨️
```

## Características Principales

✅ **API REST Simple** - Endpoints intuitivos
✅ **Auto-detección** - Encuentra impresoras automáticamente
✅ **Cola Asíncrona** - Procesa trabajos en background
✅ **Reintentos** - Reintenta trabajos fallidos automáticamente
✅ **Múltiples Formatos** - Texto, recibos, etiquetas, códigos de barras
✅ **Multi-plataforma** - Windows, macOS, Linux
✅ **Instalación Automática** - Se instala como servicio
✅ **Logging** - Registro detallado de operaciones
✅ **Monitoreo** - Estadísticas en tiempo real

## Instalación Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar configuración
cp .env.example .env

# 3. Iniciar
npm start

# 4. Instalar como servicio (opcional)
npm run install-service
```

## Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Estado del agente |
| GET | `/api/printers` | Listar impresoras |
| POST | `/api/print/text` | Imprimir texto |
| POST | `/api/print/receipt` | Imprimir recibo |
| POST | `/api/print/label` | Imprimir etiqueta |
| GET | `/api/print/job/{id}` | Estado de trabajo |

## Ejemplo de Uso (JavaScript)

```javascript
// Obtener impresoras
const printers = await fetch('http://localhost:3001/api/printers')
  .then(r => r.json())
  .then(d => d.printers);

// Imprimir
const jobId = await fetch('http://localhost:3001/api/print/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    printerId: printers[0].id,
    text: '¡Hola Mundo!',
    align: 'center'
  })
}).then(r => r.json()).then(d => d.jobId);

// Verificar estado
const job = await fetch(`http://localhost:3001/api/print/job/${jobId}`)
  .then(r => r.json())
  .then(d => d.job);

console.log('Estado:', job.status); // 'completed' o 'failed'
```

## Estructura de Archivos

```
agent-print/
├── src/
│   ├── index.js                 # Servidor principal
│   ├── routes/                  # Endpoints API
│   ├── services/                # Lógica de negocio
│   └── utils/                   # Utilidades
├── scripts/
│   ├── install-service.js       # Instalar servicio
│   └── test-api.js              # Pruebas
├── examples/                    # Ejemplos React, Vue, Angular
├── package.json                 # Dependencias
├── .env.example                 # Configuración
├── README.md                    # Documentación completa
├── DEPLOYMENT.md                # Guía despliegue
├── API-EXAMPLES.md              # Ejemplos código
└── ADVANCED.md                  # Configuración avanzada
```

## Tecnología

| Componente | Tecnología |
|-----------|-----------|
| Framework Web | Express.js |
| Driver de Impresora | ESCPOS |
| Acceso USB | node-usb |
| Logging | Winston |
| Servidor | Node.js 14+ |
| Plataformas | Windows, macOS, Linux |

## Casos de Uso

1. **Punto de Venta (POS)**
   - Imprimir recibos de compra
   - Imprimir etiquetas de productos

2. **Restaurantes**
   - Imprimir órdenes de cocina
   - Imprimir comprobantes de pago

3. **Farmacias**
   - Imprimir etiquetas de medicamentos
   - Imprimir recibos

4. **Logística**
   - Imprimir etiquetas de envío
   - Imprimir códigos de barras

5. **Sistemas Administrativos**
   - Imprimir reportes
   - Imprimir tickets

## Flujo de Implementación

### Paso 1: Configuración
- Descargar/clonar repositorio
- Ejecutar `npm install`
- Copiar `.env.example` a `.env`

### Paso 2: Prueba Local
- Ejecutar `npm start`
- Conectar impresora USB
- Ejecutar `npm test`

### Paso 3: Integración con Frontend
- Importar cliente (React, Vue, Angular)
- Usar endpoints API
- Manejar respuestas

### Paso 4: Instalación en Producción
- Ejecutar `npm run install-service`
- Configurar CORS si es necesario
- Verificar permisos USB
- Habilitar en firewall

## Requisitos

**Hardware:**
- PC/Servidor con puerto USB disponible
- Impresora térmica ESCPOS compatible

**Software:**
- Node.js 14+
- npm o yarn
- Windows 7+, macOS 10.12+, o Linux

## Impresoras Soportadas

Cualquier impresora térmica ESCPOS de marcas como:
- Epson
- Zebra
- Star Micronics
- Bixolon
- Daruma
- Posiflex
- Y muchas otras

## Configuración

Variables de entorno principales:

```env
PORT=3001                      # Puerto del servidor
HOST=127.0.0.1               # Host (127.0.0.1 = solo local)
LOG_LEVEL=info               # Nivel de logs
MAX_QUEUE_SIZE=100           # Máximo trabajos en cola
PRINT_TIMEOUT=30000          # Timeout de impresión (ms)
AUTO_RETRY=true              # Reintentos automáticos
RETRY_ATTEMPTS=3             # Número de reintentos
```

## Monitoreo

Los logs se guardan en `./logs/`:
- `combined.log` - Todos los eventos
- `error.log` - Solo errores

Ver estado:
```bash
curl http://localhost:3001/api/health
```

## Seguridad

- ✅ Escucha solo en localhost por defecto
- ✅ Soporte para autenticación Bearer token
- ✅ Validación de entrada en todos los endpoints
- ✅ CORS configurable
- ✅ Rate limiting disponible
- ✅ HTTPS con proxy reverso

## Documentación Completa

| Documento | Contenido |
|-----------|-----------|
| [README.md](README.md) | Guía completa, instalación, uso |
| [QUICKSTART.md](QUICKSTART.md) | Inicio rápido (30 segundos) |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Despliegue en producción |
| [API-EXAMPLES.md](API-EXAMPLES.md) | Ejemplos en 7+ lenguajes |
| [ADVANCED.md](ADVANCED.md) | Seguridad, performance, escalabilidad |
| [STRUCTURE.md](STRUCTURE.md) | Estructura del proyecto |

## Comenzar

1. **Lectura Rápida**: Ver [QUICKSTART.md](QUICKSTART.md) (2 min)
2. **Instalación**: Seguir pasos en [README.md](README.md)
3. **Prueba**: Ejecutar `npm test`
4. **Integración**: Ver ejemplos en [API-EXAMPLES.md](API-EXAMPLES.md)
5. **Despliegue**: Consultar [DEPLOYMENT.md](DEPLOYMENT.md)

## Soporte

En caso de problemas:
1. Revisa logs: `logs/combined.log`
2. Consulta troubleshooting en README.md
3. Verifica permisos USB (especialmente en Linux)
4. Prueba con `curl http://localhost:3001/api/health`

## Versión

**v1.0.0** - Enero 2024

---

**Estado**: ✅ Listo para usar
**Plataformas**: Windows, macOS, Linux
**Licencia**: MIT
**Dependencias**: Node.js 14+

¡Listo para comenzar! 🚀
