import { expect, test } from 'vitest'
import { recipes } from '../data'
import { blocks, frozenDays, storable } from './schedule'

const spans = (times: 1 | 2 | 3 | 7, weeks: 1 | 4 = 1) =>
  blocks(times, weeks).map((b) => [b.cookDay, b.firstDay, b.days])

test('cooking twice a week covers three and four days', () => {
  expect(spans(2)).toEqual([[0, 0, 4], [4, 4, 3]])
})
test('cooking three times a week', () => {
  expect(spans(3)).toEqual([[0, 0, 3], [3, 3, 2], [5, 5, 2]])
})
test('cooking once a week makes two sets of dishes on the same day', () => {
  expect(spans(1)).toEqual([[0, 0, 4], [0, 4, 3]])
})
test('cooking every day', () => {
  expect(spans(7)).toHaveLength(7)
})
test('a month covers 28 days without gaps', () => {
  for (const times of [1, 2, 3, 7] as const)
    expect(blocks(times, 4).flatMap((b) => Array.from({ length: b.days }, (_, i) => b.firstDay + i)))
      .toEqual(Array.from({ length: 28 }, (_, i) => i))
})

const keeps = (keepDays: number, freezable = false) => ({ ...recipes[0]!, keepDays, freezable })

test('a dish that keeps 3 days covers the cooking day and two more', () => {
  const block = { cookDay: 0, firstDay: 0, days: 3, week: 0 }
  expect(storable(keeps(3), block)).toBe(true)
  expect(storable(keeps(2), block)).toBe(false)
})
test('a freezable dish lasts, and late portions are frozen', () => {
  const block = { cookDay: 0, firstDay: 0, days: 4, week: 0 }
  expect(storable(keeps(2, true), block)).toBe(true)
  expect(frozenDays(keeps(2, true), block)).toEqual([2, 3])
  expect(frozenDays(keeps(4, true), block)).toEqual([])
})
test('storage counts from the cooking day, not from the first meal', () => {
  const late = { cookDay: 0, firstDay: 4, days: 3, week: 0 }
  expect(storable(keeps(4), late)).toBe(false)
  expect(storable(keeps(7), late)).toBe(true)
  expect(frozenDays(keeps(4, true), late)).toEqual([4, 5, 6])
})
