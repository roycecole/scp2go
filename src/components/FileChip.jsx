import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFolder, faFile, faXmark, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { formatFileSize, formatFileDate } from '../lib/fileFormat.js'
import { isSensitiveFilename } from '../lib/sensitiveFiles.js'
import { t } from '../lib/i18n.js'

export function FileChip({ file, lang, onRemove }) {
  const sizeText = formatFileSize(file.size)
  const dateText = formatFileDate(file.lastModified, lang)
  const meta = [sizeText && `${t(lang, 'chip.size')} ${sizeText}`, dateText && `${t(lang, 'chip.modified')} ${dateText}`]
    .filter(Boolean)
    .join(' · ')
  const sensitive = !file.isDir && isSensitiveFilename(file.name)

  return (
    <li className={`chip${sensitive ? ' chip--sensitive' : ''}`}>
      <FontAwesomeIcon icon={file.isDir ? faFolder : faFile} className="chip__icon" aria-hidden="true" />
      <span className="chip__info">
        <span className="chip__name">{file.name}</span>
        {meta ? <span className="chip__meta">{meta}</span> : null}
      </span>
      {sensitive ? (
        <FontAwesomeIcon
          icon={faTriangleExclamation}
          className="chip__warning"
          aria-label={t(lang, 'chip.sensitiveWarning')}
          title={t(lang, 'chip.sensitiveWarning')}
        />
      ) : null}
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
