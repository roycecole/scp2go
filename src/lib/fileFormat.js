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

/** @typedef {'image'|'archive'|'code'|'pdf'|'audio'|'video'|'document'|'file'} FileCategory */

const EXTENSION_CATEGORIES = /** @type {const} */ ({
  image: ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico', 'avif'],
  archive: ['zip', 'tar', 'gz', 'tgz', 'rar', '7z', 'bz2', 'xz'],
  code: ['js', 'jsx', 'ts', 'tsx', 'py', 'rb', 'go', 'java', 'c', 'cpp', 'h', 'cs', 'php', 'sh', 'json', 'yml', 'yaml', 'html', 'css', 'sql'],
  pdf: ['pdf'],
  audio: ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac'],
  video: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
  document: ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'md', 'txt'],
})

/** @type {Map<string, FileCategory>} */
const EXT_TO_CATEGORY = new Map()
for (const [category, exts] of Object.entries(EXTENSION_CATEGORIES)) {
  for (const ext of exts) EXT_TO_CATEGORY.set(ext, /** @type {FileCategory} */ (category))
}

/**
 * Categorizes a filename by its extension, for picking a representative
 * icon in the file table. `'file'` is the generic fallback — an
 * extension-less name, or an extension this tool doesn't recognize.
 * @param {string} name
 * @returns {FileCategory}
 */
export function getFileCategory(name) {
  const match = /\.([a-z0-9]+)$/i.exec(name || '')
  if (!match) return 'file'
  return EXT_TO_CATEGORY.get(match[1].toLowerCase()) || 'file'
}
