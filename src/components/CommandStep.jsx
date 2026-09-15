import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircleInfo, faCheck, faCopy } from '@fortawesome/free-solid-svg-icons'
import { copyText } from '../lib/clipboard.js'
import { t } from '../lib/i18n.js'

export function CommandStep({ step, lang }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const ok = await copyText(step.plainText)
    setCopied(ok)
    if (ok) setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="command-step">
      <details className="command-step__details">
        <summary className="command-step__label-row">
          <span className="command-step__label">{t(lang, `step.${step.id}.label`)}</span>
          <FontAwesomeIcon icon={faCircleInfo} className="command-step__info" aria-hidden="true" />
        </summary>
        <p className="command-step__explain">{t(lang, `step.${step.id}.explain`)}</p>
      </details>
      <div className="command-step__row">
        <code className="command-step__line">
          {step.tokens.map((tok, i) => (
            <span key={i} className={`tok-${tok.type}`}>
              {tok.text}
            </span>
          ))}
        </code>
        <button
          type="button"
          className={`btn btn--sm command-step__copy${copied ? ' command-step__copy--done' : ''}`}
          onClick={handleCopy}
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} aria-hidden="true" />
          {copied ? t(lang, 'output.copy.done') : t(lang, 'output.copy')}
        </button>
      </div>
    </div>
  )
}
