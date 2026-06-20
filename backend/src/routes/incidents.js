const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/incidencias
router.get('/', async (req, res) => {
  try {
    const { estado, tipo } = req.query;
    let sql = `
      SELECT i.*,
        r.nombre AS reportado_nombre, r.apellidos AS reportado_apellidos,
        a.nombre AS asignado_nombre, a.apellidos AS asignado_apellidos
      FROM incidencias i
      JOIN profiles r ON r.id = i.reportado_por
      LEFT JOIN profiles a ON a.id = i.asignado_a
    `;
    const params = [];
    const conditions = [];

    // Estudiantes: ven sus incidencias + las de su habitación + zonas comunes
    if (req.user.rol === 'estudiante') {
      conditions.push('(i.reportado_por = ? OR i.habitacion IN (SELECT s.habitacion FROM students s WHERE s.profile_id = ?) OR i.habitacion IN (SELECT nombre FROM common_zones))');
      params.push(req.user.id, req.user.id);
    }

    if (estado) { conditions.push('i.estado = ?'); params.push(estado); }
    if (tipo) { conditions.push('i.tipo = ?'); params.push(tipo); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY i.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/incidencias/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*,
        r.nombre AS reportado_nombre, r.apellidos AS reportado_apellidos,
        a.nombre AS asignado_nombre, a.apellidos AS asignado_apellidos
      FROM incidencias i
      JOIN profiles r ON r.id = i.reportado_por
      LEFT JOIN profiles a ON a.id = i.asignado_a
      WHERE i.id = ?
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ error: 'Incidencia no encontrada' });

    // Estudiante solo puede ver la suya
    if (req.user.rol === 'estudiante' && rows[0].reportado_por !== req.user.id) {
      return res.status(403).json({ error: 'Acceso no autorizado' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/incidencias
router.post('/', async (req, res) => {
  try {
    const { habitacion, tipo, descripcion, imagen } = req.body;
    if (!descripcion) {
      return res.status(400).json({ error: 'Descripción requerida' });
    }

    // Estudiantes solo pueden crear incidencias de su habitación o de zonas comunes
    if (req.user.rol === 'estudiante') {
      // Obtener su habitación
      const [students] = await pool.query(
        'SELECT habitacion FROM students WHERE profile_id = ?',
        [req.user.id]
      );
      const miHabitacion = students.length > 0 ? students[0].habitacion : '';

      // Validar que habitacion está entre las permitidas
      const [zones] = await pool.query('SELECT nombre FROM common_zones');
      const zonasPermitidas = zones.map(z => z.nombre);

      const permitido = habitacion === miHabitacion || zonasPermitidas.includes(habitacion);
      if (!permitido) {
        return res.status(403).json({ error: 'Solo puedes reportar incidencias de tu habitación o de zonas comunes' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO incidencias (reportado_por, habitacion, tipo, descripcion, imagen) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, habitacion || '', tipo || 'normal', descripcion, imagen || null]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/incidencias/:id (staff: cambiar estado, asignar)
router.put('/:id', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const { estado, asignado_a, tipo } = req.body;
    const fields = [];
    const params = [];

    if (estado) { fields.push('estado = ?'); params.push(estado); }
    if (tipo) { fields.push('tipo = ?'); params.push(tipo); }
    if (asignado_a !== undefined) { fields.push('asignado_a = ?'); params.push(asignado_a || null); }
    if (estado === 'resuelta') { fields.push('resuelta_at = NOW()'); }

    if (fields.length === 0) return res.status(400).json({ error: 'Sin campos para actualizar' });

    params.push(req.params.id);
    await pool.query(`UPDATE incidencias SET ${fields.join(', ')} WHERE id = ?`, params);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/incidencias/staff/lista (lista de personal para asignar)
router.get('/staff/lista', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, nombre, apellidos, rol FROM profiles WHERE rol IN ('direccion', 'administracion', 'limpieza') ORDER BY nombre"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
