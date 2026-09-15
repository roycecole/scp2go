import { describe, it, expect } from 'vitest'
import {
  buildSteps,
  buildCopyAllText,
  buildScriptFile,
  buildSshConfigEntryBlock,
  buildSshConfigExport,
  quoteLocal,
  quoteNested,
  quoteSshConfig,
  joinLocal,
  joinRemote,
} from './commandBuilder.js'

const baseState = {
  host: '161.33.35.40',
  port: '22',
  user: 'ubuntu',
  key: 'C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key',
  srcDir: 'C:\\Users\\you\\.ssh',
  dest: '~/.ssh/',
  files: [
    { name: 'id_ed25519_roycecole', isDir: false },
    { name: 'config', isDir: false },
  ],
  os: 'win',
  transport: 'scp',
  optMkdir: true,
  optRecursive: false,
  optChmod: true,
}

function stepsById(steps) {
  return Object.fromEntries(steps.map((s) => [s.id, s]))
}

describe('buildSteps — spec §5.4 worked example', () => {
  it('reproduces all three steps byte-for-byte', () => {
    const steps = stepsById(buildSteps(baseState))
    expect(steps.mkdir.plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "mkdir -p ~/.ssh/ && chmod 700 ~/.ssh/"'
    )
    expect(steps.upload.plainText).toBe(
      'scp -P 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key C:\\Users\\you\\.ssh\\id_ed25519_roycecole C:\\Users\\you\\.ssh\\config ubuntu@161.33.35.40:~/.ssh/'
    )
    expect(steps.chmod.plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "chmod 600 ~/.ssh/id_ed25519_roycecole ~/.ssh/config && chmod 700 ~/.ssh/"'
    )
  })

  it('copy-all accepts a getLabel override (e.g. for i18n) without touching plainText', () => {
    const steps = buildSteps(baseState)
    const text = buildCopyAllText(steps, (s) => `EN:${s.id}`)
    expect(text).toContain('# EN:mkdir\n')
    expect(text).toContain('# EN:upload\n')
    expect(text).toContain('# EN:chmod\n')
    expect(text).not.toContain('建立遠端目錄')
  })

  it('copy-all matches the spec block format exactly', () => {
    const steps = buildSteps(baseState)
    expect(buildCopyAllText(steps)).toBe(
      [
        '# 建立遠端目錄',
        'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "mkdir -p ~/.ssh/ && chmod 700 ~/.ssh/"',
        '',
        '# 上傳檔案',
        'scp -P 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key C:\\Users\\you\\.ssh\\id_ed25519_roycecole C:\\Users\\you\\.ssh\\config ubuntu@161.33.35.40:~/.ssh/',
        '',
        '# 修正權限（私鑰須 600）',
        'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "chmod 600 ~/.ssh/id_ed25519_roycecole ~/.ssh/config && chmod 700 ~/.ssh/"',
      ].join('\n')
    )
  })
})

describe('empty host', () => {
  it('returns no steps for a blank host', () => {
    expect(buildSteps({ ...baseState, host: '' })).toEqual([])
  })
  it('returns no steps for a whitespace-only host', () => {
    expect(buildSteps({ ...baseState, host: '   ' })).toEqual([])
  })
})

describe('-r recursive flag (scp only)', () => {
  it('rsync never emits -r, even with a folder and optRecursive true', () => {
    const state = {
      ...baseState,
      transport: 'rsync',
      optRecursive: true,
      files: [{ name: 'dir1', isDir: true }],
    }
    const upload = stepsById(buildSteps(state)).upload
    expect(upload.plainText).not.toMatch(/-r\b/)
    expect(upload.plainText.startsWith('rsync -avz')).toBe(true)
  })

  it('scp: folder added, optRecursive false → -r still present', () => {
    const state = { ...baseState, optRecursive: false, files: [{ name: 'dir1', isDir: true }] }
    expect(stepsById(buildSteps(state)).upload.plainText).toContain(' -r ')
  })

  it('scp: no folders, optRecursive true → -r present', () => {
    const state = { ...baseState, optRecursive: true }
    expect(stepsById(buildSteps(state)).upload.plainText).toContain(' -r ')
  })

  it('scp: no folders, optRecursive false → -r absent', () => {
    const state = { ...baseState, optRecursive: false }
    expect(stepsById(buildSteps(state)).upload.plainText).not.toMatch(/\s-r\s/)
  })
})

describe('path joining', () => {
  it('windows join uses backslash', () => {
    expect(joinLocal('C:\\a\\b', 'f.txt', 'win')).toBe('C:\\a\\b\\f.txt')
  })
  it('windows join does not double a trailing separator', () => {
    expect(joinLocal('C:\\a\\b\\', 'f.txt', 'win')).toBe('C:\\a\\b\\f.txt')
  })
  it('nix join uses forward slash', () => {
    expect(joinLocal('/a/b', 'f.txt', 'nix')).toBe('/a/b/f.txt')
  })
  it('nix join does not double a trailing separator', () => {
    expect(joinLocal('/a/b/', 'f.txt', 'nix')).toBe('/a/b/f.txt')
  })
  it('joinRemote always uses forward slash and avoids doubling', () => {
    expect(joinRemote('~/.ssh/', 'config')).toBe('~/.ssh/config')
    expect(joinRemote('~/.ssh', 'config')).toBe('~/.ssh/config')
  })
})

describe('key handling', () => {
  it('blank key omits -i from every step', () => {
    const steps = buildSteps({ ...baseState, key: '' })
    for (const s of steps) expect(s.plainText).not.toMatch(/-i\b/)
  })
  it('whitespace-only key omits -i from every step', () => {
    const steps = buildSteps({ ...baseState, key: '   ' })
    for (const s of steps) expect(s.plainText).not.toMatch(/-i\b/)
  })
  it('non-blank key appears consistently across all steps', () => {
    const steps = buildSteps(baseState)
    for (const s of steps) expect(s.plainText).toContain('-i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key')
  })
})

describe('quoteLocal / quoteNested', () => {
  it('quoteLocal leaves a plain path bare', () => {
    expect(quoteLocal('C:\\a\\b.txt', 'win')).toBe('C:\\a\\b.txt')
  })
  it('quoteLocal wraps a spaced path in double quotes', () => {
    expect(quoteLocal('C:\\a b\\c.txt', 'win')).toBe('"C:\\a b\\c.txt"')
  })
  it('quoteNested leaves a plain remote path bare', () => {
    expect(quoteNested('~/.ssh/config')).toBe('~/.ssh/config')
  })
  it('quoteNested wraps a spaced remote path in single quotes', () => {
    expect(quoteNested('~/My Folder/')).toBe("'~/My Folder/'")
  })
  it("quoteNested escapes an embedded single quote with the '\\'' trick", () => {
    expect(quoteNested("~/It's Mine/")).toBe("'~/It'\\''s Mine/'")
  })
})

describe('edge case A — spaced DEST in step ②\'s user@host:DEST target', () => {
  it('quotes the whole target token as one unit', () => {
    const state = { ...baseState, dest: '~/My Folder/' }
    const upload = stepsById(buildSteps(state)).upload
    expect(upload.plainText).toContain('"ubuntu@161.33.35.40:~/My Folder/"')
  })
})

describe('spaced DEST inside the nested ssh command string (steps ①/③)', () => {
  it('single-quotes DEST inside step ① mkdir', () => {
    const state = { ...baseState, dest: '~/My Folder/' }
    const mkdir = stepsById(buildSteps(state)).mkdir
    expect(mkdir.plainText).toContain(`"mkdir -p '~/My Folder/' && chmod 700 '~/My Folder/'"`)
  })
  it('single-quotes DEST inside step ③ chmod', () => {
    const state = { ...baseState, dest: '~/My Folder/' }
    const chmod = stepsById(buildSteps(state)).chmod
    expect(chmod.plainText).toContain(`chmod 700 '~/My Folder/'`)
  })
})

describe('edge case B — key quoting differs by context', () => {
  const spacedKey = 'C:\\Users\\you\\.ssh\\my key.pem'

  it('top-level scp -i is double-quoted', () => {
    const state = { ...baseState, key: spacedKey }
    const upload = stepsById(buildSteps(state)).upload
    expect(upload.plainText).toContain(`-i "${spacedKey}"`)
  })

  it('the same key inside rsync\'s -e "ssh ..." is single-quoted instead', () => {
    const state = { ...baseState, key: spacedKey, transport: 'rsync' }
    const upload = stepsById(buildSteps(state)).upload
    expect(upload.plainText).toContain(`-i '${spacedKey}'`)
    expect(upload.plainText).not.toContain(`-i "${spacedKey}"`)
  })
})

describe('step ③ chmod — file vs. folder partitioning', () => {
  it('mixed files + folder: separate 600/700 clauses plus final DEST chmod 700', () => {
    const state = {
      ...baseState,
      files: [
        { name: 'f1', isDir: false },
        { name: 'f2', isDir: false },
        { name: 'dir1', isDir: true },
      ],
    }
    const chmod = stepsById(buildSteps(state)).chmod
    expect(chmod.plainText).toContain('chmod 600 ~/.ssh/f1 ~/.ssh/f2 && chmod 700 ~/.ssh/dir1 && chmod 700 ~/.ssh/')
  })

  it('folder-only: no bare chmod 600 clause', () => {
    const state = { ...baseState, files: [{ name: 'dir1', isDir: true }] }
    const chmod = stepsById(buildSteps(state)).chmod
    expect(chmod.plainText).not.toContain('chmod 600')
    expect(chmod.plainText).toContain('chmod 700 ~/.ssh/dir1 && chmod 700 ~/.ssh/')
  })

  it('files-only matches the worked example exactly (regression guard)', () => {
    const chmod = stepsById(buildSteps(baseState)).chmod
    expect(chmod.plainText).toContain('chmod 600 ~/.ssh/id_ed25519_roycecole ~/.ssh/config && chmod 700 ~/.ssh/')
    expect(chmod.plainText).not.toContain('chmod 700 ~/.ssh/id_ed25519_roycecole')
  })
})

describe('field fallbacks', () => {
  it('blank/non-numeric port falls back to 22', () => {
    expect(stepsById(buildSteps({ ...baseState, port: '' })).upload.plainText).toContain('-P 22')
    expect(stepsById(buildSteps({ ...baseState, port: 'abc' })).upload.plainText).toContain('-P 22')
  })
  it('blank user falls back to ubuntu', () => {
    expect(stepsById(buildSteps({ ...baseState, user: '' })).upload.plainText).toContain('ubuntu@161.33.35.40')
  })
  it('blank dest falls back to ~/', () => {
    expect(stepsById(buildSteps({ ...baseState, dest: '' })).upload.plainText).toContain(':~/')
  })
})

describe('blank source folder', () => {
  it('uses a bare filename with no leading separator', () => {
    const state = { ...baseState, srcDir: '' }
    const upload = stepsById(buildSteps(state)).upload
    expect(upload.plainText).toContain(' id_ed25519_roycecole ')
    expect(upload.plainText).not.toContain('\\id_ed25519_roycecole')
  })
})

describe('step presence and ordering', () => {
  it('omits mkdir when the toggle is off', () => {
    const steps = buildSteps({ ...baseState, optMkdir: false })
    expect(steps.find((s) => s.id === 'mkdir')).toBeUndefined()
  })
  it('omits chmod when the toggle is off', () => {
    const steps = buildSteps({ ...baseState, optChmod: false })
    expect(steps.find((s) => s.id === 'chmod')).toBeUndefined()
  })
  it('omits chmod when the toggle is on but no files were added', () => {
    const steps = buildSteps({ ...baseState, optChmod: true, files: [] })
    expect(steps.find((s) => s.id === 'chmod')).toBeUndefined()
  })
  it('renders all three steps in order when everything is on', () => {
    const steps = buildSteps(baseState)
    expect(steps.map((s) => s.id)).toEqual(['mkdir', 'upload', 'chmod'])
  })
})

describe('direction defaulting (backward compatibility)', () => {
  it('omitted, explicit "upload", and a garbage value all match the worked example', () => {
    const omitted = buildSteps(baseState).map((s) => s.plainText)
    const explicit = buildSteps({ ...baseState, direction: 'upload' }).map((s) => s.plainText)
    const garbage = buildSteps({ ...baseState, direction: 'sideways' }).map((s) => s.plainText)
    expect(explicit).toEqual(omitted)
    expect(garbage).toEqual(omitted)
  })
})

describe('connection test step', () => {
  it('is absent by default', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'testConn')).toBeUndefined()
  })
  it('is a non-interactive echo, first in the list, in both directions', () => {
    const upload = buildSteps({ ...baseState, optTestConn: true })
    expect(upload[0].id).toBe('testConn')
    expect(upload[0].plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "echo OK"'
    )
    const download = buildSteps({ ...baseState, direction: 'download', optTestConn: true })
    expect(download[0].id).toBe('testConn')
  })
})

describe('download direction', () => {
  const downloadState = {
    ...baseState,
    direction: 'download',
    optMkdir: true,
    optChmod: true, // should be ignored entirely in download mode
    files: [
      { name: 'id_ed25519_roycecole', isDir: false },
      { name: 'config', isDir: false },
    ],
  }

  it('chmod never appears, even with the toggle on', () => {
    expect(buildSteps(downloadState).find((s) => s.id === 'chmod')).toBeUndefined()
  })

  it('step ids/order: localMkdir then download', () => {
    expect(buildSteps(downloadState).map((s) => s.id)).toEqual(['localMkdir', 'download'])
  })

  it('download-only, no mkdir toggle: just the download step', () => {
    expect(buildSteps({ ...downloadState, optMkdir: false }).map((s) => s.id)).toEqual(['download'])
  })

  it('scp: each remote file gets its own user@host: prefix, bare local dest last', () => {
    const step = stepsById(buildSteps(downloadState)).download
    expect(step.plainText).toBe(
      'scp -P 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40:~/.ssh/id_ed25519_roycecole ubuntu@161.33.35.40:~/.ssh/config C:\\Users\\you\\.ssh'
    )
  })

  it('rsync: identical -e "ssh..." preamble to upload, remote sources + bare local dest', () => {
    const step = stepsById(buildSteps({ ...downloadState, transport: 'rsync' })).download
    expect(step.plainText).toBe(
      'rsync -avz -e "ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key" ubuntu@161.33.35.40:~/.ssh/id_ed25519_roycecole ubuntu@161.33.35.40:~/.ssh/config C:\\Users\\you\\.ssh'
    )
  })

  it('mixed remote files + folders: -r present for scp', () => {
    const state = {
      ...downloadState,
      files: [
        { name: 'f1', isDir: false },
        { name: 'dir1', isDir: true },
      ],
    }
    expect(stepsById(buildSteps(state)).download.plainText).toContain(' -r ')
  })

  it('spaced remote filename: whole user@host:path token double-quoted', () => {
    const state = { ...downloadState, files: [{ name: 'my file.txt', isDir: false }] }
    const step = stepsById(buildSteps(state)).download
    expect(step.plainText).toContain('"ubuntu@161.33.35.40:~/.ssh/my file.txt"')
  })

  it('spaced local dest (srcDir): quoteLocal-wrapped trailing argument', () => {
    const state = { ...downloadState, srcDir: 'C:\\Users\\you\\My Downloads' }
    const step = stepsById(buildSteps(state)).download
    expect(step.plainText.endsWith('"C:\\Users\\you\\My Downloads"')).toBe(true)
  })

  it('blank srcDir falls back to "." for both the transfer arg and local mkdir', () => {
    const state = { ...downloadState, srcDir: '' }
    const steps = stepsById(buildSteps(state))
    expect(steps.download.plainText.endsWith(' .')).toBe(true)
    expect(steps.localMkdir.plainText).toContain(' .')
  })

  it('spaced -i key: double-quoted for scp, single-quoted inside rsync -e', () => {
    const spacedKey = 'C:\\Users\\you\\.ssh\\my key.pem'
    const scpStep = stepsById(buildSteps({ ...downloadState, key: spacedKey })).download
    expect(scpStep.plainText).toContain(`-i "${spacedKey}"`)
    const rsyncStep = stepsById(buildSteps({ ...downloadState, key: spacedKey, transport: 'rsync' })).download
    expect(rsyncStep.plainText).toContain(`-i '${spacedKey}'`)
  })

  describe('local mkdir', () => {
    it('POSIX: bare mkdir -p, no ssh wrapping, no string token', () => {
      const step = stepsById(buildSteps({ ...downloadState, os: 'nix', srcDir: '/home/you/downloads' })).localMkdir
      expect(step.plainText).toBe('mkdir -p /home/you/downloads')
      expect(step.tokens.some((t) => t.type === 'string')).toBe(false)
    })

    it('PowerShell: New-Item -ItemType Directory -Force -Path', () => {
      const step = stepsById(buildSteps(downloadState)).localMkdir
      expect(step.plainText).toBe('New-Item -ItemType Directory -Force -Path C:\\Users\\you\\.ssh')
    })

    it('PowerShell with a spaced dest', () => {
      const state = { ...downloadState, srcDir: 'C:\\Users\\you\\My Downloads' }
      const step = stepsById(buildSteps(state)).localMkdir
      expect(step.plainText).toBe('New-Item -ItemType Directory -Force -Path "C:\\Users\\you\\My Downloads"')
    })

    it('PowerShell dest ending in a backslash immediately before a space+quote (regression guard)', () => {
      const state = { ...downloadState, srcDir: 'C:\\Users\\you\\My Folder\\' }
      const step = stepsById(buildSteps(state)).localMkdir
      expect(step.plainText).toBe('New-Item -ItemType Directory -Force -Path "C:\\Users\\you\\My Folder\\"')
    })
  })
})

describe('rsync --dry-run', () => {
  it('absent by default', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload
    expect(step.plainText).not.toContain('--dry-run')
  })
  it('placed right after -avz when enabled', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', optDryRun: true })).upload
    expect(step.plainText).toContain('rsync -avz --dry-run -e ')
  })
  it('has no effect on scp (no flag added)', () => {
    const step = stepsById(buildSteps({ ...baseState, optDryRun: true })).upload
    expect(step.plainText).not.toContain('dry-run')
  })
})

describe('Windows icacls fix', () => {
  it('absent by default', () => {
    expect(buildSteps({ ...baseState, optIcaclsFix: true, os: 'nix' }).find((s) => s.id === 'icaclsFix')).toBeUndefined()
  })
  it('absent without a key', () => {
    expect(buildSteps({ ...baseState, optIcaclsFix: true, key: '' }).find((s) => s.id === 'icaclsFix')).toBeUndefined()
  })
  it('present on Windows with a key, and the toggle on', () => {
    const step = stepsById(buildSteps({ ...baseState, optIcaclsFix: true })).icaclsFix
    expect(step.plainText).toBe(
      'icacls C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key /inheritance:r /grant:r "$($env:USERNAME):(R)"'
    )
  })
  it('appears in download mode too (protects the local key regardless of direction)', () => {
    const step = stepsById(buildSteps({ ...baseState, direction: 'download', optIcaclsFix: true })).icaclsFix
    expect(step).toBeDefined()
  })
})

describe('known_hosts pre-trust step', () => {
  it('absent by default', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'knownHosts')).toBeUndefined()
  })

  it('is first in the list, before testConn', () => {
    const steps = buildSteps({ ...baseState, optKnownHosts: true, optTestConn: true })
    expect(steps[0].id).toBe('knownHosts')
    expect(steps[1].id).toBe('testConn')
  })

  it('PowerShell: ssh-keygen -R chained before ssh-keyscan, appends to $HOME\\.ssh\\known_hosts', () => {
    const step = stepsById(buildSteps({ ...baseState, optKnownHosts: true })).knownHosts
    expect(step.plainText).toBe(
      'ssh-keygen -R 161.33.35.40 && ssh-keyscan -p 22 161.33.35.40 >> $HOME\\.ssh\\known_hosts'
    )
  })

  it('POSIX: ssh-keygen -R chained before ssh-keyscan, appends to ~/.ssh/known_hosts', () => {
    const step = stepsById(buildSteps({ ...baseState, optKnownHosts: true, os: 'nix' })).knownHosts
    expect(step.plainText).toBe('ssh-keygen -R 161.33.35.40 && ssh-keyscan -p 22 161.33.35.40 >> ~/.ssh/known_hosts')
  })

  it('ssh-keygen -R uses bracket [host]:port notation for a non-default port (matches how it is stored)', () => {
    const step = stepsById(buildSteps({ ...baseState, optKnownHosts: true, port: '2222' })).knownHosts
    expect(step.plainText).toContain('ssh-keygen -R [161.33.35.40]:2222 &&')
    // ssh-keyscan's own arguments stay separate (-p PORT host) — it builds the bracket form itself for output.
    expect(step.plainText).toContain('ssh-keyscan -p 2222 161.33.35.40 >>')
  })

  it('ssh-keygen -R uses the bare host on the default port 22', () => {
    const step = stepsById(buildSteps({ ...baseState, optKnownHosts: true, port: '22' })).knownHosts
    expect(step.plainText).toContain('ssh-keygen -R 161.33.35.40 &&')
  })

  it('available in download mode too', () => {
    expect(buildSteps({ ...baseState, direction: 'download', optKnownHosts: true }).find((s) => s.id === 'knownHosts')).toBeDefined()
  })
})

describe('interactive SSH login step', () => {
  it('absent by default', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'sshLogin')).toBeUndefined()
  })

  it('is a bare ssh command with no trailing string/command', () => {
    const step = stepsById(buildSteps({ ...baseState, optSshLogin: true })).sshLogin
    expect(step.plainText).toBe('ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40')
    expect(step.tokens.some((t) => t.type === 'string')).toBe(false)
  })

  it('is ordered after testConn (both are pre-flight, no-file-op steps)', () => {
    const steps = buildSteps({ ...baseState, optTestConn: true, optSshLogin: true })
    expect(steps.map((s) => s.id)).toEqual(['testConn', 'sshLogin', 'mkdir', 'upload', 'chmod'])
  })

  it('available in download mode too', () => {
    expect(buildSteps({ ...baseState, direction: 'download', optSshLogin: true }).find((s) => s.id === 'sshLogin')).toBeDefined()
  })
})

describe('rsync --partial', () => {
  it('absent by default', () => {
    expect(stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload.plainText).not.toContain('--partial')
  })
  it('present when toggled, right after -avz', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', optPartial: true })).upload
    expect(step.plainText).toContain('rsync -avz --partial -e ')
  })
  it('has no effect on scp', () => {
    expect(stepsById(buildSteps({ ...baseState, optPartial: true })).upload.plainText).not.toContain('--partial')
  })
})

describe('buildScriptFile', () => {
  it('POSIX: bash shebang + set -euo pipefail preamble, then the same content as buildCopyAllText', () => {
    const steps = buildSteps({ ...baseState, os: 'nix' })
    const script = buildScriptFile(steps, 'nix')
    expect(script.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n\n')).toBe(true)
    expect(script).toContain(buildCopyAllText(steps))
  })

  it('PowerShell: $ErrorActionPreference preamble, then the same content as buildCopyAllText', () => {
    const steps = buildSteps(baseState)
    const script = buildScriptFile(steps, 'win')
    expect(script.startsWith("# scp2go\n$ErrorActionPreference = 'Stop'\n\n")).toBe(true)
    expect(script).toContain(buildCopyAllText(steps))
  })

  it('accepts a getLabel override, same as buildCopyAllText', () => {
    const steps = buildSteps(baseState)
    const script = buildScriptFile(steps, 'win', (s) => `EN:${s.id}`)
    expect(script).toContain('# EN:upload')
  })
})

describe('rsync advanced flags', () => {
  const rsyncState = { ...baseState, transport: 'rsync' }

  it('--delete absent by default, present when toggled', () => {
    expect(stepsById(buildSteps(rsyncState)).upload.plainText).not.toContain('--delete')
    expect(stepsById(buildSteps({ ...rsyncState, optDelete: true })).upload.plainText).toContain('rsync -avz --delete ')
  })

  it('--progress absent by default, present when toggled', () => {
    expect(stepsById(buildSteps(rsyncState)).upload.plainText).not.toContain('--progress')
    expect(stepsById(buildSteps({ ...rsyncState, optProgress: true })).upload.plainText).toContain('--progress')
  })

  it('has no effect on scp (no flags added)', () => {
    const step = stepsById(buildSteps({ ...baseState, optDelete: true, optProgress: true, excludePatterns: 'node_modules' })).upload
    expect(step.plainText).not.toContain('--delete')
    expect(step.plainText).not.toContain('--progress')
    expect(step.plainText).not.toContain('--exclude')
  })

  it('one --exclude= flag per comma-separated pattern, trimmed, each always quoted', () => {
    const step = stepsById(buildSteps({ ...rsyncState, excludePatterns: ' node_modules , *.log ,,' })).upload
    expect(step.plainText).toContain('--exclude="node_modules" --exclude="*.log"')
  })

  it('always quotes exclude patterns even with no whitespace (glob chars like * must not local-shell-expand)', () => {
    const step = stepsById(buildSteps({ ...rsyncState, excludePatterns: '*.log' })).upload
    expect(step.plainText).toContain('--exclude="*.log"')
  })

  it('quotes an exclude pattern containing whitespace', () => {
    const step = stepsById(buildSteps({ ...rsyncState, excludePatterns: 'my folder/*' })).upload
    expect(step.plainText).toContain('--exclude="my folder/*"')
  })

  it('blank excludePatterns adds no --exclude flags', () => {
    expect(stepsById(buildSteps({ ...rsyncState, excludePatterns: '' })).upload.plainText).not.toContain('--exclude')
  })

  it('flag order: -avz --delete --exclude=... --progress --dry-run -e', () => {
    const step = stepsById(
      buildSteps({ ...rsyncState, optDelete: true, excludePatterns: 'x', optProgress: true, optDryRun: true })
    ).upload
    expect(step.plainText).toContain('rsync -avz --delete --exclude="x" --progress --dry-run -e ')
  })
})

describe('buildSshConfigEntryBlock / buildSshConfigExport', () => {
  const entry = {
    id: 'e1',
    alias: '',
    host: '161.33.35.40',
    port: '22',
    user: 'ubuntu',
    key: 'C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key',
  }

  it('reproduces the worked example fields exactly', () => {
    expect(buildSshConfigEntryBlock(entry)).toBe(
      [
        'Host 161.33.35.40',
        '  HostName 161.33.35.40',
        '  Port 22',
        '  User ubuntu',
        '  IdentityFile C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key',
      ].join('\n')
    )
  })

  it('falls back to host as the alias when alias is blank', () => {
    expect(buildSshConfigEntryBlock(entry).split('\n')[0]).toBe('Host 161.33.35.40')
  })

  it('uses a custom alias when provided', () => {
    expect(buildSshConfigEntryBlock({ ...entry, alias: 'myserver' }).split('\n')[0]).toBe('Host myserver')
  })

  it('omits IdentityFile when key is blank', () => {
    expect(buildSshConfigEntryBlock({ ...entry, key: '' })).not.toContain('IdentityFile')
  })

  it('quotes an alias/host containing whitespace or #', () => {
    expect(quoteSshConfig('my host')).toBe('"my host"')
    expect(quoteSshConfig('host#1')).toBe('"host#1"')
    expect(quoteSshConfig('plainhost')).toBe('plainhost')
  })

  it('buildSshConfigExport concatenates multiple entries with a blank line between', () => {
    const second = { ...entry, id: 'e2', alias: 'second', host: '9.9.9.9', key: '' }
    const exported = buildSshConfigExport([entry, second])
    expect(exported).toBe(`${buildSshConfigEntryBlock(entry)}\n\n${buildSshConfigEntryBlock(second)}`)
  })

  it('buildSshConfigExport of an empty list is an empty string', () => {
    expect(buildSshConfigExport([])).toBe('')
  })
})
