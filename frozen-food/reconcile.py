import pandas as pd, numpy as np

a = pd.read_csv('all_sheets.csv')
for c in ['Qty', 'Harga', 'Jumlah']:
    a[c] = pd.to_numeric(a[c], errors='coerce')
a = a.dropna(subset=['Jumlah'])

# sheet rekap = sheet dengan baris terbanyak per file
n = a.groupby(['File', 'Sheet']).size().rename('n').reset_index()
rekap = n.sort_values('n', ascending=False).drop_duplicates('File').set_index('File')['Sheet']
a['Rekap'] = a['Sheet'] == a['File'].map(rekap)
R, B = a[a['Rekap']].copy(), a[~a['Rekap']].copy()

print('Sheet rekap:', rekap.to_dict())
print('Baris rekap:', len(R), '| baris sheet merek:', len(B), '| jumlah sheet:', a.groupby('File')['Sheet'].nunique().sum())

key = ['File', 'Tgl', 'Kode', 'Qty', 'Harga', 'Jumlah', 'Nama']
for d in (R, B):
    d['Tgl'] = d['Tgl'].astype(str)
    d['Nama'] = d['Nama'].astype(str).str.strip()
    d['_occ'] = d.groupby(key).cumcount()
k2 = key + ['_occ']
m = R.merge(B, on=k2, how='outer', suffixes=('_rekap', '_merek'), indicator=True)
print(m['_merge'].value_counts())

only_r = m[m['_merge'] == 'left_only']
only_b = m[m['_merge'] == 'right_only']
cols = ['File', 'Tgl', 'Kode', 'Qty', 'Harga', 'Jumlah', 'Nama']
print('\nHanya di REKAP (tidak ada di sheet merek):', len(only_r), '| nominal', f"{only_r['Jumlah'].sum():,.0f}")
print(only_r[cols].to_string())
print('\nHanya di SHEET MEREK (tidak ada di rekap):', len(only_b), '| nominal', f"{only_b['Jumlah'].sum():,.0f}")
print(only_b[cols + ['Sheet_merek']].to_string())
