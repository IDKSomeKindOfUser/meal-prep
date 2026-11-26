import { recipeAllergens } from '../data'
import type { Report } from '../planner'
import { frozenDays, type Block } from '../planner/schedule'
import { SLOTS, type Catalog, type Slot } from '../planner/types'
import { addDays, dayMonth, weekday, weekdayShort } from './dates'
import { DishPicture } from './DishPicture'
import { ALLERGEN, amount, count, daysCount, num, SLOT } from './labels'
import { Steps } from './Steps'
import { recipeHash, swapHash } from './route'
import type { SavedPlan } from './storage'

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
}

/** The days a block is eaten on. */
export function blockDays(start: string, block: Block): string {
  const first = addDays(start, block.firstDay)
  const last = addDays(start, block.firstDay + block.days - 1)
  return block.days === 1 ? `${weekday(first)}, ${dayMonth(first)}` : `${weekdayShort(first)} – ${weekdayShort(last)}, ${dayMonth(first)} – ${dayMonth(last)}`
}

export function DishScreen({ plan, report, catalog, isOwn, block: index, slot, origin, onSwap }: Props) {
  const { block, day } = report.blocks[index]!
  const dish = day.dishes[SLOTS.indexOf(slot)]!
  const { recipe } = dish
  const frozen = frozenDays(recipe, block)
  const percent = Math.round(dish.scale * 100)
  const { contains, may } = recipeAllergens(recipe, catalog.ingredient)
  const names = (list: typeof may) => list.map((a) => ALLERGEN[a].toLowerCase()).join(', ')
  const source = recipe.source as { name: string; url: string } | null
  const cook = addDays(plan.start, block.cookDay)
  return (
    <article className="recipe">
      <div className="top"><a className="back" href={`#${origin}`}>{origin === 'today' ? 'Назад к меню дня' : 'Назад к меню недели'}</a></div>
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
        <dl className="about">
          <div><dt>Готовим</dt><dd>{weekday(cook)}, {dayMonth(cook)}, около {recipe.minutes} мин.</dd></div>
          <div>
            <dt>Хранение</dt>
            <dd>
              В холодильнике {daysCount(recipe.keepDays)}
              {frozen.length > 0 && `. В морозилку: порции на ${frozen.map((d) => weekdayShort(addDays(plan.start, d))).join(', ')}`}.
            </dd>
          </div>
          {(contains.length > 0 || may.length > 0) && (
            <div>
              <dt>Аллергены</dt>
              <dd>
                {contains.length > 0 ? names(contains) : 'нет явных'}
                {may.length > 0 && `; возможно, есть ${names(may)}`}.
              </dd>
            </div>
          )}
        </dl>
        <div className="actions">
          <a className="go" href={swapHash(index, slot)} onClick={onSwap}>Заменить блюдо</a>
          {isOwn(recipe.id) && <a className="back" href={recipeHash(recipe.id)}>Изменить рецепт</a>}
        </div>
      </div>
      <div className="cols">
      <section>
        <h2>Продукты</h2>
        <p>На {count(block.days, 'порцию', 'порции', 'порций')}, вес сырых продуктов</p>
        <ul className="amounts">
          {dish.batch.map(({ id, grams }) => {
            const product = catalog.ingredient(id)
            return <li key={id}><span>{product.name}</span><b>{amount(product, grams)}</b></li>
          })}
        </ul>
        {recipe.spices && <p className="note">Специи: {recipe.spices}.</p>}
      </section>
      <section>
        <h2>Как готовить</h2>
        {Math.abs(percent - 100) > 5 && (
          <p>Шаги написаны для обычной порции. Ваша порция {percent > 100 ? 'больше' : 'меньше'} на {Math.abs(percent - 100)}%: граммы в шагах берите на столько же {percent > 100 ? 'больше' : 'меньше'}.</p>
        )}
        {recipe.steps.length === 0 && <p>Шаги не записаны.</p>}
        <Steps steps={recipe.steps} />
        {source && <p className="note">Источник: <a href={source.url} target="_blank" rel="noreferrer">{source.name}</a></p>}
      </section>
      </div>
    </article>
  )
}
