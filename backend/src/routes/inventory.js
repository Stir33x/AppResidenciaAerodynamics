const { Router } = require('express');
const pool = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = Router();
router.use(authMiddleware);

// ==================== CATALOG ====================

router.get('/catalog', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, COALESCE(SUM(i.cantidad), 0) AS total_asignado
      FROM inventory_catalog c
      LEFT JOIN inventory_items i ON i.catalog_id = c.id
      GROUP BY c.id
      ORDER BY c.nombre ASC
    `);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/catalog', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    const [result] = await pool.query('INSERT INTO inventory_catalog (nombre) VALUES (?)', [nombre.trim()]);
    res.status(201).json({ id: result.insertId, nombre: nombre.trim(), total_asignado: 0 });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un artículo con ese nombre' });
    console.error(err); res.status(500).json({ error: 'Error del servidor' });
  }
});

router.put('/catalog/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre requerido' });
    await pool.query('UPDATE inventory_catalog SET nombre = ? WHERE id = ?', [nombre.trim(), req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya existe un artículo con ese nombre' });
    console.error(err); res.status(500).json({ error: 'Error del servidor' });
  }
});

router.delete('/catalog/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_catalog WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ==================== ASSIGNMENTS ====================

router.get('/', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const { tipo, room_name, zone_id } = req.query;
    let sql = `
      SELECT i.*, c.nombre
      FROM inventory_items i
      JOIN inventory_catalog c ON c.id = i.catalog_id
      WHERE 1=1
    `;
    const params = [];
    if (tipo) { sql += ' AND i.tipo = ?'; params.push(tipo); }
    if (room_name) { sql += ' AND i.room_name = ?'; params.push(room_name); }
    if (zone_id) { sql += ' AND i.zone_id = ?'; params.push(zone_id); }
    sql += ' ORDER BY c.nombre ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { catalog_id, tipo, room_name, zone_id, cantidad } = req.body;
    if (!catalog_id || !cantidad) return res.status(400).json({ error: 'catalog_id y cantidad requeridos' });
    const [result] = await pool.query(
      'INSERT INTO inventory_items (catalog_id, tipo, room_name, zone_id, cantidad) VALUES (?, ?, ?, ?, ?)',
      [catalog_id, tipo || 'room', room_name || null, zone_id || null, cantidad]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.put('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { cantidad } = req.body;
    await pool.query('UPDATE inventory_items SET cantidad = ? WHERE id = ?', [cantidad, req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.delete('/:id', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

// ==================== STORAGE (ALMACÉN) ====================

router.get('/by-room/:room_name', requireRole('direccion', 'administracion', 'limpieza'), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT i.*, c.nombre
      FROM inventory_items i
      JOIN inventory_catalog c ON c.id = i.catalog_id
      WHERE i.tipo = 'room' AND i.room_name = ?
      ORDER BY c.nombre ASC
    `, [req.params.room_name]);
    res.json(rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/move-to-storage', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { item_ids } = req.body;
    if (!item_ids || !Array.isArray(item_ids) || item_ids.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un ID de artículo' });
    }
    await pool.query(
      'UPDATE inventory_items SET tipo = ?, room_name = NULL, zone_id = NULL WHERE id IN (?)',
      ['almacen', item_ids]
    );
    res.json({ ok: true, moved: item_ids.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.post('/assign-from-storage', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { room_name, items } = req.body;
    // items = [{ catalog_id, cantidad }]
    if (!room_name || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'room_name y items[] requeridos' });
    }

    for (const { catalog_id, cantidad } of items) {
      if (!catalog_id || !cantidad || cantidad <= 0) continue;

      let needed = cantidad;

      // Find almacen items with this catalog_id, ordered by id (FIFO)
      const [almacenItems] = await pool.query(
        'SELECT * FROM inventory_items WHERE tipo = ? AND catalog_id = ? AND cantidad > 0 ORDER BY id ASC',
        ['almacen', catalog_id]
      );

      for (const almacenItem of almacenItems) {
        if (needed <= 0) break;
        const toTake = Math.min(needed, almacenItem.cantidad);
        needed -= toTake;

        if (almacenItem.cantidad - toTake <= 0) {
          await pool.query('DELETE FROM inventory_items WHERE id = ?', [almacenItem.id]);
        } else {
          await pool.query('UPDATE inventory_items SET cantidad = cantidad - ? WHERE id = ?', [toTake, almacenItem.id]);
        }

        const [existingRoom] = await pool.query(
          'SELECT id FROM inventory_items WHERE tipo = ? AND room_name = ? AND catalog_id = ?',
          ['room', room_name, catalog_id]
        );

        if (existingRoom.length > 0) {
          await pool.query('UPDATE inventory_items SET cantidad = cantidad + ? WHERE id = ?', [toTake, existingRoom[0].id]);
        } else {
          await pool.query(
            'INSERT INTO inventory_items (catalog_id, tipo, room_name, cantidad) VALUES (?, ?, ?, ?)',
            [catalog_id, 'room', room_name, toTake]
          );
        }
      }
    }

    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

router.put('/:id/move', requireRole('direccion', 'administracion'), async (req, res) => {
  try {
    const { tipo, room_name, zone_id } = req.body;
    if (!tipo) return res.status(400).json({ error: 'Se requiere tipo de destino (room/zone/almacen)' });
    await pool.query(
      'UPDATE inventory_items SET tipo = ?, room_name = ?, zone_id = ? WHERE id = ?',
      [tipo, tipo === 'room' ? room_name : null, tipo === 'zone' ? zone_id : null, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error del servidor' }); }
});

module.exports = router;
