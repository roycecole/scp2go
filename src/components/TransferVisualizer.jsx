import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCirclePlay,
  faXmark,
  faLaptopCode,
  faServer,
  faShieldHalved,
  faFile,
  faFileZipper,
  faHammer,
  faBoxArchive,
  faBoxOpen,
  faTowerBroadcast,
  faKey,
  faTerminal,
  faFolderPlus,
  faClockRotateLeft,
  faUpload,
  faDownload,
  faLock,
  faRotate,
  faHeartPulse,
} from '@fortawesome/free-solid-svg-icons'
import { buildSteps } from '../lib/commandBuilder.js'
import { t } from '../lib/i18n.js'

const STEP_ICONS = {
  build: faHammer,
  tarPack: faBoxArchive,
  knownHosts: faShieldHalved,
  testConn: faTowerBroadcast,
  sshAdd: faKey,
  sshLogin: faTerminal,
  mkdir: faFolderPlus,
  localMkdir: faFolderPlus,
  backup: faClockRotateLeft,
  upload: faUpload,
  download: faDownload,
  tarExtract: faBoxOpen,
  chmod: faLock,
  icaclsFix: faLock,
  restart: faRotate,
  healthCheck: faHeartPulse,
}

const STEP_SLOT_SECONDS = 1.1

export function TransferVisualizer({ state }) {
  const [open, setOpen] = useState(false)
  const lang = state.lang
  const steps = useMemo(() => buildSteps(state), [state])

  const host = (state.host || '').trim()
  const jump = (state.jumpHost || '').trim()
  const isDownload = state.direction === 'download'
  const fileCount = state.files.length
  const user = (state.user || '').trim() || 'ubuntu'
  const port = (state.port || '').trim() || '22'
  const dest = (state.dest || '').trim() || '~/'
  const packetIcon = state.optTarBundle && !isDownload ? faFileZipper : faFile

  const remoteLabel = host ? `${user}@${host}` : t(lang, 'viz.remoteFallback')
  const filesLabel = fileCount > 0 ? t(lang, 'viz.filesCount', { count: String(fileCount) }) : t(lang, 'viz.noFiles')
  const caption = isDownload ? `${dest} → ${t(lang, 'viz.local')}` : `${filesLabel} → ${dest}`

  const lane = (delaySeconds) => (
    <div className="viz-lane">
      <span className="viz-lane__badge">{state.transport}</span>
      <span className="viz-packet" style={{ animationDelay: `${delaySeconds}s` }}>
        <FontAwesomeIcon icon={packetIcon} aria-hidden="true" />
      </span>
    </div>
  )

  return (
    <>
      <button
        type="button"
        className="viz-toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={t(lang, 'viz.open')}
        aria-label={t(lang, 'viz.open')}
      >
        <FontAwesomeIcon icon={faCirclePlay} aria-hidden="true" />
      </button>

      <aside className={`viz-drawer${open ? ' viz-drawer--open' : ''}`} aria-label={t(lang, 'viz.title')} aria-hidden={!open}>
        <div className="viz-drawer__header">
          <h2 className="viz-drawer__title">{t(lang, 'viz.title')}</h2>
          <button type="button" className="viz-drawer__close" onClick={() => setOpen(false)} aria-label={t(lang, 'viz.close')}>
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
        <p className="viz-drawer__hint">{t(lang, 'viz.hint')}</p>

        <div className={`viz-scene${isDownload ? ' viz-scene--download' : ''}`}>
          <div className="viz-node">
            <FontAwesomeIcon icon={faLaptopCode} className="viz-node__icon" aria-hidden="true" />
            <span className="viz-node__label">{t(lang, 'viz.local')}</span>
          </div>
          {lane(0)}
          {jump ? (
            <>
              <div className="viz-node">
                <FontAwesomeIcon icon={faShieldHalved} className="viz-node__icon" aria-hidden="true" />
                <span className="viz-node__label">{t(lang, 'viz.jumpNode')}</span>
                <span className="viz-node__sub">{jump}</span>
              </div>
              {lane(1)}
            </>
          ) : null}
          <div className="viz-node">
            <FontAwesomeIcon icon={faServer} className="viz-node__icon" aria-hidden="true" />
            <span className="viz-node__label">{remoteLabel}</span>
            <span className="viz-node__sub">:{port}</span>
          </div>
        </div>
        <p className="viz-caption">{caption}</p>

        {host ? (
          <>
            <h3 className="viz-steps__title">{t(lang, 'viz.stepsTitle')}</h3>
            <ol className="viz-steps">
              {steps.map((step, i) => (
                <li
                  key={step.id}
                  className="viz-step"
                  style={{ animationDelay: `${i * STEP_SLOT_SECONDS}s`, animationDuration: `${steps.length * STEP_SLOT_SECONDS}s` }}
                >
                  <FontAwesomeIcon icon={STEP_ICONS[step.id] || faTerminal} className="viz-step__icon" aria-hidden="true" />
                  <span>{t(lang, `step.${step.id}.label`)}</span>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="viz-idle">{t(lang, 'viz.idle')}</p>
        )}
      </aside>
    </>
  )
}
