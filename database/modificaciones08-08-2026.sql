-- ============================================================
-- MIGRACIÓN 08-08-2026
-- 1) pagos.tipo: nuevo tipo 'diaria' (factura de tarifa diaria,
--    días de estancia × precio diario)
-- 2) guests: facturación igual que los alumnos
--    (cuota_mensual, facturar_cada y tipo_tarifa)
-- 3) pagos: soporte de pagos de huéspedes (guest_id opcional)
-- ============================================================
USE gestion_residencia;

ALTER TABLE pagos MODIFY COLUMN tipo ENUM('regular','extra','parking','shuttle','puntual','fianza','diaria') NOT NULL DEFAULT 'regular';

ALTER TABLE guests ADD COLUMN cuota_mensual DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER fecha_salida_real;
ALTER TABLE guests ADD COLUMN facturar_cada VARCHAR(20) NOT NULL DEFAULT '1' AFTER cuota_mensual;
ALTER TABLE guests ADD COLUMN tipo_tarifa ENUM('mayor_9','menor_9','diaria','cantidad') DEFAULT 'cantidad' AFTER facturar_cada;

ALTER TABLE pagos ADD COLUMN guest_id INT NULL DEFAULT NULL AFTER student_id;
ALTER TABLE pagos MODIFY COLUMN student_id INT NULL;
ALTER TABLE pagos ADD CONSTRAINT pagos_guest_fk FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE;
