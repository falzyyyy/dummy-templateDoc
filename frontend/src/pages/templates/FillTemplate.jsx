import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
    ClassicEditor,
    Essentials,
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Font,
    Paragraph,
    Heading,
    List,
    Alignment,
    Table,
    TableToolbar,
    TableProperties,
    TableCellProperties,
    Undo,
    Highlight,
    Indent,
    IndentBlock,
    ListProperties,
    RemoveFormat,
    Link,
    Image,
    ImageInsert,
    ImageToolbar,
    ImageCaption,
    ImageStyle,
    ImageResize,
    Base64UploadAdapter,
    PasteFromOffice,
    SelectAll,
    GeneralHtmlSupport
} from 'ckeditor5';
import 'ckeditor5/ckeditor5.css';

export default function FillTemplate() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const revisiDariId = searchParams.get('revisi_dari');
  
  const draftKey = revisiDariId 
    ? `docgen_draft_rev_${revisiDariId}` 
    : `docgen_draft_tpl_${slug}`;

  const { showAlert } = useAlert();
  const [template, setTemplate] = useState(null);
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [revisionInfo, setRevisionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [hasPreview, setHasPreview] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  useEffect(() => {
    setIsInitialized(false);
    setHasRestoredDraft(false);

    api.get(`/templates/${slug}`).then(async res => {
      const t = res.data.template;
      setTemplate(t);
      setFields(t.fields || []);
      const initial = {};
      (t.fields || []).forEach(f => { initial[f.field_key] = f.default_value || ''; });
      
      if (revisiDariId) {
        try {
          const revRes = await api.get(`/documents/${revisiDariId}/revision-data`);
          if (revRes.data && revRes.data.data) {
            setRevisionInfo(revRes.data);
            Object.assign(initial, revRes.data.data);
          }
        } catch (err) {
          console.error('Gagal memuat data revisi:', err);
          showAlert('warning', 'Perhatian', 'Gagal memuat data revisi lama.');
        }
      }

      // Cek draft tersimpan di localStorage
      try {
        const savedDraft = localStorage.getItem(draftKey);
        if (savedDraft) {
          const parsedDraft = JSON.parse(savedDraft);
          if (parsedDraft && typeof parsedDraft === 'object') {
            Object.assign(initial, parsedDraft);
            setHasRestoredDraft(true);
          }
        }
      } catch (e) {
        console.error('Error loading draft from localStorage:', e);
      }

      setFormData(initial);
      setIsInitialized(true);
    }).catch(console.error).finally(() => setLoading(false));
  }, [slug, revisiDariId, draftKey]);

  // Auto-save draft ke localStorage setiap kali formData berubah
  useEffect(() => {
    if (!isInitialized) return;
    try {
      // Jika ada setidaknya 1 isi field, simpan. Jika kosong semua, hapus draf.
      const hasContent = Object.values(formData).some(val => val !== '' && val !== null && val !== undefined);
      if (hasContent) {
        localStorage.setItem(draftKey, JSON.stringify(formData));
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch (e) {
      console.error('Gagal menyimpan draf ke localStorage:', e);
    }
  }, [formData, draftKey, isInitialized]);

  const handleResetForm = () => {
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
    
    // Kosongkan seluruh isian field menjadi string kosong
    const emptyData = {};
    fields.forEach(f => {
      emptyData[f.field_key] = '';
    });

    setFormData(emptyData);
    setHasRestoredDraft(false);
    showAlert('info', 'Formulir Dikosongkan', 'Seluruh isi formulir dan draf telah dikosongkan.');
  };

  const handleMuatPreview = async () => {
    setPreviewLoading(true);
    setErrors({}); // reset errors if any

    try {
      const res = await api.post(`/documents/generate/${slug}`, { 
        data: formData, 
        format: 'pdf', 
        is_preview: true 
      });
      
      if (res.data.base64) {
        // Convert base64 to Blob
        const byteCharacters = atob(res.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        
        // Revoke old URL if exists to prevent memory leak
        if (pdfPreviewUrl) {
           URL.revokeObjectURL(pdfPreviewUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
        setHasPreview(true);
        setIsModalOpen(true);
        return blob;
      } else {
          showAlert('error', 'Preview Error', 'Base64 tidak ditemukan dari server.');
          return null;
      }
    } catch (err) {
      console.error("Gagal update preview:", err);
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
        showAlert('error', 'Validasi Gagal', 'Silakan lengkapi semua kolom yang wajib diisi terlebih dahulu.');
      } else {
        showAlert('error', 'Preview Error', err.response?.data?.error || err.message || 'Gagal mengambil preview dari server.');
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };


  const handleGenerate = async (format = 'docx') => {
    setGenerating(format); setErrors({}); setSuccess(null);
    try {
      const res = await api.post(`/documents/generate/${slug}`, { 
        data: formData, 
        format,
        parent_document_id: revisiDariId ? parseInt(revisiDariId, 10) : null
      });

      // Clear draft upon successful generation
      try {
        localStorage.removeItem(draftKey);
        setHasRestoredDraft(false);
      } catch (e) {}

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
      link.download = `${template.name}.${format}`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      showAlert('success', 'Berhasil!', `Dokumen berhasil diunduh sebagai ${format.toUpperCase()}.`);
    } catch (err) {
      if (err.response?.data?.errors) setErrors(err.response.data.errors);
      else showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan saat membuat dokumen.');
    } finally { setGenerating(false); }
  };

  const handleFileChange = (key, file) => {
    if (!file) { handleChange(key, ''); return; }
    const reader = new FileReader();
    reader.onload = (e) => handleChange(key, e.target.result);
    reader.readAsDataURL(file);
  };
  const formatRupiah = (value) => {
    if (!value) return '';
    const number = parseInt(value, 10);
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('id-ID').format(number);
  };

  const renderField = (field) => {
    const val = formData[field.field_key] || '';
    const hasErr = errors[field.field_key];
    const baseClass = `input-field ${hasErr ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : ''}`;

    switch (field.field_type) {
      case 'textarea':
        return <textarea value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={`${baseClass} min-h-[120px] resize-y`} placeholder={`Masukkan ${field.field_label}...`} />;
      case 'richtext':
        return (
          <div className={`prose-sm ${hasErr ? 'border border-red-300 rounded' : ''}`}>
            {/* 1. Tambahkan Custom Style Khusus List di Sini */}
            <style>{`
              .ck-content ul {
                    list-style-type: disc !important;
                    padding-left: 1.5rem !important;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                }

                .ck-content ol {
                    list-style-type: decimal !important;
                    padding-left: 1.5rem !important;
                    margin-top: 0.5rem !important;
                    margin-bottom: 0.5rem !important;
                }

                .ck-content li {
                    display: list-item !important;
                }
            `}</style>
            <div className="flex flex-wrap items-center gap-2 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                Atur Spasi Baris:
              </span>
              {[
                { label: '1.0 (Rapat)', value: '1.0' },
                { label: '1.15 (Standar)', value: '1.15' },
                { label: '1.5 (Sedang)', value: '1.5' },
                { label: '2.0 (Ganda)', value: '2.0' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    let updatedVal = val || '';
                    if (!updatedVal || !updatedVal.includes('<p')) {
                      updatedVal = `<p style="line-height: ${opt.value};">${updatedVal}</p>`;
                    } else {
                      updatedVal = updatedVal.replace(/<p\b([^>]*)>/gi, (m, attrs) => {
                        if (attrs.includes('line-height:')) {
                          return `<p${attrs.replace(/line-height\s*:\s*[^;"]+/i, `line-height: ${opt.value}`)}>`;
                        } else if (attrs.includes('style="')) {
                          return `<p${attrs.replace('style="', `style="line-height: ${opt.value}; `)}>`;
                        } else {
                          return `<p${attrs} style="line-height: ${opt.value};">`;
                        }
                      });
                    }
                    handleChange(field.field_key, updatedVal);
                  }}
                  className="px-2.5 py-1 rounded bg-white hover:bg-[#008f51]/10 hover:text-[#008f51] hover:border-[#008f51]/30 font-medium border border-slate-200 transition-colors shadow-xs"
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <CKEditor
              editor={ClassicEditor}
              data={val}
              config={{
                licenseKey: 'GPL',
                plugins: [
                    Essentials, Bold, Italic, Underline, Strikethrough, Font, Paragraph, 
                    Heading, List, Alignment, Table, TableToolbar, 
                    TableProperties, TableCellProperties, Undo,
                    Highlight, Indent, IndentBlock, 
                    ListProperties, RemoveFormat, Link, Image, ImageInsert, 
                    ImageToolbar, ImageCaption, ImageStyle, ImageResize, 
                    Base64UploadAdapter, PasteFromOffice, SelectAll, GeneralHtmlSupport
                ],
                fontFamily: {
                  options: [
                    'default', // Pilihan default
                    'Arial, Helvetica, sans-serif',
                    'Courier New, Courier, monospace',
                    'Georgia, serif',
                    'Times New Roman, Times, serif',
                    'Verdana, Geneva, sans-serif'
                  ],
                  supportAllValues: true
                },
                list: {
                    properties: {
                      styles: true,      // Mengaktifkan pilihan: decimal-leading-zero, lower-alpha, upper-roman, dll.
                      startIndex: true,  // Mengaktifkan fitur mulai dari angka tertentu
                      reversed: true     // Mengaktifkan fitur penomoran terbalik
                    }
                },
                htmlSupport: {
                    allow: [
                        {
                            name: /^(p|h1|h2|h3|h4|div|span|td|th)$/,
                            styles: {
                                'font-family': true,
                                'font-size': true,
                                'line-height': true,
                                'margin-left': true,
                                'margin-bottom': true
                            }
                        },
                        {
                          name: /^(ol|ul|li)$/,
                          attributes: true, // Mengizinkan atribut type="a", type="I", type="1"
                          styles: true      // Mengizinkan style="list-style-type: lower-roman;", dll.
                        }
                    ]
                },
                toolbar: [
                    'heading', '|',
                    'fontFamily', 'fontSize', '|',
                    'bold', 'italic', 'underline', 'strikethrough', '|',
                    'alignment', 'outdent', 'indent', '|',
                    'bulletedList', 'numberedList', '|',
                    'link', 'insertImage', 'insertTable', 'tableProperties', '|',
                    'removeFormat', 'selectAll', '|',
                    'undo', 'redo'
                ],
                fontSize: {
                    options: [
                        8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72
                    ]
                },
                image: {
                    toolbar: [
                        'imageStyle:inline', 'imageStyle:block', 'imageStyle:side', '|',
                        'toggleImageCaption', 'imageTextAlternative'
                    ]
                },
                table: {
                    contentToolbar: [
                        'tableColumn', 'tableRow', 'mergeTableCells',
                        'tableProperties', 'tableCellProperties'
                    ]
                }
              }}
              onChange={(event, editor) => {
                const data = editor.getData();
                handleChange(field.field_key, data);
              }}
            />
          </div>
        );
      case 'date':
        return <input type="date" value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={baseClass} />;
      case 'number':
        return <input type="number" value={val} onChange={e => handleChange(field.field_key, e.target.value)} className={baseClass} placeholder="0" />;
      case 'currency':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
            <input
              type="text"
              className={`${baseClass} pl-9`}
              value={formatRupiah(val)}
              onChange={(e) => {
                const rawValue = e.target.value.replace(/\D/g, '');
                handleChange(field.field_key, rawValue);
              }}
              placeholder={`Contoh: 15000000`}
            />
          </div>
        );
      case 'image':
        return (
          <div>
            <input type="file" accept="image/png, image/jpeg" onChange={e => handleFileChange(field.field_key, e.target.files[0])} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#008f51]/10 file:text-[#008f51] hover:file:bg-[#008f51]/20 cursor-pointer" />
            {val && <img src={val} alt="Preview" className="mt-3 h-20 object-contain rounded border border-slate-200" />}
          </div>
        );
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
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

      {revisionInfo && (
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between gap-3 text-blue-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-900">Modus Revisi Dokumen #{revisionInfo.document_id}</p>
              <p className="text-xs text-blue-700 mt-0.5">Formulir telah diisi otomatis dari isian sebelumnya. Silakan perbarui data yang diperlukan.</p>
            </div>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-blue-200/80 text-blue-800 rounded-full flex-shrink-0">Mode Revisi</span>
        </div>
      )}

      {hasRestoredDraft && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Draf Isian Dipulihkan</p>
              <p className="text-xs text-amber-700 mt-0.5">Isian sebelumnya yang belum sempat dicetak berhasil dipulihkan otomatis dari browser Anda.</p>
            </div>
          </div>
          <button
            onClick={handleResetForm}
            className="text-xs font-semibold px-3 py-1.5 bg-amber-200/80 hover:bg-amber-300/80 text-amber-900 rounded-lg transition-colors flex-shrink-0"
          >
            Reset Form
          </button>
        </div>
      )}

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

      <div className="space-y-6">
        {/* Form Input */}
        <div className="space-y-6">
          <div className="card p-5 bg-slate-50 flex items-start gap-4">
            <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-2xl flex-shrink-0">📝</div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{fields.filter(f => f.is_auto_generated != 1).length} informasi diperlukan</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Data yang dimasukkan akan langsung tampil di panel Live Preview sebelah kanan.
              </p>
            </div>
          </div>

          <form onSubmit={e => e.preventDefault()} className="card p-6 sm:p-8 space-y-5">
            {fields.filter(f => f.is_auto_generated != 1).map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  {field.field_label}
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

            <div className="pt-4 mt-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button 
                type="button" 
                onClick={() => handleGenerate('docx')}
                disabled={generating !== false || previewLoading} 
                className="btn-primary flex-1 justify-center py-3.5 text-base shadow-md bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              >
                {generating === 'docx' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Unduh Word (.docx)
                  </span>
                )}
              </button>

              <button 
                type="button" 
                onClick={handleMuatPreview}
                disabled={previewLoading || generating !== false} 
                className="btn-primary flex-1 justify-center py-3.5 text-base shadow-md bg-blue-500 hover:bg-blue-600 focus:ring-blue-400"
              >
                {previewLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Memuat...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    Lihat Preview
                  </span>
                )}
              </button>

                <button 
                  type="button" 
                  onClick={() => handleGenerate('pdf')}
                  disabled={generating !== false || previewLoading} 
                  className="btn-primary flex-1 justify-center py-3.5 text-base shadow-md bg-red-600 hover:bg-red-700 focus:ring-red-500"
                >
                {generating === 'pdf' ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Memproses...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Unduh PDF
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Preview PDF */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-up">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                Preview Dokumen (PDF)
              </h2>
              <div className="flex items-center gap-2">
                {pdfPreviewUrl && (
                  <a 
                    href={pdfPreviewUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="md:hidden px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg shadow-sm"
                  >
                    Buka PDF
                  </a>
                )}
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Tutup Preview"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-[#525659] p-0 relative">
               {pdfPreviewUrl ? (
                 <>
                   <div className="md:hidden absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-slate-800">
                      <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      </div>
                      <h3 className="text-white font-bold text-lg mb-2">Preview di HP</h3>
                      <p className="text-slate-400 text-sm mb-6">Browser HP seringkali memblokir tampilan PDF otomatis di dalam frame. Silakan klik tombol di bawah untuk membukanya secara penuh.</p>
                      <a href={pdfPreviewUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-blue-600 text-white font-semibold rounded-xl shadow-lg">
                        Buka / Download PDF
                      </a>
                   </div>
                   <iframe src={pdfPreviewUrl} width="100%" height="100%" type="application/pdf" className="w-full h-full border-none hidden md:block" />
                 </>
               ) : (
                 <div className="flex items-center justify-center h-full text-white/50">Memuat PDF...</div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
