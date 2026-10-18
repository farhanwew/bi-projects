import { analyze, BULAN, calendar, firstMonths, type Dict, type Row } from "./analytics";
import type { ReactNode } from "react";
import { HBars, VBars } from "./components/charts/charts";
import raw from "./data.json";
import { int, one, pct, rp } from "./format";
import rev from "./RevisedPage.module.css";
import styles from "./StoryPage.module.css";

/**
 * Versi 2 untuk audiens kedua: Head of Marketing / CRM Manager. Templatnya sama dengan dashboard pemilik
 * (konteks, judul kesimpulan, grafik utama + angka besar, grafik pendukung, usulan), ceritanya berbeda:
 * pelanggan yang mulai menjauh, pelanggan baru yang tidak kembali, dan peluang paket produk.
 * Recency dihitung terhadap hari terakhir data (30 September 2020), bukan hari ini. Semua angka dihitung dari data.
 */
const DICT = raw as unknown as Dict;
const ROWS = raw.rows as unknown as Row[];
const CAL = calendar(DICT.base, DICT.hari);
const FIRST = firstMonths(ROWS, CAL);
const A = analyze(ROWS, DICT, CAL, { from: 0, to: DICT.hari, months: [] }, FIRST);
const [DAY, CUST, PROD, , , , , AMT] = [0, 1, 2, 3, 4, 5, 6, 7];
const END = Math.max(...ROWS.map(r => r[DAY]));
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const dateOf = (day: number) => new Date(Date.parse(`${DICT.base}T00:00:00Z`) + day * 864e5);

// --- per pelanggan: total belanja, transaksi, hari terakhir belanja, jenis produk, bulan aktif
type Cust = { id: number; omzet: number; tx: number; last: number; prods: Set<number>; months: Set<number> };
const custs = new Map<number, Cust>();
for (const r of ROWS) {
  const c = custs.get(r[CUST]) ?? { id: r[CUST], omzet: 0, tx: 0, last: 0, prods: new Set<number>(), months: new Set<number>() };
  c.omzet += r[AMT] / 1e6; c.tx++; c.last = Math.max(c.last, r[DAY]); c.prods.add(r[PROD]); c.months.add(CAL.month[r[DAY]]);
  custs.set(r[CUST], c);
}
const all = [...custs.values()];
const recency = (c: Cust) => END - c.last;

// --- kelompok menurut lama tidak belanja; 31 sampai 90 hari = berisiko
const BUCKETS = [
  { key: "aktif", label: "Belanja 30 hari terakhir", lo: 0, hi: 30, risk: false },
  { key: "r60", label: "31 sampai 60 hari tidak belanja", lo: 31, hi: 60, risk: true },
  { key: "r90", label: "61 sampai 90 hari tidak belanja", lo: 61, hi: 90, risk: true },
  { key: "hilang", label: "Lebih dari 90 hari tidak belanja", lo: 91, hi: Infinity, risk: false },
];
const buckets = BUCKETS.map(b => {
  const list = all.filter(c => recency(c) >= b.lo && recency(c) <= b.hi);
  return { ...b, n: list.length, omzet: list.reduce((s, c) => s + c.omzet, 0) };
});
const atRisk = all.filter(c => recency(c) >= 31 && recency(c) <= 90).sort((a, b) => b.omzet - a.omzet);
const atRiskOmzet = atRisk.reduce((s, c) => s + c.omzet, 0);
const lost = buckets[3];

// --- pelanggan baru: berapa yang kembali di bulan berikutnya (April tidak dihitung: bulan pertama data)
const cohorts = [5, 6, 7, 8].map(m => {
  const fresh = all.filter(c => FIRST.get(c.id) === m);
  const back = fresh.filter(c => c.months.has(m + 1)).length;
  return { m, n: fresh.length, back, pct: fresh.length ? (back / fresh.length) * 100 : 0 };
});
const newTotal = cohorts.reduce((s, c) => s + c.n, 0);
const newBack = cohorts.reduce((s, c) => s + c.back, 0);

// --- paket produk untuk pelanggan aktif yang baru membeli sedikit jenis
const smallActive = all.filter(c => c.prods.size <= 5 && recency(c) <= 30).length;
const pair = A.pasangan.top.filter(p => p.bedaMerek).reduce((a, b) => (b.lift > a.lift ? b : a));
const short = (name: string) => name.split(" ").slice(0, 2).join(" ");

// ===== Detail analisis pelanggan =====
type CustX = Cust & { days: number[]; first: number };
const daysOf = new Map<number, Set<number>>();
for (const r of ROWS) (daysOf.get(r[CUST]) ?? daysOf.set(r[CUST], new Set()).get(r[CUST])!).add(r[DAY]);
const cx: CustX[] = all.map(c => { const ds = [...daysOf.get(c.id)!].sort((a, b) => a - b); return { ...c, days: ds, first: ds[0] }; });
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

// 1. arus pelanggan per bulan: bertahan (belanja bulan lalu juga), kembali (pernah, tapi tidak bulan lalu), baru, berhenti
const activeIn = (m: number) => new Set(all.filter(c => c.months.has(m)).map(c => c.id));
const flow = [5, 6, 7, 8, 9].map(m => {
  const cur = activeIn(m), prev = activeIn(m - 1);
  let kept = 0, back = 0, fresh = 0;
  for (const id of cur) { if (prev.has(id)) kept++; else if (FIRST.get(id) === m) fresh++; else back++; }
  const stop = [...prev].filter(id => !cur.has(id)).length;
  return { m, active: cur.size, kept, back, fresh, stop };
});
const worstStop = flow.reduce((a, b) => (b.stop > a.stop ? b : a));

// 2. segmen dari lama tidak belanja (R) dan banyaknya hari belanja (F)
const SEGS = [
  { key: "juara", label: "Juara", note: "aktif, belanja 20 hari atau lebih" },
  { key: "setia", label: "Setia", note: "aktif, belanja 6 sampai 19 hari" },
  { key: "pupuk", label: "Perlu dipupuk", note: "aktif, baru belanja 1 sampai 5 hari" },
  { key: "baru", label: "Baru", note: "pertama belanja dalam 30 hari terakhir" },
  { key: "berisiko", label: "Berisiko", note: "dulu rutin (6 hari atau lebih), 31 sampai 90 hari tidak belanja" },
  { key: "menjauh", label: "Mulai menjauh", note: "jarang belanja, 31 sampai 90 hari tidak belanja" },
  { key: "hilang", label: "Hilang", note: "lebih dari 90 hari tidak belanja" },
] as const;
const segOf = (c: CustX): (typeof SEGS)[number]["key"] => {
  const r = END - c.last, f = c.days.length;
  if (r > 90) return "hilang";
  if (r > 30) return f >= 6 ? "berisiko" : "menjauh";
  if (END - c.first <= 30) return "baru";
  return f >= 20 ? "juara" : f >= 6 ? "setia" : "pupuk";
};
const segs = SEGS.map(sg => {
  const list = cx.filter(c => segOf(c) === sg.key);
  const omzet = list.reduce((t, c) => t + c.omzet, 0);
  return { ...sg, n: list.length, omzet, share: (omzet / A.totalJt) * 100 };
});
const core = segs.filter(x => x.key === "juara" || x.key === "setia");
const coreN = core.reduce((t, x) => t + x.n, 0), coreShare = core.reduce((t, x) => t + x.share, 0);

// 3. pelanggan rutin (minimal 5 hari belanja) yang terlambat: lama tidak belanja > 2 kali jeda biasanya (dan > 14 hari)
const late = cx.filter(c => c.days.length >= 5).map(c => {
  const gaps = c.days.slice(1).map((d, i) => d - c.days[i]);
  return { ...c, gap: median(gaps), rec: END - c.last };
}).filter(c => c.rec > Math.max(2 * c.gap, 14)).sort((a, b) => b.omzet - a.omzet);
const lateOmzet = late.reduce((t, c) => t + c.omzet, 0);
const lateMax = late.reduce((a, b) => (b.rec / b.gap > a.rec / a.gap ? b : a));

// 4. frekuensi belanja: banyaknya hari belanja
const FREQ = [["1 hari", 1, 1], ["2 sampai 5 hari", 2, 5], ["6 sampai 20 hari", 6, 20], ["21 sampai 50 hari", 21, 50], ["lebih dari 50 hari", 51, Infinity]] as const;
const freq = FREQ.map(([label, lo, hi]) => {
  const list = cx.filter(c => c.days.length >= lo && c.days.length <= hi);
  const omzet = list.reduce((t, c) => t + c.omzet, 0);
  return { label, lo, n: list.length, share: (omzet / A.totalJt) * 100 };
});
const often = freq.filter(f => f.lo >= 6);
const oftenN = often.reduce((t, f) => t + f.n, 0), oftenShare = often.reduce((t, f) => t + f.share, 0);

// 5. konsentrasi
const sortedOmzet = all.map(c => c.omzet).sort((a, b) => a - b);
const bottomHalf = sortedOmzet.slice(0, Math.floor(sortedOmzet.length / 2)).reduce((t, v) => t + v, 0);

function Card({ title, sub, wide, center, children }: { title: string; sub: string; wide?: boolean; center?: boolean; children: ReactNode }) {
  return (
    <section className={`${rev.card} ${wide ? rev.wide : ""}`}>
      <h3 className={rev.title}>{title}</h3>
      <p className={rev.sub}>{sub}</p>
      <div className={`${rev.chart} ${center ? rev.center : ""}`}>{children}</div>
    </section>
  );
}

export function CrmPage() {
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <dl className={styles.context} aria-label="Audiens dan tujuan">
          <div><dt>Untuk</dt><dd><b>Head of Marketing / CRM Manager</b>, yang mengatur program retensi dan promosi pelanggan</dd></div>
          <div><dt>Tujuan</dt><dd>Menunjukkan pelanggan yang mulai menjauh sebelum mereka hilang</dd></div>
          <div><dt>Keputusan yang diminta</dt><dd>Setujui kampanye <b>win-back untuk {atRisk.length} pelanggan berisiko</b> dan program tindak lanjut pelanggan baru</dd></div>
        </dl>
        <p className={styles.eyebrow}>Pelanggan frozen food, April sampai September 2020 · posisi per {dateFmt.format(dateOf(END))} 2020</p>
        <h1 className={styles.title}>{atRisk.length} pelanggan senilai {rp(atRiskOmzet)} sudah 1 sampai 3 bulan tidak belanja</h1>
        <p className={styles.subtitle}>Usulan: hubungi mereka sekarang, sebelum menyusul {lost.n} pelanggan yang sudah lebih dari 3 bulan tidak kembali, dan perkuat tindak lanjut pelanggan baru.</p>
      </header>

      <div className={styles.row}>
        <section className={styles.card} aria-label="Pelanggan menurut lama tidak belanja">
          <h2 className={styles.h2}>Jumlah pelanggan menurut lama tidak belanja (dihitung dari {dateFmt.format(dateOf(END))})</h2>
          <HBars label="Pelanggan menurut lama tidak belanja" items={buckets.map(b => ({
            key: b.key, label: b.label, value: b.n, text: `${int(b.n)} pelanggan`, note: `total belanja ${rp(b.omzet)}`, hi: b.risk,
            detail: `${b.label}: ${int(b.n)} pelanggan, total belanja April sampai September ${rp(b.omzet)} (${pct((b.omzet / A.totalJt) * 100)} omzet)`,
          }))} />
        </section>
        <aside className={styles.facts} aria-label="Angka kunci">
          <div className={styles.fact}><strong>{int(atRisk.length)}</strong><span>pelanggan berisiko: terakhir belanja 31 sampai 90 hari lalu</span></div>
          <div className={styles.fact}><strong>{pct((atRiskOmzet / A.totalJt) * 100)}</strong><span>omzet periode ini berasal dari mereka ({rp(atRiskOmzet)})</span></div>
          <div className={styles.fact}><strong>{pct((newBack / newTotal) * 100)}</strong><span>pelanggan baru yang belanja lagi di bulan berikutnya ({newBack} dari {newTotal})</span></div>
        </aside>
      </div>

      <div className={styles.row2}>
        <section className={styles.card} aria-label="Pelanggan berisiko terbesar">
          <h2 className={styles.h2}>Mulai dari sini: 8 pelanggan berisiko dengan belanja terbesar (juta rupiah)</h2>
          <HBars label="Pelanggan berisiko terbesar" items={atRisk.slice(0, 8).map((c, i) => ({
            key: `c${c.id}`, label: DICT.pelanggan[c.id], value: c.omzet, text: `${int(c.omzet)} jt`, hi: i === 0,
            note: `terakhir ${dateFmt.format(dateOf(c.last))}, ${int(c.tx)} transaksi`,
            detail: `${DICT.pelanggan[c.id]}: ${rp(c.omzet)} dari ${int(c.tx)} transaksi, terakhir belanja ${dateFmt.format(dateOf(c.last))} (${recency(c)} hari lalu)`,
          }))} />
        </section>
        <section className={styles.card} aria-label="Pelanggan baru yang kembali">
          <h2 className={styles.h2}>Pelanggan baru yang belanja lagi di bulan berikutnya</h2>
          <HBars label="Pelanggan baru yang kembali" max={100} reference={50} caption="Garis putus-putus = 50%." items={cohorts.map(c => ({
            key: `k${c.m}`, label: `Baru di ${BULAN[c.m]}`, value: c.pct, text: pct(c.pct), note: `${c.back} dari ${c.n} pelanggan`, hi: c.pct < 50,
            detail: `${c.n} pelanggan pertama kali belanja di ${BULAN[c.m]}; ${c.back} di antaranya belanja lagi di ${BULAN[c.m + 1]}`,
          }))} />
        </section>
      </div>

      <section className={styles.card} aria-label="Usulan">
        <h2 className={styles.h2}>Yang kami usulkan</h2>
        <p className={styles.stake}>Tanpa tindakan, pelanggan berisiko bisa bernasib seperti {lost.n} pelanggan yang sudah lebih dari 90 hari tidak belanja; belanja mereka selama periode ini {rp(lost.omzet)}.</p>
        <ol className={styles.actions}>
          <li><b>Kampanye win-back.</b> Hubungi {atRisk.length} pelanggan berisiko, mulai dari 8 terbesar di atas, dengan penawaran khusus untuk pesanan berikutnya.</li>
          <li><b>Tindak lanjut pelanggan baru.</b> Hanya {pct((newBack / newTotal) * 100)} pelanggan baru belanja lagi di bulan berikutnya; hubungi mereka dalam 30 hari pertama.</li>
          <li><b>Paket produk.</b> Tawarkan paket {short(pair.a)} + {short(pair.b)} (dibeli bersama {pair.lift.toLocaleString("id-ID")} kali lebih sering dari kebetulan) ke {smallActive} pelanggan aktif yang baru membeli 1 sampai 5 jenis produk.</li>
        </ol>
      </section>

      <section className={styles.detail} aria-labelledby="crm-detail">
        <div className={styles.detailHead}>
          <div>
            <h2 id="crm-detail" className={styles.detailTitle}>Detail analisis pelanggan</h2>
            <p className={styles.detailSub}>Dari data yang sama: arus pelanggan, segmen, pelanggan yang terlambat dari kebiasaannya, dan seberapa terpusat omzetnya.</p>
          </div>
        </div>
        <div className={rev.grid}>
          <Card wide title={`${BULAN[worstStop.m]}: ${worstStop.stop} pelanggan berhenti belanja, terbanyak selama periode; hanya ${flow.find(f => f.m === worstStop.m)!.fresh} pelanggan baru`}
            sub="Atas: pelanggan aktif tiap bulan (abu-abu = sudah pernah belanja, biru = baru). Bawah: pelanggan yang belanja bulan sebelumnya tetapi tidak bulan itu.">
            <div className={rev.stack}>
              <p className={rev.panel}><b>Pelanggan aktif per bulan</b> · <span className={rev.key}><i className={rev.keyHi} /> pelanggan baru</span></p>
              <VBars label="Pelanggan aktif per bulan" W={1100} height={200} items={flow.map(f => ({
                key: `a${f.m}`, label: BULAN[f.m].slice(0, 3), value: f.kept + f.back, text: int(f.active), hi: f.m === worstStop.m,
                top: { value: f.fresh, text: int(f.fresh) },
                detail: `${BULAN[f.m]}: ${f.active} pelanggan aktif; ${f.kept} bertahan dari bulan lalu, ${f.back} kembali setelah absen, ${f.fresh} baru`,
              }))} />
              <p className={rev.panel}><b>Pelanggan yang berhenti</b> · belanja bulan sebelumnya, tidak bulan itu</p>
              <VBars label="Pelanggan yang berhenti per bulan" W={1100} height={150} items={flow.map(f => ({
                key: `s${f.m}`, label: BULAN[f.m].slice(0, 3), value: f.stop, text: int(f.stop), hi: f.m === worstStop.m,
                detail: `${BULAN[f.m]}: ${f.stop} pelanggan yang belanja di ${BULAN[f.m - 1]} tidak belanja lagi`,
              }))} />
            </div>
          </Card>

          <Card wide title={`${coreN} pelanggan Juara dan Setia menghasilkan ${pct(coreShare)} omzet; ${segs.filter(x => x.key === "berisiko" || x.key === "menjauh").reduce((t, x) => t + x.n, 0)} pelanggan lainnya mulai menjauh`}
            sub="Segmen dari lama tidak belanja dan banyaknya hari belanja. Bar = porsi omzet April sampai September.">
            <HBars label="Segmen pelanggan" items={segs.map(x => ({
              key: x.key, label: x.label, value: x.share, text: `${pct(x.share)} omzet`, note: `${int(x.n)} pelanggan · ${x.note}`,
              hi: x.key === "berisiko" || x.key === "menjauh",
              detail: `${x.label}: ${int(x.n)} pelanggan, total belanja ${rp(x.omzet)} (${pct(x.share)} omzet). ${x.note}.`,
            }))} />
          </Card>

          <Card wide title={`${late.length} pelanggan rutin terlambat dari kebiasaannya; total belanja mereka ${rp(lateOmzet)}`}
            sub="Pelanggan dengan minimal 5 hari belanja yang sudah tidak belanja lebih dari dua kali jeda biasanya. Ini daftar yang lebih tajam daripada sekadar '30 hari tidak belanja'.">
            <HBars label="Pelanggan rutin yang terlambat" items={late.slice(0, 8).map(c => ({
              key: `l${c.id}`, label: DICT.pelanggan[c.id], value: c.omzet, text: `${int(c.omzet)} jt`, hi: c === lateMax,
              note: `biasanya tiap ${int(c.gap)} hari, kini ${c.rec} hari tidak belanja`,
              detail: `${DICT.pelanggan[c.id]}: biasanya belanja tiap ${int(c.gap)} hari, sudah ${c.rec} hari tidak belanja (${one(c.rec / c.gap)} kali jeda biasanya); total belanja ${rp(c.omzet)}`,
            }))} />
          </Card>

          <Card title={`${oftenN} pelanggan yang belanja 6 hari atau lebih menghasilkan ${pct(oftenShare)} omzet`}
            sub="Pelanggan menurut banyaknya hari belanja selama April sampai September. Bar = porsi omzet.">
            <HBars label="Frekuensi belanja" items={freq.map(f => ({
              key: f.label, label: f.label, value: f.share, text: pct(f.share), note: `${int(f.n)} pelanggan`, hi: f.lo >= 6,
              detail: `Belanja ${f.label}: ${int(f.n)} pelanggan, ${pct(f.share)} omzet`,
            }))} />
          </Card>

          <Card center title="Omzet sangat terpusat pada sedikit pelanggan" sub="Porsi omzet April sampai September.">
            <div className={rev.bigRow}>
              <div className={rev.bigHi}><strong>{pct(A.pareto.top10Pct)}</strong><span>dari 10 pelanggan teratas</span></div>
              <div className={rev.big}><strong>{A.pareto.pelanggan80}</strong><span>pelanggan sudah menghasilkan 80%</span></div>
              <div className={rev.big}><strong>{pct((bottomHalf / A.totalJt) * 100)}</strong><span>dari separuh pelanggan terbawah ({Math.floor(sortedOmzet.length / 2)})</span></div>
            </div>
            <p className={rev.bigNote}>Kehilangan satu pelanggan besar terasa jauh lebih berat daripada kehilangan puluhan pelanggan kecil, jadi retensi sebaiknya dimulai dari pelanggan bernilai tinggi.</p>
          </Card>
        </div>
      </section>

      <footer className={styles.foot}>
        Sumber: {int(ROWS.length)} transaksi berbayar dari {int(all.length)} pelanggan, April sampai September 2020. Lama tidak belanja dihitung dari transaksi terakhir tiap pelanggan sampai {dateFmt.format(dateOf(END))} 2020.
        <a href="#/sebelum" className={styles.back}>Versi 1: dashboard umum</a>
      </footer>
    </main>
  );
}
