import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./RibbonChart.module.css";

export type RibbonDatum = { key: string; label: string; axisLabel: string; values: Record<string, number> };
export type RibbonSeries = { key: string; label: string };
export type RibbonMode = "bar" | "tumpuk" | "persen" | "pita";

type Props = {
  data: RibbonDatum[];
  /** Penyumbang utama (mis. top 5), urut menurut besar keseluruhan. */
  series: RibbonSeries[];
  /** Warna per kunci lapisan. Warna melekat pada entitas, bukan pada urutan, supaya tidak berubah saat filter berganti. */
  colors: Record<string, string>;
  /** Omzet seluruh bulan (urutan sama dengan `data`), untuk bacaan "x% dari omzet bulan itu". */
  monthTotals?: number[];
  mode?: RibbonMode;
  label: string;
  unit?: string;
  height?: number;
  formatValue?: (v: number) => string;
  /** false untuk lapisan yang bukan peringkat entitas (mis. pelanggan lama vs baru): bacaan tanpa "peringkat" dan "belum dijual". */
  ranked?: boolean;
};

const GAP = 2;
/** Tinggi minimum (px) untuk lapisan yang sudah dijual tetapi nol bulan itu pada mode pita, supaya pitanya tidak terputus. */
const HAIRLINE = 2;
/** Segmen lebih rendah dari ini tidak diberi label angka (label hanya bila muat). */
const LABEL_MIN_H = 20;

type Seg = { key: string; rank: number; y0: number; y1: number; value: number; sold: boolean; x: number; w: number };

/** Batas atas sumbu yang habis dibagi 4 dengan langkah bulat (1, 2, 5, 10 kali pangkat sepuluh): 385 -> 400, 287 -> 400, 74 -> 80. */
const niceMax = (v: number) => {
  if (v <= 0) return 4;
  const raw = v / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p * 4;
};

/**
 * Penyumbang utama per periode, empat bentuk:
 * - "bar": grouped bar. Satu kelompok per bulan, satu bar per penyumbang, sumbu dan garis dasar sama (membandingkan besaran).
 * - "tumpuk": stacked bar. Total top 5 per bulan langsung terlihat, dan komposisinya.
 * - "persen": 100% stacked bar. Hanya komposisi (porsi tiap penyumbang di antara top 5).
 * - "pita": ribbon chart gaya Power BI. Segmen diurutkan per peringkat (terbesar di atas) dan kategori yang sama dihubungkan
 *   pita antar kolom sehingga perubahan peringkat terlihat.
 * Tidak ada kategori "Lainnya".
 *
 * Dua keadaan nol dibedakan: "belum dijual" (sebelum penjualan pertama; tidak diberi peringkat, pita baru mulai di bulan
 * pertamanya) dan "tidak terjual" (sudah pernah terjual, bulan ini nol; ikut peringkat, pita menipis jadi garis tipis).
 */
export function RibbonChart({ data, series, colors, monthTotals, mode = "bar", label, unit = "", height = 320, formatValue = v => String(Math.round(v)), ranked = true }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverRaw, setHover] = useState<{ key: string; i: number | null } | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);

  useEffect(() => {
    const node = box.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    setWidth(Math.max(280, node.clientWidth));
    const ro = new ResizeObserver(([e]) => e && setWidth(Math.max(280, e.contentRect.width)));
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const color = (key: string) => colors[key] ?? "var(--neutral-7)";
  const nameOf = (key: string) => series.find(s => s.key === key)?.label ?? key;
  const axisFmt = (v: number) => (mode === "persen" ? `${Math.round(v)}%` : formatValue(v));

  const geo = useMemo(() => {
    const withAxis = mode !== "pita";
    const M = { top: 30, right: 8, bottom: 30, left: withAxis ? 44 : 8 };
    const val = (i: number, k: string) => data[i].values[k] ?? 0;
    const first = new Map<string, number>(); // bulan pertama terjual per lapisan
    for (const sr of series) {
      const at = data.findIndex(d => (d.values[sr.key] ?? 0) > 0);
      if (at >= 0) first.set(sr.key, at);
    }
    const plotH = height - M.top - M.bottom;
    const baseline = M.top + plotH;
    const band = Math.max(0, width - M.left - M.right) / Math.max(1, data.length);
    const totals = data.map((_, i) => series.reduce((s, sr) => s + val(i, sr.key), 0));
    const rankIn = (i: number, k: string) => [...series].sort((a, b) => val(i, b.key) - val(i, a.key)).findIndex(x => x.key === k) + 1;
    const ticksFor = (yMax: number) => [0, 1, 2, 3, 4].map(t => ({ v: (yMax * t) / 4, y: baseline - (plotH * t) / 4 }));

    if (mode === "bar") {
      const yMax = niceMax(Math.max(1, ...data.flatMap((_, i) => series.map(sr => val(i, sr.key)))));
      const k = Math.max(1, series.length);
      const bw = Math.max(4, Math.min(28, (band * 0.8 - GAP * (k - 1)) / k));
      const cluster = k * bw + GAP * (k - 1);
      const cols = data.map((_, i) => {
        const start = M.left + band * (i + 0.5) - cluster / 2;
        const segs: Seg[] = series.map((sr, s) => {
          const v = val(i, sr.key);
          const h = (plotH * v) / yMax;
          return { key: sr.key, rank: rankIn(i, sr.key), y0: baseline - h, y1: baseline, value: v, sold: v > 0, x: start + s * (bw + GAP), w: bw };
        });
        const tallest = segs.reduce((a, b) => (b.value > a.value ? b : a), segs[0]);
        return { cx: M.left + band * (i + 0.5), segs, total: totals[i], labelAt: tallest && tallest.sold ? { x: tallest.x + tallest.w / 2, y: tallest.y0 - 6, text: formatValue(tallest.value) } : null };
      });
      return { cols, ticks: ticksFor(yMax), first, M, baseline };
    }

    if (mode === "tumpuk" || mode === "persen") {
      const pct = mode === "persen";
      const yMax = pct ? 100 : niceMax(Math.max(1, ...totals));
      const colW = Math.min(72, band * 0.34);
      const cols = data.map((_, i) => {
        const x = M.left + band * (i + 0.5) - colW / 2;
        const t = totals[i] || 1;
        let y = baseline;
        const segs: Seg[] = series.map(sr => {
          const v = val(i, sr.key);
          const h = (plotH * (pct ? (v / t) * 100 : v)) / yMax;
          y -= h;
          return { key: sr.key, rank: rankIn(i, sr.key), y0: y, y1: y + h, value: v, sold: v > 0, x, w: colW };
        });
        return { cx: x + colW / 2, segs, total: totals[i], labelAt: pct ? null : { x: x + colW / 2, y: y - 8, text: formatValue(totals[i]) } };
      });
      return { cols, ticks: ticksFor(yMax), first, M, baseline };
    }

    // pita
    const max = Math.max(1, ...totals);
    const extra = Math.max(0, ...data.map((_, j) => series.filter(sr => first.has(sr.key) && j >= (first.get(sr.key) as number) && val(j, sr.key) === 0).length)) * (HAIRLINE + GAP);
    const valueH = plotH - extra;
    const colW = Math.min(72, band * 0.34);
    const cols = data.map((_, i) => {
      const x = M.left + band * (i + 0.5) - colW / 2;
      const present = series.filter(sr => first.has(sr.key) && i >= (first.get(sr.key) as number));
      const ranked = [...present].sort((a, b) => val(i, b.key) - val(i, a.key));
      const zeros = ranked.filter(sr => val(i, sr.key) === 0).length;
      let y = baseline - ((valueH * totals[i]) / max + zeros * (HAIRLINE + GAP));
      const top = y;
      const segs: Seg[] = ranked.map((sr, rank) => {
        const v = val(i, sr.key);
        const h = v > 0 ? (valueH * v) / max : HAIRLINE;
        const seg = { key: sr.key, rank: rank + 1, y0: y, y1: y + h, value: v, sold: v > 0, x, w: colW };
        y += h + (v > 0 ? 0 : GAP);
        return seg;
      });
      return { cx: x + colW / 2, segs, total: totals[i], labelAt: { x: x + colW / 2, y: (segs.length ? top : baseline) - 8, text: formatValue(totals[i]) } };
    });
    return { cols, ticks: [] as { v: number; y: number }[], first, M, baseline };
  }, [data, series, mode, width, height, formatValue]);

  // indeks hover bisa usang bila jumlah kolom berubah (filter) sementara kursor belum meninggalkan grafik
  const hover = hoverRaw && (hoverRaw.i === null || hoverRaw.i < geo.cols.length) ? hoverRaw : null;
  const active = pinned ?? hover?.key ?? null;
  const dim = (key: string) => (active && active !== key ? 0.18 : 1);
  const statusAt = (key: string, i: number) => {
    const seg = geo.cols[i].segs.find(s => s.key === key);
    if (seg?.sold) return `#${seg.rank}`;
    const at = geo.first.get(key);
    return at === undefined || i < at ? "belum dijual" : "tidak terjual";
  };

  const ribbons = mode === "pita"
    ? series.flatMap(sr => geo.cols.slice(0, -1).flatMap((c, i) => {
      const a = c.segs.find(s => s.key === sr.key);
      const b = geo.cols[i + 1].segs.find(s => s.key === sr.key);
      if (!a || !b) return [];
      const x0 = a.x + a.w, x1 = b.x, mid = (x0 + x1) / 2;
      const d = `M${x0},${a.y0 + GAP / 2} C${mid},${a.y0 + GAP / 2} ${mid},${b.y0 + GAP / 2} ${x1},${b.y0 + GAP / 2}`
        + ` L${x1},${b.y1 - GAP / 2} C${mid},${b.y1 - GAP / 2} ${mid},${a.y1 - GAP / 2} ${x0},${a.y1 - GAP / 2} Z`;
      return [{ id: `${sr.key}-${i}`, key: sr.key, d }];
    }))
    : [];

  const pctText = (v: number, total: number) => `${((v / total) * 100).toFixed(1).replace(".", ",")}%`;
  const readout = (() => {
    if (hover && hover.i !== null) {
      const i = hover.i;
      const c = geo.cols[i];
      const s = c.segs.find(x => x.key === hover.key);
      if (s && s.sold) {
        const monthBased = mode !== "persen" && mode !== "pita" && !!monthTotals?.[i];
        const denom = monthBased ? (monthTotals as number[])[i] : c.total;
        const base = monthBased ? "omzet bulan itu" : `omzet ${series.length} teratas`;
        return `${nameOf(s.key)}, ${data[i].label}: ${formatValue(s.value)} ${unit}${ranked ? `, peringkat ${s.rank} dari ${series.length}` : ""}, ${pctText(s.value, denom)} dari ${base}`;
      }
      if (!ranked) return `${nameOf(hover.key)}, ${data[i].label}: 0 ${unit}`;
      return statusAt(hover.key, i) === "belum dijual"
        ? `${nameOf(hover.key)}, ${data[i].label}: belum dijual, belum diberi peringkat`
        : `${nameOf(hover.key)}, ${data[i].label}: tidak terjual bulan ini (sudah dijual sebelumnya${mode === "pita" ? ", ditaruh di peringkat terakhir" : ""})`;
    }
    if (!ranked) return `Arahkan kursor ke bar untuk detail.`;
    if (active) return `${nameOf(active)}: ${geo.cols.map((_, i) => `${data[i].axisLabel} ${statusAt(active, i)}`).join(", ")}`;
    const tops = data.map(d => [...series].sort((a, b) => (d.values[b.key] ?? 0) - (d.values[a.key] ?? 0))[0]?.key).filter(Boolean) as string[];
    const lead = tops.length ? [...tops].sort((a, b) => tops.filter(x => x === b).length - tops.filter(x => x === a).length)[0] : null;
    return lead ? `${nameOf(lead)} peringkat 1 di ${tops.filter(k => k === lead).length} dari ${data.length} bulan. Arahkan kursor ke bar${mode === "pita" ? " atau pita" : ""} untuk detail.` : "Tidak ada data";
  })();

  const stacked = mode === "tumpuk" || mode === "persen";
  return (
    <figure className={styles.figure} aria-label={label}>
      <div className={styles.legend} role="group" aria-label="Penyumbang">
        {series.map(sr => (
          <button
            key={sr.key}
            type="button"
            className={styles.legendItem}
            aria-pressed={pinned === sr.key}
            onClick={() => setPinned(p => (p === sr.key ? null : sr.key))}
            onPointerEnter={() => setHover({ key: sr.key, i: null })}
            onPointerLeave={() => setHover(null)}
          >
            <span className={styles.swatch} style={{ background: color(sr.key) }} aria-hidden="true" />
            {sr.label}
          </button>
        ))}
      </div>
      <p className={styles.readout} aria-live="polite">{readout}</p>
      <div ref={box} className={styles.plot}>
        <svg width={width || undefined} height={height} role="img" aria-label={`${label}, ${mode}`} onPointerLeave={() => setHover(null)}>
          {geo.ticks.map(t => (
            <g key={t.v}>
              <line x1={geo.M.left} x2={width - geo.M.right} y1={t.y} y2={t.y} className={styles.grid} />
              <text x={geo.M.left - 8} y={t.y} textAnchor="end" dominantBaseline="central" className={styles.axis}>{axisFmt(t.v)}</text>
            </g>
          ))}
          {ribbons.map(r => (
            <path key={r.id} d={r.d} fill={color(r.key)} className={styles.ribbon} style={{ opacity: active ? (active === r.key ? 0.45 : 0.05) : 0.28 }}
              onPointerEnter={() => setHover({ key: r.key, i: null })} />
          ))}
          {geo.cols.map((c, i) => (
            <g key={data[i].key}>
              {c.segs.map(s => {
                const grouped = mode === "bar";
                const h = Math.max(0, s.y1 - s.y0 - (grouped ? 0 : GAP));
                return (
                  <g key={s.key}>
                    <rect x={s.x} y={s.y0 + (grouped ? 0 : GAP / 2)} width={s.w} height={h} rx={grouped ? 3 : s.sold ? 4 : 1}
                      fill={color(s.key)} className={styles.segment} style={{ opacity: dim(s.key) }}
                      onPointerEnter={() => setHover({ key: s.key, i })} />
                    {stacked && s.sold && s.y1 - s.y0 >= LABEL_MIN_H && (
                      <text x={s.x + s.w / 2} y={(s.y0 + s.y1) / 2} textAnchor="middle" dominantBaseline="central" className={styles.inside}
                        style={{ opacity: dim(s.key) }} pointerEvents="none">
                        {mode === "persen" ? `${Math.round((s.value / (c.total || 1)) * 100)}%` : formatValue(s.value)}
                      </text>
                    )}
                  </g>
                );
              })}
              {c.labelAt && <text x={c.labelAt.x} y={c.labelAt.y} textAnchor="middle" className={styles.total}>{c.labelAt.text}</text>}
              <text x={c.cx} y={height - 10} textAnchor="middle" className={styles.axis}>{data[i].axisLabel}</text>
            </g>
          ))}
          <line x1={geo.M.left} x2={width - geo.M.right} y1={geo.baseline} y2={geo.baseline} className={styles.baseline} />
        </svg>
      </div>
      <table className={styles.srOnly}>
        <caption>{label}</caption>
        <thead>
          <tr><th>Bulan</th><th>Nilai per penyumbang ({unit})</th></tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.key}>
              <td>{d.label}</td>
              <td>
                {series.map(sr => {
                  const v = d.values[sr.key] ?? 0;
                  return v > 0 ? `${sr.label} ${formatValue(v)}` : `${sr.label} ${statusAt(sr.key, i)}`;
                }).join("; ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
