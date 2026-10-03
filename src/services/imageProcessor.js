/**
 * Procesador de logos para recibos térmicos
 * Carga logos locales y los convierte a comandos ESC/POS para impresión
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const logger = require('../utils/logger');

// Variable global para almacenar el comando ESC/POS del logo en memoria
let cachedLogoCommand = null;

/**
 * Carga un logo desde el sistema de archivos local
 * @param {string} logoPath - Ruta al archivo de logo
 * @returns {Promise<Buffer>} Buffer de la imagen
 */
async function loadLocalLogo(logoPath) {
  return new Promise((resolve, reject) => {
    fs.readFile(logoPath, (err, data) => {
      if (err) {
        return reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Convierte una imagen a bitmap ESC/POS
 * @param {Buffer} imageBuffer - Buffer de la imagen
 * @param {number} maxWidth - Ancho máximo en píxeles (POS-80C = 384px)
 * @returns {Promise<Buffer>} Buffer con comandos ESC/POS
 */
async function convertToEscPosBitmap(imageBuffer, maxWidth = 384) {
  try {
    // Procesar imagen con sharp
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Calcular dimensiones manteniendo aspecto
    let width = metadata.width;
    let height = metadata.height;
    
    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    
    // Convertir a escala de grises y redimensionar
    // Agregar fondo blanco si tiene transparencia
    const processedBuffer = await image
      .resize(width, height, { fit: 'inside' })
      .flatten({ background: { r: 255, g: 255, b: 255 } }) // Fondo blanco
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    const { data, info } = processedBuffer;
    const finalWidth = info.width;
    const finalHeight = info.height;
    
    // Convertir a bitmap (1 bit por píxel)
    const widthBytes = Math.ceil(finalWidth / 8);
    const bitmap = Buffer.alloc(widthBytes * finalHeight);
    
    let bitmapIndex = 0;
    for (let y = 0; y < finalHeight; y++) {
      for (let x = 0; x < widthBytes; x++) {
        let byte = 0;
        
        for (let bit = 0; bit < 8; bit++) {
          const pixelX = x * 8 + bit;
          if (pixelX < finalWidth) {
            const pixelIndex = y * finalWidth + pixelX;
            const luminance = data[pixelIndex];
            
            // Si es oscuro (< 128), imprime (1), si es claro, no imprime (0)
            if (luminance < 128) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        
        bitmap[bitmapIndex++] = byte;
      }
    }
    
    // Construir comando ESC/POS
    const parts = [];
    
    // Centrar imagen
    parts.push(Buffer.from([0x1b, 0x61, 0x01])); // ESC a 1 (center)
    
    // Comando GS v 0 (Print raster bitmap)
    const xL = widthBytes & 0xFF;
    const xH = (widthBytes >> 8) & 0xFF;
    const yL = finalHeight & 0xFF;
    const yH = (finalHeight >> 8) & 0xFF;
    
    parts.push(Buffer.from([0x1d, 0x76, 0x30, 0x00])); // GS v 0 0
    parts.push(Buffer.from([xL, xH, yL, yH])); // Dimensiones
    parts.push(bitmap); // Datos bitmap
    
    // Alineación normal
    parts.push(Buffer.from([0x1b, 0x61, 0x00])); // ESC a 0 (left)
    
    // Avance de línea
    parts.push(Buffer.from([0x0a, 0x0a])); // 2 line feeds
    
    return Buffer.concat(parts);
    
  } catch (error) {
    logger.error('Error convirtiendo imagen a ESC/POS', { error: error.message });
    throw error;
  }
}

/**
 * Inicializa el logo desde el archivo local
 * Se ejecuta al iniciar el servidor
 * @param {string} logoPath - Ruta al archivo de logo (default: logos/business-logo.png)
 */
async function initializeLogo(logoPath = path.join(process.cwd(), 'logos', 'business-logo.png')) {
  try {
    logger.info('Intentando cargar logo local', { logoPath });
    
    // Verificar si el archivo existe
    if (!fs.existsSync(logoPath)) {
      logger.warn('Archivo de logo no encontrado. Las facturas se imprimirán sin logo.', { logoPath });
      cachedLogoCommand = null;
      return null;
    }

    const imageBuffer = await loadLocalLogo(logoPath);
    logger.info('Logo cargado exitosamente', { sizeBytes: imageBuffer.length });

    // Convertir a comandos ESC/POS
    const logoCommand = await convertToEscPosBitmap(imageBuffer, 384);
    cachedLogoCommand = logoCommand;

    logger.info('Logo procesado y almacenado en caché', { commandSize: logoCommand.length });
    return cachedLogoCommand;

  } catch (error) {
    logger.error('Error al inicializar logo', { error: error.message, logoPath });
    cachedLogoCommand = null;
    return null;
  }
}

/**
 * Obtiene el comando de logo desde la caché
 * @returns {Buffer|null} Comando ESC/POS del logo o null si no existe
 */
function getCachedLogo() {
  return cachedLogoCommand;
}

module.exports = {
  initializeLogo,
  getCachedLogo,
  loadLocalLogo,
  convertToEscPosBitmap
};
