import { useCallback, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCloudArrowUp } from '@fortawesome/free-solid-svg-icons'
import { t } from '../lib/i18n.js'

export function FileDropZone({ lang, onAddFiles }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault()
      setDragOver(false)

      // Folders have no File representation, so they only ever get a bare
      // name+isDir from webkitGetAsEntry(). For actual files, prefer
      // item.getAsFile() — it gives the real File object, with size and
      // lastModified, that entry.name/isDirectory alone can't provide.
      const collected = []
      const items = e.dataTransfer?.items
      if (items && items.length) {
        for (const item of items) {
          if (item.kind !== 'file') continue
          const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
          if (entry && entry.isDirectory) {
            collected.push({ name: entry.name, isDir: true })
            continue
          }
          const file = item.getAsFile()
          if (file) {
            collected.push({ name: file.name, isDir: false, size: file.size, lastModified: file.lastModified })
          } else if (entry) {
            collected.push({ name: entry.name, isDir: false })
          }
        }
      } else if (e.dataTransfer?.files?.length) {
        for (const file of e.dataTransfer.files) {
          collected.push({ name: file.name, isDir: false, size: file.size, lastModified: file.lastModified })
        }
      }

      if (collected.length) onAddFiles(collected)
    },
    [onAddFiles]
  )

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) {
      onAddFiles(files.map((f) => ({ name: f.name, isDir: false, size: f.size, lastModified: f.lastModified })))
    }
    e.target.value = ''
  }

  return (
    <>
      <button
        type="button"
        className={`dropzone${dragOver ? ' dropzone--dragover' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <span className="dropzone__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faCloudArrowUp} />
        </span>
        <span className="dropzone__hint">{t(lang, 'dropzone.hint')}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="visually-hidden"
        onChange={handleInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />
    </>
  )
}
