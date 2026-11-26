import { expect, test } from 'vitest'
import { dailyNorm, type Profile } from './norm'

const man: Profile = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'light', goal: 'keep' }

// Worked by hand with Mifflin-St Jeor: 800 + 1125 - 150 + 5 = 1780; * 1.375 = 2447.5.
test('a man keeping his weight', () => {
  expect(dailyNorm(man)).toEqual({ kcal: 2450, protein: 112 })
})
// 600 + 1031.25 - 150 - 161 = 1320.25; * 1.375 = 1815.3; * 0.85 = 1543.
test('a woman losing weight', () => {
  expect(dailyNorm({ ...man, sex: 'female', heightCm: 165, weightKg: 60, goal: 'lose' }))
    .toEqual({ kcal: 1540, protein: 108 })
})
test('gaining adds ten percent', () => {
  expect(dailyNorm({ ...man, goal: 'gain' })).toEqual({ kcal: 2690, protein: 128 })
})
test('the result never drops below a safe floor', () => {
  const small: Profile = { ...man, age: 70, heightCm: 150, weightKg: 45, activity: 'low', goal: 'lose' }
  expect(dailyNorm(small).kcal).toBe(1500)
  expect(dailyNorm({ ...small, sex: 'female' }).kcal).toBe(1200)
})
test('a child or an impossible number is refused', () => {
  expect(() => dailyNorm({ ...man, age: 15 })).toThrow(RangeError)
  expect(() => dailyNorm({ ...man, weightKg: NaN })).toThrow(RangeError)
})
