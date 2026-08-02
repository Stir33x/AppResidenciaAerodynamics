const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'images');
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};
ensureDir(uploadDir);

// Sanitiza el nombre de carpeta (habitación / categoría) evitando path traversal
const safeSegment = (v) => {
  const s = String(v || '').trim();
  const clean = s.replace(/[\\/]/g, '-').replace(/\.\./g, '').replace(/[\u0000-\u001f]/g, '');
  return clean;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const room = safeSegment(req.body?.room || req.body?.habitacion);
      const carpeta = safeSegment(req.body?.carpeta || req.body?.tipo);
      let dir = uploadDir;
      if (room) dir = path.join(dir, room);
      if (carpeta) dir = path.join(dir, carpeta);
      ensureDir(dir);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const uploadImage = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Formato de imagen no permitido (jpg, png, webp, gif)'));
  },
});

module.exports = uploadImage;
module.exports.uploadDir = uploadDir;
