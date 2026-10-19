/** Perhitungan dashboard dari baris transaksi. Murni (tanpa impor JSON) supaya bisa dites dengan Node. */

/** [hari ke-n sejak base, pelanggan, produk, merek, qty, satuan, harga, jumlah, tierF] */
export type Row = readonly [number, number, number, number, number, number, number, number, number];
const DAY = 0, CUST = 1, PROD = 2, MEREK = 3, QTY = 4, UNIT = 5, PRICE = 6, AMT = 7, TIER_F = 8;

export interface Dict {
  base: string;
  hari: number;
  pelanggan: string[];
  pelangganAnon?: string[];
  produk: string[];
  merek: string[];
  satuan: string[];
}
export interface Filter { from: number; to: number; months: number[]; excludeOutliers?: boolean }

export const BULAN: Record<number, string> = { 4: "April", 5: "Mei", 6: "Juni", 7: "Juli", 8: "Agustus", 9: "September" };
export const HARI = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const jt = (rp: number) => Math.round(rp / 1e4) / 1e2; // rupiah -> juta, 2 desimal

export interface Calendar { month: number[]; dom: number[]; dow: number[]; date: (day: number) => Date }

export function calendar(base: string, hari: number): Calendar {
  const [y, m, d] = base.split("-").map(Number);
  const t0 = Date.UTC(y, m - 1, d);
  const date = (day: number) => new Date(t0 + day * 864e5);
  const days = Array.from({ length: hari + 1 }, (_, i) => date(i));
  return {
    month: days.map(x => x.getUTCMonth() + 1),
    dom: days.map(x => x.getUTCDate()),
    dow: days.map(x => (x.getUTCDay() + 6) % 7), // Senin = 0
    date,
  };
}

export function filterRows(rows: readonly Row[], f: Filter, cal: Calendar): Row[] {
  const months = new Set(f.months);
  return rows.filter(r => {
    if (r[DAY] < f.from || r[DAY] > f.to) return false;
    if (months.size > 0 && !months.has(cal.month[r[DAY]])) return false;
    if (f.excludeOutliers && r[AMT] >= 40_000_000) return false;
    return true;
  });
}

const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const n80 = (sortedDesc: number[], total: number) => {
  let acc = 0, n = 0;
  for (const v of sortedDesc) { n++; acc += v; if (acc / total >= 0.8) break; }
  return n;
};

export type TopRow = { id: string; nama: string; omzetJt: number; porsi: number; baris: number };
export type Line = { id: string; tanggal: string; produk: string; qty: string; pembeli: string; jumlahJt: number; bulan: string; bulanNo: number };
export interface SupplyPoint { key: string; label: string; axisLabel: string; values: Record<string, number> }
export type Contrib = {
  series: { key: string; label: string }[];
  data: { key: string; label: string; axisLabel: string; values: Record<string, number> }[];
  sharePct: number;
};

export type MonthTop = { month: number; label: string; short: string; items: { id: string; nama: string; omzetJt: number; porsi: number }[] };

export interface Analysis {
  n: number; totalJt: number; customers: number; products: number;
  months: { month: number; label: string; short: string; omzetJt: number; tanpaTop3Jt: number; baris: number; pelanggan: number; produk: number }[];
  daily: { key: string; label: string; axisLabel?: string; harian: number; rata7: number; baris: number; pelanggan: number }[];
  weekday: { key: string; label: string; short: string; omzetJt: number; baris: number }[];
  fase: { key: string; label: string; value: number }[];
  topCust: TopRow[]; topProd: TopRow[];
  contrib: Record<"produk" | "pelanggan", Contrib>;
  /** Top 5 TIAP bulan (bisa berbeda antar bulan), porsi terhadap omzet bulan itu. */
  topByMonth: Record<"produk" | "pelanggan", MonthTop[]>;
  pareto: { produk80: number; produkTotal: number; pelanggan80: number; pelangganTotal: number; top10Pct: number;
    curve: { p: number; produk: number; pelanggan: number }[] };
  besar: Line[];
  peak: { month: number; label: string; omzetJt: number; top3Jt: number; top3Pct: number; withoutJt: number; rank: number; ofMonths: number; below: string[];
    pelanggan: number; mostCustomers: boolean; lines: (Line & { pct: number })[] } | null;
  qty: { medianDus: number; medianPack: number; maxDus: number; maxPack: number };
  qtyBins: Record<"dus" | "pack", { label: string; baris: number }[]>;
  supply: { kentang: SupplyPoint[]; lumpia: SupplyPoint[] };
  tier: { pasang: number; pctLebihMahal: number; medianPct: number; minPct: number; maxPct: number };
  sales: { id: string; nama: string; baris: number; totalJt: number; rataRb: number }[];
  /** Omzet per bulan dari pelanggan lama vs pelanggan yang pertama kali belanja bulan itu (bulan pertama dihitung dari seluruh data). */
  kohort: { month: number; label: string; short: string; lamaJt: number; baruJt: number; nBaru: number }[];
  /** 10 produk terbesar: porsi yang dibeli satu pembeli terbesarnya. */
  bergantung: { id: string; nama: string; pembeli: string; pct: number; omzetJt: number }[];
  /** Pelanggan dikelompokkan menurut banyaknya jenis produk yang dibeli; median belanjanya. */
  ragam: { key: string; label: string; n: number; medianJt: number }[];
  /** Hari dengan omzet tertinggi dibanding median hari yang ada transaksinya, dan produk terbesarnya hari itu. */
  hariPuncak: { key: string; jt: number; medianJt: number; produk: string; produkJt: number } | null;
  /** Merek terbesar (nama dari produk terlarisnya), porsi omzet, dan jumlah merek. */
  merek: { nama: string; pct: number; jumlah: number } | null;
  /** Pembeli dengan pesanan dus >= 50 kali median: kuantitas terbesar dan berapa kali. */
  dusJumbo: { pembeli: string; produk: string; qty: number; kali: number }[];
  /** Perubahan harga (pelanggan non-F) bulan pertama ke terakhir, median per produk-satuan, ditimbang omzet. */
  harga: { pasang: number; pct: number; naik: number; turun: number; from: string; to: string } | null;
  /** Pasangan produk dalam satu nota (nota = satu pelanggan di satu hari; berkas tidak punya nomor nota). */
  pasangan: { nota: number; notaMulti: number; top: Pair[] };
}
/** pctA: persen nota berisi A yang juga berisi B (dan sebaliknya). lift: berapa kali lebih sering dari kebetulan. */
export type Pair = { id: string; a: string; b: string; n: number; pctA: number; pctB: number; lift: number; pelanggan: number; bedaMerek: boolean }

/** Bulan pertama tiap pelanggan berbelanja, dari seluruh baris (bukan baris terfilter). */
export function firstMonths(rows: readonly Row[], cal: Calendar): Map<number, number> {
  const out = new Map<number, number>();
  for (const r of rows) {
    const m = cal.month[r[DAY]];
    if (!out.has(r[CUST]) || m < out.get(r[CUST])!) out.set(r[CUST], m);
  }
  return out;
}

export function analyze(rows: readonly Row[], dict: Dict, cal: Calendar, f: Filter, first: Map<number, number> = firstMonths(rows, cal)): Analysis {
  const total = rows.reduce((s, r) => s + r[AMT], 0);
  const share = (v: number) => (total ? Math.round((v / total) * 1000) / 10 : 0);
  const lc = (i: number) => dict.satuan[i];

  // --- per bulan
  const byMonth = new Map<number, { omzet: number; baris: number; cust: Set<number>; prod: Set<number> }>();
  for (const r of rows) {
    const m = cal.month[r[DAY]];
    const x = byMonth.get(m) ?? { omzet: 0, baris: 0, cust: new Set(), prod: new Set() };
    x.omzet += r[AMT]; x.baris++; x.cust.add(r[CUST]); x.prod.add(r[PROD]);
    byMonth.set(m, x);
  }
  const bySize = [...rows].sort((a, b) => b[AMT] - a[AMT]);
  const top3Of = (m: number) => bySize.filter(r => cal.month[r[DAY]] === m).slice(0, 3);
  const months = [...byMonth.keys()].sort((a, b) => a - b).map(m => {
    const x = byMonth.get(m)!;
    const t3 = top3Of(m).reduce((s, r) => s + r[AMT], 0);
    return { month: m, label: BULAN[m], short: BULAN[m].slice(0, 3), omzetJt: jt(x.omzet), tanpaTop3Jt: jt(x.omzet - t3), baris: x.baris, pelanggan: x.cust.size, produk: x.prod.size };
  });

  // --- harian: hanya hari yang lolos filter; rata-rata 7 hari = hari lolos filter dalam +-3 hari kalender
  const months_ = new Set(f.months);
  const perDay = new Map<number, number>();
  const perDayN = new Map<number, number>();
  const perDayC = new Map<number, Set<number>>();
  for (const r of rows) {
    perDay.set(r[DAY], (perDay.get(r[DAY]) ?? 0) + r[AMT]);
    perDayN.set(r[DAY], (perDayN.get(r[DAY]) ?? 0) + 1);
    (perDayC.get(r[DAY]) ?? perDayC.set(r[DAY], new Set()).get(r[DAY])!).add(r[CUST]);
  }
  const lo = rows.length ? Math.min(...perDay.keys()) : 0;
  const hi = rows.length ? Math.max(...perDay.keys()) : -1;
  const included: number[] = [];
  for (let d = Math.max(lo, f.from); d <= Math.min(hi, f.to); d++) if (months_.size === 0 || months_.has(cal.month[d])) included.push(d);
  const daily = included.map(d => {
    let s = 0, c = 0;
    for (const e of included) if (Math.abs(e - d) <= 3) { s += perDay.get(e) ?? 0; c++; }
    const dt = cal.date(d);
    const dd = cal.dom[d];
    return {
      key: dt.toISOString().slice(0, 10),
      label: `${String(dd).padStart(2, "0")}/${String(cal.month[d]).padStart(2, "0")}/${dt.getUTCFullYear()}`,
      axisLabel: dd === 1 ? `01 ${BULAN[cal.month[d]].slice(0, 3)}` : undefined,
      harian: jt(perDay.get(d) ?? 0),
      baris: perDayN.get(d) ?? 0,
      pelanggan: perDayC.get(d)?.size ?? 0,
      rata7: jt(s / c),
    };
  });

  // --- hari dalam seminggu (Minggu tutup) dan fase tanggal
  const wd = HARI.map(() => ({ omzet: 0, baris: 0 }));
  const fs = [0, 0, 0];
  for (const r of rows) {
    const w = cal.dow[r[DAY]];
    if (w < 6) { wd[w].omzet += r[AMT]; wd[w].baris++; }
    fs[cal.dom[r[DAY]] <= 10 ? 0 : cal.dom[r[DAY]] <= 20 ? 1 : 2] += r[AMT];
  }
  const weekday = HARI.map((l, i) => ({ key: l.toLowerCase(), label: l, short: l.slice(0, 3), omzetJt: jt(wd[i].omzet), baris: wd[i].baris }));
  const fase = ["Awal (1-10)", "Tengah (11-20)", "Akhir (21-31)"].map((l, i) => ({ key: l, label: l, value: jt(fs[i]) }));

  // --- pelanggan dan produk
  const group = (key: number, names: string[]) => {
    const g = new Map<number, { omzet: number; baris: number }>();
    for (const r of rows) {
      const x = g.get(r[key]) ?? { omzet: 0, baris: 0 };
      x.omzet += r[AMT]; x.baris++; g.set(r[key], x);
    }
    const all = [...g.entries()].sort((a, b) => b[1].omzet - a[1].omzet);
    const top: TopRow[] = all.slice(0, 10).map(([i, x], k) => ({ id: `r${k}`, nama: names[i], omzetJt: jt(x.omzet), porsi: share(x.omzet), baris: x.baris }));
    return { all, top };
  };
  const cu = group(CUST, dict.pelanggan);
  const pr = group(PROD, dict.produk);
  const pareto = {
    produk80: n80(pr.all.map(x => x[1].omzet), total), produkTotal: pr.all.length,
    pelanggan80: n80(cu.all.map(x => x[1].omzet), total), pelangganTotal: cu.all.length,
    top10Pct: share(cu.all.slice(0, 10).reduce((s, x) => s + x[1].omzet, 0)),
    // Kurva Pareto: omzet kumulatif (%) dari p% item teratas, p = 1..100.
    curve: [] as { p: number; produk: number; pelanggan: number }[],
  };
  if (total) {
    const cum = (all: [number, { omzet: number }][]) => {
      let s = 0;
      const c = all.map(x => (s += x[1].omzet));
      return (p: number) => Math.round((c[Math.max(0, Math.ceil((p / 100) * c.length) - 1)] / total) * 1000) / 10;
    };
    const fp = cum(pr.all), fc = cum(cu.all);
    for (let p = 1; p <= 100; p++) pareto.curve.push({ p, produk: fp(p), pelanggan: fc(p) });
  }

  // --- kontribusi top 5 per bulan (5 teratas menurut omzet total + "Lainnya")
  const contribOf = (key: number, names: string[], all: [number, { omzet: number }][]): Contrib => {
    const top = all.slice(0, 5).map(x => x[0]);
    const topSet = new Set(top);
    const sums = new Map<number, Map<string, number>>();
    for (const r of rows) {
      const m = cal.month[r[DAY]];
      const row = sums.get(m) ?? new Map<string, number>();
      const k = topSet.has(r[key]) ? `t${r[key]}` : "lain";
      row.set(k, (row.get(k) ?? 0) + r[AMT]);
      sums.set(m, row);
    }
    const series = [...top.map(id => ({ key: `t${id}`, label: names[id] })), { key: "lain", label: "Lainnya" }];
    const data = months.map(mo => {
      const row = sums.get(mo.month) ?? new Map<string, number>();
      return { key: String(mo.month), label: mo.label, axisLabel: mo.short, values: Object.fromEntries(series.map(sr => [sr.key, jt(row.get(sr.key) ?? 0)])) };
    });
    return { series, data, sharePct: share(all.slice(0, 5).reduce((s, x) => s + x[1].omzet, 0)) };
  };
  const contrib = { produk: contribOf(PROD, dict.produk, pr.all), pelanggan: contribOf(CUST, dict.pelanggan, cu.all) };

  const topOf = (key: number, names: string[]): MonthTop[] => months.map(mo => {
    const g = new Map<number, number>();
    for (const r of rows) if (cal.month[r[DAY]] === mo.month) g.set(r[key], (g.get(r[key]) ?? 0) + r[AMT]);
    const monthTotal = byMonth.get(mo.month)!.omzet;
    const items = [...g.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([id, v]) => ({ id: `${key}-${id}`, nama: names[id], omzetJt: jt(v), porsi: Math.round((v / monthTotal) * 1000) / 10 }));
    return { month: mo.month, label: mo.label, short: mo.short, items };
  });
  const topByMonth = { produk: topOf(PROD, dict.produk), pelanggan: topOf(CUST, dict.pelanggan) };

  // --- baris terbesar dan bulan puncak
  const toLine = (r: Row, k: number): Line => {
    const m = cal.month[r[DAY]];
    return {
      id: `b${k}`, tanggal: `${String(cal.dom[r[DAY]]).padStart(2, "0")}/${String(m).padStart(2, "0")}/${cal.date(r[DAY]).getUTCFullYear()}`,
      produk: dict.produk[r[PROD]], qty: `${r[QTY]} ${lc(r[UNIT])}`, pembeli: dict.pelanggan[r[CUST]], jumlahJt: jt(r[AMT]), bulan: BULAN[m], bulanNo: m,
    };
  };
  const besar = bySize.slice(0, 8).map(toLine);
  let peak: Analysis["peak"] = null;
  if (months.length) {
    const p = months.reduce((a, b) => (b.omzetJt > a.omzetJt ? b : a));
    const mTotal = byMonth.get(p.month)!.omzet;
    const lines = top3Of(p.month);
    const top3 = lines.reduce((s, r) => s + r[AMT], 0);
    // Perbandingan adil: setiap bulan dikurangi tiga baris terbesarnya sendiri.
    const higher = months.filter(m => m.month !== p.month && m.tanpaTop3Jt > p.tanpaTop3Jt);
    peak = {
      month: p.month, label: p.label, omzetJt: p.omzetJt, top3Jt: jt(top3), top3Pct: Math.round((top3 / mTotal) * 1000) / 10,
      withoutJt: p.tanpaTop3Jt, rank: higher.length + 1, ofMonths: months.length, below: higher.map(m => m.label),
      pelanggan: p.pelanggan, mostCustomers: months.every(m => m.pelanggan <= p.pelanggan),
      lines: lines.map((r, k) => ({ ...toLine(r, k), pct: Math.round((r[AMT] / mTotal) * 1000) / 10 })),
    };
  }

  // --- kuantitas
  const qtyOf = (unit: string) => rows.filter(r => lc(r[UNIT]) === unit).map(r => r[QTY]);
  const dus = qtyOf("dus"), pack = qtyOf("pack");
  const qty = {
    medianDus: dus.length ? median(dus) : 0, medianPack: pack.length ? median(pack) : 0,
    maxDus: dus.length ? Math.max(...dus) : 0, maxPack: pack.length ? Math.max(...pack) : 0,
  };
  const BINS: [string, number, number][] = [["1", 1, 1], ["2", 2, 2], ["3-5", 3, 5], ["6-10", 6, 10], ["11-20", 11, 20], ["21-50", 21, 50], ["51-100", 51, 100], [">100", 101, Infinity]];
  const bin = (xs: number[]) => BINS.map(([label, lo, hi]) => ({ label, baris: xs.filter(x => x >= lo && x <= hi).length }));
  const qtyBins = { dus: bin(dus), pack: bin(pack) };

  // --- substitusi pasokan, per bulan yang lolos filter
  const supplyOf = (word: string, a: string, b: string): SupplyPoint[] => {
    const idx = new Set(dict.produk.flatMap((n, i) => (n.toLowerCase().includes(word) ? [i] : [])));
    const ia = dict.merek.indexOf(a), ib = dict.merek.indexOf(b);
    return months.map(m => {
      let va = 0, vb = 0;
      for (const r of rows) {
        if (cal.month[r[DAY]] !== m.month || !idx.has(r[PROD])) continue;
        if (r[MEREK] === ia) va += r[AMT]; else if (r[MEREK] === ib) vb += r[AMT];
      }
      return { key: `2020-${String(m.month).padStart(2, "0")}`, label: m.label, axisLabel: m.short, values: { [a.toLowerCase()]: jt(va), [b.toLowerCase()]: jt(vb) } };
    });
  };
  const supply = { kentang: supplyOf("shoestring", "LUTOSA", "BART"), lumpia: supplyOf("lumpia", "FINNA", "IP") };

  // --- harga tier F: median harga per (produk, satuan), minimal 5 baris di tiap sisi
  const cells = new Map<string, { f: number[]; l: number[] }>();
  for (const r of rows) {
    if (r[PRICE] <= 0) continue;
    const k = `${r[PROD]}|${r[UNIT]}`;
    const c = cells.get(k) ?? { f: [], l: [] };
    (r[TIER_F] ? c.f : c.l).push(r[PRICE]);
    cells.set(k, c);
  }
  const diffs = [...cells.values()].filter(c => c.f.length >= 5 && c.l.length >= 5).map(c => (median(c.f) / median(c.l) - 1) * 100);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const tier = {
    pasang: diffs.length, pctLebihMahal: diffs.length ? r1((diffs.filter(d => d > 0).length / diffs.length) * 100) : 0,
    medianPct: diffs.length ? r1(median(diffs)) : 0, minPct: diffs.length ? r1(Math.min(...diffs)) : 0, maxPct: diffs.length ? r1(Math.max(...diffs)) : 0,
  };

  // --- akun sales lapangan
  const sg = new Map<number, { baris: number; omzet: number }>();
  for (const r of rows) {
    if (!dict.pelanggan[r[CUST]].toLowerCase().includes("sales")) continue;
    const x = sg.get(r[CUST]) ?? { baris: 0, omzet: 0 };
    x.baris++; x.omzet += r[AMT]; sg.set(r[CUST], x);
  }
  const sales = [...sg.entries()].sort((a, b) => b[1].baris - a[1].baris)
    .map(([i, x], k) => ({ id: `s${k}`, nama: dict.pelanggan[i], baris: x.baris, totalJt: jt(x.omzet), rataRb: Math.round(x.omzet / x.baris / 1e3) }));

  // --- pelanggan baru vs lama
  const kohort = months.map(mo => {
    let lama = 0, baru = 0;
    const nb = new Set<number>();
    for (const r of rows) {
      if (cal.month[r[DAY]] !== mo.month) continue;
      if (first.get(r[CUST]) === mo.month) { baru += r[AMT]; nb.add(r[CUST]); } else lama += r[AMT];
    }
    return { month: mo.month, label: mo.label, short: mo.short, lamaJt: jt(lama), baruJt: jt(baru), nBaru: nb.size };
  });

  // --- ketergantungan 10 produk terbesar pada satu pembeli
  const bergantung = pr.all.slice(0, 10).map(([pid, x], k) => {
    const by = new Map<number, number>();
    for (const r of rows) if (r[PROD] === pid) by.set(r[CUST], (by.get(r[CUST]) ?? 0) + r[AMT]);
    const [cid, v] = [...by.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    return { id: `g${k}`, nama: dict.produk[pid], pembeli: dict.pelanggan[cid], pct: Math.round((v / x.omzet) * 1000) / 10, omzetJt: jt(x.omzet) };
  });

  // --- keragaman produk per pelanggan
  const jenis = new Map<number, Set<number>>();
  for (const r of rows) (jenis.get(r[CUST]) ?? jenis.set(r[CUST], new Set()).get(r[CUST])!).add(r[PROD]);
  const omzetOf = new Map(cu.all.map(([i, x]) => [i, x.omzet]));
  const ragam = ([["1-5", 1, 5], ["6-11", 6, 11], ["12-20", 12, 20], [">20", 21, Infinity]] as const).map(([label, lo, hi]) => {
    const vals = [...jenis.entries()].filter(([, s]) => s.size >= lo && s.size <= hi).map(([i]) => omzetOf.get(i) ?? 0);
    return { key: label, label: `${label} jenis`, n: vals.length, medianJt: vals.length ? jt(median(vals)) : 0 };
  });

  // --- hari puncak
  let hariPuncak: Analysis["hariPuncak"] = null;
  const aktif = daily.filter(d => d.baris > 0);
  if (aktif.length) {
    const top = aktif.reduce((x, y) => (y.harian > x.harian ? y : x));
    const day = included.find(d => cal.date(d).toISOString().slice(0, 10) === top.key)!;
    const byP = new Map<number, number>();
    for (const r of rows) if (r[DAY] === day) byP.set(r[PROD], (byP.get(r[PROD]) ?? 0) + r[AMT]);
    const [pid, pv] = [...byP.entries()].reduce((x, y) => (y[1] > x[1] ? y : x));
    hariPuncak = { key: top.key, jt: top.harian, medianJt: median(aktif.map(d => d.harian)), produk: dict.produk[pid], produkJt: jt(pv) };
  }

  // --- merek terbesar
  const byM = new Map<number, number>();
  for (const r of rows) byM.set(r[MEREK], (byM.get(r[MEREK]) ?? 0) + r[AMT]);
  const mTop = [...byM.entries()].sort((x, y) => y[1] - x[1])[0];
  const merek = mTop ? {
    nama: dict.produk[pr.all.find(([pid]) => rows.some(r => r[PROD] === pid && r[MEREK] === mTop[0]))![0]].split(" ")[0],
    pct: share(mTop[1]), jumlah: byM.size,
  } : null;

  // --- pesanan dus jumbo per pembeli
  const jumbo = new Map<number, { produk: number; qty: number; kali: number }>();
  for (const r of rows) {
    if (lc(r[UNIT]) !== "dus" || r[QTY] < 50 * qty.medianDus) continue;
    const x = jumbo.get(r[CUST]);
    if (!x || r[QTY] > x.qty) jumbo.set(r[CUST], { produk: r[PROD], qty: r[QTY], kali: x && x.qty === r[QTY] ? x.kali : 1 });
    else if (r[QTY] === x.qty) x.kali++;
  }
  const dusJumbo = [...jumbo.entries()].sort((x, y) => y[1].qty - x[1].qty).slice(0, 2)
    .map(([c, x]) => ({ pembeli: dict.pelanggan[c], produk: dict.produk[x.produk], qty: x.qty, kali: x.kali }));

  // --- harga bulan pertama vs terakhir
  let harga: Analysis["harga"] = null;
  if (months.length >= 2) {
    const m0 = months[0].month, m1 = months[months.length - 1].month;
    const cellsH = new Map<string, { a: number[]; b: number[]; w: number }>();
    for (const r of rows) {
      if (r[TIER_F] || r[PRICE] <= 0) continue;
      const k = `${r[PROD]}|${r[UNIT]}`;
      const c = cellsH.get(k) ?? { a: [], b: [], w: 0 };
      const m = cal.month[r[DAY]];
      if (m === m0) c.a.push(r[PRICE]); else if (m === m1) c.b.push(r[PRICE]);
      c.w += r[AMT]; cellsH.set(k, c);
    }
    const ch = [...cellsH.values()].filter(c => c.a.length && c.b.length).map(c => ({ d: (median(c.b) / median(c.a) - 1) * 100, w: c.w }));
    const wsum = ch.reduce((t, c) => t + c.w, 0);
    if (ch.length) harga = {
      pasang: ch.length, pct: Math.round((ch.reduce((t, c) => t + c.d * c.w, 0) / wsum) * 100) / 100,
      naik: ch.filter(c => c.d > 0.5).length, turun: ch.filter(c => c.d < -0.5).length, from: BULAN[m0], to: BULAN[m1],
    };
  }

  // --- pasangan produk per nota
  const nota = new Map<string, { cust: number; prods: Set<number> }>();
  const merekOf = new Map<number, number>();
  for (const r of rows) {
    const k = `${r[DAY]}|${r[CUST]}`;
    (nota.get(k) ?? nota.set(k, { cust: r[CUST], prods: new Set() }).get(k)!).prods.add(r[PROD]);
    merekOf.set(r[PROD], r[MEREK]);
  }
  const satu = new Map<number, number>();
  const pairN = new Map<string, { n: number; cust: Set<number> }>();
  let notaMulti = 0;
  for (const { cust, prods } of nota.values()) {
    const ps = [...prods].sort((x, y) => x - y);
    for (const q of ps) satu.set(q, (satu.get(q) ?? 0) + 1);
    if (ps.length > 1) notaMulti++;
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const k = `${ps[i]}|${ps[j]}`;
      const x = pairN.get(k) ?? pairN.set(k, { n: 0, cust: new Set() }).get(k)!;
      x.n++; x.cust.add(cust);
    }
  }
  const pairs: Pair[] = [...pairN.entries()].sort((x, y) => y[1].n - x[1].n).slice(0, 20).map(([k, x], i) => {
    const [pa, pb] = k.split("|").map(Number);
    const na = satu.get(pa)!, nb = satu.get(pb)!;
    return {
      id: `p${i}`, a: dict.produk[pa], b: dict.produk[pb], n: x.n, pctA: Math.round((x.n / na) * 100), pctB: Math.round((x.n / nb) * 100),
      lift: Math.round(((x.n * nota.size) / (na * nb)) * 10) / 10, pelanggan: x.cust.size, bedaMerek: merekOf.get(pa) !== merekOf.get(pb),
    };
  });
  const pasangan = { nota: nota.size, notaMulti, top: pairs };

  return {
    kohort, bergantung, ragam, hariPuncak, merek, dusJumbo, harga, pasangan,
    n: rows.length, totalJt: jt(total), customers: cu.all.length, products: pr.all.length,
    months, daily, weekday, fase, topCust: cu.top, topProd: pr.top, contrib, topByMonth, pareto, besar, peak, qty, qtyBins, supply, tier, sales,
  };
}

/** Penurunan terbesar merek lama antar dua bulan berurutan, dan seberapa banyak merek pengganti menutupnya. */
export function supplyDrop(points: SupplyPoint[], from: string, to: string) {
  let best: { a: SupplyPoint; b: SupplyPoint; drop: number } | null = null;
  for (let i = 0; i + 1 < points.length; i++) {
    const drop = points[i].values[from] - points[i + 1].values[from];
    if (drop > 10 && (!best || drop > best.drop)) best = { a: points[i], b: points[i + 1], drop };
  }
  if (!best) return null;
  const sub = best.b.values[to];
  return { fromLabel: best.a.label, toLabel: best.b.label, before: best.a.values[from], after: best.b.values[from], substitute: sub, coverPct: Math.round((sub / best.drop) * 1000) / 10 };
}
