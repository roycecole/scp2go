import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy, faPlus, faXmark, faFileArrowDown } from '@fortawesome/free-solid-svg-icons'
import { buildSshConfigExport } from '../lib/commandBuilder.js'
import { copyText } from '../lib/clipboard.js'
import { downloadTextFile } from '../lib/download.js'
import { t } from '../lib/i18n.js'

export function SshConfigBlock({ state, dispatch }) {
  const lang = state.lang
  const entries = state.sshConfigEntries
  const [copied, setCopied] = useState(false)
  const exportText = buildSshConfigExport(entries)

  const handleCopy = async () => {
    const ok = await copyText(exportText)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 1800)
  }

  return (
    <section className="panel" aria-labelledby="ssh-config-heading">
      <h2 className="panel__legend" id="ssh-config-heading">
        {t(lang, 'sshConfig.title')}
      </h2>
      <p className="panel__hint">{t(lang, 'sshConfig.hint')}</p>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="configAlias">
            {t(lang, 'sshConfig.alias.label')}
          </label>
          <input
            id="configAlias"
            type="text"
            placeholder={t(lang, 'sshConfig.alias.placeholder')}
            value={state.configAlias}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'configAlias', value: e.target.value })}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="panel__section">
        <button
          type="button"
          className="btn btn--sm"
          onClick={() => dispatch({ type: 'ADD_SSH_CONFIG_ENTRY' })}
          disabled={!state.host.trim()}
        >
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
          {t(lang, 'sshConfig.add')}
        </button>
      </div>

      {entries.length > 0 ? (
        <ul className="chip-list">
          {entries.map((entry) => (
            <li className="chip" key={entry.id}>
              <span className="chip__name">{entry.alias || entry.host}</span>
              <button
                type="button"
                className="chip__remove"
                aria-label={t(lang, 'sshConfig.remove', { alias: entry.alias || entry.host })}
                onClick={() => dispatch({ type: 'REMOVE_SSH_CONFIG_ENTRY', id: entry.id })}
              >
                <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="panel__section">
        {entries.length > 0 ? (
          <pre className="ssh-config__block">{exportText}</pre>
        ) : (
          <p className="ssh-config__empty">{t(lang, 'sshConfig.empty')}</p>
        )}
      </div>

      {entries.length > 0 ? (
        <div className="ssh-config__actions">
          <button type="button" className="btn btn--sm" onClick={handleCopy}>
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} aria-hidden="true" />
            {copied ? t(lang, 'output.copy.done') : t(lang, 'output.copy')}
          </button>
          <button type="button" className="btn btn--sm" onClick={() => downloadTextFile('ssh-config.txt', exportText)}>
            <FontAwesomeIcon icon={faFileArrowDown} aria-hidden="true" />
            {t(lang, 'sshConfig.export')}
          </button>
        </div>
      ) : null}
    </section>
  )
}
