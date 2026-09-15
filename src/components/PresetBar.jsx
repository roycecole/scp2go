import { t } from '../lib/i18n.js'

export function PresetBar({ state, dispatch }) {
  return (
    <div className="preset-bar">
      <button type="button" className="btn" onClick={() => dispatch({ type: 'APPLY_PRESET', preset: 'oracle' })}>
        {t(state.lang, 'preset.oracle')}
      </button>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'APPLY_PRESET', preset: 'sshkey' })}>
        {t(state.lang, 'preset.sshkey')}
      </button>
    </div>
  )
}
