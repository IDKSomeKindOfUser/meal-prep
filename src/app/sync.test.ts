import { PGlite } from '@electric-sql/pglite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import schema from '../../supabase/schema.sql?raw'
import { defaultCatalog, planMenu } from '../planner'
import { EMPTY_FORM, readForm } from './form'
import { EMPTY_STATE, parseState, type SavedPlan, type SavedState } from './storage'
import { adopt, claim, outgoing, pending, stamp, tooBig, type Row } from './sync'

const A = '00000000-0000-0000-0000-00000000000a'
const B = '00000000-0000-0000-0000-00000000000b'
let db: PGlite
beforeAll(async () => {
  db = new PGlite()
  // What Supabase has out of the box, including its wide default grants.
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create table auth.users (id uuid primary key);
    insert into auth.users values ('${A}'), ('${B}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
    alter default privileges in schema public grant all on functions to anon, authenticated;`)
  await db.exec(schema)
  await db.exec(schema)
}, 60_000)
beforeEach(() => db.exec('truncate public.entries'))

const as = (role: 'anon' | 'authenticated', uid: string, sql: string, params: unknown[] = []) => db.transaction(async (tx) => {
  await tx.exec(`set local role ${role}; set local test.uid = '${uid}'`)
  return (await tx.query<Record<string, unknown>>(sql, params)).rows
})
const answer = async (uid: string, changes: Row[], since = 0) =>
  (await as('authenticated', uid, 'select public.sync_entries($1::json, $2) as r', [JSON.stringify(changes), since]))[0]!.r as { rows: Row[]; seen: number }
const call = async (uid: string, changes: Row[], since = 0) => (await answer(uid, changes, since)).rows
async function sync(state: SavedState, uid = A): Promise<SavedState> {
  const claimed = claim(state, uid)
  if (!claimed) throw new Error('other account')
  const sent = outgoing(claimed)
  const { rows, seen } = await answer(uid, sent, claimed.sync?.seen)
  return adopt(claimed, sent, rows, seen)
}
const price = (n: number) => ({ rice: { price: n, grams: 900 } })
const edit = (s: SavedState, change: Partial<SavedState>, at: number) => stamp(s, { ...s, ...change }, at)

const form = { ...EMPTY_FORM, normBy: 'manual' as const, kcal: '2000', protein: '100' }
const read = readForm(form)
if (!read.ok) throw new Error('bad form')
const made = planMenu(read.settings, defaultCatalog, 1)
if (!made.ok) throw new Error('no menu')
const plan: SavedPlan = { settings: read.settings, menu: made.menu, seed: 1, start: '2026-11-25' }

describe('two devices', () => {
  it('an edit on one appears on the other, with the order of fields kept', async () => {
    const one = await sync(edit(EMPTY_STATE, { form, plan, prices: price(99) }, 1000))
    expect(pending(one)).toBe(false)
    const two = await sync(EMPTY_STATE)
    expect(JSON.stringify([two.form, two.plan, two.prices])).toBe(JSON.stringify([form, plan, price(99)]))
  })
  it('the newer edit wins, whichever was sent last', async () => {
    let one = await sync(edit(EMPTY_STATE, { prices: price(1) }, 1000))
    let two = await sync(EMPTY_STATE)
    two = edit(two, { prices: price(3) }, 3000)
    one = edit(one, { prices: price(2) }, 2000)
    two = await sync(two)
    one = await sync(one)
    expect([one.prices, two.prices]).toEqual([price(3), price(3)])
  })
  it('edits of different things are all kept', async () => {
    let one = await sync(EMPTY_STATE)
    let two = await sync(EMPTY_STATE)
    one = await sync(edit(one, { prices: price(1) }, 1000))
    two = await sync(edit(two, { prices: { buckw: { price: 5, grams: 800 } }, form }, 2000))
    one = await sync(one)
    expect(two.prices).toEqual({ ...price(1), buckw: { price: 5, grams: 800 } })
    expect(one).toMatchObject({ prices: two.prices, form })
  })
  it('a removal reaches the other device', async () => {
    let one = await sync(edit(EMPTY_STATE, { prices: price(1) }, 1000))
    const two = await sync(EMPTY_STATE)
    one = await sync(edit(one, { prices: {} }, 2000))
    expect((await sync(two)).prices).toEqual({})
    expect(one.prices).toEqual({})
  })
  it('an edit made offline survives a restart and is sent later', async () => {
    const one = edit(await sync(EMPTY_STATE), { prices: price(7) }, 1000)
    const restarted = parseState(JSON.stringify(one))
    expect(pending(restarted)).toBe(true)
    await sync(restarted)
    expect((await sync(EMPTY_STATE)).prices).toEqual(price(7))
  })
  it('an edit made while the answer was on the way is kept', async () => {
    const one = claim(edit(EMPTY_STATE, { prices: price(1) }, 1000), A)!
    const sent = outgoing(one)
    const rows = await call(A, sent)
    const after = adopt(edit(one, { prices: price(2) }, 900), sent, rows)
    expect(after.prices).toEqual(price(2))
    await sync(after)
    expect((await sync(EMPTY_STATE)).prices).toEqual(price(2))
  })
  it('a fast clock does not block later edits', async () => {
    const one = await sync(edit(EMPTY_STATE, { prices: price(1) }, Date.now() + 1e9))
    const two = await sync(EMPTY_STATE)
    await new Promise((r) => setTimeout(r, 5))
    await sync(edit(two, { prices: price(2) }, Date.now()))
    expect((await sync(one)).prices).toEqual(price(2))
  })
})

describe('cloud limits', () => {
  it('an entry the cloud would refuse stays here, and the rest are sent', async () => {
    const huge = { price: 1, grams: 1, note: 'ы'.repeat(100_001) }
    const one = await sync(edit(EMPTY_STATE, { prices: { ...price(1), buckw: huge, 'bad key': price(2).rice } }, 1000))
    expect(tooBig(one)).toEqual(['price:buckw', 'price:bad key'])
    expect(pending(one)).toBe(true)
    expect((await sync(EMPTY_STATE)).prices).toEqual(price(1))
  })
})

describe('polling', () => {
  it('asks only for rows changed since the last answer', async () => {
    await sync(edit(EMPTY_STATE, { prices: price(1) }, 1000))
    const two = await sync(EMPTY_STATE)
    // As if the first row was written long ago.
    await db.exec('update public.entries set synced_at = 1')
    await call(A, [{ key: 'form', value: form, changed_at: 2000 }])
    expect((await call(A, [], two.sync!.seen)).map((r) => r.key)).toEqual(['form'])
    expect(await sync(two)).toMatchObject({ form, prices: price(1) })
  })
  it('returns the stored row of a refused change, however old', async () => {
    await call(A, [{ key: 'price:rice', value: price(5).rice, changed_at: 5000 }])
    await db.exec('update public.entries set synced_at = 1')
    expect(await call(A, [{ key: 'price:rice', value: price(4).rice, changed_at: 4000 }], 1e15)).toEqual([{ key: 'price:rice', value: price(5).rice, changed_at: 5000 }])
  })
  it('a dropped entry is fetched again', async () => {
    const one = await sync(edit(EMPTY_STATE, { form, plan }, 1000))
    const broken = structuredClone(one)
    broken.plan!.menu[0]!.lunch = 'gone'
    expect(parseState(JSON.stringify(broken)).sync?.seen).toBeUndefined()
    expect(parseState(JSON.stringify(one)).sync?.seen).toBe(one.sync!.seen)
  })
})

describe('first sign-in', () => {
  it('sends what was saved before synchronisation existed', async () => {
    await sync({ ...EMPTY_STATE, form, plan })
    expect(await sync(EMPTY_STATE)).toMatchObject({ form, plan })
  })
  it('does not overwrite the cloud with old unstamped data or an untouched form', async () => {
    await sync(edit(EMPTY_STATE, { form, prices: price(5) }, 1000))
    expect(await sync({ ...EMPTY_STATE, prices: price(1) })).toMatchObject({ form, prices: price(5) })
  })
  it('does not mix data of two accounts', async () => {
    const one = await sync(edit(EMPTY_STATE, { prices: price(5) }, 1000))
    expect(claim(one, B)).toBeNull()
    expect(claim(one, A)).not.toBeNull()
  })
})

describe('data this version cannot use', () => {
  it('is not deleted from the cloud', async () => {
    const one = await sync(edit(EMPTY_STATE, { form, plan }, 1000))
    const broken = structuredClone(one)
    broken.plan!.menu[0]!.lunch = 'gone'
    const reopened = parseState(JSON.stringify(broken))
    expect(reopened.plan).toBeNull()
    expect((await sync(reopened)).plan).toEqual(plan)
  })
  it('an unsent broken entry is not sent as a removal', async () => {
    const one = await sync(edit(EMPTY_STATE, { prices: price(5) }, 1000))
    const broken = edit(one, { prices: { rice: { price: -1, grams: 1 } } }, 2000)
    expect(outgoing(parseState(JSON.stringify(broken)))).toEqual([])
  })
  it('broken synchronisation marks are dropped', () => {
    for (const sync of [5, null, { stamps: 'x', dirty: 1 }, { owner: 3, stamps: { form: 'a' }, dirty: [4] }])
      expect(() => outgoing(parseState(JSON.stringify({ ...EMPTY_STATE, sync })))).not.toThrow()
  })
})

describe('access', () => {
  beforeEach(() => call(A, [{ key: 'price:rice', value: { price: 1, grams: 1 }, changed_at: 1 }]))
  it('nothing is available without signing in', async () => {
    for (const sql of ['select * from public.entries', "select public.sync_entries('[]')", "insert into public.entries (key, changed_at) values ('form', 1)", 'delete from public.entries'])
      await expect(as('anon', '', sql)).rejects.toThrow(/permission denied/)
  })
  it('another user sees and changes nothing', async () => {
    expect(await call(B, [])).toEqual([])
    expect(await as('authenticated', B, 'select * from public.entries')).toEqual([])
    expect(await as('authenticated', B, 'update public.entries set changed_at = 9 returning key')).toEqual([])
    await expect(as('authenticated', B, `insert into public.entries (user_id, key, changed_at) values ('${A}', 'form', 1)`)).rejects.toThrow(/row-level security/)
    await expect(as('authenticated', B, 'delete from public.entries')).rejects.toThrow(/permission denied/)
    expect(await call(A, [])).toHaveLength(1)
  })
  it('a user cannot hand rows over to another', async () => {
    await expect(as('authenticated', A, `update public.entries set user_id = '${B}'`)).rejects.toThrow(/row-level security/)
  })
  it('unknown keys are refused', async () => {
    await expect(call(A, [{ key: 'x', value: 1, changed_at: 1 }])).rejects.toThrow(/check constraint/)
  })
})
