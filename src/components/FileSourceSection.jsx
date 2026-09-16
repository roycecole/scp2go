import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrashCan } from '@fortawesome/free-solid-svg-icons'
import { FileDropZone } from './FileDropZone.jsx'
import { RemoteFileEntry } from './RemoteFileEntry.jsx'
import { FileTable } from './FileTable.jsx'
import { SegmentedControl } from './primitives/SegmentedControl.jsx'
import { AnchorLink } from './AnchorLink.jsx'
import { t } from '../lib/i18n.js'

const DIRECTION_OPTIONS = (lang) => [
  { value: 'upload', label: t(lang, 'direction.upload') },
  { value: 'download', label: t(lang, 'direction.download') },
]

export function FileSourceSection({ state, dispatch }) {
  const lang = state.lang
  const isDownload = state.direction === 'download'
  const handleAddFiles = (files) => dispatch({ type: 'ADD_FILES', files })
  const handleRemove = (id) => dispatch({ type: 'REMOVE_FILE', id })

  // Undo window for clear-all: hold the snapshot locally for a few seconds
  // so a slip of the finger doesn't wipe a carefully assembled list.
  const [cleared, setCleared] = useState(null)
  const undoTimer = useRef(null)
  useEffect(() => () => clearTimeout(undoTimer.current), [])

  const handleClearAll = () => {
    setCleared(state.files)
    dispatch({ type: 'CLEAR_FILES' })
    clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setCleared(null), 6000)
  }

  const handleUndo = () => {
    if (!cleared) return
    dispatch({ type: 'RESTORE_FILES', files: cleared })
    clearTimeout(undoTimer.current)
    setCleared(null)
  }

  return (
    <fieldset className="panel">
      <legend className="panel__legend" id="file-source-heading">
        {t(lang, 'fileSource.legend')}
        <AnchorLink id="file-source-heading" section={t(lang, 'fileSource.legend')} lang={lang} />
      </legend>

      <SegmentedControl
        name="direction"
        legend={t(lang, 'direction.legend')}
        options={DIRECTION_OPTIONS(lang)}
        value={state.direction}
        onChange={(direction) => dispatch({ type: 'SET_DIRECTION', direction })}
        fluid
      />

      <div className="field panel__section">
        <label className="field__label" htmlFor="srcDir">
          {t(lang, isDownload ? 'fileSource.srcDir.label.download' : 'fileSource.srcDir.label')}
        </label>
        <input
          id="srcDir"
          type="text"
          placeholder={t(lang, 'fileSource.srcDir.placeholder')}
          value={state.srcDir}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'srcDir', value: e.target.value })}
          autoComplete="off"
        />
      </div>

      <div className="panel__section">
        {isDownload ? (
          <RemoteFileEntry lang={lang} onAddFiles={handleAddFiles} />
        ) : (
          <FileDropZone lang={lang} onAddFiles={handleAddFiles} />
        )}
      </div>

      {state.files.length > 0 ? (
        <>
          <div className="file-list__header">
            <button type="button" className="btn btn--sm" accessKey="x" onClick={handleClearAll}>
              <FontAwesomeIcon icon={faTrashCan} aria-hidden="true" />
              {t(lang, 'fileSource.clearAll')}
            </button>
          </div>
          <FileTable files={state.files} lang={lang} onRemove={handleRemove} />
        </>
      ) : null}

      {cleared ? (
        <div className="undo-bar" role="status">
          <span>{t(lang, 'fileSource.cleared', { count: String(cleared.length) })}</span>
          <button type="button" className="btn btn--sm" onClick={handleUndo}>
            {t(lang, 'fileSource.undo')}
          </button>
        </div>
      ) : null}
    </fieldset>
  )
}
