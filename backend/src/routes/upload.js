const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('../middleware/auth');
const uploadImage = require('../middleware/upload-image');
const { uploadDir } = uploadImage;

const router = Router();
router.use(authMiddleware);

router.post('/image', uploadImage.single('imagen'), (req, res) => {
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
