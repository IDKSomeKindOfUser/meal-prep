import type { SavedPlan } from './storage'

/** The menu that "undo" brings back. After a replaced dish the purchases marked since then stay marked. */
export function undoPlan(current: SavedPlan | null, previous: SavedPlan, keepChecked: boolean): SavedPlan {
  if (!keepChecked) return previous
  const { checked: _, ...rest } = previous
  return current?.checked ? { ...rest, checked: current.checked } : rest
}

/** Changes when the menu itself changes, but not when purchases are marked. */
export const planKey = (plan: SavedPlan | null) => JSON.stringify(plan && { ...plan, checked: undefined })
