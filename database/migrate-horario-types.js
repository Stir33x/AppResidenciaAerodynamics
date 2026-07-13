/**
 * Migración: horarios.tipo (ENUM string) → horarios.tipo_id (FK)
 * Ejecutar solo una vez después de actualizar schema.sql.
 * node database/migrate-horario-types.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

// mysql2 lives in backend/node_modules
const mysql = require(path.resolve(__dirname, '..', 'backend', 'node_modules', 'mysql2', 'promise'));

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'residencia_aerodynamics',
    charset: 'utf8mb4',
  });

  console.log('Conectado. Verificando estructura...');

  // 1. Crear tabla si no existe
  await db.query(`
    CREATE TABLE IF NOT EXISTS horario_types (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL UNIQUE,
      color VARCHAR(50) DEFAULT 'badge-soft',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  // 2. Seed valores por defecto
  await db.query(`
    INSERT IGNORE INTO horario_types (nombre, color) VALUES
      ('transporte', 'badge-info'),
      ('residencia', 'badge-primary'),
      ('cafeteria', 'badge-warning'),
      ('comedor', 'badge-success'),
      ('recepción', 'badge-accent'),
      ('instalaciones', 'badge-neutral'),
      ('otros', 'badge-soft')
  `);

  // 3. Verificar si ya existe tipo_id
  const [cols] = await db.query('SHOW COLUMNS FROM horarios LIKE ?', ['tipo_id']);
  if (cols.length === 0) {
    console.log('Añadiendo columna tipo_id...');
    await db.query('ALTER TABLE horarios ADD COLUMN tipo_id INT AFTER id');
  }

  // 4. Verificar si existe la columna tipo (string) para backfill
  const [tipoCol] = await db.query('SHOW COLUMNS FROM horarios LIKE ?', ['tipo']);
  if (tipoCol.length > 0) {
    console.log('Migrando datos: tipo (string) → tipo_id...');
    await db.query(`
      UPDATE horarios h
      JOIN horario_types ht ON h.tipo = ht.nombre
      SET h.tipo_id = ht.id
    `);
    // Verificar si quedan sin migrar
    const [missing] = await db.query('SELECT id FROM horarios WHERE tipo_id IS NULL');
    if (missing.length > 0) {
      console.log(`Asignando ${missing.length} registro(s) sin tipo a "otros"...`);
      await db.query(`
        UPDATE horarios SET tipo_id = (SELECT id FROM horario_types WHERE nombre = 'otros')
        WHERE tipo_id IS NULL
      `);
    }
  }

  // 5. Hacer NOT NULL
  await db.query('ALTER TABLE horarios MODIFY tipo_id INT NOT NULL');

  // 6. Añadir FK
  const [fks] = await db.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = 'residencia_aerodynamics' AND TABLE_NAME = 'horarios'
       AND COLUMN_NAME = 'tipo_id' AND REFERENCED_TABLE_NAME = 'horario_types'`
  );
  if (fks.length === 0) {
    console.log('Añadiendo foreign key...');
    await db.query('ALTER TABLE horarios ADD FOREIGN KEY (tipo_id) REFERENCES horario_types(id)');
  }

  console.log('Migración completada.');
  await db.end();
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
