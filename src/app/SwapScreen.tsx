import { BackLink } from './parts'
import { useMemo, type MouseEvent } from 'react'
import { alternatives, type Alternative, type Report } from '../planner'
import { SLOTS, type Slot } from '../planner/types'
import { blockDays } from './DishScreen'
import { DishPicture } from './DishPicture'
import { num, rub, signed, SLOT } from './labels'
import { dishHash } from './route'
import type { Catalog } from '../planner/types'
import type { SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  block: number
  slot: Slot
  catalog: Catalog
  busy: boolean
  onBack: (e: MouseEvent) => void
  onChoose: (recipeId: string) => void
  onResetWishes: (cookDay: number) => void
}

export function SwapScreen({ plan, report, block: index, slot, catalog, busy, onBack, onChoose, onResetWishes }: Props) {
  const { menu, settings } = plan
  const options = useMemo(() => alternatives(menu, index, slot, settings, catalog), [menu, index, slot, settings, catalog])
  const { block, day } = report.blocks[index]!
  const now = day.dishes[SLOTS.indexOf(slot)]!.recipe
  const { total } = report.shopping
  const usedIn = (id: string) => {
    const same = SLOTS.find((s) => s !== slot && menu[index]![s] === id)
    if (same) return `Уже есть в эти дни: ${SLOT[same].toLowerCase()}`
    return menu.some((row) => SLOTS.some((s) => row[s] === id)) ? 'Уже есть в меню' : null
  }
  // Хорошо, если после замены день ближе к норме; для чека — если дешевле.
  const tone = (before: number, after: number, goal: number) =>
    after === before ? '' : Math.abs(after - goal) < Math.abs(before - goal) ? 'up' : 'down'
  const wished = options.filter((o) => o.wished)
  const rest = options.filter((o) => !o.wished)
  const list = (items: Alternative[]) => (
    <ul className="options">
      {items.map(({ recipe, kcal, protein, costChange, wished: match }) => {
        const used = usedIn(recipe.id)
        const over = settings.budget === null ? 0 : total + costChange - settings.budget
        return (
          <li key={recipe.id} className={match ? 'wished' : undefined}>
            <span className="thumb"><DishPicture recipe={recipe} /></span>
            <div>
              {match && <p className="wishtag">По вашим пожеланиям</p>}
              <h2>{recipe.name}</h2>
              <p className="facts">
                <span className={tone(day.kcal, kcal, settings.kcal)}>{num(kcal)} ккал <b>{signed(kcal - day.kcal)}</b></span>
                <span className={tone(day.protein, protein, settings.protein)}>белок {num(protein)} г <b>{signed(protein - day.protein)}</b></span>
                <span className={costChange < 0 ? 'up' : costChange > 0 ? 'down' : ''}>чек за {settings.weeks === 1 ? 'неделю' : '4 недели'} <b>{signed(Math.ceil(total + costChange) - Math.ceil(total))} ₽</b></span>
                <span>{recipe.minutes} мин</span>
              </p>
              {used && <p className="used">{used}</p>}
              {over > 0 && <p className="warn">Выше бюджета на {rub(over)}</p>}
            </div>
            <button type="button" disabled={busy} aria-label={`Выбрать: ${recipe.name}`} onClick={() => onChoose(recipe.id)}>Выбрать</button>
          </li>
        )
      })}
    </ul>
  )
  return (
    <>
      <div className="top"><BackLink href={dishHash(index, slot)} onClick={onBack}>Назад к рецепту</BackLink></div>
      <header>
        <h1 tabIndex={-1}>Чем заменить</h1>
        <p className="sub">Сейчас: {now.name}. {SLOT[slot]}, {blockDays(plan.start, block)}.</p>
        <p className="sub">
          {block.days > 1 && 'Блюдо сменится на все эти дни. '}
          Сначала те, с которыми день ближе к норме: {num(settings.kcal)} ккал и {num(settings.protein)} г белка.
        </p>
      </header>
      {options.length === 0 && <section><p>Других блюд под ваши ограничения нет. Ослабьте их в настройках и соберите меню заново.</p></section>}
      {wished.length > 0 && (
        <div className="options-head">
          <button type="button" className="textbtn" disabled={busy} onClick={() => onResetWishes(block.cookDay)}>Сбросить пожелания</button>
        </div>
      )}
      {wished.length > 0 && list(wished)}
      {wished.length > 0 && rest.length > 0 && <p className="options-rest">Остальные блюда</p>}
      {rest.length > 0 && list(rest)}
    </>
  )
}
