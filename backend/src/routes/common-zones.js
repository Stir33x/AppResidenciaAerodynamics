const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);

// GET /api/common-zones
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM common_zones ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/common-zones (solo staff)
router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO common_zones (nombre) VALUES (?)', [nombre.trim()]);
    res.status(201).json({ id: result.insertId, nombre: nombre.trim() });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Esa zona ya existe' });
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/common-zones/:id (solo staff)
router.delete('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM common_zones WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
