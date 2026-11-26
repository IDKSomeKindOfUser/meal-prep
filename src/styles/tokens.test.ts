import { describe, expect, it } from 'vitest'
import css from './tokens.css?raw'

type Colors = Record<string, string>

function block(selector: string): Colors {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`Нет блока ${selector}`)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+): (#[0-9a-f]{6});/g)].map((m) => [m[1]!, m[2]!]))
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const c = parseInt(hex.slice(at, at + 2), 16) / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const TEXT = [
  ...['ink', 'muted', 'accent', 'danger'].flatMap((t) => [[t, 'ground'], [t, 'surface']]),
  ...['accent', 'selected', 'breakfast', 'lunch', 'dinner', 'snack'].map((f) => [`on-${f}`, f]),
] as [string, string][]

const light = block(':root')
const dark = block(":root[data-theme='dark']")

describe.each([
  ['светлая', light],
  ['тёмная', dark],
])('%s тема', (_, colors) => {
  it.each(TEXT)('текст %s на %s не ниже 4,5:1', (text, ground) => {
    expect(contrast(colors[text]!, colors[ground]!)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(['ground', 'surface'])('граница поля на %s не ниже 3:1', (ground) => {
    expect(contrast(colors['control']!, colors[ground]!)).toBeGreaterThanOrEqual(3)
  })
})

it('тёмный набор одинаков для системы и ручного выбора', () => {
  expect(block(":root:not([data-theme='light'])")).toEqual(dark)
  expect(Object.keys(dark)).toEqual(Object.keys(light))
})
