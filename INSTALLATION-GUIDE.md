# 🚀 Guía de Instalación Completa

## Para el Usuario Final

Esta guía está diseñada para instalar el **Agente de Impresoras Térmicas** en tu computadora.

## Sistema Operativo

Elige tu sistema operativo:

- [Windows](#windows)
- [macOS](#macos)
- [Linux (Ubuntu/Debian)](#linux)

---

## Windows

### Paso 1: Descargar e Instalar Node.js

1. Ve a https://nodejs.org/
2. Descarga la versión **LTS** (recomendado)
3. Ejecuta el instalador
4. Marca todas las opciones predeterminadas

**Verifica la instalación:**
```cmd
node --version
npm --version
```

### Paso 2: Descargar el Agente

1. Descarga o clona el repositorio `agent-print`
2. Extrae en una carpeta, ej: `C:\Aplicaciones\agent-print`

### Paso 3: Instalar Dependencias

1. Abre **PowerShell** o **Cmd**
2. Navega a la carpeta:
   ```cmd
   cd C:\Aplicaciones\agent-print
   ```
3. Instala dependencias:
   ```cmd
   npm install
   ```

### Paso 4: Configurar

1. Copia `.env.example` a `.env`:
   ```cmd
   copy .env.example .env
   ```
2. Edita `.env` con Notepad si necesitas cambios

### Paso 5: Probar Localmente

```cmd
npm start
```

Deberías ver:
```
🖨️  Agente de Impresoras Térmicas escuchando en http://127.0.0.1:3001
```

Abre en navegador: http://localhost:3001/api/health

### Paso 6: Instalar como Servicio (IMPORTANTE)

1. Abre **PowerShell como Administrador**
2. Navega a la carpeta del agente
3. Ejecuta:
   ```powershell
   npm run install-service
   ```

**Verifica que funciona:**
- Abre `services.msc`
- Busca "ThermalPrinterAgent"
- Debería estar corriendo

**Para gestionar:**
```cmd
# Iniciar
net start ThermalPrinterAgent

# Detener
net stop ThermalPrinterAgent
```

---

## macOS

### Paso 1: Instalar Node.js

**Con Homebrew (recomendado):**

1. Instala Homebrew si no lo tienes:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. Instala Node.js:
   ```bash
   brew install node
   ```

**Verifica:**
```bash
node --version
npm --version
```

### Paso 2: Descargar el Agente

```bash
cd ~/Applications
git clone <repo-url> agent-print
# O descargar ZIP y extraer
```

### Paso 3: Instalar Dependencias

```bash
cd ~/Applications/agent-print
npm install
```

### Paso 4: Configurar

```bash
cp .env.example .env
# Edita si necesita cambios
```

### Paso 5: Probar Localmente

```bash
npm start
```

Deberías ver:
```
🖨️  Agente de Impresoras Térmicas escuchando en http://127.0.0.1:3001
```

### Paso 6: Instalar como Launch Agent

```bash
npm run install-service
```

**Para gestionar:**

```bash
# Ver estado
launchctl list | grep ThermalPrinterAgent

# Iniciar
launchctl load ~/Library/LaunchAgents/local.ThermalPrinterAgent.plist

# Detener
launchctl unload ~/Library/LaunchAgents/local.ThermalPrinterAgent.plist

# Ver logs
tail -f logs/combined.log
```

---

## Linux

### Ubuntu/Debian

#### Paso 1: Instalar Node.js

```bash
sudo apt-get update
sudo apt-get install nodejs npm
```

**Verifica:**
```bash
node --version
npm --version
```

#### Paso 2: Descargar el Agente

```bash
sudo mkdir -p /opt/agent-print
cd /opt/agent-print
# Descargar o clonar repository
```

#### Paso 3: Crear Usuario del Servicio

```bash
sudo useradd -r -s /bin/false thermal-printer
sudo chown -R thermal-printer:thermal-printer /opt/agent-print
```

#### Paso 4: Instalar Dependencias

```bash
cd /opt/agent-print
sudo -u thermal-printer npm install
```

#### Paso 5: Configurar

```bash
sudo cp .env.example .env
sudo nano .env  # Editar si necesario
sudo chown thermal-printer:thermal-printer .env
```

#### Paso 6: Configurar Permisos USB

```bash
# Crear regla udev para acceso a impresoras
sudo tee /etc/udev/rules.d/99-thermal-printer.rules > /dev/null <<EOF
SUBSYSTEM=="usb", ATTR{idVendor}=="0483", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0e6e", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0a81", MODE="0666"
EOF

# Recargar
sudo udevadm control --reload-rules
sudo udevadm trigger
```

#### Paso 7: Crear Servicio Systemd

```bash
sudo nano /etc/systemd/system/ThermalPrinterAgent.service
```

Pega este contenido:

```ini
[Unit]
Description=Agente Local de Impresoras Térmicas
After=network.target

[Service]
Type=simple
User=thermal-printer
WorkingDirectory=/opt/agent-print
ExecStart=/usr/bin/node /opt/agent-print/src/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Guarda: `Ctrl+X`, `Y`, `Enter`

#### Paso 8: Habilitar e Iniciar el Servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable ThermalPrinterAgent
sudo systemctl start ThermalPrinterAgent
```

**Verifica:**
```bash
sudo systemctl status ThermalPrinterAgent
```

**Para gestionar:**
```bash
# Ver logs
sudo journalctl -u ThermalPrinterAgent -f

# Reiniciar
sudo systemctl restart ThermalPrinterAgent

# Detener
sudo systemctl stop ThermalPrinterAgent
```

---

## Verificación de Instalación

Después de instalar, verifica que funciona:

### Verificar que se ejecuta

```bash
# Para todos los sistemas
curl http://localhost:3001/api/health
```

Deberías recibir algo como:
```json
{
  "success": true,
  "status": "healthy",
  "queue": {
    "queueLength": 0,
    "totalJobs": 0
  }
}
```

### Verificar que detecta impresoras

```bash
curl http://localhost:3001/api/printers
```

Deberías ver una lista de impresoras detectadas.

### Ejecutar pruebas

```bash
npm test
```

---

## Primeros Pasos

### 1. Conecta tu Impresora Térmica

- Conecta la impresora USB al puerto USB del PC
- Asegúrate de que está encendida
- El agente debería detectarla automáticamente

### 2. Prueba Manual

```bash
# Obtener ID de impresora
curl http://localhost:3001/api/printers

# Copiar el "id" de la impresora
# Reemplazar PRINTER_ID en el siguiente comando

# Probar impresión
curl -X POST http://localhost:3001/api/print/text \
  -H "Content-Type: application/json" \
  -d '{
    "printerId": "PRINTER_ID",
    "text": "Prueba de Impresión",
    "align": "center",
    "cut": true
  }'
```

### 3. Integra con tu Aplicación

Ver ejemplos en:
- `examples/client-react.jsx`
- `examples/client-vue.vue`
- `examples/client-angular.ts`
- `API-EXAMPLES.md`

---

## Solución de Problemas

### "npm no se encuentra" (Windows)

- Reinicia PowerShell/Cmd
- Verifica que Node.js se instaló correctamente: `node --version`

### "Impresora no detectada"

1. Verifica conexión USB
2. Ejecuta manualmente: `curl -X POST http://localhost:3001/api/printers/scan/now`
3. Revisa logs: `logs/combined.log`

### "Puerto 3001 en uso"

Edita `.env` y cambia:
```env
PORT=3002
```

### Permiso denegado (Linux)

Verifica que el usuario tiene permisos:
```bash
ls -la /dev/bus/usb/
```

Si no, re-aplica las reglas udev.

### "El servicio no inicia"

Verifica los logs:

**Windows:**
```cmd
Get-EventLog -LogName "Application" | Select-Object -Last 10
```

**macOS:**
```bash
tail -f ~/Library/LaunchAgents/local.ThermalPrinterAgent.plist
```

**Linux:**
```bash
sudo journalctl -u ThermalPrinterAgent -n 50
```

---

## Próximos Pasos

1. Lee [QUICKSTART.md](QUICKSTART.md) para inicio rápido
2. Consulta [README.md](README.md) para documentación completa
3. Ver [API-EXAMPLES.md](API-EXAMPLES.md) para ejemplos de código
4. Lee [DEPLOYMENT.md](DEPLOYMENT.md) para producción

---

## Soporte

Si tienes problemas:

1. Revisa los logs en `./logs/`
2. Consulta la sección "Solución de Problemas" en README.md
3. Verifica que Node.js está instalado correctamente
4. Prueba con manualmente con curl los endpoints

---

**¡Listo!** El agente debería estar corriendo. 🎉

Ahora conecta tu frontend y comienza a imprimir. 🖨️
