import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAlert } from '../../context/AlertContext';
import api from '../../api/axios';

export default function History() {
  const { isAdmin, user } = useAuth();
  const { showAlert } = useAlert();
  const [documents, setDocuments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', id: null });

  // Filter States
  const [scopeFilter, setScopeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    const params = {};
    if (scopeFilter !== 'all') params.scope = scopeFilter;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;

    api.get('/documents', { params })
      .then(res => setDocuments(res.data.documents || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [scopeFilter, searchQuery, startDate, endDate]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

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
    } catch { showAlert('error', 'Gagal', 'Gagal mengunduh dokumen.'); }
  };

  const handleDelete = async (id) => {
    setConfirmDialog({ isOpen: true, type: 'single', id: id });
  };

  const executeDelete = async (id) => {
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
      showAlert('success', 'Berhasil', 'Dokumen berhasil dihapus.');
    } catch (err) { 
      showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menghapus.'); 
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(documents.map(doc => doc.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    setConfirmDialog({ isOpen: true, type: 'bulk', id: null });
  };

  const executeBulkDelete = async () => {
    setDeleting(true);
    try {
      const res = await api.post('/documents/bulk-delete', { document_ids: selectedIds });
      setDocuments(prev => prev.filter(d => !selectedIds.includes(d.id)));
      setSelectedIds([]);
      showAlert('success', 'Berhasil', res.data.message || 'Dokumen terpilih berhasil dihapus.');
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menghapus massal.');
    } finally {
      setDeleting(false);
    }
  };

  const handleConfirmAction = async () => {
    const { type, id } = confirmDialog;
    setConfirmDialog({ isOpen: false, type: '', id: null });
    
    if (type === 'single') {
      await executeDelete(id);
    } else if (type === 'bulk') {
      await executeBulkDelete();
    }
  };

  const resetFilters = () => {
    setScopeFilter('all');
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
  };

  const isFiltered = scopeFilter !== 'all' || searchQuery !== '' || startDate !== '' || endDate !== '';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Riwayat Dokumen</h1>
        <p className="text-sm text-slate-500 mt-1">
          {isAdmin ? 'Seluruh riwayat dokumen yang dihasilkan oleh semua user.' : 'Daftar dokumen yang pernah Anda buat.'}
        </p>
      </div>

      {/* Filter Toolbar Section */}
      <div className="card p-4 space-y-4 bg-white border border-slate-200">
        {/* Scope Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: 'Semua Dokumen' },
              { id: 'own', label: 'Dokumen Saya' },
              { id: 'division', label: 'Divisi Saya' },
              { id: 'directorate', label: 'Direktorat Saya' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setScopeFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scopeFilter === tab.id 
                    ? 'bg-white text-[#008f51] shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Reset Filter
            </button>
          )}
        </div>

        {/* Search & Date Filter Bar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          {/* Search Bar */}
          <div className="md:col-span-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan nama template atau nama pembuat..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#008f51]/20 focus:border-[#008f51] transition-all"
            />
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>

          {/* Date Picker Start */}
          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-slate-400 font-medium whitespace-nowrap">Dari:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#008f51]"
            />
          </div>

          {/* Date Picker End */}
          <div className="md:col-span-3 flex items-center gap-2">
            <span className="text-slate-400 font-medium whitespace-nowrap">Sampai:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-[#008f51]"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh] text-slate-500 gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          Memuat riwayat...
        </div>
      ) : documents.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-full flex items-center justify-center text-3xl mb-4">📭</div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Tidak Ada Dokumen</h3>
          <p className="text-sm text-slate-500">
            {isFiltered ? 'Tidak ada dokumen yang cocok dengan filter pencarian.' : 'Dokumen yang telah digenerate akan muncul di sini.'}
          </p>
          {isFiltered && (
            <button onClick={resetFilters} className="mt-4 text-xs font-semibold text-[#008f51] hover:underline">
              Bersihkan Filter
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Action Bar (Muncul kalau ada yang dipilih) */}
          {selectedIds.length > 0 && (
            <div className="bg-blue-50/50 border-b border-blue-100 px-4 py-3 flex items-center justify-between animate-fade-in">
              <span className="text-sm font-medium text-blue-800">
                {selectedIds.length} dokumen terpilih
              </span>
              <button 
                onClick={handleBulkDelete} 
                disabled={deleting}
                className="btn-danger py-1.5 px-4 text-xs font-semibold flex items-center gap-2"
              >
                {deleting ? 'Menghapus...' : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    Hapus {selectedIds.length} Terpilih
                  </>
                )}
              </button>
            </div>
          )}
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      checked={documents.length > 0 && selectedIds.length === documents.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th className="px-6 py-4">Nama Template</th>
                  {isAdmin && <th className="px-6 py-4">Dibuat Oleh</th>}
                  <th className="px-6 py-4">Tanggal Buat</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(doc.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 w-12 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={selectedIds.includes(doc.id)}
                        onChange={() => handleSelectRow(doc.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-[#008f51]/10 flex items-center justify-center text-[#008f51] flex-shrink-0">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">{doc.template_name}</span>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            {(doc.directorate_name || doc.division_name) && (
                              <span className="text-[10px] text-purple-600 font-medium bg-purple-50 px-2 py-0.5 rounded-full inline-block border border-purple-100">
                                {doc.directorate_name ? (
                                  <>{doc.directorate_name} &gt; {doc.division_name || 'Semua Divisi'}</>
                                ) : (
                                  'Global'
                                )}
                              </span>
                            )}

                            {doc.parent_id && (
                              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 border border-blue-200" title={`Revisi dari Dokumen #${doc.parent_id}`}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Revisi dari #{doc.parent_id}
                              </span>
                            )}
                          </div>
                        </div>
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
                        {doc.template_slug && (
                          <Link 
                            to={`/templates/${doc.template_slug}/fill?revisi_dari=${doc.id}`} 
                            className="btn-ghost px-3 py-1.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors"
                            title="Revisi Dokumen"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            <span className="hidden sm:inline-block font-medium">Revisi</span>
                          </Link>
                        )}
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

      {/* Modal Konfirmasi Hapus */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {confirmDialog.type === 'bulk' 
                  ? `Apakah Anda yakin ingin menghapus ${selectedIds.length} dokumen terpilih secara permanen? Data yang dihapus tidak dapat dikembalikan.`
                  : 'Apakah Anda yakin ingin menghapus dokumen ini secara permanen? Data yang dihapus tidak dapat dikembalikan.'
                }
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button 
                onClick={() => setConfirmDialog({ isOpen: false, type: '', id: null })} 
                className="btn-ghost flex-1 py-2.5 text-sm font-medium"
              >
                Batal
              </button>
              <button 
                onClick={handleConfirmAction} 
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold flex-1 shadow-sm transition-colors active:scale-95"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
