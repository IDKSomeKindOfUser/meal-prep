import { useState } from 'react'
import { BackLink } from './parts'
import { Check, ChefHat, Clock, Pencil, Refrigerator, ShoppingBasket, TriangleAlert } from 'lucide-react'
import { recipeAllergens } from '../data'
import type { Report } from '../planner'
import { frozenDays, type Block } from '../planner/schedule'
import { SLOTS, type Catalog, type Slot } from '../planner/types'
import { addDays, dayMonth, weekday, weekdayShort } from './dates'
import { DishPicture } from './DishPicture'
import { ALLERGEN, amount, count, daysCount, num, SLOT } from './labels'
import { Steps } from './Steps'
import { recipeHash, swapHash } from './route'
import { cookedKey, type SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  catalog: Catalog
  /** The recipe was added by the user. */
  isOwn: (recipeId: string) => boolean
  block: number
  slot: Slot
  origin: 'today' | 'week'
  onSwap: () => void
  onCooked: (key: string, cooked: boolean) => void
}

/** The days a block is eaten on. */
export function blockDays(start: string, block: Block): string {
  const first = addDays(start, block.firstDay)
  const last = addDays(start, block.firstDay + block.days - 1)
  return block.days === 1 ? `${weekday(first)}, ${dayMonth(first)}` : `${weekdayShort(first)} – ${weekdayShort(last)}, ${dayMonth(first)} – ${dayMonth(last)}`
}

/** Список продуктов: нажатие отмечает продукт, он зачёркивается. */
function Ingredients({ items }: { items: { id: string; name: string; text: string }[] }) {
  const [got, setGot] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setGot((g) => { const n = new Set(g); if (!n.delete(id)) n.add(id); return n })
  return (
    <ul className="amounts">
      {items.map((i) => (
        <li key={i.id} className={got.has(i.id) ? 'ticked' : undefined}>
          <label>
            <input type="checkbox" checked={got.has(i.id)} onChange={() => toggle(i.id)} />
            <span><span className="line">{i.name}</span></span><b><span className="line">{i.text}</span></b>
          </label>
        </li>
      ))}
    </ul>
  )
}

export function DishScreen({ plan, report, catalog, isOwn, block: index, slot, origin, onSwap, onCooked }: Props) {
  const { block, day } = report.blocks[index]!
  const dish = day.dishes[SLOTS.indexOf(slot)]!
  const { recipe } = dish
  const frozen = frozenDays(recipe, block)
  const percent = Math.round(dish.scale * 100)
  const { contains, may } = recipeAllergens(recipe, catalog.ingredient)
  const names = (list: typeof may) => list.map((a) => ALLERGEN[a].toLowerCase()).join(', ')
  const source = recipe.source as { name: string; url: string } | null
  const cook = addDays(plan.start, block.cookDay)
  const key = cookedKey(index, slot)
  const cooked = plan.cooked?.includes(key) ?? false
  return (
    <article className="recipe">
      <div className="top"><BackLink href={`#${origin}`}>{origin === 'today' ? 'Назад к меню дня' : 'Назад к меню недели'}</BackLink></div>
      <div className="dish hero" data-slot={slot}>
        <h1 tabIndex={-1}>{recipe.name}</h1>
        <p>{SLOT[slot]}, {blockDays(plan.start, block)}</p>
        <dl className="macros" aria-label="Одна порция">
          <div><dt>ккал</dt><dd>{num(dish.kcal)}</dd></div>
          <div><dt>белки, г</dt><dd>{num(dish.protein)}</dd></div>
          <div><dt>жиры, г</dt><dd>{num(dish.fat)}</dd></div>
          <div><dt>углеводы, г</dt><dd>{num(dish.carbs)}</dd></div>
        </dl>
        <DishPicture recipe={recipe} />
        <ul className="chips-info" aria-label="Коротко о блюде">
          <li><Clock aria-hidden="true" />около {recipe.minutes}&nbsp;мин.</li>
          <li><Refrigerator aria-hidden="true" />в холодильнике {daysCount(recipe.keepDays)}</li>
          {contains.length > 0 && <li className="warnchip"><TriangleAlert aria-hidden="true" />{names(contains)}</li>}
          {may.length > 0 && <li className="warnchip maybe"><TriangleAlert aria-hidden="true" />возможно, {names(may)}</li>}
        </ul>
        <dl className="about">
          <div><dt>Готовим</dt><dd>{weekday(cook)}, {dayMonth(cook)}</dd></div>
          {frozen.length > 0 && <div><dt>В морозилку</dt><dd>порции на {frozen.map((d) => weekdayShort(addDays(plan.start, d))).join(', ')}</dd></div>}
        </dl>
        <div className="actions">
          <button type="button" className="tonal" aria-pressed={cooked} onClick={() => onCooked(key, !cooked)}>
            <Check aria-hidden="true" />{cooked ? 'Приготовлено' : 'Отметить приготовленным'}
          </button>
          <a className="go" href={swapHash(index, slot)} onClick={onSwap}>Заменить блюдо</a>
          {isOwn(recipe.id) && <a className="back" href={recipeHash(recipe.id)}><Pencil aria-hidden="true" />Изменить рецепт</a>}
        </div>
      </div>
      <div className="cols" data-slot-mark={slot}>
      <section className="panel">
        <h2><ShoppingBasket aria-hidden="true" />Продукты</h2>
        <p>На {count(block.days, 'порцию', 'порции', 'порций')}, вес сырых продуктов. Нажмите на продукт, чтобы отметить его.</p>
        <Ingredients key={`${index}${slot}${recipe.id}`} items={dish.batch.map(({ id, grams }) => { const product = catalog.ingredient(id); return { id, name: product.name, text: amount(product, grams) } })} />
        {recipe.spices && <p className="note">Специи: {recipe.spices}.</p>}
      </section>
      <section className="panel">
        <h2><ChefHat aria-hidden="true" />Как готовить</h2>
        {Math.abs(percent - 100) > 5 && (
          <p>Шаги написаны для обычной порции. Ваша порция {percent > 100 ? 'больше' : 'меньше'} на {Math.abs(percent - 100)}%: граммы в шагах берите на столько же {percent > 100 ? 'больше' : 'меньше'}.</p>
        )}
        {recipe.steps.length === 0 && <p>Шаги не записаны.</p>}
        <Steps key={`${index}${slot}${recipe.id}`} steps={recipe.steps} />
        {source && <p className="note">Источник: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></p>}
      </section>
      </div>
    </article>
  )
}
