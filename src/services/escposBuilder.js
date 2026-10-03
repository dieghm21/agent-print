/**
 * Constructor de comandos ESC/POS
 * Genera buffers binarios con comandos ESC/POS puros (sin dependencias nativas).
 * Referencia de comandos: estándar ESC/POS (Epson) usado por impresoras térmicas compatibles.
 */

const iconv = require('iconv-lite');

const DEFAULT_ENCODING = 'CP850'; // Soporta acentos y ñ en impresoras térmicas comunes

const CMD = {
  INIT: Buffer.from([0x1b, 0x40]), // ESC @ - Inicializar impresora
  CUT_FULL: Buffer.from([0x1d, 0x56, 0x00]), // GS V 0 - Corte total
  CUT_PARTIAL: Buffer.from([0x1d, 0x56, 0x01]), // GS V 1 - Corte parcial
  ALIGN: {
    left: Buffer.from([0x1b, 0x61, 0x00]),
    center: Buffer.from([0x1b, 0x61, 0x01]),
    right: Buffer.from([0x1b, 0x61, 0x02])
  },
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]),
  FONT_NORMAL: Buffer.from([0x1d, 0x21, 0x00])
};

// Líneas de avance de papel necesarias antes de cortar, para que la cuchilla
// no corte sobre la última línea de texto impresa (offset físico cabezal-cuchilla).
const FEED_LINES_BEFORE_CUT = 4;

/**
 * Genera el comando ESC d n (avanzar n líneas) - más confiable que enviar '\n' repetidos
 * porque no depende de la codificación de texto usada.
 */
function feedLines(n) {
  return Buffer.from([0x1b, 0x64, Math.min(Math.max(parseInt(n, 10) || 1, 0), 255)]);
}

/**
 * Genera el byte de tamaño de fuente (GS ! n) para escala 1-8 en ancho y alto
 */
function fontSizeByte(size) {
  const s = Math.min(Math.max(parseInt(size, 10) || 1, 1), 8) - 1;
  return Buffer.from([0x1d, 0x21, (s << 4) | s]);
}

/**
 * Agrega el avance de papel + comando de corte al final de un trabajo
 */
function appendCut(parts, cutType = CMD.CUT_FULL) {
  parts.push(feedLines(FEED_LINES_BEFORE_CUT));
  parts.push(cutType);
}

/**
 * Construye el buffer para un trabajo de texto simple
 */
function buildTextJob({ text, align = 'left', fontSize = 1, cut = true, encoding = DEFAULT_ENCODING }) {
  const parts = [];

  parts.push(CMD.INIT);
  parts.push(CMD.ALIGN[align] || CMD.ALIGN.left);
  parts.push(fontSizeByte(fontSize));
  parts.push(iconv.encode(String(text), encoding));
  parts.push(iconv.encode('\n', encoding));
  parts.push(CMD.FONT_NORMAL);

  if (cut !== false) {
    appendCut(parts);
  }

  return Buffer.concat(parts);
}

/**
 * Construye el buffer para un bloque de texto ya formateado (recibos, etiquetas)
 */
function buildFormattedJob({ text, cut = true, encoding = DEFAULT_ENCODING }) {
  const parts = [];

  parts.push(CMD.INIT);
  parts.push(iconv.encode(String(text), encoding));

  if (cut !== false) {
    appendCut(parts);
  }

  return Buffer.concat(parts);
}

module.exports = {
  CMD,
  DEFAULT_ENCODING,
  fontSizeByte,
  buildTextJob,
  buildFormattedJob
};
