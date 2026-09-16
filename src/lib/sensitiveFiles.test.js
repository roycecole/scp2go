import { describe, it, expect } from 'vitest'
import { isSensitiveFilename } from './sensitiveFiles.js'

describe('isSensitiveFilename', () => {
  it('flags .env and its variants', () => {
    expect(isSensitiveFilename('.env')).toBe(true)
    expect(isSensitiveFilename('.env.local')).toBe(true)
    expect(isSensitiveFilename('.env.production')).toBe(true)
  })

  it('flags common private-key extensions', () => {
    expect(isSensitiveFilename('server.pem')).toBe(true)
    expect(isSensitiveFilename('putty.ppk')).toBe(true)
    expect(isSensitiveFilename('cert.p12')).toBe(true)
    expect(isSensitiveFilename('cert.pfx')).toBe(true)
    expect(isSensitiveFilename('id_ed25519')).toBe(true)
    expect(isSensitiveFilename('id_rsa')).toBe(true)
  })

  it('does NOT flag the matching public key', () => {
    expect(isSensitiveFilename('id_ed25519.pub')).toBe(false)
    expect(isSensitiveFilename('id_rsa.pub')).toBe(false)
  })

  it('flags common credential store filenames', () => {
    expect(isSensitiveFilename('.npmrc')).toBe(true)
    expect(isSensitiveFilename('.netrc')).toBe(true)
    expect(isSensitiveFilename('.git-credentials')).toBe(true)
    expect(isSensitiveFilename('credentials')).toBe(true)
    expect(isSensitiveFilename('secrets.json')).toBe(true)
    expect(isSensitiveFilename('secret.yaml')).toBe(true)
    expect(isSensitiveFilename('secrets.yml')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isSensitiveFilename('.ENV')).toBe(true)
    expect(isSensitiveFilename('SERVER.PEM')).toBe(true)
  })

  it('matches only the base filename, not a containing folder name', () => {
    expect(isSensitiveFilename('C:\\Users\\you\\.ssh\\id_ed25519')).toBe(true)
    expect(isSensitiveFilename('/home/you/.ssh/id_ed25519.pub')).toBe(false)
  })

  it('does not flag ordinary filenames, including loose substring matches', () => {
    expect(isSensitiveFilename('readme.md')).toBe(false)
    expect(isSensitiveFilename('backup.tar.gz')).toBe(false)
    expect(isSensitiveFilename('keyboard-layout.txt')).toBe(false)
    expect(isSensitiveFilename('my-secret-plans.txt')).toBe(false)
  })

  it('handles blank/undefined input without throwing', () => {
    expect(isSensitiveFilename('')).toBe(false)
    expect(isSensitiveFilename(undefined)).toBe(false)
  })
})
