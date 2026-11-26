import type { Prefer } from '../planner/prefer'
import { violations } from '../planner/constraints'
import type { Catalog, Settings } from '../planner/types'
import type { Form } from './form'

/** Answers of the short questions before a rebuild. `keep` leaves the setting as it is. */
export interface Answers extends Prefer {
  effort: 'keep' | 'simple' | 'any'
  dairy: 'keep' | 'none'
}

/** The quickest dishes when simple ones are asked for, in minutes. */
export const SIMPLE_MINUTES = 30

export function answersFrom(prefer: Prefer | undefined): Answers {
  return { meats: [...(prefer?.meats ?? [])], kinds: [...(prefer?.kinds ?? [])], effort: 'keep', dairy: 'keep' }
}

/** `undefined` when there is no wish, so plans without wishes stay as they were saved. */
export function preferOf(a: Prefer): Prefer | undefined {
  return a.meats.length === 0 && a.kinds.length === 0 ? undefined : { meats: [...a.meats], kinds: [...a.kinds] }
}

const minutes = (a: Answers, now: number | null) => (a.effort === 'simple' ? SIMPLE_MINUTES : a.effort === 'any' ? null : now)
const allergens = <T extends string>(a: Answers, now: T[]) =>
  a.dairy === 'none' && !now.includes('milk' as T) ? [...now, 'milk' as T] : now

/** Answers never lift a ban: "without dairy" only adds one, the settings screen removes it. */
export function applyToSettings(settings: Settings, a: Answers): Settings {
  const { prefer: _, ...rest } = settings
  const prefer = preferOf(a)
  return {
    ...rest, maxMinutes: minutes(a, settings.maxMinutes), allergens: allergens(a, settings.allergens),
    ...(prefer && { prefer }),
  }
}

export function applyToForm(form: Form, a: Answers): Form {
  const now = form.maxMinutes === '' ? null : Number(form.maxMinutes)
  const next = minutes(a, now)
  return {
    ...form, maxMinutes: next === null ? '' : String(next), allergens: allergens(a, form.allergens),
    prefer: { meats: [...a.meats], kinds: [...a.kinds] },
  }
}

/** "Without dairy" only makes sense when some breakfast still fits: the book may have none. */
export function canDropMilk(settings: Settings, catalog: Catalog): boolean {
  const limits = { ...settings, allergens: [...settings.allergens, 'milk' as const] }
  return catalog.recipes.some((r) => r.type === 'breakfast' && violations(r, limits, catalog.ingredient).length === 0)
}
