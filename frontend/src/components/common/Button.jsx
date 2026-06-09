import './Button.css'

function Button({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon: Icon,
  iconPosition = 'right',
  ...props
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth && 'btn--full-width',
    loading && 'btn--loading',
    disabled && 'btn--disabled',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {Icon && iconPosition === 'left' && <Icon className="btn-icon btn-icon--left" />}
      {loading ? <span className="btn-loading-text">...</span> : children}
      {Icon && iconPosition === 'right' && <Icon className="btn-icon btn-icon--right" />}
    </button>
  )
}

export default Button
