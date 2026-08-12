import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function TemplateList() {
  const { isAdmin } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/templates')
      .then(res => setTemplates(res.data.templates || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus template "${name}"?`)) return;
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Gagal menghapus');
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((t) => (
            <div key={t.id} className="card flex flex-col hover:shadow-md transition-shadow">
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#008f51]/10 text-[#008f51] flex items-center justify-center text-xl">
                    📄
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 leading-tight">{t.name}</h3>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block">
                      {t.field_count} Placeholder
                    </p>
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
                  {isAdmin && (
                    <>
                      <Link to={`/templates/${t.id}/edit`} className="btn-ghost px-3 py-2 text-slate-500 hover:text-[#008f51]" title="Konfigurasi Form">
                        ⚙️
                      </Link>
                      <button onClick={() => handleDelete(t.id, t.name)} className="btn-ghost px-3 py-2 text-slate-500 hover:text-red-600 hover:bg-red-50 border-transparent hover:border-red-200" title="Hapus Template">
                        🗑️
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
