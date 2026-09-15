export function SegmentedControl({ name, options, value, onChange, legend, fluid }) {
  return (
    <div className={`segmented${fluid ? ' segmented--fluid' : ''}`} role="radiogroup" aria-label={legend}>
      {options.map((opt) => {
        const id = `${name}-${opt.value}`
        return (
          <span className="segmented__option" key={opt.value}>
            <input
              type="radio"
              id={id}
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            <label htmlFor={id}>{opt.label}</label>
          </span>
        )
      })}
    </div>
  )
}
