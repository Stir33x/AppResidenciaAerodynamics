const fs = require('fs');
const { detectMagic, readHead } = require('../lib/file-probe');

// Tipos permitidos según el flujo. Detectados por bytes mágicos,
// no por la extensión ni el MIME declarado por el cliente.
const DOC_ALLOWED = ['pdf', 'jpeg', 'png', 'doc', 'docx'];
const IMAGE_ALLOWED = ['jpeg', 'png', 'gif', 'webp'];

const makeVerifier = (allowed, label) => (req, res, next) => {
  if (!req.file) return next();

  let detected = null;
  try {
    detected = detectMagic(readHead(req.file.path));
  } catch (err) {
    return next();
  }

  if (!detected || !allowed.includes(detected)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: `Contenido no reconocido como ${label} válido` });
  }

  next();
};

module.exports = {
  verifyDocument: makeVerifier(DOC_ALLOWED, 'documento'),
  verifyImage: makeVerifier(IMAGE_ALLOWED, 'imagen'),
};