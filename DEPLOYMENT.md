# 📦 Guía de Despliegue - Agente de Impresoras Térmicas

## Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Instalación en Windows](#instalación-en-windows)
3. [Instalación en macOS](#instalación-en-macos)
4. [Instalación en Linux](#instalación-en-linux)
5. [Configuración de Red](#configuración-de-red)
6. [Monitoreo y Mantenimiento](#monitoreo-y-mantenimiento)
7. [Troubleshooting](#troubleshooting)

## Requisitos

- Node.js 14 o superior
- npm o yarn
- Impresora térmica ESCPOS compatible
- Conexión USB disponible
- Permisos administrativos (Windows y Linux)

## Instalación en Windows

### 1. Descargar e Instalar Node.js

Descarga desde: https://nodejs.org/ (LTS recomendado)

Verifica la instalación:
```cmd
node --version
npm --version
```

### 2. Preparar el Agente

```cmd
cd C:\Aplicaciones\agent-print
npm install
copy .env.example .env
```

### 3. Instalar como Servicio (Requerido: Run as Administrator)

```cmd
npm run install-service
```

El servicio se iniciará automáticamente. Verifica en Servicios de Windows:
```cmd
services.msc
```

Busca "ThermalPrinterAgent"

### 4. Gestionar el Servicio

```cmd
# Iniciar
net start ThermalPrinterAgent

# Detener
net stop ThermalPrinterAgent

# Desinstalar
npm run uninstall-service
```

### 5. Ver Logs (PowerShell)

```powershell
Get-Content -Path "logs/combined.log" -Tail 50 -Wait
Get-Content -Path "logs/error.log" -Tail 20
```

## Instalación en macOS

### 1. Instalar Node.js con Homebrew

```bash
brew install node
node --version
npm --version
```

### 2. Preparar el Agente

```bash
cd ~/Applications/agent-print
npm install
cp .env.example .env
```

### 3. Instalar como Launch Agent

```bash
npm run install-service
```

El servicio se iniciará automáticamente después del login.

### 4. Gestionar el Servicio

```bash
# Ver estado
launchctl list | grep ThermalPrinterAgent

# Cargar el servicio
launchctl load ~/Library/LaunchAgents/local.ThermalPrinterAgent.plist

# Descargar el servicio
launchctl unload ~/Library/LaunchAgents/local.ThermalPrinterAgent.plist

# Reiniciar
launchctl stop local.ThermalPrinterAgent
launchctl start local.ThermalPrinterAgent
```

### 5. Ver Logs

```bash
tail -f logs/combined.log
tail -f logs/error.log
```

## Instalación en Linux

### 1. Instalar Node.js

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install nodejs npm
node --version
npm --version
```

**CentOS/RHEL:**
```bash
sudo yum install nodejs npm
```

### 2. Preparar el Agente

```bash
cd /opt/agent-print
npm install
cp .env.example .env
sudo chmod +x scripts/install-service.js
```

### 3. Crear Usuario del Servicio

```bash
sudo useradd -r -s /bin/false thermal-printer
sudo chown -R thermal-printer:thermal-printer /opt/agent-print
```

### 4. Instalar como Servicio Systemd

```bash
sudo npm run install-service
```

Copia el contenido mostrado y créalo manualmente:

```bash
sudo nano /etc/systemd/system/ThermalPrinterAgent.service
```

Pega el contenido del servicio.

### 5. Habilitar e Iniciar el Servicio

```bash
sudo systemctl daemon-reload
sudo systemctl enable ThermalPrinterAgent
sudo systemctl start ThermalPrinterAgent
```

### 6. Gestionar el Servicio

```bash
# Ver estado
sudo systemctl status ThermalPrinterAgent

# Reiniciar
sudo systemctl restart ThermalPrinterAgent

# Detener
sudo systemctl stop ThermalPrinterAgent

# Ver logs
sudo journalctl -u ThermalPrinterAgent -f
sudo journalctl -u ThermalPrinterAgent -e --no-pager
```

### 7. Permisos USB

Para acceder a impresoras USB sin sudo:

```bash
# Crear regla udev
sudo tee /etc/udev/rules.d/99-thermal-printer.rules > /dev/null <<EOF
# Reglas para impresoras térmicas
SUBSYSTEM=="usb", ATTR{idVendor}=="0483", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="04b8", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0e6e", MODE="0666"
SUBSYSTEM=="usb", ATTR{idVendor}=="0a81", MODE="0666"
EOF

# Recargar reglas
sudo udevadm control --reload-rules
sudo udevadm trigger
```

## Configuración de Red

### Acceso Remoto

Por defecto, el servicio solo escucha en `127.0.0.1`. Para permitir acceso desde otras máquinas:

**Edita .env:**
```env
HOST=0.0.0.0
CORS_ORIGIN=http://192.168.1.100:3000,http://frontend.com
```

### Firewall (Linux)

```bash
# Abrir puerto 3001
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload

# O con ufw
sudo ufw allow 3001/tcp
```

### Firewall (Windows)

1. Windows Defender Firewall → Allow an app
2. Selecciona "node.exe"
3. Marca la casilla para redes privadas

## Monitoreo y Mantenimiento

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Logs Importantes

- **combined.log**: Todos los eventos
- **error.log**: Solo errores

### Rotación de Logs

Los logs se rotan automáticamente:
- Máximo 5MB por archivo
- Se guardan 5 archivos por tipo

### Actualizar el Agente

```bash
# Detener el servicio
npm run uninstall-service  # O systemctl stop

# Actualizar código
git pull
npm install

# Reinstalar servicio
npm run install-service
```

## Troubleshooting

### Problema: "Puerto ya en uso"

```bash
# Cambiar puerto en .env
PORT=3002

# O liberar el puerto
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux
sudo lsof -i :3001
sudo kill -9 <PID>

# macOS
lsof -i :3001
kill -9 <PID>
```

### Problema: "Impresora no detectada"

1. Verifica conexión USB
2. Ejecuta escaneo manual:
   ```bash
   curl -X POST http://localhost:3001/api/printers/scan/now
   ```
3. Revisa logs de errores

### Problema: "Permission denied" (Linux)

Asegúrate de haber configurado las reglas udev y permisos:

```bash
# Verificar permisos
ls -la /dev/bus/usb/

# Re-aplicar reglas
sudo udevadm control --reload-rules
sudo udevadm trigger
```

### Problema: "Service won't start"

Verifica:
1. Node.js está instalado
2. Dependencias están instaladas: `npm install`
3. Archivo de configuración existe: `.env`
4. Permisos son correctos
5. Puerto está disponible

Ver logs detallados:
```bash
# Windows
npm start

# Linux/macOS
journalctl -u ThermalPrinterAgent -n 50
tail -f logs/error.log
```

### Problema: "Cannot find module"

```bash
# Reinstalar dependencias
rm -rf node_modules
npm install
```

## Respaldo y Recuperación

### Hacer Backup

```bash
# Guardar configuración
cp .env .env.backup
cp logs logs-backup -r

# Guardar base de datos si existe
# (según tu configuración)
```

### Restaurar

```bash
# Restaurar configuración
cp .env.backup .env

# Reiniciar servicio
npm run install-service
```

## Actualización de Versión

```bash
# Ver versión actual
npm list thermal-printer-agent

# Actualizar
npm update

# O a versión específica
npm install thermal-printer-agent@2.0.0
```

---

Para más ayuda: Revisa logs en `./logs/` o consulta la documentación en `README.md`
