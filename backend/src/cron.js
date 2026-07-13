const pool = require('./db');

async function expireOverduePayments() {
  const [result] = await pool.query(
    "UPDATE pagos SET estado = 'vencido' WHERE estado = 'pendiente' AND fecha_vencimiento < CURDATE()"
  );
  if (result.affectedRows > 0) {
    console.log(`[Cron] ${result.affectedRows} pago(s) marcados como vencidos`);
  }
}

async function generateOnePayment(studentId, amount, periodStart) {
  const periodo = periodStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const [existing] = await pool.query(
    `SELECT id FROM pagos WHERE student_id = ? AND periodo = ? AND estado != 'anulado'`,
    [studentId, periodo]
  );
  if (existing.length > 0) return false;

  const vencimiento = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 5)
    .toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO pagos (student_id, periodo, importe, fecha_vencimiento)
     VALUES (?, ?, ?, ?)`,
    [studentId, periodo, amount, vencimiento]
  );
  console.log(`[Cron] Pago generado — student ${studentId}: ${periodo}`);
  return true;
}

async function autoGeneratePayments() {
  const [students] = await pool.query(
    `SELECT id, fecha_salida_prevista, cuota_mensual, facturar_cada
     FROM students
     WHERE estado IN ('activo','pendiente_salida') AND cuota_mensual > 0`
  );

  for (const student of students) {
    const interval = student.facturar_cada || 1;
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Encontrar el último pago existente
    const [lastPayment] = await pool.query(
      `SELECT fecha_vencimiento FROM pagos
       WHERE student_id = ? AND estado != 'anulado'
       ORDER BY fecha_vencimiento DESC LIMIT 1`,
      [student.id]
    );

    // Mes desde el que empezar a generar
    let current;
    if (lastPayment.length > 0) {
      const lastDate = new Date(lastPayment[0].fecha_vencimiento);
      current = new Date(lastDate.getFullYear(), lastDate.getMonth(), 1);
    } else {
      current = new Date(firstOfCurrentMonth);
    }

    // Mes tope
    let targetEnd;
    if (student.fecha_salida_prevista) {
      targetEnd = new Date(student.fecha_salida_prevista);
      targetEnd.setDate(1);
    } else {
      // Ventana móvil de 10 meses desde el mes actual
      targetEnd = new Date(now.getFullYear(), now.getMonth() + 9, 1);
    }

    if (current > targetEnd) continue;

    while (current <= targetEnd) {
      await generateOnePayment(student.id, student.cuota_mensual, current);
      current.setMonth(current.getMonth() + interval);
    }
  }
}

async function run() {
  console.log('[Cron] Ejecutando tareas programadas...');
  try {
    await expireOverduePayments();
  } catch (err) {
    console.error('[Cron] Error en expireOverduePayments:', err.message);
  }
  try {
    await autoGeneratePayments();
  } catch (err) {
    console.error('[Cron] Error en autoGeneratePayments:', err.message);
  }
}

module.exports = { run };
