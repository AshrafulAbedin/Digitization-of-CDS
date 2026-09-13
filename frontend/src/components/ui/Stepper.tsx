interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  small?: boolean;
}

export function Stepper({ value, min = 1, max = 99, onChange, small }: StepperProps) {
  const btn = `flex items-center justify-center rounded-lg border border-white/10 bg-white/5 font-bold text-white transition-all hover:bg-white/10 hover:border-orange-400/40 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:border-white/10 ${
    small ? 'h-8 w-8 text-base' : 'h-10 w-10 text-lg'
  }`;
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className={btn}
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label="Decrease"
      >
        −
      </button>
      <span
        className={`text-center font-mono font-bold text-white ${
          small ? 'w-7 text-base' : 'w-9 text-lg'
        }`}
      >
        {value}
      </span>
      <button
        type="button"
        className={btn}
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}