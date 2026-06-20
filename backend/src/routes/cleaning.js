const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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
    const hoyStr = new Date().toISOString().slice(0, 10);

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
      block.rooms = rooms;

      // Ausencias de estudiantes en esas habitaciones hoy
      for (const room of rooms) {
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
        room.completada_hoy = room.fecha_completada === hoyStr ? 1 : 0;
      }
    }

    res.json({ dia: hoy, blocks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cleaning/rooms/:id/complete — marcar/desmarcar habitación como limpiada hoy
router.post('/rooms/:id/complete', async (req, res) => {
  try {
    const roomId = req.params.id;
    const hoy = new Date().toISOString().slice(0, 10);
    const { imagen } = req.body;

    const [room] = await pool.query('SELECT * FROM cleaning_block_rooms WHERE id = ?', [roomId]);
    if (room.length === 0) return res.status(404).json({ error: 'No encontrado' });

    if (room[0].fecha_completada === hoy) {
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
router.get('/checklist-completions', async (req, res) => {
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
router.post('/checklist-completions', async (req, res) => {
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
