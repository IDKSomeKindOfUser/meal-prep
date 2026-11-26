import { flushSync } from 'react-dom'

/** Name of the dish photo that flies between a card and the dish screen. */
const PHOTO = 'dish-photo'

const still = () => !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Draws a state change as a view transition. `before` names the element that leaves,
 * `after` finds the element that arrives once the new state is drawn.
 */
export function transition(change: () => void, photo?: { before?: Element | null; after?: () => Element | null | undefined }) {
  if (still()) { change(); return }
  const named: HTMLElement[] = []
  const name = (el: Element | null | undefined) => {
    if (el instanceof HTMLElement || el instanceof SVGElement) {
      (el as HTMLElement).style.viewTransitionName = PHOTO
      named.push(el as HTMLElement)
    }
  }
  name(photo?.before)
  const run = document.startViewTransition(() => {
    flushSync(change)
    // The old photo is gone from the page by now, so the name is free.
    if (photo?.after) name(photo.after())
  })
  // A quick second change skips the first transition: that is fine, not an error.
  run.ready.catch(() => {})
  run.finished.catch(() => {}).finally(() => named.forEach((el) => { el.style.viewTransitionName = '' }))
}

/**
 * Moves list rows to their new places as a view transition. Only the named rows
 * and headings move: the page itself does not fade, unlike a screen change.
 */
export function reorder(change: () => void, after?: () => void) {
  if (still()) { flushSync(change); after?.(); return }
  const root = document.documentElement
  root.classList.add('reorder')
  const run = document.startViewTransition(() => flushSync(change))
  // The rows are recreated inside the update, so `after` waits for it rather than a timer.
  run.updateCallbackDone.then(after, after)
  run.ready.catch(() => {})
  run.finished.catch(() => {}).finally(() => root.classList.remove('reorder'))
}

/** The photo in the dish card whose link leads to `hash`. */
export const cardPhoto = (hash: string) => document.querySelector(`a[href="${hash}"]`)?.closest('.dish')?.querySelector('.art')
/** The photo on the dish screen. */
export const heroPhoto = () => document.querySelector('.hero .art')
