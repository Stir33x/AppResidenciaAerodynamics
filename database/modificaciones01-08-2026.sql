-- ============================================================
-- MIGRACIÓN 01-08-2026
-- 1) Nuevo rol 'invitado' (alojados que no son alumnos)
-- 2) Tabla guests (no alumnos alojados)
-- 3) Tabla cleaning_sessions (cronómetro de limpieza inicio/fin)
-- ============================================================
USE gestion_residencia;

ALTER TABLE profiles MODIFY COLUMN rol ENUM('direccion','administracion','limpieza','estudiante','invitado','staff','cocina') NOT NULL DEFAULT 'estudiante';

CREATE TABLE IF NOT EXISTS guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  profile_id INT NOT NULL UNIQUE,
  habitacion VARCHAR(20) NOT NULL DEFAULT '',
  fecha_entrada DATE DEFAULT NULL,
  fecha_salida_prevista DATE DEFAULT NULL,
  fecha_salida_real DATE DEFAULT NULL,
  estado ENUM('activo','pendiente_salida','baja') DEFAULT 'activo',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cleaning_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cleaning_block_room_id INT NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT NULL,
  duration_seconds INT DEFAULT NULL,
  started_by INT DEFAULT NULL,
  stopped_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cleaning_block_room_id) REFERENCES cleaning_block_rooms(id) ON DELETE CASCADE,
  FOREIGN KEY (started_by) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (stopped_by) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4) Contrato / documentos de huespedes
ALTER TABLE guests ADD COLUMN contrato_url VARCHAR(500) DEFAULT NULL AFTER fecha_salida_real;

ALTER TABLE documents MODIFY COLUMN student_id INT NULL;
ALTER TABLE documents ADD COLUMN guest_id INT NULL DEFAULT NULL AFTER student_id;
ALTER TABLE documents ADD CONSTRAINT documents_guest_fk FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;

-- 5) Cursos de alumnos (un alumno puede tener varios cursos, opcionales)
CREATE TABLE IF NOT EXISTS cursos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS student_cursos (
  student_id INT NOT NULL,
  curso_id INT NOT NULL,
  PRIMARY KEY (student_id, curso_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (curso_id) REFERENCES cursos(id) ON DELETE CASCADE
) ENGINE=InnoDB;
