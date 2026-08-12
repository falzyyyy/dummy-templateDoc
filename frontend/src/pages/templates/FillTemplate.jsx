import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';

export default function FillTemplate() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    api.get(`/templates/${slug}`).then(res => {
      const t = res.data.template;
      setTemplate(t);
      setFields(t.fields || []);
      const initial = {};
      (t.fields || []).forEach(f => { initial[f.field_key] = f.default_value || ''; });
      setFormData(initial);
    }).catch(console.error).finally(() => setLoading(false));
  }, [slug]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true); setErrors({}); setSuccess(null);
    try {
      const res = await api.post(`/documents/generate/${slug}`, { data: formData });
      setSuccess(res.data);
      // Auto download
      const docId = res.data.document.id;
      const token = localStorage.getItem('token');
      const link = document.createElement('a');
      const downloadRes = await fetch(`/api/documents/${docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      link.href = url;
      link.download = `${template.name}.docx`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else alert(err.response?.data?.error || 'Gagal generate dokumen.');
    } finally { setGenerating(false); }
  };

  const renderField = (field) => {
    const val = formData[field.field_key] || '';
    const hasErr = errors[field.field_key];
    const baseClass = `input-field ${hasErr ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`;

    switch (field.field_type) {
      case 'textarea':
        return <textarea value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={`${baseClass} min-h-[120px] resize-y`} placeholder={`Masukkan ${field.field_label}...`} />;
      case 'date':
        return <input type="date" value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={baseClass} />;
      case 'number':
        return <input type="number" value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={baseClass} placeholder="0" />;
      default:
        return <input type="text" value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={baseClass} placeholder={`Masukkan ${field.field_label}...`} />;
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Menyiapkan Template...
    </div>
  );
  if (!template) return <div className="text-center py-20 text-slate-500">Template tidak ditemukan.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate('/templates')} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <span className="text-xs font-semibold text-[#008f51] uppercase tracking-wider">Isi Dokumen</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{template.name}</h1>
        <p className="text-sm text-slate-500 mt-1">{template.description || 'Isi formulir di bawah ini untuk menghasilkan dokumen.'}</p>
      </div>

      <div className="card p-5 bg-slate-50 flex items-start gap-4">
        <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-2xl flex-shrink-0">📝</div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{fields.length} informasi diperlukan</p>
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            Data yang Anda masukkan akan digabungkan secara otomatis ke dalam file Word (<code className="bg-slate-200 px-1 rounded text-slate-700">{template.file_name}</code>) tanpa merusak format aslinya.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3">
          <div className="text-green-500 mt-0.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">{success.message}</p>
            <p className="text-sm text-green-700/80 mt-0.5">Dokumen Anda sedang diunduh secara otomatis.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleGenerate} className="card p-6 sm:p-8 space-y-5">
        {fields.map((field) => (
          <div key={field.id}>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              {field.field_label}
              {field.is_required == 1 && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {errors[field.field_key] && (
              <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                {errors[field.field_key]}
              </p>
            )}
          </div>
        ))}

        <div className="pt-4 mt-6 border-t border-slate-100">
          <button type="submit" disabled={generating} className="btn-primary w-full justify-center py-3.5 text-base shadow-md">
            {generating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Memproses Dokumen...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
                Generate & Unduh Dokumen
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
