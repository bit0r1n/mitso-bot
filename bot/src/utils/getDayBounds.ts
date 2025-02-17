export interface IDayBounds {
  start: Date
  end: Date
}

export function getDayBounds(moment = new Date()): IDayBounds {

  const start = new Date(Date.UTC(moment.getFullYear(), moment.getMonth(), moment.getDate(), 0, 0, 0, 0))
  const end = new Date(Date.UTC(moment.getFullYear(), moment.getMonth(), moment.getDate(), 23, 59, 59, 999))

  return { start, end }
}