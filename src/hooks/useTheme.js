import { useEffect } from 'react'

/**
 * Applies the resolved theme to <html data-theme="..."> and, while the
 * preference is 'system', keeps it in sync with prefers-color-scheme
 * changes live (no reload needed).
 * @param {'system'|'light'|'dark'} theme
 */
export function useTheme(theme) {
  useEffect(() => {
    const root = document.documentElement

    if (theme !== 'system') {
      root.setAttribute('data-theme', theme)
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.setAttribute('data-theme', media.matches ? 'dark' : 'light')
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}
