import { useState } from "react";
import styles from "./charts.module.css";

/**
 * Grafik buatan sendiri untuk bentuk yang tidak ada di Arc versi gratis: bar horizontal dengan sorotan dan garis acuan,
 * bar vertikal dengan sorotan dan tumpukan, waterfall, dan garis dengan sumbu tidak mulai dari nol (diberi tanda zig-zag).
 * Aturannya sama di semua grafik: satu warna sorot, sisanya abu-abu, label langsung, tanpa gridline, sumbu, dan legenda.
 *
 * Interaksi meniru Arc bar chart: arahkan kursor, sentuh, atau Tab ke sebuah bar; bar lain meredup dan keterangan
 * mengambang di atas grafik menampilkan detailnya (`detail`, atau label dan nilainya bila `detail` kosong).
 */

/** Satu item aktif per grafik, dengan handler yang sama untuk mouse, sentuh, dan keyboard. */
function useActive() {
  const [active, setActive] = useState<string | null>(null);
  const bind = (key: string) => ({
    onPointerEnter: () => setActive(key),
    onPointerDown: () => setActive(key),
    onPointerLeave: () => setActive(null),
    onFocus: () => setActive(key),
    onBlur: () => setActive(null),
  });
  const dim = (key: string) => (active !== null && active !== key ? styles.dim : "");
  return { active, bind, dim };
}

function Readout({ text }: { text: string | null }) {
  return <p className={`${styles.readout} ${text ? styles.readoutOn : ""}`} aria-live="polite">{text ?? ""}</p>;
}

export type HBar = { key: string; label: string; value: number; text: string; note?: string; hi?: boolean; detail?: string };

export function HBars({ items, label, max, reference, caption }: { items: HBar[]; label: string; max?: number; reference?: number; caption?: string }) {
  const { active, bind, dim } = useActive();
  const top = max ?? Math.max(1, ...items.map(x => x.value), reference ?? 0);
  const cur = items.find(x => x.key === active);
  return (
    <figure className={styles.figure}>
      <Readout text={cur ? cur.detail ?? `${cur.label}: ${cur.text}${cur.note ? `, ${cur.note}` : ""}` : null} />
      <ul className={styles.hbars} aria-label={label}>
        {items.map(x => (
          <li key={x.key} className={`${styles.hrow} ${dim(x.key)}`} tabIndex={0} aria-label={x.detail ?? `${x.label}: ${x.text}`} {...bind(x.key)}>
            <span className={`${styles.hname} ${x.hi ? styles.hnameHi : ""}`}>
              {x.label}
              {x.note && <span className={styles.hnote}>{x.note}</span>}
            </span>
            <span className={styles.htrack} aria-hidden="true">
              <span className={`${styles.hfill} ${x.hi ? styles.hfillHi : ""}`} style={{ width: `${(x.value / top) * 100}%` }} />
              {reference !== undefined && <span className={styles.href} style={{ left: `${(reference / top) * 100}%` }} />}
            </span>
            <span className={`${styles.hvalue} ${x.hi ? styles.hvalueHi : ""}`}>{x.text}</span>
          </li>
        ))}
      </ul>
      {caption && <figcaption className={styles.hcaption}>{caption}</figcaption>}
    </figure>
  );
}

export type VBar = { key: string; label: string; value: number; text: string; hi?: boolean; top?: { value: number; text: string }; detail?: string };

/** Bar vertikal. `top` menumpuk satu bagian berwarna di atas bar abu-abu (mis. pesanan jumbo, pelanggan baru). */
export function VBars({ items, label, height = 220, max, W = 600 }: { items: VBar[]; label: string; height?: number; max?: number; W?: number }) {
  const { active, bind, dim } = useActive();
  const T = 26, B = 24;
  const top = max ?? Math.max(1, ...items.map(x => x.value + (x.top?.value ?? 0)));
  const plot = height - T - B;
  const y = (v: number) => T + plot - (v / top) * plot;
  const band = W / items.length, bw = band * 0.6;
  const cur = items.find(x => x.key === active);
  return (
    <figure className={styles.figure}>
      <Readout text={cur ? cur.detail ?? `${cur.label}: ${cur.text}` : null} />
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role="group" aria-label={label}>
        {items.map((x, i) => {
          const cx = band * (i + 0.5), total = x.value + (x.top?.value ?? 0);
          const tall = x.top && y(x.value) - y(total) > 18;
          return (
            <g key={x.key} className={dim(x.key)}>
              <rect x={cx - bw / 2} y={y(x.value)} width={bw} height={y(0) - y(x.value)} className={x.hi && !x.top ? styles.barHi : styles.bar} />
              {x.top && <rect x={cx - bw / 2} y={y(total)} width={bw} height={y(x.value) - y(total)} className={x.hi ? styles.barHi : styles.barSoft} />}
              {x.top && tall && <text x={cx} y={(y(total) + y(x.value)) / 2 + 5} textAnchor="middle" className={x.hi ? styles.inBar : styles.inBarSoft}>{x.top.text}</text>}
              <text x={cx} y={y(total) - 7} textAnchor="middle" className={x.hi ? styles.lblHi : styles.lbl}>{x.text}</text>
              <text x={cx} y={height - 6} textAnchor="middle" className={styles.axis}>{x.label}</text>
              {/* area sentuh selebar kolom, lebih besar dari bar-nya */}
              <rect x={band * i} y={0} width={band} height={height} className={styles.hit} tabIndex={0} aria-label={x.detail ?? `${x.label}: ${x.text}`} {...bind(x.key)} />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export type Step = { key: string; label: string; value: number; text: string; kind: "total" | "delta"; hi?: boolean; detail?: string };

/** Waterfall: total awal, perubahan naik/turun, total akhir. Garis putus-putus menyambung tiap langkah. */
export function Waterfall({ steps, label, height = 260, W = 600 }: { steps: Step[]; label: string; height?: number; W?: number }) {
  const { active, bind, dim } = useActive();
  const T = 26, B = 24;
  let run = 0;
  const bars = steps.map(s => {
    const from = s.kind === "total" ? 0 : run;
    const to = s.kind === "total" ? s.value : run + s.value;
    run = to;
    return { ...s, lo: Math.min(from, to), hi2: Math.max(from, to), end: to };
  });
  const top = Math.max(...bars.map(b => b.hi2));
  const plot = height - T - B;
  const y = (v: number) => T + plot - (v / top) * plot;
  const band = W / steps.length, bw = band * 0.56;
  const cur = steps.find(s => s.key === active);
  return (
    <figure className={styles.figure}>
      <Readout text={cur ? cur.detail ?? `${cur.label}: ${cur.text}` : null} />
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role="group" aria-label={label}>
        {bars.map((b, i) => {
          const cx = band * (i + 0.5);
          const cls = b.hi ? styles.barHi : b.kind === "total" ? styles.barDark : styles.bar;
          return (
            <g key={b.key} className={dim(b.key)}>
              <rect x={cx - bw / 2} y={y(b.hi2)} width={bw} height={Math.max(1, y(b.lo) - y(b.hi2))} className={cls} />
              {i < bars.length - 1 && <line x1={cx + bw / 2} x2={cx + band - bw / 2} y1={y(b.end)} y2={y(b.end)} className={styles.connector} />}
              <text x={cx} y={y(b.hi2) - 7} textAnchor="middle" className={b.hi || b.kind === "total" ? styles.lblHi : styles.lbl}>{b.text}</text>
              <text x={cx} y={height - 6} textAnchor="middle" className={styles.axis}>{b.label}</text>
              <rect x={band * i} y={0} width={band} height={height} className={styles.hit} tabIndex={0} aria-label={b.detail ?? `${b.label}: ${b.text}`} {...bind(b.key)} />
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export type Pt = { key: string; label: string; value: number; text: string; hi?: boolean; detail?: string };

/** Garis dengan sumbu dimulai dari `floor` (bukan nol), ditandai zig-zag di kiri bawah supaya tetap jujur. */
export function FloorLine({ points, label, floor, height = 220 }: { points: Pt[]; label: string; floor: number; height?: number }) {
  const { active, bind, dim } = useActive();
  const W = 600, T = 26, B = 24, L = 28;
  const top = Math.max(...points.map(p => p.value));
  const plot = height - T - B;
  const y = (v: number) => T + plot - ((v - floor) / (top - floor)) * plot;
  const step = (W - L - 20) / Math.max(1, points.length - 1);
  const x = (i: number) => L + 10 + i * step;
  const base = T + plot;
  const cur = points.find(p => p.key === active);
  return (
    <figure className={styles.figure}>
      <Readout text={cur ? cur.detail ?? `${cur.label}: ${cur.text}` : null} />
      <svg viewBox={`0 0 ${W} ${height}`} className={styles.svg} role="group" aria-label={label}>
        <line x1={L} x2={W} y1={base} y2={base} className={styles.baseLine} />
        <path d={`M${L - 8},${base - 10} l4,-4 l4,8 l4,-8 l4,4`} className={styles.zig} />
        <text x={0} y={base + 4} className={styles.axis}>{floor}</text>
        <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ")} className={styles.line} />
        {points.map((p, i) => (
          <g key={p.key} className={dim(p.key)}>
            {active === p.key && <line x1={x(i)} x2={x(i)} y1={T - 10} y2={base} className={styles.cross} />}
            <circle cx={x(i)} cy={y(p.value)} r={p.hi || active === p.key ? 6 : 4} className={p.hi || active === p.key ? styles.dotHi : styles.dot} />
            <text x={x(i)} y={y(p.value) - 12} textAnchor="middle" className={p.hi ? styles.lblHi : styles.lbl}>{p.text}</text>
            <text x={x(i)} y={height - 6} textAnchor="middle" className={styles.axis}>{p.label}</text>
            <rect x={x(i) - step / 2} y={0} width={step} height={height} className={styles.hit} tabIndex={0} aria-label={p.detail ?? `${p.label}: ${p.text}`} {...bind(p.key)} />
          </g>
        ))}
      </svg>
    </figure>
  );
}
