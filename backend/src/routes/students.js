const { Router } = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = Router();

router.use(authMiddleware);

// GET /api/students
router.get('/', requireRole('direccion', 'administracion', 'estudiante'), async (req, res) => {
  try {
    let sql = `
      SELECT s.*, p.email, p.nombre, p.apellidos, p.telefono
      FROM students s
      JOIN profiles p ON p.id = s.profile_id
    `;
    const params = [];
    if (req.user.rol === 'estudiante') {
      sql += ' WHERE s.profile_id = ?';
      params.push(req.user.id);
    }
    sql += ' ORDER BY s.created_at DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/students/:id
router.get('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT s.*, p.email, p.nombre, p.apellidos, p.telefono
      FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE s.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/students
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { email, password, nombre, apellidos, telefono, habitacion, fecha_entrada, fecha_salida_prevista, cuota_mensual, facturar_cada } = req.body;
    if (!email || !password || !nombre) {
      return res.status(400).json({ error: 'Email, password y nombre requeridos' });
    }

    if (habitacion) {
      const [roomExists] = await pool.query('SELECT id FROM rooms WHERE nombre = ?', [habitacion]);
      if (roomExists.length === 0) return res.status(400).json({ error: 'La habitación no existe' });

      // Validar solapamiento con otros alumnos activos en la misma habitación
      const newStart = fecha_entrada || '1970-01-01';
      const newEnd = fecha_salida_prevista || '9999-12-31';
      const [overlap] = await pool.query(`
        SELECT id FROM students
        WHERE habitacion = ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, newEnd, newStart]);
      if (overlap.length > 0) return res.status(400).json({ error: 'La habitación tiene alumno asignado en esas fechas' });
    }

    const hash = await bcrypt.hash(password, 10);
    const [profileResult] = await pool.query(
      'INSERT INTO profiles (email, password_hash, nombre, apellidos, telefono, rol) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hash, nombre, apellidos || '', telefono || '', 'estudiante']
    );

    const [studentResult] = await pool.query(
      'INSERT INTO students (profile_id, habitacion, fecha_entrada, fecha_salida_prevista, cuota_mensual, facturar_cada) VALUES (?, ?, ?, ?, ?, ?)',
      [profileResult.insertId, habitacion || '', fecha_entrada || null, fecha_salida_prevista || null, cuota_mensual || 0, facturar_cada || 1]
    );

    // Auto-generar recibos desde la fecha de entrada
    if (fecha_entrada && parseFloat(cuota_mensual) > 0) {
      const studentId = studentResult.insertId;
      const startMonth = new Date(fecha_entrada);
      startMonth.setDate(1);
      const interval = parseInt(facturar_cada) || 1;
      const amount = parseFloat(cuota_mensual);

      let endMonth;
      if (fecha_salida_prevista) {
        endMonth = new Date(fecha_salida_prevista);
        endMonth.setDate(1);
      } else {
        endMonth = new Date(startMonth);
        endMonth.setMonth(endMonth.getMonth() + 9); // 10 meses de previsión
      }

      let current = new Date(startMonth);
      while (current <= endMonth) {
        const periodo = current.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
        const vencimiento = new Date(current.getFullYear(), current.getMonth() + 1, 5).toISOString().slice(0, 10);
        const [existing] = await pool.query(
          'SELECT id FROM pagos WHERE student_id = ? AND periodo = ? AND estado != ?',
          [studentId, periodo, 'anulado']
        );
        if (existing.length === 0) {
          await pool.query(
            'INSERT INTO pagos (student_id, periodo, importe, fecha_vencimiento) VALUES (?, ?, ?, ?)',
            [studentId, periodo, amount, vencimiento]
          );
        }
        current.setMonth(current.getMonth() + interval);
      }
    }

    res.status(201).json({ id: studentResult.insertId, profile_id: profileResult.insertId });
  } catch (err) {
    console.error(err);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/students/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { habitacion, fecha_entrada, fecha_salida_prevista, fecha_salida_real, acceso_habitacion, estado, cuota_mensual, facturar_cada } = req.body;

    // Validar solapamiento si cambia habitación con fechas
    if (habitacion) {
      const newStart = fecha_entrada || '1970-01-01';
      const newEnd = fecha_salida_prevista || '9999-12-31';
      const [overlap] = await pool.query(`
        SELECT id FROM students
        WHERE habitacion = ?
          AND id != ?
          AND estado IN ('activo','pendiente_salida')
          AND fecha_entrada <= ?
          AND ? <= COALESCE(fecha_salida_prevista, '9999-12-31')
        LIMIT 1
      `, [habitacion, req.params.id, newEnd, newStart]);
      if (overlap.length > 0) return res.status(400).json({ error: 'La habitación tiene alumno asignado en esas fechas' });
    }

    const fields = ['habitacion = COALESCE(?, habitacion)', 'fecha_entrada = COALESCE(?, fecha_entrada)', 'fecha_salida_prevista = COALESCE(?, fecha_salida_prevista)', 'fecha_salida_real = COALESCE(?, fecha_salida_real)', 'acceso_habitacion = COALESCE(?, acceso_habitacion)', 'estado = COALESCE(?, estado)'];
    const params = [habitacion, fecha_entrada, fecha_salida_prevista, fecha_salida_real, acceso_habitacion, estado];

    if (cuota_mensual !== undefined) {
      fields.push('cuota_mensual = ?');
      params.push(cuota_mensual);
    }
    if (facturar_cada !== undefined) {
      fields.push('facturar_cada = ?');
      params.push(facturar_cada);
    }

    params.push(req.params.id);
    await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params);

    // Si se estableció o cambió fecha_salida_prevista, anular pagos pendientes posteriores
    if (fecha_salida_prevista !== undefined && fecha_salida_prevista) {
      const limitPlus1 = new Date(fecha_salida_prevista);
      limitPlus1.setDate(1);
      limitPlus1.setMonth(limitPlus1.getMonth() + 1);
      const ref = limitPlus1.toISOString().slice(0, 7);
      await pool.query(
        `UPDATE pagos SET estado = 'anulado'
         WHERE student_id = ? AND estado = 'pendiente'
           AND DATE_FORMAT(fecha_vencimiento, '%Y-%m') > ?`,
        [req.params.id, ref]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/students/:id/contrato
router.post('/:id/contrato', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });

    const { id } = req.params;
    const ruta = `/uploads/documents/${req.uploadSubfolder}/${req.file.filename}`;

    await pool.query('UPDATE students SET contrato_url = ? WHERE id = ?', [ruta, id]);

    await pool.query(
      'INSERT INTO documents (student_id, tipo, nombre_original, archivo_ruta, mime_type, tamano, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, 'contrato', req.file.originalname, ruta, req.file.mimetype, req.file.size, req.user.id]
    );

    res.json({ ruta });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/students/:id/notificar-salida
router.post('/:id/notificar-salida', async (req, res) => {
  try {
    const { fecha_salida } = req.body;
    if (!fecha_salida) return res.status(400).json({ error: 'Fecha de salida requerida' });

    await pool.query(
      'INSERT INTO salida_notificaciones (student_id, fecha_salida, notificado) VALUES (?, ?, ?)',
      [req.params.id, fecha_salida, 1]
    );

    await pool.query(
      "UPDATE students SET fecha_salida_prevista = ?, estado = 'pendiente_salida' WHERE id = ?",
      [fecha_salida, req.params.id]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/students/:id/marcar-salida (staff marks student as departed)
router.put('/:id/marcar-salida', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [students] = await pool.query('SELECT id, profile_id, estado FROM students WHERE id = ?', [req.params.id]);
    if (students.length === 0) return res.status(404).json({ error: 'Alumno no encontrado' });
    if (students[0].estado === 'baja') return res.status(400).json({ error: 'El alumno ya está dado de baja' });

    const { profile_id } = students[0];

    // Keep incidents but disassociate from this profile
    await pool.query('UPDATE incidencias SET reportado_por = NULL WHERE reportado_por = ?', [profile_id]);

    // Delete profile → cascades to student → documents, payments, absences, departure/registration logs
    await pool.query('DELETE FROM profiles WHERE id = ?', [profile_id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/students/:id/acceso
router.put('/:id/acceso', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { acceso } = req.body;
    await pool.query('UPDATE students SET acceso_habitacion = ? WHERE id = ?', [acceso, req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/students/:id/documentos
router.get('/:id/documentos', requireRole('direccion', 'administracion', 'estudiante'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, p.nombre AS subido_por_nombre
       FROM documents d
       LEFT JOIN profiles p ON p.id = d.subido_por
       WHERE d.student_id = ?
       ORDER BY d.created_at DESC`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/students/:id/documentos (staff upload any document type)
router.post('/:id/documentos', requireRole('direccion', 'administracion'), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido' });
    const { id } = req.params;
    const tipo = req.body.tipo || 'documento';
    const ruta = `/uploads/documents/${req.uploadSubfolder}/${req.file.filename}`;
    await pool.query(
      'INSERT INTO documents (student_id, tipo, nombre_original, archivo_ruta, mime_type, tamano, subido_por) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, tipo, req.file.originalname, ruta, req.file.mimetype, req.file.size, req.user.id]
    );
    res.status(201).json({ ruta, tipo });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/students/:id/documentos/:docId (staff only)
router.delete('/:id/documentos/:docId', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [docs] = await pool.query('SELECT archivo_ruta FROM documents WHERE id = ? AND student_id = ?', [req.params.docId, req.params.id]);
    if (docs.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });
    // Delete file from disk
    const filePath = path.resolve(__dirname, '..', '..', docs[0].archivo_ruta.replace(/^\//, ''));
    fs.unlink(filePath, () => {}); // ignore deletion errors
    await pool.query('DELETE FROM documents WHERE id = ?', [req.params.docId]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/students/:id/documentos/:docId/download
router.get('/:id/documentos/:docId/download', requireRole('direccion', 'administracion', 'estudiante'), async (req, res) => {
  try {
    const [docs] = await pool.query('SELECT * FROM documents WHERE id = ? AND student_id = ?', [req.params.docId, req.params.id]);
    if (docs.length === 0) return res.status(404).json({ error: 'Documento no encontrado' });

    // Students can only download their own documents
    if (req.user.rol === 'estudiante') {
      const [students] = await pool.query('SELECT id FROM students WHERE profile_id = ?', [req.user.id]);
      if (students.length === 0 || students[0].id !== parseInt(req.params.id)) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
      }
    }

    const doc = docs[0];
    const filePath = path.resolve(__dirname, '..', '..', doc.archivo_ruta.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Archivo no encontrado' });

    res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${doc.nombre_original}"`);
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
