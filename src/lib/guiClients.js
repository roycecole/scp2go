// @ts-check

/**
 * Exports of the saved ~/.ssh/config entries in the site formats of the two
 * most common GUI SFTP clients, so a connection built here can be opened
 * there without retyping. Same entry shape as commandBuilder's
 * SshConfigEntry: { alias, host, port, user, key }.
 */

/** @param {string} p */
function fallbackPort(p) {
  const t = (p || '').trim()
  return /^\d+$/.test(t) ? t : '22'
}

/** @param {string} u */
function fallbackUser(u) {
  return (u || '').trim() || 'ubuntu'
}

/** @param {string} s */
function xmlEscape(s) {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c])
}

/**
 * WinSCP stores its sites in an INI file whose session names and values use
 * URL-style %XX escaping for special characters (spaces, backslashes,
 * non-ASCII); WinSCP percent-decodes on read, so plain-safe text survives
 * either way. Protocol is left unset — WinSCP's default is SFTP, matching
 * what these entries are for. Import via WinSCP: Tools > Import Sites, or
 * merge into winscp.ini.
 * @param {Array<{alias: string, host: string, port: string, user: string, key: string}>} entries
 * @returns {string}
 */
export function buildWinScpIni(entries) {
  const blocks = entries.map((e) => {
    const name = encodeURIComponent((e.alias || '').trim() || e.host)
    const lines = [
      `[Sessions\\${name}]`,
      `HostName=${e.host}`,
      `PortNumber=${fallbackPort(e.port)}`,
      `UserName=${encodeURIComponent(fallbackUser(e.user))}`,
    ]
    const key = (e.key || '').trim()
    if (key) lines.push(`PublicKeyFile=${encodeURIComponent(key)}`)
    return lines.join('\n')
  })
  return blocks.join('\n\n') + '\n'
}

/**
 * FileZilla Site Manager export (File > Import). Protocol 1 = SFTP;
 * Logontype 5 = key file when one is set, otherwise 2 = ask for password.
 * @param {Array<{alias: string, host: string, port: string, user: string, key: string}>} entries
 * @returns {string}
 */
export function buildFileZillaXml(entries) {
  const servers = entries
    .map((e) => {
      const key = (e.key || '').trim()
      const lines = [
        `      <Host>${xmlEscape(e.host)}</Host>`,
        `      <Port>${fallbackPort(e.port)}</Port>`,
        `      <Protocol>1</Protocol>`,
        `      <Type>0</Type>`,
        `      <User>${xmlEscape(fallbackUser(e.user))}</User>`,
        `      <Logontype>${key ? 5 : 2}</Logontype>`,
      ]
      if (key) lines.push(`      <Keyfile>${xmlEscape(key)}</Keyfile>`)
      lines.push(`      <Name>${xmlEscape((e.alias || '').trim() || e.host)}</Name>`)
      return `    <Server>\n${lines.join('\n')}\n    </Server>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<FileZilla3>\n  <Servers>\n${servers}\n  </Servers>\n</FileZilla3>\n`
}
