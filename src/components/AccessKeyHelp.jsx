import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faKeyboard, faCaretRight, faCaretDown } from '@fortawesome/free-solid-svg-icons'
import { t } from '../lib/i18n.js'

const SHORTCUTS = [
  { key: 'U', descKey: 'accessKeys.browse' },
  { key: 'X', descKey: 'accessKeys.clearAll' },
  { key: 'S', descKey: 'accessKeys.saveProfile' },
  { key: 'C', descKey: 'accessKeys.copyAll' },
  { key: 'E', descKey: 'accessKeys.exportScript' },
]

export function AccessKeyHelp({ lang }) {
  const [open, setOpen] = useState(false)

  return (
    <details className="access-keys panel" onToggle={(e) => setOpen(e.target.open)}>
      <summary className="access-keys__summary">
        <FontAwesomeIcon icon={open ? faCaretDown : faCaretRight} className="access-keys__caret" aria-hidden="true" />
        <FontAwesomeIcon icon={faKeyboard} aria-hidden="true" />
        {t(lang, 'accessKeys.title')}
      </summary>
      <p className="access-keys__hint">{t(lang, 'accessKeys.hint')}</p>
      <ul className="access-keys__list">
        {SHORTCUTS.map(({ key, descKey }) => (
          <li key={key}>
            <kbd>{key}</kbd>
            <span>{t(lang, descKey)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
