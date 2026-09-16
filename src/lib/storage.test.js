import { describe, it, expect, beforeEach } from 'vitest'
import { loadState, saveState, sanitizeProfiles } from './storage.js'
import { initialState } from '../state/reducer.js'

function makeMemoryStorage() {
  const store = new Map()
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  }
}

beforeEach(() => {
  globalThis.localStorage = makeMemoryStorage()
})

describe('loadState / saveState', () => {
  it('returns null when nothing is stored', () => {
    expect(loadState()).toBeNull()
  })

  it('round-trips a valid state', () => {
    const state = { ...initialState, host: '1.2.3.4', lang: 'en', theme: 'dark' }
    saveState(state)
    expect(loadState()).toEqual(state)
  })

  it('falls back to initialState.lang for an invalid stored language', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, lang: 'fr' }))
    expect(loadState().lang).toBe(initialState.lang)
  })

  it('falls back to initialState.theme for an invalid stored theme', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, theme: 'purple' }))
    expect(loadState().theme).toBe(initialState.theme)
  })

  it('falls back to initialState.direction for an invalid stored direction', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, direction: 'sideways' }))
    expect(loadState().direction).toBe('upload')
  })

  it('round-trips file size/lastModified metadata when present', () => {
    const state = { ...initialState, files: [{ id: 'f:a.txt', name: 'a.txt', isDir: false, size: 2048, lastModified: 1757894400000 }] }
    saveState(state)
    expect(loadState().files[0]).toMatchObject({ size: 2048, lastModified: 1757894400000 })
  })

  it('drops non-numeric size/lastModified from a stored file entry rather than storing garbage', () => {
    localStorage.setItem(
      'scp2go:state',
      JSON.stringify({ ...initialState, files: [{ id: 'f:a.txt', name: 'a.txt', isDir: false, size: 'huge' }] })
    )
    expect(loadState().files[0]).not.toHaveProperty('size')
  })

  it('round-trips saved profiles, including their nested field validation', () => {
    const state = {
      ...initialState,
      profiles: [{ id: 'p:1', name: 'My Server', host: '1.2.3.4', os: 'nix', direction: 'download' }],
    }
    saveState(state)
    const loaded = loadState()
    expect(loaded.profiles).toHaveLength(1)
    expect(loaded.profiles[0]).toMatchObject({ id: 'p:1', name: 'My Server', host: '1.2.3.4', os: 'nix', direction: 'download' })
  })

  it('drops a malformed profile entry (missing id/name) rather than crashing', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, profiles: [{ host: 'no-id-or-name' }] }))
    expect(loadState().profiles).toEqual([])
  })

  it('sanitizes an invalid enum field inside a stored profile', () => {
    localStorage.setItem(
      'scp2go:state',
      JSON.stringify({ ...initialState, profiles: [{ id: 'p:1', name: 'X', os: 'bogus', transport: 'bogus' }] })
    )
    const profile = loadState().profiles[0]
    expect(profile.os).toBe(initialState.os)
    expect(profile.transport).toBe(initialState.transport)
  })

  it('returns null for corrupted JSON rather than throwing', () => {
    localStorage.setItem('scp2go:state', '{not json')
    expect(loadState()).toBeNull()
  })

  it('sanitizes a malformed files array to []', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, files: 'not-an-array' }))
    expect(loadState().files).toEqual([])
  })

  it('never throws when localStorage.setItem fails', () => {
    globalThis.localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota exceeded')
      },
    }
    expect(() => saveState(initialState)).not.toThrow()
  })

  it('round-trips sshConfigEntries', () => {
    const state = { ...initialState, sshConfigEntries: [{ id: 'c:1', alias: 'myserver', host: '1.2.3.4', port: '22', user: 'ubuntu', key: '' }] }
    saveState(state)
    expect(loadState().sshConfigEntries).toEqual(state.sshConfigEntries)
  })

  it('drops a malformed sshConfigEntries entry (missing id/host)', () => {
    localStorage.setItem('scp2go:state', JSON.stringify({ ...initialState, sshConfigEntries: [{ alias: 'no host or id' }] }))
    expect(loadState().sshConfigEntries).toEqual([])
  })
})

describe('sanitizeProfiles (exported for the profile-import feature)', () => {
  it('validates an array of raw profile-shaped objects', () => {
    const raw = [{ id: 'x', name: 'Imported', host: '1.2.3.4', os: 'nix', transport: 'rsync', direction: 'download' }]
    const result = sanitizeProfiles(raw)
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'x', name: 'Imported', host: '1.2.3.4', os: 'nix', transport: 'rsync', direction: 'download' })
  })

  it('drops entries missing id or name', () => {
    expect(sanitizeProfiles([{ id: 'x' }, { name: 'no id' }])).toEqual([])
  })

  it('returns [] for non-array input', () => {
    expect(sanitizeProfiles('not an array')).toEqual([])
    expect(sanitizeProfiles(null)).toEqual([])
    expect(sanitizeProfiles(undefined)).toEqual([])
  })

  it('sanitizes an invalid enum value inside a raw profile', () => {
    const result = sanitizeProfiles([{ id: 'x', name: 'Y', os: 'bogus' }])
    expect(result[0].os).toBe(initialState.os)
  })
})
