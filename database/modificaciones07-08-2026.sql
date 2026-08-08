-- ============================================================
-- MIGRACIÓN 07-08-2026
-- 1) students.tipo_tarifa: tipo de tarifa del alumno
--    ('mayor_9' >9 meses, 'menor_9' <9 meses, 'diaria' tarifa
--     diaria, 'cantidad' cantidad específica)
-- 2) students.facturar_cada: pasa a texto para poder usar
--    'semanal' y 'puntual' además de los meses (1,2,3,6,12)
-- 3) pagos.tipo: nuevos tipos 'parking', 'shuttle', 'puntual'
--    (pago puntual para estancias cortas) y 'fianza' (depósito)
-- ============================================================
USE gestion_residencia;

ALTER TABLE students ADD COLUMN tipo_tarifa ENUM('mayor_9','menor_9','diaria','cantidad') DEFAULT 'cantidad' AFTER facturar_cada;

ALTER TABLE students MODIFY COLUMN facturar_cada VARCHAR(20) NOT NULL DEFAULT '1';

ALTER TABLE pagos MODIFY COLUMN tipo ENUM('regular','extra','parking','shuttle','puntual','fianza') NOT NULL DEFAULT 'regular';
