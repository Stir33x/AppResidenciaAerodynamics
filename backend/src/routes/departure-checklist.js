const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

// ==================== CHECKLIST ITEMS (template) ====================

router.get('/items', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM departure_checklist_items ORDER BY orden ASC, id ASC');
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/items', requireRole('direccion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO departure_checklist_items (nombre) VALUES (?)', [nombre.trim()]);
    res.status(201).json({ id: result.insertId, nombre: nombre.trim() });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un elemento con ese nombre' });
    console.error(err); res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/items/:id', requireRole('direccion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    await pool.query('UPDATE departure_checklist_items SET nombre = ? WHERE id = ?', [nombre.trim(), req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/items/:id', requireRole('direccion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM departure_checklist_items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ==================== CHECKLIST LOGS (per student) ====================

router.get('/logs/:student_id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM departure_checklist_logs WHERE student_id = ?',
      [req.params.student_id]
    );
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/logs/:student_id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { items } = req.body;
    // items: [{ checklist_item_id, completada }]
    const studentId = req.params.student_id;

    for (const item of items) {
      await pool.query(
        `INSERT INTO departure_checklist_logs (student_id, checklist_item_id, completada, completed_at)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE completada = VALUES(completada), completed_at = VALUES(completed_at)`,
        [studentId, item.checklist_item_id, item.completada ? 1 : 0, item.completada ? new Date() : null]
      );
    }
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

module.exports = router;
