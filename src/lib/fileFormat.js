// @ts-check

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

/**
 * Human-readable file size (binary/1024-based units, matching how OS file
 * managers display sizes). Returns '' for invalid input so callers can
 * simply skip rendering rather than special-casing it themselves.
 * @param {number} [bytes]
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), SIZE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(1)} ${SIZE_UNITS[exponent]}`
}

/**
 * Locale-aware short date+time for a file's last-modified timestamp.
 * @param {number} [timestamp] epoch ms
 * @param {string} [lang]
 * @returns {string}
 */
export function formatFileDate(timestamp, lang) {
  if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) return ''
  const locale = lang === 'en' ? 'en-US' : 'zh-TW'
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp))
  } catch {
    return ''
  }
}
