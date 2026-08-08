const pool = require('./db');
const { dailyAmount, dailyPeriodo } = require('./lib/billing');

async function expireOverduePayments() {
  const [result] = await pool.query(
    "UPDATE pagos SET estado = 'vencido' WHERE estado = 'pendiente' AND fecha_vencimiento < CURDATE()"
  );
  if (result.affectedRows > 0) {
    console.log(`[Cron] ${result.affectedRows} pago(s) marcados como vencidos`);
  }
}

async function generateOnePayment(person, amount, periodStart) {
  const periodo = periodStart.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const ownerSql = person.guest_id
    ? `SELECT id FROM pagos WHERE guest_id = ? AND periodo = ? AND estado != 'anulado'`
    : `SELECT id FROM pagos WHERE student_id = ? AND periodo = ? AND estado != 'anulado'`;
  const ownerParam = person.guest_id ? person.guest_id : person.id;
  const [existing] = await pool.query(ownerSql, [ownerParam, periodo]);
  if (existing.length > 0) return false;

  const vencimiento = new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 5)
    .toISOString().slice(0, 10);
  await pool.query(
    `INSERT INTO pagos (student_id, guest_id, periodo, importe, fecha_vencimiento)
     VALUES (?, ?, ?, ?, ?)`,
    [person.guest_id ? null : person.id, person.guest_id || null, periodo, amount, vencimiento]
  );
  console.log(`[Cron] Pago generado — ${person.guest_id ? 'guest' : 'student'} ${ownerParam}: ${periodo}`);
  return true;
}

// Facturas de tarifa diaria por tramos: factura los días de estancia aún no
// facturados hasta la fecha límite (fecha_salida_prevista) o, si no hay límite,
// hasta fin de mes. Así se renueva cada mes mientras el alumno/huésped siga
// activo, hasta que se le ponga fecha límite, sin duplicar días facturados.
async function generateDailyInvoice(person) {
  if (person.tipo_tarifa !== 'diaria' || !person.fecha_entrada) return false;

  const ownerCond = person.guest_id ? 'guest_id' : 'student_id';
  const ownerParam = person.guest_id ? person.guest_id : person.id;

  // Si esta estancia ya se factura por otra vía (p. ej. recibos mensuales),
  // no generar facturas diarias para no duplicar el cobro.
  const [nonDaily] = await pool.query(
    `SELECT id FROM pagos WHERE ${ownerCond} = ? AND tipo != 'diaria' AND estado != 'anulado' AND fecha_vencimiento >= ? LIMIT 1`,
    [ownerParam, person.fecha_entrada]
  );
  if (nonDaily.length > 0) return false;

  // Última factura diaria de la estancia actual (vencimiento >= fecha de entrada)
  const [lastDaily] = await pool.query(
    `SELECT periodo, fecha_vencimiento FROM pagos
     WHERE ${ownerCond} = ? AND tipo = 'diaria' AND estado != 'anulado' AND fecha_vencimiento >= ?
     ORDER BY fecha_vencimiento DESC LIMIT 1`,
    [ownerParam, person.fecha_entrada]
  );

  const entrada = new Date(person.fecha_entrada);
  entrada.setHours(0, 0, 0, 0);

  // Primer día sin facturar: el día siguiente al último día ya facturado.
  // Se deduce del vencimiento (salida + 5 días) y/o del final del periodo.
  let start = entrada;
  if (lastDaily.length > 0) {
    const candidates = [];
    const venc = new Date(lastDaily[0].fecha_vencimiento);
    if (!isNaN(venc.getTime())) {
      const viaVenc = new Date(venc.getTime() - 5 * 24 * 60 * 60 * 1000);
      viaVenc.setHours(0, 0, 0, 0);
      candidates.push(viaVenc.getTime());
    }
    const pm = String(lastDaily[0].periodo || '').match(/[–-]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (pm) {
      const viaPeriodo = new Date(parseInt(pm[3]), parseInt(pm[2]) - 1, parseInt(pm[1]));
      if (!isNaN(viaPeriodo.getTime())) candidates.push(viaPeriodo.getTime());
    }
    if (candidates.length > 0) {
      const billedEnd = new Date(Math.max(...candidates));
      billedEnd.setHours(0, 0, 0, 0);
      billedEnd.setDate(billedEnd.getDate() + 1);
      start = billedEnd;
    }
  }

  // Fin de la ventana de facturación: fecha límite o fin de mes si no la hay.
  let windowEnd;
  if (person.fecha_salida_prevista) {
    windowEnd = new Date(person.fecha_salida_prevista);
    windowEnd.setHours(0, 0, 0, 0);
  } else {
    const now = new Date();
    windowEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  if (start > windowEnd) return false;

  const importe = dailyAmount(start, windowEnd, person.cuota_mensual);
  const periodo = dailyPeriodo(start, windowEnd);

  const [existing] = await pool.query(
    `SELECT id FROM pagos WHERE ${ownerCond} = ? AND periodo = ? AND estado != 'anulado' LIMIT 1`,
    [ownerParam, periodo]
  );
  if (existing.length > 0) return false;

  const vencimiento = new Date(windowEnd.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await pool.query(
    "INSERT INTO pagos (student_id, guest_id, tipo, periodo, importe, fecha_vencimiento) VALUES (?, ?, 'diaria', ?, ?, ?)",
    [person.guest_id ? null : person.id, person.guest_id || null, periodo, importe, vencimiento]
  );
  console.log(`[Cron] Pago diario generado — ${person.guest_id ? 'guest' : 'student'} ${ownerParam}: ${periodo} (${importe} €)`);
  return true;
}

async function autoGeneratePayments() {
  const [students] = await pool.query(
    `SELECT id, fecha_entrada, fecha_salida_prevista, cuota_mensual, facturar_cada, tipo_tarifa
     FROM students
     WHERE estado IN ('activo','pendiente_salida') AND cuota_mensual > 0`
  );

  const [guests] = await pool.query(
    `SELECT id, fecha_entrada, fecha_salida_prevista, cuota_mensual, facturar_cada, tipo_tarifa
     FROM guests
     WHERE estado IN ('activo','pendiente_salida') AND cuota_mensual > 0`
  );

  for (const person of [...students, ...guests.map((g) => ({ ...g, guest_id: g.id }))]) {
    // Tarifa diaria: una única factura = días de estancia × precio diario
    if (person.tipo_tarifa === 'diaria') {
      await generateDailyInvoice(person);
      continue;
    }

    const interval = parseInt(person.facturar_cada);
    // Facturación semanal/puntual no genera recibos mensuales automáticos
    if (!interval || interval <= 0) continue;
    const now = new Date();
    const firstOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Encontrar el último pago existente
    const lastOwnerSql = person.guest_id
      ? `SELECT fecha_vencimiento FROM pagos WHERE guest_id = ? AND estado != 'anulado' ORDER BY fecha_vencimiento DESC LIMIT 1`
      : `SELECT fecha_vencimiento FROM pagos WHERE student_id = ? AND estado != 'anulado' ORDER BY fecha_vencimiento DESC LIMIT 1`;
    const lastOwnerParam = person.guest_id ? person.guest_id : person.id;
    const [lastPayment] = await pool.query(lastOwnerSql, [lastOwnerParam]);

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
    if (person.fecha_salida_prevista) {
      targetEnd = new Date(person.fecha_salida_prevista);
      targetEnd.setDate(1);
    } else {
      // Ventana móvil de 10 meses desde el mes actual
      targetEnd = new Date(now.getFullYear(), now.getMonth() + 9, 1);
    }

    if (current > targetEnd) continue;

    while (current <= targetEnd) {
      await generateOnePayment(person, person.cuota_mensual, current);
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
