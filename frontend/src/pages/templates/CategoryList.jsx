import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';

export default function CategoryList() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const { showAlert } = useAlert();

  const fetchCategories = () => {
    setLoading(true);
    api.get('/categories')
      .then(res => setCategories(res.data.categories))
      .catch(err => showAlert('error', 'Gagal memuat kategori', err.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await api.post('/categories', { name: newName });
      showAlert('success', 'Berhasil', 'Kategori ditambahkan');
      setNewName('');
      fetchCategories();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.put(`/categories/${id}`, { name: editName });
      showAlert('success', 'Berhasil', 'Kategori diperbarui');
      setEditId(null);
      setEditName('');
      fetchCategories();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus kategori ini? Semua template di dalamnya akan dipindah ke 'Belum Dikategorikan'.")) return;
    try {
      await api.delete(`/categories/${id}`);
      showAlert('success', 'Berhasil', 'Kategori dihapus');
      fetchCategories();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  if (loading && categories.length === 0) return <div className="p-10 text-center">Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kategori Template</h1>
          <p className="text-sm text-slate-500 mt-1">Kelola jenis kategori surat untuk filter dokumen.</p>
        </div>
      </div>

      <div className="card p-5 bg-white space-y-6">
        <form onSubmit={handleAdd} className="flex gap-3">
          <input 
            type="text" 
            placeholder="Nama kategori baru..." 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
            Tambah
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3">Nama Kategori</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {categories.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {editId === c.id ? (
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        className="px-2 py-1 border border-blue-400 rounded w-full"
                        autoFocus
                      />
                    ) : (
                      c.name
                    )}
                  </td>
                  <td className="px-4 py-3 flex justify-end gap-2">
                    {editId === c.id ? (
                      <>
                        <button onClick={() => handleUpdate(c.id)} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Simpan</button>
                        <button onClick={() => { setEditId(null); setEditName(''); }} className="text-sm px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">Batal</button>
                      </>
                    ) : (
                      <>
                        {c.id !== "1" && (
                          <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          </button>
                        )}
                        {c.id !== "1" && (
                          <button onClick={() => handleDelete(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan="2" className="px-4 py-8 text-center text-slate-500">Belum ada kategori.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
