PRODUCT REQUIREMENTS DOCUMENT
PPA Jumper Audit\nAutomation
Spesifikasi Produk, Field Mapping, Business Rules, UI, Export, dan Acceptance Criteria

Dokumen	Nilai
Versi	1.0 — Draft siap untuk implementasi MVP
Status	PRD untuk AI Coding Agent di VS Code
Output utama	Satu slide PowerPoint editable (.pptx) dan PDF satu halaman
Arsitektur	Client-side; tanpa database, backend, API, atau import Excel
Referensi	Slide 2 PPA Jumper Audit Week-40 dan workbook Chart PLC Audit Jumper 2026 2.xlsx sebagai referensi struktur saja

Catatan: workbook Excel dan PowerPoint hanya digunakan untuk memahami tampilan, kategori, dan struktur laporan. Aplikasi tidak membaca atau mengambil data dari kedua file tersebut saat berjalan.

 Dokumen Control
Atribut	Detail
Nama produk	PPA Jumper Audit Automation
Versi dokumen	1.0
Jenis dokumen	Product Requirements Document (PRD)
Target pengguna	Personel yang menyiapkan laporan PPA Jumper Audit
Platform	Browser desktop/laptop
Status kebutuhan	Scope MVP disepakati; beberapa detail business rules masih perlu konfirmasi pemilik proses
Pemilik keputusan bisnis	User/pemilik proses PPA Jumper Audit (perlu ditetapkan)

Riwayat Perubahan
Versi	Perubahan
0.1	Konsep awal web form dan generator laporan
0.2	Penetapan output satu slide berdasarkan slide 2 PPT
0.3	Penetapan arsitektur tanpa database dan tanpa Excel import
1.0	Field mapping, business rules, arsitektur, UI, export, validasi, acceptance criteria, dan instruksi AI agent

Daftar Isi
•	1. Ringkasan Eksekutif
•	2. Latar Belakang dan Problem Statement
•	3. Tujuan Produk dan Non-Goals
•	4. Pengguna dan Use Cases
•	5. Scope MVP
•	6. Prinsip Produk dan Asumsi
•	7. Struktur Output Satu Slide
•	8. Field Mapping Final
•	9. Data Model
•	10. Business Rules
•	11. Functional Requirements
•	12. UI/UX Requirements
•	13. Arsitektur dan Teknologi
•	14. Spesifikasi PowerPoint dan PDF
•	15. Validasi dan Error Handling
•	16. Non-Functional Requirements
•	17. Acceptance Criteria
•	18. Test Scenarios
•	19. Tahapan Implementasi
•	20. Risiko dan Mitigasi
•	21. Open Questions
•	22. Instruksi untuk AI Coding Agent
•	Lampiran A. Kamus Status
•	Lampiran B. Checklist Definition of Done

 1. Ringkasan Eksekutif
PPA Jumper Audit Automation adalah aplikasi web sederhana untuk membuat laporan PPA Jumper Audit melalui input manual. Pengguna mengisi informasi laporan, data Plan dan Actual per area/kategori/minggu, ringkasan jumlah jumper per area, serta Jumper Register. Sistem memvalidasi input, menghitung indikator yang memiliki aturan jelas, membentuk grafik dan tabel, menampilkan preview satu slide, dan menyediakan download PowerPoint serta PDF.
Output harus mengikuti struktur slide 2 referensi PPA Jumper Audit Week-40 dengan perapian keterbacaan. File PowerPoint bukan screenshot: elemen penting seperti teks, shape, tabel, dan grafik harus berupa objek PowerPoint yang dapat diedit.
Aplikasi berjalan sepenuhnya di browser untuk MVP. Tidak ada database, backend, API, autentikasi, import Excel, atau integrasi ke sistem OT. Referensi PPT dan Excel hanya dipakai saat analisis dan pengembangan, bukan sebagai sumber data runtime.
1.1 Keputusan Produk yang Sudah Disepakati
Keputusan	Spesifikasi
Sumber data	Semua data laporan diinput manual oleh pengguna.
Jumlah jumper per area	Diinput manual dan tidak ditimpa oleh kalkulasi register.
Plan dan Actual	Selalu diinput manual oleh pengguna.
Remaining Jumper List	Filter berdasarkan jumper belum removed DAN MOC Not Available, dengan kriteria tahun identifikasi yang ditetapkan.
Authorized/MoC	Hanya record yang memenuhi status otorisasi DAN status MOC yang memenuhi syarat.
Output	Tepat satu slide; download PPTX editable dan PDF satu halaman.
Database/backend	Tidak digunakan.

1.2 Prinsip Utama
•	Input satu kali untuk data register; tabel, daftar, KPI, dan grafik turunan menggunakan sumber data yang sama.
•	Jangan menyamakan data manual dengan hasil hitung otomatis.
•	Jangan menganggap nilai kosong sebagai nol.
•	Jangan menebak business rules yang belum dikonfirmasi.
•	Jangan membuat slide tambahan jika konten terlalu banyak; tampilkan warning dan minta pengguna memperbaiki input.
2. Latar Belakang dan Problem Statement
Laporan referensi memuat banyak komponen: ringkasan empat area, 12 grafik Plan vs Actual, daftar remaining jumper, total removed, tabel update jumper, indikator Authorized/MoC, rasio remaining PLC, dan grafik jumlah remaining jumper per PLC. Jika seluruh komponen diperbarui manual, pengguna berisiko melakukan input berulang, salah menyalin angka, atau membuat nilai antarbagian tidak konsisten.
2.1 Problem Statement
•	Pengguna harus memasukkan data ke beberapa tempat dan membuat grafik secara manual.
•	Perubahan nilai dapat mengharuskan pembaruan banyak grafik, tabel, dan KPI.
•	Proses manual rawan ketidaksesuaian angka dan format.
•	Output laporan perlu tetap dapat diedit setelah diunduh.
2.2 Solusi
Sediakan form terstruktur sebagai sumber data, fungsi kalkulasi terpusat, preview satu slide, dan generator PPTX/PDF. Aplikasi hanya memproses data yang dimasukkan pengguna.
3. Tujuan Produk dan Non-Goals
3.1 Tujuan
•	Mengurangi pekerjaan manual untuk membentuk grafik dan layout laporan.
•	Memungkinkan pengguna memasukkan Plan/Actual melalui tabel mingguan.
•	Membentuk 12 grafik secara otomatis dari satu struktur data.
•	Menghasilkan tabel dan daftar dari Jumper Register tanpa input ulang.
•	Menjaga kesesuaian data antara preview, PPTX, dan PDF.
•	Menghasilkan PowerPoint satu slide dengan elemen individual yang editable.
3.2 Non-Goals
•	Database atau penyimpanan server.
•	Backend, REST API, login, atau role management.
•	Import atau pembacaan workbook Excel.
•	Koneksi PLC, jaringan OT, atau aplikasi perusahaan.
•	Kolaborasi multi-user dan cloud sync.
•	Laporan multi-slide atau penambahan slide otomatis.
•	Pengiriman email otomatis dan approval workflow.
4. Pengguna dan Use Cases
4.1 Target User
Personel yang menyiapkan atau memperbarui laporan PPA Jumper Audit. Peran organisasi spesifik tidak diasumsikan oleh aplikasi.
4.2 Use Cases
ID	Use case	Hasil yang diharapkan
UC-01	Membuat laporan baru	Pengguna mengisi informasi dan data laporan.
UC-02	Memasukkan data mingguan	Pengguna menambah Plan/Actual per area, kategori, dan minggu.
UC-03	Mengelola Jumper Register	Pengguna menambah, mengubah, dan menghapus record jumper.
UC-04	Memeriksa hasil	Preview memperbarui grafik, tabel, dan KPI.
UC-05	Mengunduh PPTX	File satu slide dibuat dengan objek yang dapat diedit.
UC-06	Mengunduh PDF	File PDF satu halaman dibuat.
UC-07	Memperbaiki input tidak valid	Sistem menunjukkan error/warning sebelum export.

5. Scope MVP
5.1 In Scope
•	Form Report Information.
•	Form Area Summary dengan angka manual untuk empat area.
•	Tabel Weekly Chart Data untuk Plan dan Actual.
•	Jumper Register dengan add/edit/delete.
•	Kalkulasi Remaining Jumper List, removal, Authorized/MoC, remaining PLC, dan grafik per PLC sesuai rules yang disepakati.
•	Preview satu slide 16:9.
•	Export PPTX editable dan PDF satu halaman.
•	Validasi field wajib dan nilai numerik.
•	Warning ketika data manual dan register tidak konsisten.
•	Peringatan jika konten tidak muat dalam satu slide.
5.2 Out of Scope
•	Import Excel/CSV sebagai input laporan.
•	Database atau penyimpanan server.
•	Login, user profile, atau penyimpanan antarperangkat.
•	Koneksi otomatis ke sumber data eksternal.
•	Pengubahan langsung pada sistem industri.
6. Prinsip Produk dan Asumsi
ID	Prinsip/asumsi	Dampak implementasi
P-01	Semua data berasal dari input manual.	Tidak ada nilai bisnis yang diambil dari file referensi saat runtime.
P-02	Area summary manual.	Angka area tidak dihitung ulang atau ditimpa oleh register.
P-03	Plan dan Actual manual.	Tidak ada nilai default yang dianggap sebagai data laporan.
P-04	Jumper Register menjadi sumber data untuk tabel/daftar turunan.	Hindari input ganda untuk record yang sama.
P-05	MOC dan authorization adalah field terpisah.	Keduanya tidak boleh disamakan.
P-06	Output hanya satu slide.	Jika padat, warning; tidak membuat slide kedua.
P-07	Data tidak tersimpan permanen secara otomatis.	Refresh dapat menghilangkan data; fitur JSON dapat dipertimbangkan terpisah.
P-08	Business rules yang belum disetujui tidak boleh dikunci sebagai fakta.	Tandai sebagai konfigurasi sementara/open question.

7. Struktur Output Satu Slide
Slide menggunakan rasio 16:9 landscape dan mengikuti susunan relatif slide 2 referensi. Perapian diperbolehkan untuk meningkatkan keterbacaan, tetapi urutan dan makna komponen harus dipertahankan.
Area slide	Komponen	Sumber
Header	Judul, area, reporting week/year, logo jika aset resmi tersedia	Report Information
Atas	Empat angka ringkasan: Dryer–CM, Kiln–CTS, Furnace, Converter	Area Summary manual
Area grafik	Shortbranches, Forces, AFI untuk masing-masing dari empat area (12 grafik)	Weekly Chart Data
Panel kanan	Remaining Jumper List dan keterangan kriteria	Jumper Register + filter
Panel ringkasan	Total Removed Jumper pada minggu laporan	Jumper Register + removal fields
Bawah kiri	Total Jumper with Authorized/MoC dan Jumper Update Table	Jumper Register + rules
Bawah kanan	Remaining PLC ratio dan Count of Remaining Jumper on PLC PP Area	Jumper Register + total PLC

7.1 Design Rules
•	Gunakan layout 16:9 landscape.
•	Gunakan header biru tua dan hierarki judul yang jelas.
•	Kelompokkan 12 grafik menurut area dan kategori.
•	Pertahankan panel remaining jumper, tabel update, dan ringkasan bawah.
•	Gunakan warna dan legend yang konsisten untuk Plan dan Actual.
•	Pastikan font, label, dan angka terbaca pada ukuran slide presentasi.
•	Jangan menambahkan logo perusahaan kecuali aset resmi tersedia dan pengguna mengizinkan.
•	Jangan menggunakan screenshot untuk menggantikan keseluruhan slide.
8. Field Mapping Final
8.1 Form A — Report Information
Field	Tipe	Wajib	Aturan/validasi	Output
Report Title	Text	Ya	Tidak boleh kosong	Judul slide
Plant Area	Text/select	Ya	Tidak boleh kosong	Subjudul/header
Reporting Year	Integer	Ya	Tahun valid	Periode laporan dan removal filter
Reporting Week	Integer	Ya	Rentang minggu valid; validasi kalender bila digunakan	Judul/periode dan removal filter
Chart Week Labels	Daftar label	Ya	Tidak duplikat; urutan eksplisit	Sumbu X seluruh grafik
Total PLC in Scope	Integer	Ya untuk rasio	Bilangan bulat positif	Denominator Remaining PLC

Catatan: kalender minggu ISO atau konvensi minggu internal harus diputuskan. Untuk MVP, label minggu dapat disimpan sebagai teks yang dimasukkan pengguna, sementara Reporting Week dan Year digunakan untuk filter periode.
8.2 Form A — Area Summary
Field	Tipe	Wajib	Aturan	Output
Dryer–CM Jumper Count	Integer	Ya	Bilangan bulat nonnegatif	Kartu ringkasan Dryer–CM
Kiln–CTS Jumper Count	Integer	Ya	Bilangan bulat nonnegatif	Kartu ringkasan Kiln–CTS
Furnace Jumper Count	Integer	Ya	Bilangan bulat nonnegatif	Kartu ringkasan Furnace
Converter Jumper Count	Integer	Ya	Bilangan bulat nonnegatif	Kartu ringkasan Converter

Nilai ini adalah input manual dan tidak boleh ditimpa hasil kalkulasi Jumper Register. Sistem boleh menampilkan warning jika tidak cocok dengan jumlah dari register.
8.3 Form A — Weekly Chart Data
Field	Tipe	Wajib	Aturan/validasi	Output
Area	Enum/dropdown	Ya	Salah satu dari empat area	Memilih grafik target
Category	Enum/dropdown	Ya	Shortbranches, Forces, AFI	Memilih grafik target
Week	Label/dropdown	Ya	Harus ada dalam Chart Week Labels	Posisi data pada sumbu X
Plan	Number	Ya untuk data lengkap	Nonnegatif; kosong berbeda dari nol	Seri Plan
Actual	Number	Ya untuk data lengkap	Nonnegatif; kosong berbeda dari nol	Seri Actual

Setiap kombinasi Area + Category + Week harus unik. Sediakan tabel dengan add/edit/delete dan pengisian yang efisien. Pengguna tidak mengisi tiap grafik secara terpisah.
8.4 Form B — Jumper Register: Identity
Field	Tipe	Wajib	Aturan/validasi	Digunakan untuk
Jumper ID	Text	Ya	Unik; trim whitespace	Deduplication dan identitas record
PLC	Text	Ya	Tidak boleh kosong	Tabel, filter, grafik PLC
Area	Enum	Ya	Empat area yang didukung	Filter dan agregasi
Category	Enum	Ya	AFI, Shortbranches, Forces	Grafik dan daftar
Description	Textarea	Ya	Tidak boleh kosong	Update table dan remaining list
Equipment/Tag	Text	Tidak	Jika tersedia, tampilkan tanpa mengubah format	Remaining list

8.5 Form B — Jumper Register: Status dan Periode
Field	Tipe	Wajib	Aturan/validasi	Digunakan untuk
Installed Week/Date	Text/date	Ya	Terima format yang disepakati	Kolom Installed
Authorization Status	Enum	Ya	Authorized / Not Authorized / Pending Confirmation (sementara)	Authorized/MoC KPI dan tabel
MOC Status	Enum	Ya	Approved/Complete / Not Available / Pending / Not Required (sementara)	Remaining list dan KPI
Identification Year	Integer	Ya	Tahun valid	Kriteria Remaining Jumper List
Removal Status	Boolean/select	Ya	Yes atau No	Active/remaining filtering
Removal Week	Week label	Jika removed	Wajib jika Removal Status = Yes	Total removed periode
Removal Year	Integer	Jika removed	Wajib jika Removal Status = Yes	Total removed periode
Due Date	Date/text/status	Ya	Tanggal valid atau status konfirmasi	Kolom Due Date
Quantity	Positive integer	Ya	Bilangan bulat minimal 1; default UI 1 boleh diedit	Semua agregasi jumlah jumper

Daftar enum merupakan rancangan awal. Nama dan makna status harus dikonfirmasi oleh pemilik proses sebelum digunakan sebagai definisi laporan resmi.
8.6 Due Date Representation
Due Date perlu mendukung tanggal pasti dan kondisi belum terkonfirmasi jika proses bisnis memang mengizinkannya. Jangan mengubah teks “Need to confirm the due date” menjadi tanggal buatan. Simpan nilai tanggal dan status konfirmasi secara terpisah agar output dapat menampilkan label yang sesuai.
9. Data Model
Gunakan satu state object sebagai sumber data utama. Struktur berikut bersifat konseptual; implementasi boleh menyesuaikan bentuk internal selama field dan aturan tetap terjaga.
const report = {
  config: {
    title: "",
    plantArea: "",
    reportingYear: null,
    reportingWeek: null,
    weekLabels: [],
    totalPlcInScope: null
  },
  areaSummary: [
    { areaId: "dryer_cm", jumperCount: null },
    { areaId: "kiln_cts", jumperCount: null },
    { areaId: "furnace", jumperCount: null },
    { areaId: "converter", jumperCount: null }
  ],
  weeklyChartData: [
    // { areaId, category, week, plan, actual }
  ],
  jumperRegister: [
    // { jumperId, plc, areaId, category, description,
    //   equipmentTag, installedWeekOrDate,
    //   authorizationStatus, mocStatus, identificationYear,
    //   removalStatus, removalWeek, removalYear,
    //   dueDate, dueDateConfirmationStatus, quantity }
  ]
};
9.1 Normalization
•	Gunakan areaId dan enum konsisten, bukan membandingkan label tampilan yang mungkin berubah.
•	Simpan minggu sebagai label yang eksplisit; jangan mengurutkan label minggu secara alfabetis.
•	Gunakan ID unik untuk jumper, bukan deskripsi sebagai identifier.
•	Kalkulasi harus menggunakan satu fungsi selector/agregasi bersama.
•	Input form, preview, dan export harus membaca state yang sama.
10. Business Rules
ID	Rule	Spesifikasi
BR-01	Manual Area Summary	Angka empat area selalu berasal dari input user. Hasil hitung register hanya boleh digunakan sebagai warning perbandingan.
BR-02	Manual Plan/Actual	Plan dan Actual berasal dari input user; nilai kosong tidak sama dengan 0.
BR-03	Remaining Jumper List	Removal Status = No AND MOC Status = Not Available AND Identification Year memenuhi kriteria laporan.
BR-04	Authorized/MoC	Authorization Status = Authorized AND MOC Status = Approved/Complete. Agregasi menggunakan Quantity.
BR-05	Removed Jumper	Removal Status = Yes dan Removal Week/Year sesuai periode laporan; agregasi menggunakan Quantity.
BR-06	Remaining PLC	Jumlah PLC unik dengan minimal satu jumper aktif dibagi Total PLC in Scope.
BR-07	Jumper per PLC	Agregasi Quantity berdasarkan PLC dan Category; record removed dikecualikan.
BR-08	Data Consistency	Semua komponen turunan menggunakan fungsi kalkulasi terpusat.
BR-09	Unknown status	Status pending/unknown tidak dianggap memenuhi kondisi Authorized/MoC atau Remaining List.
BR-10	One-slide constraint	Tidak membuat slide kedua. Jika tidak muat, tampilkan warning dan minta pengguna mengurangi/memperbaiki konten.
BR-11	Duplicate record	Jumper ID unik. Weekly chart key Area+Category+Week unik.
BR-12	Manual vs computed	Jangan menimpa field manual dengan hasil perhitungan. Tampilkan discrepancy warning bila diperlukan.

10.1 Catatan Kritis pada BR-03
Kriteria tahun identifikasi harus dapat dikonfigurasi atau ditetapkan berdasarkan periode laporan. Referensi menunjukkan wording “Identify since 2026”, tetapi belum membuktikan apakah tahun tersebut tetap 2026 atau bergeser setiap tahun. Jangan meng-hardcode tahun permanen sebelum konfirmasi.
10.2 Definisi Jumper Aktif
Untuk kalkulasi awal, jumper aktif adalah record dengan Removal Status = No. Jika proses bisnis membedakan status lain yang membuat jumper tidak aktif, aturan tersebut harus dikonfirmasi dan didokumentasikan sebelum implementasi resmi.
11. Functional Requirements
ID	Requirement	Acceptance behavior
FR-01	Report form	User dapat mengisi dan mengubah semua field report configuration.
FR-02	Area summary form	User dapat mengisi empat angka manual; sistem mempertahankan nilai input.
FR-03	Weekly data grid	User dapat menambah/mengedit/menghapus kombinasi Area/Category/Week/Plan/Actual.
FR-04	Jumper register CRUD	User dapat menambah, mengedit, dan menghapus record jumper.
FR-05	Validation	Error ditampilkan dekat field terkait dan mencegah export jika input wajib invalid.
FR-06	KPI calculation	KPI dihitung dari rules terpusat dan tidak di-hardcode.
FR-07	Live preview	Preview berubah setelah state berubah tanpa perlu reload halaman.
FR-08	Chart generation	12 grafik dibuat dari weekly data; tidak memerlukan input grafik terpisah.
FR-09	Remaining list	Daftar dibuat dari filter BR-03.
FR-10	Update table	Tabel dibuat dari register dengan kolom yang ditentukan.
FR-11	PPTX export	Menghasilkan satu slide dengan elemen individual yang editable.
FR-12	PDF export	Menghasilkan satu halaman dengan komposisi sesuai slide.
FR-13	Overflow warning	Menampilkan warning bila daftar/teks tidak muat.
FR-14	Discrepancy warning	Memberi peringatan jika area summary manual berbeda dari hitungan register.

12. UI/UX Requirements
12.1 Layout Input
•	Gunakan section/card: Report Information, Weekly Chart Data, Jumper Register, Reporting Rules.
•	Tabel mendukung tambah, edit, hapus, dan validasi inline.
•	Gunakan dropdown untuk enum status dan area.
•	Tampilkan unit dan format tanggal/minggu secara jelas.
•	Jangan menampilkan form duplikat untuk grafik yang sama.
•	Sediakan indikator data wajib belum lengkap.
12.2 Preview
•	Preview memakai rasio 16:9 dan seluruh komponen slide.
•	Gunakan skala responsif agar slide dapat dilihat di layar browser tanpa mengubah rasio internal.
•	Preview bukan output final yang berbeda; struktur kontennya sama dengan slide export.
•	Sediakan warning untuk konten overflow, nilai kosong, atau discrepancy.
12.3 Export Controls
•	Tombol Download PPTX dan Download PDF jelas dan terpisah.
•	Disable export jika field wajib atau data chart wajib belum lengkap.
•	Tampilkan error jika pembuatan file gagal; jangan menyatakan berhasil sebelum proses selesai.
•	Nama file menyertakan judul/periode yang sudah disanitasi, misalnya PPA_Jumper_Audit_Week40_2026.pptx.
13. Arsitektur dan Teknologi
13.1 Arsitektur
Client-side only: form input → central state → validation → business logic/selectors → preview → PPTX/PDF export.
Layer	Tanggung jawab
Input UI	Mengumpulkan dan mengubah data melalui form.
Data model/state	Menyimpan data laporan selama sesi browser.
Validation	Memeriksa field wajib, enum, rentang angka, dan konsistensi.
Business logic	Kalkulasi KPI dan filter register.
Preview renderer	Menampilkan layout slide dan grafik browser.
PPTX generator	Membuat objek native PowerPoint dari state yang sama.
PDF exporter	Menghasilkan satu halaman yang sesuai dengan layout laporan.

13.2 Dependency
Library	Penggunaan	Catatan
Chart.js	Grafik pada preview browser	Jangan menganggap canvas Chart.js dapat diedit sebagai native chart di PowerPoint.
PptxGenJS	Pembuatan PPTX	Gunakan addChart/native charts untuk grafik editable jika memungkinkan.
PDF mechanism	PDF satu halaman	Pilih pendekatan yang dapat diuji; verifikasi layout dan pagination.

13.3 Project Structure Recommendation
Struktur di atas adalah rekomendasi untuk project sederhana. Agent harus memeriksa struktur project existing terlebih dahulu dan menyesuaikannya, bukan memaksakan struktur baru jika tidak diperlukan.
14. Spesifikasi PowerPoint dan PDF
14.1 PowerPoint
•	Tepat satu slide.
•	Rasio 16:9 landscape.
•	Teks menggunakan text boxes.
•	Panel dan garis menggunakan shapes.
•	Tabel menggunakan native table atau kombinasi shapes/text.
•	Grafik menggunakan native PowerPoint charts jika mendukung kebutuhan.
•	Jangan menyatukan seluruh slide menjadi satu gambar.
•	Gunakan satu sumber data dan satu set konfigurasi untuk preview serta export.
•	Sanitasi nama file dan tangani kegagalan download.
14.2 PDF
•	Tepat satu halaman.
•	Landscape dengan komposisi sesuai slide.
•	Tidak ada clipping atau pagination tambahan.
•	Angka dan label sama dengan preview/PPTX.
•	Font, tabel, dan grafik tetap terbaca.
14.3 Strategi Konsistensi
Preview Chart.js dan native chart PPTX dapat memiliki perbedaan rendering. Gunakan data series, urutan minggu, warna, label, dan nilai yang sama. Lakukan visual QA pada file PPTX/PDF yang benar-benar dihasilkan. Jika export PDF melalui print browser, atur print CSS dan uji pada browser target; jika memakai renderer lain, pastikan output satu halaman dan cocok dengan slide.
15. Validasi dan Error Handling
Kondisi	Perilaku sistem
Field wajib kosong	Tampilkan error dekat field; blokir export.
Plan/Actual negatif	Tolak nilai dan tampilkan pesan.
Plan/Actual kosong	Tandai belum lengkap; jangan ubah menjadi nol.
Duplikasi Jumper ID	Tolak atau minta user memperbaiki ID.
Duplikasi Area+Category+Week	Tolak record kedua atau minta koreksi.
Removal Status = Yes tanpa minggu/tahun	Tampilkan error; blokir kalkulasi removal final.
Total PLC = 0 atau kosong	Blokir rasio Remaining PLC.
Unknown enum status	Tolak nilai yang tidak ada pada enum.
Remaining list terlalu panjang	Tampilkan overflow warning; jangan membuat slide tambahan.
Area summary beda dari register	Tampilkan warning tanpa menimpa nilai manual.
Export gagal	Tampilkan pesan kegagalan; jangan menunjukkan status sukses.

15.1 Pesan Error
•	Gunakan bahasa singkat dan spesifik.
•	Jangan hanya menampilkan “Invalid input”; jelaskan field dan tindakan yang dibutuhkan.
•	Warning tidak boleh mengubah nilai secara diam-diam.
•	Pisahkan error yang memblokir export dari warning informasional.
16. Non-Functional Requirements
ID	Kategori	Requirement
NFR-01	Performance	Input dan preview harus terasa responsif pada jumlah data laporan yang wajar.
NFR-02	Usability	Form dapat digunakan pada browser desktop/laptop.
NFR-03	Reliability	Kalkulasi menggunakan fungsi terpusat dan hasil konsisten.
NFR-04	Export fidelity	PPTX/PDF tidak clipping, tidak menambah slide/halaman.
NFR-05	Maintainability	Pisahkan data model, UI, kalkulasi, preview, dan export.
NFR-06	Privacy	Data diproses lokal; tidak dikirim ke server karena tidak ada backend.
NFR-07	Compatibility	Uji pada browser yang ditetapkan project, minimal browser Chromium modern.
NFR-08	Accessibility	Label field, fokus keyboard, dan kontras teks cukup untuk penggunaan dasar.

16.1 Persistence Caveat
MVP tidak menjamin data tetap ada setelah refresh atau browser ditutup. Jika kebutuhan pemulihan data diperlukan, fitur export/import JSON dapat ditambahkan sebagai fitur lokal opsional setelah scope utama selesai. Ini bukan database dan bukan bagian wajib MVP.
17. Acceptance Criteria
ID	Acceptance criteria
AC-01	User dapat mengisi Report Title, Plant Area, Reporting Year, Reporting Week, label minggu, dan Total PLC.
AC-02	User dapat mengisi empat jumlah area secara manual.
AC-03	Nilai area summary tidak ditimpa oleh kalkulasi register.
AC-04	User dapat mengisi Plan/Actual per kombinasi area, kategori, dan minggu.
AC-05	Sistem menampilkan 12 grafik dari weekly data.
AC-06	Perubahan nilai Plan/Actual langsung memperbarui grafik yang sesuai.
AC-07	User dapat menambah, mengubah, dan menghapus jumper register.
AC-08	Jumper ID duplikat ditolak.
AC-09	Remaining Jumper List hanya menampilkan record yang memenuhi semua filter BR-03.
AC-10	Authorized/MoC hanya menghitung record yang memenuhi kedua status BR-04.
AC-11	Total Removed menggunakan removal week/year dan Quantity.
AC-12	Remaining PLC menghitung PLC unik aktif dan menggunakan denominator Total PLC.
AC-13	Grafik per PLC mengelompokkan kategori dan mengecualikan record removed.
AC-14	Nilai kosong dibedakan dari nol.
AC-15	Warning ditampilkan saat area summary manual tidak sesuai dengan register.
AC-16	Preview memperlihatkan satu slide 16:9.
AC-17	PPTX yang diunduh berisi tepat satu slide.
AC-18	Teks, shape, tabel, dan grafik PPTX dapat diedit secara individual.
AC-19	PDF yang diunduh berisi tepat satu halaman.
AC-20	PPTX/PDF tidak memiliki elemen terpotong atau bertumpuk.
AC-21	Preview, PPTX, dan PDF menggunakan angka yang konsisten.
AC-22	Aplikasi berjalan tanpa database, backend, dan import Excel.
AC-23	Jika konten tidak muat, aplikasi menampilkan warning dan tidak membuat slide kedua.
AC-24	Semua business rules yang belum disahkan ditandai sebagai open question/configuration.

18. Test Scenarios
Test ID	Skenario	Expected result
T-01	Plan=0, Actual=0	Grafik menampilkan nilai nol, bukan missing data.
T-02	Plan kosong	Data ditandai belum lengkap; tidak dianggap nol.
T-03	Actual negatif	Validasi menolak nilai.
T-04	Jumper ID sama pada dua record	Sistem menampilkan error duplikasi.
T-05	Removal=No, MOC=Not Available, tahun sesuai	Record masuk Remaining Jumper List.
T-06	Removal=Yes, MOC=Not Available	Record tidak masuk Remaining Jumper List.
T-07	Removal=No, MOC=Approved/Complete	Record tidak masuk daftar without MOC.
T-08	Authorization=Pending Confirmation	Record tidak dihitung pada Authorized/MoC KPI.
T-09	Removal terjadi di minggu berbeda	Tidak dihitung pada minggu laporan saat ini.
T-10	Quantity=3 pada record removed yang cocok periode	Total removal bertambah 3, sesuai aturan Quantity.
T-11	Satu PLC memiliki beberapa kategori jumper aktif	Remaining PLC dihitung satu kali; chart kategori menghitung kuantitas per kategori.
T-12	Total PLC kosong/0	Rasio Remaining PLC tidak dihitung dan error ditampilkan.
T-13	Area summary berbeda dari register	Nilai manual dipertahankan dan warning muncul.
T-14	Daftar remaining terlalu panjang	Overflow warning muncul; tidak ada slide kedua.
T-15	Export PPTX	File valid, satu slide, objek utama dapat diedit.
T-16	Export PDF	File valid, satu halaman, layout sesuai.

18.1 Export QA Procedure
1.	Isi data uji yang mencakup nilai nol, angka positif, status berbeda, dan lebih dari satu PLC.
2.	Buat preview dan catat nilai KPI yang terlihat.
3.	Export PPTX dan PDF.
4.	Buka PPTX di PowerPoint atau kompatibel dan periksa jumlah slide serta editability objek.
5.	Periksa PDF pada ukuran halaman dan zoom presentasi; pastikan tidak ada clipping.
6.	Bandingkan judul, angka, tabel, label, dan grafik di ketiga output.
7.	Simpan hasil pengujian dan catat perbedaan rendering yang masih ada.
19. Tahapan Implementasi
Fase	Pekerjaan	Exit criteria
1. Inspection	Periksa project, file, dependency, entry point, dan scripts.	Rencana file dan dependency disetujui; tidak ada perubahan besar tanpa inspeksi.
2. Domain foundation	Enums, data model, state, validation.	Unit test validasi lulus.
3. Business logic	Selector, KPI, filter, agregasi.	Test cases kalkulasi lulus.
4. Input UI	Report info, weekly grid, register CRUD.	Semua input dapat dibuat/diubah/dihapus.
5. Preview	Layout satu slide dan 12 grafik.	Preview sesuai struktur referensi.
6. PPTX export	Native objects dan native charts.	File satu slide dan editable.
7. PDF export	Render satu halaman.	PDF satu halaman dan tidak clipping.
8. QA	Acceptance criteria, visual QA, edge cases.	Seluruh AC lulus atau gap didokumentasikan.

20. Risiko dan Mitigasi
Risiko	Dampak	Mitigasi
Business rules belum lengkap	KPI salah	Gunakan open questions; jangan mengunci asumsi.
Banyak item dalam satu slide	Teks terlalu kecil/overflow	Warning dan pembatasan konten; tidak membuat slide kedua.
Preview dan PPTX berbeda	User kehilangan kepercayaan	Gunakan shared data/config dan lakukan visual QA.
Grafik PPTX menjadi gambar	Tidak editable	Gunakan native PowerPoint charts.
Data hilang setelah refresh	Input harus diulang	Jelaskan batasan; pertimbangkan JSON save/load opsional.
Manual area summary tidak cocok dengan register	Angka terlihat tidak konsisten	Pertahankan input manual dan tampilkan warning.
Status MOC/authorization ambigu	KPI salah	Konfirmasi enum dan definisi kepada pemilik proses.

21. Open Questions — Wajib Diklarifikasi
ID	Pertanyaan	Default sementara	Mengapa penting
OQ-01	Tahun “Identify since 2026” tetap atau mengikuti reporting year?	Tahun identifikasi menjadi konfigurasi, bukan hardcoded.	Menentukan Remaining Jumper List.
OQ-02	Status MOC resmi apa saja?	Enum usulan hanya placeholder.	Menentukan filter dan KPI.
OQ-03	Status authorization resmi apa saja?	Enum usulan hanya placeholder.	Menentukan Authorized/MoC.
OQ-04	Due Date harus tanggal, label minggu, atau teks konfirmasi?	Simpan nilai dan status konfirmasi terpisah.	Menentukan field dan rendering tabel.
OQ-05	Satu record register selalu satu jumper atau dapat mewakili banyak?	Quantity wajib, default UI 1.	Menentukan seluruh agregasi.
OQ-06	Apakah semua record Removal=No dianggap aktif?	Ya untuk kalkulasi awal.	Menentukan remaining PLC dan chart.
OQ-07	Konvensi minggu apa yang digunakan?	Label minggu disimpan eksplisit.	Menentukan urutan dan filter periode.
OQ-08	Apa definisi persis Authorized/MoC pada judul KPI?	Authorization=Authorized AND MOC=Approved/Complete.	Mencegah salah tafsir KPI.

Agent boleh membangun fondasi dan UI dengan enum yang dapat dikonfigurasi, tetapi harus menandai kalkulasi yang bergantung pada open questions. Jangan mengklaim laporan resmi benar sampai pertanyaan terkait diselesaikan.
22. Instruksi untuk AI Coding Agent
Sebelum coding, agent wajib membaca PRD ini dan memeriksa project existing.
•	Mulai dengan inspeksi struktur project, package/dependency, entry point, dan test scripts.
•	Laporkan rencana implementasi dan file yang akan dibuat/diubah sebelum perubahan besar.
•	Jangan menambahkan database, backend, API, autentikasi, atau import Excel.
•	Jangan menulis angka contoh permanen sebagai laporan aktual.
•	Pisahkan state/data model, validation, business logic, UI, preview, dan export.
•	Gunakan satu fungsi kalkulasi terpusat untuk KPI dan agregasi.
•	Jangan mengarang aturan yang belum disahkan; catat sebagai open question.
•	Jangan mengubah atau menghapus file existing yang tidak terkait.
•	Uji export aktual, bukan hanya preview browser.
•	Setelah setiap fase, laporkan file yang diubah, fitur selesai, test yang dijalankan, hasilnya, dan gap yang tersisa.
•	Jangan menyatakan task selesai jika PPTX belum diperiksa untuk satu slide dan editability.
22.1 Prompt Awal untuk Agent
“Baca PRD.md secara menyeluruh. Mulai dari Phase 1: inspeksi project existing, dependency, entry point, dan test scripts. Jangan langsung membuat semua fitur. Laporkan struktur project, file yang akan dibuat/diubah, dependency yang diperlukan, risiko teknis, dan open questions. Jangan melakukan perubahan besar sebelum rencana disetujui.”
Lampiran A. Kamus Status
Field	Nilai usulan	Perlakuan
Authorization Status	Authorized	Dapat memenuhi syarat BR-04 jika MOC juga memenuhi.
Authorization Status	Not Authorized	Tidak memenuhi BR-04.
Authorization Status	Pending Confirmation	Tidak dihitung memenuhi; tampilkan sebagai pending.
MOC Status	Approved/Complete	Dapat memenuhi BR-04 jika authorization juga memenuhi.
MOC Status	Not Available	Kandidat Remaining Jumper List jika record aktif dan tahun memenuhi.
MOC Status	Pending	Tidak memenuhi BR-04; bukan otomatis Not Available.
MOC Status	Not Required	Tidak memenuhi BR-04 kecuali aturan resmi menetapkan lain.

Seluruh nilai pada lampiran ini merupakan usulan awal yang harus disesuaikan dengan terminologi pemilik proses sebelum dipakai untuk laporan resmi.
Lampiran B. Definition of Done Checklist
•	PRD dibaca dan dipahami oleh agent.
•	Project existing diperiksa sebelum perubahan.
•	Field mapping terimplementasi.
•	Validasi field dan enum terimplementasi.
•	Business logic diuji.
•	12 grafik terbentuk dari input manual.
•	Area summary tetap manual.
•	Remaining Jumper List sesuai filter yang disetujui.
•	Authorized/MoC sesuai definisi yang disetujui.
•	Removal dan Quantity dihitung benar.
•	Remaining PLC dan grafik per PLC dihitung benar.
•	Preview satu slide berfungsi.
•	PPTX satu slide dan editable telah diuji.
•	PDF satu halaman telah diuji.
•	Tidak ada clipping/overflow yang tidak ditangani.
•	Open questions diselesaikan atau tetap terdokumentasi.
•	Tidak ada database, backend, atau Excel import.
