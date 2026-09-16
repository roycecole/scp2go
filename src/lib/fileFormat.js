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

/** @typedef {'name'|'size'|'lastModified'|'addedAt'} FileSortKey */

/**
 * Sort a *copy* of `files` by the given column, for the sortable file
 * table. Returns the same array reference, unsorted, when `sortKey` is
 * falsy — the table's initial/unsorted state, which is just insertion
 * order. A missing size/lastModified/addedAt (e.g. a folder, or a
 * manually-typed download filename) sorts as if it were smaller than any
 * real value, rather than throwing off the whole column.
 * @param {Array<{name: string, size?: number, lastModified?: number, addedAt?: number}>} files
 * @param {FileSortKey | null} sortKey
 * @param {'asc'|'desc'} sortDir
 * @param {string} [lang]
 */
export function sortFiles(files, sortKey, sortDir, lang) {
  if (!sortKey) return files
  const dir = sortDir === 'desc' ? -1 : 1
  const locale = lang === 'en' ? 'en' : 'zh-Hant'
  const compare =
    sortKey === 'name'
      ? (a, b) => a.name.localeCompare(b.name, locale)
      : (a, b) => numericOrFloor(a[sortKey]) - numericOrFloor(b[sortKey])
  return [...files].sort((a, b) => dir * compare(a, b))
}

/** @param {unknown} v */
function numericOrFloor(v) {
  return typeof v === 'number' && Number.isFinite(v) ? v : -1
}
