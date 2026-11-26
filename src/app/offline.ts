/** Makes the built app work offline and reports a downloaded new version. */
export function watchUpdates(onUpdate: (apply: () => void) => void) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
  const { serviceWorker } = navigator
  // On the first visit there is no old version to replace, until the user asks for a newer one.
  let updating = serviceWorker.controller !== null
  serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload() })
  serviceWorker.register('/sw.js').then((registration) => {
    const report = () => {
      const { waiting } = registration
      if (waiting && serviceWorker.controller) onUpdate(() => { updating = true; waiting.postMessage('update') })
    }
    report()
    registration.addEventListener('updatefound', () => {
      registration.installing?.addEventListener('statechange', report)
    })
  }, () => {
    // Without the worker the app works as usual, but only online.
  })
}
