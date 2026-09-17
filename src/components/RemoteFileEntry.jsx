import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { ClearableInput } from './primitives/ClearableInput.jsx'
import { t } from '../lib/i18n.js'

export function RemoteFileEntry({ lang, onAddFiles }) {
  const [name, setName] = useState('')
  const [isDir, setIsDir] = useState(false)

  const handleAdd = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    onAddFiles([{ name: trimmed, isDir }])
    setName('')
    setIsDir(false)
  }

  return (
    <div className="remote-files">
      <div className="remote-files__row">
        <ClearableInput
          lang={lang}
          onClear={() => setName('')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder={t(lang, 'remoteFiles.placeholder')}
          aria-label={t(lang, 'remoteFiles.hint')}
          autoComplete="off"
        />
        <label className="remote-files__checkbox">
          <input type="checkbox" checked={isDir} onChange={(e) => setIsDir(e.target.checked)} />
          {t(lang, 'remoteFiles.isDir')}
        </label>
        <button type="button" className="btn btn--sm" onClick={handleAdd}>
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          {t(lang, 'remoteFiles.add')}
        </button>
      </div>
      <p className="remote-files__hint">{t(lang, 'remoteFiles.hint')}</p>
    </div>
  )
}
