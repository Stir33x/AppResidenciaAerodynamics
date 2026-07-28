const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET no está definido en .env');
  process.exit(1);
}

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',');

const passport = require('./passport');
const authRoutes = require('./routes/auth');
const studentsRoutes = require('./routes/students');
const paymentsRoutes = require('./routes/payments');
const roomsRoutes = require('./routes/rooms');
const incidentsRoutes = require('./routes/incidents');
const cleaningRoutes = require('./routes/cleaning');
const commonZonesRoutes = require('./routes/common-zones');
const documentTypesRoutes = require('./routes/document-types');
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

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('No permitido por CORS'));
  },
  credentials: true,
}));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(passport.initialize());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones, inténtalo más tarde' },
});
app.use('/api', generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos, inténtalo más tarde' },
});

// Imágenes subidas — solo accesibles vía API autenticado
app.use('/uploads/images', express.static(path.resolve(__dirname, '..', 'uploads', 'images')));

app.use('/api', authRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/pagos', paymentsRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/incidencias', incidentsRoutes);
app.use('/api/cleaning', cleaningRoutes);
app.use('/api/common-zones', commonZonesRoutes);
app.use('/api/document-types', documentTypesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/horarios', horariosRoutes);
app.use('/api/horario-types', horarioTypesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/departure-checklist', departureChecklistRoutes);
app.use('/api/registration-checklist', registrationChecklistRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/menu', menuRoutes);

const { authMiddleware, requireRole } = require('./middleware/auth');

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
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Archivo demasiado grande' });
    return res.status(400).json({ error: err.message });
  }
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Cron diario a las 2:00 AM
cron.schedule('0 2 * * *', () => { cronJobs.run(); });

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
  cronJobs.run(); // ejecutar al arrancar
});
