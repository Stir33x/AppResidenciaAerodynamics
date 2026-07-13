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
  room_name VARCHAR(100) NOT NULL,
  tipo ENUM('room','zone') NOT NULL DEFAULT 'room',
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

CREATE TABLE IF NOT EXISTS cleaning_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('room','zone') NOT NULL DEFAULT 'room',
  zone_id INT DEFAULT NULL,
  nombre VARCHAR(200) NOT NULL,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES common_zones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaning_checklist_completions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cleaning_block_room_id INT NOT NULL,
  checklist_item_id INT NOT NULL,
  fecha DATE NOT NULL,
  completada BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_checklist_daily (cleaning_block_room_id, checklist_item_id, fecha),
  FOREIGN KEY (cleaning_block_room_id) REFERENCES cleaning_block_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES cleaning_checklist_items(id) ON DELETE CASCADE
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

CREATE TABLE IF NOT EXISTS horario_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(50) DEFAULT 'badge-soft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO horario_types (nombre, color) VALUES
  ('transporte', 'badge-info'),
  ('residencia', 'badge-primary'),
  ('cafeteria', 'badge-warning'),
  ('comedor', 'badge-success'),
  ('recepci\u00f3n', 'badge-accent'),
  ('instalaciones', 'badge-neutral'),
  ('otros', 'badge-soft');

CREATE TABLE IF NOT EXISTS horarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo_id INT NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT '',
  dia_semana VARCHAR(20) DEFAULT '',
  hora_inicio TIME NOT NULL,
  hora_fin TIME DEFAULT NULL,
  ubicacion VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tipo_id) REFERENCES horario_types(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pagos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  tipo ENUM('regular','extra') NOT NULL DEFAULT 'regular',
  periodo VARCHAR(20) NOT NULL,
  importe DECIMAL(10,2) NOT NULL,
  descripcion TEXT DEFAULT NULL,
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
-- TIPOS DE DOCUMENTO (categorías editables)
-- ============================================================

CREATE TABLE IF NOT EXISTS document_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  color VARCHAR(30) DEFAULT 'badge-soft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO document_types (nombre, color) VALUES
  ('contrato', 'badge-primary'),
  ('documento', 'badge-soft'),
  ('justificante', 'badge-info'),
  ('parte', 'badge-warning'),
  ('recibo', 'badge-success'),
  ('otro', 'badge-soft');

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

CREATE TABLE IF NOT EXISTS inventory_catalog (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  catalog_id INT NOT NULL,
  tipo ENUM('room','zone') NOT NULL DEFAULT 'room',
  room_name VARCHAR(100) DEFAULT NULL,
  zone_id INT DEFAULT NULL,
  cantidad INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (catalog_id) REFERENCES inventory_catalog(id) ON DELETE CASCADE,
  FOREIGN KEY (zone_id) REFERENCES common_zones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS departure_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL UNIQUE,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO departure_checklist_items (nombre, orden) VALUES
  ('Recoger llaves', 1),
  ('Revisar habitación (daños)', 2),
  ('Devolver inventario de habitación', 3),
  ('Liquidar pagos pendientes', 4),
  ('Cerrar cuenta', 5);

CREATE TABLE IF NOT EXISTS departure_checklist_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  checklist_item_id INT NOT NULL,
  completada BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_departure_item (student_id, checklist_item_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES departure_checklist_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- REGISTRATION CHECKLIST (alta de alumno)
-- ============================================================

CREATE TABLE IF NOT EXISTS registration_checklist_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL UNIQUE,
  obligatorio BOOLEAN DEFAULT FALSE,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO registration_checklist_items (nombre, obligatorio, orden) VALUES
  ('Registrar alumno en la plataforma', TRUE, 1),
  ('Asignar habitación', FALSE, 2),
  ('Entregar llaves / tarjeta acceso', FALSE, 3),
  ('Firmar contrato de alojamiento', FALSE, 4),
  ('Dar de alta domiciliación bancaria', FALSE, 5);

-- ============================================================
-- IMÁGENES (añadir columna a tablas existentes)
-- ============================================================

ALTER TABLE incidencias ADD COLUMN IF NOT EXISTS imagen VARCHAR(500) DEFAULT NULL;
ALTER TABLE cleaning_block_rooms ADD COLUMN IF NOT EXISTS imagen VARCHAR(500) DEFAULT NULL;
ALTER TABLE cleaning_block_rooms ADD COLUMN IF NOT EXISTS zone_id INT DEFAULT NULL,
  ADD FOREIGN KEY IF NOT EXISTS (zone_id) REFERENCES common_zones(id) ON DELETE SET NULL;
ALTER TABLE inventory_items MODIFY COLUMN tipo ENUM('room','zone','almacen') NOT NULL DEFAULT 'room';
ALTER TABLE profiles MODIFY COLUMN rol ENUM('direccion','administracion','limpieza','estudiante','staff','cocina') NOT NULL DEFAULT 'estudiante';

CREATE TABLE IF NOT EXISTS registration_checklist_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  checklist_item_id INT NOT NULL,
  completada BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uq_registration_item (student_id, checklist_item_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (checklist_item_id) REFERENCES registration_checklist_items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- ALÉRGENOS
-- ============================================================

CREATE TABLE IF NOT EXISTS allergens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT IGNORE INTO allergens (nombre) VALUES
  ('Gluten'), ('Lácteos'), ('Huevos'), ('Cacahuetes'),
  ('Frutos secos'), ('Soja'), ('Pescado'), ('Marisco'),
  ('Sulfitos'), ('Sésamo'), ('Mostaza'), ('Apio'),
  ('Moluscos'), ('Altramuces');

-- ============================================================
-- MENÚS — Plantillas reutilizables + asignación por día/fecha
-- ============================================================

CREATE TABLE IF NOT EXISTS menu_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_template_sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES menu_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_template_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  section_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT DEFAULT NULL,
  precio DECIMAL(10,2) DEFAULT 0.00,
  orden INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (section_id) REFERENCES menu_template_sections(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_item_allergens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  allergen_id INT NOT NULL,
  UNIQUE KEY uq_item_allergen (menu_item_id, allergen_id),
  FOREIGN KEY (menu_item_id) REFERENCES menu_template_items(id) ON DELETE CASCADE,
  FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS menu_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_id INT NOT NULL,
  tipo ENUM('global','semanal','fecha') NOT NULL DEFAULT 'fecha',
  dia_semana TINYINT DEFAULT NULL COMMENT '1=Lun..7=Dom',
  fecha DATE DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (template_id) REFERENCES menu_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB;

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
