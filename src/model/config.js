/**
 * config.js
 * Konfigurasi aplikasi PPA Jumper Audit Automation.
 *
 * File ini memisahkan parameter yang dapat berubah tanpa mengubah logika bisnis.
 * Semua nilai default di sini adalah SEMENTARA dan harus dikonfirmasi pemilik proses.
 *
 * Open Questions yang bergantung pada file ini:
 *   OQ-01: identificationYearFilter — apakah tetap 2026 atau bergeser setiap tahun?
 *   OQ-07: weekLabelOrder — konvensi minggu yang digunakan (ISO, internal, atau label bebas)?
 *
 * INSTRUKSI UNTUK PEMILIK PROSES:
 *   Ubah nilai di APP_CONFIG.reporting.identificationYearFilter sesuai tahun identifikasi
 *   yang berlaku untuk laporan. Jangan ubah logika di selectors.js untuk mengakomodasi
 *   aturan yang belum dikonfirmasi.
 */

"use strict";

export const APP_CONFIG = Object.freeze({

  /**
   * Konfigurasi reporting dan filter periode.
   * [OQ-01] identificationYearFilter:
   *   Nilai null berarti filter tahun identifikasi BELUM dikonfigurasi.
   *   Isi dengan tahun integer (misal: 2026) setelah dikonfirmasi pemilik proses.
   *   Sistem akan menampilkan warning jika nilai ini null saat menghitung
   *   Remaining Jumper List (BR-03).
   *
   *   Catatan: field ini TIDAK otomatis mengikuti reportingYear.
   *   Keduanya adalah nilai terpisah yang dapat berbeda.
   */
  reporting: Object.freeze({
    identificationYearFilter: null, // [OQ-01] Isi setelah dikonfirmasi — jangan hardcode 2026
  }),

  /**
   * Konfigurasi urutan week label.
   * [OQ-07] Konvensi minggu yang digunakan belum dikonfirmasi.
   * weekLabelOrder: "explicit" berarti urutan dipertahankan sesuai input pengguna,
   *   tidak diurutkan secara alfabetis atau numeris.
   * Jangan ubah ke "alphabetical" atau "numeric" tanpa konfirmasi pemilik proses.
   */
  weekLabels: Object.freeze({
    order: "explicit", // "explicit" = ikuti urutan input user; JANGAN ubah ke sort alfabetis
  }),

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
