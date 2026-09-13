import type { InputHTMLAttributes, Ref } from 'react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function SearchInput({ className = '', ...rest }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500">
        ⌕
      </span>
      <input
        type="search"
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 pr-4 pl-10 text-base text-white placeholder-slate-500 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 backdrop-blur transition-all"
        {...rest}
      />
    </div>
  );
}