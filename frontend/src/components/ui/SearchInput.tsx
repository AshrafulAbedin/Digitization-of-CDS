import type { InputHTMLAttributes, Ref } from 'react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export function SearchInput({ className = '', ...rest }: SearchInputProps) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-label">
        ⌕
      </span>
      <input
        type="search"
        className="h-10 w-full rounded-lg border border-[#d9d4cc] bg-white pr-3 pl-9 text-base outline-none placeholder:text-label focus:border-gold focus:ring-2 focus:ring-gold/30"
        {...rest}
      />
    </div>
  );
}
