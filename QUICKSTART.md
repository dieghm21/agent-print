# ⚡ Inicio Rápido

## 30 segundos para empezar

### 1. Instalación

```bash
# Clonar/descargar el repositorio
cd agent-print

# Instalar dependencias
npm install

# Copiar configuración
cp .env.example .env
```

### 2. Iniciar el agente

**Desarrollo:**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

Deberías ver:
```
🖨️  Agente de Impresoras Térmicas escuchando en http://127.0.0.1:3001
```

### 3. Probar

```bash
# En otra terminal
npm test

# O manualmente
curl http://localhost:3001/api/health
```

## Próximos pasos

### Instalación como Servicio

**Windows (Admin):**
```bash
npm run install-service
```

**macOS:**
```bash
npm run install-service
```

**Linux:**
```bash
npm run install-service
# Seguir instrucciones mostradas
```

### Conectar desde tu aplicación

**React:**
```javascript
const response = await fetch('http://localhost:3001/api/printers');
const { printers } = await response.json();
```

**Vue:**
```javascript
const response = await fetch('http://localhost:3001/api/printers');
const data = await response.json();
this.printers = data.printers;
```

**Angular:**
```typescript
this.printerService.getPrinters().subscribe(printers => {
  this.printers = printers;
});
```

### Imprimir algo

```bash
# Obtener ID de impresora
curl http://localhost:3001/api/printers

# Copiar el ID (ejemplo: "uuid-12345")

# Imprimir texto
curl -X POST http://localhost:3001/api/print/text \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "uuid-12345",
    "text": "¡Hola Mundo!",
    "align": "center",
    "cut": true
  }'
```

## Troubleshooting Rápido

### "No impresoras detectadas"
1. Verifica conexión USB
2. Ejecuta: `curl -X POST http://localhost:3001/api/printers/scan/now`
3. Revisa: `tail -f logs/combined.log`

### "Puerto 3001 en uso"
```bash
# Cambiar en .env
PORT=3002
```

### "Error de permisos (Linux)"
```bash
sudo npm run install-service
```

## Documentación Completa

- **[README.md](README.md)** - Documentación completa
- **[API-EXAMPLES.md](API-EXAMPLES.md)** - Ejemplos en varios lenguajes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Despliegue en producción
- **[ADVANCED.md](ADVANCED.md)** - Configuración avanzada

## Support

En caso de problemas:
1. Revisa los logs: `logs/combined.log`
2. Consulta la sección Troubleshooting en README.md
3. Verifica que Node.js está instalado: `node --version`

¡Listo! Ya tienes el agente corriendo. 🎉
