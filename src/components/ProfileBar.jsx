import { useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFileArrowDown, faFileArrowUp } from '@fortawesome/free-solid-svg-icons'
import { sanitizeProfiles } from '../lib/storage.js'
import { downloadTextFile } from '../lib/download.js'
import { t } from '../lib/i18n.js'

export function ProfileBar({ state, dispatch }) {
  const lang = state.lang
  const [selectedId, setSelectedId] = useState('')
  const [newName, setNewName] = useState('')
  const [importError, setImportError] = useState(false)
  const fileInputRef = useRef(null)

  const handleLoad = (id) => {
    setSelectedId(id)
    if (id) dispatch({ type: 'LOAD_PROFILE', id })
  }

  const handleSave = () => {
    const name = newName.trim()
    if (!name) return
    dispatch({ type: 'SAVE_PROFILE', name })
    setNewName('')
  }

  const handleDelete = () => {
    if (!selectedId) return
    dispatch({ type: 'DELETE_PROFILE', id: selectedId })
    setSelectedId('')
  }

  const handleExport = () => {
    const payload = { app: 'scp2go', type: 'profiles', version: 1, profiles: state.profiles }
    downloadTextFile('scp2go-profiles.json', JSON.stringify(payload, null, 2), 'application/json;charset=utf-8')
  }

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const rawProfiles = Array.isArray(data) ? data : data.profiles
      const clean = sanitizeProfiles(rawProfiles)
      if (clean.length === 0) throw new Error('no valid profiles in file')
      dispatch({ type: 'IMPORT_PROFILES', profiles: clean })
      setImportError(false)
    } catch {
      setImportError(true)
      setTimeout(() => setImportError(false), 4000)
    }
  }

  return (
    <div className="profile-bar">
      <select
        className="profile-bar__select"
        value={selectedId}
        onChange={(e) => handleLoad(e.target.value)}
        aria-label={t(lang, 'profiles.title')}
      >
        <option value="">{t(lang, 'profiles.selectPlaceholder')}</option>
        {state.profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {selectedId ? (
        <button type="button" className="btn btn--sm" onClick={handleDelete}>
          {t(lang, 'profiles.delete')}
        </button>
      ) : null}
      <input
        type="text"
        className="profile-bar__name"
        placeholder={t(lang, 'profiles.namePlaceholder')}
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleSave()
          }
        }}
        autoComplete="off"
      />
      <button type="button" className="btn btn--sm" accessKey="s" onClick={handleSave} disabled={!newName.trim()}>
        {t(lang, 'profiles.save')}
      </button>
      <button type="button" className="btn btn--sm" onClick={handleExport} disabled={state.profiles.length === 0}>
        <FontAwesomeIcon icon={faFileArrowDown} aria-hidden="true" />
        {t(lang, 'profiles.export')}
      </button>
      <button type="button" className="btn btn--sm" onClick={() => fileInputRef.current?.click()}>
        <FontAwesomeIcon icon={faFileArrowUp} aria-hidden="true" />
        {t(lang, 'profiles.import')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={handleImportFile}
        tabIndex={-1}
        aria-hidden="true"
      />
      {importError ? (
        <span className="profile-bar__error" role="alert">
          {t(lang, 'profiles.importError')}
        </span>
      ) : null}
    </div>
  )
}
