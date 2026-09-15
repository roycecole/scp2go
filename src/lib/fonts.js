// @ts-check

const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600&family=Noto+Sans+TC:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap'

const SLOW_EFFECTIVE_TYPES = new Set(['slow-2g', '2g'])

/**
 * Decide whether to load web fonts based on the Network Information API.
 * Progressive enhancement: browsers that don't support the API (Safari,
 * Firefox) always load fonts — we only skip when a slow connection is
 * *positively* detected, never penalize browsers that can't report.
 * @param {{ saveData?: boolean, effectiveType?: string } | undefined | null} connection
 * @returns {boolean}
 */
export function shouldLoadFonts(connection) {
  if (!connection) return true
  if (connection.saveData) return false
  if (connection.effectiveType && SLOW_EFFECTIVE_TYPES.has(connection.effectiveType)) return false
  return true
}

/**
 * Dynamically injects Google Fonts (Roboto + Noto Sans TC + JetBrains Mono)
 * unless the user's connection looks slow. The CSS custom properties in
 * theme.css already list system-font fallbacks, so skipping this call never
 * leaves the UI unstyled — only less pretty on a slow connection.
 */
export function loadFontsIfFastEnough() {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return
  if (!shouldLoadFonts(/** @type {any} */ (navigator).connection)) return

  const preconnect1 = document.createElement('link')
  preconnect1.rel = 'preconnect'
  preconnect1.href = 'https://fonts.googleapis.com'

  const preconnect2 = document.createElement('link')
  preconnect2.rel = 'preconnect'
  preconnect2.href = 'https://fonts.gstatic.com'
  preconnect2.crossOrigin = 'anonymous'

  const stylesheet = document.createElement('link')
  stylesheet.rel = 'stylesheet'
  stylesheet.href = FONTS_URL

  document.head.append(preconnect1, preconnect2, stylesheet)
}
