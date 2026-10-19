import re
import statistics
"""Cek angka chart di ../index.html terhadap dashboard-web/src/data.json (data asli, tidak ada di repo).
Jalankan: .venv/Scripts/python.exe check_laporan.py   (tambah --cetak untuk melihat angkanya)"""
import json, sys, datetime as dt, itertools, collections, pathlib

D = json.load(open('dashboard-web/src/data.json', encoding='utf8'))
base = dt.date.fromisoformat(D['base'])
rows = D['rows']
bulan = lambda day: (base + dt.timedelta(days=day)).month
tgl = lambda day: (base + dt.timedelta(days=day)).day

# omzet per bulan, dan pesanan besar (baris >= Rp40 jt)
JUMBO = 40_000_000
per_bulan = collections.Counter(); jumbo = collections.Counter()
for r in rows:
    m = bulan(r[0]); per_bulan[m] += r[7]
    if r[7] >= JUMBO: jumbo[m] += r[7]
jt = lambda v: round(v / 1e6, 1)
BULAN = [4, 5, 6, 7, 8, 9]
tanpa = [jt(per_bulan[m] - jumbo[m]) for m in BULAN]
besar = [jt(jumbo[m]) for m in BULAN]

# kurva pareto produk
prod = collections.Counter()
for r in rows: prod[r[2]] += r[7]
urut = sorted(prod.values(), reverse=True); tot = sum(urut)
kum = list(itertools.accumulate(urut))
n80 = next(i for i, v in enumerate(kum, 1) if v >= .8 * tot)
kurva = [round(v / tot * 100, 1) for v in kum]

# pasangan produk dalam satu nota (pelanggan x hari), antar produk berbeda
nota = collections.defaultdict(set)
for r in rows: nota[(r[1], r[0])].add(r[2])
pas = collections.Counter()
for s in nota.values():
    for a, b in itertools.combinations(sorted(s), 2): pas[(a, b)] += 1
top = [(D['produk'][a], D['produk'][b], c) for (a, b), c in pas.most_common(10)]

# nilai per nota pelanggan baru vs lama (baru = nota pada bulan pertama pelanggan itu belanja)
pertama = {}
for r in rows: pertama[r[1]] = min(pertama.get(r[1], 9999), r[0])
bm = {c: bulan(d) for c, d in pertama.items()}
nilai = collections.defaultdict(float)
for r in rows: nilai[(r[1], r[0])] += r[7]
b = [v for (c, d), v in nilai.items() if bulan(d) == bm[c]]
l = [v for (c, d), v in nilai.items() if bulan(d) != bm[c]]
aov_baru, aov_lama = sum(b) / len(b), sum(l) / len(l)

# perubahan belanja per pelanggan lama: rata-rata Agu-Sep dibanding rata-rata bulan sebelumnya (bulan pertama s.d. Juli)
pm = collections.Counter()
for r in rows: pm[(r[1], bulan(r[0]))] += r[7]
ubah = {}
for c, d in pertama.items():
    f = bulan(d)
    if f > 7: continue
    seb = sum(pm[(c, m)] for m in range(f, 8)) / (8 - f); ses = (pm[(c, 8)] + pm[(c, 9)]) / 2
    ubah[c] = (seb, ses)
urut_turun = sorted(ubah, key=lambda c: ubah[c][1] - ubah[c][0])[:10]
turun = dict(nama=[D['pelanggan'][c] for c in urut_turun], sebelum=[jt(ubah[c][0]) for c in urut_turun], sesudah=[jt(ubah[c][1]) for c in urut_turun], selisih=[jt(ubah[c][0] - ubah[c][1]) for c in urut_turun])
bersih = jt(sum(b - a for a, b in ubah.values()))
top5 = jt(sum(ubah[c][1] - ubah[c][0] for c in urut_turun[:5]))

# retensi per kelompok (bulan pertama belanja), menurut umur: % yang belanja lagi 1..5 bulan kemudian
aktif = collections.defaultdict(set)
for r in rows: aktif[bulan(r[0])].add(r[1])
# 10 pelanggan dengan omzet terbesar; disorot bila belanja per bulan sejak Agustus turun >= 35%
omzet_c = collections.Counter()
for r in rows: omzet_c[r[1]] += r[7]
atas = [c for c, _ in omzet_c.most_common(10)]
def ubah_pct(c):
    return None if c not in ubah else round(100 * (ubah[c][1] - ubah[c][0]) / ubah[c][0])
terbesar = dict(omzet=[round(omzet_c[c] / 1e6) for c in atas], persen=[round(100 * omzet_c[c] / sum(r[7] for r in rows), 1) for c in atas])

retensi = []
for k in BULAN[:-1]:
    anggota = [c for c in pertama if bm[c] == k]
    retensi.append(dict(bulan=k, n=len(anggota), persen=[round(100 * sum(c in aktif[m] for c in anggota) / len(anggota)) for m in range(k + 1, 10)]))

HASIL = dict(terbesar=terbesar, retensi=retensi,turun=turun, bersih=bersih, top5=top5,tanpa_pesanan_besar=tanpa, pesanan_besar=besar, n80=n80, kurva_pareto=kurva,
             pasangan=top, aov_baru=round(aov_baru), aov_lama=round(aov_lama))
if '--cetak' in sys.argv:
    print(json.dumps(HASIL, indent=1, ensure_ascii=False)); sys.exit()

html = pathlib.Path('../index.html').read_text(encoding='utf8')
def ada(nama, teks):
    assert teks in html, f'{nama}: {teks!r} tidak ada di index.html'
assert round(besar[4]) == 172 and tanpa[4] == 711.2; ada('pesanan besar', 'Rp %d jt dari 3 pesanan besar' % round(besar[4]))
ada('kurva pareto', json.dumps(kurva))
for a, b2, c in top: ada('pasangan', f'{c}')
ada('tren','const omzet = ' + json.dumps([jt(per_bulan[m]) for m in BULAN]))
for k in ('omzet', 'persen'): ada('terbesar ' + k, '"%s": ' % k + json.dumps(terbesar[k]))
print('ok: angka chart cocok dengan data')


# belanja lagi bulan berikutnya, pelanggan lama vs baru (Grafik 1.3)
n1 = h1 = n2 = h2 = 0
for m in range(5, 9):
    lama = [c for c in aktif[m] if bm[c] < m]; n1 += len(lama); h1 += sum(c in aktif[m + 1] for c in lama)
    baru = [c for c in pertama if bm[c] == m]; n2 += len(baru); h2 += sum(c in aktif[m + 1] for c in baru)
ada('retensi lama', '>%d</div>' % round(100 * h1 / n1)); ada('retensi baru', '>%d</div>' % round(100 * h2 / n2)); ada('n pelanggan lama', '%d pelanggan lama' % n1); ada('n baru', '%d pelanggan baru' % n2)

# kartu KPI bagian 1: 10 pelanggan terbesar dan pelanggan terbesar
tot_c = sum(omzet_c.values()); urut_c = [v for _, v in omzet_c.most_common()]
ada('kpi 10 terbesar', '>%d%%</span>' % round(100 * sum(urut_c[:10]) / tot_c)); ada('kpi rupiah 10', 'Rp %s miliar dari' % ('%.2f' % (sum(urut_c[:10]) / 1e9)).replace('.', ','))
ada('kpi terbesar', '>%s%%</span>' % ('%.1f' % (100 * urut_c[0] / tot_c)).replace('.', ',')); ada('kpi rupiah 1', 'Rp %d juta, dari satu' % round(urut_c[0] / 1e6))
ada('kpi kedua', '%s%% (Rp %d juta)' % (('%.1f' % (100 * urut_c[1] / tot_c)).replace('.', ','), round(urut_c[1] / 1e6)))
ada('kpi 80', '37 dari 181'); assert next(i for i, v in enumerate(itertools.accumulate(urut_c), 1) if v >= .8 * tot_c) == 37




# Grafik 1.1: pelanggan menurut hari sejak belanja terakhir (sampai hari terakhir data)
_akhir = max(r[0] for r in rows); _terakhir = {}; _om1 = collections.Counter()
for r in rows: _terakhir[r[1]] = max(_terakhir.get(r[1], -1), r[0]); _om1[r[1]] += r[7]
_seg = dict(pelanggan=[], persen=[], rata=[])
for _lo, _hi in [(0, 30), (31, 90), (91, 10**6)]:
    _cs = [c for c, d in _terakhir.items() if _lo <= _akhir - d <= _hi]
    _seg['pelanggan'].append(len(_cs)); _seg['persen'].append(round(100 * sum(_om1[c] for c in _cs) / sum(_om1.values()), 1)); _seg['rata'].append(round(sum(_om1[c] for c in _cs) / len(_cs) / 1e6, 1))
ada('segmen', 'const SEGMEN = ' + json.dumps(_seg))
ada('rata pasif judul', 'rata-rata Rp %s juta, seperempat dari pelanggan aktif' % str(_seg['rata'][1]).replace('.', ',')); assert abs(_seg['rata'][1] / _seg['rata'][0] - 0.25) < 0.02

# hari kalender, hari Minggu, jarak antar hari belanja (teks Grafik 3.1 dan KPI)
_hari = (dt.date(2020, 9, 30) - dt.date(2020, 4, 1)).days + 1
_minggu = [r for r in rows if (base + dt.timedelta(days=r[0])).weekday() == 6]
_dh = collections.defaultdict(set)
for r in rows: _dh[r[1]].add(r[0])
_g = [b - a for s_ in _dh.values() for a, b in zip(sorted(s_), sorted(s_)[1:])]
ada('jarak', '>%d</span>' % statistics.median(_g)); ada('jarak rata', '%d hari</span>' % round(statistics.mean(_g)))



# klaim Agustus: porsi 3 baris terbesar per bulan, dan hari menonjol (Q3 + 1,5 x IQR, tanpa Minggu)
_pr = {}
for _m in range(4, 10):
    _L = sorted([r[7] for r in rows if (base + dt.timedelta(days=r[0])).month == _m], reverse=True); _pr[_m] = 100 * sum(_L[:3]) / per_bulan[_m]
_lain = [round(_pr[m]) for m in (4, 5, 6, 7, 9)]
ada('porsi agustus', '(%s%%)' % ('%.1f' % _pr[8]).replace('.', ',')); ada('porsi bulan lain', 'hanya %d–%d%% omzet' % (min(_lain), max(_lain)))
_day = collections.Counter()
for r in rows: _day[r[0]] += r[7]
_v = [_day[d] for d in range(183) if (base + dt.timedelta(days=d)).weekday() != 6]; _q = statistics.quantiles(_v, n=4); _lim = _q[2] + 1.5 * (_q[2] - _q[0])
_t = collections.Counter()
for d in range(183):
    if _day[d] > _lim: _t[(base + dt.timedelta(days=d)).month] += _day[d]
_sh = {m: round(100 * _t[m] / per_bulan[m]) for m in range(4, 10) if _t[m]}
ada('hari menonjol', 'Di %s dari enam bulan, 1–2 hari yang menonjol menyumbang %d–%d%%' % ({5: 'lima'}.get(len(_sh), str(len(_sh))), min(_sh.values()), max(_sh.values())))

# Grafik 1.3: pelanggan yang belanja lagi bulan berikutnya, per bulan (April-Agustus), dan yang kembali dua bulan kemudian
_ak = collections.defaultdict(set)
for r in rows: _ak[(base + dt.timedelta(days=r[0])).month].add(r[1])
_NB = {4: 'April', 5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus'}
_j = [len(_ak[m]) for m in range(4, 9)]; _k = [len(_ak[m] & _ak[m + 1]) for m in range(4, 9)]
ada('retensi bulan', 'const KEMBALI = ' + json.dumps(dict(bulan=[_NB[m] for m in range(4, 9)], jumlah=_j, kembali=_k, persen=[round(100 * a / b) for a, b in zip(_k, _j)]), ensure_ascii=False))
_sk = sum(len(_ak[m] - _ak[m + 1]) for m in range(4, 8)); _bl = sum(len((_ak[m] - _ak[m + 1]) & _ak[m + 2]) for m in range(4, 8))


# Grafik 1.3: rentang per bulan yang disebut di judul dan catatan
_sk2 = [len(_ak[m] - _ak[m + 1]) for m in range(4, 8)]; _bl2 = [len((_ak[m] - _ak[m + 1]) & _ak[m + 2]) for m in range(4, 8)]
_bp = [round(100 * (a - b) / a) for a, b in zip(_j, _k)]; _kp = [round(100 * b / s_) for b, s_ in zip(_bl2, _sk2)]
ada('rentang belum', '(%d–%d%% per bulan)' % (min(_bp), max(_bp)))
ada('rentang kembali', '%d–%d%% belanja lagi dua bulan kemudian (dihitung dari %d–%d pelanggan per bulan' % (min(_kp), max(_kp), min(_sk2), max(_sk2)))

# catatan Grafik 1.1: pelanggan besar di kelompok mulai pasif, dan jeda belanja sendiri
_ak0 = max(r[0] for r in rows); _dd = collections.defaultdict(set); _oo = collections.Counter()
for r in rows: _dd[r[1]].add(r[0]); _oo[r[1]] += r[7]
_ls = {c: max(v) for c, v in _dd.items()}; _ps = [c for c in _dd if 31 <= _ak0 - _ls[c] <= 90]
_tp = max(_ps, key=lambda c: _oo[c]); _rk = {c: i for i, (c, _) in enumerate(_oo.most_common(), 1)}[_tp]
_nl = [c for c in _ps if len(_dd[c]) >= 4]
_lw = sum(1 for c in _nl if _ak0 - _ls[c] > 2 * statistics.median([b - a for a, b in zip(sorted(_dd[c]), sorted(_dd[c])[1:])]))
ada('pasif besar', 'peringkat omzet ke-%d, Rp %d juta' % (_rk, round(_oo[_tp] / 1e6)))
ada('pasif irama', 'dari %d pelanggan yang datanya cukup, %d sudah lewat' % (len(_nl), _lw))

# porsi tiga merek teratas (jumlah sebenarnya, bukan jumlah persen yang sudah dibulatkan)
_mer = collections.Counter()
for r in rows: _mer[D['merek'][r[3]]] += r[7]
ada('tiga merek', '(%s%%)' % ('%.1f' % (100 * sum(v for _, v in _mer.most_common(3)) / sum(_mer.values()))).replace('.', ','))
