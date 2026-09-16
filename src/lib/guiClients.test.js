import { describe, it, expect } from 'vitest'
import { buildWinScpIni, buildFileZillaXml } from './guiClients.js'

const entry = { alias: 'myserver', host: '1.2.3.4', port: '2222', user: 'deploy', key: 'C:\\keys\\id_ed25519' }

describe('buildWinScpIni', () => {
  it('writes one [Sessions\\name] block per entry with host/port/user/key', () => {
    const ini = buildWinScpIni([entry])
    expect(ini).toContain('[Sessions\\myserver]')
    expect(ini).toContain('HostName=1.2.3.4')
    expect(ini).toContain('PortNumber=2222')
    expect(ini).toContain('UserName=deploy')
    expect(ini).toContain(`PublicKeyFile=${encodeURIComponent('C:\\keys\\id_ed25519')}`)
  })

  it('URL-encodes special characters in the session name, matching WinSCP ini escaping', () => {
    const ini = buildWinScpIni([{ ...entry, alias: 'my server' }])
    expect(ini).toContain('[Sessions\\my%20server]')
  })

  it('falls back to host as the name, port 22 and default user, and omits PublicKeyFile without a key', () => {
    const ini = buildWinScpIni([{ alias: '', host: 'h.example', port: '', user: '', key: '' }])
    expect(ini).toContain('[Sessions\\h.example]')
    expect(ini).toContain('PortNumber=22')
    expect(ini).toContain('UserName=ubuntu')
    expect(ini).not.toContain('PublicKeyFile')
  })
})

describe('buildFileZillaXml', () => {
  it('emits an importable FileZilla3/Servers document with SFTP protocol', () => {
    const xml = buildFileZillaXml([entry])
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('<FileZilla3>')
    expect(xml).toContain('<Host>1.2.3.4</Host>')
    expect(xml).toContain('<Port>2222</Port>')
    expect(xml).toContain('<Protocol>1</Protocol>')
    expect(xml).toContain('<User>deploy</User>')
    expect(xml).toContain('<Name>myserver</Name>')
  })

  it('uses key-file logon (5) with a Keyfile when a key is set, ask-password (2) otherwise', () => {
    const withKey = buildFileZillaXml([entry])
    expect(withKey).toContain('<Logontype>5</Logontype>')
    expect(withKey).toContain('<Keyfile>C:\\keys\\id_ed25519</Keyfile>')
    const noKey = buildFileZillaXml([{ ...entry, key: '' }])
    expect(noKey).toContain('<Logontype>2</Logontype>')
    expect(noKey).not.toContain('<Keyfile>')
  })

  it('escapes XML special characters in values', () => {
    const xml = buildFileZillaXml([{ ...entry, alias: 'a&b <prod>' }])
    expect(xml).toContain('<Name>a&amp;b &lt;prod&gt;</Name>')
  })
})
