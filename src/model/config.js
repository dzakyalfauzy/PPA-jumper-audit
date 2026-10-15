/**
 * config.js
 * Konfigurasi aplikasi PPA Jumper Audit Automation.
 *
 * File ini memisahkan parameter yang dapat berubah tanpa mengubah logika bisnis.
 * Semua nilai default di sini adalah SEMENTARA dan harus dikonfirmasi pemilik proses.
 *
 * Field lama yang DIHAPUS dari konfigurasi (revisi):
 *   - reporting.identificationYearFilter (OQ-01) — BR-03 dihapus dari model.
 *   - weekLabels.order (OQ-07) — config.weekLabels dihapus; urutan minggu chart
 *     sekarang diurutkan kronologis dari baris weeklyChartData.
 *
 * INSTRUKSI UNTUK PEMILIK PROSES:
 *   Jangan ubah logika di selectors.js untuk mengakomodasi
 *   aturan yang belum dikonfirmasi.
 */

"use strict";

export const APP_CONFIG = Object.freeze({

  /**
   * Konfigurasi discrepancy warning antara areaSummary manual dan register.
   * [OQ — OPEN] Definisi "jumlah yang dibandingkan" belum disepakati:
   *   Apakah jumlah record register, atau sum(Quantity), atau hanya record aktif?
   *   Sebelum dikonfirmasi, discrepancy warning TIDAK mengubah nilai manual.
   *   Implementasi warning akan ditandai sebagai pending konfirmasi.
   */
  discrepancyWarning: Object.freeze({
    enabled: true,   // tampilkan warning; TIDAK menimpa nilai manual (BR-01, BR-12)
    basis: null,     // [OPEN QUESTION] "record_count" | "quantity_sum" | "active_quantity_sum"
                     // null = belum dikonfirmasi; warning ditampilkan tapi basis perhitungan
                     //        tidak diklaim sebagai nilai resmi
  }),

  /**
   * Konfigurasi validasi minggu laporan.
   * [OQ-07] Rentang valid bergantung pada konvensi minggu yang digunakan.
   * Default: 1–53 (rentang ISO week paling umum).
   * Sesuaikan jika konvensi internal berbeda.
   */
  weekRange: Object.freeze({
    min: 1,
    max: 53,
  }),

  /**
   * Konfigurasi validasi tahun laporan.
   * Tahun minimum dan maksimum yang dianggap valid.
   */
  yearRange: Object.freeze({
    min: 2000,
    max: 2100,
  }),

});
