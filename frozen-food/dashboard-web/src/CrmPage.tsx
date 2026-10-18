import { analyze, BULAN, calendar, firstMonths, type Dict, type Row } from "./analytics";
import { HBars } from "./components/charts/charts";
import raw from "./data.json";
import { int, pct, rp } from "./format";
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

      <footer className={styles.foot}>
        Sumber: {int(ROWS.length)} transaksi berbayar dari {int(all.length)} pelanggan, April sampai September 2020. Lama tidak belanja dihitung dari transaksi terakhir tiap pelanggan sampai {dateFmt.format(dateOf(END))} 2020.
        <a href="#/sebelum" className={styles.back}>Versi 1: dashboard umum</a>
      </footer>
    </main>
  );
}
