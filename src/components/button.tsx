import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  block?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const classes = [
    'aura-button',
    `aura-button--${variant}`,
    block ? 'aura-button--block' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  )
}
