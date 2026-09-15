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
 * for a fresh Oracle Cloud free-tier Ubuntu instance.
 * @returns {object} partial state patch
 */
export function applyOraclePreset() {
  return { user: 'ubuntu', port: '22', dest: '~/' }
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
