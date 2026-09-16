import { describe, it, expect } from 'vitest'
import {
  buildSteps,
  buildCopyAllText,
  buildScriptFile,
  buildSshConfigEntryBlock,
  buildSshConfigExport,
  parseSshConfigText,
  quoteLocal,
  quoteNested,
  quoteSshConfig,
  quoteSftpBatch,
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

describe('parseSshConfigText', () => {
  it('parses a single Host block with all fields', () => {
    const text = [
      'Host myserver',
      '  HostName 161.33.35.40',
      '  Port 2222',
      '  User ubuntu',
      '  IdentityFile C:\\Users\\you\\.ssh\\id_ed25519',
    ].join('\n')
    expect(parseSshConfigText(text)).toEqual([
      { alias: 'myserver', host: '161.33.35.40', port: '2222', user: 'ubuntu', key: 'C:\\Users\\you\\.ssh\\id_ed25519' },
    ])
  })

  it('parses multiple Host blocks', () => {
    const text = ['Host a', '  HostName 1.1.1.1', '', 'Host b', '  HostName 2.2.2.2'].join('\n')
    const parsed = parseSshConfigText(text)
    expect(parsed).toHaveLength(2)
    expect(parsed[0]).toMatchObject({ alias: 'a', host: '1.1.1.1' })
    expect(parsed[1]).toMatchObject({ alias: 'b', host: '2.2.2.2' })
  })

  it('falls back to the alias as the host when HostName is missing (matches real ssh behavior)', () => {
    expect(parseSshConfigText('Host plainhost')).toEqual([{ alias: 'plainhost', host: 'plainhost', port: '', user: '', key: '' }])
  })

  it('skips a wildcard-only Host line (describes a pattern, not one connection)', () => {
    expect(parseSshConfigText('Host *\n  User global-default')).toEqual([])
    expect(parseSshConfigText('Host web-*\n  User deploy')).toEqual([])
  })

  it('skips a Host line naming multiple patterns', () => {
    expect(parseSshConfigText('Host foo bar\n  HostName 1.2.3.4')).toEqual([])
  })

  it('ignores comments and blank lines', () => {
    const text = ['# a comment', '', 'Host a', '  # inline comment style not supported, but a full-line comment is', '  HostName 1.1.1.1'].join(
      '\n'
    )
    expect(parseSshConfigText(text)).toEqual([{ alias: 'a', host: '1.1.1.1', port: '', user: '', key: '' }])
  })

  it('matches directive names case-insensitively', () => {
    const text = ['HOST a', '  hostname 1.1.1.1', '  PORT 2200', '  UsEr bob'].join('\n')
    expect(parseSshConfigText(text)).toEqual([{ alias: 'a', host: '1.1.1.1', port: '2200', user: 'bob', key: '' }])
  })

  it('unquotes a quoted value', () => {
    const text = 'Host a\n  HostName "my host.example.com"'
    expect(parseSshConfigText(text)[0].host).toBe('my host.example.com')
  })

  it('ignores unrecognized directives without breaking parsing of the rest of the block', () => {
    const text = ['Host a', '  ServerAliveInterval 60', '  HostName 1.1.1.1'].join('\n')
    expect(parseSshConfigText(text)).toEqual([{ alias: 'a', host: '1.1.1.1', port: '', user: '', key: '' }])
  })

  it('returns [] for empty/whitespace-only input', () => {
    expect(parseSshConfigText('')).toEqual([])
    expect(parseSshConfigText('   \n  \n')).toEqual([])
    expect(parseSshConfigText(undefined)).toEqual([])
  })

  it('round-trips through buildSshConfigExport for a simple case', () => {
    const original = [{ id: 'e1', alias: 'myserver', host: '1.2.3.4', port: '22', user: 'ubuntu', key: '' }]
    const exported = buildSshConfigExport(original)
    const reparsed = parseSshConfigText(exported)
    expect(reparsed).toEqual([{ alias: 'myserver', host: '1.2.3.4', port: '22', user: 'ubuntu', key: '' }])
  })
})

describe('rsync --checksum', () => {
  it('absent by default', () => {
    expect(stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload.plainText).not.toContain('--checksum')
  })
  it('present when toggled, after --partial', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', optPartial: true, optChecksum: true })).upload
    expect(step.plainText).toContain('rsync -avz --partial --checksum -e ')
  })
  it('has no effect on scp', () => {
    expect(stepsById(buildSteps({ ...baseState, optChecksum: true })).upload.plainText).not.toContain('--checksum')
  })
})

describe('SSH Agent Forwarding (-A)', () => {
  it('absent by default even with sshLogin on', () => {
    expect(stepsById(buildSteps({ ...baseState, optSshLogin: true })).sshLogin.plainText).not.toContain('-A')
  })
  it('present on the login step when both toggles are on', () => {
    const step = stepsById(buildSteps({ ...baseState, optSshLogin: true, optAgentForward: true })).sshLogin
    expect(step.plainText).toBe('ssh -A -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40')
  })
  it('has no effect without sshLogin (no step exists to attach it to)', () => {
    expect(buildSteps({ ...baseState, optAgentForward: true }).find((s) => s.id === 'sshLogin')).toBeUndefined()
  })
})

describe('build / restart deployment steps', () => {
  it('absent by default', () => {
    const steps = buildSteps(baseState)
    expect(steps.find((s) => s.id === 'build')).toBeUndefined()
    expect(steps.find((s) => s.id === 'restart')).toBeUndefined()
  })

  it('build step is a verbatim passthrough of the user command, first in the list', () => {
    const steps = buildSteps({ ...baseState, buildCommand: '  npm run build  ' })
    expect(steps[0]).toMatchObject({ id: 'build', plainText: 'npm run build' })
  })

  it('restart step wraps the command in an ssh call, last in the list', () => {
    const steps = buildSteps({ ...baseState, restartCommand: 'sudo systemctl restart myapp' })
    const last = steps[steps.length - 1]
    expect(last.id).toBe('restart')
    expect(last.plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "sudo systemctl restart myapp"'
    )
  })

  it('escapes an embedded double quote in the restart command so it cannot break out of the outer string', () => {
    const step = stepsById(buildSteps({ ...baseState, restartCommand: 'echo "hello"' })).restart
    expect(step.plainText).toContain('"echo \\"hello\\""')
  })

  it('both together: build first, restart last, existing steps in between', () => {
    const steps = buildSteps({ ...baseState, buildCommand: 'npm run build', restartCommand: 'pm2 restart app' })
    expect(steps[0].id).toBe('build')
    expect(steps[steps.length - 1].id).toBe('restart')
    expect(steps.map((s) => s.id)).toEqual(['build', 'mkdir', 'upload', 'chmod', 'restart'])
  })

  it('blank/whitespace-only commands produce no step', () => {
    const steps = buildSteps({ ...baseState, buildCommand: '   ', restartCommand: '' })
    expect(steps.find((s) => s.id === 'build')).toBeUndefined()
    expect(steps.find((s) => s.id === 'restart')).toBeUndefined()
  })

  it('restart step is available in download mode too', () => {
    expect(
      buildSteps({ ...baseState, direction: 'download', restartCommand: 'echo done' }).find((s) => s.id === 'restart')
    ).toBeDefined()
  })
})

describe('quoteSftpBatch', () => {
  it('leaves a path without whitespace unquoted', () => {
    expect(quoteSftpBatch('/var/www/app')).toBe('/var/www/app')
  })
  it('wraps a path containing whitespace in double quotes', () => {
    expect(quoteSftpBatch('/var/www/my app')).toBe(`"/var/www/my app"`)
  })
  it('escapes an embedded double quote', () => {
    expect(quoteSftpBatch('say "hi" now')).toBe(`"say \\"hi\\" now"`)
  })
  it('escapes an embedded backslash', () => {
    expect(quoteSftpBatch('C:\\Program Files\\app')).toBe(`"C:\\\\Program Files\\\\app"`)
  })
  it('handles blank/undefined input without throwing', () => {
    expect(quoteSftpBatch('')).toBe('')
    expect(quoteSftpBatch(undefined)).toBe(undefined)
  })
})

describe('sftp transport', () => {
  const sftpState = {
    ...baseState,
    transport: 'sftp',
    os: 'nix',
    key: '',
    srcDir: '/home/you/uploads',
    dest: '/var/www/app',
    files: [{ name: 'app.tar.gz', isDir: false }],
    optMkdir: false,
    optChmod: false,
  }

  it('upload: one put line per file, wrapped in an sftp -b - heredoc (POSIX)', () => {
    const step = stepsById(buildSteps(sftpState)).upload
    expect(step.plainText).toBe(
      "sftp -b - -P 22 ubuntu@161.33.35.40 << 'SFTP_EOF'\n" +
        'put /home/you/uploads/app.tar.gz /var/www/app/app.tar.gz\n' +
        'bye\n' +
        'SFTP_EOF'
    )
  })

  it('upload: PowerShell uses a piped here-string instead of a heredoc', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        os: 'win',
        key: 'C:\\Users\\you\\.ssh\\id_ed25519',
        srcDir: 'C:\\Users\\you\\uploads',
      })
    ).upload
    expect(step.plainText).toBe(
      "@'\n" +
        'put C:\\Users\\you\\uploads\\app.tar.gz /var/www/app/app.tar.gz\n' +
        'bye\n' +
        "'@ | sftp -b - -P 22 -i C:\\Users\\you\\.ssh\\id_ed25519 ubuntu@161.33.35.40"
    )
  })

  it('uses -P (capital) for the port, never ssh-style lowercase -p', () => {
    const step = stepsById(buildSteps({ ...sftpState, port: '2222' })).upload
    expect(step.plainText).toContain('-b - -P 2222 ')
    expect(step.plainText).not.toMatch(/[^-]-p\b/)
  })

  it('one put/get line per file, in order', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        files: [
          { name: 'a.txt', isDir: false },
          { name: 'b.txt', isDir: false },
        ],
      })
    ).upload
    const lines = step.plainText.split('\n')
    expect(lines).toContain('put /home/you/uploads/a.txt /var/www/app/a.txt')
    expect(lines).toContain('put /home/you/uploads/b.txt /var/www/app/b.txt')
  })

  it('adds -r only for entries that are actually directories', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        files: [
          { name: 'assets', isDir: true },
          { name: 'readme.txt', isDir: false },
        ],
      })
    ).upload
    expect(step.plainText).toContain('put -r /home/you/uploads/assets /var/www/app/assets')
    expect(step.plainText).toContain('put /home/you/uploads/readme.txt /var/www/app/readme.txt')
  })

  it('quotes a filename containing whitespace on both sides of the line', () => {
    const step = stepsById(buildSteps({ ...sftpState, files: [{ name: 'my report.pdf', isDir: false }] })).upload
    expect(step.plainText).toContain('put "/home/you/uploads/my report.pdf" "/var/www/app/my report.pdf"')
  })

  it('download: get lines join the remote source and local destination per file', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        direction: 'download',
        srcDir: '/home/you/downloads',
        files: [{ name: 'remote-file.txt', isDir: false }],
      })
    ).download
    expect(step.plainText).toContain('get /var/www/app/remote-file.txt /home/you/downloads/remote-file.txt')
  })

  it('download: blank local destination falls back to .', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        direction: 'download',
        srcDir: '',
        files: [{ name: 'remote-file.txt', isDir: false }],
      })
    ).download
    expect(step.plainText).toContain('get /var/www/app/remote-file.txt ./remote-file.txt')
  })

  it('mkdir: uses a leading - so an already-existing directory does not abort the batch', () => {
    const step = stepsById(buildSteps({ ...sftpState, optMkdir: true })).mkdir
    expect(step.plainText).toBe(
      "sftp -b - -P 22 ubuntu@161.33.35.40 << 'SFTP_EOF'\n" + '-mkdir /var/www/app\n' + 'bye\n' + 'SFTP_EOF'
    )
  })

  it('mkdir: chains a chmod 700 on the new directory when optChmod is also on', () => {
    const step = stepsById(buildSteps({ ...sftpState, optMkdir: true, optChmod: true })).mkdir
    const lines = step.plainText.split('\n')
    expect(lines).toContain('-mkdir /var/www/app')
    expect(lines).toContain('chmod 700 /var/www/app')
  })

  it('chmod: 600 for files, 700 for directories and the destination itself, one batch session', () => {
    const step = stepsById(
      buildSteps({
        ...sftpState,
        optChmod: true,
        files: [
          { name: 'app.tar.gz', isDir: false },
          { name: 'uploads', isDir: true },
        ],
      })
    ).chmod
    const lines = step.plainText.split('\n')
    expect(lines).toContain('chmod 600 /var/www/app/app.tar.gz')
    expect(lines).toContain('chmod 700 /var/www/app/uploads')
    expect(lines).toContain('chmod 700 /var/www/app')
  })

  it('step order matches scp/rsync: build, mkdir, upload, chmod, restart', () => {
    const steps = buildSteps({
      ...sftpState,
      optMkdir: true,
      optChmod: true,
      buildCommand: 'npm run build',
      restartCommand: 'pm2 restart app',
    })
    expect(steps.map((s) => s.id)).toEqual(['build', 'mkdir', 'upload', 'chmod', 'restart'])
  })

  it('rsync-only flags have no bearing on the sftp batch', () => {
    const step = stepsById(
      buildSteps({ ...sftpState, optPartial: true, optDelete: true, optProgress: true, optDryRun: true, optChecksum: true })
    ).upload
    expect(step.plainText).not.toMatch(/--partial|--delete|--progress|--dry-run|--checksum/)
  })

  it('survives an unknown transport value by defaulting to scp, not silently becoming sftp', () => {
    const step = stepsById(buildSteps({ ...sftpState, transport: 'bogus' })).upload
    expect(step.plainText.startsWith('scp ')).toBe(true)
  })

  it('plugs into buildCopyAllText / buildScriptFile without losing the embedded newlines', () => {
    const steps = buildSteps({ ...sftpState, optMkdir: true })
    const text = buildCopyAllText(steps)
    expect(text).toContain('# 建立遠端目錄\nsftp -b -')
    expect(text).toContain('# 上傳檔案\nsftp -b -')
    const script = buildScriptFile(steps, 'nix')
    expect(script.startsWith('#!/usr/bin/env bash\nset -euo pipefail\n\n')).toBe(true)
    expect(script).toContain("<< 'SFTP_EOF'")
  })
})

describe('jump host (-J)', () => {
  it('absent by default', () => {
    expect(stepsById(buildSteps(baseState)).upload.plainText).not.toContain('-J')
  })

  it('present on the scp transfer, right after any -r', () => {
    const step = stepsById(buildSteps({ ...baseState, jumpHost: 'bastion.example.com' })).upload
    expect(step.plainText).toContain('scp -J bastion.example.com -P 22')
  })

  it('present on the rsync transfer, inside the -e "ssh ..." preamble', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', jumpHost: 'bastion.example.com' })).upload
    expect(step.plainText).toContain('-e "ssh -J bastion.example.com -p 22')
  })

  it('present on the sftp invocation', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'sftp', jumpHost: 'bastion.example.com' })).upload
    expect(step.plainText).toContain('-b - -J bastion.example.com -P 22')
  })

  it('present on every plain ssh-based step (test connection, mkdir, chmod, restart)', () => {
    const state = {
      ...baseState,
      jumpHost: 'bastion.example.com',
      optTestConn: true,
      restartCommand: 'echo hi',
    }
    const steps = stepsById(buildSteps(state))
    expect(steps.testConn.plainText).toBe(
      'ssh -J bastion.example.com -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "echo OK"'
    )
    expect(steps.mkdir.plainText).toContain('ssh -J bastion.example.com -p 22')
    expect(steps.chmod.plainText).toContain('ssh -J bastion.example.com -p 22')
    expect(steps.restart.plainText).toContain('ssh -J bastion.example.com -p 22')
  })

  it('has no effect when blank/whitespace-only', () => {
    expect(stepsById(buildSteps({ ...baseState, jumpHost: '   ' })).upload.plainText).not.toContain('-J')
  })
})

describe('ssh-add (load key into agent)', () => {
  it('absent by default', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'sshAdd')).toBeUndefined()
  })

  it('absent without a key path, even with agent forwarding on', () => {
    const state = { ...baseState, key: '', optAgentForward: true }
    expect(buildSteps(state).find((s) => s.id === 'sshAdd')).toBeUndefined()
  })

  it('absent with a key but agent forwarding off', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'sshAdd')).toBeUndefined()
  })

  it('present when both a key and agent forwarding are on', () => {
    const step = stepsById(buildSteps({ ...baseState, optAgentForward: true })).sshAdd
    expect(step.plainText).toBe('ssh-add C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key')
  })

  it('appears before sshLogin in the step order', () => {
    const steps = buildSteps({ ...baseState, optAgentForward: true, optSshLogin: true })
    const ids = steps.map((s) => s.id)
    expect(ids.indexOf('sshAdd')).toBeLessThan(ids.indexOf('sshLogin'))
  })
})

describe('backup existing files before overwrite', () => {
  it('absent by default', () => {
    expect(buildSteps({ ...baseState, files: [{ name: 'a.txt', isDir: false }] }).find((s) => s.id === 'backup')).toBeUndefined()
  })

  it('absent in download direction even with the toggle on', () => {
    const state = { ...baseState, direction: 'download', optBackup: true }
    expect(buildSteps(state).find((s) => s.id === 'backup')).toBeUndefined()
  })

  it('absent when there are no files', () => {
    const state = { ...baseState, optBackup: true, files: [] }
    expect(buildSteps(state).find((s) => s.id === 'backup')).toBeUndefined()
  })

  it('mv-renames each destination file to a shared, timestamped .bak (ssh-based transports)', () => {
    const step = stepsById(buildSteps({ ...baseState, optBackup: true, files: [{ name: 'app.js', isDir: false }] })).backup
    expect(step.plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 ' +
        '"ts=`$(date +%Y%m%d%H%M%S); mv ~/.ssh/app.js ~/.ssh/app.js.bak.`$ts 2>/dev/null || true"'
    )
  })

  it('uses backslash (not backtick) to escape $ on POSIX clients', () => {
    const step = stepsById(
      buildSteps({ ...baseState, os: 'nix', optBackup: true, files: [{ name: 'app.js', isDir: false }] })
    ).backup
    expect(step.plainText).toContain('ts=\\$(date')
    expect(step.plainText).toContain('.bak.\\$ts')
  })

  it('backs up every file, sharing one timestamp variable', () => {
    const step = stepsById(buildSteps({ ...baseState, optBackup: true })).backup
    expect(step.plainText).toContain('mv ~/.ssh/id_ed25519_roycecole ~/.ssh/id_ed25519_roycecole.bak.`$ts')
    expect(step.plainText).toContain('mv ~/.ssh/config ~/.ssh/config.bak.`$ts')
    // Only one `ts=` assignment for the whole step, not one per file.
    expect(step.plainText.match(/ts=/g)).toHaveLength(1)
  })

  it('sftp: static .bak per file — no $(date ...), since batch mode has no shell substitution', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'sftp', optBackup: true })).backup
    expect(step.plainText).toContain('-rename ~/.ssh/id_ed25519_roycecole ~/.ssh/id_ed25519_roycecole.bak')
    expect(step.plainText).toContain('-rename ~/.ssh/config ~/.ssh/config.bak')
    expect(step.plainText).not.toContain('date')
    expect(step.plainText).not.toContain('$')
  })

  it('sits between mkdir and the transfer step', () => {
    const steps = buildSteps({ ...baseState, optBackup: true })
    expect(steps.map((s) => s.id)).toEqual(['mkdir', 'backup', 'upload', 'chmod'])
  })
})

describe('health check', () => {
  it('absent by default', () => {
    expect(buildSteps(baseState).find((s) => s.id === 'healthCheck')).toBeUndefined()
  })

  it('wraps the command in an ssh call, last in the list', () => {
    const steps = buildSteps({ ...baseState, healthCheckCommand: 'curl -f http://localhost:3000/health' })
    const last = steps[steps.length - 1]
    expect(last.id).toBe('healthCheck')
    expect(last.plainText).toBe(
      'ssh -p 22 -i C:\\Users\\you\\.ssh\\SimpleService_OracleCloud.key ubuntu@161.33.35.40 "curl -f http://localhost:3000/health"'
    )
  })

  it('runs after restart when both are set', () => {
    const steps = buildSteps({ ...baseState, restartCommand: 'systemctl restart myapp', healthCheckCommand: 'curl -f http://x' })
    const ids = steps.map((s) => s.id)
    expect(ids.indexOf('restart')).toBeLessThan(ids.indexOf('healthCheck'))
    expect(ids[ids.length - 1]).toBe('healthCheck')
  })

  it('escapes an embedded double quote so it cannot break out of the outer string', () => {
    const step = stepsById(buildSteps({ ...baseState, healthCheckCommand: 'echo "ok"' })).healthCheck
    expect(step.plainText).toContain('"echo \\"ok\\""')
  })

  it('blank/whitespace-only command produces no step', () => {
    expect(buildSteps({ ...baseState, healthCheckCommand: '   ' }).find((s) => s.id === 'healthCheck')).toBeUndefined()
  })

  it('is available in download mode too', () => {
    expect(
      buildSteps({ ...baseState, direction: 'download', healthCheckCommand: 'echo done' }).find((s) => s.id === 'healthCheck')
    ).toBeDefined()
  })
})

describe('rsync -z compression toggle', () => {
  it('defaults to on: -avz exactly as before', () => {
    expect(stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload.plainText).toContain('rsync -avz ')
  })
  it('emits -av (no z) when turned off', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', optCompress: false })).upload
    expect(step.plainText).toContain('rsync -av ')
    expect(step.plainText).not.toContain('-avz')
  })
  it('a stored state missing the field still compresses (back-compat default)', () => {
    const state = { ...baseState, transport: 'rsync' }
    delete state.optCompress
    expect(stepsById(buildSteps(state)).upload.plainText).toContain('rsync -avz ')
  })
})

describe('rsync --bwlimit', () => {
  it('absent by default', () => {
    expect(stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload.plainText).not.toContain('--bwlimit')
  })
  it('emitted with the trimmed value when valid', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', bwLimit: ' 1.5m ' })).upload
    expect(step.plainText).toContain('--bwlimit=1.5m')
  })
  it('a half-typed/invalid value is skipped rather than breaking the command', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', bwLimit: 'fast' })).upload
    expect(step.plainText).not.toContain('--bwlimit')
  })
  it('has no effect on scp', () => {
    expect(stepsById(buildSteps({ ...baseState, bwLimit: '5000' })).upload.plainText).not.toContain('--bwlimit')
  })
})

describe('rsync --link-dest', () => {
  it('absent by default', () => {
    expect(stepsById(buildSteps({ ...baseState, transport: 'rsync' })).upload.plainText).not.toContain('--link-dest')
  })
  it('emitted with the path when set', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', linkDest: '../backup-prev' })).upload
    expect(step.plainText).toContain('--link-dest=../backup-prev')
  })
  it('quotes a path containing whitespace', () => {
    const step = stepsById(buildSteps({ ...baseState, transport: 'rsync', linkDest: '../old backup' })).upload
    expect(step.plainText).toContain('--link-dest="../old backup"')
  })
})

describe('tar bundle transfer', () => {
  const bundleState = {
    ...baseState,
    os: 'nix',
    key: '',
    srcDir: '/home/you/dist',
    dest: '/var/www/app',
    files: [
      { name: 'index.html', isDir: false },
      { name: 'assets', isDir: true },
    ],
    optMkdir: false,
    optChmod: false,
    optTarBundle: true,
  }

  it('adds tarPack (local) and tarExtract (remote) around the transfer', () => {
    const steps = buildSteps(bundleState)
    expect(steps.map((s) => s.id)).toEqual(['tarPack', 'upload', 'tarExtract'])
  })

  it('tarPack archives the selected names relative to the source dir', () => {
    const step = stepsById(buildSteps(bundleState)).tarPack
    expect(step.plainText).toBe('tar -czf scp2go-bundle.tar.gz -C /home/you/dist index.html assets')
  })

  it('tarPack omits -C when no source dir is set', () => {
    const step = stepsById(buildSteps({ ...bundleState, srcDir: '' })).tarPack
    expect(step.plainText).toBe('tar -czf scp2go-bundle.tar.gz index.html assets')
  })

  it('the transfer carries only the archive from the current directory', () => {
    const step = stepsById(buildSteps(bundleState)).upload
    expect(step.plainText).toBe('scp -P 22 scp2go-bundle.tar.gz ubuntu@161.33.35.40:/var/www/app')
  })

  it('tarExtract unpacks into the destination and removes the archive', () => {
    const step = stepsById(buildSteps(bundleState)).tarExtract
    expect(step.plainText).toBe(
      'ssh -p 22 ubuntu@161.33.35.40 "tar -xzf /var/www/app/scp2go-bundle.tar.gz -C /var/www/app && rm /var/www/app/scp2go-bundle.tar.gz"'
    )
  })

  it('rsync: --delete is dropped while bundling, so the lone archive cannot wipe the destination', () => {
    const step = stepsById(buildSteps({ ...bundleState, transport: 'rsync', optDelete: true })).upload
    expect(step.plainText).not.toContain('--delete')
    expect(step.plainText).toContain('scp2go-bundle.tar.gz')
  })

  it('sftp: puts just the archive', () => {
    const step = stepsById(buildSteps({ ...bundleState, transport: 'sftp' })).upload
    expect(step.plainText).toContain('put scp2go-bundle.tar.gz /var/www/app/scp2go-bundle.tar.gz')
    expect(step.plainText).not.toContain('index.html')
  })

  it('ignored in download direction', () => {
    const steps = buildSteps({ ...bundleState, direction: 'download' })
    expect(steps.find((s) => s.id === 'tarPack')).toBeUndefined()
    expect(steps.find((s) => s.id === 'tarExtract')).toBeUndefined()
  })

  it('chmod (when on) comes after extraction and still targets the real files', () => {
    const steps = buildSteps({ ...bundleState, optChmod: true })
    const ids = steps.map((s) => s.id)
    expect(ids.indexOf('tarExtract')).toBeLessThan(ids.indexOf('chmod'))
    expect(stepsById(steps).chmod.plainText).toContain('/var/www/app/index.html')
  })
})
