import { useRef, useState } from 'react'
import { ChefHat, Clock, Pencil, Refrigerator, Search, ShoppingBasket, Snowflake, TriangleAlert, X } from 'lucide-react'
import { recipeAllergens } from '../data'
import type { MealType, Recipe } from '../data/types'
import type { Catalog, Settings, Slot } from '../planner/types'
import { Ingredients } from './DishScreen'
import { DishPicture } from './DishPicture'
import { findDishes, isNew, unfitReasons, type DishFilter } from './dishes'
import { ALLERGEN, amount, daysCount, MEAL, num } from './labels'
import { BackLink, GoIcon } from './parts'
import { cardHash, recipeHash } from './route'
import { Steps } from './Steps'
import { transition } from './transition'

/** The meal color of a dish type. */
const COLOR: Record<MealType, Slot> = { breakfast: 'breakfast', main: 'lunch', snack: 'snack' }
const FILTERS: { value: DishFilter; label: string }[] = [
  { value: 'all', label: 'Все' }, { value: 'breakfast', label: 'Завтраки' }, { value: 'main', label: 'Обеды и ужины' }, { value: 'snack', label: 'Перекусы' },
]

interface ListProps {
  catalog: Catalog
  /** The limits of the form; `null` when it is not filled in. */
  settings: Settings | null
  today: string
  filter: DishFilter
  onFilter: (filter: DishFilter) => void
  query: string
  onQuery: (query: string) => void
}

export function DishesScreen({ catalog, settings, today, filter, onFilter, query, onQuery }: ListProps) {
  const [searching, setSearching] = useState(query !== '')
  const input = useRef<HTMLInputElement>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const found = findDishes(catalog.recipes, filter, query, today)
  const close = () => { onQuery(''); setSearching(false); requestAnimationFrame(() => opener.current?.focus()) }
  return (
    <>
      <header className="dishes-head">
        <div className="title-row">
          <h1 tabIndex={-1}>Рецепты</h1>
          <search className="find" data-open={searching || undefined}>
            {searching ? (
              <>
                <Search className="find-icon" aria-hidden="true" />
                <input ref={input} type="search" autoFocus aria-label="Поиск по названию" placeholder="Название блюда" value={query}
                  onChange={(e) => onQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); close() } }} />
                <button type="button" className="find-clear" aria-label={query ? 'Очистить поиск' : 'Закрыть поиск'}
                  onClick={() => { if (query) { onQuery(''); input.current?.focus() } else close() }}><X aria-hidden="true" /></button>
              </>
            ) : (
              <button ref={opener} type="button" className="find-open" aria-label="Искать по названию" onClick={() => setSearching(true)}><Search aria-hidden="true" /></button>
            )}
          </search>
        </div>
        <p className="sub">Все блюда планировщика. Те, что не подходят под анкету, помечены причиной.</p>
        <div className="tabs filters" role="group" aria-label="Тип блюда">
          {FILTERS.map((f) => (
            <button key={f.value} type="button" aria-pressed={f.value === filter} onClick={() => transition(() => onFilter(f.value))}>{f.label}</button>
          ))}
        </div>
      </header>
      <p className="found" role="status">{query ? `Найдено: ${num(found.length)}` : ''}</p>
      {found.length === 0 ? (
        <div className="empty dishes-empty">
          <b>Ничего не нашлось</b>
          <p>{`Нет блюд со словами «${query.trim()}»${filter === 'all' ? '' : ' среди выбранного типа'}. Проверьте написание или поищите по одному слову.`}</p>
          {filter !== 'all' && <button type="button" className="textbtn" onClick={() => onFilter('all')}>Искать среди всех блюд</button>}
        </div>
      ) : (
        <ul className="meals">
          {found.map((r) => {
            const reasons = unfitReasons(r, settings, catalog)
            return (
              <li key={r.id} className="dish" data-slot={COLOR[r.type]} data-unfit={reasons.length > 0 || undefined}>
                <div>
                  <h3><a href={cardHash(r.id)}>{r.name}<GoIcon /></a></h3>
                  <ul className="facts">
                    <li>{MEAL[r.type]}</li>
                    {isNew(r, today) && <li className="new">Новое</li>}
                    <li>{num(r.kcal)} ккал</li>
                    <li>{num(r.protein)} г белка</li>
                    <li>{r.minutes} мин</li>
                  </ul>
                  {reasons.length > 0 && <p className="from unfit-note"><TriangleAlert aria-hidden="true" />Не подходит: {reasons.join('; ')}</p>}
                </div>
                <DishPicture recipe={r} />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

interface CardProps {
  recipe: Recipe
  catalog: Catalog
  settings: Settings | null
  isOwn: boolean
}

/** A dish as written in the recipe: one portion, outside of any menu. */
export function CardScreen({ recipe, catalog, settings, isOwn }: CardProps) {
  const { contains, may } = recipeAllergens(recipe, catalog.ingredient)
  const names = (list: typeof may) => list.map((a) => ALLERGEN[a].toLowerCase()).join(', ')
  const source = recipe.source as { name: string; url: string } | null
  const reasons = unfitReasons(recipe, settings, catalog)
  const slot = COLOR[recipe.type]
  return (
    <article className="recipe">
      <div className="top"><BackLink href="#dishes">Назад к рецептам</BackLink></div>
      <div className="dish hero" data-slot={slot}>
        <h1 tabIndex={-1}>{recipe.name}</h1>
        <p>{MEAL[recipe.type]}, {recipe.cuisine.toLowerCase()} кухня</p>
        <dl className="macros" aria-label="Одна порция">
          <div><dt>ккал</dt><dd>{num(recipe.kcal)}</dd></div>
          <div><dt>белки, г</dt><dd>{num(recipe.protein)}</dd></div>
          <div><dt>жиры, г</dt><dd>{num(recipe.fat)}</dd></div>
          <div><dt>углеводы, г</dt><dd>{num(recipe.carbs)}</dd></div>
        </dl>
        <DishPicture recipe={recipe} />
        <ul className="chips-info" aria-label="Коротко о блюде">
          <li><Clock aria-hidden="true" />около {recipe.minutes}&nbsp;мин.</li>
          <li><Refrigerator aria-hidden="true" />в холодильнике {daysCount(recipe.keepDays)}</li>
          {recipe.freezable && <li><Snowflake aria-hidden="true" />можно заморозить</li>}
          {contains.length > 0 && <li className="warnchip"><TriangleAlert aria-hidden="true" />{names(contains)}</li>}
          {may.length > 0 && <li className="warnchip maybe"><TriangleAlert aria-hidden="true" />возможно, {names(may)}</li>}
        </ul>
        {reasons.length > 0 && <p className="unfit-note"><TriangleAlert aria-hidden="true" />Не попадёт в меню по вашей анкете: {reasons.join('; ')}.</p>}
        {isOwn && <div className="actions"><a className="back" href={recipeHash(recipe.id)}><Pencil aria-hidden="true" />Изменить рецепт</a></div>}
      </div>
      <div className="cols" data-slot-mark={slot}>
        <section className="panel">
          <h2><ShoppingBasket aria-hidden="true" />Продукты</h2>
          <p>На одну порцию, вес сырых продуктов. В меню порция подгоняется под вашу норму.</p>
          <Ingredients key={recipe.id} items={recipe.ingredients.map(({ id, grams }) => { const product = catalog.ingredient(id); return { id, name: product.name, text: amount(product, grams) } })} />
          {recipe.spices && <p className="note">Специи: {recipe.spices}.</p>}
        </section>
        <section className="panel">
          <h2><ChefHat aria-hidden="true" />Как готовить</h2>
          {recipe.steps.length === 0 && <p>Шаги не записаны.</p>}
          <Steps key={recipe.id} steps={recipe.steps} />
          {source && <p className="note">Источник: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></p>}
        </section>
      </div>
    </article>
  )
}
