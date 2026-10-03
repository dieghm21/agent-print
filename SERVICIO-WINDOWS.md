# 🪟 Instalar como Servicio de Windows

Esta guía explica cómo instalar el agente de impresoras como servicio de Windows para que se ejecute automáticamente al iniciar el PC.

## ¿Por qué instalar como servicio?

✅ **Se inicia automáticamente** al encender el PC
✅ **Se ejecuta en segundo plano** sin necesidad de abrir terminal
✅ **Se reinicia automáticamente** si falla
✅ **No requiere que un usuario esté logueado** (opcional)

---

## Instalación Rápida

### Paso 1: Instalar dependencias (si no lo hiciste)

```bash
npm install
```

### Paso 2: Abrir PowerShell como Administrador

1. Busca "PowerShell" en el menú inicio
2. Clic derecho → **"Ejecutar como administrador"**
3. Navega a la carpeta del proyecto:
   ```powershell
   cd C:\ruta\al\proyecto\agent-print
   ```

### Paso 3: Instalar el servicio

```bash
npm run install-service
```

Espera a que aparezca:
```
✅ Servicio instalado exitosamente
   Nombre: ThermalPrinterAgent
```

### Paso 4: Verificar que el servicio está corriendo

Abre el "Administrador de Servicios":
1. Presiona `Win + R`
2. Escribe `services.msc` y presiona Enter
3. Busca **"ThermalPrinterAgent"**
4. Debería estar en estado **"En ejecución"**

---

## Comandos Útiles

### Iniciar el servicio manualmente
```powershell
net start ThermalPrinterAgent
```

### Detener el servicio
```powershell
net stop ThermalPrinterAgent
```

### Reiniciar el servicio
```powershell
net stop ThermalPrinterAgent
net start ThermalPrinterAgent
```

### Ver estado del servicio
```powershell
sc query ThermalPrinterAgent
```

### Desinstalar el servicio
```bash
npm run uninstall-service
```

---

## Configuración del Servicio

### Cambiar tipo de inicio

Por defecto, el servicio se inicia **automáticamente** al encender Windows.

Para cambiar esto:
1. Abre `services.msc`
2. Busca **ThermalPrinterAgent**
3. Clic derecho → **Propiedades**
4. En "Tipo de inicio" selecciona:
   - **Automático**: Se inicia al encender el PC
   - **Manual**: Solo se inicia cuando lo ejecutes manualmente
   - **Deshabilitado**: No se puede iniciar

### Configurar reinicio automático en caso de fallo

Por defecto ya está configurado, pero puedes verificar:
1. Abre `services.msc`
2. Busca **ThermalPrinterAgent**
3. Clic derecho → **Propiedades** → Pestaña **"Recuperación"**
4. Configura las acciones para:
   - Primer error: **Reiniciar el servicio**
   - Segundo error: **Reiniciar el servicio**
   - Errores posteriores: **Reiniciar el servicio**

---

## Ver Logs del Servicio

Los logs se guardan en:
```
logs/combined.log  → Logs generales
logs/error.log     → Solo errores
```

Para ver en tiempo real:
```bash
# PowerShell
Get-Content logs/combined.log -Wait -Tail 50
```

O abre los archivos con cualquier editor de texto.

---

## Troubleshooting

### Error: "Acceso denegado"
- **Causa**: No ejecutaste PowerShell como Administrador
- **Solución**: Cierra PowerShell y ábrelo como Administrador

### Error: "node-windows not found"
- **Causa**: No se instalaron las dependencias
- **Solución**: `npm install`

### El servicio no inicia
1. Verifica logs: `logs/error.log`
2. Prueba ejecutar manualmente: `npm start`
3. Si funciona manualmente pero no como servicio, verifica permisos de carpeta

### La impresora no imprime cuando es servicio
- **Causa**: El servicio no tiene acceso a dispositivos USB del usuario
- **Solución**: Configura el servicio para ejecutarse con tu usuario:
  1. Abre `services.msc`
  2. Busca **ThermalPrinterAgent** → Propiedades
  3. Pestaña **"Iniciar sesión"**
  4. Selecciona **"Esta cuenta"**
  5. Ingresa tu usuario y contraseña de Windows
  6. Reinicia el servicio

### Actualizar el servicio después de cambios en el código

Si actualizas el código del proyecto:
1. **Detener el servicio**:
   ```powershell
   net stop ThermalPrinterAgent
   ```

2. **Reiniciar el servicio**:
   ```powershell
   net start ThermalPrinterAgent
   ```

No necesitas reinstalar el servicio, solo reiniciarlo.

---

## Desinstalación

Para remover completamente el servicio:

```bash
npm run uninstall-service
```

Esto:
1. Detiene el servicio
2. Lo desinstala
3. Limpia archivos relacionados

---

## Alternativa: Ejecutar al Inicio sin Servicio

Si no quieres instalar como servicio, puedes hacer que se ejecute al iniciar sesión:

1. Presiona `Win + R`
2. Escribe `shell:startup` y presiona Enter
3. Crea un archivo `start-printer-agent.bat` con:
   ```batch
   @echo off
   cd C:\ruta\al\proyecto\agent-print
   node src/index.js
   ```
4. Guarda el archivo en la carpeta que se abrió

**Diferencias:**
- ❌ Solo se ejecuta cuando inicias sesión (no antes)
- ❌ Se muestra ventana de consola
- ✅ No requiere permisos de administrador
- ✅ Más fácil de configurar

---

## Preguntas Frecuentes

### ¿Puedo tener múltiples instancias?
No, solo una instancia del servicio puede correr a la vez.

### ¿Consume muchos recursos?
No, el servicio consume ~50-80 MB de RAM cuando está inactivo.

### ¿Funciona con múltiples impresoras?
Sí, el servicio maneja todas las impresoras conectadas.

### ¿Se actualiza automáticamente?
No, debes actualizar manualmente y reiniciar el servicio.

### ¿Puedo ver la API desde otros equipos en la red?
Sí, pero debes configurar el firewall de Windows para permitir conexiones al puerto 3002.

---

## Soporte

Si tienes problemas:
1. Revisa logs en `logs/error.log`
2. Verifica que el servicio está corriendo: `sc query ThermalPrinterAgent`
3. Prueba ejecutar manualmente: `npm start`
