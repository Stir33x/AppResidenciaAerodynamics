const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();

router.use(authMiddleware);

const isNumericId = (v) => /^\d+$/.test(String(v));

// GET /api/guests — todos los huéspedes (no alumnos) alojados
router.get('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.*, p.email, p.nombre, p.apellidos, p.telefono
      FROM guests g
      JOIN profiles p ON p.id = g.profile_id
      ORDER BY g.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/guests/:id
router.get('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT g.*, p.email, p.nombre, p.apellidos, p.telefono
      FROM guests g
      JOIN profiles p ON p.id = g.profile_id
      WHERE g.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Huésped no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/guests
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { email, password, nombre, apellidos, telefono, habitacion, fecha_entrada, fecha_salida_prevista } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre requeridos' });
    }

    if (habitacion) {
      const [roomExists] = await pool.query('SELECT id FROM rooms WHERE nombre = ?', [habitacion]);
      if (roomExists.length === 0) return res.status(400).json({ error: 'La habitación no existe' });

      // Validar solapamiento con otros huéspedes activos en la misma habitación
      const newStart = fecha_entrada || '1970-01-01';
      const newEnd = fecha_salida_prevista || '9999-12-31';
      const [overlapGuests] = await pool.query(`
        SELECT id FROM guests
        WHERE habitacion = ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, newEnd, newStart]);
      if (overlapGuests.length > 0) return res.status(400).json({ error: 'La habitación tiene huésped asignado en esas fechas' });

      // Validar solapamiento con alumnos activos
      const [overlapStudents] = await pool.query(`
        SELECT id FROM students
        WHERE habitacion = ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, newEnd, newStart]);
      if (overlapStudents.length > 0) return res.status(400).json({ error: 'La habitación tiene alumno asignado en esas fechas' });
    }

    const hash = await bcrypt.hash(password, 12);
    const [profileResult] = await pool.query(
      'INSERT INTO profiles (email, password_hash, nombre, apellidos, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hash, nombre, apellidos || '', telefono || '', 'invitado']
    );

    const [guestResult] = await pool.query(
      'INSERT INTO guests (profile_id, habitacion, fecha_entrada, fecha_salida_prevista) VALUES (?, ?, ?, ?)',
      [profileResult.insertId, habitacion || '', fecha_entrada || null, fecha_salida_prevista || null]
    );

    res.status(201).json({ id: guestResult.insertId, profile_id: profileResult.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/guests/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { habitacion, fecha_entrada, fecha_salida_prevista, fecha_salida_real, estado } = req.body;

    if (estado !== undefined && !['activo', 'baja', 'pendiente_salida'].includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    // Validar solapamiento si cambia habitación con fechas
    if (habitacion) {
      const newStart = fecha_entrada || '1970-01-01';
      const newEnd = fecha_salida_prevista || '9999-12-31';
      const [overlapGuests] = await pool.query(`
        SELECT id FROM guests
        WHERE habitacion = ?
          AND id != ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, req.params.id, newEnd, newStart]);
      if (overlapGuests.length > 0) return res.status(400).json({ error: 'La habitación tiene huésped asignado en esas fechas' });

      const [overlapStudents] = await pool.query(`
        SELECT id FROM students
        WHERE habitacion = ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, newEnd, newStart]);
      if (overlapStudents.length > 0) return res.status(400).json({ error: 'La habitación tiene alumno asignado en esas fechas' });
    }

    const fields = ['habitacion = COALESCE(?, habitacion)', 'fecha_entrada = COALESCE(?, fecha_entrada)', 'fecha_salida_prevista = COALESCE(?, fecha_salida_prevista)', 'fecha_salida_real = COALESCE(?, fecha_salida_real)', 'estado = COALESCE(?, estado)'];
    const params = [habitacion, fecha_entrada, fecha_salida_prevista, fecha_salida_real, estado];

    params.push(req.params.id);
    await pool.query(`UPDATE guests SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/guests/:id/marcar-salida (marcar baja del huésped)
router.put('/:id/marcar-salida', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [guests] = await pool.query('SELECT id, estado FROM guests WHERE id = ?', [req.params.id]);
    if (guests.length === 0) return res.status(404).json({ error: 'Huésped no encontrado' });
    if (guests[0].estado === 'baja') return res.status(400).json({ error: 'El huésped ya está dado de baja' });

    const fecha_salida_real = new Date().toISOString().slice(0, 10);
    await pool.query(
      "UPDATE guests SET estado = 'baja', fecha_salida_real = COALESCE(fecha_salida_real, ?) WHERE id = ?",
      [fecha_salida_real, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/guests/:id/contrato
router.post('/:id/contrato', requireRole('direccion', 'administracion'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

    const { id } = req.params;
    if (!isNumericId(id)) return res.status(400).json({ error: 'ID no válido' });

    const [guestExists] = await pool.query('SELECT id FROM guests WHERE id = ?', [id]);
    if (guestExists.length === 0) return res.status(404).json({ error: 'Huésped no encontrado' });

    const ruta = `/uploads/documents/${req.uploadSubfolder}/${req.file.filename}`;

    await pool.query('UPDATE guests SET contrato_url = ? WHERE id = ?', [ruta, id]);

    await pool.query(
      'INSERT INTO documents (guest_id, tipo, nombre_original, archivo_ruta, mime_type, tamano, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, 'contrato', req.file.originalname, ruta, req.file.mimetype, req.file.size, req.user.id]
    );

    res.json({ ruta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/guests/:id/contrato/download
router.get('/:id/contrato/download', requireRole('direccion', 'administracion', 'invitado'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isNumericId(id)) return res.status(400).json({ error: 'ID no válido' });

    const [guests] = await pool.query(
      `SELECT g.contrato_url, d.mime_type
       FROM guests g
       LEFT JOIN documents d ON d.guest_id = g.id AND d.tipo = 'contrato'
       WHERE g.id = ?
       ORDER BY d.id DESC
       LIMIT 1`,
      [id]
    );
    if (guests.length === 0 || !guests[0].contrato_url) return res.status(404).json({ error: 'Contrato no encontrado' });

    if (req.user.rol === 'invitado') {
      const [own] = await pool.query('SELECT id FROM guests WHERE profile_id = ?', [req.user.id]);
      if (own.length === 0 || Number(own[0].id) !== Number(id)) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
      }
    }

    const filePath = path.resolve(__dirname, '..', '..', guests[0].contrato_url.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });

    res.setHeader('Content-Type', guests[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline; filename="contrato.pdf"');
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
