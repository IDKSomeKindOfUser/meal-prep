export interface Profile {
  sex: 'male' | 'female'
  age: number
  heightCm: number
  weightKg: number
  activity: 'low' | 'light' | 'medium' | 'high' | 'veryHigh'
  goal: 'lose' | 'keep' | 'gain'
}

const ACTIVITY = { low: 1.2, light: 1.375, medium: 1.55, high: 1.725, veryHigh: 1.9 }
const GOAL = { lose: 0.85, keep: 1, gain: 1.1 }
const PROTEIN_PER_KG = { lose: 1.8, keep: 1.4, gain: 1.6 }
const FLOOR = { male: 1500, female: 1200 }

function check(name: string, value: number, min: number, max: number) {
  if (!(value >= min && value <= max)) throw new RangeError(`${name} must be from ${min} to ${max}`)
}

/** Mifflin-St Jeor. A reference estimate for adults, not medical advice. */
export function dailyNorm(p: Profile): { kcal: number; protein: number } {
  check('age', p.age, 18, 100)
  check('heightCm', p.heightCm, 120, 230)
  check('weightKg', p.weightKg, 35, 250)
  const bmr = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161)
  const kcal = Math.max(FLOOR[p.sex], bmr * ACTIVITY[p.activity] * GOAL[p.goal])
  return { kcal: Math.round(kcal / 10) * 10, protein: Math.round(p.weightKg * PROTEIN_PER_KG[p.goal]) }
}
