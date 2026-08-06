import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    'bg-ink text-white hover:bg-black uppercase tracking-[0.5px] font-bold disabled:bg-[#c9c9c9]',
  secondary:
    'bg-white text-ink border border-[#d9d4cc] hover:border-ink font-semibold disabled:text-label',
  ghost: 'bg-transparent text-body hover:bg-black/5 font-medium disabled:text-label',
  danger: 'bg-warn text-white hover:brightness-95 font-semibold disabled:opacity-50',
  success: 'bg-kitchen text-white hover:brightness-95 font-semibold disabled:opacity-50',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-14 px-6 text-base',
};

export function Button({ variant = 'secondary', size = 'md', className = '', ...rest }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-100 active:scale-[0.98] disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    />
  );
}
