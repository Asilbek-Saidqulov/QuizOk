import './Input.css'

function Input({
  type = 'text',
  label,
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  icon: Icon,
  ...props
}) {
  const classes = [
    'input',
    error && 'input--error',
    disabled && 'input--disabled',
    Icon && 'input--with-icon',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="input-wrapper">
      {label && (
        <label className="input-label">
          {label}
          {required && <span className="input-required">*</span>}
        </label>
      )}
      <div className="input-container">
        {Icon && <Icon className="input-icon" />}
        <input
          type={type}
          className={classes}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
          {...props}
        />
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  )
}

export default Input
