// @ts-check
import { applyOraclePreset, applySshKeyPreset } from '../lib/presets.js'

/** @typedef {{ id: string, name: string, isDir: boolean, size?: number, lastModified?: number, addedAt?: number }} FileEntry */
/** @typedef {'upload'|'download'} Direction */
/** @typedef {{ id: string, alias: string, host: string, port: string, user: string, key: string }} SshConfigEntry */

/**
 * Fields that make up a saved connection profile — everything
 * connection/transfer-related, excluding `files` (per-session, not part of
 * a reusable profile) and `theme`/`lang`/`profiles` (global UI prefs).
 */
export const PROFILE_FIELDS = /** @type {const} */ ([
  'host',
  'port',
  'user',
  'key',
  'srcDir',
  'dest',
  'os',
  'transport',
  'direction',
  'jumpHost',
  'optMkdir',
  'optRecursive',
  'optChmod',
  'optTestConn',
  'optDryRun',
  'optIcaclsFix',
  'optDelete',
  'optProgress',
  'optKnownHosts',
  'optPartial',
  'optSshLogin',
  'optAgentForward',
  'optChecksum',
  'optBackup',
  'excludePatterns',
  'configAlias',
  'buildCommand',
  'restartCommand',
  'healthCheckCommand',
])

/**
 * @typedef {object} AppState
 * @property {string} host
 * @property {string} port
 * @property {string} user
 * @property {string} key
 * @property {string} srcDir
 * @property {string} dest
 * @property {FileEntry[]} files
 * @property {'win'|'nix'} os
 * @property {'scp'|'rsync'|'sftp'} transport
 * @property {Direction} direction
 * @property {string} jumpHost
 * @property {boolean} optMkdir
 * @property {boolean} optRecursive
 * @property {boolean} optChmod
 * @property {boolean} optTestConn
 * @property {boolean} optDryRun
 * @property {boolean} optIcaclsFix
 * @property {boolean} optDelete
 * @property {boolean} optProgress
 * @property {boolean} optKnownHosts
 * @property {boolean} optPartial
 * @property {boolean} optSshLogin
 * @property {boolean} optAgentForward
 * @property {boolean} optChecksum
 * @property {boolean} optBackup
 * @property {string} excludePatterns
 * @property {string} configAlias
 * @property {string} buildCommand
 * @property {string} restartCommand
 * @property {string} healthCheckCommand
 * @property {'system'|'light'|'dark'} theme
 * @property {'zh-Hant'|'en'} lang
 * @property {Array<{id: string, name: string} & Record<string, any>>} profiles
 * @property {SshConfigEntry[]} sshConfigEntries
 */

/** @type {AppState} */
export const initialState = {
  host: '',
  port: '22',
  user: 'ubuntu',
  key: '',
  srcDir: '',
  dest: '~/',
  files: [],
  os: 'win',
  transport: 'scp',
  direction: 'upload',
  jumpHost: '',
  optMkdir: false,
  optRecursive: false,
  optChmod: false,
  optTestConn: false,
  optDryRun: false,
  optIcaclsFix: false,
  optDelete: false,
  optProgress: false,
  optKnownHosts: false,
  optPartial: false,
  optSshLogin: false,
  optAgentForward: false,
  optChecksum: false,
  optBackup: false,
  excludePatterns: '',
  configAlias: '',
  buildCommand: '',
  restartCommand: '',
  healthCheckCommand: '',
  theme: 'system',
  lang: 'zh-Hant',
  profiles: [],
  sshConfigEntries: [],
}

const TOGGLE_OPTIONS = new Set([
  'optMkdir',
  'optRecursive',
  'optChmod',
  'optTestConn',
  'optDryRun',
  'optIcaclsFix',
  'optDelete',
  'optProgress',
  'optKnownHosts',
  'optPartial',
  'optSshLogin',
  'optAgentForward',
  'optChecksum',
  'optBackup',
])
const THEMES = new Set(['system', 'light', 'dark'])
const LANGS = new Set(['zh-Hant', 'en'])
const DIRECTIONS = new Set(['upload', 'download'])

/** @param {string} prefix */
function genId(prefix) {
  return `${prefix}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
}

/**
 * @param {AppState} state
 * @param {any} action
 * @returns {AppState}
 */
export function reducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }

    case 'SET_OS':
      return { ...state, os: action.os === 'nix' ? 'nix' : 'win' }

    case 'SET_TRANSPORT':
      return {
        ...state,
        transport: action.transport === 'rsync' ? 'rsync' : action.transport === 'sftp' ? 'sftp' : 'scp',
      }

    case 'SET_DIRECTION': {
      const direction = DIRECTIONS.has(action.direction) ? action.direction : 'upload'
      // Switching direction clears the file list — a local filename left
      // over from upload mode would otherwise be silently reinterpreted as
      // a remote filename in download mode (or vice versa) with no warning.
      return { ...state, direction, files: [] }
    }

    case 'TOGGLE_OPTION':
      return TOGGLE_OPTIONS.has(action.option) ? { ...state, [action.option]: !state[action.option] } : state

    case 'ADD_FILES': {
      // One timestamp for the whole batch — files dropped/picked together
      // were added together, rather than each getting its own millisecond.
      const now = Date.now()
      /** @type {FileEntry[]} */
      const incoming = action.files.map(
        (/** @type {{name:string,isDir?:boolean,size?:number,lastModified?:number}} */ f) => {
          /** @type {FileEntry} */
          const entry = { id: `${f.isDir ? 'd' : 'f'}:${f.name}`, name: f.name, isDir: Boolean(f.isDir), addedAt: now }
          if (typeof f.size === 'number' && Number.isFinite(f.size)) entry.size = f.size
          if (typeof f.lastModified === 'number' && Number.isFinite(f.lastModified)) entry.lastModified = f.lastModified
          return entry
        }
      )
      const existingIds = new Set(state.files.map((f) => f.id))
      const deduped = incoming.filter((f) => !existingIds.has(f.id))
      if (deduped.length === 0) return state
      // Recognizing a folder auto-enables recursive mode (FR-2.4); this is
      // one-directional — removing the folder later does not un-flip it.
      const hasNewFolder = deduped.some((f) => f.isDir)
      return {
        ...state,
        files: [...state.files, ...deduped],
        optRecursive: state.optRecursive || hasNewFolder,
      }
    }

    case 'REMOVE_FILE':
      return { ...state, files: state.files.filter((f) => f.id !== action.id) }

    case 'CLEAR_FILES':
      return state.files.length === 0 ? state : { ...state, files: [] }

    case 'APPLY_PRESET': {
      const patch = action.preset === 'sshkey' ? applySshKeyPreset(state) : applyOraclePreset()
      return { ...state, ...patch }
    }

    case 'SET_THEME':
      return THEMES.has(action.theme) ? { ...state, theme: action.theme } : state

    case 'SET_LANG':
      return LANGS.has(action.lang) ? { ...state, lang: action.lang } : state

    case 'SAVE_PROFILE': {
      const name = (action.name || '').trim()
      if (!name) return state
      // Auto-fill the SSH-config alias from the profile name when the user
      // hasn't already typed one of their own — keeps the two naming fields
      // in sync without extra typing, without clobbering a deliberate value.
      const configAlias = (state.configAlias || '').trim() ? state.configAlias : name
      const snapshotSource = { ...state, configAlias }
      /** @type {{id: string, name: string} & Record<string, any>} */
      const profile = { id: genId('p'), name }
      for (const field of PROFILE_FIELDS) profile[field] = snapshotSource[field]
      return { ...state, profiles: [...state.profiles, profile], configAlias }
    }

    case 'LOAD_PROFILE': {
      const profile = state.profiles.find((p) => p.id === action.id)
      if (!profile) return state
      const patch = /** @type {Record<string, any>} */ ({})
      for (const field of PROFILE_FIELDS) patch[field] = profile[field]
      return { ...state, ...patch }
    }

    case 'DELETE_PROFILE':
      return { ...state, profiles: state.profiles.filter((p) => p.id !== action.id) }

    case 'IMPORT_PROFILES': {
      // Expects an already-sanitized array (see lib/storage.js's exported
      // sanitizeProfiles, reused by the importing component). Fresh ids are
      // generated so re-importing the same file never collides with — or
      // silently merges into — existing profiles.
      const incoming = Array.isArray(action.profiles) ? action.profiles : []
      if (incoming.length === 0) return state
      const withNewIds = incoming.map((p) => ({ ...p, id: genId('p') }))
      return { ...state, profiles: [...state.profiles, ...withNewIds] }
    }

    case 'ADD_SSH_CONFIG_ENTRY': {
      const host = (state.host || '').trim()
      if (!host) return state
      /** @type {SshConfigEntry} */
      const entry = {
        id: genId('c'),
        alias: state.configAlias || '',
        host,
        port: state.port,
        user: state.user,
        key: state.key,
      }
      return { ...state, sshConfigEntries: [...state.sshConfigEntries, entry], configAlias: '' }
    }

    case 'REMOVE_SSH_CONFIG_ENTRY':
      return { ...state, sshConfigEntries: state.sshConfigEntries.filter((e) => e.id !== action.id) }

    case 'IMPORT_SSH_CONFIG_ENTRIES': {
      // Expects entries already shaped by lib/commandBuilder.js's
      // parseSshConfigText (alias/host/port/user/key, no id) — fresh ids are
      // assigned here, same reasoning as IMPORT_PROFILES.
      const incoming = Array.isArray(action.entries) ? action.entries : []
      if (incoming.length === 0) return state
      const withIds = incoming.map((e) => ({ ...e, id: genId('c') }))
      return { ...state, sshConfigEntries: [...state.sshConfigEntries, ...withIds] }
    }

    default:
      return state
  }
}
