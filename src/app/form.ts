import type { Allergen, Lactose } from '../data/types'
import { dailyNorm, type Profile } from '../planner/norm'
import { TOOLS, type CookTimes, type Settings } from '../planner/types'

/** What is typed on the settings screen. Numbers stay text until the form is read. */
export interface Form {
  normBy: 'profile' | 'manual'
  sex: Profile['sex'] | ''
  age: string
  height: string
  weight: string
  activity: Profile['activity']
  goal: Profile['goal']
  kcal: string
  protein: string
  allergens: Allergen[]
  excluded: string[]
  spicy: boolean
  tools: string[]
  lactose: Lactose
  cookTimes: CookTimes
  weeks: 1 | 4
  maxMinutes: string
  budget: string
}

export const EMPTY_FORM: Form = {
  normBy: 'profile', sex: '', age: '', height: '', weight: '', activity: 'light', goal: 'keep',
  kcal: '', protein: '',
  allergens: [], excluded: [], spicy: true, tools: [...TOOLS], lactose: 'yes',
  cookTimes: 2, weeks: 1, maxMinutes: '', budget: '',
}

const NUMBERS = {
  age: { min: 18, max: 100, text: 'Возраст: целое число от 18 до 100 лет.' },
  height: { min: 120, max: 230, text: 'Рост: число от 120 до 230 см.' },
  weight: { min: 35, max: 250, text: 'Вес: число от 35 до 250 кг.' },
  kcal: { min: 1200, max: 4500, text: 'Калории: число от 1200 до 4500.' },
  protein: { min: 30, max: 350, text: 'Белок: число от 30 до 350 г.' },
  budget: { min: 500, max: 1_000_000, text: 'Бюджет: сумма от 500 ₽. Если предела нет, оставьте поле пустым.' },
}
type NumberField = keyof typeof NUMBERS
export type Errors = Partial<Record<NumberField | 'sex', string>>

/** Steps of the first-run questionnaire, in order. */
export const STEPS = ['norm', 'limits', 'cook', 'money'] as const
export type Step = (typeof STEPS)[number]
const STEP_OF: Record<keyof Errors, Step> = { sex: 'norm', age: 'norm', height: 'norm', weight: 'norm', kcal: 'norm', protein: 'norm', budget: 'money' }

/** The errors of the fields shown on one step. */
export function stepErrors(errors: Errors, step: Step): Errors {
  return Object.fromEntries(Object.entries(errors).filter(([key]) => STEP_OF[key as keyof Errors] === step))
}

function number(form: Form, field: NumberField): number | null {
  const text = form[field].replace(/\s/g, '').replace(',', '.')
  const { min, max } = NUMBERS[field]
  if (!/^\d+(\.\d+)?$/.test(text)) return null
  const value = Number(text)
  if (value < min || value > max || (field === 'age' && !Number.isInteger(value))) return null
  return value
}

/** `null` until the fields it needs are filled in. */
export function norm(form: Form): { kcal: number; protein: number } | null {
  if (form.normBy === 'manual') {
    const kcal = number(form, 'kcal')
    const protein = number(form, 'protein')
    return kcal === null || protein === null ? null : { kcal, protein }
  }
  const age = number(form, 'age')
  const heightCm = number(form, 'height')
  const weightKg = number(form, 'weight')
  if (form.sex === '' || age === null || heightCm === null || weightKg === null) return null
  return dailyNorm({ sex: form.sex, age, heightCm, weightKg, activity: form.activity, goal: form.goal })
}

export function readForm(form: Form): { ok: true; settings: Settings } | { ok: false; errors: Errors } {
  const errors: Errors = {}
  const required: NumberField[] = form.normBy === 'manual' ? ['kcal', 'protein'] : ['age', 'height', 'weight']
  if (form.normBy === 'profile' && form.sex === '') errors.sex = 'Выберите пол: от него зависит норма калорий.'
  for (const field of required) if (number(form, field) === null) errors[field] = NUMBERS[field].text
  const budget = number(form, 'budget')
  if (form.budget.trim() !== '' && budget === null) errors.budget = NUMBERS.budget.text
  const goal = norm(form)
  if (Object.keys(errors).length > 0 || goal === null) return { ok: false, errors }
  return {
    ok: true,
    settings: {
      ...goal, budget,
      allergens: form.allergens, excluded: form.excluded, spicy: form.spicy, tools: form.tools, lactose: form.lactose,
      weeks: form.weeks, cookTimes: form.cookTimes,
      maxMinutes: form.maxMinutes === '' ? null : Number(form.maxMinutes),
    },
  }
}
