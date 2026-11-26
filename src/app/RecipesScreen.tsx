import { useRef, useState } from 'react'
import { ALLERGEN, MEAL, num } from './labels'
import type { Own, OwnProduct } from './own'
import { ProductDialog } from './ProductDialog'
import { recipeHash } from './route'

interface Props {
  own: Own
  busy: boolean
  onProduct: (product: OwnProduct) => void
  onDeleteProduct: (id: string) => void
}

export function RecipesScreen({ own, busy, onProduct, onDeleteProduct }: Props) {
  /** `null`: the dialog is closed. */
  const [edited, setEdited] = useState<OwnProduct | 'new' | null>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  return (
    <>
      <div className="top"><a className="back" href="#settings">Назад к настройкам</a></div>
      <header>
        <h1 tabIndex={-1}>Свои рецепты</h1>
        <p className="sub">Участвуют в подборе наравне с готовыми. Аллергены и калории берутся из продуктов.</p>
        {own.recipes.length > 0 && <a className="go" href={recipeHash('new')}>Добавить рецепт</a>}
      </header>
      <section>
        {own.recipes.length === 0 && (
          <div className="empty">
            <b>Своих рецептов пока нет</b>
            <p>Добавьте блюдо, которое готовите сами: оно попадёт в подбор меню наравне с готовыми.</p>
            <a className="go" href={recipeHash('new')}>Добавить первый рецепт</a>
          </div>
        )}
        <ul className="own">
          {own.recipes.map((r) => (
            <li key={r.id}>
              <span>
                <a className="link" href={recipeHash(r.id)}>{r.name}</a>
                <span className="hint">{MEAL[r.type]}, {r.minutes} мин, порций: {r.portions}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>Свои продукты</h2>
        {own.products.length === 0 && <p>Нужны, только если продукта нет в общем списке.</p>}
        <ul className="own">
          {own.products.map((p) => {
            const recipes = own.recipes.filter((r) => r.ingredients.some((i) => i.id === p.id))
            const all = [...p.allergens.contains, ...p.allergens.may].map((a) => ALLERGEN[a].toLowerCase())
            return (
              <li key={p.id}>
                <span>
                  <b>{p.name}</b>
                  <span className="hint">
                    {num(p.price.price)} ₽ за {p.buyBy === 'pack' ? `пачку ${num(p.price.grams)} г` : 'кг'}, {all.length > 0 ? `аллергены: ${all.join(', ')}` : 'аллергенов нет'}
                    {recipes.length > 0 && `. Есть в рецептах: ${recipes.map((r) => r.name).join(', ')}`}
                  </span>
                </span>
                <span className="acts">
                  <button type="button" className="textbtn" disabled={busy} aria-label={`Изменить: ${p.name}`} onClick={() => setEdited(p)}>Изменить</button>
                  {recipes.length === 0 && (
                    <button type="button" className="textbtn" disabled={busy} aria-label={`Удалить: ${p.name}`} onClick={() => {
                      if (!confirm(`Удалить продукт «${p.name}»?`)) return
                      onDeleteProduct(p.id)
                      addRef.current?.focus()
                    }}>Удалить</button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
        <button ref={addRef} type="button" className="textbtn" disabled={busy} onClick={() => setEdited('new')}>Добавить продукт</button>
      </section>
      {edited && <ProductDialog product={edited === 'new' ? null : edited} onSave={onProduct} onClose={() => setEdited(null)} />}
    </>
  )
}
