import { FileDropZone } from './FileDropZone.jsx'
import { RemoteFileEntry } from './RemoteFileEntry.jsx'
import { FileChip } from './FileChip.jsx'
import { SegmentedControl } from './primitives/SegmentedControl.jsx'
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

  return (
    <fieldset className="panel">
      <legend className="panel__legend">{t(lang, 'fileSource.legend')}</legend>

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
        <ul className="chip-list">
          {state.files.map((file) => (
            <FileChip key={file.id} file={file} lang={lang} onRemove={handleRemove} />
          ))}
        </ul>
      ) : null}
    </fieldset>
  )
}
