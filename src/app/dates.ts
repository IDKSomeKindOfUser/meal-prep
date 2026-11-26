import type { Slot } from '../planner/types'

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

/** The meal people usually eat at this hour. Late at night and before 5 there is none. */
export function mealNow(hour: number): Slot | null {
  if (hour < 5 || hour >= 22) return null
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  return hour < 18 ? 'snack' : 'dinner'
}

export function greeting(hour: number): string {
  if (hour < 5 || hour >= 23) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  return hour < 18 ? 'Добрый день' : 'Добрый вечер'
}

/** Usual meal hours, in the order of the day. */
const MEAL_HOURS: [Slot, number][] = [['breakfast', 8], ['lunch', 13], ['snack', 16], ['dinner', 19]]

/** The first meal that has not started yet today, or null after dinner. */
export function nextMeal(hour: number): { slot: Slot; time: string } | null {
  const next = MEAL_HOURS.find(([, h]) => h > hour)
  return next ? { slot: next[0], time: `${next[1]}:00` } : null
}

const format = (options: Intl.DateTimeFormatOptions) => {
  const f = new Intl.DateTimeFormat('ru-RU', { ...options, timeZone: 'UTC' })
  return (iso: string) => f.format(utc(iso))
}
export const weekdayShort = format({ weekday: 'short' })
export const weekday = format({ weekday: 'long' })
export const dayMonth = format({ day: 'numeric', month: 'long' })
export const dayNumber = format({ day: 'numeric' })
