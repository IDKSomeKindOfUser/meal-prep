/** Конфетти по действию пользователя. Библиотека грузится только в этот момент. */
export function celebrate(): void {
  void import('canvas-confetti').then(({ default: confetti }) => {
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 }, disableForReducedMotion: true })
  }, () => {})
}
