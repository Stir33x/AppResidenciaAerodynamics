const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/pagos
router.get('/', requireRole('direccion', 'administracion', 'estudiante'), async (req, res) => {
  try {
    const { estado, tipo, student_id } = req.query;
    let sql = `
      SELECT p.*, pr.nombre, pr.apellidos, s.habitacion
      FROM pagos p
      JOIN students s ON s.id = p.student_id
      JOIN profiles pr ON pr.id = s.profile_id
    `;
    const params = [];
    const conditions = [];

    if (req.user.rol === 'estudiante') {
      conditions.push('s.profile_id = ?');
      params.push(req.user.id);
    } else {
      if (estado) { conditions.push('p.estado = ?'); params.push(estado); }
      if (tipo) { conditions.push('p.tipo = ?'); params.push(tipo); }
      if (student_id) { conditions.push('p.student_id = ?'); params.push(student_id); }
    }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY p.fecha_vencimiento ASC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/pagos/forecast (proyección mensual de ingresos)
router.get('/forecast', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    // 1. Pagos reales agrupados por periodo
    const [realPayments] = await pool.query(`
      SELECT
        periodo,
        SUM(CASE WHEN estado = 'cobrado' THEN importe ELSE 0 END) AS cobrado,
        SUM(CASE WHEN estado = 'pendiente' THEN importe ELSE 0 END) AS pendiente,
        SUM(CASE WHEN estado = 'vencido' THEN importe ELSE 0 END) AS vencido,
        SUM(importe) AS total
      FROM pagos
      GROUP BY periodo
      ORDER BY MIN(fecha_vencimiento) ASC
      LIMIT 24
    `);

    // 2. Estudiantes activos con cuota para proyectar próximos meses
    const [students] = await pool.query(`
      SELECT id, cuota_mensual, facturar_cada, fecha_entrada
      FROM students
      WHERE estado IN ('activo','pendiente_salida') AND cuota_mensual > 0
    `);

    // 3. Obtener pagos existentes por estudiante+periodo para evitar duplicar
    const [existingPayments] = await pool.query(`
      SELECT student_id, periodo FROM pagos WHERE estado != 'anulado'
    `);
    const existingSet = new Set(existingPayments.map(p => `${p.student_id}|${p.periodo}`));

    // 4. Generar proyección próximos 6 meses (solo periodos sin pago existente)
    const now = new Date();
    const projection = [];
    for (let m = 0; m < 6; m++) {
      const d = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const periodo = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      let projected = 0;
      for (const s of students) {
        if (!s.fecha_entrada) continue;
        if (existingSet.has(`${s.id}|${periodo}`)) continue;
        const mesesDesdeEntrada = Math.floor((d - new Date(s.fecha_entrada)) / (30 * 24 * 60 * 60 * 1000));
        if (mesesDesdeEntrada >= 0 && (mesesDesdeEntrada % s.facturar_cada === 0)) {
          projected += parseFloat(s.cuota_mensual);
        }
      }
      projection.push({ periodo, projected: Math.round(projected * 100) / 100 });
    }

    res.json({ realPayments, projection });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/pagos/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT p.*, pr.nombre, pr.apellidos, s.habitacion
      FROM pagos p
      JOIN students s ON s.id = p.student_id
      JOIN profiles pr ON pr.id = s.profile_id
      WHERE p.id = ?
    `, [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Pago no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/pagos
router.post('/', requireRole('direccion'), async (req, res) => {
  try {
    const { student_id, tipo, periodo, importe, descripcion, fecha_vencimiento, fecha_cobro, referencia_mandato } = req.body;
    if (!student_id || !periodo || !importe || !fecha_vencimiento) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const [result] = await pool.query(
      'INSERT INTO pagos (student_id, tipo, periodo, importe, descripcion, fecha_vencimiento, fecha_cobro, referencia_mandato) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [student_id, tipo || 'regular', periodo, importe, descripcion || null, fecha_vencimiento, fecha_cobro || null, referencia_mandato || '']
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/pagos/:id
router.put('/:id', requireRole('direccion'), async (req, res) => {
  try {
    const { tipo, importe, descripcion, fecha_vencimiento, fecha_cobro, estado, referencia_mandato } = req.body;

    await pool.query(`
      UPDATE pagos SET
        tipo = COALESCE(?, tipo),
        importe = COALESCE(?, importe),
        descripcion = COALESCE(?, descripcion),
        fecha_vencimiento = COALESCE(?, fecha_vencimiento),
        fecha_cobro = COALESCE(?, fecha_cobro),
        estado = COALESCE(?, estado),
        referencia_mandato = COALESCE(?, referencia_mandato)
      WHERE id = ?
    `, [tipo, importe, descripcion, fecha_vencimiento, fecha_cobro, estado, referencia_mandato, req.params.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/pagos/:id
router.delete('/:id', requireRole('direccion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM pagos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/pagos/generar (generar recibos periódicos)
router.post('/generar', requireRole('direccion'), async (req, res) => {
  try {
    const { student_id, cada_meses, num_pagos, importe } = req.body;
    if (!student_id || !cada_meses || !num_pagos || !importe) {
      return res.status(400).json({ error: 'student_id, cada_meses, num_pagos e importe requeridos' });
    }
    const created = [];
    const now = new Date();
    for (let i = 0; i < num_pagos; i++) {
      const mesOffset = i * parseInt(cada_meses);
      const d = new Date(now.getFullYear(), now.getMonth() + mesOffset, 1);
      const periodo = d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      const vencimiento = new Date(d.getFullYear(), d.getMonth() + 1, 5).toISOString().slice(0, 10);
      const [existing] = await pool.query(
        'SELECT id FROM pagos WHERE student_id = ? AND periodo = ? AND estado != ?',
        [student_id, periodo, 'anulado']
      );
      if (existing.length === 0) {
        const [result] = await pool.query(
          'INSERT INTO pagos (student_id, tipo, periodo, importe, fecha_vencimiento) VALUES (?, ?, ?, ?, ?)',
          [student_id, 'regular', periodo, importe, vencimiento]
        );
        created.push({ id: result.insertId, periodo, importe, fecha_vencimiento: vencimiento });
      }
    }
    res.status(201).json({ creados: created.length, total: created });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
