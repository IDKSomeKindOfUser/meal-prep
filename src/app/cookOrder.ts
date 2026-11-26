/** Tools that cook on their own, in order of priority. The stove is the fallback. */
const MAIN = ['духовка', 'аэрогриль'] as const
const NO_COOK = 'без готовки'

interface Cookable {
  minutes: number
  tools: string[]
}

export interface CookStep<T> {
  item: T
  tool: string
  /** Minutes from the start of cooking. */
  start: number
}

/**
 * Order of cooking for one day. Each tool cooks its dishes one by one, the longest first,
 * and the tools work at the same time. No-cook dishes are done while something cooks.
 */
export function cookOrder<T extends Cookable>(items: T[]) {
  const meanwhile = items.filter((i) => i.tools.includes(NO_COOK))
  const free = new Map<string, number>()
  const steps: CookStep<T>[] = []
  for (const item of [...items].filter((i) => !meanwhile.includes(i)).sort((a, b) => b.minutes - a.minutes)) {
    const tool = MAIN.find((t) => item.tools.includes(t)) ?? 'плита'
    const start = free.get(tool) ?? 0
    free.set(tool, start + item.minutes)
    steps.push({ item, tool, start })
  }
  steps.sort((a, b) => a.start - b.start || b.item.minutes - a.item.minutes)
  const handsOnly = meanwhile.reduce((sum, i) => sum + i.minutes, 0)
  return { steps, meanwhile, minutes: Math.max(handsOnly, ...free.values()) }
}
