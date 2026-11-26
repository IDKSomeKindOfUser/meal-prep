import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ingredients, recipes } from '../data'
import { ALLERGENS } from '../data/types'
import type { Missing } from '../planner'
import { TOOLS, type Settings } from '../planner/types'
import { AccountForm } from './AccountForm'
import { cloudReady, type Cloud } from './cloud'
import { dayMonth, isIsoDate, weekday } from './dates'
import { Checks, Choice, Field, options } from './fields'
import { norm, readForm, type Errors, type Form } from './form'
import { ACTIVITY, ALLERGEN, COOK, GOAL, LACTOSE, missingLines, num } from './labels'
import type { Own } from './own'
import { applyTheme, currentTheme, type Theme } from './theme'
import { transition } from './transition'

interface Props {
  form: Form
  own: Own
  onForm: (form: Form) => void
  /** Suggested first day. */
  start: string
  /** The form differs from the settings of the current menu. */
  changed: boolean
  busy: boolean
  missing: Missing[]
  onBuild: (settings: Settings, start: string) => void
  cloud: Cloud
  /** Some edits have not reached the cloud. */
  unsent: boolean
}

const builtIn = recipes.flatMap((r) => r.ingredients.map((i) => i.id))

const Group = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="group"><h2>{title}</h2>{children}</section>
)

export function SettingsScreen({ form, own, onForm, start: suggested, changed, busy, missing, onBuild, cloud, unsent }: Props) {
  const [start, setStart] = useState(suggested)
  const [submitted, setSubmitted] = useState(false)
  const [theme, setTheme] = useState<Theme>(currentTheme)
  const [tab, setTab] = useState<'form' | 'site'>('form')
  const formRef = useRef<HTMLFormElement>(null)
  const missingRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (missing.length > 0) missingRef.current?.focus() }, [missing])

  const used = new Set([...builtIn, ...own.recipes.flatMap((r) => r.ingredients.map((i) => i.id))])
  const products = [...ingredients.values(), ...own.products].filter((i) => i.buyBy !== 'free' && used.has(i.id))
  const categories = [...new Set(products.map((p) => p.category))]
  const read = readForm(form)
  const errors: Errors = submitted && !read.ok ? read.errors : {}
  const startError = submitted && !isIsoDate(start) ? 'Укажите дату первого дня.' : undefined
  const goal = norm(form)
  const set = <K extends keyof Form>(key: K) => (value: Form[K]) => onForm({ ...form, [key]: value })
  const typed = (key: 'age' | 'height' | 'weight' | 'kcal' | 'protein' | 'budget') => ({
    value: form[key], error: errors[key], inputMode: (key === 'age' ? 'numeric' : 'decimal') as 'numeric' | 'decimal',
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
  })

  return (
    <>
      <header>
        <h1 tabIndex={-1}>Настройки</h1>
        <div className="tabs two" role="group" aria-label="Раздел">
          <button type="button" aria-pressed={tab === 'form'} onClick={() => transition(() => setTab('form'))}>Анкета</button>
          <button type="button" aria-pressed={tab === 'site'} onClick={() => transition(() => setTab('site'))}>Рецепты и сайт</button>
        </div>
      </header>
      {tab === 'form' ? <form ref={formRef} className="settings" noValidate onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (read.ok && isIsoDate(start)) onBuild(read.settings, start)
        // The messages appear after the next render.
        else requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid]')?.focus())
      }}>
        <Group title="Норма">
          <Choice name="normBy" legend="Откуда взять калории" value={form.normBy} onChange={set('normBy')}
            options={[['profile', 'Посчитать по анкете'], ['manual', 'Ввести самому']]} />
          {form.normBy === 'profile' ? (
            <>
              <Choice name="sex" legend="Пол" value={form.sex} onChange={set('sex')} error={errors.sex}
                options={[['female', 'Женский'], ['male', 'Мужской']]} />
              <div className="fields three">
                <Field label="Возраст" unit="лет" {...typed('age')} />
                <Field label="Рост" unit="см" {...typed('height')} />
                <Field label="Вес" unit="кг" {...typed('weight')} />
              </div>
              <div className="field">
                <label htmlFor="activity">Активность</label>
                <select id="activity" value={form.activity} onChange={(e) => set('activity')(e.target.value as Form['activity'])}>
                  {options(ACTIVITY).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                </select>
              </div>
              <Choice name="goal" legend="Цель" value={form.goal} onChange={set('goal')} options={options(GOAL)} />
            </>
          ) : (
            <div className="fields">
              <Field label="Калории" unit="ккал в день" {...typed('kcal')} />
              <Field label="Белок" unit="г в день" {...typed('protein')} />
            </div>
          )}
          <p className="result" aria-live="polite">
            {goal ? <><b>{num(goal.kcal)} ккал</b> и <b>{num(goal.protein)} г белка</b> в день</> : 'Заполните поля, и здесь появится норма.'}
          </p>
          <p className="hint">Расчёт справочный и не заменяет совет врача.</p>
        </Group>

        <Group title="Что нельзя">
          <Checks legend="Аллергены" value={form.allergens} onChange={set('allergens')}
            options={ALLERGENS.map((a) => [a, ALLERGEN[a]] as const)}
            hint="Убираем и блюда, где аллерген только возможен. Составы взяты обычные, поэтому этикетку на пачке всё равно проверяйте." />
          <Choice name="lactose" legend="Лактоза" value={form.lactose} onChange={set('lactose')} options={options(LACTOSE)}
            hint="Это про непереносимость лактозы. Аллергия на молоко отмечается выше." />
          <Choice name="spicy" legend="Острое" value={form.spicy ? 'yes' : 'no'} onChange={(v) => set('spicy')(v === 'yes')}
            options={[['yes', 'Можно'], ['no', 'Нельзя']]} />
          <details className="exclude">
            <summary>Не хочу эти продукты{form.excluded.length > 0 && `: ${form.excluded.length}`}</summary>
            {categories.map((category) => (
              <Checks key={category} legend={category} value={form.excluded} onChange={set('excluded')}
                options={products.filter((p) => p.category === category).map((p) => [p.id, p.name] as const)} />
            ))}
          </details>
        </Group>

        <Group title="Готовка">
          <Choice name="weeks" legend="На сколько" value={form.weeks} onChange={set('weeks')} options={[[1, 'Неделя'], [4, '4 недели']]} />
          <Field label="Первый день" type="date" value={start} error={startError} hint={!startError && isIsoDate(start) ? `${weekday(start)}, ${dayMonth(start)}` : undefined} onChange={(e) => setStart(e.target.value)} />
          <Choice name="cookTimes" legend="Готовить в неделю" value={form.cookTimes} onChange={set('cookTimes')}
            options={([1, 2, 3, 7] as const).map((n) => [n, COOK[n]] as const)} />
          <Checks legend="Техника" value={form.tools} onChange={set('tools')}
            options={TOOLS.map((t) => [t, t[0]!.toUpperCase() + t.slice(1)] as const)} />
          <Choice name="maxMinutes" legend="Время на одно блюдо" value={form.maxMinutes || 'any'}
            onChange={(v) => set('maxMinutes')(v === 'any' ? '' : v)}
            options={[['any', 'Любое'], ['30', 'до 30 минут'], ['45', 'до 45'], ['60', 'до 60']]}
            hint="Пожелание: если выбора мало, блюдо может готовиться дольше." />
        </Group>

        <Group title="Деньги">
          <Field label="Бюджет на весь срок" unit="₽" {...typed('budget')}
            hint="Считаем целыми пачками и с нуля, без учёта запасов дома. Пустое поле: без предела." />
        </Group>

        <div className="build">
          {missing.length > 0 && (
            <div className="missing" ref={missingRef} tabIndex={-1} role="alert">
              <b>Меню не собралось: подходящих блюд нет.</b>
              <ul>{missingLines(missing).map((line) => <li key={line}>{line}</li>)}</ul>
            </div>
          )}
          {submitted && !read.ok && <p className="warn" role="alert">Исправьте отмеченные поля.</p>}
          {changed && <p className="hint">Настройки изменены, меню пока прежнее.</p>}
          <button type="submit" className="go" disabled={busy}>{busy ? 'Собираем…' : 'Собрать меню'}</button>
        </div>
      </form> : <div className="settings">
        <Group title="Свои рецепты">
          <p>{own.recipes.length > 0 ? `Добавлено: ${own.recipes.length}.` : 'Добавьте свои блюда, и они попадут в подбор.'}</p>
          <a className="back" href="#recipes">Открыть свои рецепты</a>
        </Group>
        {cloudReady && <Group title="Облако"><AccountForm cloud={cloud} unsent={unsent} /></Group>}
        <Group title="Вид">
          <Choice name="theme" legend="Тема" value={theme} onChange={(t) => { setTheme(t); applyTheme(t) }}
            options={[['system', 'Как в системе'], ['light', 'Светлая'], ['dark', 'Тёмная']]} />
        </Group>
        <Group title="О сайте"><a className="back" href="#credits">Авторы фото</a></Group>
      </div>}
    </>
  )
}
