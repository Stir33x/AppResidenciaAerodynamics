-- ============================================================
-- MIGRACIÓN 06-09-2026
-- 1) menu_orders: pedidos/encargos de platos del menú
--    (quién encarga, qué plato, para qué día y en qué cantidad)
-- 2) CHAT GENERAL: mensajería entre todo el personal y los
--    usuarios. Incluye:
--      · chat del alumno con el equipo de dirección/administración
--      · conversaciones 1:1 entre dirección/administración y
--        cualquier otro perfil (staff, cocina, limpieza, invitado...)
--    MODELO: conversations (equipo|privado) + participantes +
--    chat_messages por conversación.
--    NOTA: al ser un esquema nuevo (sin desplegar), las tablas
--    anteriores se sueltan y se recrean (menu_orders no se toca).
-- ============================================================
USE gestion_residencia;

CREATE TABLE IF NOT EXISTS menu_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  menu_item_id INT NOT NULL,
  profile_id INT NOT NULL,
  fecha DATE NOT NULL,
  cantidad INT NOT NULL DEFAULT 1,
  estado ENUM('pendiente','servido','cancelado') NOT NULL DEFAULT 'pendiente',
  nota VARCHAR(255) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (menu_item_id) REFERENCES menu_template_items(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2) CHAT GENERAL
--    Creo la infraestructura de conversaciones: cada conversación
--    agrupa participantes y mensajes.
-- ============================================================

DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;

CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tipo ENUM('equipo','privado') NOT NULL DEFAULT 'privado',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE conversation_participants (
  conversation_id INT NOT NULL,
  profile_id INT NOT NULL,
  PRIMARY KEY (conversation_id, profile_id),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversation_id INT NOT NULL,
  sender_id INT NOT NULL,
  sender_rol VARCHAR(30) NOT NULL,
  mensaje TEXT NOT NULL,
  leido TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_chat_conversation (conversation_id, created_at),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB;