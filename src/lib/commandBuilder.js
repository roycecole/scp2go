// @ts-check
import { isValidBwLimit } from './validators.js'

/** @typedef {'win'|'nix'} ClientOs */
/** @typedef {'scp'|'rsync'|'sftp'} Transport */
/** @typedef {'upload'|'download'} Direction */
/** @typedef {{ name: string, isDir: boolean }} FileEntry */
/** @typedef {{ type: 'cmd'|'flag'|'value'|'string'|'operator', text: string }} Token */
/** @typedef {{ id: string, alias: string, host: string, port: string, user: string, key: string }} SshConfigEntry */
/** @typedef {{ id: string, label: string, tokens: Token[], plainText: string }} Step */

const LOCAL_SPECIAL_RE = /[\s()&;'`]/
const DEFAULT_PORT = '22'
const DEFAULT_USER = 'ubuntu'
const DEFAULT_DEST = '~/'
const DEFAULT_LOCAL_DIR = '.'

/**
 * @param {string} str
 * @param {ClientOs} os
 */
function quoteLocalAlways(str, os) {
  const escaped = os === 'win' ? str.replace(/"/g, '`"') : str.replace(/"/g, '\\"')
  return `"${escaped}"`
}

/**
 * Quote a bare local-shell argument (PowerShell or POSIX shell) if it
 * contains whitespace or a shell-special character, wrapping it in double
 * quotes. An embedded double quote is escaped in the style of the target
 * client shell (backtick-quote for PowerShell, backslash for POSIX).
 * @param {string} str
 * @param {ClientOs} os
 * @returns {string}
 */
export function quoteLocal(str, os) {
  if (!str || !LOCAL_SPECIAL_RE.test(str)) return str
  return quoteLocalAlways(str, os)
}

/**
 * Quote an rsync --exclude pattern. Unlike a file path, an exclude pattern
 * almost always contains a shell glob character (*, ?, []) *intentionally*
 * — the whole point of the pattern — so it needs protection from local
 * shell expansion even when it has no whitespace. Always quoted, rather
 * than quoteLocal's "only if special chars present" rule.
 * @param {string} str
 * @param {ClientOs} os
 * @returns {string}
 */
export function quoteExcludePattern(str, os) {
  return quoteLocalAlways(str, os)
}

/**
 * Quote a remote path that sits *inside* an outer double-quoted command
 * string handed to `ssh "..."` (or rsync's `-e "ssh ..."`). That string is
 * always parsed by a POSIX remote shell regardless of the local client OS,
 * so a value containing whitespace is wrapped in single quotes, escaping an
 * embedded single quote with the standard '\'' trick.
 * @param {string} str
 * @returns {string}
 */
export function quoteNested(str) {
  if (!str || !/\s/.test(str)) return str
  return `'${str.replace(/'/g, `'\\''`)}'`
}

/**
 * Quote a value for an ssh_config line if it contains whitespace or `#`
 * (which starts a comment in ssh_config). This is ssh_config's own quoting
 * rule — a different context from shell quoting, so not reused from
 * quoteLocal/quoteNested.
 * @param {string} str
 * @returns {string}
 */
export function quoteSshConfig(str) {
  if (!str || !/[\s#]/.test(str)) return str
  return `"${str.replace(/"/g, '\\"')}"`
}

/**
 * Quote a path used inside an sftp batch-mode line (the body of the heredoc
 * / here-string built by buildSftpBatchTokens). That text is never touched
 * by a local or remote shell — it goes straight to sftp's own stdin — so
 * it follows sftp's own command-line grammar: wrap in double quotes when
 * whitespace is present, escaping embedded backslashes/quotes.
 * @param {string} str
 * @returns {string}
 */
export function quoteSftpBatch(str) {
  if (!str || !/\s/.test(str)) return str
  return `"${str.replace(/(["\\])/g, '\\$1')}"`
}

/**
 * Join a source folder and filename into a local path using the client OS's
 * separator. Does not double the separator if dir already ends with one.
 * @param {string} dir
 * @param {string} name
 * @param {ClientOs} os
 * @returns {string}
 */
export function joinLocal(dir, name, os) {
  const sep = os === 'win' ? '\\' : '/'
  const trimmed = dir ? dir.replace(/[\\/]+$/, '') : ''
  return trimmed ? `${trimmed}${sep}${name}` : name
}

/**
 * Join a remote directory and filename with `/`. Does not double the
 * separator if dir already ends with one.
 * @param {string} dir
 * @param {string} name
 * @returns {string}
 */
export function joinRemote(dir, name) {
  const trimmed = dir ? dir.replace(/\/+$/, '') : ''
  return trimmed ? `${trimmed}/${name}` : name
}

/**
 * Build a `user@host:path` token for scp/rsync. This is a bare local-shell
 * argument (not nested inside an ssh command string), so if it contains
 * whitespace/special chars the *whole* token is quoted. Used for both the
 * upload destination and, per-file, the download source.
 * @param {string} user
 * @param {string} host
 * @param {string} path
 * @param {ClientOs} os
 * @returns {string}
 */
export function buildRemoteTarget(user, host, path, os) {
  return quoteLocal(`${user}@${host}:${path}`, os)
}

/** @param {string} port */
function effectivePort(port) {
  const trimmed = (port || '').trim()
  return /^\d+$/.test(trimmed) ? trimmed : DEFAULT_PORT
}

/** @param {string} user */
function effectiveUser(user) {
  return (user || '').trim() || DEFAULT_USER
}

/** @param {string} dest */
function effectiveDest(dest) {
  return (dest || '').trim() || DEFAULT_DEST
}

/**
 * Fallback for the bare local-destination argument in download mode. Uses
 * `.` rather than `~` since `~` doesn't expand reliably in PowerShell.
 * @param {string} dir
 */
function effectiveLocalDir(dir) {
  const trimmed = (dir || '').trim()
  return trimmed || DEFAULT_LOCAL_DIR
}

/**
 * Split a comma-separated exclude-patterns field into individual trimmed,
 * non-empty patterns, one `--exclude=` flag per pattern.
 * @param {string} raw
 * @returns {string[]}
 */
function parseExcludePatterns(raw) {
  return (raw || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)
}

/**
 * Append a token, prefixing its text with a single space unless it is the
 * first token in the list — keeps plainText assembly a plain join('').
 * @param {Token[]} tokens
 * @param {Token['type']} type
 * @param {string} text
 */
function push(tokens, type, text) {
  tokens.push({ type, text: tokens.length ? ` ${text}` : text })
}

/**
 * Push the shared `[-J <jump>] -p <port> [-i <key>] user@host` fragment used
 * by every ssh-based step (test connection, remote mkdir, chmod, restart,
 * health check). `-J` goes first, matching how `-A` is already placed before
 * this fragment in the login step — one predictable flag order everywhere.
 * @param {Token[]} tokens
 * @param {{ port: string, key: string, os: ClientOs, user: string, host: string, jumpHost: string }} p
 */
function pushSshTarget(tokens, { port, key, os, user, host, jumpHost }) {
  if (jumpHost) {
    push(tokens, 'flag', '-J')
    push(tokens, 'value', quoteLocal(jumpHost, os))
  }
  push(tokens, 'flag', '-p')
  push(tokens, 'value', port)
  if (key) {
    push(tokens, 'flag', '-i')
    push(tokens, 'value', quoteLocal(key, os))
  }
  push(tokens, 'value', `${user}@${host}`)
}

/**
 * sftp has no single-line, scp-style invocation covering many files or a
 * mkdir/chmod side effect — everything is a line in a batch-mode session.
 * Wraps already-quoted batch lines (see quoteSftpBatch) into one full,
 * copy-pasteable `sftp -b -` invocation reading those lines from stdin.
 *
 * POSIX: a heredoc trails the command. PowerShell has no heredoc syntax for
 * external commands, so a literal here-string is piped in instead, which
 * must come *before* the command it feeds — the two branches below aren't
 * just quoting variants of each other, the token order itself flips.
 *
 * A leading `-` on a batch line tells sftp not to abort the rest of the
 * session if that one command fails — used for mkdir below so re-running
 * against an already-created directory doesn't stop the upload short.
 * @param {StepContext} ctx
 * @param {string[]} lines
 * @returns {Token[]}
 */
function buildSftpBatchTokens(ctx, lines) {
  const body = [...lines, 'bye'].join('\n')
  const tokens = []

  const pushInvocation = () => {
    push(tokens, 'cmd', 'sftp')
    push(tokens, 'flag', '-b')
    push(tokens, 'value', '-')
    if (ctx.jumpHost) {
      push(tokens, 'flag', '-J')
      push(tokens, 'value', quoteLocal(ctx.jumpHost, ctx.os))
    }
    push(tokens, 'flag', '-P')
    push(tokens, 'value', ctx.port)
    if (ctx.key) {
      push(tokens, 'flag', '-i')
      push(tokens, 'value', quoteLocal(ctx.key, ctx.os))
    }
    push(tokens, 'value', `${ctx.user}@${ctx.host}`)
  }

  if (ctx.os === 'win') {
    tokens.push({ type: 'string', text: `@'\n${body}\n'@` })
    push(tokens, 'operator', '|')
    pushInvocation()
  } else {
    pushInvocation()
    push(tokens, 'operator', '<<')
    push(tokens, 'string', "'SFTP_EOF'")
    tokens.push({ type: 'string', text: `\n${body}\nSFTP_EOF` })
  }

  return tokens
}

/** @param {Token[]} tokens */
function tokensToPlainText(tokens) {
  return tokens.map((t) => t.text).join('')
}

/**
 * @typedef {{
 *   direction: Direction, os: ClientOs, transport: Transport, port: string,
 *   user: string, dest: string, key: string, srcDir: string, files: FileEntry[],
 *   host: string, jumpHost: string, optMkdir: boolean, optRecursive: boolean, optChmod: boolean,
 *   optTestConn: boolean, optDryRun: boolean, optIcaclsFix: boolean,
 *   optDelete: boolean, optProgress: boolean, optKnownHosts: boolean,
 *   optPartial: boolean, optSshLogin: boolean, optAgentForward: boolean,
 *   optChecksum: boolean, optBackup: boolean, optCompress: boolean, optTarBundle: boolean,
 *   bwLimit: string, linkDest: string, excludePatterns: string, buildCommand: string,
 *   restartCommand: string, healthCheckCommand: string,
 * }} StepContext
 */

/**
 * Fixed name for the temporary archive the tar-bundle mode creates in the
 * current directory, transfers, and removes again after remote extraction.
 */
const TAR_BUNDLE_NAME = 'scp2go-bundle.tar.gz'

/**
 * The identity known_hosts stores/matches a host under: bare hostname on the
 * default port, or `[host]:port` once the port is non-standard — ssh-keyscan
 * builds this format for its *output* automatically, but ssh-keygen -R needs
 * it handed to it explicitly as the argument to match the right line.
 * @param {string} host
 * @param {string} port
 */
function knownHostsRef(host, port) {
  return port === '22' ? host : `[${host}]:${port}`
}

/**
 * A bare local build command (e.g. `npm run build`), run before anything
 * else — it needs no network, so it makes sense to finish before even the
 * known_hosts/connection-test steps. Passed through verbatim: this is
 * arbitrary user-authored shell text, not a path or pattern this tool
 * constructs, so there is nothing here to quote or interpret.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildBuildStep(ctx) {
  const cmd = (ctx.buildCommand || '').trim()
  if (!cmd) return null
  const tokens = [{ type: 'value', text: cmd }]
  return { id: 'build', label: '建置', tokens, plainText: cmd }
}

/**
 * Prepares known_hosts for this host, shown first (before the connection
 * test itself) when enabled, so no later ssh-based step hits an interactive
 * prompt. Two concerns chained together: drop any stale entry first — a
 * rebuilt cloud VM reusing the same IP gets a *new* host key, and ssh refuses
 * to connect outright (not just prompt) while the old one is still on file —
 * then add the current key. Available in both directions since it only
 * concerns the host, not the transfer direction.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildKnownHostsStep(ctx) {
  if (!ctx.optKnownHosts) return null
  const tokens = []
  const knownHostsPath = ctx.os === 'win' ? '$HOME\\.ssh\\known_hosts' : '~/.ssh/known_hosts'

  push(tokens, 'cmd', 'ssh-keygen')
  push(tokens, 'flag', '-R')
  push(tokens, 'value', quoteLocal(knownHostsRef(ctx.host, ctx.port), ctx.os))
  push(tokens, 'operator', '&&')
  push(tokens, 'cmd', 'ssh-keyscan')
  push(tokens, 'flag', '-p')
  push(tokens, 'value', ctx.port)
  push(tokens, 'value', quoteLocal(ctx.host, ctx.os))
  push(tokens, 'operator', '>>')
  push(tokens, 'value', knownHostsPath)

  return { id: 'knownHosts', label: '信任主機金鑰', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Non-interactive connectivity check, shown first when enabled. Available in
 * both directions.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildTestConnStep(ctx) {
  if (!ctx.optTestConn) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  push(tokens, 'string', '"echo OK"')
  return { id: 'testConn', label: '連線測試', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Loads the identity key into the local ssh-agent before logging in — a
 * prerequisite for Agent Forwarding (-A) to actually have anything to
 * forward. Shown alongside it, and only when a key path is set (with no
 * path, ssh-add would fall back to trying every default key instead of the
 * one this tool actually knows about, which isn't worth surfacing here).
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildSshAddStep(ctx) {
  if (!(ctx.optAgentForward && ctx.key)) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh-add')
  push(tokens, 'value', quoteLocal(ctx.key, ctx.os))
  return { id: 'sshAdd', label: '將金鑰加入 ssh-agent', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * A bare, interactive `ssh user@host` login — no trailing command, so it
 * drops the user into a remote shell instead of running non-interactively
 * and returning like testConn does. Available in both directions.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildSshLoginStep(ctx) {
  if (!ctx.optSshLogin) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh')
  if (ctx.optAgentForward) push(tokens, 'flag', '-A')
  pushSshTarget(tokens, ctx)
  return { id: 'sshLogin', label: '互動式登入', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Restarts a remote service after the transfer completes, via a plain ssh
 * remote-command call. The user's command is arbitrary shell text they
 * authored themselves — only the outer double-quote boundary is protected
 * (a literal `"` in their command would otherwise end the string early),
 * nothing else about their command is touched or reinterpreted.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildRestartStep(ctx) {
  const cmd = (ctx.restartCommand || '').trim()
  if (!cmd) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  push(tokens, 'string', `"${cmd.replace(/"/g, '\\"')}"`)
  return { id: 'restart', label: '重啟遠端服務', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Verifies the deploy actually came up, last in the sequence — same
 * verbatim-passthrough treatment as the restart command, since this is
 * equally arbitrary user-authored shell text (a curl check, a systemctl
 * is-active, whatever fits their setup).
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildHealthCheckStep(ctx) {
  const cmd = (ctx.healthCheckCommand || '').trim()
  if (!cmd) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  push(tokens, 'string', `"${cmd.replace(/"/g, '\\"')}"`)
  return { id: 'healthCheck', label: '健康檢查', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Upload: remote `mkdir -p` via ssh (optionally chaining a `chmod 700`).
 * Download: a *local*, non-ssh-wrapped directory creation — POSIX `mkdir -p`
 * or PowerShell `New-Item`, since there's nothing remote to create.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildMkdirStep(ctx) {
  if (!ctx.optMkdir) return null

  if (ctx.direction === 'download') {
    const tokens = []
    const localDir = quoteLocal(effectiveLocalDir(ctx.srcDir), ctx.os)
    if (ctx.os === 'win') {
      push(tokens, 'cmd', 'New-Item')
      push(tokens, 'flag', '-ItemType')
      push(tokens, 'value', 'Directory')
      push(tokens, 'flag', '-Force')
      push(tokens, 'flag', '-Path')
      push(tokens, 'value', localDir)
    } else {
      push(tokens, 'cmd', 'mkdir')
      push(tokens, 'flag', '-p')
      push(tokens, 'value', localDir)
    }
    return { id: 'localMkdir', label: '建立本機目錄', tokens, plainText: tokensToPlainText(tokens) }
  }

  if (ctx.transport === 'sftp') {
    // sftp's own mkdir has no -p: it errors on an already-existing
    // directory, which a plain ssh exec never had to worry about. The
    // leading `-` tells the batch to shrug that one off and continue —
    // sftp is also the one transport where a stray `ssh "mkdir -p ..."`
    // step (what every other branch here uses) may not even be available:
    // a server locked down to `ForceCommand internal-sftp` accepts sftp's
    // own commands but rejects arbitrary shell exec outright.
    const destQuoted = quoteSftpBatch(ctx.dest)
    const lines = [`-mkdir ${destQuoted}`]
    if (ctx.optChmod) lines.push(`chmod 700 ${destQuoted}`)
    const tokens = buildSftpBatchTokens(ctx, lines)
    return { id: 'mkdir', label: '建立遠端目錄', tokens, plainText: tokensToPlainText(tokens) }
  }

  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  const destNested = quoteNested(ctx.dest)
  let inner = `mkdir -p ${destNested}`
  if (ctx.optChmod) inner += ` && chmod 700 ${destNested}`
  push(tokens, 'string', `"${inner}"`)
  return { id: 'mkdir', label: '建立遠端目錄', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Renames each about-to-be-overwritten destination file out of the way
 * right before the transfer writes over it (upload only) — a quick
 * rollback point if the new version turns out to be broken. A file that
 * doesn't exist yet (first deploy) is silently skipped rather than
 * aborting the step, the same idempotency concern sftp's own `-mkdir`
 * already handles above.
 *
 * The `$` in `$ts`/`$(date ...)` has to survive the *local* shell's own
 * parsing of this double-quoted ssh argument before ssh ever sends it to
 * the remote shell — escaped the same way an embedded `"` already is
 * elsewhere in this file: backslash for POSIX, backtick for PowerShell.
 * sftp's batch grammar has no shell substitution at all (it's not a
 * shell), so it falls back to one rolling `.bak` per file instead of a
 * timestamped history.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildBackupStep(ctx) {
  if (!(ctx.optBackup && ctx.direction === 'upload' && ctx.files.length > 0)) return null

  if (ctx.transport === 'sftp') {
    const lines = ctx.files.map((f) => {
      const target = quoteSftpBatch(joinRemote(ctx.dest, f.name))
      return `-rename ${target} ${target}.bak`
    })
    const tokens = buildSftpBatchTokens(ctx, lines)
    return { id: 'backup', label: '備份現有檔案', tokens, plainText: tokensToPlainText(tokens) }
  }

  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  const esc = ctx.os === 'win' ? '`$' : '\\$'
  const moves = ctx.files.map((f) => {
    const target = quoteNested(joinRemote(ctx.dest, f.name))
    return `mv ${target} ${target}.bak.${esc}ts 2>/dev/null || true`
  })
  const inner = [`ts=${esc}(date +%Y%m%d%H%M%S)`, ...moves].join('; ')
  push(tokens, 'string', `"${inner}"`)
  return { id: 'backup', label: '備份現有檔案', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Packs the selected files into one local tar.gz before transfer (upload
 * only) — many small files move far faster as a single archive than as
 * per-file transfers. Windows 10+ ships bsdtar as tar.exe, so the same
 * command works in PowerShell. Paired with buildTarExtractStep below; the
 * transfer step in between carries just the archive (see buildSteps).
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildTarPackStep(ctx) {
  if (!(ctx.optTarBundle && ctx.direction === 'upload' && ctx.files.length > 0)) return null
  const tokens = []
  push(tokens, 'cmd', 'tar')
  push(tokens, 'flag', '-czf')
  push(tokens, 'value', TAR_BUNDLE_NAME)
  if (ctx.srcDir.trim()) {
    push(tokens, 'flag', '-C')
    push(tokens, 'value', quoteLocal(ctx.srcDir.trim(), ctx.os))
  }
  for (const f of ctx.files) push(tokens, 'value', quoteLocal(f.name, ctx.os))
  return { id: 'tarPack', label: '打包壓縮檔', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Unpacks the transferred archive into the destination on the remote host
 * and removes it. Runs over plain ssh exec like the restart/health-check
 * steps do — bundling inherently needs a remote shell, whichever transport
 * carried the archive.
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildTarExtractStep(ctx) {
  if (!(ctx.optTarBundle && ctx.direction === 'upload' && ctx.files.length > 0)) return null
  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)
  const archive = quoteNested(joinRemote(ctx.dest, TAR_BUNDLE_NAME))
  const dest = quoteNested(ctx.dest)
  push(tokens, 'string', `"tar -xzf ${archive} -C ${dest} && rm ${archive}"`)
  return { id: 'tarExtract', label: '遠端解壓縮', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * sftp's `put`/`get` take exactly one local/remote path pair per call, so
 * unlike scp/rsync there is no single invocation covering every selected
 * file — each becomes its own batch line in one sftp session instead.
 * `-r` is added per line only for entries that are actually directories:
 * sftp's recursive flag is inherently per-command, so (unlike scp's single
 * blanket -r) there's no need to consult optRecursive at all here.
 * @param {StepContext} ctx
 * @returns {Step}
 */
function buildSftpTransferStep(ctx) {
  const { os, dest, srcDir, files, direction } = ctx

  const lines = files.map((f) => {
    const recursive = f.isDir ? '-r ' : ''
    if (direction === 'download') {
      const remote = quoteSftpBatch(joinRemote(dest, f.name))
      const local = quoteSftpBatch(joinLocal(effectiveLocalDir(srcDir), f.name, os))
      return `get ${recursive}${remote} ${local}`
    }
    const local = quoteSftpBatch(joinLocal(srcDir, f.name, os))
    const remote = quoteSftpBatch(joinRemote(dest, f.name))
    return `put ${recursive}${local} ${remote}`
  })

  const tokens = buildSftpBatchTokens(ctx, lines)
  return direction === 'download'
    ? { id: 'download', label: '下載檔案', tokens, plainText: tokensToPlainText(tokens) }
    : { id: 'upload', label: '上傳檔案', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * The scp/rsync transfer itself. Direction flips which side gets the
 * `user@host:` prefix and which is the bare trailing argument; the
 * scp-flag/rsync `-e "ssh..."` preamble is otherwise identical either way.
 * @param {StepContext} ctx
 * @returns {Step}
 */
function buildTransferStep(ctx) {
  if (ctx.transport === 'sftp') return buildSftpTransferStep(ctx)

  const {
    os,
    transport,
    port,
    key,
    host,
    user,
    dest,
    srcDir,
    files,
    direction,
    jumpHost,
    optRecursive,
    optDryRun,
    optDelete,
    optProgress,
    optPartial,
    optChecksum,
    optCompress,
    bwLimit,
    linkDest,
    excludePatterns,
  } = ctx
  const tokens = []
  const hasFolder = files.some((f) => f.isDir)

  if (transport === 'scp') {
    push(tokens, 'cmd', 'scp')
    if (hasFolder || optRecursive) push(tokens, 'flag', '-r')
    if (jumpHost) {
      push(tokens, 'flag', '-J')
      push(tokens, 'value', quoteLocal(jumpHost, os))
    }
    push(tokens, 'flag', '-P')
    push(tokens, 'value', port)
    if (key) {
      push(tokens, 'flag', '-i')
      push(tokens, 'value', quoteLocal(key, os))
    }
  } else {
    push(tokens, 'cmd', 'rsync')
    push(tokens, 'flag', optCompress ? '-avz' : '-av')
    if (optPartial) push(tokens, 'flag', '--partial')
    if (optChecksum) push(tokens, 'flag', '--checksum')
    if (optDelete) push(tokens, 'flag', '--delete')
    if (linkDest.trim()) push(tokens, 'flag', `--link-dest=${quoteLocal(linkDest.trim(), os)}`)
    for (const pattern of parseExcludePatterns(excludePatterns)) {
      push(tokens, 'flag', `--exclude=${quoteExcludePattern(pattern, os)}`)
    }
    // Emitted only when the value parses — a half-typed limit would
    // otherwise abort the whole rsync run with an option error.
    if (bwLimit.trim() && isValidBwLimit(bwLimit)) push(tokens, 'flag', `--bwlimit=${bwLimit.trim()}`)
    if (optProgress) push(tokens, 'flag', '--progress')
    if (optDryRun) push(tokens, 'flag', '--dry-run')
    push(tokens, 'flag', '-e')
    let sshInner = 'ssh'
    if (jumpHost) sshInner += ` -J ${quoteNested(jumpHost)}`
    sshInner += ` -p ${port}`
    if (key) sshInner += ` -i ${quoteNested(key)}`
    push(tokens, 'string', `"${sshInner}"`)
  }

  if (direction === 'download') {
    for (const f of files) {
      push(tokens, 'value', buildRemoteTarget(user, host, joinRemote(dest, f.name), os))
    }
    push(tokens, 'value', quoteLocal(effectiveLocalDir(srcDir), os))
  } else {
    for (const f of files) {
      push(tokens, 'value', quoteLocal(joinLocal(srcDir, f.name, os), os))
    }
    push(tokens, 'value', buildRemoteTarget(user, host, dest, os))
  }

  return direction === 'download'
    ? { id: 'download', label: '下載檔案', tokens, plainText: tokensToPlainText(tokens) }
    : { id: 'upload', label: '上傳檔案', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Remote permission fix (upload only — this is specifically about remote
 * SSH-key hygiene, which has no equivalent for a generic download).
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildChmodStep(ctx) {
  if (!(ctx.optChmod && ctx.files.length > 0)) return null

  const plainFiles = ctx.files.filter((f) => !f.isDir)
  const dirFiles = ctx.files.filter((f) => f.isDir)

  if (ctx.transport === 'sftp') {
    const lines = [
      ...plainFiles.map((f) => `chmod 600 ${quoteSftpBatch(joinRemote(ctx.dest, f.name))}`),
      ...dirFiles.map((f) => `chmod 700 ${quoteSftpBatch(joinRemote(ctx.dest, f.name))}`),
      `chmod 700 ${quoteSftpBatch(ctx.dest)}`,
    ]
    const tokens = buildSftpBatchTokens(ctx, lines)
    return { id: 'chmod', label: '修正權限（私鑰須 600）', tokens, plainText: tokensToPlainText(tokens) }
  }

  const tokens = []
  push(tokens, 'cmd', 'ssh')
  pushSshTarget(tokens, ctx)

  const clauses = []
  if (plainFiles.length) {
    clauses.push(`chmod 600 ${plainFiles.map((f) => quoteNested(joinRemote(ctx.dest, f.name))).join(' ')}`)
  }
  if (dirFiles.length) {
    clauses.push(`chmod 700 ${dirFiles.map((f) => quoteNested(joinRemote(ctx.dest, f.name))).join(' ')}`)
  }
  clauses.push(`chmod 700 ${quoteNested(ctx.dest)}`)

  push(tokens, 'string', `"${clauses.join(' && ')}"`)
  return { id: 'chmod', label: '修正權限（私鑰須 600）', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Windows-only: local private-key file permissions (icacls is Windows'
 * equivalent of the remote chmod 600 — a separate, client-side concern).
 * @param {StepContext} ctx
 * @returns {Step | null}
 */
function buildIcaclsStep(ctx) {
  if (!(ctx.optIcaclsFix && ctx.os === 'win' && ctx.key)) return null
  const tokens = []
  push(tokens, 'cmd', 'icacls')
  push(tokens, 'value', quoteLocal(ctx.key, 'win'))
  push(tokens, 'flag', '/inheritance:r')
  push(tokens, 'flag', '/grant:r')
  push(tokens, 'string', '"$($env:USERNAME):(R)"')
  return { id: 'icaclsFix', label: '修正本機金鑰權限', tokens, plainText: tokensToPlainText(tokens) }
}

/**
 * Build the ordered list of command steps for the current form state.
 * Returns [] when host is blank/whitespace-only, which drives the panel's
 * empty-state guidance message.
 * @param {object} state
 * @returns {Step[]}
 */
export function buildSteps(state) {
  const host = (state.host || '').trim()
  if (!host) return []

  /** @type {StepContext} */
  const ctx = {
    direction: state.direction === 'download' ? 'download' : 'upload',
    os: state.os === 'nix' ? 'nix' : 'win',
    transport: state.transport === 'rsync' ? 'rsync' : state.transport === 'sftp' ? 'sftp' : 'scp',
    port: effectivePort(state.port),
    user: effectiveUser(state.user),
    dest: effectiveDest(state.dest),
    key: (state.key || '').trim(),
    srcDir: state.srcDir || '',
    files: Array.isArray(state.files) ? state.files : [],
    host,
    jumpHost: (state.jumpHost || '').trim(),
    optMkdir: Boolean(state.optMkdir),
    optRecursive: Boolean(state.optRecursive),
    optChmod: Boolean(state.optChmod),
    optTestConn: Boolean(state.optTestConn),
    optDryRun: Boolean(state.optDryRun),
    optIcaclsFix: Boolean(state.optIcaclsFix),
    optDelete: Boolean(state.optDelete),
    optProgress: Boolean(state.optProgress),
    optKnownHosts: Boolean(state.optKnownHosts),
    optPartial: Boolean(state.optPartial),
    optSshLogin: Boolean(state.optSshLogin),
    optAgentForward: Boolean(state.optAgentForward),
    optChecksum: Boolean(state.optChecksum),
    optBackup: Boolean(state.optBackup),
    optCompress: state.optCompress !== false,
    optTarBundle: Boolean(state.optTarBundle),
    bwLimit: state.bwLimit || '',
    linkDest: state.linkDest || '',
    excludePatterns: state.excludePatterns || '',
    buildCommand: state.buildCommand || '',
    restartCommand: state.restartCommand || '',
    healthCheckCommand: state.healthCheckCommand || '',
  }

  const steps = []
  const build = buildBuildStep(ctx)
  if (build) steps.push(build)
  const tarPack = buildTarPackStep(ctx)
  if (tarPack) steps.push(tarPack)
  const knownHosts = buildKnownHostsStep(ctx)
  if (knownHosts) steps.push(knownHosts)
  const testConn = buildTestConnStep(ctx)
  if (testConn) steps.push(testConn)
  const sshAdd = buildSshAddStep(ctx)
  if (sshAdd) steps.push(sshAdd)
  const sshLogin = buildSshLoginStep(ctx)
  if (sshLogin) steps.push(sshLogin)
  const mkdir = buildMkdirStep(ctx)
  if (mkdir) steps.push(mkdir)
  if (ctx.direction === 'upload') {
    const backup = buildBackupStep(ctx)
    if (backup) steps.push(backup)
  }
  // With tar bundling, the transfer carries only the archive (packed into
  // the current directory, so srcDir doesn't apply). rsync --delete is
  // dropped for that transfer: its transfer set would be just the one
  // temporary archive, so it would wipe everything else at the destination.
  steps.push(
    buildTransferStep(tarPack ? { ...ctx, files: [{ name: TAR_BUNDLE_NAME, isDir: false }], srcDir: '', optDelete: false } : ctx)
  )
  if (ctx.direction === 'upload') {
    const tarExtract = buildTarExtractStep(ctx)
    if (tarExtract) steps.push(tarExtract)
    const chmod = buildChmodStep(ctx)
    if (chmod) steps.push(chmod)
  }
  const icacls = buildIcaclsStep(ctx)
  if (icacls) steps.push(icacls)
  const restart = buildRestartStep(ctx)
  if (restart) steps.push(restart)
  const healthCheck = buildHealthCheckStep(ctx)
  if (healthCheck) steps.push(healthCheck)

  return steps
}

/**
 * Join all steps into one copyable block, each preceded by a `# label`
 * comment header, blocks separated by a blank line. Pass getLabel to
 * override the label per step (e.g. for i18n) — defaults to step.label.
 * @param {Step[]} steps
 * @param {(step: Step) => string} [getLabel]
 * @returns {string}
 */
export function buildCopyAllText(steps, getLabel = (s) => s.label) {
  return steps.map((s) => `# ${getLabel(s)}\n${s.plainText}`).join('\n\n')
}

/**
 * Wraps buildCopyAllText's output in an OS-appropriate script preamble
 * (shebang + fail-fast for POSIX, fail-fast preference for PowerShell) so
 * it's directly runnable as a saved .sh/.ps1 file, not just paste-able.
 * @param {Step[]} steps
 * @param {ClientOs} os
 * @param {(step: Step) => string} [getLabel]
 * @returns {string}
 */
export function buildScriptFile(steps, os, getLabel = (s) => s.label) {
  const header = os === 'win' ? "# scp2go\n$ErrorActionPreference = 'Stop'\n\n" : '#!/usr/bin/env bash\nset -euo pipefail\n\n'
  return `${header}${buildCopyAllText(steps, getLabel)}\n`
}

/**
 * Build a single ~/.ssh/config Host block from a saved entry. Rendered as
 * plain text, not shell-syntax tokens — it's config-file syntax, not a
 * command, so reusing the tok-cmd/tok-flag visual language would mislead.
 * @param {SshConfigEntry} entry
 * @returns {string}
 */
export function buildSshConfigEntryBlock(entry) {
  const alias = (entry.alias || '').trim() || entry.host
  const port = effectivePort(entry.port)
  const user = effectiveUser(entry.user)
  const key = (entry.key || '').trim()

  const lines = [
    `Host ${quoteSshConfig(alias)}`,
    `  HostName ${quoteSshConfig(entry.host)}`,
    `  Port ${port}`,
    `  User ${quoteSshConfig(user)}`,
  ]
  if (key) lines.push(`  IdentityFile ${quoteSshConfig(key)}`)

  return lines.join('\n')
}

/**
 * Concatenate every saved entry's Host block, separated by a blank line —
 * this is what gets copied or exported as a full ~/.ssh/config addition.
 * @param {SshConfigEntry[]} entries
 * @returns {string}
 */
export function buildSshConfigExport(entries) {
  return entries.map(buildSshConfigEntryBlock).join('\n\n')
}

/**
 * Strips a wrapping "..." from an ssh_config value (its own quoting
 * convention, matching quoteSshConfig) and un-escapes \" inside it. Returns
 * the value as-is if it wasn't quoted.
 * @param {string} raw
 * @returns {string}
 */
function unquoteSshConfig(raw) {
  const trimmed = raw.trim()
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"')
  }
  return trimmed
}

/**
 * Parses `Host` blocks out of ~/.ssh/config-style text into entries this
 * tool understands — the inverse of buildSshConfigExport. Best-effort and
 * deliberately narrow: only HostName/Port/User/IdentityFile are read (any
 * other directive is ignored, not an error), directive names are matched
 * case-insensitively per the real ssh_config format, and a `Host` line
 * naming multiple patterns or a wildcard (`Host *`, `Host web-*`) is
 * skipped — those describe a *pattern* of hosts, not one specific saved
 * connection, so there's nothing meaningful to import for it. Returned
 * entries have no `id` — the caller (a reducer action) assigns fresh ones,
 * the same division of responsibility as profile import.
 * @param {string} text
 * @returns {Array<{alias: string, host: string, port: string, user: string, key: string}>}
 */
export function parseSshConfigText(text) {
  /** @type {Array<{alias: string, host: string, port: string, user: string, key: string}>} */
  const entries = []
  /** @type {typeof entries[number] | null} */
  let current = null

  for (const rawLine of (text || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const spaceIdx = line.search(/\s/)
    if (spaceIdx === -1) continue
    const directive = line.slice(0, spaceIdx).toLowerCase()
    const rest = line.slice(spaceIdx + 1).trim()
    if (!rest) continue

    if (directive === 'host') {
      const patterns = rest.split(/\s+/)
      const alias = patterns[0]
      current = patterns.length === 1 && alias && !/[*?]/.test(alias) ? { alias, host: '', port: '', user: '', key: '' } : null
      if (current) entries.push(current)
      continue
    }

    if (!current) continue
    const value = unquoteSshConfig(rest)
    if (directive === 'hostname') current.host = value
    else if (directive === 'port') current.port = value
    else if (directive === 'user') current.user = value
    else if (directive === 'identityfile') current.key = value
  }

  // A Host block with no HostName isn't unusable — ssh itself falls back to
  // the alias as the address in that case, so mirror that here too.
  return entries.filter((e) => e.alias).map((e) => ({ ...e, host: e.host || e.alias }))
}
