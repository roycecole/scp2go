import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { ToggleSwitch } from './primitives/ToggleSwitch.jsx'
import { SegmentedControl } from './primitives/SegmentedControl.jsx'
import { t } from '../lib/i18n.js'

const TRANSPORT_OPTIONS = [
  { value: 'scp', label: 'scp' },
  { value: 'rsync', label: 'rsync' },
]

const OS_OPTIONS = (lang) => [
  { value: 'win', label: t(lang, 'options.os.win') },
  { value: 'nix', label: t(lang, 'options.os.nix') },
]

export function OptionsPanel({ state, dispatch }) {
  const lang = state.lang
  const isDownload = state.direction === 'download'
  const showRsyncWarning = state.transport === 'rsync' && state.os === 'win'
  const showDeleteWarning = state.transport === 'rsync' && state.optDelete && !state.optDryRun

  return (
    <fieldset className="panel">
      <legend className="panel__legend">{t(lang, 'options.legend')}</legend>

      <div className="field-row">
        <div className="field">
          <label className="field__label" htmlFor="dest">
            {t(lang, isDownload ? 'options.dest.label.download' : 'options.dest.label')}
          </label>
          <input
            id="dest"
            type="text"
            placeholder="~/"
            value={state.dest}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'dest', value: e.target.value })}
            autoComplete="off"
          />
          {!isDownload ? <span className="field__hint">{t(lang, 'options.dest.overwriteHint')}</span> : null}
        </div>
      </div>

      <div className="toggle-list">
        <ToggleSwitch
          id="optMkdir"
          checked={state.optMkdir}
          onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optMkdir' })}
          label={t(lang, isDownload ? 'options.mkdir.label.download' : 'options.mkdir.label')}
          description={t(lang, isDownload ? 'options.mkdir.desc.download' : 'options.mkdir.desc')}
        />
        <ToggleSwitch
          id="optRecursive"
          checked={state.optRecursive}
          onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optRecursive' })}
          label={t(lang, 'options.recursive.label')}
          description={t(lang, 'options.recursive.desc')}
        />
        {!isDownload ? (
          <ToggleSwitch
            id="optChmod"
            checked={state.optChmod}
            onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optChmod' })}
            label={t(lang, 'options.chmod.label')}
            description={t(lang, 'options.chmod.desc')}
          />
        ) : null}
        <ToggleSwitch
          id="optTestConn"
          checked={state.optTestConn}
          onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optTestConn' })}
          label={t(lang, 'options.testConn.label')}
          description={t(lang, 'options.testConn.desc')}
        />
        <ToggleSwitch
          id="optSshLogin"
          checked={state.optSshLogin}
          onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optSshLogin' })}
          label={t(lang, 'options.sshLogin.label')}
          description={t(lang, 'options.sshLogin.desc')}
        />
        <ToggleSwitch
          id="optKnownHosts"
          checked={state.optKnownHosts}
          onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optKnownHosts' })}
          label={t(lang, 'options.knownHosts.label')}
          description={t(lang, 'options.knownHosts.desc')}
        />
        {state.transport === 'rsync' ? (
          <>
            <ToggleSwitch
              id="optPartial"
              checked={state.optPartial}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optPartial' })}
              label={t(lang, 'options.partial.label')}
              description={t(lang, 'options.partial.desc')}
            />
            <ToggleSwitch
              id="optDelete"
              checked={state.optDelete}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optDelete' })}
              label={t(lang, 'options.delete.label')}
              description={t(lang, 'options.delete.desc')}
            />
            <ToggleSwitch
              id="optProgress"
              checked={state.optProgress}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optProgress' })}
              label={t(lang, 'options.progress.label')}
              description={t(lang, 'options.progress.desc')}
            />
            <ToggleSwitch
              id="optDryRun"
              checked={state.optDryRun}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optDryRun' })}
              label={t(lang, 'options.dryRun.label')}
              description={t(lang, 'options.dryRun.desc')}
            />
          </>
        ) : null}
        {state.os === 'win' ? (
          <ToggleSwitch
            id="optIcaclsFix"
            checked={state.optIcaclsFix}
            onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optIcaclsFix' })}
            label={t(lang, 'options.icaclsFix.label')}
            description={t(lang, 'options.icaclsFix.desc')}
          />
        ) : null}
      </div>

      {state.transport === 'rsync' ? (
        <div className="field-row panel__section">
          <div className="field">
            <label className="field__label" htmlFor="excludePatterns">
              {t(lang, 'options.excludePatterns.label')}
            </label>
            <input
              id="excludePatterns"
              type="text"
              placeholder={t(lang, 'options.excludePatterns.placeholder')}
              value={state.excludePatterns}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'excludePatterns', value: e.target.value })}
              autoComplete="off"
            />
          </div>
        </div>
      ) : null}

      <div className="field-row panel__section">
        <div className="field">
          <span className="field__label">{t(lang, 'options.transport.label')}</span>
          <SegmentedControl
            name="transport"
            legend={t(lang, 'options.transport.label')}
            options={TRANSPORT_OPTIONS}
            value={state.transport}
            onChange={(v) => dispatch({ type: 'SET_TRANSPORT', transport: v })}
            fluid
          />
        </div>
        <div className="field">
          <span className="field__label">{t(lang, 'options.os.label')}</span>
          <SegmentedControl
            name="os"
            legend={t(lang, 'options.os.label')}
            options={OS_OPTIONS(lang)}
            value={state.os}
            onChange={(v) => dispatch({ type: 'SET_OS', os: v })}
            fluid
          />
        </div>
      </div>

      {showRsyncWarning ? (
        <p className="warning-banner" role="alert">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          {t(lang, 'options.rsyncWarning')}
        </p>
      ) : null}

      {showDeleteWarning ? (
        <p className="warning-banner" role="alert">
          <FontAwesomeIcon icon={faTriangleExclamation} aria-hidden="true" />
          {t(lang, 'options.deleteWarning')}
        </p>
      ) : null}
    </fieldset>
  )
}
