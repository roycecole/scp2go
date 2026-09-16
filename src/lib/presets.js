// @ts-check

/**
 * Guess a typical SSH key folder for the given client OS. Browser JS cannot
 * detect the user's real local username, so this is only a sensible,
 * editable starting placeholder — never actual filesystem detection.
 * @param {'win'|'nix'} os
 * @returns {string}
 */
export function guessSshKeyFolder(os) {
  return os === 'win' ? 'C:\\Users\\<username>\\.ssh' : '~/.ssh'
}

/**
 * FR-7.1 — Oracle Ubuntu defaults: user/port/dest set to the common values
 * for a fresh Oracle Cloud free-tier Ubuntu instance. user/port/dest match
 * the form's own defaults already, so on their own they're a no-op unless
 * those fields were previously changed — the toggles are what make this
 * preset actually worth clicking: Oracle's free-tier VMs commonly get
 * rebuilt while keeping the same IP, which leaves a stale, connection-
 * blocking host key behind, and a quick reachability check before doing
 * anything else is cheap insurance for a host you don't control the uptime
 * of. Both are just toggles, so the user can switch either back off.
 * @returns {object} partial state patch
 */
export function applyOraclePreset() {
  return { user: 'ubuntu', port: '22', dest: '~/', optKnownHosts: true, optTestConn: true }
}

/**
 * FR-7.2 — Upload SSH key to ~/.ssh: points dest at ~/.ssh/, enables the
 * mkdir + chmod steps, and pre-fills a typical (editable) source folder.
 * @param {{ os: 'win'|'nix' }} state
 * @returns {object} partial state patch
 */
export function applySshKeyPreset(state) {
  return {
    dest: '~/.ssh/',
    optMkdir: true,
    optChmod: true,
    srcDir: guessSshKeyFolder(state.os),
  }
}
