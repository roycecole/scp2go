import { useMemo, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy, faFileArrowDown, faAnglesDown, faAnglesUp } from '@fortawesome/free-solid-svg-icons'
import { buildSteps, buildCopyAllText, buildScriptFile } from '../lib/commandBuilder.js'
import { copyText } from '../lib/clipboard.js'
import { downloadTextFile } from '../lib/download.js'
import { CommandStep } from './CommandStep.jsx'
import { t } from '../lib/i18n.js'

export function OutputPanel({ state }) {
  const lang = state.lang
  const os = state.os === 'nix' ? 'nix' : 'win'
  const steps = useMemo(() => buildSteps(state), [state])
  const [copiedAll, setCopiedAll] = useState(false)
  const [allExpanded, setAllExpanded] = useState(false)
  const bodyRef = useRef(null)

  const getLabel = (s) => t(lang, `step.${s.id}.label`)

  const handleToggleAll = () => {
    const next = !allExpanded
    bodyRef.current?.querySelectorAll('details').forEach((details) => {
      details.open = next
    })
    setAllExpanded(next)
  }

  const handleCopyAll = async () => {
    const ok = await copyText(buildCopyAllText(steps, getLabel))
    setCopiedAll(ok)
    if (ok) setTimeout(() => setCopiedAll(false), 1800)
  }

  const handleExportScript = () => {
    const ext = os === 'win' ? 'ps1' : 'sh'
    downloadTextFile(`scp2go-commands.${ext}`, buildScriptFile(steps, os, getLabel))
  }

  return (
    <section className="terminal" aria-labelledby="output-heading">
      <div className="terminal__header">
        <h2 className="terminal__title" id="output-heading">
          {t(lang, 'output.title')}
        </h2>
        {steps.length > 0 ? (
          <div className="terminal__header-actions">
            <button type="button" className="btn btn--primary btn--sm" onClick={handleCopyAll}>
              <FontAwesomeIcon icon={copiedAll ? faCheck : faCopy} aria-hidden="true" />
              {copiedAll ? t(lang, 'output.copyAll.done') : t(lang, 'output.copyAll')}
            </button>
            <button type="button" className="btn btn--sm" onClick={handleExportScript}>
              <FontAwesomeIcon icon={faFileArrowDown} aria-hidden="true" />
              {t(lang, 'output.exportScript')}
            </button>
            <button type="button" className="btn btn--sm" onClick={handleToggleAll}>
              <FontAwesomeIcon icon={allExpanded ? faAnglesUp : faAnglesDown} aria-hidden="true" />
              {t(lang, allExpanded ? 'output.collapseAll' : 'output.expandAll')}
            </button>
          </div>
        ) : null}
      </div>
      <div className="terminal__body" ref={bodyRef}>
        {steps.length === 0 ? (
          <p className="terminal__guidance">{t(lang, 'output.guidance')}</p>
        ) : (
          steps.map((step) => <CommandStep key={step.id} step={step} lang={lang} />)
        )}
      </div>
    </section>
  )
}
