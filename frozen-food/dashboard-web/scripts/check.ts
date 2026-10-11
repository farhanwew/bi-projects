// Mencocokkan perhitungan TypeScript (src/analytics.ts) dengan angka acuan pandas di data.json.
// Jalankan: node scripts/check.ts
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { analyze, calendar, filterRows, firstMonths, supplyDrop, type Dict, type Row } from "../src/analytics.ts";

const data = JSON.parse(readFileSync(new URL("../src/data.json", import.meta.url), "utf8"));
const dict: Dict = data;
const rows: Row[] = data.rows;
const ref = data.ref;
const cal = calendar(data.base, data.hari);
const all = { from: 0, to: data.hari, months: [] as number[] };

const a = analyze(filterRows(rows, all, cal), dict, cal, all);
assert.equal(a.n, ref.n);
assert.equal(Math.round(a.totalJt * 1e6), Math.round(ref.total / 1e4) * 1e4);
assert.equal(a.customers, ref.customers);
assert.equal(a.products, ref.products);
for (const m of a.months) assert.ok(Math.abs(m.omzetJt * 1e6 - ref.month[m.month]) < 1e4, `bulan ${m.month}`);
assert.equal(a.pareto.top10Pct, ref.top10Pct);
assert.equal(a.pareto.produk80, ref.produk80);
assert.equal(a.pareto.pelanggan80, ref.pelanggan80);
assert.equal(a.peak?.month, 8);
{
  const aug = a.topByMonth.produk[4];
  assert.equal(aug.month, 8);
  assert.equal(aug.items.length, 5);
  assert.equal(aug.items[0].nama, "Minaku Otak Otak 500 gr X 20 Pack");
  assert.ok(Math.abs(aug.items[0].omzetJt - 287.5) < 0.06 && Math.abs(aug.items[0].porsi - 32.5) < 0.06);
  for (const mt of a.topByMonth.produk) assert.ok(mt.items.every((x, k) => k === 0 || mt.items[k - 1].omzetJt >= x.omzetJt));
  assert.ok(Math.abs(a.topByMonth.pelanggan[4].items[0].omzetJt - 126.4) < 0.06);
}
assert.equal(a.contrib.produk.series.length, 6);
assert.ok(Math.abs(a.contrib.produk.sharePct - 40.1) < 0.1 && Math.abs(a.contrib.pelanggan.sharePct - 37.4) < 0.1);
for (const [i, mo] of a.months.entries()) {
  const tot = Object.values(a.contrib.produk.data[i].values).reduce((s, v) => s + v, 0);
  assert.ok(Math.abs(tot - mo.omzetJt) < 0.06, `kontribusi bulan ${mo.month}`);
}
assert.equal(a.daily.reduce((s, d) => s + d.baris, 0), ref.n);
assert.ok(a.daily.every(d => d.pelanggan <= d.baris));
assert.equal(a.daily.find(d => d.key === "2020-08-03")?.pelanggan, new Set(rows.filter(r => r[0] === 124).map(r => r[1])).size);
assert.equal(a.pareto.curve.length, 100);
assert.ok(a.pareto.curve[a.pareto.curve.length - 1].produk === 100 && a.pareto.curve[99].pelanggan === 100);
assert.ok(a.pareto.curve.find(c => c.produk >= 80)!.p <= 14);
assert.equal(a.qtyBins.dus.reduce((s, b) => s + b.baris, 0), rows.filter(r => dict.satuan[r[5]] === "dus").length);
assert.ok(a.qtyBins.dus[a.qtyBins.dus.length - 1].baris >= 3);
assert.equal(a.peak?.rank, 3);
assert.deepEqual(a.peak?.below, ["Juni", "Juli"]);
assert.equal(a.peak?.pelanggan, 111);
assert.equal(a.peak?.mostCustomers, true);
assert.equal(a.peak?.lines.length, 3);
assert.ok(Math.abs((a.peak?.lines[0].jumlahJt ?? 0) - 63.2) < 0.01);
assert.ok(Math.abs((a.months.find(m => m.month === 8)?.tanpaTop3Jt ?? 0) - 711.16) < 0.01);
assert.ok(Math.abs((a.peak?.top3Jt ?? 0) * 1e6 - ref.top3Agu) < 1e4);
assert.deepEqual([a.tier.pasang, a.tier.pctLebihMahal, a.tier.medianPct], [ref.tier.pasang, ref.tier.pctLebihMahal, ref.tier.medianPct]);
assert.equal(a.sales[0]?.baris, ref.salesAkun);
assert.deepEqual([a.qty.medianDus, a.qty.medianPack], [ref.medianDus, ref.medianPack]);
assert.deepEqual(a.fase.map(f => Math.round(f.value * 1e6 / 1e4) * 1e4), ref.fase.map((v: number) => Math.round(v / 1e4) * 1e4));
assert.deepEqual(a.weekday.map(w => Math.round(w.omzetJt * 1e6 / 1e4) * 1e4), ref.weekday.map((v: number) => Math.round(v / 1e4) * 1e4));
const drop = supplyDrop(a.supply.kentang, "lutosa", "bart");
assert.ok(drop && drop.fromLabel === "Juli" && drop.toLabel === "Agustus");
assert.ok(Math.abs(drop.before * 1e6 - ref.lutosaJul) < 1e4 && Math.abs(drop.substitute * 1e6 - ref.bartsAgu) < 1e4);

// filter bulan: hanya Agustus
const f8 = { ...all, months: [8] };
const b = analyze(filterRows(rows, f8, cal), dict, cal, f8);
assert.deepEqual(b.months.map(m => m.month), [8]);
assert.ok(Math.abs(b.totalJt * 1e6 - ref.month[8]) < 1e4);
assert.ok(b.daily.every(d => d.key.startsWith("2020-08")));

// filter tanggal: 1-15 Mei, tanpa baris di luar rentang
const may = { from: 30, to: 44, months: [] as number[] };
const c = analyze(filterRows(rows, may, cal), dict, cal, may);
assert.ok(c.n > 0 && c.n < a.n && c.months.length === 1 && c.months[0].month === 5);

// filter kosong -> tidak error
const e = { from: 0, to: 0, months: [9] };
const z = analyze(filterRows(rows, e, cal), dict, cal, e);
assert.equal(z.n, 0);
assert.equal(z.peak, null);
// pelanggan baru: bulan pertama dari seluruh data, juga saat difilter ke satu bulan
for (const k of a.kohort) assert.ok(Math.abs(k.baruJt * 1e6 - ref.baru[k.month]) < 1e4 && Math.abs(k.lamaJt + k.baruJt - a.months.find(m => m.month === k.month)!.omzetJt) < 0.02, `kohort ${k.month}`);
const fm = firstMonths(rows, cal);
const b8 = analyze(filterRows(rows, f8, cal), dict, cal, f8, fm).kohort[0];
assert.ok(Math.abs(b8.baruJt * 1e6 - ref.baru[8]) < 1e4 && b8.lamaJt > 600);
assert.equal(a.bergantung.length, 10);
assert.equal(a.bergantung[0].pct, ref.bergantung);
assert.deepEqual(a.ragam.map(g => [g.n, g.medianJt]), ref.ragam.map((g: { n: number; medianJt: number }) => [g.n, g.medianJt]));
assert.equal(a.ragam.reduce((s, g) => s + g.n, 0), a.customers);
// angka dari analisis pandas (scratchpad), dicek ulang di sini
assert.equal(a.hariPuncak?.key, "2020-06-26");
assert.ok(Math.abs(a.hariPuncak!.jt - 188.5) < 0.06 && Math.abs(a.hariPuncak!.medianJt - 20.6) < 0.06 && Math.abs(a.hariPuncak!.produkJt - 90.7) < 0.06);
assert.deepEqual([a.merek?.nama, a.merek?.pct, a.merek?.jumlah], ["Minaku", 23, 71]);
assert.deepEqual(a.dusJumbo.map(x => [x.qty, x.kali]), [[200, 2], [150, 1]]);
assert.deepEqual([a.harga?.pasang, a.harga?.pct, a.harga?.naik, a.harga?.turun], [89, -0.21, 28, 17]);
assert.deepEqual([a.pasangan.nota, a.pasangan.notaMulti], [1495, 1071]);
assert.deepEqual([a.pasangan.top[0].a, a.pasangan.top[0].b, a.pasangan.top[0].n, a.pasangan.top[0].pelanggan], ["Okey Sosis 500 gr X 20 Pack", "Okey Stick 500 gr X 10 Pack", 183, 61]);
assert.ok(a.pasangan.top[1].n === 101 && a.pasangan.top[1].lift === 4.3 && a.pasangan.top[1].bedaMerek);
console.log("ok: analytics.ts cocok dengan acuan pandas");
