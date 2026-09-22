const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
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

// GET /api/cleaning/blocks — todos los bloques con sus habitaciones
router.get('/blocks', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [blocks] = await pool.query(`
      SELECT * FROM cleaning_blocks
      ORDER BY FIELD(dia_semana, 'Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'), hora_inicio
    `);
    for (const block of blocks) {
      const [rooms] = await pool.query('SELECT * FROM cleaning_block_rooms WHERE block_id = ?', [block.id]);
      block.rooms = rooms;
    }
    res.json(blocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/blocks — crear bloque con habitaciones y zonas comunes
router.post('/blocks', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { dia_semana, hora_inicio, hora_fin, rooms, zones } = req.body;
    const locations = [...(rooms || []), ...(zones || [])];
    if (!dia_semana || !hora_inicio || !hora_fin || locations.length === 0) {
      return res.status(400).json({ error: 'Faltan datos: día, hora_inicio, hora_fin, rooms[] o zones[]' });
    }
    if (!DIAS.includes(dia_semana)) {
      return res.status(400).json({ error: `Día inválido. Usar: ${DIAS.join(', ')}` });
    }

    const [result] = await pool.query(
      'INSERT INTO cleaning_blocks (dia_semana, hora_inicio, hora_fin) VALUES (?, ?, ?)',
      [dia_semana, hora_inicio, hora_fin]
    );

    for (const room of (rooms || [])) {
      await pool.query(
        'INSERT INTO cleaning_block_rooms (block_id, room_name, tipo) VALUES (?, ?, ?)',
        [result.insertId, room, 'room']
      );
    }
    for (const zoneId of (zones || [])) {
      const [zone] = await pool.query('SELECT nombre FROM common_zones WHERE id = ?', [zoneId]);
      if (zone.length > 0) {
        await pool.query(
          'INSERT INTO cleaning_block_rooms (block_id, room_name, tipo, zone_id) VALUES (?, ?, ?, ?)',
          [result.insertId, zone[0].nombre, 'zone', zoneId]
        );
      }
    }

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/cleaning/blocks/:id
router.delete('/blocks/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM cleaning_blocks WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cleaning/today — bloques de hoy con habitaciones + ausencias de estudiantes
router.get('/today', async (req, res) => {
  try {
    const hoy = diasSemana[new Date().getDay()];
    const hoyStr = dateOnly(new Date());

    const isStaff = ['direccion', 'administracion', 'limpieza'].includes(req.user.rol);

    // Los estudiantes/invitados solo pueden ver los bloques donde está SU habitación,
    // y nunca las ausencias ni los datos de otros estudiantes.
    let myRoom = null;
    if (!isStaff) {
      const [students] = await pool.query('SELECT habitacion FROM students WHERE profile_id = ?', [req.user.id]);
      myRoom = students.length > 0 ? students[0].habitacion : null;
    }

    const [blocks] = await pool.query(
      'SELECT * FROM cleaning_blocks WHERE dia_semana = ? ORDER BY hora_inicio',
      [hoy]
    );

    for (const block of blocks) {
      const [rooms] = await pool.query(`
        SELECT cbr.*, p.nombre AS completado_por_nombre
        FROM cleaning_block_rooms cbr
        LEFT JOIN profiles p ON p.id = cbr.completada_por
        WHERE cbr.block_id = ?
      `, [block.id]);

      // Estudiantes/invitados: SOLO ven su propia habitación y sin datos de otros
      if (!isStaff) {
        block.rooms = rooms.filter((r) => myRoom !== null && r.room_name === myRoom).map((r) => {
          r.absences = [];
          r.sessions = [];
          r.completada_hoy = dateOnly(r.fecha_completada) === hoyStr ? 1 : 0;
          return r;
        });
        continue;
      }

      block.rooms = rooms;
      for (const room of rooms) {
        // Ausencias de estudiantes en esas habitaciones hoy
        const [absences] = await pool.query(`
          SELECT sa.hora_inicio, sa.hora_fin, s.habitacion, pr.nombre
          FROM student_absences sa
          JOIN students s ON s.id = sa.student_id
          JOIN profiles pr ON pr.id = s.profile_id
          WHERE s.habitacion = ? AND sa.fecha = ?
          ORDER BY sa.hora_inicio
        `, [room.room_name, hoyStr]);
        room.absences = absences;

        // Estado de completado hoy
        room.completada_hoy = dateOnly(room.fecha_completada) === hoyStr ? 1 : 0;

        // Sesiones de limpieza de hoy (cronómetro inicio/fin)
        const [sessions] = await pool.query(`
          SELECT cs.*, p.nombre AS started_by_nombre
          FROM cleaning_sessions cs
          LEFT JOIN profiles p ON p.id = cs.started_by
          WHERE cs.cleaning_block_room_id = ? AND DATE(cs.started_at) = ?
          ORDER BY cs.started_at
        `, [room.id, hoyStr]);
        room.sessions = sessions;
      }
    }

    res.json({ dia: hoy, blocks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cleaning/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD — estadísticas de limpieza para dirección
router.get('/dashboard', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const to = req.query.to || dateOnly(new Date());
    const d = new Date();
    d.setDate(d.getDate() - 29);
    const from = req.query.from || dateOnly(d);

    // Sesiones del periodo (abiertas o cerradas) ordenadas por inicio ascendente
    const [rows] = await pool.query(`
      SELECT cs.id AS session_id, cs.started_at, cs.ended_at, cs.duration_seconds,
             cs.started_by, cs.stopped_by,
             ps.nombre AS started_by_name, pst.nombre AS stopped_by_name,
             cbr.id AS cbr_id, cbr.room_name, cbr.tipo, cbr.imagen,
             cb.dia_semana, cb.hora_inicio, cb.hora_fin
      FROM cleaning_sessions cs
      JOIN cleaning_block_rooms cbr ON cbr.id = cs.cleaning_block_room_id
      JOIN cleaning_blocks cb ON cb.id = cbr.block_id
      LEFT JOIN profiles ps ON ps.id = cs.started_by
      LEFT JOIN profiles pst ON pst.id = cs.stopped_by
      WHERE DATE(cs.started_at) BETWEEN ? AND ?
      ORDER BY cs.started_at ASC, cs.id ASC
    `, [from, to]);

    // Agrupar las sesiones en "limpiezas": pausar y reanudar = UNA limpieza.
    // Un grupo = mismo local (cbr_id) el mismo día; el tiempo se suma.
    const runs = [];
    let current = null;
    for (const s of rows) {
      const key = `${s.cbr_id}|${dateOnly(s.started_at)}`;
      if (!current || current.key !== key) {
        current = {
          key,
          session_id: s.session_id,
          cbr_id: s.cbr_id,
          room_name: s.room_name,
          tipo: s.tipo,
          imagen: s.imagen,
          dia_semana: s.dia_semana,
          hora_inicio: s.hora_inicio,
          hora_fin: s.hora_fin,
          started_at: s.started_at,
          started_by: s.started_by,
          started_by_name: s.started_by_name,
          stopped_by: s.stopped_by,
          stopped_by_name: s.stopped_by_name,
          ended_at: s.ended_at,
          duration_seconds: s.duration_seconds || 0,
        };
        runs.push(current);
      } else {
        current.ended_at = s.ended_at;
        current.stopped_by = s.stopped_by;
        current.stopped_by_name = s.stopped_by_name;
        current.duration_seconds += s.duration_seconds || 0;
      }
    }

    const history = runs.map((r) => ({
      session_id: r.session_id,
      started_at: r.started_at,
      ended_at: r.ended_at,
      duration_seconds: r.duration_seconds,
      started_by: r.started_by,
      started_by_name: r.started_by_name,
      stopped_by: r.stopped_by,
      stopped_by_name: r.stopped_by_name,
      cbr_id: r.cbr_id,
      room_name: r.room_name,
      tipo: r.tipo,
      imagen: r.imagen,
      dia_semana: r.dia_semana,
      hora_inicio: r.hora_inicio,
      hora_fin: r.hora_fin,
      fecha: dateOnly(r.started_at),
      en_curso: r.ended_at ? 0 : 1,
    }));

    const completed = runs.filter((r) => r.ended_at);
    const totalSeconds = completed.reduce((acc, r) => acc + (r.duration_seconds || 0), 0);

    // Por día
    const dayMap = new Map();
    for (const r of completed) {
      const fecha = dateOnly(r.started_at);
      const cur = dayMap.get(fecha) || { fecha, cleanings: 0, total_seconds: 0 };
      cur.cleanings += 1;
      cur.total_seconds += r.duration_seconds || 0;
      dayMap.set(fecha, cur);
    }
    const byDay = [...dayMap.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));

    // Por habitación / zona
    const roomMap = new Map();
    for (const r of completed) {
      const cur = roomMap.get(r.cbr_id) || {
        cbr_id: r.cbr_id,
        room_name: r.room_name,
        tipo: r.tipo,
        cleanings: 0,
        total_seconds: 0,
        avg_seconds: 0,
        last_cleaning: null,
        imagen: null,
      };
      cur.cleanings += 1;
      cur.total_seconds += r.duration_seconds || 0;
      if (!cur.last_cleaning || dateOnly(r.started_at) > cur.last_cleaning) cur.last_cleaning = dateOnly(r.started_at);
      if (r.imagen) cur.imagen = r.imagen;
      roomMap.set(r.cbr_id, cur);
    }
    const byRoom = [...roomMap.values()]
      .map((c) => ({ ...c, avg_seconds: c.cleanings ? Math.round(c.total_seconds / c.cleanings) : 0 }))
      .sort((a, b) => b.total_seconds - a.total_seconds || a.room_name.localeCompare(b.room_name));

    // Por personal
    const staffMap = new Map();
    for (const r of completed) {
      const who = r.started_by;
      const name = r.started_by_name || 'Desconocido';
      const cur = staffMap.get(who) || { started_by: who, nombre: name, cleanings: 0, total_seconds: 0, avg_seconds: 0 };
      cur.cleanings += 1;
      cur.total_seconds += r.duration_seconds || 0;
      staffMap.set(who, cur);
    }
    const byStaff = [...staffMap.values()]
      .map((c) => ({ ...c, avg_seconds: c.cleanings ? Math.round(c.total_seconds / c.cleanings) : 0 }))
      .sort((a, b) => b.cleanings - a.cleanings);

    res.json({
      from,
      to,
      summary: {
        total_cleanings: completed.length,
        total_time_seconds: totalSeconds,
        avg_time_seconds: completed.length ? Math.round(totalSeconds / completed.length) : 0,
        locations_cleaned: new Set(completed.map((r) => r.cbr_id)).size,
        photos_count: new Set(completed.filter((r) => r.imagen).map((r) => r.cbr_id)).size,
        staff_count: byStaff.length,
      },
      by_day: byDay,
      by_room: byRoom,
      by_staff: byStaff,
      history,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/rooms/:id/complete — marcar/desmarcar habitación como limpiada hoy
router.post('/rooms/:id/complete', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const roomId = req.params.id;
    const hoy = dateOnly(new Date());
    const { imagen } = req.body;

    const [room] = await pool.query('SELECT * FROM cleaning_block_rooms WHERE id = ?', [roomId]);
    if (room.length === 0) return res.status(404).json({ error: 'No encontrado' });

    if (dateOnly(room[0].fecha_completada) === hoy) {
      await pool.query('UPDATE cleaning_block_rooms SET completada_por = NULL, fecha_completada = NULL, imagen = NULL WHERE id = ?', [roomId]);
      res.json({ completada: false });
    } else {
      await pool.query('UPDATE cleaning_block_rooms SET completada_por = ?, fecha_completada = ?, imagen = ? WHERE id = ?', [req.user.id, hoy, imagen || null, roomId]);
      res.json({ completada: true, imagen: imagen || null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/rooms/:id/start — iniciar cronómetro de limpieza
router.post('/rooms/:id/start', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const roomId = req.params.id;
    const [room] = await pool.query('SELECT id FROM cleaning_block_rooms WHERE id = ?', [roomId]);
    if (room.length === 0) return res.status(404).json({ error: 'No encontrado' });

    const [open] = await pool.query(
      'SELECT id FROM cleaning_sessions WHERE cleaning_block_room_id = ? AND ended_at IS NULL LIMIT 1',
      [roomId]
    );
    if (open.length > 0) return res.status(400).json({ error: 'Ya hay una sesión en curso para esta ubicación' });

    const [result] = await pool.query(
      'INSERT INTO cleaning_sessions (cleaning_block_room_id, started_at, started_by) VALUES (?, NOW(), ?)',
      [roomId, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/rooms/:id/stop — detener cronómetro y guardar duración
router.post('/rooms/:id/stop', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const roomId = req.params.id;
    const [open] = await pool.query(
      'SELECT id, started_at FROM cleaning_sessions WHERE cleaning_block_room_id = ? AND ended_at IS NULL ORDER BY id DESC LIMIT 1',
      [roomId]
    );
    if (open.length === 0) return res.status(400).json({ error: 'No hay sesión en curso para esta ubicación' });

    await pool.query(
      `UPDATE cleaning_sessions
       SET ended_at = NOW(), duration_seconds = TIMESTAMPDIFF(SECOND, started_at, NOW()), stopped_by = ?
       WHERE id = ?`,
      [req.user.id, open[0].id]
    );
    res.json({ id: open[0].id, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/rooms/:id/undo — deshacer la última sesión del día (por si te equivocas)
router.post('/rooms/:id/undo', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const roomId = req.params.id;
    const hoy = new Date().toISOString().slice(0, 10);
    const [last] = await pool.query(
      `SELECT id FROM cleaning_sessions
       WHERE cleaning_block_room_id = ? AND DATE(started_at) = ?
       ORDER BY id DESC LIMIT 1`,
      [roomId, hoy]
    );
    if (last.length === 0) return res.status(400).json({ error: 'No hay sesiones para deshacer' });

    await pool.query('DELETE FROM cleaning_sessions WHERE id = ?', [last[0].id]);
    res.json({ ok: true, deleted: last[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/absence — estudiante marca ausencia
router.post('/absence', async (req, res) => {
  try {
    const { fecha, hora_inicio, hora_fin } = req.body;
    if (!fecha || !hora_inicio || !hora_fin) {
      return res.status(400).json({ error: 'Fecha, hora_inicio y hora_fin requeridos' });
    }

    const [student] = await pool.query('SELECT id FROM students WHERE profile_id = ?', [req.user.id]);
    if (student.length === 0) return res.status(400).json({ error: 'No eres un estudiante registrado' });

    // Upsert: si ya existe ausencia para ese estudiante en esa fecha, actualizar
    const [existing] = await pool.query(
      'SELECT id FROM student_absences WHERE student_id = ? AND fecha = ?',
      [student[0].id, fecha]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE student_absences SET hora_inicio = ?, hora_fin = ? WHERE id = ?',
        [hora_inicio, hora_fin, existing[0].id]
      );
      res.json({ id: existing[0].id, updated: true });
    } else {
      const [result] = await pool.query(
        'INSERT INTO student_absences (student_id, fecha, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)',
        [student[0].id, fecha, hora_inicio, hora_fin]
      );
      res.status(201).json({ id: result.insertId });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/cleaning/absence — mi ausencia de hoy (estudiante)
router.get('/absence', async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const [student] = await pool.query('SELECT id FROM students WHERE profile_id = ?', [req.user.id]);
    if (student.length === 0) return res.json(null);

    const [rows] = await pool.query(
      'SELECT * FROM student_absences WHERE student_id = ? AND fecha = ?',
      [student[0].id, hoy]
    );
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});


// GET /api/cleaning/checklist-items?tipo=room|zone&zone_id=X
router.get('/checklist-items', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const { tipo, zone_id } = req.query;
    let sql = 'SELECT * FROM cleaning_checklist_items WHERE 1=1';
    const params = [];
    if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
    if (zone_id) { sql += ' AND zone_id = ?'; params.push(zone_id); }
    sql += ' ORDER BY orden ASC, id ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/cleaning/checklist-items
router.post('/checklist-items', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { tipo, zone_id, nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query(
      'INSERT INTO cleaning_checklist_items (tipo, zone_id, nombre) VALUES (?, ?, ?)',
      [tipo || 'room', zone_id || null, nombre.trim()]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// PUT /api/cleaning/checklist-items/:id
router.put('/checklist-items/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    await pool.query('UPDATE cleaning_checklist_items SET nombre = ? WHERE id = ?', [nombre.trim(), req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// DELETE /api/cleaning/checklist-items/:id
router.delete('/checklist-items/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM cleaning_checklist_items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ==================== CHECKLIST COMPLETIONS ====================

// GET /api/cleaning/checklist-completions?cleaning_block_room_id=X&fecha=YYYY-MM-DD
router.get('/checklist-completions', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const { cleaning_block_room_id, fecha } = req.query;
    if (!cleaning_block_room_id || !fecha) return res.status(400).json({ error: 'cleaning_block_room_id y fecha requeridos' });
    const [rows] = await pool.query(
      'SELECT * FROM cleaning_checklist_completions WHERE cleaning_block_room_id = ? AND fecha = ?',
      [cleaning_block_room_id, fecha]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// POST /api/cleaning/checklist-completions — guardar checklists de un room/zone para hoy
router.post('/checklist-completions', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const { cleaning_block_room_id, fecha, items } = req.body;
    // items: [{ checklist_item_id, completada }]
    if (!cleaning_block_room_id || !fecha || !items) return res.status(400).json({ error: 'Datos incompletos' });

    // Upsert each item
    for (const item of items) {
      await pool.query(
        `INSERT INTO cleaning_checklist_completions (cleaning_block_room_id, checklist_item_id, fecha, completada, completed_at)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE completada = VALUES(completada), completed_at = VALUES(completed_at)`,
        [
          cleaning_block_room_id,
          item.checklist_item_id,
          fecha,
          item.completada ? 1 : 0,
          item.completada ? new Date() : null
        ]
      );
    }

    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

module.exports = router;
