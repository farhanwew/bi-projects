"""all_data.csv -> dashboard-web/src/data.json

Dashboard memfilter per tanggal dan bulan di browser, jadi yang dikirim adalah baris transaksi reguler
(Jumlah > 0) dalam bentuk ringkas, bukan agregat. `ref` berisi angka acuan dari pandas; dashboard-web/scripts/check.ts
mencocokkan hasil hitung di TypeScript dengan angka ini.

Pembersihan sama dengan notebook bagian 0 dan 2. Jalankan dari root repo: uv run python build_dashboard_data.py
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

OUT = Path('dashboard-web/src/data.json')
BASE = pd.Timestamp('2020-04-01')

df = pd.read_csv('all_data.csv')
df = df[df['Kode'].notna() & (df['Kode'] != 'KODEBARA')].copy()
for c in ['Qty', 'Harga', 'Jumlah']:
    df[c] = pd.to_numeric(df[c], errors='coerce')
df = df.dropna(subset=['Qty', 'Jumlah']).copy()
df['Tanggal'] = pd.to_datetime(df['Tgl'], format='%Y-%m-%d')
nama = df['Nama'].astype(str).str.upper().str.strip().str.replace(r'\s+', ' ', regex=True)
df['Prefix'] = nama.str.extract(r'^([A-Z]{1,2})\s*-\s*')[0].fillna('REGULER')
df['Pelanggan'] = nama.str.replace(r'^[A-Z]{1,2}\s*-\s*', '', regex=True)
# Dua toko berganti nama di tengah periode (awalan "(MITRAKU)" hilang di bulan berikutnya):
# awalan "(MITRAKU)" dibuang hanya bila nama tanpa awalan juga muncul, supaya tidak dihitung dua pelanggan.
polos = df['Pelanggan'].str.replace(r'^\(MITRAKU\)\s*', '', regex=True)
df['Pelanggan'] = df['Pelanggan'].where(~polos.isin(set(df['Pelanggan'])), polos)
df['Barang'] = df['Barang'].astype(str).str.strip()
df['Satuan'] = df['Satuan'].astype(str).str.strip().str.upper().replace({'PAC': 'PACK', 'BALL': 'BAL'})
df['Merek'] = df['Kode'].str.split('-').str[0].str.strip()

d = df[df['Jumlah'] > 0].copy()
total = int(d['Jumlah'].sum())
d['Day'] = (d['Tanggal'] - BASE).dt.days
d['Bln'] = d['Tanggal'].dt.month
title = lambda s: s.title().replace(' Gr ', ' gr ').replace(' Kg ', ' kg ')

# --- kamus: indeks menggantikan string di tiap baris
cust = sorted(d['Pelanggan'].unique())
prod = sorted(d['Barang'].unique())
merek = sorted(d['Merek'].unique())
satuan = sorted(d['Satuan'].unique())
ix = lambda items: {v: i for i, v in enumerate(items)}
ci, pi, mi, si = ix(cust), ix(prod), ix(merek), ix(satuan)
d = d.sort_values(['Day', 'Pelanggan', 'Barang']).reset_index(drop=True)
rows = [[int(r.Day), ci[r.Pelanggan], pi[r.Barang], mi[r.Merek], int(r.Qty), si[r.Satuan], int(r.Harga), int(r.Jumlah),
         int(r.Prefix == 'F')] for r in d.itertuples()]

# --- angka acuan (oracle) dihitung terpisah dengan pandas
m = d.groupby('Bln')['Jumlah'].sum()
cu = d.groupby('Pelanggan')['Jumlah'].sum().sort_values(ascending=False)
pr = d.groupby('Barang')['Jumlah'].sum().sort_values(ascending=False)
n80 = lambda s: int((s.cumsum() / total < 0.8).sum() + 1)
agu = d[d['Bln'] == 8]
v = d[d['Harga'] > 0].copy()
v['T'] = np.where(v['Prefix'] == 'F', 'F', 'L')
p = v.groupby(['Barang', 'Satuan', 'T'])['Harga'].agg(['median', 'size']).unstack('T').dropna()
p = p[(p[('size', 'F')] >= 5) & (p[('size', 'L')] >= 5)]
sel = (p[('median', 'F')] / p[('median', 'L')] - 1) * 100
shoe = d[d['Barang'].str.contains('SHOESTRING', case=False)]
sh = lambda mk, b: int(shoe[(shoe['Merek'] == mk) & (shoe['Bln'] == b)]['Jumlah'].sum())
ref = dict(
    total=total, n=len(d), customers=len(cust), products=len(prod),
    month={int(k): int(x) for k, x in m.items()},
    top10Pct=round(cu.head(10).sum() / total * 100, 1), produk80=n80(pr), pelanggan80=n80(cu),
    top3Agu=int(agu.nlargest(3, 'Jumlah')['Jumlah'].sum()),
    tier=dict(pasang=len(sel), pctLebihMahal=round(float((sel > 0).mean() * 100), 1), medianPct=round(float(sel.median()), 1)),
    salesAkun=int(d[d['Pelanggan'].str.contains('SALES')]['Pelanggan'].value_counts().iloc[0]),  # akun sales dengan baris terbanyak
    medianDus=float(d[d['Satuan'] == 'DUS']['Qty'].median()), medianPack=float(d[d['Satuan'] == 'PACK']['Qty'].median()),
    lutosaJul=sh('LUTOSA', 7), lutosaAgu=sh('LUTOSA', 8), bartsAgu=sh('BART', 8),
    fase=[int(d[(d['Tanggal'].dt.day >= a) & (d['Tanggal'].dt.day <= b)]['Jumlah'].sum()) for a, b in ((1, 10), (11, 20), (21, 31))],
    weekday=[int(x) for x in d.groupby(d['Tanggal'].dt.dayofweek)['Jumlah'].sum().reindex(range(6)).fillna(0)],
)
# pelanggan baru per bulan (bulan pertama belanja di seluruh data), ketergantungan produk, keragaman produk per pelanggan
d['Kohort'] = d['Pelanggan'].map(d.groupby('Pelanggan')['Bln'].min())
ref['baru'] = {int(k): int(x) for k, x in d[d['Kohort'] == d['Bln']].groupby('Bln')['Jumlah'].sum().items()}
pc = d.groupby(['Barang', 'Pelanggan'])['Jumlah'].sum()
ref['bergantung'] = round(float(pc.groupby(level=0).max().reindex(pr.index[:10]).div(pr.iloc[:10]).iloc[0] * 100), 1)
cb = d.groupby('Pelanggan').agg(jenis=('Barang', 'nunique'), omzet=('Jumlah', 'sum'))
grp = pd.cut(cb['jenis'], [0, 5, 11, 20, np.inf])
ref['ragam'] = [dict(n=int(len(g)), medianJt=round(float(g['omzet'].median()) / 1e6, 2)) for _, g in cb.groupby(grp, observed=False)]

assert total == 4_530_330_620 and len(d) == 6720 and len(cust) == 181 and ref['baru'][8] == 241_695_500 and len(prod) == 297
assert ref['month'][8] == 883_314_940 and ref['top10Pct'] == 53.0 and ref['produk80'] == 40 and ref['top3Agu'] == 172_150_000
assert round(pr.iloc[0] / total * 100, 1) == 21.4 and ref['salesAkun'] == 136

data = dict(
    base='2020-04-01', hari=int(d['Day'].max()),
    pelanggan=[title(c) for c in cust], produk=[title(x) for x in prod], merek=merek, satuan=[s.lower() for s in satuan],
    rows=rows,
    kualitas=dict(barisRp0=int((df['Jumlah'] <= 0).sum()), duplikat=int(df.duplicated(['File', 'Tgl', 'Kode', 'Qty', 'Harga', 'Jumlah', 'Nama']).sum()),
                  selisihHarga=int((abs(d['Qty'] * d['Harga'] - d['Jumlah']) > 1000).sum()), barisTotal=len(df)),
    ref=ref,
)
dump = lambda path, obj: path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
OUT.parent.mkdir(parents=True, exist_ok=True)
dump(OUT, data)

# Varian publik (dikomit ke repo, dipakai CI): nama pelanggan diganti peringkat omzetnya. Angka, tanggal, dan produk tetap.
rank = {name: i + 1 for i, name in enumerate(cu.index)}
PUBLIK = OUT.with_name('data.publik.json')
dump(PUBLIK, {**data, 'pelanggan': [f'Pelanggan {rank[c]:03d}' for c in cust]})
print(f'ok: {OUT} ({OUT.stat().st_size / 1024:.0f} KB, {len(rows)} baris) dan {PUBLIK.name}')
