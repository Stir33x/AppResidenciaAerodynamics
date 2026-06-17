const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/rooms — todas las habitaciones con estado de ocupación
router.get('/', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const sql = `
      SELECT
        r.*,
        (SELECT CONCAT(p.nombre, ' ', p.apellidos)
         FROM students s
         JOIN profiles p ON p.id = s.profile_id
         WHERE s.habitacion = r.nombre AND s.estado IN ('activo', 'pendiente_salida')
         LIMIT 1
        ) AS occupied_by,
        (SELECT s.fecha_salida_prevista
         FROM students s
         WHERE s.habitacion = r.nombre AND s.estado IN ('activo', 'pendiente_salida')
         ORDER BY s.fecha_salida_prevista DESC
         LIMIT 1
        ) AS occupied_until
      FROM rooms r
      ORDER BY r.nombre ASC
    `;
    const [rows] = await pool.query(sql);
    const now = new Date().toISOString().split('T')[0];
    const result = rows.map(r => ({
      ...r,
      occupied: !!r.occupied_by,
      next_available_date: r.occupied_until
        ? (() => {
            const d = new Date(r.occupied_until);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
          })()
        : now
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/rooms/available — habitaciones disponibles
// Query params: fecha_entrada, fecha_salida_prevista, exclude_student_id
// Si se pasan fechas, se comprueba solapamiento. Si no, se excluyen las ocupadas.
router.get('/available', async (req, res) => {
  try {
    const { fecha_entrada, fecha_salida_prevista, exclude_student_id } = req.query;

    let sql;
    let params = [];

    if (fecha_entrada) {
      const newStart = fecha_entrada;
      const newEnd = fecha_salida_prevista || '9999-12-31';
      // Excluir habitaciones donde exista un alumno activo cuyo rango solape con [newStart, newEnd]
      sql = `
        SELECT r.*
        FROM rooms r
        WHERE r.nombre NOT IN (
          SELECT s.habitacion FROM students s
          WHERE s.habitacion != ''
            AND s.estado IN ('activo', 'pendiente_salida')
            ${exclude_student_id ? 'AND s.id != ?' : ''}
            AND s.fecha_entrada <= ?
            AND ? <= COALESCE(s.fecha_salida_prevista, '9999-12-31')
        )
        ORDER BY r.nombre ASC
      `;
      if (exclude_student_id) params.push(parseInt(exclude_student_id));
      params.push(newEnd, newStart);
    } else {
      // Comportamiento original: excluir habitaciones con alumnos activos
      sql = `
        SELECT r.*
        FROM rooms r
        WHERE r.nombre NOT IN (
          SELECT s.habitacion FROM students s
          WHERE s.estado IN ('activo', 'pendiente_salida')
            AND s.habitacion != ''
            ${exclude_student_id ? 'AND s.id != ?' : ''}
        )
        ORDER BY r.nombre ASC
      `;
      if (exclude_student_id) params.push(parseInt(exclude_student_id));
    }

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/rooms
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

    const [result] = await pool.query('INSERT INTO rooms (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ id: result.insertId, nombre });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'La habitación ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', requireRole('direccion'), async (req, res) => {
  try {
    const [students] = await pool.query(
      'SELECT COUNT(*) AS count FROM students WHERE habitacion = (SELECT nombre FROM rooms WHERE id = ?) AND estado IN (?, ?)',
      [req.params.id, 'activo', 'pendiente_salida']
    );
    if (students[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar: habitación ocupada' });
    }
    await pool.query('DELETE FROM rooms WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
