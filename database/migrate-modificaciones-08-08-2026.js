/**
 * Migración: aplica database/modificaciones08-08-2026.sql
 *  - pagos.tipo: nuevo tipo 'diaria' (factura de tarifa diaria)
 *  - guests: facturación igual que los alumnos (cuota, frecuencia, tipo)
 *  - pagos: soporte de pagos de huéspedes (guest_id opcional)
 *
 * Es idempotente: si una sentencia ya está aplicada, la omite y continúa.
 * Ejecutar: node database/migrate-modificaciones-08-08-2026.js
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Localización de node_modules y .env (funciona en local y en producción)
// ---------------------------------------------------------------------------
function findBackendDir() {
  if (process.env.MIGRATE_BACKEND_DIR) return process.env.MIGRATE_BACKEND_DIR;
  const candidates = [
    path.resolve(__dirname, '..', 'backend'),
    path.resolve(__dirname, '..'),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'node_modules', 'mysql2'))) return dir;
  }
  return null;
}

function loadBackendModule(name) {
  const backendDir = findBackendDir();
  if (backendDir) {
    const pkgRoot = path.join(backendDir, 'node_modules', name.split('/')[0]);
    if (fs.existsSync(pkgRoot)) return require(path.join(backendDir, 'node_modules', name));
  }
  return require(name);
}

function findEnvFile() {
  if (process.env.MIGRATE_ENV_FILE) return process.env.MIGRATE_ENV_FILE;
  const backendDir = findBackendDir();
  const candidates = [
    backendDir && path.join(backendDir, '.env'),
    path.resolve(__dirname, '..', '.env'),
    path.resolve(__dirname, '.env'),
  ].filter(Boolean);
  return candidates.find((f) => fs.existsSync(f)) || undefined;
}

let dotenv = { config: () => {} };
try {
  dotenv = loadBackendModule('dotenv');
} catch (e) {
  console.log('Aviso: dotenv no encontrado. Se usarán las variables de entorno (DB_HOST, DB_USER, ...) ya definidas en el proceso.');
}
dotenv.config({ path: findEnvFile() });
const mysql = loadBackendModule('mysql2/promise');

const IGNORABLE = new Set([1060, 1061, 1091, 1022, 121]);

function isIgnorable(err) {
  if (IGNORABLE.has(err.errno)) return true;
  if (err.errno === 1005 && /duplicate key/i.test(err.sqlMessage || '')) return true;
  return false;
}

async function migrate() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_residencia',
    charset: 'utf8mb4',
  });

  const sql = fs.readFileSync(path.join(__dirname, 'modificaciones08-08-2026.sql'), 'utf8');
  const statements = sql
    .split(';')
    .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
    .filter((s) => s && !/^use\s+\w+$/i.test(s));

  console.log(`Ejecutando ${statements.length} sentencias sobre '${db.config.database}'...\n`);

  for (const stmt of statements) {
    try {
      await db.query(stmt);
      console.log('OK   :', stmt.split('\n')[0].slice(0, 90));
    } catch (err) {
      if (isIgnorable(err)) {
        console.log('SKIP : ya aplicado →', stmt.split('\n')[0].slice(0, 90));
      } else {
        throw err;
      }
    }
  }

  console.log('\nMigración 08-08-2026 aplicada correctamente.');
  await db.end();
}

migrate().catch((err) => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
