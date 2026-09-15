// @ts-check

/**
 * Copy text to the clipboard, preferring the async Clipboard API and
 * falling back to a hidden-textarea + execCommand('copy'). The fallback
 * matters concretely here: the built page also works opened directly via
 * file://, where the async Clipboard API is commonly blocked by the
 * browser's secure-context requirement.
 * @param {string} text
 * @returns {Promise<boolean>} whether the copy succeeded
 */
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // fall through to the legacy fallback
    }
  }

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '-1000px'
    textarea.style.left = '-1000px'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}
