const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.resolve(__dirname, '..', '..', 'uploads', 'documents');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pool = require('../db');
    pool.query(
      `SELECT p.email FROM students s JOIN profiles p ON p.id = s.profile_id WHERE s.id = ?
       UNION
       SELECT p.email FROM guests g JOIN profiles p ON p.id = g.profile_id WHERE g.id = ?`,
      [req.params.id, req.params.id]
    ).then(([rows]) => {
      const email = rows.length > 0 ? rows[0].email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_') : 'unknown';
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
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (!allowed.includes(ext)) return cb(new Error('Tipo de archivo no permitido'));
    if (!allowedMimes.includes(file.mimetype)) return cb(new Error('Tipo MIME no permitido'));
    cb(null, true);
  },
});

module.exports = upload;
