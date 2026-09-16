import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { ToggleSwitch } from './primitives/ToggleSwitch.jsx'
import { SegmentedControl } from './primitives/SegmentedControl.jsx'
import { AnchorLink } from './AnchorLink.jsx'
import { isValidBwLimit } from '../lib/validators.js'
import { t } from '../lib/i18n.js'

const TRANSPORT_OPTIONS = [
  { value: 'scp', label: 'scp' },
  { value: 'rsync', label: 'rsync' },
  { value: 'sftp', label: 'sftp' },
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
      <legend className="panel__legend" id="options-heading">
        {t(lang, 'options.legend')}
        <AnchorLink id="options-heading" section={t(lang, 'options.legend')} lang={lang} />
      </legend>

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
        {!isDownload ? (
          <ToggleSwitch
            id="optBackup"
            checked={state.optBackup}
            onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optBackup' })}
            label={t(lang, 'options.backup.label')}
            description={t(lang, 'options.backup.desc')}
          />
        ) : null}
        {!isDownload ? (
          <ToggleSwitch
            id="optTarBundle"
            checked={state.optTarBundle}
            onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optTarBundle' })}
            label={t(lang, 'options.tarBundle.label')}
            description={t(lang, 'options.tarBundle.desc')}
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
        {state.optSshLogin ? (
          <ToggleSwitch
            id="optAgentForward"
            checked={state.optAgentForward}
            onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optAgentForward' })}
            label={t(lang, 'options.agentForward.label')}
            description={t(lang, 'options.agentForward.desc')}
          />
        ) : null}
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
              id="optCompress"
              checked={state.optCompress}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optCompress' })}
              label={t(lang, 'options.compress.label')}
              description={t(lang, 'options.compress.desc')}
            />
            <ToggleSwitch
              id="optPartial"
              checked={state.optPartial}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optPartial' })}
              label={t(lang, 'options.partial.label')}
              description={t(lang, 'options.partial.desc')}
            />
            <ToggleSwitch
              id="optChecksum"
              checked={state.optChecksum}
              onChange={() => dispatch({ type: 'TOGGLE_OPTION', option: 'optChecksum' })}
              label={t(lang, 'options.checksum.label')}
              description={t(lang, 'options.checksum.desc')}
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
          <div className="field">
            <label className="field__label" htmlFor="bwLimit">
              {t(lang, 'options.bwLimit.label')}
            </label>
            <input
              id="bwLimit"
              type="text"
              placeholder={t(lang, 'options.bwLimit.placeholder')}
              value={state.bwLimit}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'bwLimit', value: e.target.value })}
              autoComplete="off"
              aria-invalid={!isValidBwLimit(state.bwLimit)}
            />
            {!isValidBwLimit(state.bwLimit) ? (
              <span className="field__error" role="alert">
                {t(lang, 'validate.bwLimit')}
              </span>
            ) : null}
          </div>
          <div className="field">
            <label className="field__label" htmlFor="linkDest">
              {t(lang, 'options.linkDest.label')}
            </label>
            <input
              id="linkDest"
              type="text"
              placeholder={t(lang, 'options.linkDest.placeholder')}
              value={state.linkDest}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'linkDest', value: e.target.value })}
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
