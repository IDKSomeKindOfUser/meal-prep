import { useEffect, useRef, useState, type ReactNode } from 'react'

const still = () => !Element.prototype.animate || matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A toast that stays on the page while `value` is set. It rises from the bottom
 * edge (CSS `@starting-style`) and, once `value` is cleared, sinks back the same
 * way before it leaves. With reduced motion it appears and leaves at once.
 */
export function Toast<T>({ value, children }: { value: T | null | undefined | false; children: (value: T) => ReactNode }) {
  // The last value is kept so the toast still has its text while it leaves.
  // Wrapped in arrows: the value may itself be a function, which React would call.
  const [kept, setKept] = useState<T | null>(() => (value ? value : null))
  if (value && value !== kept) setKept(() => value)
  const leaving = !value && kept !== null
  const el = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (!leaving) return
    const node = el.current
    if (!node || still()) { setKept(null); return }
    const run = node.animate(
      [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(100%)' }],
      { duration: 220, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' },
    )
    // A toast that comes back mid-exit cancels the run: that is not an error.
    run.finished.then(() => setKept(null), () => {})
    return () => run.cancel()
  }, [leaving])

  // The text is replaced while the toast stays (for example after "undo"): a short bounce shows it is new.
  const shown = useRef(kept)
  useEffect(() => {
    const node = el.current
    if (shown.current !== kept && kept !== null && !leaving && node && !still()) {
      node.animate([{ scale: 0.96 }, { scale: 1 }], { duration: 350, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' })
    }
    shown.current = kept
  }, [kept, leaving])

  if (kept === null) return null
  return <p ref={el} inert={leaving}>{children(kept)}</p>
}
