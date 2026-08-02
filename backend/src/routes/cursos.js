const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/cursos — todos los cursos
router.get('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM cursos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/cursos
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO cursos (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ id: result.insertId, nombre });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El curso ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/cursos/:id
router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const nombre = (req.body.nombre || '').trim();
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('UPDATE cursos SET nombre = ? WHERE id = ?', [nombre, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Curso no encontrado' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'El curso ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/cursos/:id
router.delete('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM cursos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
