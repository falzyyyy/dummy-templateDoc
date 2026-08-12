import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

export default function History() {
  const { isAdmin } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents').then(res => setDocuments(res.data.documents || []))
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (id, name) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/documents/${id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${name}.docx`; a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('Gagal mengunduh dokumen.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus riwayat dokumen ini?')) return;
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) { alert(err.response?.data?.error || 'Gagal menghapus.'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-slate-500">Memuat riwayat...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat Dokumen</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin ? 'Seluruh riwayat dokumen yang dihasilkan oleh semua user.' : 'Daftar dokumen yang pernah Anda buat.'}
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Belum Ada Riwayat</h3>
          <p className="text-sm text-slate-500">Dokumen yang telah digenerate akan muncul di sini.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4">Nama Template</th>
                  {isAdmin && <th className="px-6 py-4">Dibuat Oleh</th>}
                  <th className="px-6 py-4">Tanggal Buat</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#008f51]/10 flex items-center justify-center text-[#008f51] flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <span className="font-medium text-slate-800">{doc.template_name}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <span className="text-slate-600">{doc.user_name}</span>
                      </td>
                    )}
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(doc.created_at).toLocaleString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDownload(doc.id, doc.template_name)} className="btn-ghost px-3 py-1.5 text-xs text-slate-600 hover:text-[#008f51]" title="Unduh">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          <span className="hidden sm:inline-block">Unduh</span>
                        </button>
                        <button onClick={() => handleDelete(doc.id)} className="btn-danger px-3 py-1.5 text-xs text-slate-500 hover:text-red-600 hover:border-red-200 border-transparent hover:bg-red-50" title="Hapus">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
