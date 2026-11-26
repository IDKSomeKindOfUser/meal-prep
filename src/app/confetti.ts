/**
 * Празднования по действию пользователя. Библиотека грузится только в этот момент.
 * - 'dish': одно блюдо приготовлено, небольшой залп из кнопки.
 * - 'shopping': всё куплено, овощи летят из нижних углов.
 * - 'cooking': вся готовка дня сделана, салют из звёзд.
 */
export type Celebration = 'dish' | 'shopping' | 'cooking'

const colors = () => {
  const style = getComputedStyle(document.documentElement)
  const accent = style.getPropertyValue('--accent').trim() || '#f2a3c7'
  return [accent, '#f6d365', '#7fd49b', '#f7a35c', '#ffffff']
}

export function celebrate(kind: Celebration, from?: Element | null): void {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  void import('canvas-confetti').then(({ default: confetti }) => {
    const palette = colors()
    if (kind === 'dish') {
      const box = from?.getBoundingClientRect()
      const origin = box
        ? { x: (box.left + box.width / 2) / innerWidth, y: (box.top + box.height / 2) / innerHeight }
        : { x: 0.5, y: 0.7 }
      confetti({ particleCount: 45, spread: 65, startVelocity: 28, scalar: 0.8, ticks: 120, origin, colors: palette })
    } else if (kind === 'shopping') {
      const scalar = 2
      const shapes = ['🥕', '🥦', '🍋', '🍅', '🥚'].map((text) => confetti.shapeFromText({ text, scalar }))
      const end = Date.now() + 900
      const side = () => {
        confetti({ particleCount: 3, angle: 60, spread: 50, startVelocity: 55, origin: { x: 0, y: 0.9 }, shapes, scalar, flat: true })
        confetti({ particleCount: 3, angle: 120, spread: 50, startVelocity: 55, origin: { x: 1, y: 0.9 }, shapes, scalar, flat: true })
        if (Date.now() < end) requestAnimationFrame(side)
      }
      side()
    } else {
      const end = Date.now() + 1800
      const burst = () => {
        const x = 0.2 + Math.random() * 0.6
        confetti({ particleCount: 60, spread: 360, startVelocity: 30, ticks: 80, gravity: 0.6, shapes: ['star'], colors: palette, origin: { x, y: 0.2 + Math.random() * 0.25 } })
        if (Date.now() < end) setTimeout(burst, 350)
      }
      burst()
    }
  }, () => {})
}
