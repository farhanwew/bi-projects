import type { ReactNode } from "react";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { BrushChart } from "@/components/arc/brush-chart/brush-chart";
import { SlopeChart } from "@/components/arc/slope-chart/slope-chart";
import { analyze, BULAN, calendar, firstMonths, type Dict, type Row } from "./analytics";
import { FloorLine, HBars, VBars, Waterfall } from "./components/charts/charts";
import raw from "./data.json";
import { int, one, pct, rp } from "./format";
import styles from "./RevisedPage.module.css";

/**
 * Versi 2, halaman "grafik yang direvisi": tiap grafik versi 1 dibuat ulang mengikuti Knaflic (judul berupa kesimpulan,
 * satu sorotan, label langsung, tanpa gridline). Tiap kartu menyebut bentuk sebelumnya dan alasan perubahannya.
 * Seluruh periode, tanpa filter: halaman ini untuk presentasi. Semua angka dihitung dari data.
 */
const DICT = raw as unknown as Dict;
const ROWS = raw.rows as unknown as Row[];
const CAL = calendar(DICT.base, DICT.hari);
const A = analyze(ROWS, DICT, CAL, { from: 0, to: DICT.hari, months: [] }, firstMonths(ROWS, CAL));
const [DAY, CUST, PROD, MEREK, QTY, UNIT, , AMT] = [0, 1, 2, 3, 4, 5, 6, 7];
const JUMBO = 40_000_000;
const WD = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const WD_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const longDate = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

// --- angka turunan
const month = (m: number) => A.months.find(x => x.month === m)!;
const jumboByMonth = new Map<number, number>();
const jumboQty: number[] = [];
const jumboBuyers = new Set<number>();
for (const r of ROWS) if (r[AMT] >= JUMBO) {
  const m = CAL.month[r[DAY]];
  jumboByMonth.set(m, (jumboByMonth.get(m) ?? 0) + r[AMT] / 1e6);
  jumboQty.push(r[QTY]); jumboBuyers.add(r[CUST]);
}
const jul = month(7), aug = month(8), sep = month(9);
const augJumbo = jumboByMonth.get(8) ?? 0;
const augBase = aug.omzetJt - augJumbo;
const dus = ROWS.filter(r => DICT.satuan[r[UNIT]] === "dus").map(r => r[QTY]).sort((a, b) => a - b);
const p99 = dus[Math.floor(dus.length * 0.99)];

// hari dalam seminggu: rata-rata per hari buka (jumlah hari buka tiap hari berbeda karena libur)
const wd = Array.from({ length: 7 }, () => ({ omzet: 0, baris: 0, days: 0 }));
for (const d of A.daily) {
  if (!d.baris) continue;
  const w = new Date(`${d.key}T00:00:00Z`).getUTCDay();
  wd[w].omzet += d.harian; wd[w].baris += d.baris; wd[w].days++;
}
const week = [1, 2, 3, 4, 5, 6].map(w => ({ w, avg: wd[w].omzet / wd[w].days, tx: wd[w].baris / wd[w].days }));
const wMax = week.reduce((a, b) => (b.avg > a.avg ? b : a));
const wMin = week.reduce((a, b) => (b.avg < a.avg ? b : a));
/** Nilai rata-rata satu transaksi (juta rupiah) per hari dalam seminggu. */
const perTxDay = (x: typeof week[number]) => x.avg / x.tx;
const wVal = week.reduce((a, b) => (perTxDay(b) < perTxDay(a) ? b : a));

// bagian bulan: rata-rata per hari kalender (bagian akhir mencakup 63 hari, dua lainnya 60)
const phaseDays = [0, 0, 0];
for (let d = 0; d <= DICT.hari; d++) phaseDays[CAL.dom[d] <= 10 ? 0 : CAL.dom[d] <= 20 ? 1 : 2]++;
const phase = A.fase.map((f, i) => ({ label: ["tanggal 1-10", "tanggal 11-20", "tanggal 21-31"][i], perDay: f.value / phaseDays[i], days: phaseDays[i] }));

// tren harian: hanya hari buka; anotasi di hari-hari puncak beserta produk terbesarnya
const daily = A.daily.filter(d => d.baris > 0).map(d => ({ date: Date.parse(`${d.key}T00:00:00Z`), value: d.harian, key: d.key }));
const topDay = (key: string) => {
  const day = Math.round((Date.parse(`${key}T00:00:00Z`) - Date.parse(`${DICT.base}T00:00:00Z`)) / 864e5);
  const by = new Map<number, number>();
  for (const r of ROWS) if (r[DAY] === day) by.set(r[PROD], (by.get(r[PROD]) ?? 0) + r[AMT]);
  const [p, v] = [...by.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
  return `${DICT.produk[p]}: ${rp(v / 1e6)}`;
};
const peaks = [...daily].sort((a, b) => b.value - a.value).slice(0, 3);
const medianDay = [...daily].sort((a, b) => a.value - b.value)[daily.length >> 1].value;

// produk: merek per baris, untuk menandai pasangan lintas merek
const prodBrand = new Map<number, number>();
for (const r of ROWS) prodBrand.set(r[PROD], r[MEREK]);

const kohortJul = A.kohort.find(k => k.month === 7)!, kohortAug = A.kohort.find(k => k.month === 8)!;
const minTx = Math.min(...A.topCust.map(c => c.baris));
const bergantung50 = A.bergantung.filter(x => x.pct >= 50);
const ragamTop = A.ragam[A.ragam.length - 1], ragamPrev = A.ragam[A.ragam.length - 2];
const pairs = A.pasangan.top.slice(0, 6);
const pairHi = pairs.filter(p => p.bedaMerek).reduce((a, b) => (b.lift > a.lift ? b : a));

function Card({ n, before, title, sub, why, wide, center, children }: { n: number; before: string; title: string; sub: string; why: ReactNode; wide?: boolean; center?: boolean; children: ReactNode }) {
  return (
    <section className={`${styles.card} ${wide ? styles.wide : ""}`} aria-labelledby={`r${n}`}>
      <p className={styles.before}>Revisi {n} · sebelumnya: {before}</p>
      <h2 id={`r${n}`} className={styles.title}>{title}</h2>
      <p className={styles.sub}>{sub}</p>
      <div className={`${styles.chart} ${center ? styles.center : ""}`}>{children}</div>
      <p className={styles.why}><b>Kenapa diubah:</b> {why}</p>
    </section>
  );
}

export function RevisedPage() {
  const total = A.totalJt;
  const sepChange = (sep.omzetJt / aug.omzetJt - 1) * 100;
  const txDrop = (aug.baris / jul.baris - 1) * 100;
  const perTx = (m: typeof jul) => (m.omzetJt * 1e3) / m.baris;
  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <h1 className={styles.h1}>Lampiran: perbaikan tiap grafik</h1>
        <p className={styles.lead}>Setiap grafik di dashboard versi 1 dibuat ulang mengikuti prinsip storytelling with data: judul berupa kesimpulan, satu warna sorot, label langsung, dan tanpa gridline atau legenda. Di tiap kartu tertulis bentuk sebelumnya dan alasan perubahannya. Periode April sampai September 2020, {int(A.n)} transaksi berbayar.</p>
      </header>

      <section className={styles.kpis} aria-label="Angka utama">
        <div className={styles.kpi}><span>Total omzet</span><AnimatedCounter value={total / 1000} decimals={2} suffix={" miliar"} locale="id-ID" /><small>{int(A.n)} transaksi berbayar; 58 baris Rp0 (sampel, bonus) tidak dihitung</small></div>
        <div className={styles.kpi}><span>Bulan tertinggi</span><AnimatedCounter value={aug.omzetJt} decimals={1} suffix={" jt"} locale="id-ID" /><small>Agustus, {pct((augJumbo / aug.omzetJt) * 100)} dari 3 pesanan jumbo</small></div>
        <div className={styles.kpi}><span>Agustus ke September</span><strong className={styles.kpiBig}>{sepChange < 0 ? "−" : "+"}{one(Math.abs(sepChange))}%</strong><small>Pembanding bulan terakhir, bukan April (bulan terendah)</small></div>
        <div className={styles.kpi}><span>Pelanggan</span><AnimatedCounter value={A.customers} locale="id-ID" /><small>{A.pareto.pelanggan80} pelanggan menghasilkan 80% omzet</small></div>
      </section>
      <p className={styles.kpiWhy}><b>Revisi 0 · kenapa diubah:</b> lencana "+22,6%" di versi 1 membandingkan September dengan April, bulan terendah, sehingga kenaikan tampak besar padahal September turun dari Agustus. Versi 1 juga menulis 6.720 transaksi di KPI dan 6.778 di footer tanpa penjelasan. Angka yang tidak konsisten membuat audiens meragukan angka lain.</p>

      <div className={styles.grid}>
        <Card n={1} wide before="tabel 7 kolom 'Mengapa penjualan melonjak di Agustus?'"
          title={`Kenaikan Juli ke Agustus seluruhnya dari 3 pesanan jumbo; omzet lainnya turun ${rp(jul.omzetJt - augBase)}`}
          sub="Omzet dalam juta rupiah. Pesanan jumbo = satu baris bernilai minimal Rp40 jt."
          why="tabel jarang efektif untuk presentasi langsung karena audiens harus membaca baris demi baris. Waterfall menunjukkan perubahan bertahap dari nilai awal ke nilai akhir, sehingga jawaban 'kenaikan datang dari mana' terlihat sekali pandang.">
          <Waterfall label="Waterfall omzet Juli ke Agustus" W={1100} height={280} steps={[
            { key: "jul", label: "Juli", value: jul.omzetJt, text: int(jul.omzetJt), kind: "total", detail: `Juli: omzet ${rp(jul.omzetJt)} dari ${int(jul.baris)} transaksi` },
            { key: "lain", label: "Pelanggan lain", value: augBase - jul.omzetJt, text: `−${int(jul.omzetJt - augBase)}`, kind: "delta", detail: `Semua penjualan selain 3 pesanan jumbo: ${rp(augBase)} di Agustus, turun ${rp(jul.omzetJt - augBase)} dari Juli` },
            { key: "jumbo", label: "3 pesanan jumbo", value: augJumbo, text: `+${int(augJumbo)}`, kind: "delta", hi: true, detail: `3 pesanan jumbo (${jumboQty.map(q => int(q)).join(", ")} dus) dari ${jumboBuyers.size} pembeli: +${rp(augJumbo)}` },
            { key: "aug", label: "Agustus", value: aug.omzetJt, text: int(aug.omzetJt), kind: "total", detail: `Agustus: ${rp(aug.omzetJt)}, ${pct((augJumbo / aug.omzetJt) * 100)} dari pesanan jumbo` },
          ]} />
        </Card>

        <Card n={2} wide before="tiga kartu terpisah: omzet, transaksi, dan tombol 'per hari'"
          title={`Agustus: omzet naik ${pct((aug.omzetJt / jul.omzetJt - 1) * 100)}, tetapi jumlah transaksi turun ${pct(Math.abs(txDrop))}`}
          sub={`Atas: omzet per bulan (juta rupiah), bagian biru = pesanan jumbo. Bawah: jumlah transaksi per bulan. Nilai rata-rata per transaksi naik dari Rp${int(perTx(jul))} rb ke Rp${int(perTx(aug))} rb.`}
          why="omzet dan transaksi bercerita bersama, tetapi di versi 1 audiens harus mencocokkan sendiri dua kartu dengan skala berbeda. Dua sumbu Y dalam satu grafik membingungkan, jadi keduanya disusun atas-bawah dengan bulan yang sejajar. Tombol 'per hari' dihapus karena mengulang grafik tren harian.">
          <div className={styles.stack}>
            <VBars label="Omzet per bulan" W={1100} height={220} items={A.months.map(m => {
              const j = jumboByMonth.get(m.month) ?? 0;
              return { key: `o${m.month}`, label: m.short, value: m.omzetJt - j, text: int(m.omzetJt), hi: m.month === 8, top: j ? { value: j, text: `+${int(j)}` } : undefined,
                detail: `${m.label}: ${rp(m.omzetJt)} dari ${int(m.baris)} transaksi${j ? `, termasuk ${rp(j)} dari pesanan jumbo` : ""}` };
            })} />
            <VBars label="Transaksi per bulan" W={1100} height={170} items={A.months.map(m => ({ key: `t${m.month}`, label: m.short, value: m.baris, text: int(m.baris), hi: m.month === 8, detail: `${m.label}: ${int(m.baris)} transaksi, rata-rata Rp${int(perTx(m))} rb per transaksi` }))} />
          </div>
        </Card>

        <Card n={3} before="histogram 8 kelompok 'Distribusi kuantitas (DUS)'"
          title={`Pesanan biasa ${int(A.qty.medianDus)} dus; ${jumboQty.length} pesanan jumbo berisi ${int(Math.min(...jumboQty))} sampai ${int(Math.max(...jumboQty))} dus`}
          sub="Jumlah dus dalam satu pesanan."
          why={`di histogram, bar ">100 dus" (4 pesanan) tidak terlihat di samping 1.451 pesanan berisi 1 dus, jadi pencilan yang ingin ditunjukkan justru hilang. Subjudulnya juga menulis median 3 dus, padahal median semua pesanan dus adalah ${int(A.qty.medianDus)}. Pesannya adalah perbandingan "biasa vs jumbo", bukan sebaran lengkap.`}>
          <HBars label="Ukuran pesanan dalam dus" items={[
            { key: "med", label: "Pesanan biasa (median)", value: A.qty.medianDus, text: `${int(A.qty.medianDus)} dus` },
            { key: "p99", label: "Hampir semua (99%) pesanan", value: p99, text: `≤ ${int(p99)} dus` },
            { key: "jumbo", label: `${jumboQty.length} pesanan jumbo`, value: Math.max(...jumboQty), text: `${int(Math.min(...jumboQty))}–${int(Math.max(...jumboQty))} dus`, hi: true, note: `${jumboBuyers.size} pembeli, semuanya Agustus` },
          ]} />
        </Card>

        <Card n={4} before="bar 'Pelanggan yang berbelanja per bulan' tanpa konteks"
          title={`Agustus punya pelanggan terbanyak (${aug.pelanggan}), tetapi ${kohortAug.nBaru} di antaranya pelanggan baru`}
          sub="Jumlah pelanggan per bulan; bagian biru = pelanggan yang pertama kali belanja bulan itu. April tidak ditampilkan karena bulan pertama data."
          why="angka 111 tanpa keterangan tampak seperti bukti pasar meluas dan berlawanan dengan cerita bahwa rekor Agustus semu. Memisahkan pelanggan baru menjelaskan angka itu daripada menyembunyikannya.">
          <VBars label="Pelanggan lama dan baru per bulan" height={210} items={A.months.filter(m => m.month !== 4).map(m => {
            const k = A.kohort.find(x => x.month === m.month)!;
            return { key: `p${m.month}`, label: m.short, value: m.pelanggan - k.nBaru, text: int(m.pelanggan), hi: m.month === 8, top: { value: k.nBaru, text: int(k.nBaru) },
              detail: `${m.label}: ${int(m.pelanggan)} pelanggan berbelanja, ${int(k.nBaru)} di antaranya baru (omzet pelanggan baru ${rp(k.baruJt)})` };
          })} />
        </Card>

        <Card n={5} before="bar bertumpuk 'Kohort pelanggan' dengan dua warna mencolok"
          title={`Juli ke Agustus: omzet pelanggan baru naik ${int(kohortAug.baruJt - kohortJul.baruJt)} jt, pelanggan lama turun ${int(kohortJul.lamaJt - kohortAug.lamaJt)} jt`}
          sub="Omzet dalam juta rupiah, Juli dibanding Agustus."
          why="di versi 1 dua warnanya sama-sama mencolok sehingga audiens harus memperhatikan semuanya, dan legendanya terpisah dari data. Slopegraph (komponen Arc) menonjolkan perubahan dua kelompok di antara dua titik waktu; hanya pelanggan baru yang berwarna.">
          <SlopeChart label="Omzet pelanggan lama dan baru" startLabel="Juli" endLabel="Agustus" highlightKey="baru" ranks={false}
            formatValue={v => `${int(v)} jt`}
            data={[
              { key: "lama", label: "Pelanggan lama", start: kohortJul.lamaJt, end: kohortAug.lamaJt },
              { key: "baru", label: "Pelanggan baru", start: kohortJul.baruJt, end: kohortAug.baruJt },
            ]} />
        </Card>

        <Card n={6} before="bar 'Belanja rata-rata per pelanggan' dari nol"
          title={`Tiap pelanggan belanja makin besar: ${rp(A.months[0].omzetJt / A.months[0].pelanggan)} di April, ${rp(jul.omzetJt / jul.pelanggan)} di Juli`}
          sub="Omzet dibagi jumlah pelanggan yang berbelanja, juta rupiah per bulan. Sumbu dimulai dari 6 (tanda zig-zag)."
          why="dengan sumbu dari nol, selisih Rp6,6 jt dan Rp8,5 jt tampak hampir sama. Dosen membolehkan sumbu tidak mulai dari nol asal ditandai zig-zag supaya tetap jujur. Catatan: Agustus tidak naik per pelanggan walaupun omzetnya rekor.">
          <FloorLine label="Belanja per pelanggan" floor={6} height={200} points={A.months.map(m => ({
            key: `b${m.month}`, label: m.short, value: m.omzetJt / m.pelanggan, text: one(m.omzetJt / m.pelanggan), hi: m.month === 4 || m.month === 7,
            detail: `${m.label}: ${rp(m.omzetJt / m.pelanggan)} per pelanggan (${rp(m.omzetJt)} dibagi ${int(m.pelanggan)} pelanggan)`,
          }))} />
        </Card>

        <Card n={7} before="bar vertikal 'Top 10 Pelanggan', hanya 5 dari 10 nama tampil"
          title={`10 pembeli menguasai ${pct(A.pareto.top10Pct)} omzet; satu di antaranya hanya belanja ${minTx} kali`}
          sub="Total pembelian April sampai September, juta rupiah, dan jumlah transaksinya."
          why="nama pelanggan panjang, sehingga Arc membuang separuh label sumbu. Bar horizontal membuat nama terbaca dulu sebelum datanya. Sorotan pada pembeli yang hanya 2 kali belanja memperlihatkan dua jenis pembeli besar: yang rutin dan yang sekali borong.">
          <HBars label="Sepuluh pelanggan terbesar" items={A.topCust.map(c => ({
            key: c.id, label: c.nama, value: c.omzetJt, text: `${int(c.omzetJt)} jt`, note: `${int(c.baris)} transaksi`, hi: c.baris === minTx,
            detail: `${c.nama}: ${rp(c.omzetJt)} (${pct(c.porsi)} omzet) dari ${int(c.baris)} transaksi, rata-rata ${rp(c.omzetJt / c.baris)} per transaksi`,
          }))} />
        </Card>

        <Card n={8} before="bar vertikal 'Top 10 Produk' dengan label satu kata"
          title={`Satu produk, ${A.topProd[0].nama.split(" ").slice(0, 3).join(" ")}, menyumbang ${pct(A.topProd[0].porsi)} omzet`}
          sub="Penjualan April sampai September, juta rupiah."
          why={`label satu kata membuat "Okey" muncul 3 kali dan "Miami" 2 kali untuk produk yang berbeda. Nama lengkap di bar horizontal dan satu sorotan pada produk teratas, yang hampir ${int(A.topProd[0].omzetJt / A.topProd[1].omzetJt)} kali produk kedua, langsung menunjukkan ketimpangannya.`}>
          <HBars label="Sepuluh produk terbesar" items={A.topProd.map((p, i) => ({
            key: p.id, label: p.nama, value: p.omzetJt, text: `${int(p.omzetJt)} jt`, hi: i === 0,
            detail: `${p.nama}: ${rp(p.omzetJt)}, ${pct(p.porsi)} dari seluruh omzet, ${int(p.baris)} transaksi`,
          }))} />
        </Card>

        <Card n={9} wide before="garis harian 183 hari yang jatuh ke nol setiap Minggu"
          title={`Hari biasa sekitar ${rp(medianDay)}; tiga hari tertinggi ${peaks.map(p => dateFmt.format(p.date)).join(", ")}`}
          sub="Omzet harian (juta rupiah), hanya hari toko buka. Geser jendela di bawah untuk memperbesar; titik penanda menjelaskan puncaknya."
          why="Minggu dan hari libur bernilai nol sehingga garisnya bergerigi dan menenggelamkan pola, dan puncak tidak diberi keterangan. Versi ini hanya memakai hari buka dan memberi anotasi di puncak (komponen Arc brush chart).">
          <BrushChart label="Omzet harian" unit="jt" data={daily.map(d => ({ date: d.date, value: d.value }))}
            formatValue={v => one(v)} formatTick={v => int(v)} formatDate={d => longDate.format(d)} height={220}
            annotations={[...peaks.map(p => ({ date: p.date, label: dateFmt.format(p.date), description: topDay(p.key) })),
              { date: Date.UTC(2020, 7, 3), label: "Jumbo", description: "Pesanan 200 dan 150 dus" }]} />
        </Card>

        <Card n={10} before="'Pola hari kerja' berupa jumlah omzet per hari"
          title={`${WD_FULL[wMax.w]} hari omzet terbesar; transaksi ${WD_FULL[wVal.w]} paling kecil nilainya`}
          sub="Rata-rata omzet per hari buka, juta rupiah. Minggu tutup."
          why={`versi 1 menjumlahkan omzet, padahal banyaknya hari buka tiap hari berbeda karena libur, sehingga perbandingannya tidak adil. Rata-rata per hari buka lebih jujur. ${WD_FULL[wMin.w]} omzetnya terendah, dan satu transaksi di hari ${WD_FULL[wVal.w]} rata-rata hanya Rp${int(perTxDay(wVal) * 1000)} rb, dibanding Rp${int(perTxDay(wMax) * 1000)} rb di hari ${WD_FULL[wMax.w]}.`}>
          <VBars label="Rata-rata omzet per hari buka" height={200} items={week.map(x => ({ key: `w${x.w}`, label: WD[x.w], value: x.avg, text: one(x.avg), hi: x.w === wMax.w,
            detail: `${WD_FULL[x.w]}: rata-rata ${rp(x.avg)} per hari buka, ${int(x.tx)} transaksi per hari, Rp${int(perTxDay(x) * 1000)} rb per transaksi (${wd[x.w].days} hari buka)` }))} />
        </Card>

        <Card n={11} center before="bar tiga bagian bulan (awal, tengah, akhir)"
          title={`Omzet per hari tertinggi di tanggal 21 sampai akhir bulan`}
          sub="Rata-rata omzet per hari kalender."
          why={`hanya tiga angka yang berdekatan, dan buku menyarankan teks bila angkanya sedikit. Bagian akhir mencakup ${phase[2].days} hari, sedangkan dua lainnya ${phase[0].days}, jadi angkanya dibagi per hari agar adil.`}>
          <div className={styles.bigRow}>
            {phase.map((p, i) => (
              <div key={p.label} className={i === 2 ? styles.bigHi : styles.big}>
                <strong>{rp(p.perDay)}</strong><span>per hari, {p.label}</span>
              </div>
            ))}
          </div>
          <p className={styles.bigNote}>Per hari, akhir bulan <b>{pct((phase[2].perDay / phase[0].perDay - 1) * 100)} lebih tinggi</b> daripada awal bulan, dan {pct((phase[2].perDay / phase[1].perDay - 1) * 100)} lebih tinggi daripada pertengahan bulan.</p>
        </Card>

        <Card n={12} before="bar vertikal 'Konsentrasi single buyer' tanpa garis acuan"
          title={`${bergantung50.length} dari 10 produk terbesar lebih dari separuh penjualannya dari satu pembeli`}
          sub="Persen penjualan produk yang dibeli oleh pembeli terbesarnya. Garis putus-putus = 50%."
          why="nama produk terpotong dan ambang 50%, inti pesannya, tidak digambar. Bar horizontal dengan garis acuan dan sorotan hanya pada produk di atas ambang membuat risikonya langsung terlihat.">
          <HBars label="Porsi pembeli terbesar per produk" max={100} reference={50} items={A.bergantung.map(x => ({
            key: x.id, label: x.nama, value: x.pct, text: `${int(x.pct)}%`, note: x.pembeli, hi: x.pct >= 50,
            detail: `${x.nama}: ${pct(x.pct)} dari penjualan ${rp(x.omzetJt)} dibeli ${x.pembeli}`,
          }))} />
        </Card>

        <Card n={13} before="bar 'Keragaman produk per pelanggan' satu warna"
          title={`Pelanggan yang membeli lebih dari 20 jenis produk belanja ${one(ragamTop.medianJt / ragamPrev.medianJt)} kali kelompok berikutnya`}
          sub="Median total belanja per pelanggan, juta rupiah, menurut banyaknya jenis produk yang dibeli."
          why="satu warna tidak menunjuk temuannya. Kata 'terkait' dipakai, bukan 'menyebabkan': pembeli besar memang wajar membeli banyak jenis, jadi data ini belum membuktikan bahwa menawarkan lebih banyak jenis akan menaikkan belanja.">
          <HBars label="Median belanja menurut ragam produk" items={A.ragam.map(g => ({
            key: g.key, label: g.label, value: g.medianJt, text: `${one(g.medianJt)} jt`, note: `${int(g.n)} pelanggan`, hi: g === ragamTop,
            detail: `${g.label}: ${int(g.n)} pelanggan, median total belanja ${rp(g.medianJt)}`,
          }))} />
        </Card>

        <Card n={14} wide before="peta jaringan produk dengan foto"
          title={`Paket ${pairHi.a.split(" ").slice(0, 2).join(" ")} + ${pairHi.b.split(" ").slice(0, 2).join(" ")} dibeli bersama ${one(pairHi.lift)} kali lebih sering dari kebetulan`}
          sub={`Jumlah nota yang berisi kedua produk. Nota = satu pelanggan di satu hari. ${pct((A.pasangan.notaMulti / A.pasangan.nota) * 100)} dari ${int(A.pasangan.nota)} nota berisi lebih dari satu produk.`}
          why="grafik jaringan sulit dibaca orang awam, foto produk hanya dekorasi, dan istilah 'lift' tidak dijelaskan. Bar horizontal dengan keterangan 'kali lebih sering dari kebetulan' lebih mudah dipahami; pasangan lintas merek disorot karena itulah kandidat promo paket.">
          <HBars label="Pasangan produk yang sering dibeli bersama" items={pairs.map(p => ({
            key: p.id, label: `${p.a} + ${p.b}`, value: p.n, text: `${int(p.n)} nota`, note: `${one(p.lift)} kali lebih sering dari kebetulan`, hi: p === pairHi,
            detail: `${p.a} + ${p.b}: ${int(p.n)} nota oleh ${int(p.pelanggan)} pelanggan; ${p.pctA}% nota yang berisi produk pertama juga berisi produk kedua`,
          }))} />
        </Card>
      </div>
    </main>
  );
}
