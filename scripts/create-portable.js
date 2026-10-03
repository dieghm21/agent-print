/**
 * Script para crear versión portable con node_modules incluido
 * No requiere ejecutar npm install en el otro equipo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creando versión PORTABLE del proyecto...\n');

const projectName = 'thermal-printer-agent';
const version = require('../package.json').version;
const distName = `${projectName}-v${version}-portable.zip`;

// Verificar que node_modules existe
if (!fs.existsSync('node_modules')) {
  console.log('⚠️  node_modules no existe. Instalando dependencias...');
  execSync('npm install', { stdio: 'inherit' });
}

console.log('✓ node_modules verificado\n');

// Archivos y carpetas a excluir (menos que la versión normal)
const excludes = [
  '.git',
  'logs/*.log',
  '.env',
  'logos/business-logo.*',
  '*.zip'
];

try {
  const isWindows = process.platform === 'win32';
  
  if (isWindows) {
    console.log('🔨 Creando ZIP portable con PowerShell...');
    
    const command = `powershell -Command "` +
      `$source = Get-ChildItem -Path . -Recurse | ` +
      `Where-Object { ` +
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
    console.log('🔨 Creando ZIP portable con zip command...');
    
    const command = `zip -r ${distName} . ` +
      `-x ".git/*" ` +
      `-x "logs/*.log" ` +
      `-x ".env" ` +
      `-x "logos/business-logo.*" ` +
      `-x "*.zip"`;
    
    execSync(command, { stdio: 'inherit' });
  }
  
  // Obtener tamaño del archivo
  const stats = fs.statSync(distName);
  const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  
  console.log(`\n✅ Versión portable creada: ${distName} (${fileSizeMB} MB)`);
  console.log('\n📋 Instrucciones para el otro equipo:');
  console.log('1. Descomprimir el archivo ZIP');
  console.log('2. Copiar .env.example a .env (opcional)');
  console.log('3. (Opcional) Agregar logo en logos/business-logo.png');
  console.log('4. Ejecutar: npm start');
  console.log('\n⚡ NO necesita ejecutar npm install (node_modules incluido)');
  
} catch (error) {
  console.error('❌ Error al crear versión portable:', error.message);
  process.exit(1);
}
