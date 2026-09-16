// @ts-check
import { initialState, PROFILE_FIELDS } from '../state/reducer.js'

const STORAGE_KEY = 'scp2go:state'
const THEMES = new Set(['system', 'light', 'dark'])
const OS_VALUES = new Set(['win', 'nix'])
const TRANSPORTS = new Set(['scp', 'rsync', 'sftp'])
const LANGS = new Set(['zh-Hant', 'en'])
const DIRECTIONS = new Set(['upload', 'download'])

/**
 * @param {unknown} v
 * @param {string} fallback
 */
function str(v, fallback) {
  return typeof v === 'string' ? v : fallback
}

/**
 * @param {unknown} v
 * @param {boolean} fallback
 */
function bool(v, fallback) {
  return typeof v === 'boolean' ? v : fallback
}

/** @param {unknown} v */
function sanitizeFiles(v) {
  if (!Array.isArray(v)) return []
  return v
    .filter((f) => f && typeof f.name === 'string' && f.name)
    .map((f) => {
      const entry = { id: `${f.isDir ? 'd' : 'f'}:${f.name}`, name: f.name, isDir: Boolean(f.isDir) }
      if (typeof f.size === 'number' && Number.isFinite(f.size)) entry.size = f.size
      if (typeof f.lastModified === 'number' && Number.isFinite(f.lastModified)) entry.lastModified = f.lastModified
      return entry
    })
}

/**
 * Validate one profile field against the same rule the main state uses for
 * it, so a saved profile can never carry a value the rest of the app
 * wouldn't otherwise accept.
 * @param {string} field
 * @param {unknown} value
 */
function sanitizeProfileField(field, value) {
  switch (field) {
    case 'os':
      return OS_VALUES.has(/** @type {any} */ (value)) ? value : initialState.os
    case 'transport':
      return TRANSPORTS.has(/** @type {any} */ (value)) ? value : initialState.transport
    case 'direction':
      return DIRECTIONS.has(/** @type {any} */ (value)) ? value : initialState.direction
    case 'optMkdir':
    case 'optRecursive':
    case 'optChmod':
    case 'optTestConn':
    case 'optDryRun':
    case 'optIcaclsFix':
    case 'optDelete':
    case 'optProgress':
    case 'optKnownHosts':
    case 'optPartial':
    case 'optSshLogin':
    case 'optAgentForward':
    case 'optChecksum':
      return bool(value, /** @type {any} */ (initialState)[field])
    default:
      return str(/** @type {any} */ (value), /** @type {any} */ (initialState)[field])
  }
}

/**
 * Validate a raw array of profiles against the known profile shape. Exported
 * so the profile-import feature (an untrusted file upload — the same trust
 * boundary as localStorage content) can reuse the exact same rules rather
 * than re-implementing them.
 * @param {unknown} v
 */
export function sanitizeProfiles(v) {
  if (!Array.isArray(v)) return []
  return v
    .filter((p) => p && typeof p.id === 'string' && p.id && typeof p.name === 'string' && p.name)
    .map((p) => {
      /** @type {Record<string, any>} */
      const profile = { id: p.id, name: p.name }
      for (const field of PROFILE_FIELDS) profile[field] = sanitizeProfileField(field, p[field])
      return profile
    })
}

/** @param {unknown} v */
function sanitizeSshConfigEntries(v) {
  if (!Array.isArray(v)) return []
  return v
    .filter((e) => e && typeof e.id === 'string' && e.id && typeof e.host === 'string' && e.host)
    .map((e) => ({
      id: e.id,
      alias: str(e.alias, ''),
      host: e.host,
      port: str(e.port, initialState.port),
      user: str(e.user, initialState.user),
      key: str(e.key, ''),
    }))
}

/**
 * Validate/coerce a raw parsed object against the known state shape,
 * falling back field-by-field to initialState. Never trusts stored content
 * outright — it may be from an older schema or hand-edited.
 * @param {any} raw
 * @returns {typeof initialState}
 */
function sanitize(raw) {
  if (!raw || typeof raw !== 'object') return initialState
  return {
    host: str(raw.host, initialState.host),
    port: str(raw.port, initialState.port),
    user: str(raw.user, initialState.user),
    key: str(raw.key, initialState.key),
    srcDir: str(raw.srcDir, initialState.srcDir),
    dest: str(raw.dest, initialState.dest),
    files: sanitizeFiles(raw.files),
    os: OS_VALUES.has(raw.os) ? raw.os : initialState.os,
    transport: TRANSPORTS.has(raw.transport) ? raw.transport : initialState.transport,
    direction: DIRECTIONS.has(raw.direction) ? raw.direction : initialState.direction,
    optMkdir: bool(raw.optMkdir, initialState.optMkdir),
    optRecursive: bool(raw.optRecursive, initialState.optRecursive),
    optChmod: bool(raw.optChmod, initialState.optChmod),
    optTestConn: bool(raw.optTestConn, initialState.optTestConn),
    optDryRun: bool(raw.optDryRun, initialState.optDryRun),
    optIcaclsFix: bool(raw.optIcaclsFix, initialState.optIcaclsFix),
    optDelete: bool(raw.optDelete, initialState.optDelete),
    optProgress: bool(raw.optProgress, initialState.optProgress),
    optKnownHosts: bool(raw.optKnownHosts, initialState.optKnownHosts),
    optPartial: bool(raw.optPartial, initialState.optPartial),
    optSshLogin: bool(raw.optSshLogin, initialState.optSshLogin),
    optAgentForward: bool(raw.optAgentForward, initialState.optAgentForward),
    optChecksum: bool(raw.optChecksum, initialState.optChecksum),
    excludePatterns: str(raw.excludePatterns, initialState.excludePatterns),
    configAlias: str(raw.configAlias, initialState.configAlias),
    buildCommand: str(raw.buildCommand, initialState.buildCommand),
    restartCommand: str(raw.restartCommand, initialState.restartCommand),
    theme: THEMES.has(raw.theme) ? raw.theme : initialState.theme,
    lang: LANGS.has(raw.lang) ? raw.lang : initialState.lang,
    profiles: sanitizeProfiles(raw.profiles),
    sshConfigEntries: sanitizeSshConfigEntries(raw.sshConfigEntries),
  }
}

/**
 * Best-effort load of persisted state (FR-8.2). Never throws; returns null
 * if nothing usable is stored so the caller can fall back to initialState.
 * @returns {typeof initialState | null}
 */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitize(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * Best-effort persist of state. Never throws (storage disabled, quota
 * exceeded, private-browsing restrictions, etc. all fail silently).
 * @param {object} state
 */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // persistence is best-effort per FR-8.2 — ignore failures
  }
}
