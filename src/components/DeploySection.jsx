import { AnchorLink } from './AnchorLink.jsx'
import { t } from '../lib/i18n.js'

const BUILD_PRESETS = ['npm run build', 'npm ci && npm run build', 'docker build -t myapp .', 'docker compose build']

const RESTART_PRESETS = [
  'sudo systemctl restart myapp',
  'docker restart myapp',
  'docker compose restart',
  'pm2 restart myapp',
]

const HEALTH_CHECK_PRESETS = [
  'curl -f http://localhost:3000/health',
  'curl -fs http://localhost/ -o /dev/null',
  'systemctl is-active myapp',
  'docker ps --filter name=myapp --filter status=running -q',
]

function PresetChipRow({ lang, presets, onPick }) {
  return (
    <div className="preset-chip-row">
      <span className="field__hint">{t(lang, 'deploy.presets.label')}</span>
      {presets.map((cmd) => (
        <button
          key={cmd}
          type="button"
          className="preset-chip"
          aria-label={t(lang, 'deploy.presets.apply', { cmd })}
          onClick={() => onPick(cmd)}
        >
          {cmd}
        </button>
      ))}
    </div>
  )
}

export function DeploySection({ state, dispatch }) {
  const lang = state.lang

  return (
    <fieldset className="panel">
      <legend className="panel__legend" id="deploy-heading">
        {t(lang, 'deploy.legend')}
        <AnchorLink id="deploy-heading" section={t(lang, 'deploy.legend')} lang={lang} />
      </legend>
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
          <PresetChipRow
            lang={lang}
            presets={BUILD_PRESETS}
            onPick={(cmd) => dispatch({ type: 'SET_FIELD', field: 'buildCommand', value: cmd })}
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
          <PresetChipRow
            lang={lang}
            presets={RESTART_PRESETS}
            onPick={(cmd) => dispatch({ type: 'SET_FIELD', field: 'restartCommand', value: cmd })}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="healthCheckCommand">
            {t(lang, 'deploy.healthCheck.label')}
          </label>
          <input
            id="healthCheckCommand"
            type="text"
            placeholder={t(lang, 'deploy.healthCheck.placeholder')}
            value={state.healthCheckCommand}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'healthCheckCommand', value: e.target.value })}
            autoComplete="off"
          />
          <PresetChipRow
            lang={lang}
            presets={HEALTH_CHECK_PRESETS}
            onPick={(cmd) => dispatch({ type: 'SET_FIELD', field: 'healthCheckCommand', value: cmd })}
          />
        </div>
      </div>
    </fieldset>
  )
}
