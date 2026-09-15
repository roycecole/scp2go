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

      const collected = []
      const items = e.dataTransfer?.items
      if (items && items.length) {
        for (const item of items) {
          if (item.kind !== 'file') continue
          const entry = typeof item.webkitGetAsEntry === 'function' ? item.webkitGetAsEntry() : null
          if (entry) {
            collected.push({ name: entry.name, isDir: entry.isDirectory })
          } else {
            const file = item.getAsFile()
            if (file) collected.push({ name: file.name, isDir: false })
          }
        }
      } else if (e.dataTransfer?.files?.length) {
        for (const file of e.dataTransfer.files) {
          collected.push({ name: file.name, isDir: false })
        }
      }

      if (collected.length) onAddFiles(collected)
    },
    [onAddFiles]
  )

  const handleInputChange = (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length) onAddFiles(files.map((f) => ({ name: f.name, isDir: false })))
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
