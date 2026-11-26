import { useEffect, useRef, useState } from 'react'
import { ingredients, recipeAllergens } from '../data'
import { ALLERGENS } from '../data/types'
import { TOOLS, type Catalog } from '../planner/types'
import { Checks, Choice, Field, options } from './fields'
import { ALLERGEN, MEAL, num } from './labels'
import {
  amountUnit, draftIngredients, EMPTY_RECIPE, newId, nutrition, OWN_CATEGORY, readRecipe,
  type Own, type OwnProduct, type OwnRecipe, type RecipeDraft,
} from './own'
import { ProductDialog } from './ProductDialog'

interface Props {
  /** `new` or the id of an own recipe. */
  id: string
  exists: boolean
  saved: RecipeDraft
  own: Own
  catalog: Catalog
  inMenu: boolean
  busy: boolean
  onProduct: (product: OwnProduct) => void
  onSave: (recipe: OwnRecipe) => void
  onDelete: () => void
}

/** What is typed survives a visit to another screen and a reload, until it is saved or cancelled. */
const draftKey = (id: string) => `recipe-draft:${id}`
function loadDraft(id: string, saved: RecipeDraft): RecipeDraft {
  try {
    const draft = JSON.parse(sessionStorage.getItem(draftKey(id)) ?? 'null') as RecipeDraft | null
    const same = draft && Object.entries(EMPTY_RECIPE).every(([k, v]) => {
      const x = draft[k as keyof RecipeDraft]
      return Array.isArray(v) ? Array.isArray(x) : typeof x === typeof v
    })
    return same ? draft : saved
  } catch {
    return saved
  }
}
export function clearDraft(id: string) {
  try {
    sessionStorage.removeItem(draftKey(id))
  } catch {
    // Storage is blocked, so there is no draft either.
  }
}

const categories = [...new Set([...ingredients.values()].map((i) => i.category))]

export function RecipeScreen({ id, exists, saved, own, catalog, inMenu, busy, onProduct, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState(() => loadDraft(id, saved))
  const [submitted, setSubmitted] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const changed = JSON.stringify(draft) !== JSON.stringify(saved)
  useEffect(() => {
    if (!changed) return clearDraft(id)
    try {
      sessionStorage.setItem(draftKey(id), JSON.stringify(draft))
    } catch {
      // The draft then lives only while the screen is open.
    }
  }, [id, draft, changed])

  if (id !== 'new' && !exists)
    return (
      <>
        <div className="top"><a className="back" href="#recipes">Назад к своим рецептам</a></div>
        <header><h1 tabIndex={-1}>Такого рецепта нет</h1></header>
      </>
    )

  const lookup = catalog.ingredient
  const read = readRecipe(draft, exists ? id : '', lookup)
  const errors = submitted && !read.ok ? read.errors : {}
  const set = <K extends keyof RecipeDraft>(key: K) => (value: RecipeDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const typed = (key: 'name' | 'portions' | 'minutes' | 'keepDays') => ({
    value: draft[key], error: errors[key], inputMode: (key === 'name' ? 'text' : 'numeric') as 'text' | 'numeric',
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
  })
  const changeRow = (key: number, change: { id?: string; amount?: string }) =>
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.key === key ? { ...r, ...change } : r)) }))
  const nextKey = Math.max(0, ...draft.rows.map((r) => r.key)) + 1
  const focusLater = (elementId: string) => requestAnimationFrame(() => document.getElementById(elementId)?.focus())
  const all = [...ingredients.values(), ...own.products]

  const parts = draftIngredients(draft, lookup)
  const portions = Number(draft.portions)
  const perPortion = parts.length > 0 && portions >= 1 ? nutrition(parts, portions, lookup) : null
  const { contains, may } = recipeAllergens(
    { ingredients: parts, spiceAllergens: { contains: draft.spices.trim() ? draft.spiceAllergens : [], may: [] } }, lookup)
  const names = (list: typeof may) => list.map((a) => ALLERGEN[a].toLowerCase()).join(', ')

  return (
    <>
      <div className="top"><a className="back" href="#recipes">Назад к своим рецептам</a></div>
      <header><h1 tabIndex={-1}>{exists ? 'Изменить рецепт' : 'Новый рецепт'}</h1></header>
      <form ref={formRef} className="settings" noValidate onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (read.ok) onSave({ ...read.value, id: exists ? id : newId() })
        else requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid]')?.focus())
      }}>
        <section className="group">
          <h2>Блюдо</h2>
          <Field label="Название" {...typed('name')} />
          <Choice name="type" legend="Когда едим" value={draft.type} error={errors.type} onChange={set('type')} options={options(MEAL)} />
        </section>
        <section className="group">
          <h2>Продукты</h2>
          <Field label="На сколько порций этот рецепт" {...typed('portions')} />
          <p className="hint">Вес сырых продуктов на все порции. Соль и обычные специи сюда не входят.</p>
          <ul className="rows">
            {draft.rows.map((row) => {
              const product = all.find((p) => p.id === row.id)
              const unit = product ? amountUnit(product).label : 'г'
              const error = errors[`row-${row.key}`]
              const described = error ? `row-${row.key}-error` : undefined
              return (
                <li key={row.key}>
                  <select id={`row-${row.key}`} aria-label="Продукт" value={product ? row.id : ''} aria-invalid={error && !product ? true : undefined}
                    aria-describedby={described}
                    onChange={(e) => changeRow(row.key, { id: e.target.value })}>
                    <option value="">Выберите продукт</option>
                    {own.products.length > 0 && (
                      <optgroup label={OWN_CATEGORY}>{own.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</optgroup>
                    )}
                    {categories.map((c) => (
                      <optgroup key={c} label={c}>
                        {[...ingredients.values()].filter((p) => p.category === c).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <input id={`amount-${row.key}`} inputMode="decimal" autoComplete="off" aria-label={`Количество, ${unit}`} value={row.amount}
                    aria-invalid={error && product ? true : undefined} aria-describedby={described}
                    onChange={(e) => changeRow(row.key, { amount: e.target.value })} />
                  <span className="unit" aria-hidden="true">{unit}</span>
                  <button type="button" className="remove" aria-label={`Убрать: ${product?.name ?? 'пустая строка'}`} onClick={() => {
                    set('rows')(draft.rows.filter((r) => r.key !== row.key))
                    focusLater('add-row')
                  }}><svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l10 10M13 3L3 13" /></svg></button>
                  {error && <p className="warn" id={described}>{error}</p>}
                </li>
              )
            })}
          </ul>
          {errors.rows && <p className="warn" id="rows-error">{errors.rows}</p>}
          <button type="button" id="add-row" className="textbtn" aria-invalid={errors.rows ? true : undefined} aria-describedby={errors.rows ? 'rows-error' : undefined}
            onClick={() => {
              set('rows')([...draft.rows, { key: nextKey, id: '', amount: '' }])
              focusLater(`row-${nextKey}`)
            }}>Ещё продукт</button>
          <button type="button" className="textbtn" onClick={() => setAddingProduct(true)}>Нет в списке? Новый продукт</button>
          <div aria-live="polite">
            {perPortion && <p>В порции <b>{num(perPortion.kcal)} ккал</b>, белки {num(perPortion.protein)} г, жиры {num(perPortion.fat)} г, углеводы {num(perPortion.carbs)} г.</p>}
            {parts.length > 0 && (
              <p>Аллергены: {contains.length > 0 ? names(contains) : 'нет'}{may.length > 0 && `; возможно, есть ${names(may)}`}.</p>
            )}
          </div>
          <Field label="Специи, если нужны" value={draft.spices} onChange={(e) => set('spices')(e.target.value)} hint="Считаются имеющимися дома, в покупки не попадут." />
          {draft.spices.trim() !== '' && (
            <Checks legend="Аллергены в специях" value={draft.spiceAllergens} onChange={set('spiceAllergens')}
              options={ALLERGENS.map((a) => [a, ALLERGEN[a]] as const)} hint="В готовых смесях бывают кунжут, горчица и сельдерей. Проверьте состав на упаковке." />
          )}
        </section>
        <section className="group">
          <h2>Готовка</h2>
          <div className="fields">
            <Field label="Время" unit="мин" {...typed('minutes')} />
            <Field label="В холодильнике" unit="дней" {...typed('keepDays')} />
          </div>
          <Choice name="freezable" legend="Можно заморозить" value={draft.freezable ? 'yes' : 'no'} onChange={(v) => set('freezable')(v === 'yes')}
            options={[['yes', 'Да'], ['no', 'Нет']]} hint="Если готовить два раза в неделю, блюдо должно храниться 4 дня или замораживаться." />
          <Checks legend="Нужная техника" value={draft.tools} onChange={set('tools')} options={TOOLS.map((t) => [t, t[0]!.toUpperCase() + t.slice(1)] as const)}
            hint="Отмечайте только то, без чего не обойтись: отмеченное нужно всё сразу." />
          <Choice name="recipeSpicy" legend="Острое" value={draft.spicy ? 'yes' : 'no'} onChange={(v) => set('spicy')(v === 'yes')} options={[['no', 'Нет'], ['yes', 'Да']]} />
          <div className="field">
            <label htmlFor="steps">Как готовить</label>
            <textarea id="steps" rows={6} value={draft.steps} aria-describedby="steps-hint" onChange={(e) => set('steps')(e.target.value)} />
            <p className="hint" id="steps-hint">Каждый шаг с новой строки.</p>
          </div>
        </section>
        <div className="build">
          {submitted && !read.ok && <p className="warn" role="alert">Исправьте отмеченные поля.</p>}
          {changed && <p className="hint">Изменения не сохранены.</p>}
          <button type="submit" className="go" disabled={busy}>Сохранить рецепт</button>
          {changed && (
            <button type="button" className="textbtn" onClick={() => {
              if (!confirm('Отменить изменения? Введённое пропадёт.')) return
              setDraft(saved)
              setSubmitted(false)
            }}>Отменить изменения</button>
          )}
          {exists && (inMenu
            ? <p className="hint">Блюдо есть в текущем меню. Чтобы удалить рецепт, сначала замените блюдо.</p>
            : <button type="button" className="textbtn" disabled={busy} onClick={() => {
              if (confirm('Удалить рецепт? Вернуть его будет нельзя.')) onDelete()
            }}>Удалить рецепт</button>)}
        </div>
      </form>
      {addingProduct && (
        <ProductDialog product={null} onClose={() => setAddingProduct(false)}
          onSave={(product) => {
            onProduct(product)
            const empty = draft.rows.find((r) => r.id === '')
            if (empty) changeRow(empty.key, { id: product.id })
            else set('rows')([...draft.rows, { key: nextKey, id: product.id, amount: '' }])
            focusLater(`amount-${empty?.key ?? nextKey}`)
          }} />
      )}
    </>
  )
}
