import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';

export default function UploadTemplate() {
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  const [categoryId, setCategoryId] = useState('1');
  const [directorateId, setDirectorateId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/categories'),
      api.get('/directorates')
    ])
    .then(([catRes, dirRes]) => {
      setCategories(catRes.data.categories || []);
      setDirectorates(dirRes.data.directorates || []);
    })
    .catch(err => console.error("Gagal load data form:", err));
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.docx')) {
      setFile(droppedFile);
      if (!name) setName(droppedFile.name.replace('.docx', ''));
    } else {
      setError('Hanya file .docx yang diterima.');
    }
  };

  const handleFileSelect = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!name) setName(selected.name.replace('.docx', ''));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Pilih file .docx terlebih dahulu.'); return; }

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('description', description);
    formData.append('category_id', categoryId);
    formData.append('directorate_id', directorateId);

    try {
      const res = await api.post('/templates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showAlert('success', 'Berhasil!', res.data.message);
      navigate('/templates');
    } catch (err) {
      showAlert('error', 'Upload Gagal', err.response?.data?.error || 'Gagal mengupload template.');
      setError(err.response?.data?.error || 'Gagal mengupload template.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upload Template Baru</h1>
        <p className="text-sm text-slate-500 mt-1">Upload dokumen Microsoft Word (.docx) yang berisi placeholder.</p>
      </div>

      {/* Guide */}
      <div className="card p-5 bg-blue-50 border-blue-100 flex gap-4">
        <div className="text-blue-500 text-xl mt-0.5">ℹ️</div>
        <div>
          <h3 className="text-sm font-semibold text-blue-900 mb-1">Panduan Membuat Placeholder</h3>
          <p className="text-sm text-blue-800/80 leading-relaxed">
            Di dalam file Word, tuliskan bagian yang ingin diisi secara dinamis dengan format <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-medium text-blue-600">{"${Nama Field}"}</code>.
            <br />Contoh: <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-medium text-blue-600">{"${Nama Karyawan}"}</code> atau <code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 font-medium text-blue-600">{"${Tanggal}"}</code>.
            <br />Sistem akan otomatis mendeteksi dan membuatkan form isian untuk field tersebut.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
        
        {/* Dropzone */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">File Dokumen (.docx)</label>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive ? 'border-[#008f51] bg-[#008f51]/5' : 'border-slate-300 hover:bg-slate-50'
            } ${file ? 'border-[#008f51] bg-[#008f51]/5' : ''}`}
          >
            <input ref={fileInputRef} type="file" accept=".docx" onChange={handleFileSelect} className="hidden" />
            
            {file ? (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <p className="font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-sm font-medium text-red-500 hover:text-red-600 mt-2">
                  Ganti File
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-12 h-12 mx-auto bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-xl mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                </div>
                <p className="font-medium text-slate-700">Tarik dan lepas file di sini</p>
                <p className="text-sm text-slate-500">atau klik untuk menelusuri file</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Template <span className="text-red-500">*</span></label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="Contoh: Surat Tugas Karyawan" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori Template</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field">
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Template</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[100px] resize-y" placeholder="Berikan deskripsi singkat tentang kegunaan template ini..." />
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
          <button type="submit" disabled={loading || !file} className="btn-primary sm:flex-1 py-3 text-base">
            {loading ? 'Mengupload & Parsing...' : 'Upload & Deteksi Placeholder'}
          </button>
          <button type="button" onClick={() => navigate('/templates')} className="btn-ghost py-3">Batal</button>
        </div>
      </form>
    </div>
  );
}
