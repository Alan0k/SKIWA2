import React from 'react';

export interface BarSeries {
  name: string;
  color: string;
  values: number[];
}

export function GroupedBarsChart({
  labels,
  series,
  max,
  height = 250,
  showValues = false,
}: {
  labels: string[];
  series: BarSeries[];
  max?: number;
  height?: number;
  showValues?: boolean;
}) {
  const W = 640;
  const H = height;
  const pl = 36;
  const pr = 10;
  const pt = 14;
  const pb = 42;
  const iw = W - pl - pr;
  const ih = H - pt - pb;

  let maxV = max || Math.max(1, ...series.flatMap(s => s.values.map(v => Number(v) || 0)));
  if (!max) maxV = Math.max(5, Math.ceil(maxV / 5) * 5);

  const gw = iw / Math.max(1, labels.length);
  const bw = Math.min(28, (gw * 0.8) / Math.max(1, series.length));

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img">
        {[0, 1, 2, 3, 4, 5].map(i => {
          const v = (maxV * i) / 5;
          const y = pt + ih - (v / maxV) * ih;
          return (
            <g key={i}>
              <line x1={pl} y1={y} x2={W - pr} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={pl - 5} y={y + 3} fontSize="9" fill="#64748b" textAnchor="end">
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        {labels.map((lb, gi) => {
          const x0 = pl + gi * gw + (gw - bw * series.length) / 2;
          const shortLb = String(lb).length > 10 ? String(lb).slice(0, 9) + '…' : String(lb);
          return (
            <g key={gi}>
              {series.map((s, si) => {
                const v = Number(s.values[gi]) || 0;
                const h = (v / maxV) * ih;
                const x = x0 + si * bw;
                const y = pt + ih - h;
                return (
                  <g key={si}>
                    <rect x={x} y={y} width={Math.max(1, bw - 1)} height={Math.max(0, h)} rx="2" fill={s.color} />
                    {showValues && v > 0 && bw >= 12 && (
                      <text x={x + bw / 2} y={y - 2} fontSize="8" fill="#334155" textAnchor="middle">
                        {Math.round(v * 10) / 10}
                      </text>
                    )}
                  </g>
                );
              })}
              <text x={pl + gi * gw + gw / 2} y={H - pb + 14} fontSize="9" fontWeight="700" fill="#334155" textAnchor="middle">
                {shortLb}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2 text-[11px] font-semibold text-slate-600">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

export interface RadarSeries {
  name: string;
  color: string;
  values: number[];
  dashed?: boolean;
}

export function RadarChart({
  labels,
  series,
  max = 5,
}: {
  labels: string[];
  series: RadarSeries[];
  max?: number;
}) {
  const n = labels.length;
  if (n < 3) return null;

  const S = 320;
  const cx = S / 2;
  const cy = S / 2;
  const R = 92;

  const pt = (i: number, v: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = R * (Math.min(v, max) / max);
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  };

  return (
    <div>
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[320px] mx-auto h-auto" role="img">
        {Array.from({ length: max }, (_, idx) => idx + 1).map(lv => (
          <polygon
            key={lv}
            points={labels.map((_, i) => pt(i, lv).join(',')).join(' ')}
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
          />
        ))}
        {labels.map((lb, i) => {
          const e = pt(i, max);
          const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const lx = cx + (R + 16) * Math.cos(a);
          const ly = cy + (R + 16) * Math.sin(a);
          const anc = Math.cos(a) > 0.3 ? 'start' : Math.cos(a) < -0.3 ? 'end' : 'middle';
          const shortLb = String(lb).length > 15 ? String(lb).slice(0, 14) + '…' : String(lb);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="#cbd5e1" strokeWidth="1" />
              <text x={lx} y={ly + 3} fontSize="9" fontWeight="700" fill="#334155" textAnchor={anc}>
                {shortLb}
              </text>
            </g>
          );
        })}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => pt(i, Number(v) || 0).join(',')).join(' ');
          return (
            <polygon
              key={si}
              points={pts}
              fill={s.dashed ? 'none' : s.color}
              fillOpacity={0.28}
              stroke={s.color}
              strokeWidth="1.6"
              strokeDasharray={s.dashed ? '4 3' : undefined}
            />
          );
        })}
      </svg>
      <div className="flex justify-center gap-4 mt-1 text-[11px] font-semibold text-slate-600">
        {series.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm"
              style={{ backgroundColor: s.color, opacity: s.dashed ? 0.5 : 1 }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
