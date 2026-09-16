import { AnchorLink } from './AnchorLink.jsx'
import { t } from '../lib/i18n.js'

export function ConnectionForm({ state, dispatch }) {
  const setField = (field) => (e) => dispatch({ type: 'SET_FIELD', field, value: e.target.value })
  const lang = state.lang

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
          />
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
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="user">
            {t(lang, 'connection.user.label')}
          </label>
          <input id="user" type="text" placeholder="ubuntu" value={state.user} onChange={setField('user')} autoComplete="off" />
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
          />
        </div>
      </div>
    </fieldset>
  )
}
