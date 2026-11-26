export type Theme = 'system' | 'light' | 'dark'

export function currentTheme(): Theme {
  const set = document.documentElement.dataset.theme
  return set === 'light' || set === 'dark' ? set : 'system'
}
export function applyTheme(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme
  else document.documentElement.dataset.theme = theme
  try {
    if (theme === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', theme)
  } catch { /* The theme still applies until the page is closed. */ }
}
