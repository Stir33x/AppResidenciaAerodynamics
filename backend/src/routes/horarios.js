const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/horarios
router.get('/', async (req, res) => {
  try {
    const { tipo } = req.query;
    let sql = 'SELECT h.*, ht.nombre AS tipo, ht.color AS tipo_color FROM horarios h JOIN horario_types ht ON ht.id = h.tipo_id';
    const params = [];
    if (tipo) { sql += ' WHERE ht.nombre = ?'; params.push(tipo); }
    sql += ' ORDER BY FIELD(h.dia_semana, "Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"), h.hora_inicio';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/horarios (staff only)
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { tipo_id, titulo, descripcion, dia_semana, hora_inicio, hora_fin, ubicacion } = req.body;
    if (!tipo_id || !titulo || !hora_inicio) {
      return res.status(400).json({ error: 'Tipo, título y hora requeridos' });
    }
    const [result] = await pool.query(
      'INSERT INTO horarios (tipo_id, titulo, descripcion, dia_semana, hora_inicio, hora_fin, ubicacion) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [tipo_id, titulo, descripcion || '', dia_semana || '', hora_inicio, hora_fin || null, ubicacion || '']
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/horarios/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { tipo_id, titulo, descripcion, dia_semana, hora_inicio, hora_fin, ubicacion } = req.body;
    await pool.query(
      'UPDATE horarios SET tipo_id = ?, titulo = ?, descripcion = ?, dia_semana = ?, hora_inicio = ?, hora_fin = ?, ubicacion = ? WHERE id = ?',
      [tipo_id, titulo, descripcion || '', dia_semana || '', hora_inicio, hora_fin || null, ubicacion || '', req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/horarios/:id
router.delete('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM horarios WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
