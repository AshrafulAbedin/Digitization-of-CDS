interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  small?: boolean;
}

export function Stepper({ value, min = 1, max = 99, onChange, small }: StepperProps) {
  const btn = `flex items-center justify-center rounded-md border border-[#d9d4cc] bg-white font-semibold text-body hover:border-ink disabled:opacity-40 disabled:hover:border-[#d9d4cc] ${small ? 'h-7 w-7 text-sm' : 'h-9 w-9'}`;
  return (
    <div className="inline-flex items-center gap-1.5">
      <button type="button" className={btn} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Decrease">
        −
      </button>
      <span className={`tabular text-center font-semibold text-ink ${small ? 'w-6 text-sm' : 'w-8'}`}>{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}
