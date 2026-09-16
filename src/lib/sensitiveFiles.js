// @ts-check

// Filenames commonly meant to stay private. Matched precisely (exact name
// or a specific extension), not by loose substring, to keep false positives
// low — e.g. this must not flag "keyboard-layout.txt" just for containing
// "key".
const SENSITIVE_PATTERNS = [
  /^\.env(\..+)?$/i, // .env, .env.local, .env.production, ...
  /^\.npmrc$/i,
  /^\.netrc$/i,
  /^\.git-credentials$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)$/i, // private key conventional names (id_ed25519.pub is NOT matched)
  /^credentials$/i,
  /^secrets?\.(json|ya?ml)$/i,
  /\.(pem|ppk|p12|pfx|key)$/i,
]

/**
 * Best-effort, filename-only heuristic for files commonly meant to stay
 * private (env files, private keys, credential stores). Never reads file
 * content — matches by name only, consistent with the rest of the app's
 * "filenames only" privacy model. This is a nudge, not a guarantee: both
 * false positives (an ambiguous "*.key" that's actually public) and false
 * negatives (a secret with an unrecognized name) are expected.
 * @param {string} name
 * @returns {boolean}
 */
export function isSensitiveFilename(name) {
  const base = (name || '').split(/[\\/]/).pop() || ''
  return SENSITIVE_PATTERNS.some((re) => re.test(base))
}
