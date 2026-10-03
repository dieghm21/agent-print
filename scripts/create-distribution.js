/**
 * Script para crear distribución ZIP del proyecto
 * Excluye archivos innecesarios (node_modules, .git, logs)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creando distribución del proyecto...\n');

const projectName = 'thermal-printer-agent';
const version = require('../package.json').version;
const distName = `${projectName}-v${version}.zip`;

// Archivos y carpetas a excluir
const excludes = [
  'node_modules',
  '.git',
  'logs/*.log',
  '.env',
  'logos/business-logo.*',
  '*.zip'
].join(' ');

try {
  // Verificar si existe PowerShell (Windows)
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    console.log('🔨 Creando ZIP con PowerShell...');
    
    // Crear lista de exclusiones
    const excludePattern = [
      'node_modules',
      '.git',
      'logs\\*.log',
      '.env',
      'logos\\business-logo.*',
      '*.zip'
    ];
    
    // Comando PowerShell para crear ZIP excluyendo carpetas/archivos
    const command = `powershell -Command "` +
      `$source = Get-ChildItem -Path . -Recurse | ` +
      `Where-Object { ` +
      `$_.FullName -notmatch 'node_modules' -and ` +
      `$_.FullName -notmatch '\\\\.git' -and ` +
      `$_.FullName -notmatch 'logs\\\\.*\\\\.log' -and ` +
      `$_.Name -ne '.env' -and ` +
      `$_.FullName -notmatch 'business-logo' -and ` +
      `$_.Extension -ne '.zip' ` +
      `}; ` +
      `Compress-Archive -Path $source -DestinationPath '${distName}' -Force` +
      `"`;
    
    execSync(command, { stdio: 'inherit' });
    
  } else {
    console.log('🔨 Creando ZIP con zip command...');
    
    // Para macOS/Linux, usar comando zip
    const command = `zip -r ${distName} . ` +
      `-x "node_modules/*" ` +
      `-x ".git/*" ` +
      `-x "logs/*.log" ` +
      `-x ".env" ` +
      `-x "logos/business-logo.*" ` +
      `-x "*.zip"`;
    
    execSync(command, { stdio: 'inherit' });
  }
  
  console.log(`\n✅ Distribución creada: ${distName}`);
  console.log('\n📋 Instrucciones para el otro equipo:');
  console.log('1. Descomprimir el archivo ZIP');
  console.log('2. Abrir terminal en la carpeta descomprimida');
  console.log('3. Ejecutar: npm install');
  console.log('4. Copiar .env.example a .env');
  console.log('5. (Opcional) Agregar logo en logos/business-logo.png');
  console.log('6. Ejecutar: npm start');
  
} catch (error) {
  console.error('❌ Error al crear distribución:', error.message);
  process.exit(1);
}
