/**
 * Script de Desinstalación de Servicio del Sistema
 */

const path = require('path');
const fs = require('fs');
const os = require('os');

const SERVICE_NAME = 'ThermalPrinterAgent';

function uninstallWindowsService() {
  console.log('🗑️  Desintalando servicio de Windows...');

  try {
    const Service = require('node-windows').Service;

    const svc = new Service({
      name: SERVICE_NAME
    });

    svc.on('uninstall', () => {
      console.log('✅ Servicio desinstalado exitosamente');
    });

    svc.on('error', (err) => {
      console.error('❌ Error desinstalando servicio:', err.message);
      process.exit(1);
    });

    svc.uninstall();

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Para Windows, ejecuta como Administrador');
    process.exit(1);
  }
}

function uninstallMacService() {
  console.log('🗑️  Desinstalando servicio de macOS...');

  const plistPath = path.join(os.homedir(), 'Library/LaunchAgents', `local.${SERVICE_NAME}.plist`);

  try {
    if (fs.existsSync(plistPath)) {
      fs.unlinkSync(plistPath);
      console.log('✅ Servicio desinstalado exitosamente');
      console.log(`   Archivo eliminado: ${plistPath}`);
    } else {
      console.log('⚠️  Archivo de servicio no encontrado');
    }
  } catch (error) {
    console.error('❌ Error desinstalando servicio:', error.message);
    process.exit(1);
  }
}

function uninstallLinuxService() {
  console.log('🗑️  Desinstalando servicio de Linux...');
  console.log('   Ejecuta los siguientes comandos:');
  console.log(`   1. sudo systemctl stop ${SERVICE_NAME}`);
  console.log(`   2. sudo systemctl disable ${SERVICE_NAME}`);
  console.log(`   3. sudo rm /etc/systemd/system/${SERVICE_NAME}.service`);
  console.log(`   4. sudo systemctl daemon-reload`);
}

function main() {
  console.log('🖨️  Desinstalador de Agente de Impresoras Térmicas\n');

  const platform = os.platform();

  if (platform === 'win32') {
    uninstallWindowsService();
  } else if (platform === 'darwin') {
    uninstallMacService();
  } else if (platform === 'linux') {
    uninstallLinuxService();
  } else {
    console.error('❌ Plataforma no soportada:', platform);
    process.exit(1);
  }
}

main();
