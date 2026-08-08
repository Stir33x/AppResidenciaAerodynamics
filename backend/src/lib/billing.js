const DAY_MS = 24 * 60 * 60 * 1000;

// Nº de días de estancia (incluye día de entrada y salida)
function daysBetween(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  const diff = Math.round((e - s) / DAY_MS);
  return diff >= 0 ? diff + 1 : 0;
}

// Importe de la factura de tarifa diaria: días × precio diario
function dailyAmount(fechaEntrada, fechaSalida, dailyPrice) {
  return daysBetween(fechaEntrada, fechaSalida) * parseFloat(dailyPrice);
}

// Etiqueta de período para una estancia diaria (ej. "01/08/2026 – 10/08/2026")
function dailyPeriodo(fechaEntrada, fechaSalida) {
  const f = (d) => new Date(d).toLocaleDateString('es-ES');
  return `${f(fechaEntrada)} – ${f(fechaSalida)}`;
}

module.exports = { daysBetween, dailyAmount, dailyPeriodo };
