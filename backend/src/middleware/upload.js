const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pool = require('../db');
    pool.query(
      'SELECT p.email FROM students s JOIN profiles p ON p.id = s.profile_id WHERE s.id = ?',
      [req.params.id]
    ).then(([students]) => {
      const email = students.length > 0 ? students[0].email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_') : 'unknown';
      const dir = path.join(uploadDir, email);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      req.uploadSubfolder = email;
      cb(null, dir);
    }).catch((err) => cb(err));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error('Tipo de archivo no permitido'));
  },
});

module.exports = upload;
