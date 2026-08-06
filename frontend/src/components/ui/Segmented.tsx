interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}

export function Segmented<T extends string>({ options, value, onChange, className = '' }: SegmentedProps<T>) {
  return (
    <div className={`inline-flex rounded-lg border border-[#d9d4cc] bg-white p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-100 ${
            value === o.value ? 'bg-ink text-white' : 'text-body hover:bg-black/5'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
