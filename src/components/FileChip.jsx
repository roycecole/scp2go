import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder, faFile, faXmark } from '@fortawesome/free-solid-svg-icons'
import { t } from '../lib/i18n.js'

export function FileChip({ file, lang, onRemove }) {
  return (
    <li className="chip">
      <FontAwesomeIcon icon={file.isDir ? faFolder : faFile} aria-hidden="true" />
      <span className="chip__name">{file.name}</span>
      <button
        type="button"
        className="chip__remove"
        aria-label={t(lang, 'chip.remove', { name: file.name })}
        onClick={() => onRemove(file.id)}
      >
        <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
      </button>
    </li>
  )
}
