/**
 * Script de Instalación como Servicio del Sistema
 * Funciona en Windows, macOS y Linux
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const SERVICE_NAME = 'ThermalPrinterAgent';
const SERVICE_DESC = 'Agente Local de Impresoras Térmicas';

function installWindowsService() {
  console.log('📦 Instalando servicio de Windows...');

  try {
    const Service = require('node-windows').Service;

    const svc = new Service({
      name: SERVICE_NAME,
      description: SERVICE_DESC,
      script: path.join(__dirname, '../src/index.js'),
      nodeOptions: '--max-old-space-size=256',
      env: {
        name: 'NODE_ENV',
        value: 'production'
      }
    });

    svc.on('install', () => {
      console.log('✅ Servicio instalado exitosamente');
      console.log(`   Nombre: ${SERVICE_NAME}`);
      console.log('   Para iniciar: net start ThermalPrinterAgent');
      console.log('   Para detener: net stop ThermalPrinterAgent');
      svc.start();
    });

    svc.on('error', (err) => {
      console.error('❌ Error instalando servicio:', err.message);
      process.exit(1);
    });

    svc.install();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Para Windows, ejecuta como Administrador');
    process.exit(1);
  }
}

function installMacService() {
  console.log('📦 Instalando servicio de macOS (Launch Agent)...');

  const plistPath = path.join(os.homedir(), 'Library/LaunchAgents', `local.${SERVICE_NAME}.plist`);
  const projectDir = path.join(__dirname, '..');

  const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>local.${SERVICE_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${path.join(projectDir, 'src/index.js')}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${path.join(projectDir, 'logs/launchd.log')}</string>
    <key>StandardErrorPath</key>
    <string>${path.join(projectDir, 'logs/launchd-error.log')}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>NODE_ENV</key>
        <string>production</string>
    </dict>
</dict>
</plist>`;

  try {
    // Crear directorio si no existe
    const launchAgentsDir = path.dirname(plistPath);
    if (!fs.existsSync(launchAgentsDir)) {
      fs.mkdirSync(launchAgentsDir, { recursive: true });
    }

    // Crear logs dir
    const logsDir = path.join(projectDir, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Escribir archivo plist
    fs.writeFileSync(plistPath, plistContent);

    console.log('✅ Servicio instalado exitosamente');
    console.log(`   Archivo: ${plistPath}`);
    console.log('   Se inicia automáticamente al login');
    console.log('   Para iniciar manualmente: launchctl load ' + plistPath);
    console.log('   Para detener: launchctl unload ' + plistPath);

  } catch (error) {
    console.error('❌ Error instalando servicio:', error.message);
    process.exit(1);
  }
}

function installLinuxService() {
  console.log('📦 Instalando servicio de Linux (systemd)...');

  const projectDir = path.join(__dirname, '..');
  const serviceFile = `/etc/systemd/system/${SERVICE_NAME}.service`;

  const serviceContent = `[Unit]
Description=${SERVICE_DESC}
After=network.target

[Service]
Type=simple
User=thermal-printer
WorkingDirectory=${projectDir}
ExecStart=/usr/bin/node ${path.join(projectDir, 'src/index.js')}
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
`;

  try {
    console.log('   Se requieren permisos de administrador (sudo)');
    console.log('   Archivo de servicio:');
    console.log(serviceContent);
    console.log('\n   Para instalar manualmente:');
    console.log(`   1. sudo tee ${serviceFile}`);
    console.log('      (Pega el contenido anterior)');
    console.log(`   2. sudo systemctl daemon-reload`);
    console.log(`   3. sudo systemctl enable ${SERVICE_NAME}`);
    console.log(`   4. sudo systemctl start ${SERVICE_NAME}`);
    console.log(`\n   Para ver logs: journalctl -u ${SERVICE_NAME} -f`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function main() {
  console.log('🖨️  Instalador de Agente de Impresoras Térmicas\n');

  const platform = os.platform();

  if (platform === 'win32') {
    installWindowsService();
  } else if (platform === 'darwin') {
    installMacService();
  } else if (platform === 'linux') {
    installLinuxService();
  } else {
    console.error('❌ Plataforma no soportada:', platform);
    process.exit(1);
  }
}

main();
