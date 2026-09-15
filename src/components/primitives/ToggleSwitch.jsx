export function ToggleSwitch({ id, checked, onChange, label, description }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle__track" aria-hidden="true" />
      <span>
        <span className="toggle__label-text">{label}</span>
        {description ? <span className="toggle__desc">{description}</span> : null}
      </span>
    </label>
  )
}
