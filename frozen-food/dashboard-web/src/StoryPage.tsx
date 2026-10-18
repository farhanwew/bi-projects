import { useMemo, useState } from "react";
import { BULAN, calendar, type Dict, type Row } from "./analytics";
import raw from "./data.json";
import { int, one, pct, rp } from "./format";
import { HBars } from "./components/charts/charts";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { RevisedSections } from "./RevisedPage";
import chart from "./components/charts/charts.module.css";
import styles from "./StoryPage.module.css";

/** Versi 2: satu halaman bercerita untuk satu audiens (pemilik) dan satu tujuan. Semua angka dihitung dari data, tidak ditulis tangan. */
const DICT = raw as unknown as Dict;
const ROWS = raw.rows as unknown as Row[];
const CAL = calendar(DICT.base, DICT.hari);
const [DAY, CUST, , , QTY, UNIT, , AMT] = [0, 1, 2, 3, 4, 5, 6, 7];
/** Pesanan jumbo = satu baris bernilai minimal Rp40 jt (3 dari 6.720 baris, semuanya Agustus). */
const JUMBO = 40_000_000;
const MONTHS = [4, 5, 6, 7, 8, 9];

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const jt = (v: number) => v / 1e6;

function useStory() {
  return useMemo(() => {
    const total: Record<number, number> = {}, jumbo: Record<number, number> = {};
    const buyers = new Set<number>();
    let jumboRows = 0;
    for (const r of ROWS) {
      const m = CAL.month[r[DAY]];
      total[m] = (total[m] ?? 0) + r[AMT];
      if (r[AMT] >= JUMBO) { jumbo[m] = (jumbo[m] ?? 0) + r[AMT]; buyers.add(r[CUST]); jumboRows++; }
    }
    const months = MONTHS.map(m => ({ m, label: BULAN[m], short: BULAN[m].slice(0, 3), base: jt(total[m] - (jumbo[m] ?? 0)), jumbo: jt(jumbo[m] ?? 0) }));
    const dus = ROWS.filter(r => DICT.satuan[r[UNIT]] === "dus").map(r => r[QTY]).sort((a, b) => a - b);
    const jumboQty = ROWS.filter(r => r[AMT] >= JUMBO).map(r => r[QTY]);
    let buyersAug = 0, buyersSep = 0;
    for (const r of ROWS) {
      if (!buyers.has(r[CUST])) continue;
      const m = CAL.month[r[DAY]];
      if (m === 8) buyersAug += r[AMT];
      if (m === 9) buyersSep += r[AMT];
    }
    const byCust = new Map<number, number>();
    let all = 0;
    for (const r of ROWS) { byCust.set(r[CUST], (byCust.get(r[CUST]) ?? 0) + r[AMT]); all += r[AMT]; }
    const top10 = [...byCust.values()].sort((a, b) => b - a).slice(0, 10).reduce((s, v) => s + v, 0);
    return {
      months, jumboRows, buyers: buyers.size,
      jul: months.find(x => x.m === 7)!, aug: months.find(x => x.m === 8)!,
      medianDus: median(dus), p99Dus: dus[Math.floor(dus.length * 0.99)], jumboMin: Math.min(...jumboQty), jumboMax: Math.max(...jumboQty),
      buyersAug: jt(buyersAug), buyersSep: jt(buyersSep), top10Pct: (top10 / all) * 100,
    };
  }, []);
}

const W = 760, H = 330, TOP = 44, BOTTOM = 34;

function MonthlyChart({ s }: { s: ReturnType<typeof useStory> }) {
  const max = Math.max(...s.months.map(x => x.base + x.jumbo));
  const plot = H - TOP - BOTTOM;
  const y = (v: number) => TOP + plot - (v / max) * plot;
  const band = (W - 16) / s.months.length;
  const bw = band * 0.62;
  const cx = (i: number) => 8 + band * (i + 0.5);
  const julIdx = s.months.indexOf(s.jul);
  const [active, setActive] = useState<number | null>(null);
  const detail = (m: (typeof s.months)[number]) => `${m.label}: ${rp(m.base + m.jumbo)}${m.jumbo ? `, termasuk ${rp(m.jumbo)} dari 3 pesanan jumbo; tanpa itu ${rp(m.base)}` : ""}`;
  const cur = s.months.find(m => m.m === active);
  return (
    <figure className={chart.figure}>
    <p className={`${chart.readout} ${cur ? chart.readoutOn : ""}`} aria-live="polite">{cur ? detail(cur) : ""}</p>
    <svg viewBox={`0 0 ${W} ${H}`} role="group" className={styles.chart}
      aria-label={`Omzet per bulan dalam juta rupiah. Agustus ${int(s.aug.base + s.aug.jumbo)}, terdiri dari ${int(s.aug.base)} tanpa pesanan jumbo dan ${int(s.aug.jumbo)} dari pesanan jumbo.`}>
      <line x1={cx(julIdx) + bw / 2} x2={W - 8} y1={y(s.jul.base)} y2={y(s.jul.base)} className={styles.ref} />
      {s.months.map((m, i) => {
        const isAug = m === s.aug;
        const total = m.base + m.jumbo;
        return (
          <g key={m.m} className={active !== null && active !== m.m ? chart.dim : ""}>
            <rect x={cx(i) - bw / 2} y={y(m.base)} width={bw} height={y(0) - y(m.base)} className={styles.base} />
            {m.jumbo > 0 && <rect x={cx(i) - bw / 2} y={y(total)} width={bw} height={y(m.base) - y(total)} className={styles.jumbo} />}
            {m.jumbo > 0 && <text x={cx(i)} y={(y(total) + y(m.base)) / 2 + 5} textAnchor="middle" className={styles.inBar}>+{int(m.jumbo)}</text>}
            <text x={cx(i)} y={y(total) - 8} textAnchor="middle" className={isAug ? styles.valueStrong : styles.value}>{int(total)}</text>
            {isAug && <text x={cx(i)} y={y(m.base) + 20} textAnchor="middle" className={styles.inBarDark}>{int(m.base)}</text>}
            <text x={cx(i)} y={H - 10} textAnchor="middle" className={styles.axis}>{m.short}</text>
            <rect x={8 + band * i} y={TOP} width={band} height={H - TOP} className={chart.hit} tabIndex={0} aria-label={detail(m)}
              onPointerEnter={() => setActive(m.m)} onPointerDown={() => setActive(m.m)} onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(m.m)} onBlur={() => setActive(null)} />
          </g>
        );
      })}
      <text x={8} y={20} className={styles.note1}>Agustus tampak rekor, tetapi {int(s.aug.jumbo)} jt berasal dari 3 pesanan.</text>
      <text x={8} y={40} className={styles.note2}>Tanpa itu, Agustus ({int(s.aug.base)} jt) di bawah Juni dan Juli (garis putus-putus).</text>
    </svg>
    </figure>
  );
}

export function StoryPage() {
  const s = useStory();
  const [notes, setNotes] = useState(() => window.location.hash.includes("catatan"));
  const total = s.aug.base + s.aug.jumbo;
  const drop = (1 - s.aug.base / s.jul.base) * 100;
  const sep = s.months.find(x => x.m === 9)!;
  const sepDrop = (1 - (sep.base + sep.jumbo) / total) * 100; // September terlihat turun jika Agustus jadi patokan
  const sepUp = (sep.base / s.aug.base - 1) * 100; // tetapi tanpa pesanan jumbo justru naik
  const baseSince = s.months.filter(x => x.m >= 6).map(x => x.base);
  const sizes = [
    { key: "median", label: "Pesanan biasa (median)", v: s.medianDus, text: `${int(s.medianDus)} dus` },
    { key: "p99", label: "Hampir semua (99%) pesanan", v: s.p99Dus, text: `${int(s.p99Dus)} dus` },
    { key: "jumbo", label: `${s.jumboRows} pesanan jumbo`, v: s.jumboMax, text: `${int(s.jumboMin)} sampai ${int(s.jumboMax)} dus` },
  ];
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        {/* Konteks (Knaflic bab 1: siapa, apa, bagaimana). Satu audiens dulu: pemilik. */}
        <dl className={styles.context} aria-label="Audiens dan tujuan">
          <div><dt>Untuk</dt><dd><b>Pemilik distributor</b>, yang menentukan target penjualan bulanan</dd></div>
          <div><dt>Tujuan</dt><dd>Menunjukkan bahwa rekor Agustus tidak bisa dijadikan patokan</dd></div>
          <div><dt>Keputusan yang diminta</dt><dd>Setujui target berbasis omzet tanpa pesanan jumbo: <b>Rp{int(Math.min(...baseSince))} sampai {int(Math.max(...baseSince))} jt per bulan</b></dd></div>
        </dl>
        <p className={styles.eyebrow}>Penjualan frozen food, April sampai September 2020</p>
        <h1 className={styles.title}>Rekor omzet Agustus datang dari {s.jumboRows} pesanan jumbo; tanpa itu, omzet turun {one(drop)}% dari Juli</h1>
        <p className={styles.subtitle}>Usulan: patok target bulanan pada omzet tanpa pesanan jumbo, dan jaga pelanggan reguler agar tidak bergantung pada pesanan sekali besar.</p>
      </header>

      <div className={styles.row}>
        <section className={styles.card} aria-label="Omzet per bulan">
          <h2 className={styles.h2}>Omzet per bulan, juta rupiah</h2>
          <MonthlyChart s={s} />
        </section>
        <aside className={styles.facts} aria-label="Angka kunci">
          <div className={styles.fact}><strong>{pct((s.aug.jumbo / total) * 100)}</strong><span>omzet Agustus berasal dari {s.jumboRows} pesanan milik {s.buyers} pembeli</span></div>
          <div className={styles.fact}><strong>{int(s.jumboMax / s.medianDus)}×</strong><span>pesanan terbesar ({int(s.jumboMax)} dus) dibanding pesanan biasa ({int(s.medianDus)} dus)</span></div>
          <div className={styles.fact}><strong>−{one(drop)}%</strong><span>omzet Agustus tanpa pesanan itu dibanding Juli</span></div>
        </aside>
      </div>

      <div className={styles.row2}>
        <section className={styles.card} aria-label="Ukuran pesanan">
          <h2 className={styles.h2}>Seberapa jumbo pesanan itu? Jumlah dus per pesanan</h2>
          <HBars label="Jumlah dus per pesanan" items={sizes.map(x => ({
            key: x.key, label: x.label, value: x.v, text: x.text, hi: x.key === "jumbo",
            detail: x.key === "jumbo" ? `${s.jumboRows} pesanan jumbo dari ${s.buyers} pembeli: ${x.text}, semuanya di Agustus` : `${x.label}: ${x.text}`,
          }))} />
        </section>
        <section className={styles.card} aria-label="Usulan">
          <h2 className={styles.h2}>Yang kami usulkan</h2>
          <p className={styles.stake}>Jika Rp{int(total)} jt dijadikan patokan, September (Rp{int(sep.base + sep.jumbo)} jt) tampak turun {one(sepDrop)}%, padahal tanpa pesanan jumbo omzetnya naik {one(sepUp)}%.</p>
          <ol className={styles.actions}>
            <li><b>Ganti patokan target.</b> Pakai omzet tanpa pesanan jumbo: Rp{int(Math.min(...baseSince))} sampai {int(Math.max(...baseSince))} jt per bulan sejak Juni, bukan Rp{int(total)} jt.</li>
            <li><b>Jaga pembeli besar.</b> Kedua pembeli jumbo itu membeli {rp(s.buyersAug)} di Agustus, tetapi hanya {rp(s.buyersSep)} di September.</li>
            <li><b>Perluas basis pembeli.</b> 10 pembeli teratas masih menguasai {pct(s.top10Pct)} omzet.</li>
          </ol>
        </section>
      </div>

      <section className={styles.detail} aria-labelledby="detail-title">
        <div className={styles.detailHead}>
          <div>
            <h2 id="detail-title" className={styles.detailTitle}>Detail pendukung</h2>
            <p className={styles.detailSub}>Grafik lain dari data yang sama, sudah diperbaiki mengikuti storytelling with data.</p>
          </div>
          <SegmentedControl label="Catatan revisi" options={[{ value: "off", label: "Tanpa catatan revisi" }, { value: "on", label: "Dengan catatan revisi" }]}
            value={notes ? "on" : "off"} onValueChange={v => setNotes(v === "on")} />
        </div>
        <RevisedSections notes={notes} />
      </section>

      <footer className={styles.foot}>
        Sumber: {int(ROWS.length)} transaksi berbayar, April sampai September 2020. Pesanan jumbo = satu baris bernilai minimal Rp40 jt. Data tidak menjelaskan alasan pembeli memesan sebesar itu.
        <a href="#/sebelum" className={styles.back}>Versi 1: dashboard umum</a>
      </footer>
    </main>
  );
}
