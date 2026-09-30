interface TextFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  hint?: string
  type?: 'text' | 'email'
  maxLength?: number
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
}

// A labelled input that shows its own error, wired up for screen readers.
export function TextField({ id, label, value, onChange, error, hint, type = 'text', ...inputProps }: TextFieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {error ? (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="field-note">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
