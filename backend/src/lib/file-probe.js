const fs = require('fs');

const EXT_CONTENT_TYPES = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Detecta el tipo real de un archivo por sus bytes mágicos (no por la extensión
// ni por el MIME que envía el cliente, que son falsables).
function detectMagic(buffer) {
  if (!buffer || buffer.length < 4) return null;
  const header = buffer.toString('latin1', 0, 4);
  if (buffer.length >= 5 && buffer.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (buffer.length >= 8 && buffer.readUInt32BE(0) === 0x89504e47) return 'png';
  if (header === 'GIF8') return 'gif';
  if (buffer.length >= 12 && header === 'RIFF' && buffer.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  if (buffer.length >= 8 && buffer.readUInt32LE(0) === 0xe011cfd0 && buffer.readUInt32LE(4) === 0xe11ab1a1) return 'doc';
  if (buffer.toString('latin1', 0, 2) === 'PK') return 'docx';
  return null;
}

function readHead(filePath, size = 16) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buf = Buffer.alloc(size);
    const bytes = fs.readSync(fd, buf, 0, size, 0);
    return buf.subarray(0, bytes);
  } finally {
    fs.closeSync(fd);
  }
}

// Content-Type seguro a partir de la EXTENSIÓN del archivo al servirlo
// (nunca se confía en el mimetype declarado por el cliente).
function contentTypeForName(name) {
  const ext = String(name || '').toLowerCase().match(/\.[a-z0-9]+$/);
  if (ext && EXT_CONTENT_TYPES[ext[0]]) return EXT_CONTENT_TYPES[ext[0]];
  return 'application/octet-stream';
}

module.exports = { detectMagic, readHead, contentTypeForName, EXT_CONTENT_TYPES };