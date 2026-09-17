import { useEffect, useMemo, useRef, useState } from 'react'
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
  faUnlock,
  faRotate,
  faHeartPulse,
  faCircleCheck,
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

/**
 * The fixed 16-step SSH handshake sequence (after the ByteByteGo "How SSH
 * Works?" diagram). Label key = `viz.hs.step<n>`; the screen-reader
 * direction key = `viz.hs.dir.<kind>`. kind: c2s/s2c/bi are messages on
 * the wire, client/server are local actions on one lifeline. Icons appear
 * only on local-action rows — arrows carry direction on message rows.
 * Keep length 16 in lockstep with the CSS --hs-cycle / 6.25% slot math.
 */
const HS_STEPS = [
  { n: 1, kind: 'bi' },
  { n: 2, kind: 'bi' },
  { n: 3, kind: 'bi' },
  { n: 4, kind: 'client', icon: faKey },
  { n: 5, kind: 'c2s' },
  { n: 6, kind: 'c2s' },
  { n: 7, kind: 'server', icon: faShieldHalved },
  { n: 8, kind: 's2c' },
  { n: 9, kind: 'client', icon: faUnlock },
  { n: 10, kind: 'c2s' },
  { n: 11, kind: 'server', icon: faCircleCheck },
  { n: 12, kind: 'bi' },
  { n: 13, kind: 'c2s' },
  { n: 14, kind: 'server', icon: faUnlock },
  { n: 15, kind: 's2c' },
  { n: 16, kind: 'client', icon: faUnlock },
]

const MIN_W = 320
const MAX_W = 820

export function TransferVisualizer({ state }) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [toggleTop, setToggleTop] = useState(null)
  const dragRef = useRef(null)
  const drawerRef = useRef(null)
  const toggleRef = useRef(null)
  const toggleDragRef = useRef(null)
  const lang = state.lang
  const steps = useMemo(() => buildSteps(state), [state])

  // Click on blank page space (outside the drawer and any control) closes
  // the drawer; clicks on form controls stay live so the demo keeps
  // mirroring changes while open. A click whose press and release land on
  // different elements is dispatched on their common ancestor, so a
  // resize-drag or a text selection that starts inside the drawer would
  // read as an "outside" click — dismissal therefore requires that the
  // press also STARTED on blank space, and never fires mid-selection.
  useEffect(() => {
    if (!open) return undefined
    const isBlankSpace = (target) => {
      if (!(target instanceof Element)) return false
      if (drawerRef.current?.contains(target)) return false
      if (toggleRef.current?.contains(target)) return false
      if (target.closest('input, button, select, textarea, label, a, summary, [tabindex]')) return false
      return true
    }
    let pressedOnBlank = false
    const onDocPointerDown = (e) => {
      pressedOnBlank = isBlankSpace(e.target)
    }
    const onDocClick = (e) => {
      const eligible = pressedOnBlank && isBlankSpace(e.target)
      pressedOnBlank = false
      if (!eligible) return
      const selection = window.getSelection?.()
      if (selection && !selection.isCollapsed) return
      setOpen(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown)
    document.addEventListener('click', onDocClick)
    return () => {
      document.removeEventListener('pointerdown', onDocPointerDown)
      document.removeEventListener('click', onDocClick)
    }
  }, [open])

  const host = (state.host || '').trim()
  const jump = (state.jumpHost || '').trim()
  const identityKey = (state.key || '').trim()
  const isDownload = state.direction === 'download'
  const fileCount = state.files.length
  const user = (state.user || '').trim() || 'ubuntu'
  const port = (state.port || '').trim() || '22'
  const dest = (state.dest || '').trim() || '~/'
  const packetIcon = state.optTarBundle && !isDownload ? faFileZipper : faFile

  const remoteLabel = host ? `${user}@${host}` : t(lang, 'viz.remoteFallback')
  const filesLabel = fileCount > 0 ? t(lang, 'viz.filesCount', { count: String(fileCount) }) : t(lang, 'viz.noFiles')
  const caption = isDownload ? `${dest} → ${t(lang, 'viz.local')}` : `${filesLabel} → ${dest}`

  const effectiveMax = () => Math.max(MIN_W, Math.min(MAX_W, window.innerWidth - 80))

  const clampW = (w) => Math.min(Math.max(w, MIN_W), effectiveMax())

  const stopDrag = (e) => {
    if (dragRef.current && e.pointerId !== dragRef.current.pointerId) return
    dragRef.current = null
    setDragging(false)
  }

  // Announced values track what is actually rendered: the inline style caps
  // at 100vw - 80px, so the aria range/value must apply the same clamp.
  const ariaMax = effectiveMax()
  const ariaNow = Math.round(Math.min(width ?? 420, ariaMax))

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
        ref={toggleRef}
        className="viz-toggle"
        style={toggleTop != null ? { top: `clamp(28px, ${Math.round(toggleTop)}px, calc(100vh - 28px))` } : undefined}
        aria-expanded={open}
        onClick={(e) => {
          // A pointer drag ends in a click on the same button — swallow it
          // so repositioning never also toggles the drawer. Keyboard/AT
          // activations have e.detail === 0 and are never suppressed.
          if (e.detail > 0 && toggleDragRef.current?.moved) {
            toggleDragRef.current = null
            return
          }
          toggleDragRef.current = null
          setOpen((o) => !o)
        }}
        onPointerDown={(e) => {
          if (!e.isPrimary) return
          if (e.pointerType === 'mouse' && e.button !== 0) return
          toggleDragRef.current = {
            pointerId: e.pointerId,
            startY: e.clientY,
            startTop: toggleRef.current.getBoundingClientRect().top + toggleRef.current.offsetHeight / 2,
            moved: false,
          }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = toggleDragRef.current
          if (!d || e.pointerId !== d.pointerId) return
          const dy = e.clientY - d.startY
          if (!d.moved && Math.abs(dy) < 5) return
          d.moved = true
          const half = toggleRef.current.offsetHeight / 2
          const y = Math.min(Math.max(d.startTop + dy, half + 8), window.innerHeight - half - 8)
          setToggleTop(y)
        }}
        onPointerUp={() => {
          // A touch/pen drag ends with no trailing click, which would leave
          // a stale moved-flag that swallows the next activation. The click
          // that DOES follow a mouse release fires synchronously before
          // this timeout, so suppression still works there.
          const d = toggleDragRef.current
          if (d) {
            setTimeout(() => {
              if (toggleDragRef.current === d) toggleDragRef.current = null
            }, 0)
          }
        }}
        onPointerCancel={() => {
          // No click follows a cancelled pointer, so the drag record can go.
          toggleDragRef.current = null
        }}
        title={t(lang, 'viz.open')}
        aria-label={t(lang, 'viz.open')}
      >
        <FontAwesomeIcon icon={faCirclePlay} aria-hidden="true" />
      </button>

      <aside
        id="viz-drawer"
        ref={drawerRef}
        className={`viz-drawer${open ? ' viz-drawer--open' : ''}${dragging ? ' viz-drawer--resizing' : ''}`}
        style={width != null ? { width: `min(${width}px, calc(100vw - 80px))` } : undefined}
        aria-label={t(lang, 'viz.title')}
        aria-hidden={!open}
      >
        <div
          className={`viz-drawer__resizer${dragging ? ' viz-drawer__resizer--active' : ''}`}
          role="separator"
          aria-orientation="vertical"
          tabIndex={0}
          aria-controls="viz-drawer"
          aria-label={t(lang, 'viz.resize')}
          aria-valuemin={MIN_W}
          aria-valuemax={ariaMax}
          aria-valuenow={ariaNow}
          aria-valuetext={`${ariaNow}px`}
          onPointerDown={(e) => {
            if (!e.isPrimary || dragRef.current) return
            if (e.pointerType === 'mouse' && e.button !== 0) return
            e.preventDefault()
            dragRef.current = {
              pointerId: e.pointerId,
              startX: e.clientX,
              startW: drawerRef.current.getBoundingClientRect().width,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
            setDragging(true)
          }}
          onPointerMove={(e) => {
            if (dragRef.current && e.pointerId === dragRef.current.pointerId) {
              setWidth(clampW(dragRef.current.startW + (dragRef.current.startX - e.clientX)))
            }
          }}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onLostPointerCapture={stopDrag}
          onDoubleClick={() => setWidth(null)}
          onKeyDown={(e) => {
            const step = e.shiftKey ? 64 : 16
            const cur = width ?? 420
            if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
              e.preventDefault()
              setWidth(clampW(cur + step))
            } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
              e.preventDefault()
              setWidth(clampW(cur - step))
            } else if (e.key === 'Home') {
              e.preventDefault()
              setWidth(MIN_W)
            } else if (e.key === 'End') {
              e.preventDefault()
              setWidth(clampW(MAX_W))
            }
          }}
        />
        <div className="viz-drawer__header">
          <h2 className="viz-drawer__title">{t(lang, 'viz.title')}</h2>
          <button type="button" className="viz-drawer__close" onClick={() => setOpen(false)} aria-label={t(lang, 'viz.close')}>
            <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
          </button>
        </div>
        <div className="viz-drawer__body">
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

          <details className="viz-hs" open>
            <summary className="viz-hs__summary">
              {/* A span, not an h3: heading semantics inside a <summary>
                  (a disclosure button) are flattened inconsistently by
                  AT — the button is named by this text instead. */}
              <span className="viz-steps__title">{t(lang, 'viz.hs.title')}</span>
            </summary>
            <p className="viz-drawer__hint">{t(lang, 'viz.hs.intro')}</p>
            {jump ? <p className="viz-hs__note">{t(lang, 'viz.hs.jumpNote', { jump })}</p> : null}
            <p className="viz-hs__note">
              {identityKey ? t(lang, 'viz.hs.keyNote', { key: identityKey }) : t(lang, 'viz.hs.noKeyNote')}
            </p>
            <div className="viz-hs__diagram">
              <div className="viz-hs__heads" aria-hidden="true">
                <span className="viz-hs__head">
                  <FontAwesomeIcon icon={faLaptopCode} /> <span>{t(lang, 'viz.local')}</span>
                </span>
                <span className="viz-hs__head">
                  <FontAwesomeIcon icon={faServer} /> <span>{remoteLabel}</span>
                </span>
              </div>
              <ol className="viz-hs__rows" role="list">
                {HS_STEPS.map((s, i) => {
                  const isMsg = s.kind === 'c2s' || s.kind === 's2c' || s.kind === 'bi'
                  const vars = s.n === 1 ? { port } : s.n === 13 ? { transport: state.transport } : undefined
                  return (
                    <li key={s.n} className={`viz-hs__row viz-hs__row--${s.kind}`} style={{ '--i': i }}>
                      <div className="viz-hs__labelline">
                        <span className="viz-hs__num" aria-hidden="true">
                          {s.n}
                        </span>
                        {s.icon ? <FontAwesomeIcon icon={s.icon} className="viz-hs__glyph" aria-hidden="true" /> : null}
                        <span className="viz-hs__label">
                          {t(lang, `viz.hs.step${s.n}`, vars)}
                          <span className="visually-hidden">{t(lang, `viz.hs.dir.${s.kind}`)}</span>
                        </span>
                      </div>
                      {isMsg ? (
                        <div className="viz-hs__track" aria-hidden="true">
                          {s.kind !== 's2c' ? <span className="viz-hs__dot" /> : null}
                          {s.kind !== 'c2s' ? <span className="viz-hs__dot viz-hs__dot--rtl" /> : null}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
            </div>
          </details>
        </div>
      </aside>
    </>
  )
}
