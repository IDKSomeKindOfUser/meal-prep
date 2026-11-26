import { planMenu, type Menu, type Missing } from '../planner'
import { makeCatalog, type PriceOverrides } from './catalog'
import type { Own } from './own'
import type { Settings } from '../planner/types'

export interface PlanRequest { settings: Settings; seed: number; prices: PriceOverrides; own: Own }
export type PlanAnswer = { ok: true; menu: Menu } | { ok: false; missing: Missing[] }

self.onmessage = ({ data }: MessageEvent<PlanRequest>) => {
  const result = planMenu(data.settings, makeCatalog(data.prices, data.own), data.seed)
  const answer: PlanAnswer = result.ok ? { ok: true, menu: result.menu } : result
  self.postMessage(answer)
}
