const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();

router.use(authMiddleware);
const edit = requireRole('direccion', 'administracion', 'cocina');

// ─── Alérgenos ───────────────────────────────────────────────
router.get('/allergens', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM allergens ORDER BY nombre');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Plantillas ──────────────────────────────────────────────
router.get('/templates', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM menu_templates ORDER BY is_global DESC, nombre');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const [tmpl] = await pool.query('SELECT * FROM menu_templates WHERE id = ?', [req.params.id]);
    if (tmpl.length === 0) return res.status(404).json({ error: 'Plantilla no encontrada' });
    const template = tmpl[0];

    const [sections] = await pool.query(
      'SELECT * FROM menu_template_sections WHERE template_id = ? ORDER BY orden',
      [req.params.id]
    );

    for (const section of sections) {
      const [items] = await pool.query(
        'SELECT * FROM menu_template_items WHERE section_id = ? ORDER BY orden',
        [section.id]
      );
      for (const item of items) {
        const [allergens] = await pool.query(
          `SELECT a.id, a.nombre FROM allergens a
           INNER JOIN menu_item_allergens mia ON mia.allergen_id = a.id
           WHERE mia.menu_item_id = ?
           ORDER BY a.nombre`,
          [item.id]
        );
        item.allergens = allergens;
      }
      section.items = items;
    }
    template.sections = sections;
    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/templates', edit, async (req, res) => {
  try {
    const { nombre, descripcion, is_global } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query(
      'INSERT INTO menu_templates (nombre, descripcion, is_global) VALUES (?, ?, ?)',
      [nombre, descripcion || '', is_global ? 1 : 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/templates/:id', edit, async (req, res) => {
  try {
    const { nombre, descripcion, is_global } = req.body;
    await pool.query(
      'UPDATE menu_templates SET nombre = ?, descripcion = ?, is_global = ? WHERE id = ?',
      [nombre, descripcion || '', is_global ? 1 : 0, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/templates/:id', edit, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_templates WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Secciones ───────────────────────────────────────────────
router.post('/templates/:tid/sections', edit, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query(
      'INSERT INTO menu_template_sections (template_id, nombre) VALUES (?, ?)',
      [req.params.tid, nombre]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/templates/:tid/sections/:sid', edit, async (req, res) => {
  try {
    const { nombre, orden } = req.body;
    await pool.query(
      'UPDATE menu_template_sections SET nombre = ?, orden = ? WHERE id = ? AND template_id = ?',
      [nombre, orden || 0, req.params.sid, req.params.tid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/templates/:tid/sections/:sid', edit, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_template_sections WHERE id = ? AND template_id = ?', [req.params.sid, req.params.tid]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Items ───────────────────────────────────────────────────
router.post('/templates/:tid/sections/:sid/items', edit, async (req, res) => {
  try {
    const { nombre, descripcion, precio } = req.body;
    if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query(
      'INSERT INTO menu_template_items (section_id, nombre, descripcion, precio) VALUES (?, ?, ?, ?)',
      [req.params.sid, nombre, descripcion || '', precio || 0]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/templates/:tid/sections/:sid/items/:iid', edit, async (req, res) => {
  try {
    const { nombre, descripcion, precio, orden } = req.body;
    await pool.query(
      'UPDATE menu_template_items SET nombre = ?, descripcion = ?, precio = ?, orden = ? WHERE id = ? AND section_id = ?',
      [nombre, descripcion || '', precio || 0, orden || 0, req.params.iid, req.params.sid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/templates/:tid/sections/:sid/items/:iid', edit, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_template_items WHERE id = ? AND section_id = ?', [req.params.iid, req.params.sid]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Alérgenos de items ──────────────────────────────────────
router.post('/items/:iid/allergens', edit, async (req, res) => {
  try {
    const { allergen_id } = req.body;
    if (!allergen_id) return res.status(400).json({ error: 'allergen_id requerido' });
    await pool.query(
      'INSERT IGNORE INTO menu_item_allergens (menu_item_id, allergen_id) VALUES (?, ?)',
      [req.params.iid, allergen_id]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/items/:iid/allergens/:aid', edit, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM menu_item_allergens WHERE menu_item_id = ? AND allergen_id = ?',
      [req.params.iid, req.params.aid]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Asignaciones ────────────────────────────────────────────
router.get('/assignments', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT ma.*, mt.nombre AS template_nombre
       FROM menu_assignments ma
       LEFT JOIN menu_templates mt ON mt.id = ma.template_id
       ORDER BY
         CASE ma.tipo
           WHEN 'global' THEN 0
           WHEN 'semanal' THEN 1
           WHEN 'fecha' THEN 2
         END,
         ma.dia_semana,
         ma.fecha`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/assignments', edit, async (req, res) => {
  try {
    const { template_id, tipo, dia_semana, fecha } = req.body;
    if (!template_id || !tipo) return res.status(400).json({ error: 'template_id y tipo requeridos' });

    if (tipo === 'global') {
      const [existing] = await pool.query(
        "SELECT id FROM menu_assignments WHERE tipo = 'global' AND id != ?",
        [req.body.id || 0]
      );
      if (existing.length > 0) {
        return res.status(400).json({ error: 'Ya existe una asignación global. Elimínala primero.' });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO menu_assignments (template_id, tipo, dia_semana, fecha) VALUES (?, ?, ?, ?)',
      [template_id, tipo, dia_semana || null, fecha || null]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/assignments/:id', edit, async (req, res) => {
  try {
    const { template_id, tipo, dia_semana, fecha } = req.body;
    await pool.query(
      'UPDATE menu_assignments SET template_id = ?, tipo = ?, dia_semana = ?, fecha = ? WHERE id = ?',
      [template_id, tipo, dia_semana || null, fecha || null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/assignments/:id', edit, async (req, res) => {
  try {
    await pool.query('DELETE FROM menu_assignments WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ─── Menú efectivo para una fecha ────────────────────────────
// Prioridad: 1) fecha exacta, 2) día de semana, 3) global
async function getEffectiveTemplateId(fecha) {
  const date = new Date(fecha);
  const diaSemana = ((date.getDay() + 6) % 7) + 1; // 1=Lun..7=Dom

  const [rows] = await pool.query(
    `SELECT template_id FROM menu_assignments
     WHERE (tipo = 'fecha' AND fecha = ?)
        OR (tipo = 'semanal' AND dia_semana = ?)
        OR tipo = 'global'
     ORDER BY
       CASE tipo
         WHEN 'fecha' THEN 0
         WHEN 'semanal' THEN 1
         WHEN 'global' THEN 2
       END
     LIMIT 1`,
    [fecha, diaSemana]
  );

  if (rows.length === 0) return null;
  return rows[0].template_id;
}

async function fetchTemplateWithDetails(templateId) {
  const [tmpl] = await pool.query('SELECT * FROM menu_templates WHERE id = ?', [templateId]);
  if (tmpl.length === 0) return null;
  const template = tmpl[0];

  const [sections] = await pool.query(
    'SELECT * FROM menu_template_sections WHERE template_id = ? ORDER BY orden',
    [templateId]
  );

  for (const section of sections) {
    const [items] = await pool.query(
      'SELECT * FROM menu_template_items WHERE section_id = ? ORDER BY orden',
      [section.id]
    );
    for (const item of items) {
      const [allergens] = await pool.query(
        `SELECT a.id, a.nombre FROM allergens a
         INNER JOIN menu_item_allergens mia ON mia.allergen_id = a.id
         WHERE mia.menu_item_id = ?
         ORDER BY a.nombre`,
        [item.id]
      );
      item.allergens = allergens;
    }
    section.items = items;
  }
  template.sections = sections;
  return template;
}

router.get('/effective', async (req, res) => {
  try {
    const fecha = req.query.fecha || new Date().toISOString().split('T')[0];
    const templateId = await getEffectiveTemplateId(fecha);
    if (!templateId) return res.json(null);
    const template = await fetchTemplateWithDetails(templateId);
    res.json(template);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /menu/effective-range?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/effective-range', async (req, res) => {
  try {
    const from = req.query.from || new Date().toISOString().split('T')[0];
    const to = req.query.to || from;
    const start = new Date(from);
    const end = new Date(to);
    const cache = {};

    const results = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const fecha = d.toISOString().split('T')[0];
      const templateId = await getEffectiveTemplateId(fecha);
      if (templateId) {
        if (!cache[templateId]) cache[templateId] = await fetchTemplateWithDetails(templateId);
        results.push({ fecha, template: cache[templateId] });
      } else {
        results.push({ fecha, template: null });
      }
    }

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
