CREATE DATABASE IF NOT EXISTS residencia_aerodynamics
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE residencia_aerodynamics;

-- ============================================================
-- TABLAS
-- NOTA: NO usar DROP TABLE. Para cambios usar ALTER TABLE.
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellidos VARCHAR(100) NOT NULL DEFAULT '',
  telefono VARCHAR(20) DEFAULT '',
  rol ENUM('direccion','administracion','limpieza','estudiante') NOT NULL DEFAULT 'estudiante',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL UNIQUE,
  habitacion VARCHAR(20) NOT NULL DEFAULT '',
  fecha_entrada DATE DEFAULT NULL,
  fecha_salida_prevista DATE DEFAULT NULL,
  fecha_salida_real DATE DEFAULT NULL,
  acceso_habitacion TINYINT(1) DEFAULT 1,
  contrato_url VARCHAR(500) DEFAULT '',
  cuota_mensual DECIMAL(10,2) DEFAULT 0.00,
  facturar_cada INT DEFAULT 1,
  estado ENUM('activo','pendiente_salida','baja') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS checklist_entrada (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tarea VARCHAR(255) NOT NULL,
  completada TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS checklist_salida (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tarea VARCHAR(255) NOT NULL,
  completada TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS salida_notificaciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  fecha_salida DATE NOT NULL,
  notificado TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaning_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dia_semana VARCHAR(20) NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaning_block_rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_id INT NOT NULL,
  room_name VARCHAR(20) NOT NULL,
  completada_por INT DEFAULT NULL,
  fecha_completada DATE DEFAULT NULL,
  FOREIGN KEY (block_id) REFERENCES cleaning_blocks(id) ON DELETE CASCADE,
  FOREIGN KEY (completada_por) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_absences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS incidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reportado_por INT NOT NULL,
  habitacion VARCHAR(20) DEFAULT '',
  tipo ENUM('urgente','normal','baja') NOT NULL DEFAULT 'normal',
  descripcion TEXT NOT NULL,
  estado ENUM('reportada','en_curso','resuelta','cerrada') DEFAULT 'reportada',
  asignado_a INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resuelta_at TIMESTAMP NULL DEFAULT NULL,
  FOREIGN KEY (reportado_por) REFERENCES profiles(id) ON DELETE CASCADE,
  FOREIGN KEY (asignado_a) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('transporte','residencia','cafeteria','comedor','recepción','instalaciones','otros') NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT '',
  dia_semana VARCHAR(20) DEFAULT '',
  hora_inicio TIME NOT NULL,
  hora_fin TIME DEFAULT NULL,
  ubicacion VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  periodo VARCHAR(20) NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_cobro DATE DEFAULT NULL,
  estado ENUM('pendiente','cobrado','vencido','anulado') DEFAULT 'pendiente',
  referencia_mandato VARCHAR(100) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- DOCUMENTOS (archivos sensibles de estudiantes)
-- ============================================================

CREATE TABLE IF NOT EXISTS documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL DEFAULT 'contrato',
  nombre_original VARCHAR(255) NOT NULL,
  archivo_ruta VARCHAR(500) NOT NULL,
  mime_type VARCHAR(100) DEFAULT '',
  tamano INT DEFAULT 0,
  subido_por INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (subido_por) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- HABITACIONES
-- ============================================================

CREATE TABLE IF NOT EXISTS rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO rooms (nombre) VALUES
  ('101'), ('102'), ('103'), ('104'), ('105'),
  ('201'), ('202'), ('203'), ('204'), ('205'),
  ('301'), ('302'), ('303'), ('304'), ('305');

-- ============================================================
-- ZONAS COMUNES (para incidencias)
-- ============================================================

CREATE TABLE IF NOT EXISTS common_zones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO common_zones (nombre) VALUES
  ('Cocina'),
  ('Salón comedor'),
  ('Lavandería'),
  ('Patio exterior'),
  ('Baño común planta baja');

-- ============================================================
-- USUARIO ADMIN POR DEFECTO (password: qwerty12345)
-- ============================================================

INSERT IGNORE INTO profiles (email, password_hash, nombre, apellidos, rol)
VALUES (
  'rodriguezruizalberto14@gmail.com',
  '$2b$10$dummyhash_admin_placeholder',
  'Alberto',
  'Rodríguez Ruiz',
  'direccion'
);
