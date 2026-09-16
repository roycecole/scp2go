import { t } from '../lib/i18n.js'

export function DeploySection({ state, dispatch }) {
  const lang = state.lang

  return (
    <fieldset className="panel">
      <legend className="panel__legend">{t(lang, 'deploy.legend')}</legend>
      <p className="panel__hint">{t(lang, 'deploy.hint')}</p>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="buildCommand">
            {t(lang, 'deploy.build.label')}
          </label>
          <input
            id="buildCommand"
            type="text"
            placeholder={t(lang, 'deploy.build.placeholder')}
            value={state.buildCommand}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'buildCommand', value: e.target.value })}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="restartCommand">
            {t(lang, 'deploy.restart.label')}
          </label>
          <input
            id="restartCommand"
            type="text"
            placeholder={t(lang, 'deploy.restart.placeholder')}
            value={state.restartCommand}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'restartCommand', value: e.target.value })}
            autoComplete="off"
          />
        </div>
      </div>
    </fieldset>
  )
}
