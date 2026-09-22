-- ============================================================
-- MIGRACIÓN 17-09-2026
-- FLIGHTLOGGER: integración con FlightLogger (escuela de vuelo).
-- Se añade a alumnos la columna flightlogger_id: la ID que tiene
-- el alumno en FlightLogger, para vincular ambos sistemas.
-- Se usa más adelante para abrir el perfil del alumno y para
-- sincronizar datos (autocompletado al registrar).
-- ============================================================
USE gestion_residencia;

ALTER TABLE students ADD COLUMN flightlogger_id VARCHAR(50) NULL DEFAULT NULL AFTER contrato_url;
ALTER TABLE students ADD INDEX idx_students_flightlogger (flightlogger_id);