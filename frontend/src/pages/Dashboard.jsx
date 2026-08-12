import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ total_templates: 0, total_documents: 0, documents_month: 0 });
  const [templates, setTemplates] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/documents/stats'),
      api.get('/templates'),
      api.get('/documents'),
    ]).then(([statsRes, templatesRes, docsRes]) => {
      setStats(statsRes.data.stats);
      setTemplates(templatesRes.data.templates?.slice(0, 6) || []);
      setRecentDocs(docsRes.data.documents?.slice(0, 5) || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: 'Total Template', value: stats.total_templates, icon: '📄', bg: 'bg-blue-50', text: 'text-blue-600' },
    { label: 'Total Dokumen', value: stats.total_documents, icon: '📋', bg: 'bg-[#008f51]/10', text: 'text-[#008f51]' },
    { label: 'Dokumen Bulan Ini', value: stats.documents_month, icon: '📅', bg: 'bg-amber-50', text: 'text-amber-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 font-medium flex items-center gap-2">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          Memuat Dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Selamat Datang, {user?.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin ? 'Pantau aktivitas dokumen dan kelola template perusahaan.' : 'Pilih template untuk mulai generate dokumen baru.'}
          </p>
        </div>
        {isAdmin && (
          <Link to="/templates/upload" className="btn-primary">
            + Upload Template
          </Link>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card p-5 flex items-center gap-4 hover:border-slate-300 transition-colors">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl ${card.bg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">{card.label}</p>
              <p className={`text-2xl font-bold ${card.text}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Templates */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Template Populer</h2>
            <Link to="/templates" className="text-sm text-[#008f51] hover:underline font-medium">Lihat Semua</Link>
          </div>
          
          {templates.length === 0 ? (
            <div className="card p-12 text-center border-dashed">
              <p className="text-slate-500 text-sm">Belum ada template yang tersedia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <Link key={t.id} to={`/templates/${t.slug}/fill`} className="card p-5 hover:border-[#008f51]/50 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded bg-[#008f51]/10 flex items-center justify-center text-lg group-hover:bg-[#008f51] group-hover:text-white transition-colors">
                      📄
                    </div>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                      {t.field_count} Fields
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1">{t.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{t.description || 'Template dokumen standar.'}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Aktivitas Terakhir</h2>
            <Link to="/history" className="text-sm text-[#008f51] hover:underline font-medium">Riwayat</Link>
          </div>
          
          <div className="card">
            {recentDocs.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-500 text-sm">Belum ada dokumen dibuat.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDocs.map((doc) => (
                  <div key={doc.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs">
                      📝
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{doc.template_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">Oleh <span className="font-medium text-slate-600">{doc.user_name}</span></p>
                      <p className="text-[10px] text-slate-400 mt-1">{new Date(doc.created_at).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
