export const DIAS = ['Lunes', 'Martes', 'Mi\u00e9rcoles', 'Jueves', 'Viernes', 'S\u00e1bado', 'Domingo']

export function esParaElDia(horario, dia) {
  return !horario.dia_semana || horario.dia_semana === dia
}

export function agruparPorDia(arr) {
  const grupos = {}
  DIAS.forEach((d) => { grupos[d] = {} })
  arr.forEach((h) => {
    if (h.dia_semana && !DIAS.includes(h.dia_semana)) return
    DIAS.forEach((dia) => {
      if (h.dia_semana && h.dia_semana !== dia) return
      if (!grupos[dia][h.tipo]) grupos[dia][h.tipo] = []
      grupos[dia][h.tipo].push(h)
    })
  })
  return grupos
}
