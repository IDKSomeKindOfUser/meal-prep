import { planMenu, type Menu, type Missing } from '../planner'
import { makeCatalog, type PriceOverrides } from './catalog'
import type { Own } from './own'
import type { Settings } from '../planner/types'

/** `previous`: the menu being rebuilt, so that the new one changes every cooking; `onlyCookDay`: only that cooking changes. */
export interface PlanRequest { settings: Settings; seed: number; prices: PriceOverrides; own: Own; previous?: Menu; onlyCookDay?: number }
export type PlanAnswer = { ok: true; menu: Menu } | { ok: false; missing: Missing[] }

self.onmessage = ({ data }: MessageEvent<PlanRequest>) => {
  const result = planMenu(data.settings, makeCatalog(data.prices, data.own), data.seed, data.previous, undefined, data.onlyCookDay)
  const answer: PlanAnswer = result.ok ? { ok: true, menu: result.menu } : result
  self.postMessage(answer)
}
