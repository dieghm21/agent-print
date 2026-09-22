# 📁 Estructura del Proyecto

```
agent-print/
│
├── 📋 Documentación
│   ├── README.md              ← Documentación principal
│   ├── QUICKSTART.md          ← Inicio rápido (30 seg)
│   ├── DEPLOYMENT.md          ← Guía de despliegue
│   ├── API-EXAMPLES.md        ← Ejemplos de código
│   ├── ADVANCED.md            ← Configuración avanzada
│   └── STRUCTURE.md           ← Este archivo
│
├── 🔧 Configuración
│   ├── package.json           ← Dependencias y scripts
│   ├── .env.example           ← Variables de entorno (template)
│   ├── .gitignore             ← Archivos a ignorar en git
│   └── .git/                  ← Repositorio git
│
├── 🚀 Código Principal (src/)
│   ├── index.js               ← Punto de entrada
│   │
│   ├── routes/                ← Endpoints de API
│   │   ├── health.js          ← GET /api/health
│   │   ├── printers.js        ← GET /api/printers
│   │   └── print.js           ← POST /api/print/*
│   │
│   ├── services/              ← Lógica de negocio
│   │   ├── printerManager.js  ← Gestor de impresoras USB
│   │   └── printQueue.js      ← Cola de impresión
│   │
│   └── utils/                 ← Utilidades
│       └── logger.js          ← Sistema de logs
│
├── 🛠️ Scripts (scripts/)
│   ├── install-service.js     ← Instalar como servicio
│   ├── uninstall-service.js   ← Desinstalar servicio
│   └── test-api.js            ← Pruebas de API
│
├── 📚 Ejemplos (examples/)
│   ├── client-react.jsx       ← Componente React
│   ├── client-vue.vue         ← Componente Vue 3
│   ├── client-angular.ts      ← Servicio Angular
│   └── client-*.{lang}        ← Clientes en otros lenguajes
│
└── 📂 Directorios Generados (en tiempo de ejecución)
    ├── node_modules/          ← Dependencias instaladas
    └── logs/                  ← Archivos de log
        ├── combined.log       ← Todos los eventos
        └── error.log          ← Solo errores
```

## Archivos Clave

### Punto de Entrada
- **src/index.js** - Inicia el servidor Express y gestiona rutas

### Rutas (API Endpoints)
```
GET  /api/health                    ← Estado del agente
GET  /api/printers                  ← Listar impresoras
GET  /api/printers/{id}             ← Detalles de impresora
POST /api/printers/{id}/test        ← Probar impresora
POST /api/printers/scan/now         ← Escanear dispositivos

GET  /api/print/stats               ← Estadísticas
GET  /api/print/job/{jobId}         ← Estado del trabajo
POST /api/print/text                ← Imprimir texto
POST /api/print/receipt             ← Imprimir recibo
POST /api/print/label               ← Imprimir etiqueta
POST /api/print/raw                 ← Imprimir datos raw
```

### Servicios
- **printerManager.js** - Detecta, conecta y gestiona impresoras USB
- **printQueue.js** - Procesa trabajos de impresión de forma asíncrona

### Utilidades
- **logger.js** - Sistema de logging con Winston

## Flujo de Ejecución

```
┌─ Cliente (Frontend/App)
│  └─ Solicitud HTTP
│     └─ Express Router
│        └─ Endpoint Handler
│           └─ Servicio (printQueue/printerManager)
│              └─ ESCPOS Driver
│                 └─ Puerto USB
│                    └─ Impresora Física
│
└─ Respuesta JSON
```

## Ciclo de Vida de un Trabajo de Impresión

```
1. Cliente envía POST /api/print/text
                ↓
2. Handler valida solicitud
                ↓
3. printQueue.enqueue() agrega a cola
                ↓
4. Retorna jobId al cliente (202 Accepted)
                ↓
5. Cola procesa trabajo
                ↓
6. printerManager.connectPrinter()
                ↓
7. Ejecuta comandos ESCPOS
                ↓
8. Cliente verifica estado con GET /api/print/job/{jobId}
                ↓
9. Trabajo completado (estado: "completed" o "failed")
```

## Variables de Entorno (.env)

```
PORT=3001                      # Puerto del servidor
HOST=127.0.0.1               # Host (127.0.0.1 = solo local)
LOG_LEVEL=info               # debug, info, warn, error
LOG_PATH=./logs              # Directorio de logs
PRINT_TIMEOUT=30000          # Timeout de impresión (ms)
MAX_QUEUE_SIZE=100           # Máximo de trabajos
CORS_ORIGIN=*                # Orígenes CORS permitidos
DEVICE_SCAN_INTERVAL=10000   # Escaneo USB (ms)
AUTO_RETRY=true              # Reintentar en fallo
RETRY_ATTEMPTS=3             # Número de reintentos
RETRY_DELAY=2000             # Delay entre reintentos (ms)
```

## Scripts Disponibles

```bash
npm start              # Iniciar en producción
npm run dev            # Iniciar en desarrollo (nodemon)
npm test               # Probar API
npm run install-service     # Instalar como servicio
npm run uninstall-service   # Desinstalar servicio
```

## Dependencias Principales

```
express               ← Framework web
escpos                ← Driver de impresoras
usb                   ← Acceso a dispositivos USB
cors                  ← Cross-Origin Resource Sharing
winston               ← Sistema de logging
uuid                  ← Generación de IDs únicos
node-windows          ← Integración con servicios Windows
```

## Proceso de Instalación

```
1. npm install
   └─ Descarga dependencias en node_modules/

2. cp .env.example .env
   └─ Copia configuración base

3. npm start
   └─ Inicia servidor en puerto 3001

4. npm run install-service
   └─ Registra como servicio del sistema
```

## Monitoreo y Logs

Los logs se guardan en `./logs/`:

- **combined.log** (5MB max)
  - Todos los eventos del sistema
  - Rotación automática (máx. 5 archivos)

- **error.log** (5MB max)
  - Solo errores
  - Rotación automática (máx. 5 archivos)

Formato de log:
```json
{
  "timestamp": "2024-01-15 10:30:45",
  "level": "info",
  "message": "Impresora detectada",
  "meta": {
    "printerId": "uuid-123",
    "name": "Printer001"
  }
}
```

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente HTTP                             │
│              (React, Vue, Angular, etc.)                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP Requests/Responses
                  │
┌─────────────────▼───────────────────────────────────────────┐
│              Express Server (3001)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Health Routes         Printer Routes    Print Routes       │
│  • /health            • /printers         • /print/text    │
│  • /ready             • /printers/{id}    • /print/receipt │
│  • /alive             • /printers/test    • /print/label   │
│                       • /printers/scan    • /print/job      │
│                                          • /print/stats    │
│                                                             │
└─────┬──────────────────────────────┬──────────────────────┘
      │                              │
      └─────────────┬────────────────┘
                    │
       ┌────────────▼───────────────┐
       │   Servicios               │
       ├───────────────────────────┤
       │ • PrinterManager          │
       │ • PrintQueue              │
       │ • Logger                  │
       └────────────┬───────────────┘
                    │
       ┌────────────▼───────────────┐
       │   ESCPOS Driver           │
       └────────────┬───────────────┘
                    │
       ┌────────────▼───────────────┐
       │   Controlador USB          │
       └────────────┬───────────────┘
                    │
       ┌────────────▼───────────────┐
       │  Impresora Térmica USB     │
       └───────────────────────────┘
```

## Información Adicional

- **Lenguaje**: JavaScript (Node.js)
- **Framework**: Express.js
- **Driver de Impresora**: ESCPOS USB
- **Base de Datos**: Ninguna (opcional para historial)
- **Plataformas Soportadas**: Windows, macOS, Linux
- **Node.js Requerido**: v14 o superior

---

Para más detalles, consulta la documentación específica en:
- README.md - Guía completa
- DEPLOYMENT.md - Instalación en producción
- API-EXAMPLES.md - Ejemplos de código
