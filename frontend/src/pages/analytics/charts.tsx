import { useState } from 'react';
import { fmtTaka } from '../../types';

/** Chart hues — validated for CVD separation on white (dataviz six checks). */
export const HUE_A = '#B8791A'; // warm gold — magnitude / first category
export const HUE_B = '#3D6DBF'; // blue — second category

interface Bar {
  label: string;
  value: number;
}

/** Single-series vertical bar chart with hover tooltip + always-visible max label. */
export function BarChart({ bars, money = true }: { bars: Bar[]; money?: boolean }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...bars.map((b) => b.value), 1);
  const maxIdx = bars.findIndex((b) => b.value === max);
  return (
    <div className="flex h-44 items-end gap-1.5">
      {bars.map((b, i) => (
        <div
          key={b.label}
          className="relative flex min-w-0 flex-1 flex-col items-center justify-end self-stretch"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
        >
          {(hover === i || (hover === null && i === maxIdx)) && (
            <span className="tabular mb-0.5 text-xs whitespace-nowrap text-body">
              {money ? fmtTaka(b.value) : b.value}
            </span>
          )}
          <div
            className="w-full max-w-8 rounded-t-[4px]"
            style={{
              height: `${(b.value / max) * 100}%`,
              minHeight: b.value > 0 ? 3 : 0,
              background: hover === i ? '#8f5d13' : HUE_A,
            }}
          />
          <span className="mt-1 w-full truncate text-center text-xs text-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

/** Horizontal ranked bar list (top sellers / missed demand). */
export function BarList({
  rows,
  hue = HUE_A,
  valueLabel,
}: {
  rows: { name: string; value: number; detail?: string }[];
  hue?: string;
  valueLabel: (v: number) => string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="min-w-0 truncate text-body">
              <span className="tabular mr-1.5 text-label">{i + 1}.</span>
              {r.name}
            </span>
            <span className="tabular whitespace-nowrap text-body">
              {valueLabel(r.value)}
              {r.detail && <span className="ml-1.5 text-label">{r.detail}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-[4px] bg-black/5">
            <div className="h-full rounded-[4px]" style={{ width: `${(r.value / max) * 100}%`, background: hue }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Two-category stacked horizontal bar with legend + counts as text. */
export function MixBar({
  a,
  b,
  labelA,
  labelB,
}: {
  a: number;
  b: number;
  labelA: string;
  labelB: string;
}) {
  const total = a + b;
  const pa = total === 0 ? 50 : (a / total) * 100;
  return (
    <div>
      <div className="flex h-6 gap-[2px] overflow-hidden rounded-[4px]">
        <div style={{ width: `${pa}%`, background: HUE_A }} title={`${labelA}: ${a}`} />
        <div style={{ width: `${100 - pa}%`, background: HUE_B }} title={`${labelB}: ${b}`} />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="flex items-center gap-1.5 text-body">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: HUE_A }} />
          {labelA} · <span className="tabular">{a}</span> ({total ? Math.round((a / total) * 100) : 0}%)
        </span>
        <span className="flex items-center gap-1.5 text-body">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: HUE_B }} />
          {labelB} · <span className="tabular">{b}</span> ({total ? Math.round((b / total) * 100) : 0}%)
        </span>
      </div>
    </div>
  );
}

export function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e7e2da] bg-white p-4">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {sub && <p className="text-sm text-label">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

/** vs-previous-period delta chip; `goodWhenDown` flips the goodness color. */
export function DeltaChip({ now, prev, goodWhenDown = false }: { now: number; prev: number; goodWhenDown?: boolean }) {
  if (prev === 0) return null;
  const pct = Math.round(((now - prev) / Math.abs(prev)) * 100);
  if (pct === 0) return null;
  const up = pct > 0;
  const good = goodWhenDown ? !up : up;
  return (
    <span
      className={`tabular ml-2 rounded-full px-1.5 py-0.5 text-xs font-medium ${
        good ? 'bg-kitchen/10 text-kitchen' : 'bg-warn/15 text-warn'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(pct)}%
    </span>
  );
}
