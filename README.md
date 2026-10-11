# BI projects

Kumpulan proyek analisis dan dashboard. Tiap proyek punya foldernya sendiri.

| Proyek | Isi | Demo |
|---|---|---|
| [`frozen-food/`](frozen-food/) | Dashboard penjualan frozen food April sampai September 2020 (Vite + React + [Arc UI](https://uiarc.dev)) | GitHub Pages (lihat tab Environments) |

## Tentang data

Data mentah dan notebook analisis **tidak** ada di repo ini. Di versi publik, nama pelanggan diganti "Pelanggan 001" dan seterusnya (peringkat menurut omzet); angka, tanggal, dan nama produk tetap.

## Menjalankan dashboard frozen-food

```bash
cd frozen-food/dashboard-web
npm install
cp src/data.publik.json src/data.json   # atau buat data.json asli dari data mentah lewat build_dashboard_data.py
npm run dev
```

Setiap push ke `main` yang menyentuh `frozen-food/dashboard-web/` otomatis di-deploy ke GitHub Pages lewat `.github/workflows/deploy-frozen-food.yml`.
