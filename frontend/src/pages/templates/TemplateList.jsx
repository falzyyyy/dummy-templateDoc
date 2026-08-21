import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import api from '../../api/axios';

function timeAgo(dateString) {
  // Tambahkan 'Z' agar browser membaca string DB (UTC) dengan benar ke zona waktu lokal pengguna
  const safeDateString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T') + 'Z';
  const date = new Date(safeDateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Baru saja';
  if (minutes < 60) return `${minutes} menit yang lalu`;
  if (hours < 24) return `${hours} jam yang lalu`;
  if (days < 7) return `${days} hari yang lalu`;
  return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TemplateList() {
  const { isAdmin, hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('templates.created_at');
  const [sortDir, setSortDir] = useState('DESC');
  const [directorates, setDirectorates] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [filterDirectorate, setFilterDirectorate] = useState('');
  const [filterDivision, setFilterDivision] = useState('');
  const navigate = useNavigate();

  // Draft Modal States
  const [draftModal, setDraftModal] = useState({ isOpen: false, template: null });
  const [draftHistory, setDraftHistory] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  
  // Custom confirm state for draft
  const [deleteDraftConfirm, setDeleteDraftConfirm] = useState({ isOpen: false, id: null });

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      Promise.all([
        api.get('/templates', {
          params: { search: searchTerm, sort_by: sortBy, sort_dir: sortDir, directorate_id: filterDirectorate, division_id: filterDivision }
        }),
        api.get('/categories'),
        api.get('/directorates'),
        api.get('/divisions')
      ]).then(([tplRes, catRes, dirRes, divRes]) => {
        setTemplates(tplRes.data.templates || []);
        setCategories(catRes.data.categories || []);
        if (dirRes) setDirectorates(dirRes.data.directorates || []);
        if (divRes) setDivisions(divRes.data || []);
      }).catch(console.error)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, sortBy, sortDir, filterDirectorate, filterDivision]);

  const confirmDelete = async (id, name) => {
    setDeleteConfirm({ isOpen: false, id: null, name: '' });
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      showAlert('success', 'Berhasil', `Template "${name}" berhasil dihapus.`);
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menghapus template.');
    }
  };

  const handleGunakan = async (template) => {
    setDraftModal({ isOpen: true, template });
    setLoadingDrafts(true);
    try {
      const res = await api.get('/documents', {
        params: { template_id: template.id, scope: 'own' }
      });
      setDraftHistory(res.data.documents || []);
    } catch (err) {
      console.error(err);
      showAlert('error', 'Gagal memuat riwayat', 'Terjadi kesalahan saat mengambil riwayat dokumen.');
    } finally {
      setLoadingDrafts(false);
    }
  };

  const confirmDeleteDraft = async (id) => {
    setDeleteDraftConfirm({ isOpen: false, id: null });
    try {
      await api.delete(`/documents/${id}`);
      setDraftHistory(prev => prev.filter(doc => doc.id !== id));
      showAlert('success', 'Berhasil', 'Riwayat berhasil dihapus.');
    } catch (err) {
      console.error(err);
      showAlert('error', 'Gagal', 'Terjadi kesalahan saat menghapus riwayat.');
    }
  };

  const handleDeleteDraft = (e, id) => {
    e.stopPropagation();
    setDeleteDraftConfirm({ isOpen: true, id });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-slate-500">Memuat template...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Template</h1>
          <p className="text-sm text-slate-500 mt-1">Pilih template yang tersedia untuk men-generate dokumen baru.</p>
        </div>
        {isAdmin && (
          <Link to="/templates/upload" className="btn-primary shadow-sm whitespace-nowrap">
            + Upload Template
          </Link>
        )}
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input 
              type="text" 
              placeholder="Cari nama atau deskripsi template..." 
              className="input-field w-full pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Divider */}
          <div className="hidden lg:block w-px bg-slate-200" />

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Urutkan</label>
              <select 
                className="input-field text-sm"
                value={`${sortBy}|${sortDir}`}
                onChange={(e) => {
                  const [valSort, valDir] = e.target.value.split('|');
                  setSortBy(valSort);
                  setSortDir(valDir);
                }}
              >
                <option value="templates.created_at|DESC">Terbaru</option>
                <option value="templates.created_at|ASC">Terlama</option>
                <option value="templates.name|ASC">Nama (A-Z)</option>
                <option value="templates.name|DESC">Nama (Z-A)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Direktorat</label>
              <select
                className="input-field text-sm"
                value={filterDirectorate}
                onChange={(e) => {
                  setFilterDirectorate(e.target.value);
                  setFilterDivision('');
                }}
              >
                <option value="">Semua</option>
                {directorates.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Divisi</label>
              <select
                className="input-field text-sm"
                value={filterDivision}
                onChange={(e) => setFilterDivision(e.target.value)}
                disabled={!filterDirectorate}
              >
                <option value="">Semua</option>
                {divisions.filter(d => d.directorate_id == filterDirectorate).map(div => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="card p-12 text-center border-dashed">
          <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-2xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Belum Ada Template</h3>
          <p className="text-sm text-slate-500 mb-6">Sistem ini belum memiliki template Word yang bisa digunakan.</p>
          {isAdmin && <Link to="/templates/upload" className="btn-primary">Upload Sekarang</Link>}
        </div>
      ) : (
        <>
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-hide">
            <button 
              onClick={() => setActiveCategory('Semua')} 
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory === 'Semua' ? 'bg-[#008f51] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              Semua
            </button>
            {categories.map(cat => (
              <button key={cat.id} 
                onClick={() => setActiveCategory(cat.id)} 
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${activeCategory == cat.id ? 'bg-[#008f51] text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.filter(t => activeCategory === 'Semua' || t.category_id == activeCategory).map((t) => (
            <div key={t.id} className="card flex flex-col hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#008f51]/10 text-[#008f51] flex items-center justify-center text-xl">
                    📄
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 leading-tight">{t.name}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                        {t.category_name || 'Uncategorized'}
                      </span>
                      <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-2 py-0.5 rounded-full inline-block">
                        {t.field_count} Placeholder
                      </span>
                      <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block border border-purple-100">
                        {t.directorate_name ? (
                          <>{t.directorate_name} &gt; {t.division_name || 'Semua Divisi'}</>
                        ) : (
                          'Global'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 flex-1 flex flex-col">
                <p className="text-sm text-slate-600 mb-4 line-clamp-2 flex-1">
                  {t.description || 'Tidak ada deskripsi untuk template ini.'}
                </p>
                
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {t.uploader_name} • {new Date(t.created_at).toLocaleDateString('id-ID')}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => handleGunakan(t)} className="btn-primary flex-1 justify-center py-2">
                    Gunakan
                  </button>
                  {(isAdmin || hasPermission('upload_template')) && (
                    <>
                      <Link to={`/templates/${t.id}/edit`} className="btn-ghost px-3 py-2 text-slate-500 hover:text-[#008f51]" title="Konfigurasi Form">
                        ⚙️
                      </Link>
                      <button onClick={() => setDeleteConfirm({ isOpen: true, id: t.id, name: t.name })} className="btn-ghost px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200" title="Hapus Template">
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>
          
          {templates.filter(t => activeCategory === 'Semua' || t.category_id == activeCategory).length === 0 && (
            <div className="col-span-full text-center p-10 text-slate-500">
              Tidak ada template di kategori ini.
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-xl mb-4 border border-red-100">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Hapus Template?</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                Apakah Anda yakin ingin menghapus template <span className="font-semibold text-slate-800">"{deleteConfirm.name}"</span>? Tindakan ini tidak dapat dibatalkan dan semua riwayat yang menggunakan template ini mungkin terpengaruh.
              </p>
              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
                  className="btn-ghost px-5 py-2 text-slate-600 hover:bg-slate-100 font-medium"
                >
                  Batal
                </button>
                <button 
                  onClick={() => confirmDelete(deleteConfirm.id, deleteConfirm.name)}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Gunakan Template (Baru vs Riwayat) */}
      {draftModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Gunakan Template</h2>
              <button onClick={() => setDraftModal({ isOpen: false, template: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <p className="text-sm text-slate-600 mb-5">
                Anda akan menggunakan template <strong>{draftModal.template?.name}</strong>. Pilih metode pengisian:
              </p>
              
              <button 
                onClick={() => navigate(`/templates/${draftModal.template?.slug}/fill`)}
                className="w-full flex items-center gap-4 p-4 border border-blue-200 bg-blue-50/50 hover:bg-blue-50 rounded-xl transition-all mb-6 group text-left"
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Buat Dokumen Baru</h3>
                  <p className="text-xs text-blue-700 mt-1">Mulai isi form kosong dari awal.</p>
                </div>
              </button>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800 text-sm">Atau Lanjutkan dari Riwayat</h3>
                <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{draftHistory.length} Riwayat</span>
              </div>

              {loadingDrafts ? (
                <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
                  <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  <span className="text-sm">Memuat riwayat...</span>
                </div>
              ) : draftHistory.length === 0 ? (
                <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-sm text-slate-500">Belum ada riwayat untuk template ini.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftHistory.map((doc, index) => (
                    <div key={doc.id} className="flex items-center gap-2">
                      <button 
                        onClick={() => navigate(`/templates/${draftModal.template?.slug}/fill?${doc.file_path ? 'revisi_dari' : 'draft_id'}=${doc.id}`)}
                        className="flex-1 flex items-center justify-between p-4 border border-slate-200 hover:border-[#008f51] hover:bg-[#008f51]/5 rounded-xl transition-colors text-left group"
                      >
                        <div>
                          <p className="font-medium text-slate-800 text-sm group-hover:text-[#008f51]">
                            {doc.file_path ? 'Dokumen Riwayat' : 'Draf Tertunda'} #{draftHistory.length - index}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5" title={new Date(doc.created_at).toLocaleString('id-ID')}>
                            {timeAgo(doc.created_at)}
                          </p>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#008f51]"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                      </button>
                      <button 
                        onClick={(e) => handleDeleteDraft(e, doc.id)}
                        className="p-4 border border-slate-200 hover:border-red-500 hover:bg-red-50 rounded-xl transition-colors text-slate-400 hover:text-red-500 flex-shrink-0"
                        title="Hapus riwayat ini"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus Draft */}
      {deleteDraftConfirm.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm animate-scale-up">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto text-red-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Hapus Riwayat?</h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Riwayat dokumen ini akan dihapus permanen dan tidak dapat dikembalikan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteDraftConfirm({ isOpen: false, id: null })}
                className="btn-ghost flex-1 py-2 justify-center"
              >
                Batal
              </button>
              <button 
                onClick={() => confirmDeleteDraft(deleteDraftConfirm.id)}
                className="btn-danger flex-1 py-2 justify-center"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
