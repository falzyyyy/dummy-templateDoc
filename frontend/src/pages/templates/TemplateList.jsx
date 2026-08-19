import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import api from '../../api/axios';

export default function TemplateList() {
  const { isAdmin, hasPermission } = useAuth();
  const { showAlert } = useAlert();
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' });

  useEffect(() => {
    Promise.all([
      api.get('/templates'),
      api.get('/categories')
    ]).then(([tplRes, catRes]) => {
      setTemplates(tplRes.data.templates || []);
      setCategories(catRes.data.categories || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-slate-500">Memuat template...</p></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Daftar Template</h1>
          <p className="text-sm text-slate-500 mt-1">Pilih template yang tersedia untuk men-generate dokumen baru.</p>
        </div>
        {isAdmin && (
          <Link to="/templates/upload" className="btn-primary shadow-sm">
            + Upload Template
          </Link>
        )}
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
                  <Link to={`/templates/${t.slug}/fill`} className="btn-primary flex-1 justify-center py-2">
                    Gunakan
                  </Link>
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
    </div>
  );
}
