import { AnchorLink } from './AnchorLink.jsx'
import { isValidHost, isValidPort, isValidUser, isValidJumpHost } from '../lib/validators.js'
import { t } from '../lib/i18n.js'

export function ConnectionForm({ state, dispatch }) {
  const setField = (field) => (e) => dispatch({ type: 'SET_FIELD', field, value: e.target.value })
  const lang = state.lang

  const hostOk = isValidHost(state.host)
  const portOk = isValidPort(state.port)
  const userOk = isValidUser(state.user)
  const jumpOk = isValidJumpHost(state.jumpHost)

  return (
    <fieldset className="panel">
      <legend className="panel__legend" id="connection-heading">
        {t(lang, 'connection.legend')}
        <AnchorLink id="connection-heading" section={t(lang, 'connection.legend')} lang={lang} />
      </legend>
      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="host">
            {t(lang, 'connection.host.label')}
          </label>
          <input
            id="host"
            type="text"
            placeholder={t(lang, 'connection.host.placeholder')}
            value={state.host}
            onChange={setField('host')}
            autoComplete="off"
            aria-invalid={!hostOk}
          />
          {!hostOk ? (
            <span className="field__error" role="alert">
              {t(lang, 'validate.host')}
            </span>
          ) : null}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="port">
            {t(lang, 'connection.port.label')}
          </label>
          <input
            id="port"
            type="text"
            inputMode="numeric"
            placeholder="22"
            value={state.port}
            onChange={setField('port')}
            autoComplete="off"
            aria-invalid={!portOk}
          />
          {!portOk ? (
            <span className="field__error" role="alert">
              {t(lang, 'validate.port')}
            </span>
          ) : null}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="user">
            {t(lang, 'connection.user.label')}
          </label>
          <input
            id="user"
            type="text"
            placeholder="ubuntu"
            value={state.user}
            onChange={setField('user')}
            autoComplete="off"
            aria-invalid={!userOk}
          />
          {!userOk ? (
            <span className="field__error" role="alert">
              {t(lang, 'validate.user')}
            </span>
          ) : null}
        </div>
        <div className="field">
          <label className="field__label" htmlFor="key">
            {t(lang, 'connection.key.label')}
          </label>
          <input
            id="key"
            type="text"
            placeholder={t(lang, 'connection.key.placeholder')}
            value={state.key}
            onChange={setField('key')}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="field-row panel__section">
        <div className="field">
          <label className="field__label" htmlFor="jumpHost">
            {t(lang, 'connection.jumpHost.label')}
          </label>
          <input
            id="jumpHost"
            type="text"
            placeholder={t(lang, 'connection.jumpHost.placeholder')}
            value={state.jumpHost}
            onChange={setField('jumpHost')}
            autoComplete="off"
            aria-invalid={!jumpOk}
          />
          {!jumpOk ? (
            <span className="field__error" role="alert">
              {t(lang, 'validate.jumpHost')}
            </span>
          ) : null}
        </div>
      </div>
    </fieldset>
  )
}
