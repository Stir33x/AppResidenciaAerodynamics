const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { authMiddleware } = require('../middleware/auth');
const { verifyImage } = require('../middleware/verify-upload');
const uploadImage = require('../middleware/upload-image');
const { uploadDir } = uploadImage;

const router = Router();
router.use(authMiddleware);

const SIGN_TTL_MS = 5 * 60 * 1000;

// Firma una URL de imagen sin incrustar el JWT (evita exponer el token
// en el historial, logs y cabeceras Referer). El <img> usa esta URL firmada.
router.get('/sign', (req, res) => {
  try {
    const p = String(req.query.path || '');
    if (!p.startsWith('/uploads/images/')) {
      return res.status(400).json({ error: 'Ruta no válida' });
    }
    const rel = p.replace(/^\/uploads\/images\//, '').replace(/\.\./g, '').split(/[\\/]+/).filter(Boolean).join('/');
    if (!rel) {
      return res.status(400).json({ error: 'Ruta no válida' });
    }
    const exp = Date.now() + SIGN_TTL_MS;
    const sig = crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${rel}:${exp}`).digest('hex');
    res.json({ url: `/uploads/images/${rel}?exp=${exp}&sig=${sig}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/image', uploadImage.single('imagen'), verifyImage, (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se ha enviado ninguna imagen' });
    const rel = path.relative(uploadDir, req.file.path).split(path.sep).join('/');
    const url = rel ? `/uploads/images/${rel}` : `/uploads/images/${req.file.filename}`;
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al subir la imagen' });
  }
});

router.get('/image/:filename', async (req, res) => {
  try {
    const filename = path.basename(req.params.filename);
    if (filename !== req.params.filename || filename.includes('..')) {
      return res.status(400).json({ error: 'Nombre de archivo no válido' });
    }
    const imagesDir = path.resolve(__dirname, '..', '..', 'uploads', 'images');
    const filePath = path.join(imagesDir, filename);
    if (filePath !== path.resolve(imagesDir, filename)) {
      return res.status(400).json({ error: 'Ruta no válida' });
    }
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'No encontrado' });
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;