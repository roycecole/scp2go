import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFolder,
  faFile,
  faFileImage,
  faFileZipper,
  faFileCode,
  faFilePdf,
  faFileAudio,
  faFileVideo,
  faFileLines,
  faXmark,
  faTriangleExclamation,
  faSort,
  faSortUp,
  faSortDown,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { formatFileSize, formatFileDate, sortFiles, getFileCategory, filterFiles } from '../lib/fileFormat.js'
import { isSensitiveFilename } from '../lib/sensitiveFiles.js'
import { ClearableInput } from './primitives/ClearableInput.jsx'
import { t } from '../lib/i18n.js'

const COLUMNS = [
  { key: 'name', labelKey: 'fileTable.name' },
  { key: 'size', labelKey: 'chip.size' },
  { key: 'lastModified', labelKey: 'chip.modified' },
  { key: 'addedAt', labelKey: 'chip.addedAt' },
]

const CATEGORY_ICONS = {
  image: faFileImage,
  archive: faFileZipper,
  code: faFileCode,
  pdf: faFilePdf,
  audio: faFileAudio,
  video: faFileVideo,
  document: faFileLines,
  file: faFile,
}

/** @param {{ isDir: boolean, name: string }} file */
function fileIcon(file) {
  if (file.isDir) return faFolder
  return CATEGORY_ICONS[getFileCategory(file.name)]
}

export function FileTable({ files, lang, onRemove }) {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')
  const [query, setQuery] = useState('')

  const sorted = useMemo(() => sortFiles(filterFiles(files, query), sortKey, sortDir, lang), [files, query, sortKey, sortDir, lang])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <>
      <div className="file-table__filter">
        <FontAwesomeIcon icon={faMagnifyingGlass} aria-hidden="true" />
        <ClearableInput
          lang={lang}
          onClear={() => setQuery('')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t(lang, 'fileTable.filter.placeholder')}
          aria-label={t(lang, 'fileTable.filter.label')}
          autoComplete="off"
        />
      </div>
      <div className="file-table__wrapper">
      <table className="file-table">
        <thead>
          <tr>
            {COLUMNS.map((col) => {
              const active = sortKey === col.key
              return (
                <th key={col.key} scope="col" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="file-table__sort-btn" onClick={() => handleSort(col.key)}>
                    {t(lang, col.labelKey)}
                    <FontAwesomeIcon
                      icon={active ? (sortDir === 'asc' ? faSortUp : faSortDown) : faSort}
                      className="file-table__sort-icon"
                      aria-hidden="true"
                    />
                  </button>
                </th>
              )
            })}
            <th scope="col">
              <span className="visually-hidden">{t(lang, 'fileTable.actions')}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="file-table__empty">
                {t(lang, 'fileTable.filter.noMatch')}
              </td>
            </tr>
          ) : null}
          {sorted.map((file) => {
            const sensitive = !file.isDir && isSensitiveFilename(file.name)
            return (
              <tr key={file.id} className={sensitive ? 'file-table__row--sensitive' : undefined}>
                <td className="file-table__name-cell">
                  <span className="file-table__name-inner">
                    <FontAwesomeIcon icon={fileIcon(file)} className="file-table__icon" aria-hidden="true" />
                    {file.name}
                    {sensitive ? (
                      <FontAwesomeIcon
                        icon={faTriangleExclamation}
                        className="file-table__warning"
                        aria-label={t(lang, 'chip.sensitiveWarning')}
                        title={t(lang, 'chip.sensitiveWarning')}
                      />
                    ) : null}
                  </span>
                </td>
                <td>{formatFileSize(file.size)}</td>
                <td>{formatFileDate(file.lastModified, lang)}</td>
                <td>{formatFileDate(file.addedAt, lang)}</td>
                <td>
                  <button
                    type="button"
                    className="file-table__remove"
                    aria-label={t(lang, 'chip.remove', { name: file.name })}
                    onClick={() => onRemove(file.id)}
                  >
                    <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      </div>
    </>
  )
}
