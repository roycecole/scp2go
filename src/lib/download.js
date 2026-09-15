// @ts-check

/**
 * Triggers a browser download of text content as a file, via a Blob +
 * object URL + programmatic anchor click — the standard mechanism, works in
 * every real browser. (Note: some sandboxed preview/automation contexts
 * block script-triggered downloads; that's a property of those sandboxes,
 * not of this code — it behaves normally for real end users.)
 * @param {string} filename
 * @param {string} content
 * @param {string} [mimeType]
 */
export function downloadTextFile(filename, content, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } finally {
    URL.revokeObjectURL(url)
  }
}
