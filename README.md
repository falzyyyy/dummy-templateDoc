# 📄 DocGen PTPN - Sistem Generate Dokumen Dinamis

DocGen adalah aplikasi berbasis web kelas *enterprise* yang memungkinkan instansi/perusahaan (seperti PT. Perkebunan Nusantara) untuk menghasilkan dokumen Microsoft Word (`.docx`) dan PDF secara otomatis, terstruktur, dan dinamis. 

Sistem ini membaca file template Word yang di-upload oleh Admin, mendeteksi *placeholder* (seperti `${Nama Karyawan}` di *body*, *header*, maupun *footer*), lalu membuatkan formulir web (UI) secara otomatis agar *User* dapat mengisi dan mengunduh dokumen akhir tanpa merusak format/style asli dari template tersebut.

![Frontend Preview](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-blue?style=for-the-badge&logo=react)
![Backend Preview](https://img.shields.io/badge/Backend-CodeIgniter%204%20REST%20API-EF4223?style=for-the-badge&logo=codeigniter)

---

## ✨ Fitur Utama

- 🔐 **Hierarchical RBAC (Role-Based Access Control)**: Sistem keamanan multi-level dengan otentikasi JWT:
  - **Superadmin**: Akses penuh lintas direktorat.
  - **Admin Direktorat**: Hanya dapat mengelola *User* dan *Template* di dalam cakupan direktoratnya sendiri (terisolasi secara data).
  - **User**: Hanya dapat menggunakan *Template* untuk di-generate menjadi dokumen.
- 🏢 **Manajemen Organisasi**: Pengelompokan user dan template berdasarkan **Direktorat** dan **Divisi**.
- 🗂️ **Kategori Template**: Sistem klasifikasi template dokumen agar mudah dicari dan dikelompokkan sesuai kebutuhan (misal: Surat Keputusan, Kontrak Kerja, dll).
- 📁 **Smart Template Parsing**: Membedah isi file Word secara otomatis untuk mencari *placeholder*. Mendukung deteksi hingga ke bagian *Header* dan *Footer* dokumen.
- ⚙️ **Konfigurasi Field Tingkat Lanjut**: Admin dapat mengatur berbagai tipe *input form* canggih:
  - **Teks Pendek & Panjang**
  - **Tanggal** (*Datepicker*)
  - **Mata Uang (Currency)**: Otomatis memformat input dengan prefix "Rp." dan ribuan (misal: `15.000.000`).
  - **Auto Terbilang**: Angka Rupiah otomatis dikonversi menjadi huruf kapital (*spelled-out text*) di dokumen (misal: "Lima Belas Juta Rupiah").
  - **Rich Text (CKEditor 5)**: Input paragraf bergaya. Mendukung *Nested Lists* (bullet/numbering bertingkat), *Indent/Outdent*, manipulasi ukuran Tabel, dan penyisipan Gambar *resizable* yang semuanya ditranslasikan 1:1 ke dokumen Word asli berkat parser DOMDocument.
- 📄 **Export to PDF**: Fitur *on-the-fly conversion* dari DOCX hasil *generate* menjadi PDF (membutuhkan LibreOffice terinstal di server).
- 🕒 **Riwayat & Pelacakan**: Pantau siapa saja yang men-generate dokumen beserta *timestamp* pembuatannya.

---

## 🛠️ Tech Stack

**Backend (REST API):**
- **Framework**: [CodeIgniter 4](https://codeigniter.com/) (PHP 8.1+)
- **Database**: MySQL
- **Word Processor**: [PHPOffice/PHPWord](https://github.com/PHPOffice/PHPWord) + Custom DOMDocument Parser
- **PDF Converter**: LibreOffice Headless
- **Security**: Firebase JWT (JSON Web Token)

**Frontend (SPA):**
- **Framework**: [React.js](https://react.dev/) (menggunakan Vite)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Editor**: [CKEditor 5 React](https://ckeditor.com/docs/ckeditor5/latest/getting-started/installation/react.html)
- **State Management & Routing**: React Context, React Router DOM
- **HTTP Client**: Axios

---

## 🚀 Cara Instalasi (Setup Lokal)

Syarat sistem yang harus terinstall:
- **PHP** (Versi 8.1 ke atas)
- **Composer**
- **Node.js** & **NPM**
- **MySQL** (Disarankan menggunakan **Laragon** atau XAMPP)
- **LibreOffice** (Opsional, WAJIB jika ingin fitur Export to PDF aktif)

### 1. Setup Backend (CodeIgniter 4)

1. Buka terminal/Command Prompt dan masuk ke direktori root project.
2. Install semua *dependency* PHP (termasuk PHPWord & JWT):
   ```bash
   composer install
   ```
3. Buat database kosong di MySQL dengan nama **`docgen`**.
4. Duplicate file `env` menjadi `.env` (Jika belum ada), lalu atur konfigurasi database-nya:
   ```env
   database.default.hostname = localhost
   database.default.database = docgen
   database.default.username = root
   database.default.password = 
   database.default.DBDriver = MySQLi
   
   # Konfigurasi JWT Secret Key (Ubah dengan string acak untuk production)
   jwt.secret = "rahasia_ptpn_2026_super_aman"
   ```
5. Buat folder untuk menampung file upload:
   ```bash
   mkdir public\uploads\templates
   mkdir public\uploads\documents
   ```
6. Jalankan migrasi database untuk membuat tabel-tabel:
   ```bash
   php spark migrate
   ```
7. *Seed* (buat) akun Superadmin pertama kali:
   ```bash
   php spark db:seed AdminSeeder
   ```
8. Jalankan server Backend:
   ```bash
   php spark serve --port 8080
   ```

### 2. Setup Frontend (React)

1. Buka **Terminal Baru** (jangan matikan terminal backend).
2. Masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
3. Install semua *dependency* Node.js:
   ```bash
   npm install
   ```
4. Jalankan server Frontend:
   ```bash
   npm run dev
   ```

Aplikasi sekarang dapat diakses melalui browser di: 👉 **`http://localhost:5173`**

---

## 📖 Panduan Penggunaan (Cara Kerja)

### 1. Struktur Organisasi & Akses
Sebelum membuat *User* atau *Template*, **Superadmin** disarankan untuk membuat **Kategori Template**, **Direktorat**, dan **Divisi** terlebih dahulu. Ini berguna agar *Template* yang di-upload nantinya rapi dan *User* hanya bisa mengakses *Template* di dalam direktoratnya masing-masing.

### 2. Membuat & Upload Template Word (.docx)
1. Buka **Microsoft Word** di komputer Anda.
2. Buat dokumen surat/laporan seperti biasa.
3. Untuk teks yang dinamis, gunakan format **`${Nama Field}`** (bisa diletakkan di dalam tabel, *header*, *footer*, atau paragraf mana saja).
   *Contoh isi di file Word:*
   > "Dengan ini menugaskan **`${Nama Karyawan}`** sebagai **`${Jabatan}`** untuk dinas ke kota **`${Tujuan}`**."
4. Simpan file dengan ekstensi `.docx`.
5. Di aplikasi web, buka menu **Upload Template**, lengkapi form metadata, dan tarik-lepas (drag-and-drop) file Word tersebut.

### 3. Konfigurasi Smart Fields
Setelah template di-upload, klik logo gear (⚙️) pada template tersebut. Admin dapat mengatur:
- **Tipe Input**: Teks Biasa, Paragraf, Angka (Mata Uang), Tanggal, atau **Rich Text (CKEditor)**.
- **Auto Terbilang**: Jika tipe *Currency* dipilih, Admin dapat menghubungkannya dengan field lain (seperti `${Nominal Terbilang}`) agar angkanya otomatis dikonversi ke teks bahasa Indonesia (contoh: *Dua Juta Rupiah*).

### 4. Generate & Unduh Dokumen
1. Buka menu **Daftar Template** dan klik tombol **Gunakan**.
2. User mengisi form web yang sudah otomatis terbentuk. Fitur seperti tabel dinamis, gambar *resizable*, dan daftar (*list*) bertingkat di *Rich Text* bisa dimanfaatkan penuh.
3. Klik **Generate Dokumen**.
4. User bisa mengunduh hasilnya sebagai dokumen **.docx** yang siap dicetak, atau **.pdf** yang siap diedarkan secara digital (jika *convert engine* aktif).

---

## 📂 Struktur Folder Utama

```text
├── app/
│   ├── Controllers/Api/   # Logika Endpoint REST API
│   ├── Database/          # File Migrasi (Schema DB) & Seeder
│   ├── Filters/           # Filter Otorisasi JWT & Role (RBAC Scope)
│   ├── Libraries/         # Custom DocxGenerator (DOMDocument HTML Parser) & TerbilangService
│   └── Models/            # Query & Relasi Database
├── frontend/
│   ├── src/
│   │   ├── api/           # Konfigurasi Axios & Token Interceptor
│   │   ├── components/    # Reusable UI (Sidebar, Modal, Card)
│   │   ├── pages/         # Halaman Aplikasi Tersegmentasi (Users, Divisions, dll)
│   │   └── App.jsx        # Routing React (Protected Routes)
│   └── vite.config.js     # Konfigurasi Proxy Backend
└── public/
    └── uploads/           # Penyimpanan statis template (.docx) dan hasil generate
```

---

## 🔒 Keamanan
Sistem ini memisahkan Frontend dan Backend (Decoupled). Autentikasi dilakukan menggunakan **JWT (JSON Web Token)** yang memuat *payload* jabatan dan cakupan area kerja (Direktorat ID). Filter tingkat lanjut di CodeIgniter akan menolak eksekusi API apa pun (`403 Forbidden`) jika *User* mencoba meretas manipulasi data di luar divisi/direktorat yang diizinkan.

---
*Dibuat untuk memfasilitasi otomasi persuratan perusahaan secara masif, aman, dan tanpa celah desain format.* 🚀
