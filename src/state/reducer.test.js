import { describe, it, expect } from 'vitest'
import { reducer, initialState } from './reducer.js'

describe('SET_TRANSPORT', () => {
  it('accepts scp, rsync, and sftp', () => {
    expect(reducer(initialState, { type: 'SET_TRANSPORT', transport: 'rsync' }).transport).toBe('rsync')
    expect(reducer(initialState, { type: 'SET_TRANSPORT', transport: 'sftp' }).transport).toBe('sftp')
    expect(reducer(initialState, { type: 'SET_TRANSPORT', transport: 'scp' }).transport).toBe('scp')
  })

  it('falls back to scp for an unrecognized value, never silently landing on sftp', () => {
    expect(reducer(initialState, { type: 'SET_TRANSPORT', transport: 'bogus' }).transport).toBe('scp')
  })
})

describe('ADD_FILES', () => {
  it('dedupes by name+isDir', () => {
    let state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'a.txt', isDir: false }] })
    state = reducer(state, { type: 'ADD_FILES', files: [{ name: 'a.txt', isDir: false }] })
    expect(state.files).toHaveLength(1)
  })

  it('allows the same name once as a file and once as a folder', () => {
    let state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'x', isDir: false }] })
    state = reducer(state, { type: 'ADD_FILES', files: [{ name: 'x', isDir: true }] })
    expect(state.files).toHaveLength(2)
  })

  it('preserves size/lastModified when the browser supplied real File metadata', () => {
    const state = reducer(initialState, {
      type: 'ADD_FILES',
      files: [{ name: 'a.txt', isDir: false, size: 2048, lastModified: 1757894400000 }],
    })
    expect(state.files[0]).toMatchObject({ size: 2048, lastModified: 1757894400000 })
  })

  it('omits size/lastModified when not supplied (e.g. a folder, or a manually-typed download filename)', () => {
    const state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'dir1', isDir: true }] })
    expect(state.files[0]).not.toHaveProperty('size')
    expect(state.files[0]).not.toHaveProperty('lastModified')
  })

  it('ignores non-numeric size/lastModified rather than storing garbage', () => {
    const state = reducer(initialState, {
      type: 'ADD_FILES',
      files: [{ name: 'a.txt', isDir: false, size: 'huge', lastModified: NaN }],
    })
    expect(state.files[0]).not.toHaveProperty('size')
    expect(state.files[0]).not.toHaveProperty('lastModified')
  })

  it('auto-enables optRecursive one-directionally when a folder is added', () => {
    let state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'dir1', isDir: true }] })
    expect(state.optRecursive).toBe(true)
    state = reducer(state, { type: 'REMOVE_FILE', id: 'd:dir1' })
    expect(state.files).toHaveLength(0)
    expect(state.optRecursive).toBe(true)
  })

  it('does not touch optRecursive when only plain files are added', () => {
    const state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'a.txt', isDir: false }] })
    expect(state.optRecursive).toBe(false)
  })

  it('stamps addedAt with the current time, ignoring any caller-supplied value', () => {
    const before = Date.now()
    const state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'a.txt', isDir: false, addedAt: 1 }] })
    expect(state.files[0].addedAt).toBeGreaterThanOrEqual(before)
    expect(state.files[0].addedAt).toBeLessThanOrEqual(Date.now())
  })

  it('gives every file in the same batch the same addedAt timestamp', () => {
    const state = reducer(initialState, {
      type: 'ADD_FILES',
      files: [
        { name: 'a.txt', isDir: false },
        { name: 'b.txt', isDir: false },
      ],
    })
    expect(state.files[0].addedAt).toBe(state.files[1].addedAt)
  })
})

describe('REMOVE_FILE', () => {
  it('removes only the matching id', () => {
    let state = reducer(initialState, {
      type: 'ADD_FILES',
      files: [
        { name: 'a', isDir: false },
        { name: 'b', isDir: false },
      ],
    })
    state = reducer(state, { type: 'REMOVE_FILE', id: 'f:a' })
    expect(state.files.map((f) => f.name)).toEqual(['b'])
  })
})

describe('CLEAR_FILES', () => {
  it('empties the file list in one step', () => {
    let state = reducer(initialState, {
      type: 'ADD_FILES',
      files: [
        { name: 'a', isDir: false },
        { name: 'b', isDir: true },
      ],
    })
    state = reducer(state, { type: 'CLEAR_FILES' })
    expect(state.files).toEqual([])
  })

  it('does not touch optRecursive, matching REMOVE_FILE’s one-directional behavior', () => {
    let state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'dir1', isDir: true }] })
    state = reducer(state, { type: 'CLEAR_FILES' })
    expect(state.optRecursive).toBe(true)
  })

  it('returns the same state reference when the list is already empty (no-op)', () => {
    expect(reducer(initialState, { type: 'CLEAR_FILES' })).toBe(initialState)
  })
})

describe('APPLY_PRESET', () => {
  it('oracle preset sets user/port/dest and enables known-hosts + test-connection', () => {
    const state = reducer({ ...initialState, user: 'x', port: '2222', dest: '/tmp' }, { type: 'APPLY_PRESET', preset: 'oracle' })
    expect(state.user).toBe('ubuntu')
    expect(state.port).toBe('22')
    expect(state.dest).toBe('~/')
    expect(state.optKnownHosts).toBe(true)
    expect(state.optTestConn).toBe(true)
  })

  it('sshkey preset sets dest/toggles/srcDir based on os', () => {
    const state = reducer({ ...initialState, os: 'win' }, { type: 'APPLY_PRESET', preset: 'sshkey' })
    expect(state.dest).toBe('~/.ssh/')
    expect(state.optMkdir).toBe(true)
    expect(state.optChmod).toBe(true)
    expect(state.srcDir).toBe('C:\\Users\\<username>\\.ssh')
  })

  it('sshkey preset guesses a nix folder on nix', () => {
    const state = reducer({ ...initialState, os: 'nix' }, { type: 'APPLY_PRESET', preset: 'sshkey' })
    expect(state.srcDir).toBe('~/.ssh')
  })
})

describe('other actions', () => {
  it('SET_FIELD sets an arbitrary field', () => {
    expect(reducer(initialState, { type: 'SET_FIELD', field: 'host', value: '1.2.3.4' }).host).toBe('1.2.3.4')
  })
  it('TOGGLE_OPTION flips a known option', () => {
    expect(reducer(initialState, { type: 'TOGGLE_OPTION', option: 'optChmod' }).optChmod).toBe(true)
  })
  it('TOGGLE_OPTION flips optBackup', () => {
    expect(reducer(initialState, { type: 'TOGGLE_OPTION', option: 'optBackup' }).optBackup).toBe(true)
  })
  it('TOGGLE_OPTION ignores an unknown option', () => {
    expect(reducer(initialState, { type: 'TOGGLE_OPTION', option: 'notReal' })).toBe(initialState)
  })
  it('SET_THEME ignores an invalid value', () => {
    expect(reducer(initialState, { type: 'SET_THEME', theme: 'purple' }).theme).toBe('system')
  })
  it('SET_LANG sets a known language', () => {
    expect(reducer(initialState, { type: 'SET_LANG', lang: 'en' }).lang).toBe('en')
  })
  it('SET_LANG ignores an invalid value', () => {
    expect(reducer(initialState, { type: 'SET_LANG', lang: 'fr' }).lang).toBe('zh-Hant')
  })
})

describe('SET_DIRECTION', () => {
  it('sets direction and clears the file list', () => {
    let state = reducer(initialState, { type: 'ADD_FILES', files: [{ name: 'a.txt', isDir: false }] })
    state = reducer(state, { type: 'SET_DIRECTION', direction: 'download' })
    expect(state.direction).toBe('download')
    expect(state.files).toEqual([])
  })
  it('coerces an invalid value to upload', () => {
    expect(reducer(initialState, { type: 'SET_DIRECTION', direction: 'sideways' }).direction).toBe('upload')
  })
  it('clears files even when switching back to upload', () => {
    let state = { ...initialState, direction: 'download' }
    state = reducer(state, { type: 'ADD_FILES', files: [{ name: 'remote.txt', isDir: false }] })
    state = reducer(state, { type: 'SET_DIRECTION', direction: 'upload' })
    expect(state.files).toEqual([])
  })
})

describe('connection profiles', () => {
  const withConnection = { ...initialState, host: '1.2.3.4', user: 'alice', port: '2222' }

  it('SAVE_PROFILE snapshots the connection fields under a new id', () => {
    const state = reducer(withConnection, { type: 'SAVE_PROFILE', name: 'My Server' })
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0]).toMatchObject({ name: 'My Server', host: '1.2.3.4', user: 'alice', port: '2222' })
    expect(state.profiles[0].id).toBeTruthy()
  })

  it('SAVE_PROFILE ignores a blank name', () => {
    expect(reducer(withConnection, { type: 'SAVE_PROFILE', name: '   ' })).toBe(withConnection)
  })

  it('SAVE_PROFILE/LOAD_PROFILE round-trip jumpHost, optBackup, and healthCheckCommand', () => {
    const withExtras = { ...withConnection, jumpHost: 'bastion.example.com', optBackup: true, healthCheckCommand: 'curl -f x' }
    let state = reducer(withExtras, { type: 'SAVE_PROFILE', name: 'My Server' })
    expect(state.profiles[0]).toMatchObject({
      jumpHost: 'bastion.example.com',
      optBackup: true,
      healthCheckCommand: 'curl -f x',
    })
    const savedId = state.profiles[0].id
    state = reducer({ ...state, jumpHost: '', optBackup: false, healthCheckCommand: '' }, { type: 'LOAD_PROFILE', id: savedId })
    expect(state.jumpHost).toBe('bastion.example.com')
    expect(state.optBackup).toBe(true)
    expect(state.healthCheckCommand).toBe('curl -f x')
  })

  it('LOAD_PROFILE merges a saved snapshot into state, leaving files/theme/lang untouched', () => {
    let state = reducer(withConnection, { type: 'SAVE_PROFILE', name: 'My Server' })
    const savedId = state.profiles[0].id
    state = reducer(state, { type: 'SET_FIELD', field: 'host', value: '9.9.9.9' })
    state = { ...state, theme: 'dark', lang: 'en', files: [{ id: 'f:x', name: 'x', isDir: false }] }
    state = reducer(state, { type: 'LOAD_PROFILE', id: savedId })
    expect(state.host).toBe('1.2.3.4')
    expect(state.user).toBe('alice')
    expect(state.theme).toBe('dark')
    expect(state.lang).toBe('en')
    expect(state.files).toEqual([{ id: 'f:x', name: 'x', isDir: false }])
  })

  it('LOAD_PROFILE with an unknown id is a no-op', () => {
    expect(reducer(withConnection, { type: 'LOAD_PROFILE', id: 'nope' })).toBe(withConnection)
  })

  it('DELETE_PROFILE removes only the matching profile', () => {
    let state = reducer(withConnection, { type: 'SAVE_PROFILE', name: 'A' })
    state = reducer(state, { type: 'SAVE_PROFILE', name: 'B' })
    const idToDelete = state.profiles[0].id
    state = reducer(state, { type: 'DELETE_PROFILE', id: idToDelete })
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0].name).toBe('B')
  })

  it('IMPORT_PROFILES appends imported profiles with fresh ids', () => {
    const imported = [{ id: 'external-id', name: 'Imported', host: '5.5.5.5' }]
    const state = reducer(initialState, { type: 'IMPORT_PROFILES', profiles: imported })
    expect(state.profiles).toHaveLength(1)
    expect(state.profiles[0].name).toBe('Imported')
    expect(state.profiles[0].id).not.toBe('external-id')
  })

  it('IMPORT_PROFILES regenerates a different id on each import, even of the same file', () => {
    const imported = [{ id: 'external-id', name: 'Imported', host: '5.5.5.5' }]
    let state = reducer(initialState, { type: 'IMPORT_PROFILES', profiles: imported })
    state = reducer(state, { type: 'IMPORT_PROFILES', profiles: imported })
    expect(state.profiles).toHaveLength(2)
    expect(state.profiles[0].id).not.toBe(state.profiles[1].id)
  })

  it('IMPORT_PROFILES is a no-op for an empty or non-array payload', () => {
    expect(reducer(initialState, { type: 'IMPORT_PROFILES', profiles: [] })).toBe(initialState)
    expect(reducer(initialState, { type: 'IMPORT_PROFILES', profiles: 'not-an-array' })).toBe(initialState)
  })
})

describe('SSH config entries', () => {
  const withConnection = { ...initialState, host: '1.2.3.4', user: 'alice', port: '2222', key: 'k', configAlias: 'myalias' }

  it('ADD_SSH_CONFIG_ENTRY snapshots the current connection fields and clears the draft alias', () => {
    const state = reducer(withConnection, { type: 'ADD_SSH_CONFIG_ENTRY' })
    expect(state.sshConfigEntries).toHaveLength(1)
    expect(state.sshConfigEntries[0]).toMatchObject({ alias: 'myalias', host: '1.2.3.4', user: 'alice', port: '2222', key: 'k' })
    expect(state.configAlias).toBe('')
  })

  it('ADD_SSH_CONFIG_ENTRY is a no-op when host is blank', () => {
    expect(reducer(initialState, { type: 'ADD_SSH_CONFIG_ENTRY' })).toBe(initialState)
  })

  it('REMOVE_SSH_CONFIG_ENTRY removes only the matching entry', () => {
    let state = reducer(withConnection, { type: 'ADD_SSH_CONFIG_ENTRY' })
    state = reducer({ ...state, host: '9.9.9.9' }, { type: 'ADD_SSH_CONFIG_ENTRY' })
    expect(state.sshConfigEntries).toHaveLength(2)
    const idToRemove = state.sshConfigEntries[0].id
    state = reducer(state, { type: 'REMOVE_SSH_CONFIG_ENTRY', id: idToRemove })
    expect(state.sshConfigEntries).toHaveLength(1)
    expect(state.sshConfigEntries[0].host).toBe('9.9.9.9')
  })

  it('IMPORT_SSH_CONFIG_ENTRIES appends parsed entries with fresh ids', () => {
    const parsed = [{ alias: 'a', host: '1.1.1.1', port: '22', user: 'ubuntu', key: '' }]
    const state = reducer(initialState, { type: 'IMPORT_SSH_CONFIG_ENTRIES', entries: parsed })
    expect(state.sshConfigEntries).toHaveLength(1)
    expect(state.sshConfigEntries[0]).toMatchObject(parsed[0])
    expect(state.sshConfigEntries[0].id).toBeTruthy()
  })

  it('IMPORT_SSH_CONFIG_ENTRIES is a no-op for an empty or non-array payload', () => {
    expect(reducer(initialState, { type: 'IMPORT_SSH_CONFIG_ENTRIES', entries: [] })).toBe(initialState)
    expect(reducer(initialState, { type: 'IMPORT_SSH_CONFIG_ENTRIES', entries: 'nope' })).toBe(initialState)
  })
})

describe('SAVE_PROFILE auto-fills the SSH config alias', () => {
  it('fills configAlias from the profile name when it was blank', () => {
    const state = reducer(initialState, { type: 'SAVE_PROFILE', name: 'My Server' })
    expect(state.configAlias).toBe('My Server')
    expect(state.profiles[0].configAlias).toBe('My Server')
  })

  it('does not clobber a configAlias the user already typed', () => {
    const withAlias = { ...initialState, configAlias: 'custom-alias' }
    const state = reducer(withAlias, { type: 'SAVE_PROFILE', name: 'My Server' })
    expect(state.configAlias).toBe('custom-alias')
    expect(state.profiles[0].configAlias).toBe('custom-alias')
  })
})
