import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { buildSteps, buildCopyAllText } from '../lib/commandBuilder.js'
import { copyText } from '../lib/clipboard.js'
import { CommandStep } from './CommandStep.jsx'
import { t } from '../lib/i18n.js'

export function OutputPanel({ state }) {
  const lang = state.lang
  const steps = useMemo(() => buildSteps(state), [state])
  const [copiedAll, setCopiedAll] = useState(false)

  const handleCopyAll = async () => {
    const text = buildCopyAllText(steps, (s) => t(lang, `step.${s.id}.label`))
    const ok = await copyText(text)
    setCopiedAll(ok)
    if (ok) setTimeout(() => setCopiedAll(false), 1800)
  }

  return (
    <section className="terminal" aria-labelledby="output-heading">
      <div className="terminal__header">
        <h2 className="terminal__title" id="output-heading">
          {t(lang, 'output.title')}
        </h2>
        {steps.length > 0 ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={handleCopyAll}>
            <FontAwesomeIcon icon={copiedAll ? faCheck : faCopy} aria-hidden="true" />
            {copiedAll ? t(lang, 'output.copyAll.done') : t(lang, 'output.copyAll')}
          </button>
        ) : null}
      </div>
      <div className="terminal__body">
        {steps.length === 0 ? (
          <p className="terminal__guidance">{t(lang, 'output.guidance')}</p>
        ) : (
          steps.map((step) => <CommandStep key={step.id} step={step} lang={lang} />)
        )}
      </div>
    </section>
  )
}
