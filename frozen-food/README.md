# Frozen Food BI: Executive Monitoring & Sales Analytics Dashboard

Dashboard Business Intelligence interaktif modern yang berfokus penuh pada **visualisasi monitoring data transaksi penjualan Frozen Food** periode **April – September 2020** (6.778 baris transaksi senilai **Rp 4,53 Miliar**).

🌐 **Demo Live di GitHub Pages:** [https://farhanwew.github.io/bi-projects/](https://farhanwew.github.io/bi-projects/)  
Repository: [https://github.com/farhanwew/bi-projects](https://github.com/farhanwew/bi-projects)

---

## 🎙️ Naskah Presentasi Perwakilan Kelompok (Siap Angkat Tangan & Diutarakan)

Bagian ini disediakan secara terpisah di README sebagai panduan berbicara komprehensif bagi perwakilan kelompok saat sesi presentasi kelas / rapat evaluasi bisnis:

> *"Selamat pagi/siang Bapak/Ibu Dosen dan rekan-rekan sekalian.*  
> *Perkenankan perwakilan dari kelompok kami untuk angkat tangan dan mengutarakan hasil temuan **Business Intelligence** dari analisis 6.778 transaksi penjualan Frozen Food periode April hingga September 2020 (total omzet tercatat **Rp 4,53 Miliar**):*
>
> ### 📊 1. Temuan Descriptive Analytics (Apa yang Terjadi?)
> 1. **Puncak Omzet Agustus:** Omzet bulanan mencapai rekor tertinggi pada **Agustus 2020 sebesar Rp 883,31 Juta** (+8,9% dari Juli, dan +17,0% di atas rata-rata bulanan Rp 755,05 Juta).
> 2. **Anomali Volume Transaksi:** Meskipun omzet naik, jumlah transaksi/baris barang di bulan Agustus justru **turun 19,4%** (dari 1.325 menjadi 1.068 baris). Artinya, lonjakan omzet berasal dari nilai per transaksi yang melonjak tajam (+35,1% per baris, dari Rp 612 rb ke Rp 827 rb), bukan penambahan frekuensi pesanan.
> 3. **Dominasi Produk MIN-001 (Minaku Otak-Otak 500g):** Produk ini menyumbang **Rp 967,69 Juta (21,4% total omzet 6 bulan)** dan meroket menjadi **32,5% omzet Agustus** (Rp 287,48 Juta).
> 4. **Prinsip Pareto:** Sebanyak 10 pelanggan teratas (5,5% pelanggan) menguasai **53,0% seluruh omzet bisnis**, dan hanya 40 produk (13,5%) yang menyumbang 80% omzet.
> 5. **Pola Temporal:** Hari Rabu (Rp 1.025 Jt), Jumat (Rp 883 Jt), dan Senin (Rp 792 Jt) menyerap omzet tertinggi; Kamis terendah (Rp 556 Jt); Minggu libur operasional. Tanggal 21–31 menyerap 38% omzet total mencerminkan siklus belanja akhir bulan.
>
> ---
>
> ### 🔍 2. Temuan Diagnostic Analytics (Mengapa Terjadi & Akar Masalahnya?)
> 1. **Akar Lonjakan Agustus (Outlier Kuantitas Pembelian Ekstrem):**
>    - Median kuantitas pesanan normal untuk produk MIN-001 satuan DUS adalah **3 DUS**.
>    - Namun di bulan Agustus terdeteksi **3 baris transaksi jumbo dari 2 orang pembeli**:
>      - **Pelanggan 009 (3 Agustus):** 200 DUS (Rp 63.200.000) $\rightarrow$ **67× median**!
>      - **Pelanggan 009 (13 Agustus):** 200 DUS (Rp 63.200.000) $\rightarrow$ **67× median**!
>      - **Pelanggan 017 (3 Agustus):** 150 DUS (Rp 45.750.000) $\rightarrow$ **50× median**!
>    - Kuantitas pesanan 150–200 DUS ini adalah **50× hingga 67× lipat dari median pembelian kebanyakan pelanggan**! Gabungan ketiga transaksi ini bernilai **Rp 172,15 Juta atau menyumbang 19,5% dari omzet Agustus**.
> 2. **Ilusi Kenaikan Pasar (Dekomposisi Penjualan):**
>    - Jika 3 transaksi jumbo tersebut dikeluarkan, omzet Agustus sebenarnya hanya **Rp 711,16 Juta**, yang artinya **TURUN 12,3% dari bulan Juli** (Rp 811,36 Juta).
>    - *Diagnosa:* Permintaan pasar reguler di bulan Agustus sebenarnya melemah, tetapi tertutupi oleh order grosir 2 akun pembeli.
> 3. **Penyebab Anjloknya Omzet September (-15,4%):**
>    - Penurunan September sebesar Rp 136,23 Juta bukan karena krisis pasar umum, melainkan karena **Pelanggan 009 tidak melakukan repeat order sama sekali (Rp 0 / churn)** dan Pelanggan 017 hanya belanja normal Rp 9,27 Juta. Penjualan ke seluruh pelanggan lain justru naik +3,7% (dari Rp 711,2 Jt ke Rp 737,8 Jt).
> 4. **Risiko Ketergantungan Pembeli Tunggal (Single Buyer Dependency):**
>    - **3 dari 10 produk dengan omzet terbesar** memiliki lebih dari 50% penjualannya hanya bergantung pada satu pelanggan tunggal (misal Indoeskrim 8 Ltr Vanilla: 95% dibeli Pelanggan 001).
> 5. **Asosiasi Keranjang Belanja (Market Basket Analysis):**
>    - Pasangan produk lintas merek **Belfoods Sosis Ayam + Jofrans Nugget Ayam** memiliki *lift score* **4,3×** di atas frekuensi acak (Okey Sosis + Okey Stick paling sering: 183 kali, lift 3,7×), membuktikan kebiasaan belanja paket lauk beku komplementer.
>
> ---
>
> ### 💡 3. Rekomendasi Solusi Bisnis
> - **Key Account Retention:** Berikan kontrak suplai khusus B2B untuk pembeli volume besar seperti Pelanggan 009 & Pelanggan 017 agar pesanan berulang tetap stabil.
> - **Diversifikasi Produk Kunci:** Perluas basis pembeli untuk 3 SKU produk yang >50% transaksinya bergantung pada single buyer.
> - **Paket Bundling:** Kembangkan promo bundling lauk beku komplementer (seperti Belfoods Sosis Ayam + Jofrans Nugget Ayam, *lift score* 4,3×).
>
> *Sekian temuan dari kelompok kami, terima kasih!"*

---

## 📋 Audit Kualitas Data & Exploratory Data Analysis (EDA)

Evaluasi reliabilitas teknis dataset dari 6 workbook Excel (`april 2020.xlsx` s.d. `sep 2020.xlsx`):

1. **Cakupan Dataset:** 6.778 total baris transaksi tercatat dengan nilai omzet bruto **Rp 4.530.330.620**.
2. **77 Baris Anomali Diskon / Selisih Perhitungan (1,1%):** Kolom `JUMLAH` tercatat lebih kecil dari hasil perkalian `QTY × HARGA`, dengan akumulasi selisih sebesar **Rp 4.436.797**. Contoh: baris 23 Agustus mencatat 27 Pack × Rp 28.900 = Rp 780.300, tetapi `JUMLAH` Rp 390.150 (diskon 50%). Dashboard selalu memakai nilai `JUMLAH` aktual kasir.
3. **58 Baris Transaksi Rp 0 (0,9%):** Baris tanpa nominal pendapatan, diidentifikasi sebagai sampel promosi, tester, bonus, atau penggantian barang rusak.
4. **73 Baris Transaksi Duplikat Identik:** Seluruh kolom (tanggal, pelanggan, barang, qty, harga, jumlah) sama persis pada hari yang sama tanpa nomor nota unik.
5. **Normalisasi Master Data Pelanggan:** Harmonisasi variasi nama toko (seperti prefix `C - TOKO...` vs `TOKO...` dan pergantian nama `(MITRAKU)`).
6. **Segmentasi Tier Prefix F:** Pelanggan dengan awalan `F -` memiliki tier harga khusus yang terbukti berbeda secara statistik dibanding pelanggan reguler.
7. **Heterogenitas Satuan Produk:** Produk dicatat dalam satuan berbeda (DUS, PACK, BAL, PAIL, KG) sehingga kuantitas dianalisis secara independen per satuan.

---

## 🎨 Fokus Antarmuka UI/UX Dashboard Monitoring

Halaman web dashboard berfokus murni pada **pengalaman visual monitoring eksekutif yang bersih, elegan, dan interaktif (Arc UI Design System)**:

1. **Header Bersih & Elegan (Sticky Top Bar):**
   - **Logo & Judul:** `❄️ Frozen Food BI Monitoring` dengan subjudul analitik dan penanda status dataset asli (*April – September 2020*).
   - Tampilan header kini lebih bersih dan tidak dipadati tombol navigasi mode monitoring terpisah.
2. **Section Khusus Filter (Kecil, Rapi & Ringkas):**
   - **Panel Filter Khusus:** Ditempatkan dalam section ramping tersendiri tepat di bawah header.
   - **DateRangePicker:** Fleksibilitas memilih rentang tanggal kustom atau preset periode (Seluruh periode, Q2, Q3, 30 hari terakhir).
   - **ChipGroup Bulan:** Tombol pill filter cepat per bulan (April – September 2020).
   - **Tombol Reset Filter:** Otomatis muncul saat ada filter aktif untuk mengembalikan semua visualisasi ke kondisi default dalam satu klik.
3. **5 Kartu KPI Eksekutif Utama (Animated Counter & Id-ID Locale):**
   - **Total Omzet:** Rp 4,53 Miliar (lengkap dengan badge tren pertumbuhan MoM).
   - **Rata-rata Bulanan:** Rp 755 Juta (dengan penanda puncak penjualan tertinggi di bulan Agustus).
   - **Total Transaksi:** 6.778 Transaksi tercatat (6.720 baris reguler).
   - **Pelanggan Aktif:** 181 Pembeli/Toko (Top 10 menyumbang 53% omzet).
   - **Produk Aktif:** 297 SKU aktif (Top 40 menyumbang 80% omzet).
4. **Tata Letak All-in-One Terpadu:**
   - Seluruh visualisasi disajikan secara utuh dan mengalir (*all-in-one flow*) tanpa perlu berpindah tab atau mode tampilan.
   - Pemilik bisnis dapat langsung melihat korelasi antara angka ringkasan eksekutif, anomali pesanan borongan, tren harian, hingga peluang bundling produk dalam satu halaman yang komprehensif.
5. **Analisis Diagnostik & Anomali Mendalam:**
   - **Dekomposisi Kenaikan Agustus:** Kartu visual yang membongkar bahwa rekor omzet Agustus didorong oleh 3 pesanan raksasa (200 dus & 150 dus) dari Pelanggan 009 & Pelanggan 017 senilai Rp 172,15 Jt (19,5% omzet Agustus).
   - **Distribusi Kuantitas Pesanan (DUS):** Histogram pembagian ukuran pesanan (median 3 dus vs outlier ekstrem >100 dus).
   - **Ribbon Chart Kohort Pelanggan:** Diagram pita berlapis membandingkan kontribusi pendapatan dari pelanggan baru vs pelanggan setia yang berulang belanja.
   - **Konsentrasi Single Buyer:** Mengidentifikasi produk-produk yang penjualannya bergantung lebih dari 50% pada satu pelanggan saja.
   - **Keragaman Produk per Pelanggan:** Menganalisis median belanja berdasarkan variasi SKU yang dibeli.
6. **Graf Jaringan Asosiasi Produk Interaktif (Market Basket Network Graph):**
   - **Model Graf Jaringan Berbasis Fisika:** Node produk melayang interaktif dengan tautan tebal berdasarkan frekuensi dibeli bersamaan pada nota yang sama.
   - **Deteksi Otomatis Paket Bundling (Lift Score ≥ 2.0×):** Menyorot pasangan barang dengan sinergi pembelian tinggi lintas merek maupun satu merek.
   - **Filter Kekuatan Relasi & Kontrol Interaktif:** Slider fleksibel untuk menyaring ambang kekuatan pasangan barang, tombol zoom in/out, fit to screen, serta kartu wawasan mengambang saat node/garis dipilih.
   - **Tabel Rekomendasi Aksi Bisnis:** Tabel detail yang dapat disembunyikan/dibuka, menyajikan confidence A&rarr;B, persentase pelanggan, dan saran strategi promo toko.
7. **Visualisasi Deskriptif Komprehensif:**
   - Peringkat 10 Pelanggan Terbesar & 10 Produk Terlaris, Tren Omzet Harian (LineChart dengan rata-rata 7 hari), Breakdown Metrik Bulanan/Harian, Pola Hari Kerja, dan Siklus Tanggal (Awal/Tengah/Akhir bulan).
8. **Bahasa Ramah Pemilik Bisnis & Tooltip Kontekstual Pintar (`InfoHint`):**
   - Seluruh istilah teknis disajikan dengan bahasa Indonesia yang komunikatif dan langsung dapat dipahami oleh pengambil keputusan dan pemilik toko.
   - Ikon peringatan interaktif (`!`) pada judul setiap kartu visualisasi menampilkan intisari temuan penting saat diarahkan kursor.

---

## 🛠️ Menjalankan Dashboard Secara Lokal

```bash
cd frozen-food/dashboard-web
npm install
npm run dev
```

Untuk memverifikasi integrasi data dan build:
```bash
node --experimental-strip-types scripts/check.ts
npm run build
```

---

## 🚀 Deployment Otomatis ke GitHub Pages
Pipeline GitHub Actions di `.github/workflows/deploy-frozen-food.yml` otomatis membangun dan mendeploy dashboard ke GitHub Pages setiap ada commit baru di branch `main`.
