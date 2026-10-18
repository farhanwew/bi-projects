import { CircleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Alert } from "@/components/arc/alert/alert";
import { AnimatedCounter } from "@/components/arc/animated-counter/animated-counter";
import { Badge } from "@/components/arc/badge/badge";
import { BarChart } from "@/components/arc/bar-chart/bar-chart";
import { Button } from "@/components/arc/button/button";
import { ChipGroup } from "@/components/arc/chip-group/chip-group";
import { DateRangePicker, type DateRange } from "@/components/arc/date-range-picker/date-range-picker";
import { EmptyState } from "@/components/arc/empty-state/empty-state";
import { LineChart, type LineChartDatum } from "@/components/arc/line-chart/line-chart";
import SegmentedControl from "@/components/arc/segmented-control/segmented-control";
import { Tooltip } from "@/components/arc/tooltip/tooltip";
import { RibbonChart } from "./components/RibbonChart";
import { DiagnosticDecompositionCard } from "./components/DiagnosticCharts";
import { MarketBasketNetwork } from "./components/MarketBasketNetwork";
import { analyze, BULAN, calendar, filterRows, firstMonths, type Analysis, type Dict, type Row, type TopRow } from "./analytics";
import raw from "./data.json";
import { int, jt, one, pct, rp } from "./format";
import styles from "./App.module.css";

const DICT = raw as unknown as Dict;
const ROWS = raw.rows as unknown as Row[];
const KUALITAS = raw.kualitas;
const CAL = calendar(DICT.base, DICT.hari);
/** Bulan pertama tiap pelanggan dari seluruh data: "pelanggan baru" tetap benar walau halaman difilter ke satu bulan. */
const FIRST = firstMonths(ROWS, CAL);
/** Libur nasional 2020 (Senin sampai Sabtu) untuk menjelaskan hari kerja tanpa transaksi. */
const LIBUR: Record<string, string> = {
  "2020-04-10": "Wafat Isa Almasih", "2020-05-01": "Hari Buruh", "2020-05-07": "Waisak", "2020-05-21": "Kenaikan Isa Almasih",
  "2020-05-22": "cuti Lebaran", "2020-05-25": "Idulfitri", "2020-05-26": "Idulfitri", "2020-06-01": "Hari Lahir Pancasila",
  "2020-07-31": "Iduladha", "2020-08-17": "HUT RI", "2020-08-20": "Tahun Baru Islam",
};
const KOHORT_COLORS = { lama: "var(--series-1)", baru: "var(--series-2)" };


// --- tanggal: Date lokal <-> hari ke-n sejak 1 April 2020
const T0 = Date.UTC(2020, 3, 1);
const dayOf = (d: Date) => Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - T0) / 864e5);
const dateOf = (day: number) => new Date(2020, 3, 1 + day);
const MIN = dateOf(0);
const MAX = dateOf(DICT.hari);
const FULL: DateRange = { start: MIN, end: MAX };
const presets = [
  { label: "Seluruh Periode", range: () => FULL },
  { label: "Kuartal 2 (Apr – Jun)", range: () => ({ start: new Date(2020, 3, 1), end: new Date(2020, 5, 30) }) },
  { label: "Kuartal 3 (Jul – Sep)", range: () => ({ start: new Date(2020, 6, 1), end: new Date(2020, 8, 30) }) },
  { label: "30 Hari Terakhir", range: () => ({ start: new Date(2020, 8, 1), end: MAX }) },
];
const monthOptions = Object.entries(BULAN).map(([value, label]) => ({ value, label }));

const WEEKDAY = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
type DailyKey = "omzet" | "baris" | "pelanggan";
type Win = "bulan" | "semua";
const windowOptions = [{ value: "bulan", label: "Per bulan" }, { value: "semua", label: "Per hari" }];
const dailyMeta: Record<DailyKey, { title: string; label: string; unit: string; value: (d: Analysis["daily"][number]) => number }> = {
  omzet: { title: "Omzet", label: "Omzet", unit: "jt", value: d => d.harian },
  baris: { title: "Jumlah transaksi", label: "Transaksi", unit: "transaksi", value: d => d.baris },
  pelanggan: { title: "Pelanggan yang berbelanja", label: "Pelanggan", unit: "pelanggan", value: d => d.pelanggan },
};
/** Judul kartu: kalimat yang menyebut apa yang diukur dan per apa, satuan di anak judul. */
const dailyHeading = (k: DailyKey, w: Win) => {
  const per = w === "bulan" ? "per bulan" : "per hari";
  return k === "omzet" ? `Omzet ${per} (juta rupiah)` : k === "baris" ? `Jumlah transaksi ${per}` : `Jumlah pelanggan yang berbelanja ${per}`;
};
const dateText = (key: string) => `${Number(key.slice(8, 10))} ${BULAN[Number(key.slice(5, 7))]?.slice(0, 3) ?? ""}`;
const weekdayOf = (key: string) => WEEKDAY[new Date(`${key}T00:00:00Z`).getUTCDay()];

const spanOptions = [
  { value: "30", label: "30 hari" },
  { value: "90", label: "90 hari" },
  { value: "all", label: "Semua" },
];
type SpanKey = "30" | "90" | "all";

/** Label sumbu pendek: buang awalan seperti "(Mitraku)", "Pak", "Toko", "Pt.", ambil beberapa kata pertama. */
const shortName = (name: string, words: number) =>
  name.replace(/^Pelanggan (\d+)$/, "P$1").replace(/^\(.*?\)\s+/, "").replace(/^(Pak|Mas|Bu|Ibu|Toko|Pt\.?|Cv\.?)\s+/i, "").split(" ").slice(0, words).join(" ");

const signed = (v: number) => `${v >= 0 ? "+" : "-"}${one(Math.abs(v))}%`;

type Hint = { tag: "Deskriptif" | "Diagnostik"; text: string };
type HintKey = "omzet" | "baris" | "hari" | "fase" | "topPelanggan" | "topProduk" | "kohort" | "belanja" | "harian" | "bergantung" | "ragam" | "pasangan";

/** Temuan dihitung dari data terfilter dan ditempel ke grafik yang relevan (ikon "!" yang terbuka saat di-hover). */
function hintsOf(a: Analysis): Partial<Record<HintKey, Hint[]>> {
  const out: Partial<Record<HintKey, Hint[]>> = {};
  const add = (k: HintKey, h: Hint) => { (out[k] ??= []).push(h); };
  const ms = a.months;
  const f = ms[0], l = ms[ms.length - 1];
  const avg = a.totalJt / ms.length;
  const top = ms.reduce((x, y) => (y.omzetJt > x.omzetJt ? y : x));
  if (ms.length >= 2) {
    add("omzet", { tag: "Deskriptif", text: `Omzet ${l.omzetJt >= f.omzetJt ? "naik" : "turun"} ${pct(Math.abs((l.omzetJt / f.omzetJt - 1) * 100))} dari ${f.label} (${rp(f.omzetJt)}) ke ${l.label} (${rp(l.omzetJt)}). Puncaknya ${top.label}, ${rp(top.omzetJt)}, atau ${signed((top.omzetJt / avg - 1) * 100)} dari rata-rata bulanan.` });
  } else {
    add("omzet", { tag: "Deskriptif", text: `Omzet ${f.label} ${rp(f.omzetJt)} dari ${int(f.baris)} transaksi dan ${int(f.pelanggan)} pelanggan.` });
  }
  if (a.peak) {
    const k = a.peak;
    const many = a.months.length >= 2;
    add("omzet", {
      tag: "Diagnostik",
      text: many && k.rank > 1
        ? `${k.label} tertinggi karena tiga transaksi raksasa senilai ${rp(k.top3Jt)} (${pct(k.top3Pct)} omzet bulan itu). Jika tiga transaksi terbesar tiap bulan dikeluarkan, ${k.label} turun ke peringkat ${k.rank} dari ${k.ofMonths} bulan${k.mostCustomers ? `, walau pelanggan aktifnya paling banyak (${k.pelanggan})` : ""}.`
        : `Tiga transaksi terbesar ${k.label} bernilai ${rp(k.top3Jt)}, ${pct(k.top3Pct)} omzet bulan itu${many ? "; tanpanya pun bulan itu tetap tertinggi" : ""}.`,
    });
  }
  if (a.qty.medianDus || a.qty.medianPack) {
    add("baris", { tag: "Diagnostik", text: `Median pesanan ${int(a.qty.medianDus)} dus atau ${int(a.qty.medianPack)} pack, tetapi ada transaksi sampai ${int(a.qty.maxDus)} dus dan ${int(a.qty.maxPack)} pack.${a.dusJumbo.length ? ` Pembeli dengan pesanan jauh di atas kebanyakan: ${a.dusJumbo.map(x => `${x.pembeli} ${int(x.qty)} dus ${x.produk}${x.kali > 1 ? ` (${x.kali} kali)` : ""}`).join("; ")}, ${int(a.dusJumbo[0].qty / a.qty.medianDus)} kali median.` : ""}` });
  }
  const days = a.weekday.filter(w => w.baris > 0);
  if (days.length >= 2) {
    const hi = days.reduce((x, y) => (y.omzetJt > x.omzetJt ? y : x));
    const lo = days.reduce((x, y) => (y.omzetJt < x.omzetJt ? y : x));
    add("hari", { tag: "Deskriptif", text: `${hi.label} adalah hari dengan omzet terbesar (${rp(hi.omzetJt)}); ${lo.label} terendah (${rp(lo.omzetJt)}).` });
  }
  if (a.totalJt > 0) {
    add("fase", { tag: "Deskriptif", text: `Tanggal 21 sampai 31 menyerap ${pct((a.fase[2].value / a.totalJt) * 100)} omzet, pola belanja menjelang akhir bulan.` });
  }
  const p = a.pareto;
  add("topPelanggan", { tag: "Deskriptif", text: `${Math.min(10, p.pelangganTotal)} pembeli teratas menguasai ${pct(p.top10Pct)} omzet; ${p.pelanggan80} dari ${int(p.pelangganTotal)} pelanggan sudah menghasilkan 80%.` });
  add("topProduk", { tag: "Deskriptif", text: `${p.produk80} dari ${int(p.produkTotal)} produk menghasilkan 80% omzet.${a.merek ? ` Menurut merek, ${a.merek.nama} terbesar dengan ${pct(a.merek.pct)} omzet dari ${a.merek.jumlah} merek.` : ""}` });

  const share = (k: Analysis["kohort"][number]) => k.baruJt / (k.lamaJt + k.baruJt);
  const ko = a.kohort.filter(k => k.month !== 4);
  if (ko.length) {
    const k = ko.reduce((x, y) => (share(y) > share(x) ? y : x));
    const prev = a.kohort.find(x => x.month === k.month - 1);
    const prevTotal = prev ? prev.lamaJt + prev.baruJt : 0;
    add("kohort", { tag: "Diagnostik", text: `Di ${k.label}, ${k.nBaru} pelanggan baru menyumbang ${rp(k.baruJt)} (${pct(share(k) * 100)} omzet bulan itu)${prev ? `, sementara pelanggan lama hanya belanja ${rp(k.lamaJt)}, ${k.lamaJt >= prevTotal ? "naik" : "turun"} ${pct(Math.abs((k.lamaJt / prevTotal - 1) * 100))} dari omzet ${prev.label}` : ""}.` });
  }
  if (ms.length >= 2) {
    const per = (m: typeof f) => m.omzetJt / m.pelanggan;
    add("belanja", { tag: "Diagnostik", text: `Jumlah pelanggan per bulan relatif datar (${Math.min(...ms.map(m => m.pelanggan))} sampai ${Math.max(...ms.map(m => m.pelanggan))}), sedangkan belanja per pelanggan bergerak dari ${rp(per(f))} (${f.label}) ke ${rp(per(l))} (${l.label}). Naik-turunnya omzet lebih banyak ditentukan besar belanja tiap pelanggan.` });
    if (a.harga) add("belanja", { tag: "Diagnostik", text: `Bukan karena harga: dari ${a.harga.pasang} produk yang terjual di ${a.harga.from} dan ${a.harga.to}, harga rata-rata (ditimbang omzet) berubah ${a.harga.pct >= 0 ? "+" : "-"}${one(Math.abs(a.harga.pct))}%; ${a.harga.naik} naik, ${a.harga.turun} turun, sisanya tetap. Harga pelanggan berawalan F tidak dihitung.` });
  }
  const hp = a.hariPuncak;
  if (hp && hp.medianJt > 0 && hp.jt / hp.medianJt >= 2) {
    add("harian", { tag: "Deskriptif", text: `Hari tertinggi ${weekdayOf(hp.key)}, ${dateText(hp.key)}: ${rp(hp.jt)}, ${one(hp.jt / hp.medianJt)} kali median hari biasa (${rp(hp.medianJt)}). ${rp(hp.produkJt)} di antaranya dari ${hp.produk} saja.` });
  }
  const tutup = a.daily.filter(d => d.baris === 0 && weekdayOf(d.key) !== "Min");
  if (tutup.length) {
    const libur = tutup.filter(d => LIBUR[d.key]);
    add("harian", { tag: "Deskriptif", text: `Ada ${tutup.length} hari Senin sampai Sabtu tanpa transaksi${libur.length ? `; ${libur.length} di antaranya libur nasional (${[...new Set(libur.map(d => LIBUR[d.key]))].join(", ")})` : ""}.` });
  }
  const g = a.bergantung.filter(x => x.pct >= 50);
  if (g.length) {
    const top = a.bergantung.reduce((x, y) => (y.pct > x.pct ? y : x));
    add("bergantung", { tag: "Diagnostik", text: `${g.length} dari ${a.bergantung.length} produk terbesar separuh lebih penjualannya dari satu pembeli. Paling ekstrem ${top.nama}: ${pct(top.pct)} dibeli ${top.pembeli}. Jika pembeli itu berhenti, penjualan produknya ikut hilang.` });
  }
  const ps = a.pasangan;
  if (ps.top.length) {
    const t = ps.top[0];
    add("pasangan", { tag: "Deskriptif", text: `${pct((ps.notaMulti / ps.nota) * 100)} dari ${int(ps.nota)} nota berisi lebih dari satu produk. Pasangan tersering ${t.a} + ${t.b}: ${int(t.n)} kali oleh ${int(t.pelanggan)} pelanggan; ${t.pctA}% nota berisi ${shortName(t.a, 2)} juga berisi ${shortName(t.b, 2)}.` });
    const lintas = ps.top.filter(x => x.bedaMerek && x.n >= 10).reduce<typeof t | null>((x, y) => (!x || y.lift > x.lift ? y : x), null);
    if (lintas && lintas.lift >= 2) add("pasangan", { tag: "Diagnostik", text: `Pasangan beda merek ${lintas.a} + ${lintas.b} dibeli bersama ${int(lintas.n)} kali, ${one(lintas.lift)} kali lebih sering dari kebetulan: pembeli belanja paket, bukan setia pada satu merek. Kandidat promo bundling.` });
    const ramai = ps.top.find(x => x.lift < 1.5);
    if (ramai) add("pasangan", { tag: "Diagnostik", text: `Hati-hati membaca jumlah saja: ${ramai.a} + ${ramai.b} (${int(ramai.n)} kali) hanya ${one(ramai.lift)} kali kebetulan, sering muncul bersama karena produknya memang laris.` });
  }
  const rg = a.ragam.filter(x => x.n > 0);
  if (rg.length >= 2 && rg[0].medianJt > 0) {
    const lo = rg[0], hi = rg[rg.length - 1];
    add("ragam", { tag: "Diagnostik", text: `Pelanggan yang membeli ${hi.label} produk belanja median ${rp(hi.medianJt)}, ${one(hi.medianJt / lo.medianJt)} kali pelanggan ${lo.label} (${rp(lo.medianJt)}). ${lo.n} pelanggan yang baru membeli sedikit jenis adalah sasaran tawaran produk lain.` });
  }
  return out;
}

/** Ikon "!" di samping judul grafik; isi temuan terbuka saat di-hover atau difokus. */
function InfoHint({ items }: { items?: Hint[] }) {
  if (!items?.length) return null;
  return (
    <Tooltip
      side="bottom"
      content={
        <span className={styles.hintBody}>
          {items.map(h => (
            <span key={h.text} className={styles.hintItem}><strong>{h.tag}</strong>{h.text}</span>
          ))}
        </span>
      }
    >
      <button type="button" className={styles.hint} aria-label={`Temuan: ${items.map(h => h.text).join(" ")}`}>
        <CircleAlert size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
    </Tooltip>
  );
}

/** Judul kartu grafik; ikon temuan (!) hanya muncul bila ada temuan untuk grafik itu. */
function CardTitle({ children, hint }: { children: React.ReactNode; hint?: Hint[] }) {
  return (
    <div className={styles.titleRow}>
      <h3 className={styles.h3}>{children}</h3>
      <InfoHint items={hint} />
    </div>
  );
}

type KpiProps = { label: string; value: number; decimals?: number; suffix?: string; context: string; change?: string };

/** Kartu KPI: AnimatedCounter dengan locale id-ID, supaya "4,53" dan "6.720" terbaca benar bagi pembaca Indonesia. */
function Kpi({ label, value, decimals = 0, suffix, context, change }: KpiProps) {
  return (
    <article className={styles.kpi}>
      <div className={styles.kpiTop}>
        <span>{label}</span>
        {change && <Badge tone={change.startsWith("-") ? "danger" : "success"} size="sm">{change}</Badge>}
      </div>
      <AnimatedCounter value={value} decimals={decimals} suffix={suffix} locale="id-ID" />
      <p className={styles.kpiContext}>{context}</p>
    </article>
  );
}

type ViewMode = "semua" | "deskriptif" | "diagnostik";
const viewOptions = [
  { value: "semua", label: "Semua Visualisasi" },
  { value: "deskriptif", label: "📊 Monitoring Deskriptif" },
  { value: "diagnostik", label: "🔍 Diagnostik & Anomali" },
];

export function App() {
  const [range, setRange] = useState<DateRange>(FULL);
  const [chips, setChips] = useState<string[]>([]);
  const [win, setWin] = useState<Record<DailyKey, Win>>({ omzet: "bulan", baris: "bulan", pelanggan: "bulan" });
  const [span, setSpan] = useState<SpanKey>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("semua");

  const from = Math.max(0, dayOf(range.start));
  const to = Math.min(DICT.hari, dayOf(range.end));
  const months = useMemo(() => chips.map(Number), [chips]);
  const active = from !== 0 || to !== DICT.hari || months.length > 0;
  const reset = () => { setRange(FULL); setChips([]); };
  const dayText = (d: Date) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(d);
  const monthNames = months.map(m => BULAN[m]);
  const scopeText = months.length
    ? `bulan ${monthNames.length > 1 ? `${monthNames.slice(0, -1).join(", ")} dan ${monthNames[monthNames.length - 1]}` : monthNames[0]}${from !== 0 || to !== DICT.hari ? " (rentang tanggal dipersempit)" : ""}`
    : active ? `${dayText(range.start)} sampai ${dayText(range.end)}` : "April sampai September";

  const a = useMemo(() => {
    const f = { from, to, months };
    return analyze(filterRows(ROWS, f, CAL), DICT, CAL, f, FIRST);
  }, [from, to, months]);
  const hints = useMemo(() => (a.n ? hintsOf(a) : {}), [a]);

  const weekdayData = useMemo(() => a.weekday.map(w => ({ key: w.key, label: w.label, axisLabel: w.short, value: w.omzetJt })), [a]);
  const daily = useMemo(() => {
    const all = a.daily;
    const sum = (xs: typeof all) => xs.reduce((s, x) => s + x.harian, 0);
    if (span === "all") {
      return {
        data: all.map(d => ({ key: d.key, label: d.label, axisLabel: d.axisLabel, values: { harian: d.harian, rata7: d.rata7 } })) as LineChartDatum[],
        series: [{ key: "harian", label: "Per hari" }, { key: "rata7", label: "Rata-rata 7 hari", area: false }],
        total: sum(all), days: all.length, change: null as number | null,
      };
    }
    const n = Number(span);
    const cur = all.slice(-n);
    const prev = all.slice(-2 * n, -n);
    const hasPrev = prev.length === cur.length && cur.length === n;
    const step = Math.max(1, Math.ceil(cur.length / 5));
    const prevTotal = hasPrev ? sum(prev) : 0;
    return {
      data: cur.map((d, i) => ({
        key: d.key, label: d.label, axisLabel: i % step === 0 ? dateText(d.key) : undefined,
        values: hasPrev ? { sekarang: d.harian, sebelumnya: prev[i].harian } : { sekarang: d.harian },
      })) as LineChartDatum[],
      series: hasPrev
        ? [{ key: "sekarang", label: `${n} hari terakhir` }, { key: "sebelumnya", label: `${n} hari sebelumnya`, dashed: true, area: false }]
        : [{ key: "sekarang", label: `${n} hari terakhir` }],
      total: sum(cur), days: cur.length, change: hasPrev && prevTotal > 0 ? (sum(cur) / prevTotal - 1) * 100 : null,
    };
  }, [a, span]);
  /**
   * Bar chart per metrik. Per bulan: satu bar per bulan (agregat bulanan).
   * Semua: seluruh hari yang lolos filter halaman (harian).
   */
  const dailyBars = (k: DailyKey) => {
    const meta = dailyMeta[k];
    if (win[k] === "bulan") {
      const pick = (mm: Analysis["months"][number]) => (k === "omzet" ? mm.omzetJt : k === "baris" ? mm.baris : mm.pelanggan);
      const list = a.months;
      return {
        data: list.map(mm => ({ key: String(mm.month), label: mm.label, axisLabel: mm.short, value: pick(mm) })),
        period: list.length ? `${list[0].label} - ${list[list.length - 1].label} 2020` : "Tidak ada data",
        avgLabel: "Rata-rata bulanan",
      };
    }
    const cur = a.daily;
    return {
      data: cur.map(d => ({
        key: d.key, label: `${weekdayOf(d.key)}, ${d.label}`,
        axisLabel: d.key.endsWith("-01") ? dateText(d.key) : undefined,
        value: meta.value(d),
      })),
      period: cur.length ? `${dateText(cur[0].key)} - ${dateText(cur[cur.length - 1].key)} 2020` : "Tidak ada data",
      avgLabel: "Rata-rata harian",
    };
  };
  const ms = a.months;
  const first = ms[0], last = ms[ms.length - 1];
  const peak = a.peak;
  const rata = ms.length ? a.totalJt / ms.length : 0;
  const topBars = (rows: TopRow[], words: number) =>
    rows.map(r => ({ key: r.id, label: `${r.nama}: ${one(r.omzetJt)} jt, ${pct(r.porsi)} omzet, ${int(r.baris)} transaksi`, axisLabel: shortName(r.nama, words), value: r.omzetJt }));
  const faseData = useMemo(() => a.fase.map(f => ({ key: f.key, label: f.label, axisLabel: f.label.split(" ")[0], value: f.value })), [a]);
  const custBars = useMemo(() => topBars(a.topCust, 1), [a]);
  const kohort = useMemo(() => {
    const list = a.kohort.filter(k => k.month !== 4);
    return {
      data: list.map(k => ({ key: String(k.month), label: `${k.label} (${k.nBaru} pelanggan baru)`, axisLabel: k.short, values: { lama: k.lamaJt, baru: k.baruJt } })),
      totals: list.map(k => k.lamaJt + k.baruJt),
    };
  }, [a]);
  const belanjaBars = useMemo(() => ms.map(m => ({ key: String(m.month), label: `${m.label}: ${int(m.pelanggan)} pelanggan`, axisLabel: m.short, value: m.pelanggan ? m.omzetJt / m.pelanggan : 0 })), [ms]);
  const bergantungBars = useMemo(() => a.bergantung.map(x => ({ key: x.id, label: `${x.nama} (${one(x.omzetJt)} jt): ${pct(x.pct)} dibeli ${x.pembeli}`, axisLabel: shortName(x.nama, 1), value: x.pct })), [a]);
  const ragamBars = useMemo(() => a.ragam.map(x => ({ key: x.key, label: `${x.label}: ${int(x.n)} pelanggan, median ${one(x.medianJt)} jt`, axisLabel: x.key, value: x.medianJt })), [a]);
  const prodBars = useMemo(() => topBars(a.topProd, 1), [a]);
  const qtyDistBars = useMemo(() => {
    return a.qtyBins.dus.map(b => ({
      key: b.label,
      label: `${b.label} DUS: ${int(b.baris)} transaksi`,
      axisLabel: b.label,
      value: b.baris,
    }));
  }, [a]);

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <div className={styles.brand}>
          <span className={styles.logo}>❄️</span>
          <h1 className={styles.title}>Frozen Food BI Monitoring</h1>
        </div>
        <div className={styles.filters} role="group" aria-label="Filter halaman">
          <span className={styles.scope}>Filter:</span>
          <DateRangePicker label="Rentang tanggal" value={range} onChange={setRange} minDate={MIN} maxDate={MAX} weekStartsOn={1} locale="id-ID" presets={presets} />
          <ChipGroup label="Bulan" options={monthOptions} value={chips} onValueChange={setChips} />
          <Button variant="secondary" size="sm" onClick={reset} disabled={!active}>Reset</Button>
        </div>
      </header>

      {a.n === 0 ? (
        <section className={styles.card} aria-label="Tidak ada data">
          <EmptyState title="Tidak ada transaksi" description="Rentang tanggal dan bulan yang dipilih tidak beririsan. Ubah rentang atau atur ulang filter."
            action={<Button variant="secondary" onClick={reset}>Atur ulang filter</Button>} />
        </section>
      ) : (
        <>
          <section className={styles.kpis} aria-label="Angka utama">
            <Kpi label="Total omzet" value={a.totalJt >= 1000 ? a.totalJt / 1000 : a.totalJt} decimals={a.totalJt >= 1000 ? 2 : 1}
              suffix={a.totalJt >= 1000 ? " miliar" : " jt"}
              context={ms.length >= 2 ? `${first.label} – ${last.label}` : `Bulan ${first.label}`}
              change={ms.length >= 2 ? signed((last.omzetJt / first.omzetJt - 1) * 100) : undefined} />
            <Kpi label="Rata-rata bulanan" value={Math.round(rata)} suffix=" jt" context={peak ? `Puncak: ${peak.label}` : ""} />
            <Kpi label="Total transaksi" value={a.n} context="6.720 baris reguler" />
            <Kpi label="Pelanggan aktif" value={a.customers} context="Top 10 = 53% omzet" />
            <Kpi label="Produk aktif" value={a.products} context="Top 40 = 80% omzet" />
          </section>

          <div className={styles.viewModeBar} role="region" aria-label="Mode Monitoring">
            <div className={styles.viewModeLabel}>
              <span>Monitoring Kecerdasan Bisnis:</span>
            </div>
            <SegmentedControl
              label="Fokus Monitoring"
              options={viewOptions}
              value={viewMode}
              onValueChange={v => setViewMode(v as ViewMode)}
            />
          </div>

          <div className={styles.grid}>
            {/* Visualisasi Diagnostik: Dekomposisi Lonjakan & Distribusi Kuantitas Outlier */}
            {(viewMode === "semua" || viewMode === "diagnostik") && (
              <>
                <div className={styles.span7}>
                  <DiagnosticDecompositionCard analysis={a} />
                </div>

                <section className={`${styles.card} ${styles.span5}`} aria-label="Distribusi Kuantitas Pesanan">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.baris}>Distribusi Kuantitas (DUS)</CardTitle>
                    <span className={styles.badgeDiag}>Diagnostik</span>
                  </div>
                  <BarChart
                    data={qtyDistBars}
                    label="Transaksi"
                    period="Frekuensi pesanan per tier (Median = 3 DUS, Outlier >100)"
                    unit="pesanan"
                    averageLabel="Rata-rata"
                    valueLabel="Pesanan"
                    categoryLabel="Kuantitas DUS"
                    height={260}
                    showAverage={false}
                    formatValue={v => int(v)}
                  />
                </section>
              </>
            )}

            {/* Visualisasi Deskriptif: Pelanggan & Produk Teratas */}
            {(viewMode === "semua" || viewMode === "deskriptif") && (
              <>
                <section className={`${styles.card} ${styles.span6}`} aria-label="Pelanggan teratas">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.topPelanggan}>Top 10 Pelanggan</CardTitle>
                    <span className={styles.badgeDesc}>Deskriptif</span>
                  </div>
                  <BarChart data={custBars} label="Omzet" period="Juta rupiah per pembeli" unit="jt"
                    averageLabel="Rata-rata" valueLabel="Pembelian" categoryLabel="Pelanggan" height={260} showAverage={false} formatValue={v => int(v)} />
                </section>

                <section className={`${styles.card} ${styles.span6}`} aria-label="Produk teratas">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.topProduk}>Top 10 Produk</CardTitle>
                    <span className={styles.badgeDesc}>Deskriptif</span>
                  </div>
                  <BarChart data={prodBars} label="Omzet" period="Juta rupiah per produk" unit="jt"
                    averageLabel="Rata-rata" valueLabel="Penjualan" categoryLabel="Produk" height={260} showAverage={false} formatValue={v => int(v)} />
                </section>

                {(Object.keys(dailyMeta) as DailyKey[]).map(k => {
                  const b = dailyBars(k);
                  const meta = dailyMeta[k];
                  return (
                    <section key={k} className={`${styles.card} ${styles.span4}`} aria-label={meta.title}>
                      <div className={`${styles.cardHead} ${styles.headStack}`}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                          <CardTitle hint={k === "omzet" ? hints.omzet : k === "baris" ? hints.baris : undefined}>{dailyHeading(k, win[k])}</CardTitle>
                          <span className={styles.badgeDesc}>Deskriptif</span>
                        </div>
                        <div className={styles.control}>
                          <SegmentedControl label={`Rentang ${meta.label}`} options={windowOptions} value={win[k]}
                            onValueChange={v => setWin(w => ({ ...w, [k]: v as Win }))} />
                        </div>
                      </div>
                      <BarChart data={b.data} label={meta.label} period={win[k] === "bulan" ? "Agregat bulanan" : "Frekuensi harian"} unit={meta.unit} averageLabel={b.avgLabel} valueLabel={meta.label}
                        categoryLabel="Tanggal" height={200} formatValue={v => int(v)} />
                    </section>
                  );
                })}

                <section className={`${styles.card} ${styles.span12}`} aria-label="Omzet harian">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.harian}>Tren Omzet Harian</CardTitle>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span className={styles.badgeDesc}>Deskriptif</span>
                      <div className={styles.control}>
                        <SegmentedControl label="Rentang" options={spanOptions} value={span} onValueChange={v => setSpan(v as SpanKey)} />
                      </div>
                    </div>
                  </div>
                  <div className={styles.headline}>
                    <span className={styles.headlineLabel}>
                      {span === "all" ? "Rata-rata harian (seluruh periode)" : `Rata-rata ${span} hari terakhir`}
                    </span>
                    <span className={styles.headlineValue}>{rp(daily.days ? daily.total / daily.days : 0)} / hari</span>
                    <span className={styles.headlineSub}>
                      Total {int(daily.days)} hari: {rp(daily.total)}
                      {daily.change !== null && (
                        <span className={daily.change >= 0 ? styles.up : styles.down}> · {signed(daily.change)} vs periode sebelumnya</span>
                      )}
                    </span>
                  </div>
                  <LineChart label="Omzet harian" data={daily.data} unit="jt" height={240} categoryLabel="Tanggal"
                    series={daily.series} formatValue={v => one(v)} formatTick={v => int(v)} />
                </section>

                <section className={`${styles.card} ${styles.span6}`} aria-label="Pola hari">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.hari}>Pola Hari Kerja</CardTitle>
                    <span className={styles.badgeDesc}>Deskriptif</span>
                  </div>
                  <BarChart data={weekdayData} label="Omzet" period="Senin – Sabtu (Minggu tutup)" unit="jt" averageLabel="Rata-rata"
                    valueLabel="Omzet" categoryLabel="Hari" height={220} showAverage={false} formatValue={v => int(v)} />
                </section>

                <section className={`${styles.card} ${styles.span6}`} aria-label="Fase bulan">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.fase}>Siklus Tanggal (Fase Bulan)</CardTitle>
                    <span className={styles.badgeDesc}>Deskriptif</span>
                  </div>
                  <BarChart data={faseData} label="Omzet" period="Awal (1-10), Tengah (11-20), Akhir (21-31)" unit="jt" averageLabel="Rata-rata"
                    valueLabel="Omzet" categoryLabel="Bagian bulan" height={220} showAverage={false} formatValue={v => int(v)} />
                </section>
              </>
            )}

            {/* Visualisasi Diagnostik: Kohort, Ketergantungan, Pasangan */}
            {(viewMode === "semua" || viewMode === "diagnostik") && (
              <>
                {kohort.data.length > 0 && (
                  <section className={`${styles.card} ${styles.span8}`} aria-label="Pelanggan baru dan lama">
                    <div className={styles.cardHead}>
                      <CardTitle hint={hints.kohort}>Kohort Pelanggan (Baru vs Lama)</CardTitle>
                      <span className={styles.badgeDiag}>Diagnostik</span>
                    </div>
                    <RibbonChart data={kohort.data} series={[{ key: "lama", label: "Pelanggan lama" }, { key: "baru", label: "Pelanggan baru" }]}
                      colors={KOHORT_COLORS} monthTotals={kohort.totals} mode="tumpuk" ranked={false} label="Omzet pelanggan lama dan baru" unit="jt" height={260} formatValue={v => int(v)} />
                  </section>
                )}

                <section className={`${styles.card} ${kohort.data.length ? styles.span4 : styles.span12}`} aria-label="Belanja per pelanggan">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.belanja}>Belanja Rata-rata per Pelanggan</CardTitle>
                    <span className={styles.badgeDiag}>Diagnostik</span>
                  </div>
                  <BarChart data={belanjaBars} label="Belanja per pelanggan" period="Juta rupiah" unit="jt" averageLabel="Rata-rata"
                    valueLabel="Per pelanggan" categoryLabel="Bulan" height={240} formatValue={v => one(v)} />
                </section>

                <section className={`${styles.card} ${styles.span6}`} aria-label="Ketergantungan produk">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.bergantung}>Konsentrasi Single Buyer</CardTitle>
                    <span className={styles.badgeDiag}>Diagnostik</span>
                  </div>
                  <BarChart data={bergantungBars} label="Porsi pembeli terbesar" period="% omzet produk dari pembeli terbesar" unit="%"
                    averageLabel="Rata-rata" valueLabel="Dari satu pembeli" categoryLabel="Produk" height={240} showAverage={false} formatValue={v => int(v)} />
                </section>

                <section className={`${styles.card} ${styles.span6}`} aria-label="Ragam produk per pelanggan">
                  <div className={styles.cardHead}>
                    <CardTitle hint={hints.ragam}>Keragaman Produk per Pelanggan</CardTitle>
                    <span className={styles.badgeDiag}>Diagnostik</span>
                  </div>
                  <BarChart data={ragamBars} label="Median belanja" period="Median total belanja per tier varian SKU" unit="jt"
                    averageLabel="Rata-rata" valueLabel="Median belanja" categoryLabel="Jenis produk" height={240} showAverage={false} formatValue={v => one(v)} />
                </section>

                <div className={styles.span12}>
                  <MarketBasketNetwork pasangan={a.pasangan} />
                </div>
              </>
            )}

          </div>
        </>
      )}

      <footer className={styles.footer}>
        <span>6.778 transaksi tercatat</span>
        <span>•</span>
        <span>Total Rp 4,53 Miliar</span>
        <span>•</span>
        <span>Periode: April – September 2020</span>
      </footer>
    </main>
  );
}
