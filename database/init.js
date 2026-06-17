/**
 * Inicializa la base de datos.
 * Ejecutar: node database/init.js
 *
 * Requiere MySQL (XAMPP) corriendo.
 * Las credenciales se leen de backend/.env
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

async function initDB() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true,
  });

  console.log('Conectado a MySQL. Ejecutando schema...');

  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await connection.query(sql);

  // Generar hash real para el admin
  const hash = await bcrypt.hash('qwerty12345', 10);
  await connection.query(
    `UPDATE residencia_aerodynamics.profiles
     SET password_hash = ? WHERE email = 'rodriguezruizalberto14@gmail.com'`,
    [hash]
  );

  console.log('Base de datos creada correctamente.');
  console.log('Usuario admin: rodriguezruizalberto14@gmail.com / qwerty12345');

  await connection.end();
}

initDB().catch((err) => {
  console.error('Error al inicializar la BD:', err);
  process.exit(1);
});
