import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 py-3 font-display text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-primary hover:opacity-90',
        secondary:
          'border border-white/15 bg-white/80 text-primary hover:bg-white dark:border-white/10 dark:bg-surface dark:text-text dark:hover:bg-white/10',
        ghost: 'text-text hover:bg-white/10',
      },
    },
    defaultVariants: { variant: 'primary' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({ asChild, className, variant, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return (
    <Comp className={cn(buttonVariants({ variant }), className)} {...props} />
  )
}

export { buttonVariants }
