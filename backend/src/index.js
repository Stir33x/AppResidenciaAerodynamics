const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// ============================================
// LOG DE ERRORES A ARCHIVO (para ver qué pasa en producción)
// ============================================
const logError = (msg) => {
  try {
    const logPath = path.resolve(__dirname, '..', 'error-debug.log');
    const entry = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logPath, entry);
  } catch (e) {
    // Si no puede escribir, al menos lo intenta
  }
};

// ============================================
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ============================================
if (!process.env.JWT_SECRET) {
  const fatal = 'FATAL: JWT_SECRET no está definido en .env';
  console.error(fatal);
  logError(fatal);
  // NO hacer process.exit(1) en Passenger — mata la app y Passenger no sabe por qué
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

// ============================================
// IMPORTS
// ============================================
const passport = require('./passport');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const guestsRoutes = require('./routes/guests');
const paymentsRoutes = require('./routes/payments');
const roomsRoutes = require('./routes/rooms');
const incidentsRoutes = require('./routes/incidents');
const cleaningRoutes = require('./routes/cleaning');
const commonZonesRoutes = require('./routes/common-zones');
const documentTypesRoutes = require('./routes/document-types');
const coursesRoutes = require('./routes/cursos');
const usersRoutes = require('./routes/users');
const horariosRoutes = require('./routes/horarios');
const horarioTypesRoutes = require('./routes/horario-types');
const inventoryRoutes = require('./routes/inventory');
const departureChecklistRoutes = require('./routes/departure-checklist');
const registrationChecklistRoutes = require('./routes/registration-checklist');
const uploadRoutes = require('./routes/upload');
const menuRoutes = require('./routes/menu');
const cron = require('node-cron');
const cronJobs = require('./cron');

const { authMiddleware, requireRole } = require('./middleware/auth');

const app = express();

// ============================================
// PUERTO — CRÍTICO EN DINAHOSTING
// ============================================
// Passenger pasa el puerto por process.env.PORT. Si no, usamos 0 (comodín).
// NUNCA uses un puerto fijo como 3000 en Dinahosting.
const PORT = process.env.PORT || 0;

// ============================================
// MIDDLEWARES
// ============================================
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`CORS: origen no permitido: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
}));

app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

// ============================================
// RATE LIMITING
// ============================================
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, inténtalo más tarde' },
});
//app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, inténtalo más tarde' },
});

// ============================================
// UPLOADS — CORREGIDO: ahora con /api/ delante
// ============================================
// Imágenes públicas (accesibles sin auth, pero solo vía API)
app.use('/api/uploads/images', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(__dirname, '..', 'uploads', 'images')));

// Documentos privados (requieren autenticación) — AJUSTA la ruta absoluta si los moviste fuera de www/
const PRIVATE_UPLOADS_DIR = process.env.PRIVATE_UPLOADS_PATH
  || path.resolve(__dirname, '..', 'uploads');
app.use('/api/uploads', passport.authenticate('jwt', { session: false }), express.static(PRIVATE_UPLOADS_DIR));

// ============================================
// RUTAS
// ============================================
app.use('/api', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/guests', guestsRoutes);
app.use('/api/pagos', paymentsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/incidencias', incidentsRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/common-zones', commonZonesRoutes);
app.use('/api/document-types', documentTypesRoutes);
app.use('/api/cursos', coursesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/horario-types', horarioTypesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/departure-checklist', departureChecklistRoutes);
app.use('/api/registration-checklist', registrationChecklistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/menu', menuRoutes);

app.get('/api/stats', passport.authenticate('jwt', { session: false }), requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const pool = require('./db');
    const [students] = await pool.query("SELECT COUNT(*) AS count FROM students WHERE estado IN ('activo','pendiente_salida')");
    const [incidents] = await pool.query("SELECT COUNT(*) AS count FROM incidencias WHERE estado IN ('reportada','en_curso')");
    const [pending] = await pool.query("SELECT COUNT(*) AS count FROM pagos WHERE estado = 'pendiente'");
    const [overdue] = await pool.query("SELECT COUNT(*) AS count FROM pagos WHERE estado = 'pendiente' AND fecha_vencimiento < CURDATE()");
    const [next7] = await pool.query("SELECT COUNT(*) AS count FROM pagos WHERE estado = 'pendiente' AND fecha_vencimiento BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
    res.json({
      students_active: students[0].count,
      incidents_open: incidents[0].count,
      payments_pending: pending[0].count,
      payments_overdue: overdue[0].count,
      payments_next_7_days: next7[0].count,
    });
  } catch (err) {
    console.error(err);
    logError(err.stack || err.message);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ============================================
// 404 — Oculta "Cannot GET" redirigiendo al frontend
// ============================================
app.use((req, res, next) => {
  if (req.accepts('html')) {
    return res.redirect('/');
  }
  res.status(404).json({ error: 'Not found' });
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Archivo demasiado grande' });
    return res.status(400).json({ error: err.message });
  }

  const errorMsg = err.stack || err.message || String(err);
  console.error(errorMsg);
  logError(`${req.method} ${req.url}\n${errorMsg}`);

  res.status(500).json({ error: 'Error interno del servidor' });
});

// ============================================
// CRON
// ============================================
cron.schedule('0 2 * * *', () => {
  try {
    cronJobs.run();
  } catch (err) {
    logError(`Cron error: ${err.stack || err.message}`);
  }
});

// ============================================
// ARRANQUE
// ============================================
app.listen(PORT, () => {
  const bootMsg = `Servidor corriendo. Puerto asignado: ${PORT}`;
  console.log(bootMsg);
  logError(`BOOT: ${bootMsg}`);

  try {
    cronJobs.run();
  } catch (err) {
    logError(`Cron init error: ${err.stack || err.message}`);
  }
});
