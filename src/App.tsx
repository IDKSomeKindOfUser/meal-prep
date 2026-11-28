import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BookOpen, CalendarDays, ShoppingCart, SlidersHorizontal, Sun } from 'lucide-react'
import { buildMenu } from './app/buildMenu'
import { addDays, dayOfPlan, toIso } from './app/dates'
import { blocks } from './planner/schedule'
import { readForm, type Form } from './app/form'
import { answersFrom, applyToForm, applyToSettings, canDropMilk } from './app/questions'
import { RebuildDialog } from './app/RebuildDialog'
import { makeCatalog } from './app/catalog'
import { useCloud } from './app/cloud'
import { EMPTY_RECIPE, recipeDraft, unfitDishes, type OwnProduct } from './app/own'
import { PricesScreen } from './app/PricesScreen'
import { CreditsScreen } from './app/CreditsScreen'
import { CookScreen } from './app/CookScreen'
import { SLOT } from './app/labels'
import { watchUpdates } from './app/offline'
import { blockDays, DishScreen } from './app/DishScreen'
import { RecipeScreen, clearDraft } from './app/RecipeScreen'
import { RecipesScreen } from './app/RecipesScreen'
import { CardScreen, DishesScreen } from './app/DishesScreen'
import type { DishFilter } from './app/dishes'
import { MAIN_SCREENS, cardHash, dishHash, parseHash, swapHash, type MainScreen } from './app/route'
import { SettingsScreen } from './app/SettingsScreen'
import { ShoppingScreen } from './app/ShoppingScreen'
import { cookedKey, loadState, saveState, type SavedPlan, type SavedState } from './app/storage'
import { pending, stamp } from './app/sync'
import { planKey, undoPlan } from './app/undo'
import { CookSide, SettingsSide, ShoppingSide, SwapSide, TodaySide } from './app/Side'
import { SwapScreen } from './app/SwapScreen'
import { Today } from './app/Today'
import { Toast } from './app/Toast'
import { Week } from './app/Week'
import { Welcome } from './app/Welcome'
import { cardPhoto, heroPhoto, transition } from './app/transition'
import { describeMenu, replaceDish, type Missing } from './planner'
import { SLOTS, type Settings, type Slot } from './planner/types'
const NAV_ICONS: Record<MainScreen, typeof Sun> = { today: Sun, week: CalendarDays, shopping: ShoppingCart, dishes: BookOpen, settings: SlidersHorizontal }

const length = (plan: SavedPlan) => plan.settings.weeks * 7

function useToday(): string {
  const [today, setToday] = useState(() => toIso(new Date()))
  useEffect(() => {
    const update = () => setToday(toIso(new Date()))
    const timer = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  return today
}

export function App() {
  const [state, setStored] = useState(loadState)
  /** An edit by the user. */
  const setState = useCallback((change: (s: SavedState) => SavedState) => setStored((s) => stamp(s, change(s), Date.now())), [])
  const cloud = useCloud(state, setStored)
  const [wanted, setWanted] = useState(() => parseHash(location.hash))
  /** `null`: follow the calendar. */
  const [chosenDay, setChosenDay] = useState<number | null>(null)
  const [shopWeek, setShopWeek] = useState(0)
  const [dishFilter, setDishFilter] = useState<DishFilter>('all')
  const [dishQuery, setDishQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [missing, setMissing] = useState<Missing[]>([])
  /** `previous` is the menu to bring back, `after` the menu it was replaced with. */
  const [message, setMessage] = useState<{ text: string; previous: SavedPlan | null; keepChecked?: boolean; after?: string; form?: Form } | null>(null)
  const [asking, setAsking] = useState(false)
  /** Loads the new version of the app. */
  const [update, setUpdate] = useState<(() => void) | null>(null)
  const [unsaved, setUnsaved] = useState(false)
  /** The screen a dish was opened from. */
  const [origin, setOrigin] = useState<'today' | 'week'>(wanted.screen === 'week' ? 'week' : 'today')
  const current = useRef(wanted)
  /** Where the origin screen was scrolled to. */
  const left = useRef(0)
  const swapFromDish = useRef(false)
  const main = useRef<HTMLElement>(null)
  const today = useToday()
  const { form, plan } = state
  const catalog = useMemo(() => makeCatalog(state.prices, state.own), [state.prices, state.own])

  useEffect(() => watchUpdates((apply) => setUpdate(() => apply)), [])
  useEffect(() => setUnsaved(!saveState(state)), [state])
  useEffect(() => {
    // The browser would restore the position before the new screen is drawn.
    history.scrollRestoration = 'manual'
    const update = () => {
      const next = parseHash(location.hash)
      if (['today', 'week', 'dishes'].includes(current.current.screen)) left.current = scrollY
      current.current = next
      const before = shown.current
      if (next.screen !== 'swap') swapFromDish.current = false
      // From a card to its dish the photo flies into the header, and back again.
      const photo = next.screen === 'dish' && 'block' in next ? { before: cardPhoto(dishHash(next.block, next.slot)), after: heroPhoto }
        : before.screen === 'dish' && 'block' in before ? { before: heroPhoto(), after: () => cardPhoto(dishHash(before.block, before.slot)) }
          : undefined
      transition(() => {
        setWanted(next)
        if (next.screen === 'today' || next.screen === 'week') setOrigin(next.screen)
      }, photo)
    }
    addEventListener('hashchange', update)
    return () => removeEventListener('hashchange', update)
  }, [])

  const unfit = useMemo(() => (plan ? unfitDishes(plan.menu, plan.settings, catalog) : []), [plan, catalog])
  const report = useMemo(() => plan && describeMenu(plan.menu, plan.settings, catalog), [plan, catalog])
  const inMenu = report === null || !('block' in wanted || 'day' in wanted)
    || ('block' in wanted ? wanted.block < report.blocks.length : report.cookings.some((c) => c.day === wanted.day))
  const route = inMenu ? wanted : { screen: 'today' as const }
  const { screen } = route
  const shown = useRef(route)
  useEffect(() => {
    const before = shown.current
    if (JSON.stringify(before) === JSON.stringify(route)) return
    shown.current = route
    // Back from a dish: return to its place in the list.
    const back = 'block' in before && screen === origin ? dishHash(before.block, before.slot)
      : before.screen === 'card' && screen === 'dishes' ? cardHash(before.id) : null
    const link = back ? main.current?.querySelector<HTMLElement>(`a[href="${back}"]`) : null
    scrollTo(0, link ? left.current : 0)
    const target = link ?? main.current?.querySelector<HTMLElement>('h1')
    target?.focus({ preventScroll: true })
  })
  const place = plan && dayOfPlan(plan.start, length(plan), today)
  const day = plan && place ? Math.min(chosenDay ?? place.day, length(plan) - 1) : 0
  const start = plan && place?.state !== 'ended' ? plan.start : today
  // «Собрать меню заново» на экране дня меняет только готовку, из которой еда этого дня.
  // С одной готовкой на всё меню пересобирается всё меню.
  const schedule = plan ? blocks(plan.settings.cookTimes, plan.settings.weeks) : []
  const ownCook = schedule.find((b) => day >= b.firstDay && day < b.firstDay + b.days)?.cookDay
  const rebuildCookDay = place?.state !== 'ended' && schedule.some((b) => b.cookDay !== ownCook) ? ownCook : undefined
  const read = readForm(form)
  const changed = plan !== null && read.ok && JSON.stringify(read.settings) !== JSON.stringify(plan.settings)
  const shownPlan = useMemo(() => planKey(plan), [plan])
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), message.previous ? 12000 : 6000)
    return () => clearTimeout(timer)
  }, [message])
  useEffect(() => {
    if (!message?.previous) return
    // The menu changed in another way, for example on another device: undo would erase that.
    // While a view transition is starting, the previous menu is still shown: that is no change yet.
    if (message.after === undefined) setMessage({ ...message, after: shownPlan })
    else if (message.after !== shownPlan && shownPlan !== planKey(message.previous)) setMessage({ ...message, previous: null })
  }, [message, shownPlan])

  /**
   * `form`: the settings form changed together with the menu, for example by the questions before a rebuild.
   * `onlyCookDay`: only the cooking of that day changes.
   */
  async function build(settings: Settings, first: string, form?: Form, onlyCookDay?: number) {
    const seed = Math.floor(Math.random() * 2 ** 31)
    setBusy(true)
    setMessage(null)
    setMissing([])
    try {
      const answer = await buildMenu({ settings, seed, prices: state.prices, own: state.own, previous: plan?.menu, onlyCookDay })
      if (answer.ok) {
        const next: SavedPlan = { settings, menu: answer.menu, seed, start: first }
        transition(() => setState((s) => ({ ...s, form: form ?? s.form, plan: next })))
        // The new menu is known now, so the check for later changes does not take the old one for it.
        setMessage({ text: onlyCookDay === undefined ? 'Меню собрано.' : 'Готовка собрана заново.', previous: plan, after: planKey(next), ...(form && { form: state.form }) })
        setChosenDay(null)
        location.hash = 'today'
        // The message with undo is at the top, while the button is at the bottom.
        scrollTo(0, 0)
        main.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true })
      } else {
        setMissing(answer.missing)
        location.hash = 'settings'
      }
    } catch {
      setMessage({ text: 'Меню не собралось из-за ошибки. Попробуйте ещё раз.', previous: null })
    } finally {
      setBusy(false)
    }
  }

  function replace(block: number, slot: Slot, recipeId: string) {
    if (!plan || busy) return
    // The latest plan: the cloud may have brought changes since this screen was drawn.
    setState((s) => s.plan ? { ...s, plan: { ...s.plan, edited: true, cooked: s.plan.cooked?.filter((k) => k !== cookedKey(block, slot)), menu: replaceDish(s.plan.menu, block, slot, recipeId, s.plan.settings, catalog) } } : s)
    setMessage({ text: 'Блюдо заменено, калории, белок и чек пересчитаны.', previous: plan, keepChecked: true })
    // Keeps "back" on the dish leading to the screen it was opened from.
    if (swapFromDish.current) history.back()
    else location.replace(dishHash(block, slot))
  }

  function saveProduct(product: OwnProduct) {
    setState((s) => {
      const { products } = s.own
      const exists = products.some((p) => p.id === product.id)
      return { ...s, own: { ...s.own, products: exists ? products.map((p) => (p.id === product.id ? product : p)) : [...products, product] } }
    })
  }
  const edited = route.screen === 'recipe' ? state.own.recipes.find((r) => r.id === route.id) : undefined

  const period = plan?.settings.weeks === 4 ? 'Месяц' : 'Неделя'
  const card = route.screen === 'card' ? catalog.recipes.find((r) => r.id === route.id) : undefined
  const titles: Record<MainScreen | 'prices' | 'recipes' | 'recipe' | 'credits' | 'card', string> = {
    dishes: 'Рецепты', card: card?.name ?? 'Рецепты', recipes: 'Свои рецепты', recipe: edited?.name ?? 'Новый рецепт', today: 'Сегодня', week: period, shopping: 'Покупки', prices: 'Цены', credits: 'Авторы фото', settings: 'Настройки',
  }
  const links = plan ? MAIN_SCREENS : MAIN_SCREENS.filter((s) => s === 'today' || s === 'dishes' || s === 'settings')
  useEffect(() => { document.title = `${route.screen === 'cook' ? 'Готовка' : 'block' in route && report ? `${route.screen === 'swap' ? 'Замена: ' : ''}${report.blocks[route.block]!.day.dishes[SLOTS.indexOf(route.slot)]!.recipe.name}` : titles[screen as keyof typeof titles]} · Prepka` })

  return (
    <>
      <button type="button" className="skip" onClick={() => main.current?.querySelector<HTMLElement>('h1')?.focus()}>Перейти к содержимому</button>
      <a className="brand" href="#today" onClick={() => setChosenDay(null)}>
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <rect x="6" y="4" width="6" height="25" rx="3" />
          <path fillRule="evenodd" d="M17 3.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 1 0 0-19zM17 8a5 5 0 1 1 0 10a5 5 0 1 1 0-10z" />
          <circle cx="17" cy="13" r="2.4" />
        </svg>
        Prepka
      </a>
      <nav aria-label="Разделы">
        {links.map((s) => (
          <a key={s} href={`#${s}`} aria-current={s === screen ? 'page' : ('block' in route && s === origin) || ((screen === 'recipes' || screen === 'recipe') && s === 'settings') || (screen === 'card' && s === 'dishes') ? 'true' : undefined}
            onClick={() => { if (s === 'today') setChosenDay(null) }}>
            {(() => { const Icon = NAV_ICONS[s]; return <Icon aria-hidden="true" /> })()}
            {titles[s]}
          </a>
        ))}
      </nav>
      <main ref={main}>
        <div className="toasts" role="status">
          <Toast value={message}>{(message) => (
            <>
              <span className="msg">{message.text}</span>
              <span className="acts">
              {message.previous && (
                <button type="button" onClick={() => {
                  const { previous, keepChecked = false } = message
                  if (!previous) return
                  // Карточки меняются на прошлые плавным перетеканием, а не скачком.
                  transition(() => setState((s) => ({ ...s, form: message.form ?? s.form, plan: undoPlan(s.plan, previous, keepChecked) })))
                  setMessage({ text: 'Прошлое меню возвращено.', previous: null })
                }}>Вернуть прошлое</button>
              )}
              <button type="button" className="quiet" onClick={() => setMessage(null)}>Скрыть</button>
              </span>
            </>
          )}</Toast>
          <Toast value={update}>{(update) => <><span className="msg">Есть новая версия планировщика.</span><span className="acts"><button type="button" onClick={update}>Обновить</button></span></>}</Toast>
          <Toast value={unsaved}>{() => 'Браузер не даёт сохранять данные: после закрытия страницы меню пропадёт.'}</Toast>
        </div>
        {plan && report && unfit.length > 0 && (
          <div className="status">
            <div className="unfit">
              <p>После правок эти блюда не подходят под ограничения меню. Замените их:</p>
              <ul>
                {unfit.map(({ block, slot, recipe }) => (
                  <li key={`${block}-${slot}`}>
                    <a href={swapHash(block, slot)}>{recipe.name} ({SLOT[slot].toLowerCase()}, {blockDays(plan.start, report.blocks[block]!.block)})</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="page">
          <div>
          {screen === 'settings' ? (
            <SettingsScreen form={form} own={state.own} onForm={(f) => { setMissing([]); setState((s) => ({ ...s, form: f })) }} start={start} changed={changed}
              busy={busy} missing={missing} onBuild={build} cloud={cloud} unsent={pending(state)} wizard={plan === null} />
          ) : route.screen === 'prices' ? (
            <PricesScreen overrides={state.prices} onChange={(prices) => setState((s) => ({ ...s, prices }))} />
          ) : route.screen === 'credits' ? (
            <CreditsScreen />
          ) : route.screen === 'dishes' ? (
            <DishesScreen catalog={catalog} today={today} filter={dishFilter} onFilter={setDishFilter} query={dishQuery} onQuery={setDishQuery} />
          ) : route.screen === 'card' ? (
            card ? <CardScreen key={card.id} recipe={card} catalog={catalog} isOwn={state.own.recipes.some((r) => r.id === card.id)} />
              : <><div className="top"><a className="back" href="#dishes">Назад к рецептам</a></div><header><h1 tabIndex={-1}>Рецепт не найден</h1><p className="sub">Возможно, его удалили.</p></header></>
          ) : route.screen === 'recipes' ? (
            <RecipesScreen own={state.own} busy={busy} onProduct={saveProduct}
              onDeleteProduct={(id) => setState((s) => ({
                ...s, own: { ...s.own, products: s.own.products.filter((p) => p.id !== id) },
                form: { ...s.form, excluded: s.form.excluded.filter((x) => x !== id) },
              }))} />
          ) : route.screen === 'recipe' ? (
            <RecipeScreen key={route.id} id={route.id} exists={edited !== undefined} own={state.own} catalog={catalog} busy={busy}
              saved={edited ? recipeDraft(edited, catalog.ingredient) : EMPTY_RECIPE}
              inMenu={plan !== null && plan.menu.some((row) => SLOTS.some((s) => row[s] === route.id))} onProduct={saveProduct}
              onSave={(recipe) => {
                const { recipes } = state.own
                setState((s) => ({ ...s, own: { ...s.own, recipes: edited ? recipes.map((r) => (r.id === recipe.id ? recipe : r)) : [...recipes, recipe] } }))
                clearDraft(route.id)
                setMessage({
                  text: edited ? 'Рецепт сохранён.' : 'Рецепт добавлен и участвует в следующей сборке меню. В готовое меню его ставит кнопка «Заменить блюдо».',
                  previous: null,
                })
                location.hash = 'recipes'
              }}
              onDelete={() => {
                // The previous menu may contain this recipe, so it can no longer be restored.
                setMessage({ text: 'Рецепт удалён.', previous: null })
                setState((s) => ({ ...s, own: { ...s.own, recipes: s.own.recipes.filter((r) => r.id !== route.id) } }))
                clearDraft(route.id)
                location.hash = 'recipes'
              }} />
          ) : !plan || !report ? (
            <Welcome />
          ) : route.screen === 'dish' ? (
            <DishScreen plan={plan} report={report} catalog={catalog} isOwn={(id) => state.own.recipes.some((r) => r.id === id)} block={route.block} slot={route.slot} origin={origin}
              onSwap={() => { swapFromDish.current = true }}
              onCooked={(key, cooked) => setState((s) => s.plan ? { ...s, plan: { ...s.plan, cooked: cooked ? [...new Set([...(s.plan.cooked ?? []), key])] : (s.plan.cooked ?? []).filter((k) => k !== key) } } : s)} />
          ) : route.screen === 'swap' ? (
            <SwapScreen plan={plan} report={report} catalog={catalog} block={route.block} slot={route.slot} busy={busy}
              onBack={(e) => { if (swapFromDish.current) { e.preventDefault(); history.back() } }}
              onChoose={(id) => replace(route.block, route.slot, id)}
              onResetWishes={(cookDay) => {
                // Пустые пожелания этой готовки перекрывают общие, подсветка пропадает только здесь.
                setState((s) => s.plan ? { ...s, plan: { ...s.plan, settings: applyToSettings(s.plan.settings, answersFrom(undefined), cookDay) } } : s)
                setMessage({ text: 'Пожелания сброшены, блюда идут по близости к норме.', previous: null })
              }} />
          ) : route.screen === 'cook' ? (
            <CookScreen plan={plan} report={report} day={route.day} />
          ) : screen === 'shopping' ? (
            <ShoppingScreen plan={plan} report={report} catalog={catalog} week={Math.min(shopWeek, plan.settings.weeks - 1)} onWeek={setShopWeek}
              onCheck={(key, bought) => setState((s) => s.plan && {
                ...s, plan: { ...s.plan, checked: bought ? [...new Set([...(s.plan.checked ?? []), key])] : (s.plan.checked ?? []).filter((k) => k !== key) },
              } || s)} />
          ) : screen === 'week' ? (
            <Week plan={plan} report={report} today={today} day={day} onDay={setChosenDay}
              onOpenDay={(d) => { setChosenDay(d); location.hash = 'today' }} />
          ) : (
            <Today plan={plan} report={report} today={today} day={day} onDay={setChosenDay} busy={busy} onShuffle={() => setAsking(true)} />
          )}
          {asking && plan && (
            <RebuildDialog budget={plan.settings.budget !== null}
              milk={plan.settings.allergens.includes('milk') ? 'banned' : canDropMilk(plan.settings, catalog) ? 'ok' : 'impossible'} onClose={() => setAsking(false)}
              cookDay={rebuildCookDay === undefined ? undefined : addDays(plan.start, rebuildCookDay)}
              onBuild={(answers) => void build(applyToSettings(plan.settings, answers, rebuildCookDay), start, applyToForm(state.form, answers, rebuildCookDay), rebuildCookDay)} />
          )}
          </div>
          {screen === 'settings' ? <SettingsSide plan={plan} />
            : !plan || !report ? null
            : route.screen === 'swap' ? <SwapSide report={report} block={route.block} slot={route.slot} />
            : route.screen === 'cook' ? <CookSide plan={plan} day={route.day} />
            : route.screen === 'dish' ? null
            : screen === 'shopping' ? <ShoppingSide plan={plan} report={report} week={Math.min(shopWeek, plan.settings.weeks - 1)} />
            : screen === 'today' ? <TodaySide plan={plan} report={report} day={day} onDay={setChosenDay} />
            : null}
        </div>
      </main>
    </>
  )
}
