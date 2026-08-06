type Tone = 'ok' | 'warn' | 'critical' | 'info' | 'muted' | 'gold';

const tones: Record<Tone, string> = {
  ok: 'bg-kitchen/10 text-kitchen',
  warn: 'bg-[#f4e9d8] text-[#8a6a3a]',
  critical: 'bg-warn/15 text-warn',
  info: 'bg-[#e8eef7] text-[#3d5a8a]',
  muted: 'bg-black/5 text-label',
  gold: 'bg-gold/20 text-[#8a6a3a]',
};

export function StatusBadge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium whitespace-nowrap ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
