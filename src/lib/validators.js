// @ts-check

/**
 * Soft format checks for form fields. Every validator treats an empty /
 * whitespace-only value as valid — all of these fields are optional or have
 * sensible fallbacks at command-build time, so validation only flags text
 * the user actually typed that cannot be right. Command generation is never
 * blocked by these; they only drive inline hints.
 */

const HOSTNAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/

/** @param {string} v */
export function isValidHost(v) {
  const t = (v || '').trim()
  if (!t) return true
  if (/\s/.test(t)) return false
  // IPv6 (loose — full grammar is overkill for a hint)
  if (t.includes(':')) return /^[0-9a-fA-F:]+$/.test(t)
  const ipv4 = t.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) return ipv4.slice(1).every((octet) => Number(octet) <= 255)
  return HOSTNAME_RE.test(t)
}

/** @param {string} v */
export function isValidPort(v) {
  const t = (v || '').trim()
  if (!t) return true
  if (!/^\d+$/.test(t)) return false
  const n = Number(t)
  return n >= 1 && n <= 65535
}

/** @param {string} v */
export function isValidUser(v) {
  const t = (v || '').trim()
  if (!t) return true
  return !/[\s@:]/.test(t)
}

/**
 * `[user@]host[:port]`, possibly comma-separated multi-hop — ssh's own -J
 * grammar. Anything without whitespace is plausibly valid, so only
 * whitespace is rejected.
 * @param {string} v
 */
export function isValidJumpHost(v) {
  const t = (v || '').trim()
  if (!t) return true
  return !/\s/.test(t)
}

/**
 * rsync --bwlimit value: a number (KB/s by default) with an optional
 * k/m/g unit suffix, e.g. `5000`, `1.5m`.
 * @param {string} v
 */
export function isValidBwLimit(v) {
  const t = (v || '').trim()
  if (!t) return true
  return /^\d+(\.\d+)?[kKmMgG]?$/.test(t)
}
