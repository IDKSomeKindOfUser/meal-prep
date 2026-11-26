import { EMPTY_FORM } from './form'
import { parseState, type SavedState } from './storage'

/** What is known about synchronisation, saved together with the data. */
export interface SyncMarks {
  /** The account the data belongs to. */
  owner?: string
  /** When every entry was last changed, in milliseconds. */
  stamps: Record<string, number>
  /** Entries the cloud has not received yet. */
  dirty: string[]
}
/** The synchronised unit. A `null` value means it was deleted. */
export interface Row { key: string; value: unknown; changed_at: number }

const NO_MARKS: SyncMarks = { stamps: {}, dirty: [] }
const marks = (state: SavedState) => state.sync ?? NO_MARKS
const same = (a: unknown, b: unknown) => a === b || JSON.stringify(a) === JSON.stringify(b)

type Data = Pick<SavedState, 'form' | 'plan' | 'prices' | 'own'>
function entriesOf({ form, plan, prices, own }: Data): Map<string, unknown> {
  const entries = new Map<string, unknown>([['form', form]])
  if (plan) entries.set('plan', plan)
  for (const [id, p] of Object.entries(prices)) entries.set(`price:${id}`, p)
  for (const p of own.products) entries.set(`product:${p.id}`, p)
  for (const r of own.recipes) entries.set(`recipe:${r.id}`, r)
  return entries
}
const under = (entries: Map<string, unknown>, prefix: string) =>
  [...entries].filter(([key]) => key.startsWith(prefix)).map(([key, value]) => [key.slice(prefix.length), value] as const)

/** Marks what differs between two states as changed now. */
export function stamp(before: SavedState, after: SavedState, now: number): SavedState {
  if (before === after) return after
  const was = entriesOf(before)
  const is = entriesOf(after)
  const changed = [...new Set([...was.keys(), ...is.keys()])].filter((key) => !same(was.get(key), is.get(key)))
  if (changed.length === 0) return after
  const { stamps, dirty, ...rest } = marks(before)
  // An edit of a known version is newer than it, even when the clock is behind.
  const at = (key: string) => Math.max(now, (stamps[key] ?? 0) + 1)
  return { ...after, sync: { ...rest, stamps: { ...stamps, ...Object.fromEntries(changed.map((k) => [k, at(k)])) }, dirty: [...new Set([...dirty, ...changed])] } }
}

/** Ties the data to an account. `null` when it belongs to another one. */
export function claim(state: SavedState, owner: string): SavedState | null {
  const sync = marks(state)
  if (sync.owner !== undefined) return sync.owner === owner ? state : null
  // Data saved before synchronisation existed: the oldest possible, so the cloud wins.
  const old = [...entriesOf(state)].filter(([key, value]) => !(key in sync.stamps) && !(key === 'form' && same(value, EMPTY_FORM))).map(([key]) => key)
  return { ...state, sync: { owner, stamps: { ...sync.stamps, ...Object.fromEntries(old.map((k) => [k, 1])) }, dirty: [...new Set([...sync.dirty, ...old])] } }
}

export const pending = (state: SavedState) => marks(state).dirty.length > 0

export function outgoing(state: SavedState): Row[] {
  const entries = entriesOf(state)
  const { stamps, dirty } = marks(state)
  return dirty.map((key) => ({ key, value: entries.get(key) ?? null, changed_at: stamps[key] ?? 1 }))
}

/** Takes over everything the cloud answered, except what was edited after sending. */
export function adopt(state: SavedState, sent: Row[], rows: Row[]): SavedState {
  const sync = marks(state)
  const sentAt = new Map(sent.map((r) => [r.key, r.changed_at]))
  const dirty = sync.dirty.filter((key) => sentAt.get(key) !== sync.stamps[key])
  const stamps = { ...sync.stamps }
  const entries = entriesOf(state)
  let changed = false
  for (const { key, value, changed_at } of rows) {
    if (dirty.includes(key) || (stamps[key] === changed_at && !sentAt.has(key))) continue
    stamps[key] = changed_at
    if (same(entries.get(key) ?? null, value)) continue
    changed = true
    if (value === null) entries.delete(key)
    else entries.set(key, value)
  }
  const result = { ...state, sync: { ...sync, stamps, dirty } }
  if (!changed) return same(sync, result.sync) ? state : result
  return parseState(JSON.stringify({
    ...result, form: entries.get('form'), plan: entries.get('plan') ?? null, prices: Object.fromEntries(under(entries, 'price:')),
    own: { products: under(entries, 'product:').map(([, v]) => v), recipes: under(entries, 'recipe:').map(([, v]) => v) },
  }))
}

/** Reads saved marks and forgets entries that had to be dropped, so that they are fetched again and not deleted from the cloud. */
export function parseSync(saved: unknown, raw: unknown, parsed: SavedState): SyncMarks | undefined {
  const sync = saved as Partial<SyncMarks> | null | undefined
  if (typeof sync !== 'object' || sync === null || typeof sync.stamps !== 'object' || sync.stamps === null || !Array.isArray(sync.dirty)) return undefined
  if (sync.owner !== undefined && typeof sync.owner !== 'string') return undefined
  let before: Iterable<string> = []
  try {
    before = entriesOf(raw as Data).keys()
  } catch {
    // Unreadable data: trust nothing.
    return sync.owner === undefined ? undefined : { owner: sync.owner, stamps: {}, dirty: [] }
  }
  const kept = entriesOf(parsed)
  const lost = new Set([...before].filter((key) => !kept.has(key)))
  const stamps = Object.fromEntries(Object.entries(sync.stamps).filter(([key, at]) => Number.isSafeInteger(at) && !lost.has(key)))
  return { ...(sync.owner === undefined ? {} : { owner: sync.owner }), stamps, dirty: sync.dirty.filter((key) => typeof key === 'string' && key in stamps) }
}
