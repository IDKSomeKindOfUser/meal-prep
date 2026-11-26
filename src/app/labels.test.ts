import { expect, test } from 'vitest'
import { getIngredient } from '../data'
import { amount, count, missingLines, rub, signed } from './labels'

test('missing dishes are explained once per meal', () => {
  const block = { week: 0, cookDay: 0, firstDay: 0, days: 4 }
  const one = { slot: 'breakfast' as const, block, helps: [{ limit: 'allergens' as const, recipes: 3 }] }
  expect(missingLines([one, one, { slot: 'lunch', block, helps: [] }])).toEqual([
    'Завтрак: ослабьте ограничение: аллергены.',
    'Обед: мешают несколько ограничений сразу, ослабьте хотя бы два.',
  ])
})

test('amounts use the units of the kitchen', () => {
  const of = (id: string, grams: number) => amount(getIngredient(id), grams).replace(/\s/g, ' ')
  expect(of('rice', 240)).toBe('240 г')
  expect(of('egg', 330)).toBe('6 шт. (330 г)')
  expect(of('lemon', 37.5)).toBe('3 дольки')
  expect(of('garlic', 25)).toBe('5 зубчиков')
})

test('differences have a sign', () => {
  expect(signed(12.4)).toBe('+12')
  expect(signed(-12.4)).toBe('−12')
  expect(signed(0.2)).toBe('0')
})

test('numbers are written in Russian', () => {
  expect(count(1, 'день', 'дня', 'дней')).toBe('1 день')
  expect(count(3, 'день', 'дня', 'дней')).toBe('3 дня')
  expect(count(11, 'день', 'дня', 'дней')).toBe('11 дней')
  expect(rub(6125.2)).toMatch(/^6\s126 ₽$/)
})
