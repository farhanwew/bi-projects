import React from "react";
import type { Analysis } from "../analytics";
import { jt, rp } from "../format";
import styles from "./DiagnosticCharts.module.css";

interface DiagnosticChartsProps {
  analysis: Analysis;
}

export function DiagnosticDecompositionCard({ analysis }: DiagnosticChartsProps) {
  const augPeak = analysis.months.find(m => m.month === 8);
  const julMonth = analysis.months.find(m => m.month === 7);

  const augOmzetJt = augPeak ? augPeak.omzetJt : 883.31;
  const withoutTop3Jt = augPeak ? augPeak.tanpaTop3Jt : 711.16;
  const julOmzetJt = julMonth ? julMonth.omzetJt : 811.36;
  const diffJulPct = (((withoutTop3Jt / julOmzetJt) - 1) * 100).toFixed(1);

  const buyerSutarmuji = "Pak Sutarmuji";
  const buyerRohmat = "Mas Rohmat";

  return (
    <article className={styles.decompCard}>
      <header className={styles.cardHead}>
        <div className={styles.titleGroup}>
          <h3 className={styles.title}>Mengapa Penjualan Melonjak Tajam di Bulan Agustus?</h3>
          <p className={styles.subtitle}>Penjualan melonjak bukan karena banyak pelanggan baru, melainkan ada 2 pelanggan borongan yang membeli ratusan dus sekaligus.</p>
        </div>
        <span className={styles.badgeDiag}>Fakta Penjualan</span>
      </header>

      {/* 3 Metric Mini-Cards */}
      <div className={styles.kpiRow}>
        <div className={styles.kpiItem}>
          <div className={styles.kpiLabel}>
            <span>Total Penjualan Agustus</span>
            <span>100%</span>
          </div>
          <span className={styles.kpiValue}>Rp {jt(augOmzetJt)} Jt</span>
          <div className={styles.kpiTrack}>
            <div className={styles.kpiFillMain} style={{ width: "100%" }} />
          </div>
          <span className={styles.kpiSub}>Bulan Penjualan Tertinggi di 2020</span>
        </div>

        <div className={styles.kpiItem}>
          <div className={styles.kpiLabel}>
            <span>3 Pesanan Partai Besar</span>
            <span style={{ color: "var(--danger)" }}>19,5%</span>
          </div>
          <span className={styles.kpiValue} style={{ color: "var(--danger)" }}>Rp 172,15 Jt</span>
          <div className={styles.kpiTrack}>
            <div className={styles.kpiFillOutlier} style={{ width: "19.5%" }} />
          </div>
          <span className={styles.kpiSub}>Hanya dari 3 nota saja!</span>
        </div>

        <div className={styles.kpiItem}>
          <div className={styles.kpiLabel}>
            <span>Penjualan Toko Biasa (Tanpa Borongan)</span>
            <span style={{ color: "var(--success)" }}>80,5%</span>
          </div>
          <span className={styles.kpiValue}>Rp {jt(withoutTop3Jt)} Jt</span>
          <div className={styles.kpiTrack}>
            <div className={styles.kpiFillBaseline} style={{ width: "80.5%" }} />
          </div>
          <span className={styles.kpiSub} style={{ color: "var(--danger)" }}>
            Tanpa 3 nota ini, omzet riil turun {Math.abs(Number(diffJulPct))}% dari Juli
          </span>
        </div>
      </div>

      {/* Clean Outlier Data Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Nama Pembeli Borongan</th>
              <th>Produk</th>
              <th>Banyaknya</th>
              <th>Total Belanja</th>
              <th>Porsi Omzet</th>
              <th>Catatan Khusus</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>03/08/2020</td>
              <td><strong>{buyerSutarmuji}</strong></td>
              <td>MIN-001 (Minaku Otak Otak)</td>
              <td><strong>200 DUS</strong></td>
              <td>Rp 63.200.000</td>
              <td>7,2%</td>
              <td><span className={styles.badgeOutlier}>67× Lipat dari Order Biasa</span></td>
            </tr>
            <tr>
              <td>13/08/2020</td>
              <td><strong>{buyerSutarmuji}</strong></td>
              <td>MIN-001 (Minaku Otak Otak)</td>
              <td><strong>200 DUS</strong></td>
              <td>Rp 63.200.000</td>
              <td>7,2%</td>
              <td><span className={styles.badgeOutlier}>67× Lipat dari Order Biasa</span></td>
            </tr>
            <tr>
              <td>03/08/2020</td>
              <td><strong>{buyerRohmat}</strong></td>
              <td>MIN-001 (Minaku Otak Otak)</td>
              <td><strong>150 DUS</strong></td>
              <td>Rp 45.750.000</td>
              <td>5,2%</td>
              <td><span className={styles.badgeOutlier}>50× Lipat dari Order Biasa</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  );
}
