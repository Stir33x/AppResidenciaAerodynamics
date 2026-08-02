const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function dateOnly(v) {
  if (!v) return null;
  if (typeof v === 'string') return v.slice(0, 10);
  const d = new Date(v);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
}

// GET /api/rooms — todas las habitaciones con estado de ocupación, ocupante y limpieza de hoy
router.get('/', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const hoyNombre = diasSemana[new Date().getDay()];
    const hoyStr = dateOnly(new Date());

    const [rooms] = await pool.query("SELECT * FROM rooms ORDER BY (nombre REGEXP '^[0-9]+$') DESC, CAST(nombre AS UNSIGNED), nombre ASC");

    // Ocupantes: alumnos activos
    const [students] = await pool.query(`
      SELECT s.habitacion, p.nombre, p.apellidos, p.telefono, p.email,
             s.fecha_entrada, s.fecha_salida_prevista
      FROM students s
      JOIN profiles p ON p.id = s.profile_id
      WHERE s.estado IN ('activo', 'pendiente_salida')
    `);
    // Ocupantes: huéspedes activos
    const [guests] = await pool.query(`
      SELECT g.habitacion, p.nombre, p.apellidos, p.telefono, p.email,
             g.fecha_entrada, g.fecha_salida_prevista
      FROM guests g
      JOIN profiles p ON p.id = g.profile_id
      WHERE g.estado IN ('activo', 'pendiente_salida')
    `);
    // Incidencias abiertas por habitación
    const [incidencias] = await pool.query(`
      SELECT habitacion FROM incidencias
      WHERE estado IN ('reportada', 'en_curso') AND habitacion != ''
    `);
    // Limpieza programada hoy (solo habitaciones, no zonas)
    const [hoyBlocks] = await pool.query(`
      SELECT cbr.room_name, cbr.fecha_completada
      FROM cleaning_block_rooms cbr
      JOIN cleaning_blocks cb ON cb.id = cbr.block_id
      WHERE cb.dia_semana = ? AND cbr.tipo = 'room'
    `, [hoyNombre]);

    const studentsByRoom = {};
    for (const s of students) {
      const prev = studentsByRoom[s.habitacion];
      if (!prev || (s.fecha_salida_prevista || '') > (prev.fecha_salida_prevista || '')) {
        studentsByRoom[s.habitacion] = s;
      }
    }
    const guestsByRoom = {};
    for (const g of guests) {
      const prev = guestsByRoom[g.habitacion];
      if (!prev || (g.fecha_salida_prevista || '') > (prev.fecha_salida_prevista || '')) {
        guestsByRoom[g.habitacion] = g;
      }
    }
    const incidentRooms = new Set(incidencias.map((i) => i.habitacion));
    const scheduledCleaningToday = new Set();
    const cleaningCompletedToday = new Set();
    for (const c of hoyBlocks) {
      scheduledCleaningToday.add(c.room_name);
      if (dateOnly(c.fecha_completada) === hoyStr) cleaningCompletedToday.add(c.room_name);
    }

    const now = new Date().toISOString().split('T')[0];
    const result = rooms.map((r) => {
      const student = studentsByRoom[r.nombre];
      const guest = guestsByRoom[r.nombre];
      const occ = student || guest;
      const occupiedBy = occ ? `${occ.nombre} ${occ.apellidos}` : null;
      const occupiedUntil = occ ? occ.fecha_salida_prevista : null;
      const limpiezaHoy = scheduledCleaningToday.has(r.nombre);
      const limpiezaCompletada = cleaningCompletedToday.has(r.nombre);
      const pendienteLimpieza = limpiezaHoy && !limpiezaCompletada;

      return {
        ...r,
        estado: pendienteLimpieza ? 'limpieza' : (occ ? 'ocupado' : 'libre'),
        limpieza_hoy: limpiezaHoy,
        limpieza_completada: limpiezaCompletada,
        incidencia: incidentRooms.has(r.nombre) ? 1 : 0,
        occupant_type: student ? 'alumno' : (guest ? 'huesped' : null),
        occupant_name: occupiedBy,
        occupant_phone: occ?.telefono || null,
        occupant_email: occ?.email || null,
        checkin_date: occ?.fecha_entrada || null,
        checkout_date: occ?.fecha_salida_prevista || null,
        occupied_by: occupiedBy,
        occupied_until: occupiedUntil,
        occupied: !!occ,
        next_available_date: occupiedUntil
          ? (() => {
              const d = new Date(occupiedUntil);
              d.setDate(d.getDate() + 1);
              return d.toISOString().split('T')[0];
            })()
          : now
      };
    });
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
          UNION
          SELECT g.habitacion FROM guests g
          WHERE g.habitacion != ''
            AND g.estado IN ('activo', 'pendiente_salida')
            AND g.fecha_entrada <= ?
            AND ? <= COALESCE(g.fecha_salida_prevista, '9999-12-31')
        )
        ORDER BY (r.nombre REGEXP '^[0-9]+$') DESC, CAST(r.nombre AS UNSIGNED), r.nombre ASC
      `;
      if (exclude_student_id) params.push(parseInt(exclude_student_id));
      params.push(newEnd, newStart, newEnd, newStart);
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
          UNION
          SELECT g.habitacion FROM guests g
          WHERE g.estado IN ('activo', 'pendiente_salida')
            AND g.habitacion != ''
        )
        ORDER BY (r.nombre REGEXP '^[0-9]+$') DESC, CAST(r.nombre AS UNSIGNED), r.nombre ASC
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
