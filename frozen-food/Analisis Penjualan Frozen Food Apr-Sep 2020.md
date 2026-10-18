# Analisis penjualan frozen food, April–September 2020

## Ringkasan

Data mencatat **6.778 baris produk terjual** dengan total nilai **Rp4.530.330.620**. Omzet tertinggi terjadi pada **Agustus: Rp883.314.940**. Kenaikan Agustus terutama terkait tiga baris pembelian besar produk **MIN-001 (Minaku Otak Otak 500 gr × 20 pack)** oleh dua pembeli, dengan nilai gabungan **Rp172.150.000**. Ini menjelaskan perubahan nilai penjualan secara aritmetis, tetapi data tidak menunjukkan alasan pembeli memesan dalam jumlah tersebut.

## Metode dan cakupan

- Sumber: enam workbook `april 2020.xlsx` sampai `sep 2020.xlsx` di folder ini. Judul pada lembar utama adalah **“LAPORAN PENJUALAN”**. Jadi, angka `JUMLAH` diperlakukan sebagai nilai penjualan dari sisi penjual, atau nilai pembelian dari sisi pelanggan.
- Tiap workbook memiliki satu lembar utama dengan seluruh baris dan sejumlah lembar produk yang mengulang banyak baris. Analisis menggunakan **lembar utama saja** agar angka tidak dihitung berulang: April `_5x40n3xzg`, Mei `_5x40n4rhm`, Juni `_5x40n5eml`, Juli `_5x40n6e2p`, Agustus `_5x40n74l8`, September `_5x40n7tn7`.
- Omzet = penjumlahan kolom `JUMLAH` sebagaimana tercatat. “Baris” berarti satu item penjualan, **bukan** jumlah transaksi atau nota, karena tidak tersedia nomor transaksi. Kuantitas tidak dijumlahkan antarproduk karena satuannya berbeda (DUS, PACK, PAIL, dan lain lain).

## Descriptive analytics: apa yang terjadi?

| Bulan 2020 | Baris item | Omzet | Perubahan dari bulan sebelumnya | Rata-rata nilai per baris |
|---|---:|---:|---:|---:|
| April | 1.029 | Rp609.614.133 | — | Rp592.434 |
| Mei | 985 | Rp706.718.094 | +15,9% | Rp717.480 |
| Juni | 1.200 | Rp772.238.225 | +9,3% | Rp643.532 |
| Juli | 1.325 | Rp811.359.804 | +5,1% | Rp612.347 |
| Agustus | 1.068 | **Rp883.314.940** | **+8,9%** | **Rp827.074** |
| September | 1.171 | Rp747.085.424 | −15,4% | Rp637.989 |

Omzet meningkat setiap bulan dari April sampai Agustus, lalu turun pada September. Dari Juli ke Agustus, baris item justru turun **257 (−19,4%)** sementara omzet naik **Rp71.955.136 (+8,9%)**. Artinya, kenaikan Agustus berasal dari nilai per baris yang lebih besar, bukan dari lebih banyak baris penjualan.

Produk dengan omzet tertinggi sepanjang periode ialah **MIN-001**, senilai **Rp967.688.500 (21,4% dari total)**. Pada Agustus, produk ini menyumbang **Rp287.481.000 (32,5% omzet Agustus)**, naik **Rp126.326.500** dari Juli. Gabungan semua produk selain MIN-001 justru turun **Rp54.371.364** dari Juli ke Agustus.

## Diagnostic analytics: apa yang menjelaskan lonjakan Agustus?

| Bukti | Nilai |
|---|---:|
| Pelanggan 009, 3 Agustus: 200 DUS MIN-001 | Rp63.200.000 |
| Pelanggan 009, 13 Agustus: 200 DUS MIN-001 | Rp63.200.000 |
| Pelanggan 017, 3 Agustus: 150 DUS MIN-001 | Rp45.750.000 |
| **Tiga baris tersebut** | **Rp172.150.000** |

Tiga baris itu setara **19,5% omzet Agustus**. Untuk produk dan satuan yang sama (`MIN-001`, DUS), median kuantitas dari **267 baris** selama enam bulan ialah **3 DUS**; baris 150–200 DUS sangat jauh di atas pembelian tipikal. Lokasi sumber: `agustus 2020.xlsx`, lembar `_5x40n74l8`, baris **29, 30, dan 401**.

Tanpa dua nama pembeli tersebut, omzet Agustus menjadi **Rp711.164.940**, yaitu **Rp100.194.864 (12,3%) di bawah Juli**. Jadi tiga baris besar tadi lebih dari cukup untuk menjelaskan kenaikan bersih Agustus; penjualan ke pelanggan lain secara agregat melemah. Ini adalah dekomposisi angka, **bukan bukti sebab eksternal** seperti promosi atau perubahan pasar.

Penurunan September (**Rp136.229.516** dari Agustus) juga selaras dengan berkurangnya pembelian besar itu. Pelanggan 009 tidak tercatat pada September; Pelanggan 017 tercatat **Rp9.270.000**. Gabungan kedua pembeli turun dari **Rp172.150.000** pada Agustus menjadi **Rp9.270.000** pada September. Sementara itu, omzet selain kedua pembeli justru naik dari **Rp711.164.940** menjadi **Rp737.815.424**.

## Kualitas data dan batas interpretasi

1. **77 baris (1,1%)** memiliki `JUMLAH` lebih rendah daripada `QTY × HARGA`, dengan selisih gabungan **Rp4.436.797**. Ini bisa mencerminkan diskon atau perbedaan cara pencatatan, sehingga omzet dalam analisis tetap memakai `JUMLAH` yang dilaporkan. Contoh: `agustus 2020.xlsx`, lembar `_5x40n74l8`, baris 23 mencatat 27 PACK × Rp28.900 = Rp780.300, tetapi `JUMLAH` Rp390.150.
2. Ada **58 baris bernilai Rp0**. Perlu dipastikan apakah ini sampel/promosi, penggantian barang, atau kesalahan input sebelum menafsirkan frekuensi penjualan berbayar.
3. Ada **73 baris ekstra yang identik** dengan baris lain pada seluruh kolom utama. Tanpa nomor nota, baris identik bisa saja pembelian sah yang berulang; tidak dihapus otomatis.
4. Nama pelanggan memiliki variasi awalan, misalnya `C - Pelanggan 001` dan `Pelanggan 001`. Peringkat pelanggan perlu normalisasi identitas sebelum dipakai untuk keputusan. Ada pula **25 kode produk** yang memiliki lebih dari satu nama produk; beberapa mungkin perubahan nama, beberapa perlu verifikasi kode.
5. Lembar produk tidak selalu sepenuhnya sama dengan lembar utama. Karena itu, hasil ini konsisten menggunakan lembar utama saja. Data tidak memiliki nomor transaksi, biaya pokok, margin, maupun alasan pembelian pelanggan; metrik transaksi, profitabilitas, dan sebab bisnis tidak dapat dipastikan dari file ini.

## Kalimat singkat untuk dipresentasikan

> “Dari April sampai September 2020, penjualan tercatat Rp4,53 miliar. Agustus paling tinggi, Rp883,3 juta, naik 8,9% dari Juli meskipun jumlah baris produk turun 19,4%. Analisis per produk dan pembeli menunjukkan tiga baris pembelian MIN-001 oleh Pelanggan 009 dan Pelanggan 017 senilai Rp172,15 juta. Tanpa kedua pembeli itu, Agustus justru 12,3% lebih rendah dari Juli. Karena tidak ada nomor transaksi maupun alasan pemesanan, ini adalah penjelasan berdasarkan kontribusi angka, bukan penyebab bisnis yang pasti.”
