"""Dashboard 1 halaman: riwayat penjualan frozen food Apr-Sep 2020 -> dashboard.png / dashboard.pdf"""
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# --- data (pembersihan sama dengan notebook, bagian 0) ---
df = pd.read_csv('all_data.csv')
df = df[df['Kode'].notna() & (df['Kode'] != 'KODEBARA')].copy()
for c in ['Qty', 'Harga', 'Jumlah']:
    df[c] = pd.to_numeric(df[c], errors='coerce')
df = df.dropna(subset=['Qty', 'Jumlah'])
df['Tanggal'] = pd.to_datetime(df['Tgl'], format='%Y-%m-%d')
df['Bln'] = df['Tanggal'].dt.month
nama = df['Nama'].astype(str).str.upper().str.strip().str.replace(r'\s+', ' ', regex=True)
df['Pelanggan'] = nama.str.replace(r'^[A-Z]{1,2}\s*-\s*', '', regex=True)
df['Barang'] = df['Barang'].astype(str).str.strip()

BLN = {4: 'Apr', 5: 'Mei', 6: 'Jun', 7: 'Jul', 8: 'Agu', 9: 'Sep'}
HARI = {0: 'Senin', 1: 'Selasa', 2: 'Rabu', 3: 'Kamis', 4: 'Jumat', 5: 'Sabtu'}
jt = lambda x: f'{x / 1e6:,.0f} jt'
rp = lambda x: f'Rp{x / 1e6:,.1f} jt'

total = df['Jumlah'].sum()
bulan = df.groupby('Bln')['Jumlah'].sum()
rata = bulan.mean()
top_b = bulan.idxmax()
n_baris = df.groupby('Bln').size()
pel = df.groupby('Pelanggan')['Jumlah'].sum().sort_values(ascending=False)
brg = df.groupby('Barang')['Jumlah'].sum().sort_values(ascending=False)
hari = df[df['Tanggal'].dt.dayofweek < 6].groupby(df['Tanggal'].dt.dayofweek)['Jumlah'].sum()
agu = df[df['Bln'] == 8]
agu3 = agu.nlargest(3, 'Jumlah')['Jumlah'].sum()

# --- tampilan ---
INK, MUTED, ACCENT, BASE = '#1f2937', '#6b7280', '#e4572e', '#4c78a8'
plt.rcParams.update({'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.edgecolor': '#cbd5e1', 'axes.titleweight': 'bold', 'axes.titlelocation': 'left',
                     'axes.titlesize': 10.5, 'axes.labelcolor': MUTED, 'xtick.color': MUTED, 'ytick.color': MUTED})
fig = plt.figure(figsize=(16.5, 11.7), facecolor='white')  # A4 landscape
gs = fig.add_gridspec(3, 12, left=0.04, right=0.97, top=0.78, bottom=0.05, hspace=0.45, wspace=1.2)

fig.text(0.04, 0.955, 'Riwayat Penjualan Frozen Food — April s.d. September 2020', fontsize=20, fontweight='bold', color=INK)
fig.text(0.04, 0.925, f'{len(df):,} baris transaksi · {df["Tanggal"].min():%d %b %Y} – {df["Tanggal"].max():%d %b %Y} · sumber: 6 berkas Excel pembelian',
         fontsize=10, color=MUTED)

kpi = [('Total omzet', f'Rp{total / 1e9:,.2f} M'), ('Rata-rata / bulan', rp(rata)),
       ('Baris transaksi', f'{len(df):,}'), ('Pelanggan unik', f'{df["Pelanggan"].nunique()}'),
       ('Produk unik', f'{df["Barang"].nunique()}')]
for i, (k, v) in enumerate(kpi):
    x = 0.04 + i * 0.1875
    fig.patches.append(plt.Rectangle((x, 0.80), 0.175, 0.095, transform=fig.transFigure, color='#f1f5f9', zorder=0))
    fig.text(x + 0.01, 0.865, k, fontsize=9, color=MUTED)
    fig.text(x + 0.01, 0.815, v, fontsize=19, fontweight='bold', color=INK)

# 1. omzet bulanan
ax = fig.add_subplot(gs[0, :5])
bar = ax.bar([BLN[m] for m in bulan.index], bulan.values / 1e6, color=[ACCENT if m == top_b else BASE for m in bulan.index])
ax.axhline(rata / 1e6, color=MUTED, ls='--', lw=1)
ax.text(5.45, rata / 1e6 + 8, f'rata-rata {jt(rata)}', ha='right', color=MUTED, fontsize=8)
ax.bar_label(bar, fmt='%.0f', padding=2, fontsize=8.5, color=INK)
ax.set_title('Omzet per bulan (juta Rp)')
ax.set_ylim(0, bulan.max() / 1e6 * 1.15)

# 2. omzet harian
ax = fig.add_subplot(gs[0, 5:])
h = df.groupby('Tanggal')['Jumlah'].sum().asfreq('D', fill_value=0) / 1e6
ax.plot(h.index, h.values, color=BASE, lw=0.8, alpha=0.5, label='harian')
ax.plot(h.index, h.rolling(7, center=True).mean(), color=INK, lw=1.8, label='rata-rata 7 hari')
pk = h.nlargest(3)
ax.scatter(pk.index, pk.values, color=ACCENT, zorder=3, s=22)
for d, v in pk.items():
    ax.annotate(f'{d:%d %b}: {v:,.0f} jt', (d, v), xytext=(6, -3), textcoords='offset points', fontsize=8, color=ACCENT)
ax.set_title('Omzet harian (juta Rp) — tiga puncak ditandai')
ax.legend(frameon=False, fontsize=8, loc='upper left', bbox_to_anchor=(0.0, 0.88))

# 3. top pelanggan
ax = fig.add_subplot(gs[1:, :4])
t = pel.head(10)[::-1]
ax.barh([s[:28] for s in t.index], t.values / 1e6, color=BASE)
ax.bar_label(ax.containers[0], labels=[f'{v / total:.1%}' for v in t.values], padding=3, fontsize=8, color=INK)
ax.set_title(f'10 pelanggan teratas = {pel.head(10).sum() / total:.0%} omzet (dari {len(pel)} pelanggan)')
ax.set_xlabel('juta Rp'); ax.set_xlim(0, t.max() / 1e6 * 1.18)

# 4. top produk
ax = fig.add_subplot(gs[1:, 4:8])
t = brg.head(10)[::-1]
ax.barh([s.split(' X ')[0].title()[:30] for s in t.index], t.values / 1e6, color=[ACCENT if v == brg.iloc[0] else BASE for v in t.values])
ax.bar_label(ax.containers[0], labels=[f'{v / total:.1%}' for v in t.values], padding=3, fontsize=8, color=INK)
ax.set_title(f'10 produk teratas = {brg.head(10).sum() / total:.0%} omzet (dari {len(brg)} produk)')
ax.set_xlabel('juta Rp'); ax.set_xlim(0, t.max() / 1e6 * 1.18)

# 5. omzet per hari
ax = fig.add_subplot(gs[1, 8:])
bar = ax.bar([HARI[d] for d in hari.index], hari.values / 1e6, color=[ACCENT if d == hari.idxmax() else BASE for d in hari.index])
ax.bar_label(bar, fmt='%.0f', padding=2, fontsize=8.5, color=INK)
ax.set_title('Omzet per hari dalam seminggu (juta Rp)')
ax.set_ylim(0, hari.max() / 1e6 * 1.15)

# 6. temuan
ax = fig.add_subplot(gs[2, 8:]); ax.axis('off')
# ringkasan sama dengan Bagian 7 notebook (analisis_frozen_food.ipynb)
akhir = df[df['Tanggal'].dt.day >= 21]['Jumlah'].sum()
temuan = [
    ('Deskriptif', f'Omzet {BLN[top_b]} tertinggi ({jt(bulan[top_b])}), {BLN[bulan.idxmin()]} terendah ({jt(bulan.min())}); Apr→Sep {bulan.iloc[-1] / bulan.iloc[0] - 1:+.1%}.'),
    ('Deskriptif', f'Hari tersibuk {HARI[hari.idxmax()]}; akhir bulan (tgl 21-31) menyerap {akhir / total:.0%} omzet (payday restock).'),
    ('Deskriptif', f'Top 10 pembeli = {pel.head(10).sum() / total:.1%} omzet; {pel.index[0].title()} sendiri {pel.iloc[0] / total:.1%}.'),
    ('Deskriptif', f'{brg.index[0].split(" X ")[0].title()} = {brg.iloc[0] / total:.1%} omzet.'),
    ('Diagnostik', f'Lonjakan {BLN[top_b]} bukan ekspansi pasar: 3 nota raksasa = {jt(agu3)} ({agu3 / bulan[top_b]:.1%} omzet bulan itu).'),
]
y = 0.98
ax.text(0, y, 'Temuan utama', fontsize=11, fontweight='bold', color=INK, va='top'); y -= 0.14
import textwrap
for tag, s in temuan:
    w = textwrap.fill(s, 62)
    ax.text(0, y, f'[{tag}] ', fontsize=8, fontweight='bold', color=ACCENT if tag == 'Diagnostik' else BASE, va='top')
    ax.text(0.17, y, w, fontsize=8.5, color=INK, va='top')
    y -= 0.05 + 0.093 * (w.count('\n') + 1)

fig.savefig('dashboard.png', dpi=150)
fig.savefig('dashboard.pdf')
for t in temuan: print(t)
