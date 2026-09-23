# 🖥️ Guía de Instalación para Windows

## Requisitos

- Windows 7 o superior
- Node.js 14+ (LTS recomendado)
- npm
- Impresora térmica USB ESCPOS

---

## 📋 Paso a Paso

### **Paso 1: Instalar Node.js**

1. Descarga desde: https://nodejs.org/ (versión LTS)
2. Ejecuta el instalador
3. Marca "Add to PATH" durante la instalación
4. Reinicia la computadora

**Verifica la instalación (PowerShell):**
```powershell
node --version
npm --version
```

---

### **Paso 2: Descargar el Proyecto**

Opción A - Desde Git:
```powershell
git clone <URL-del-repositorio> agent-print
cd agent-print
```

Opción B - Desde ZIP:
- Descarga el ZIP
- Extrae en `C:\Aplicaciones\agent-print`
- Abre PowerShell en esa carpeta

---

### **Paso 3: Instalar Dependencias**

```powershell
npm install
```

Espera a que complete (puede tomar 2-3 minutos)

---

### **Paso 4: Configurar**

```powershell
copy .env.example .env
```

Edita `.env` si necesitas cambiar el puerto o host.

---

### **Paso 5: Conectar Impresora USB**

1. Conecta la impresora térmica al puerto USB
2. Asegúrate de que esté encendida
3. Windows debería detectarla automáticamente

---

### **Paso 6: Iniciar el Agente**

```powershell
npm start
```

Deberías ver:
```
🖨️  Agente de Impresoras Térmicas escuchando en http://127.0.0.1:3001
```

---

### **Paso 7: Escanear Impresoras**

En otra PowerShell, ejecuta:

```powershell
# Escanear manualmente
curl -Method Post http://localhost:3001/api/printers/scan/now

# Ver impresoras conectadas
curl http://localhost:3001/api/printers
```

---

### **Paso 8: Instalar como Servicio (Opcional)**

Para que se inicie automáticamente con Windows:

```powershell
# Abre PowerShell como ADMINISTRADOR
npm run install-service
```

Verifica en Servicios:
- `Win+R` → `services.msc`
- Busca "ThermalPrinterAgent"
- Debería estar "Running"

---

## 🧪 Pruebas

### Prueba 1: Health Check
```powershell
curl http://localhost:3001/api/health
```

Respuesta esperada:
```json
{
  "success": true,
  "status": "healthy"
}
```

### Prueba 2: Listar Impresoras
```powershell
curl http://localhost:3001/api/printers
```

Deberías ver tus impresoras detectadas.

### Prueba 3: Escanear Impresoras
```powershell
curl -Method Post http://localhost:3001/api/printers/scan/now
```

### Prueba 4: Imprimir Texto
```powershell
curl -Method Post http://localhost:3001/api/print/text `
  -Headers @{"Content-Type"="application/json"} `
  -Body '{
    "printerId": "AQUI-VA-EL-ID-DE-LA-IMPRESORA",
    "text": "¡Hola Mundo!",
    "align": "center",
    "cut": true
  }'
```

---

## 📊 Verificar Detección de Impresoras

Si no detecta la impresora:

1. **Verifica que esté conectada:**
   - `Win+R` → `devmgmt.msc` (Administrador de dispositivos)
   - Busca la impresora en "Otros dispositivos" o "Impresoras"

2. **Instala drivers si es necesario:**
   - Descargalos del sitio web del fabricante
   - Reinicia la computadora

3. **Ejecuta escaneo manual:**
   ```powershell
   curl -Method Post http://localhost:3001/api/printers/scan/now
   ```

4. **Revisa los logs:**
   ```powershell
   Get-Content logs\combined.log -Tail 20
   ```

---

## 🔧 Gestionar el Servicio

### Iniciar
```powershell
net start ThermalPrinterAgent
```

### Detener
```powershell
net stop ThermalPrinterAgent
```

### Desinstalar
```powershell
# Como Administrador
npm run uninstall-service
```

---

## 🐛 Troubleshooting

### "npm no se encuentra"
- Reinicia PowerShell
- Asegúrate de que Node.js está en PATH

### "Puerto 3001 en uso"
```powershell
# Cambiar puerto en .env
PORT=3002
```

### "Impresora no se detecta"
1. Reconecta la impresora USB
2. Ejecuta: `curl -Method Post http://localhost:3001/api/printers/scan/now`
3. Revisa `logs\error.log`

### "Error instalando como servicio"
- Abre PowerShell como Administrador
- Ejecuta `npm run install-service` nuevamente

---

## 📚 Archivos Importantes

- `logs/combined.log` - Todos los eventos
- `logs/error.log` - Solo errores
- `.env` - Configuración del agente

---

## ✅ Checklist

- ✅ Node.js instalado
- ✅ `npm install` completado
- ✅ `.env` copiado
- ✅ Impresora conectada por USB
- ✅ Servidor iniciado
- ✅ Impresora detectada
- ✅ Pruebas pasadas

---

## 🚀 Conectar desde tu Aplicación Web

### URL del Agente
```
http://localhost:3001
```

### Ejemplo React
```javascript
async function printText() {
  const response = await fetch('http://localhost:3001/api/printers');
  const { printers } = await response.json();
  
  if (printers.length > 0) {
    await fetch('http://localhost:3001/api/print/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerId: printers[0].id,
        text: '¡Hola desde React!',
        cut: true
      })
    });
  }
}
```

---

¡Listo! El agente está configurado para Windows. 🎉
