# 📦 Guía de Distribución

Este documento explica cómo crear paquetes del proyecto para distribuir a otros equipos sin necesidad de clonar el repositorio Git.

## Opciones de Distribución

### Opción 1: Distribución Ligera (Recomendada)

**Tamaño:** ~500 KB (sin node_modules)
**Requiere:** npm install en el equipo destino

```bash
npm run create-dist
```

Esto crea un archivo `thermal-printer-agent-v1.0.0.zip` que **excluye**:
- `node_modules/`
- `.git/`
- `logs/*.log`
- `.env`
- `logos/business-logo.*`
- Archivos ZIP

**Ventajas:**
- ✅ Archivo muy pequeño (~500 KB)
- ✅ Fácil de enviar por correo o Slack
- ✅ Las dependencias se instalan limpias en cada equipo

**Desventajas:**
- ❌ Requiere ejecutar `npm install` (necesita internet)

---

### Opción 2: Versión Portable (Para equipos sin internet)

**Tamaño:** ~80-120 MB (con node_modules incluido)
**Requiere:** Solo Node.js instalado

```bash
npm run create-portable
```

Esto crea un archivo `thermal-printer-agent-v1.0.0-portable.zip` que **incluye**:
- ✅ `node_modules/` completo
- ✅ Todo el código fuente
- ✅ Configuración base

**Ventajas:**
- ✅ No requiere npm install
- ✅ Funciona sin internet
- ✅ Listo para ejecutar inmediatamente

**Desventajas:**
- ❌ Archivo grande (~100 MB)
- ❌ Difícil de enviar por correo

---

## Instrucciones para el Equipo Destino

### Opción 1: Distribución Ligera

1. **Descomprimir el ZIP**
   ```bash
   unzip thermal-printer-agent-v1.0.0.zip
   cd thermal-printer-agent
   ```

2. **Instalar Node.js** (si no está instalado)
   - Descargar desde: https://nodejs.org/
   - Versión recomendada: v20.11.1 (mínimo v18.0.0)

3. **Instalar dependencias**
   ```bash
   npm install
   ```

4. **Configurar variables de entorno** (opcional)
   ```bash
   copy .env.example .env
   # Editar .env si es necesario
   ```

5. **Agregar logo** (opcional)
   - Guardar logo como: `logos/business-logo.png`

6. **Iniciar el servidor**
   ```bash
   npm start
   ```

---

### Opción 2: Versión Portable

1. **Descomprimir el ZIP**
   ```bash
   unzip thermal-printer-agent-v1.0.0-portable.zip
   cd thermal-printer-agent
   ```

2. **Instalar Node.js** (si no está instalado)
   - Descargar desde: https://nodejs.org/
   - Versión recomendada: v20.11.1

3. **Configurar variables de entorno** (opcional)
   ```bash
   copy .env.example .env
   ```

4. **Agregar logo** (opcional)
   - Guardar logo como: `logos/business-logo.png`

5. **Iniciar el servidor**
   ```bash
   npm start
   ```
   
   ⚡ **NO necesita ejecutar npm install**

---

## Distribución Vía USB/Carpeta Compartida

Si quieres distribuir via USB o carpeta de red:

1. Crea la versión portable:
   ```bash
   npm run create-portable
   ```

2. Copia el archivo ZIP a USB o carpeta compartida

3. El otro equipo solo necesita:
   - Descomprimir
   - Tener Node.js instalado
   - Ejecutar `npm start`

---

## Actualización en Equipos Remotos

Si ya tienen una versión instalada:

1. **Parar el servidor** (Ctrl+C o detener servicio)

2. **Respaldar el logo y .env** (si existen)
   ```bash
   copy logos\business-logo.png logos\business-logo.backup.png
   copy .env .env.backup
   ```

3. **Descomprimir nueva versión** (sobrescribir archivos)

4. **Restaurar logo y .env**
   ```bash
   copy logos\business-logo.backup.png logos\business-logo.png
   copy .env.backup .env
   ```

5. **Si es distribución ligera, actualizar dependencias**
   ```bash
   npm install
   ```

6. **Reiniciar servidor**
   ```bash
   npm start
   ```

---

## Troubleshooting

### Error: "npm: command not found"
- Node.js no está instalado o no está en el PATH
- Solución: Instalar Node.js desde nodejs.org

### Error: "Cannot find module 'express'"
- node_modules no está instalado (solo en distribución ligera)
- Solución: `npm install`

### Impresora no detectada
- Verificar que la impresora está conectada y encendida
- Verificar driver instalado correctamente
- Ver logs en: `logs/combined.log`

### Logo no se imprime
- Verificar que existe: `logos/business-logo.png`
- Verificar permisos del archivo
- Reiniciar servidor después de agregar logo

---

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar servidor |
| `npm run dev` | Iniciar con auto-reload (desarrollo) |
| `npm run create-dist` | Crear distribución ligera |
| `npm run create-portable` | Crear versión portable |
| `npm test` | Probar API |

---

## Soporte

Si hay problemas en la instalación:
1. Revisar logs: `logs/error.log`
2. Verificar versión de Node: `node --version`
3. Verificar dependencias: `npm list`

