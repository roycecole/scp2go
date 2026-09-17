import { useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faXmark } from '@fortawesome/free-solid-svg-icons'
import { t } from '../../lib/i18n.js'

/**
 * A text input with an [x] clear button that appears once there is text.
 * Passes every other prop straight through to the underlying <input>, so
 * call sites keep their id/value/onChange/placeholder/aria wiring as-is
 * and only add `lang` + `onClear` (+ optionally `fieldLabel` so the
 * button's accessible name says which field it clears).
 *
 * Clearing refocuses the input: the button unmounts with the value, and
 * without the handoff a keyboard/AT user's focus would drop to <body>.
 */
export function ClearableInput({ lang, onClear, fieldLabel, ...inputProps }) {
  const inputRef = useRef(null)
  const name = fieldLabel || inputProps['aria-label']
  return (
    <span className="clearable">
      <input ref={inputRef} type="text" {...inputProps} />
      {inputProps.value ? (
        <button
          type="button"
          className="clearable__btn"
          aria-label={name ? t(lang, 'input.clearNamed', { field: name }) : t(lang, 'input.clear')}
          onClick={() => {
            onClear()
            inputRef.current?.focus()
          }}
        >
          <FontAwesomeIcon icon={faXmark} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}
