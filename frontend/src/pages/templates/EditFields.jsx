import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';

const FIELD_TYPES = [
  { value: 'text', label: 'Teks Pendek (1 baris)' },
  { value: 'textarea', label: 'Teks Panjang (Paragraf)' },
  { value: 'richtext', label: 'Editor Teks (Rich Text)' },
  { value: 'date', label: 'Pilih Tanggal' },
  { value: 'number', label: 'Angka (Number)' },
  { value: 'currency', label: 'Mata Uang (Rupiah)' },
  { value: 'image', label: 'Upload Gambar (Logo/Kop)' },
];

export default function EditFields() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert } = useAlert();
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  
  // Template Info State
  const [templateName, setTemplateName] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [directorateId, setDirectorateId] = useState('');
  const [description, setDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/templates'),
      api.get('/categories'),
      api.get('/directorates')
    ]).then(([tplRes, catRes, dirRes]) => {
      setCategories(catRes.data.categories || []);
      setDirectorates(dirRes.data.directorates || []);
      const t = tplRes.data.templates.find(t => String(t.id) === String(id));
      if (t) {
        setTemplate(t);
        setTemplateName(t.name);
        setCategoryId(t.category_id || '1');
        setDirectorateId(t.directorate_id || '');
        setDescription(t.description || '');
        return api.get(`/templates/${t.slug}`).then(r => setFields(r.data.template.fields || []));
      }
    }).catch(() => navigate('/templates')).finally(() => setLoading(false));
  }, [id, navigate]);

  const updateField = (i, key, val) => setFields(p => p.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  const moveField = (i, dir) => {
    const n = [...fields]; const t = i + dir;
    if (t < 0 || t >= n.length) return;
    [n[i], n[t]] = [n[t], n[i]]; setFields(n);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 1. Update Template Info
      await api.put(`/templates/${id}`, {
        name: templateName,
        category_id: categoryId,
        directorate_id: directorateId === '' ? null : directorateId,
        description: description
      });

      // 2. Update Fields Configuration
      await api.put(`/templates/${id}/fields`, {
        fields: fields.map((f, i) => ({ 
          id: f.id,
          field_key: f.field_key, 
          field_label: f.field_label, 
          field_type: f.field_type, 
          field_order: i + 1, 
          is_required: f.is_required ? 1 : 0, 
          default_value: f.default_value || null,
          terbilang_target_id: f.terbilang_target_id || null
        }))
      });

      showAlert('success', 'Berhasil', 'Informasi dan konfigurasi berhasil disimpan!'); 
      navigate('/templates');
    } catch (err) { 
      showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menyimpan.'); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-slate-500 gap-2">
      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
      Memuat Konfigurasi...
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Konfigurasi Form</h1>
          <p className="text-sm text-slate-500 mt-1">
            Template: <span className="font-semibold text-slate-700">{template?.name}</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={() => navigate('/templates')} className="btn-ghost flex-1 sm:flex-none">Batal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 sm:flex-none">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Template Info Card */}
      <div className="card p-6 space-y-4 bg-white">
        <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mb-4">Informasi Dasar Template</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Template</label>
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input-field bg-white">
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Direktorat</label>
            <select value={directorateId} onChange={(e) => setDirectorateId(e.target.value)} className="input-field bg-white">
              <option value="">-- Template Global (Semua) --</option>
              {directorates.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Singkat</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input-field min-h-[80px]" />
        </div>
      </div>

      <h2 className="text-lg font-bold text-slate-800 mt-8 mb-4">Konfigurasi Placeholder (Form)</h2>
      
      <div className="card divide-y divide-slate-100">
        {fields.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Tidak ada placeholder yang terdeteksi di dokumen ini.</div>
        ) : (
          fields.map((field, index) => (
            <div key={field.id || index} className="p-5 flex flex-col sm:flex-row gap-4 items-start bg-white hover:bg-slate-50 transition-colors">
              {/* Controls */}
              <div className="flex sm:flex-col gap-1 sm:pt-6">
                <button onClick={() => moveField(index, -1)} disabled={index === 0} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white shadow-sm transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button onClick={() => moveField(index, 1)} disabled={index === fields.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white shadow-sm transition-all">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              
              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                {/* Placeholder Key (read-only) */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Kode Placeholder</label>
                  <div className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 text-slate-500 text-sm rounded-lg cursor-not-allowed font-mono">
                    ${'{'}${field.field_key}{'}'}
                  </div>
                </div>
                
                {/* Label */}
                <div className="lg:col-span-4">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Label di Form</label>
                  <input type="text" value={field.field_label} onChange={(e) => updateField(index, 'field_label', e.target.value)} className="input-field bg-white" />
                </div>
                
                {/* Type */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Tipe Input</label>
                  <select value={field.field_type} onChange={(e) => updateField(index, 'field_type', e.target.value)} className="input-field bg-white">
                    {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                
                {/* Required */}
                <div className="lg:col-span-2 flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked={field.is_required == 1} onChange={(e) => updateField(index, 'is_required', e.target.checked ? 1 : 0)} className="w-4 h-4 rounded border-slate-300 text-[#008f51] focus:ring-[#008f51] transition-colors" />
                    <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">Wajib Diisi</span>
                  </label>
                </div>

                {/* Terbilang Target Mapping (Khusus Currency) */}
                {field.field_type === 'currency' && (
                  <div className="lg:col-span-12 mt-2 pt-3 border-t border-slate-100">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Target Field Terbilang (Opsional)</label>
                    <select 
                      value={field.terbilang_target_id || ''} 
                      onChange={(e) => updateField(index, 'terbilang_target_id', e.target.value)} 
                      className="input-field bg-white"
                    >
                      <option value="">-- Tidak ada --</option>
                      {fields.filter(f => f.id !== field.id && f.field_type !== 'currency').map(f => (
                        <option key={f.id} value={f.id}>${'{'}{f.field_key}{'}'}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 mt-1">Pilih placeholder mana yang akan otomatis diisi oleh teks terbilang (misal: "Sepuluh Juta Rupiah"). Target yang dipilih akan disembunyikan dari form pengisian dokumen.</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
