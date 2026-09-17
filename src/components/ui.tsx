import clsx from 'clsx'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

/* Brand button: 12px radius, blue primary w/ action glow, navy secondary,
   outline = navy text + strong border. Sentence-case labels. */
export function Btn({
  variant = 'primary',
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'danger-ghost'
}) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-[12px] px-4 text-sm font-semibold transition-all duration-200 hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50',
        'h-[34px]',
        variant === 'primary' && 'bg-blue text-white shadow-action hover:bg-navy',
        variant === 'secondary' && 'bg-navy text-white hover:bg-navy-800',
        variant === 'outline' &&
          'border-[1.5px] border-hairline-strong bg-white text-navy hover:border-navy',
        variant === 'ghost' && 'text-blue hover:bg-blue-100',
        variant === 'gold' && 'bg-gold text-navy hover:bg-gold-light',
        variant === 'danger-ghost' && 'text-danger hover:bg-[#fcecec]',
        className,
      )}
      {...rest}
    />
  )
}

/* Brand input: white, 1.5px border, 3px radius, focus ring */
export function TextInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'h-[42px] w-full rounded-[3px] border-[1.5px] border-hairline bg-white px-3 text-[15px] text-ink shadow-brand-xs transition-colors placeholder:text-subtle focus:border-blue focus:outline-none',
        className,
      )}
      {...rest}
    />
  )
}

/* Segmented control: bordered group, 3px radius, active cell solid navy */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: ReactNode }[]
  className?: string
}) {
  return (
    <div
      className={clsx(
        'inline-flex overflow-hidden rounded-[3px] border-[1.5px] border-hairline-strong bg-white',
        className,
      )}
    >
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={clsx(
            'cursor-pointer px-3.5 py-1.5 text-[13px] whitespace-nowrap transition-colors duration-120',
            i > 0 && 'border-l-[1.5px] border-hairline-strong',
            value === o.value
              ? 'bg-navy font-semibold text-white'
              : 'bg-white text-navy hover:bg-stripe',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* Brand badge: 22px, uppercase 11/700, squared 2px radius */
export function Badge({
  tone = 'navy',
  children,
  className,
}: {
  tone?: 'navy' | 'blue' | 'gold' | 'clay' | 'mauve' | 'outline' | 'danger'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex h-[22px] items-center rounded-[2px] px-2 text-[11px] font-bold uppercase tracking-wide',
        tone === 'navy' && 'bg-navy text-white',
        tone === 'blue' && 'bg-blue text-white',
        tone === 'gold' && 'bg-gold text-navy',
        tone === 'clay' && 'bg-clay text-white',
        tone === 'mauve' && 'bg-mauve text-white',
        tone === 'outline' && 'border border-blue text-blue',
        tone === 'danger' && 'bg-[#fcecec] text-danger',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx(
        'rounded-[4px] border border-hairline bg-white p-6 shadow-brand-sm',
        className,
      )}
    >
      {children}
    </div>
  )
}
