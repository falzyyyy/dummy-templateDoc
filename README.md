# 📄 DocGen PTPN - Sistem Generate Dokumen Dinamis

DocGen adalah aplikasi berbasis web yang memungkinkan instansi/perusahaan (seperti PT. Perkebunan Nusantara) untuk menghasilkan dokumen Microsoft Word (`.docx`) secara otomatis dan dinamis. 

Sistem ini membaca file template Word yang di-upload oleh Admin, mendeteksi *placeholder* (seperti `${Nama Karyawan}`), lalu membuatkan formulir web (UI) secara otomatis agar *User* dapat mengisi dan mengunduh dokumen akhir tanpa merusak format/style asli dari template tersebut.

![Frontend Preview](https://img.shields.io/badge/Frontend-React%20%2B%20Tailwind-blue?style=for-the-badge&logo=react)
![Backend Preview](https://img.shields.io/badge/Backend-CodeIgniter%204%20REST%20API-EF4223?style=for-the-badge&logo=codeigniter)

---

## ✨ Fitur Utama

- 🔐 **Autentikasi & Otorisasi (JWT)**: Login sistem dengan pembagian role akses (**Admin** dan **User**).
- 📁 **Smart Template Upload**: Upload file `.docx`. Sistem akan membedah isi file Word dan mencari *placeholder*.
- ⚙️ **Konfigurasi Field Dinamis**: Admin dapat mengatur tipe input form (Teks Pendek, Teks Panjang, Tanggal, Angka) untuk setiap *placeholder* yang terdeteksi.
- 📝 **Auto-Generated Web Form**: User cukup mengisi form di website untuk menghasilkan file Word yang langsung ter-download.
- 🕒 **Riwayat Dokumen**: Pantau siapa saja yang men-generate dokumen dan kapan dokumen tersebut dibuat.
- 🎨 **Modern & Responsive UI**: Antarmuka bersih bergaya *Clean Light Mode* khas korporat yang dibangun menggunakan **Tailwind CSS**.

---

## 🛠️ Tech Stack

**Backend (REST API):**
- **Framework**: [CodeIgniter 4](https://codeigniter.com/) (PHP 8.1+)
- **Database**: MySQL
- **Word Processor**: [PHPOffice/PHPWord](https://github.com/PHPOffice/PHPWord) (Library untuk memanipulasi .docx)
- **Security**: Firebase JWT (JSON Web Token)

**Frontend (SPA):**
- **Framework**: [React.js](https://react.dev/) (menggunakan Vite)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management & Routing**: React Context, React Router DOM
- **HTTP Client**: Axios

---

## 🚀 Cara Instalasi (Setup Lokal)

Syarat sistem yang harus terinstall:
- **PHP** (Versi 8.1 ke atas)
- **Composer**
- **Node.js** & **NPM**
- **MySQL** (Disarankan menggunakan **Laragon** atau XAMPP)

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
7. *Seed* (buat) akun Admin pertama kali:
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

### 1. Login
Masuk ke sistem menggunakan akun *Default Admin* yang sudah dibuat:
- **Email**: `admin@docgen.com`
- **Password**: `admin123`

*(Catatan: Setelah login, Anda bisa membuat akun baru di menu **Kelola User**).*

### 2. Membuat & Upload Template Word (.docx)
1. Buka **Microsoft Word** di komputer Anda.
2. Buat dokumen surat/laporan seperti biasa (termasuk kop surat, tabel, style bold/italic).
3. Untuk bagian teks yang ingin diisi secara dinamis oleh aplikasi, gunakan format **`${Nama Field}`**.
   *Contoh isi di file Word:*
   > "Dengan ini menugaskan **`${Nama Karyawan}`** sebagai **`${Jabatan}`** untuk dinas ke kota **`${Tujuan}`**."
4. Simpan file dengan ekstensi `.docx`.
5. Di aplikasi web, buka menu **Upload Template** dan tarik-lepas (drag-and-drop) file Word tersebut.

### 3. Konfigurasi Field
Setelah template di-upload, klik logo gear (⚙️) pada template tersebut. Admin dapat mengatur:
- **Label Form**: Label yang akan dibaca oleh user saat mengisi form (misal: "Masukkan Nama Lengkap").
- **Tipe Input**: Teks 1 baris, Paragraf, Angka (Number), atau Tanggal (Date picker).
- **Status Wajib**: Apakah kolom ini wajib diisi atau tidak.

### 4. Generate Dokumen
1. Buka menu **Daftar Template** dan klik tombol **Gunakan**.
2. User cukup mengisi form di layar. 
3. Klik **Generate & Unduh Dokumen**.
4. File Word baru akan terunduh otomatis berisi data yang dimasukkan, *tanpa* mengubah format asli/tabel dari template Word awal!

---

## 📂 Struktur Folder Utama

```text
├── app/
│   ├── Controllers/Api/   # Logika Endpoint REST API
│   ├── Database/          # File Migrasi (Schema DB) & Seeder
│   ├── Filters/           # Filter Otentikasi (JWT & Admin)
│   ├── Libraries/         # Logic PHPWord (DocxParser & DocxGenerator)
│   └── Models/            # Model Database
├── frontend/
│   ├── src/
│   │   ├── api/           # Konfigurasi Axios & Token Interceptor
│   │   ├── components/    # Reusable UI (Layout, Sidebar)
│   │   ├── context/       # AuthContext (State Management Global)
│   │   ├── pages/         # Halaman Aplikasi (Dashboard, Login, dll)
│   │   ├── App.jsx        # Routing React
│   │   └── index.css      # File konfigurasi Tailwind CSS (Clean Light Mode)
│   ├── package.json       # Dependencies React
│   └── vite.config.js     # Konfigurasi Vite & Proxy Backend
└── public/
    └── uploads/           # Folder tempat penyimpanan .docx asli & hasil generate
```

---

## 🔒 Keamanan
Sistem ini memisahkan Frontend dan Backend (Decoupled). Autentikasi dilakukan menggunakan **JWT (JSON Web Token)**. Frontend menyimpan JWT di `localStorage` dan melampirkannya di dalam *header authorization* pada setiap *request* yang dilindungi ke Backend.

---
*Dibuat untuk memudahkan otomatisasi dokumen secara masif.* 🚀
