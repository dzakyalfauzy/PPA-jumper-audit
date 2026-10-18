================================================================================
                    PPA JUMPER AUDIT AUTOMATION (v1.0.0)
                    Petunjuk Penggunaan Aplikasi Mandiri
================================================================================

Aplikasi ini dijalankan secara lokal di laptop Windows 10 / Windows 11 tanpa
memerlukan instalasi server, backend, database, Node.js, atau Python.

--------------------------------------------------------------------------------
PERSYARATAN:
--------------------------------------------------------------------------------
1. Sistem Operasi: Windows 10 atau Windows 11.
2. Koneksi Internet: Laptop WAJIB terhubung ke internet saat membuka aplikasi
   agar pustaka grafik (Chart.js) dan modul ekspor (PptxGenJS, html2canvas,
   jsPDF) dapat dimuat melalui CDN browser.

--------------------------------------------------------------------------------
CARA MEMULAI (LANGKAH PENGGUNAAN):
--------------------------------------------------------------------------------
1. Ekstrak seluruh isi file ZIP ini ke salah satu folder di laptop Anda
   (misalnya di Desktop atau Documents). Jangan jalankan langsung dari dalam ZIP.
2. Buka folder hasil ekstrak.
3. Dobel-klik file:
   >> Buka_Aplikasi.bat <<
4. Sebuah jendela terminal hitam (CMD) akan muncul dan menjalankan server lokal
   secara otomatis.
5. Browser default laptop Anda (Microsoft Edge / Google Chrome) akan terbuka
   secara otomatis dan memuat alamat:
   http://localhost:8080/ (atau port lokal lain yang tersedia).
6. PENTING:
   Jendela terminal hitam (Buka_Aplikasi.bat) HARUS TETAP DIBUKA selama Anda
   menggunakan aplikasi. Jika jendela tersebut ditutup, aplikasi di browser
   tidak dapat dimuat ulang.

--------------------------------------------------------------------------------
FITUR DAN CARA PENYIMPANAN:
--------------------------------------------------------------------------------
1. Penyimpanan Data (LocalStorage):
   - Seluruh data yang Anda masukkan (Report Setup, Weekly Chart, Jumper Register)
     tersimpan secara otomatis di memori lokal peramban (LocalStorage browser Anda).
   - Data tidak hilang meskipun tab browser ditutup atau laptop direstart,
     selama cache/data situs browser tidak dibersihkan secara manual.

2. Download PPTX:
   - Klik tombol "Download PPTX" di bagian atas halaman.
   - File PowerPoint widescreen 16:9 akan terunduh dan dapat diedit sepenuhnya
     (fully editable text, shapes, dan charts) menggunakan Microsoft PowerPoint.

3. Download PDF:
   - Klik tombol "Download PDF" di bagian atas halaman.
   - File PDF 1 halaman landscape 16:9 beresolusi tinggi akan terunduh sesuai
     tampilan persis pada panel "Single-Slide Report Preview".

--------------------------------------------------------------------------------
CARA MENUTUP APLIKASI:
--------------------------------------------------------------------------------
Setelah selesai bekerja:
1. Tutup tab aplikasi di browser Anda.
2. Klik tombol silang (X) pada jendela terminal hitam "Buka_Aplikasi.bat"
   atau tekan tombol [Ctrl + C] pada keyboard. Server lokal akan berhenti secara
   bersih.

================================================================================
TIM AUTOMATION — PROCESS PLANT AREA (PPA)
================================================================================
