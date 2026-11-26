/** Calendar days as `YYYY-MM-DD`. Arithmetic goes through UTC, so clock changes do not shift it. */
const DAY = 86_400_000
const utc = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const fromUtc = (ms: number) => new Date(ms).toISOString().slice(0, 10)

export function toIso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
export function isIsoDate(text: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(utc(text)) && fromUtc(utc(text)) === text
}
export const addDays = (iso: string, days: number) => fromUtc(utc(iso) + days * DAY)
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / DAY)

export type PlanDay = { state: 'before' | 'now' | 'ended'; day: number }
/** Where `today` is in a plan. Outside the plan it gives the closest day. */
export function dayOfPlan(start: string, length: number, today: string): PlanDay {
  const day = daysBetween(start, today)
  if (day < 0) return { state: 'before', day: 0 }
  return day < length ? { state: 'now', day } : { state: 'ended', day: length - 1 }
}

const format = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' })
  return (iso: string) => f.format(utc(iso))
}
export const weekdayShort = format({ weekday: 'short' })
export const weekday = format({ weekday: 'long' })
export const dayMonth = format({ day: 'numeric', month: 'long' })
export const dayNumber = format({ day: 'numeric' })
