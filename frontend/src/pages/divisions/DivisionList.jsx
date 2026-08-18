import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';

export default function DivisionList() {
  const [divisions, setDivisions] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newDirectorateId, setNewDirectorateId] = useState('');
  const [newName, setNewName] = useState('');
  
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDirectorateId, setEditDirectorateId] = useState('');
  const { showAlert } = useAlert();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [divRes, dirRes] = await Promise.all([
        api.get('/divisions'),
        api.get('/directorates')
      ]);
      setDivisions(divRes.data);
      setDirectorates(dirRes.data.directorates || dirRes.data);
    } catch (err) {
      showAlert('error', 'Gagal memuat data', err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newDirectorateId) {
      showAlert('error', 'Error', 'Silakan pilih Direktorat dan masukkan nama Divisi');
      return;
    }
    try {
      await api.post('/divisions', { directorate_id: newDirectorateId, name: newName });
      showAlert('success', 'Berhasil', 'Divisi ditambahkan');
      setNewName('');
      fetchData();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim() || !editDirectorateId) return;
    try {
      await api.put(`/divisions/${id}`, { directorate_id: editDirectorateId, name: editName });
      showAlert('success', 'Berhasil', 'Divisi diperbarui');
      setEditId(null);
      setEditName('');
      setEditDirectorateId('');
      fetchData();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.error || 'Terjadi kesalahan');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus divisi ini?")) return;
    try {
      await api.delete(`/divisions/${id}`);
      showAlert('success', 'Berhasil', 'Divisi dihapus');
      fetchData();
    } catch (err) {
      showAlert('error', 'Gagal', err.response?.data?.message || err.response?.data?.error || 'Gagal menghapus divisi');
    }
  };

  if (loading && divisions.length === 0) return <div className="p-10 text-center">Memuat...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kelola Divisi</h1>
          <p className="text-sm text-slate-500 mt-1">Atur nama divisi yang berada di bawah direktorat.</p>
        </div>
      </div>

      <div className="card p-5 bg-white space-y-6">
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-3">
          <select 
            value={newDirectorateId} 
            onChange={(e) => setNewDirectorateId(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#008f51] bg-white w-full sm:w-1/3"
          >
            <option value="">-- Pilih Direktorat --</option>
            {directorates.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input 
            type="text" 
            placeholder="Nama divisi baru..." 
            value={newName} 
            onChange={(e) => setNewName(e.target.value)} 
            className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#008f51]"
          />
          <button type="submit" className="px-6 py-2 bg-[#008f51] text-white font-semibold rounded-lg hover:bg-[#007a45]">
            Tambah
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
              <tr>
                <th className="px-4 py-3 w-1/3">Direktorat</th>
                <th className="px-4 py-3">Nama Divisi</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {divisions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {editId === d.id ? (
                      <select 
                        value={editDirectorateId} 
                        onChange={(e) => setEditDirectorateId(e.target.value)}
                        className="px-2 py-1 border border-[#008f51] rounded w-full focus:ring-1 focus:ring-[#008f51] bg-white"
                      >
                        <option value="">-- Pilih --</option>
                        {directorates.map(dir => (
                          <option key={dir.id} value={dir.id}>{dir.name}</option>
                        ))}
                      </select>
                    ) : (
                      d.directorate_name
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {editId === d.id ? (
                      <input 
                        type="text" 
                        value={editName} 
                        onChange={(e) => setEditName(e.target.value)} 
                        className="px-2 py-1 border border-[#008f51] rounded w-full focus:ring-1 focus:ring-[#008f51]"
                        autoFocus
                      />
                    ) : (
                      d.name
                    )}
                  </td>
                  <td className="px-4 py-3 flex justify-end gap-2">
                    {editId === d.id ? (
                      <>
                        <button onClick={() => handleUpdate(d.id)} className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">Simpan</button>
                        <button onClick={() => { setEditId(null); setEditName(''); setEditDirectorateId(''); }} className="text-sm px-3 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200">Batal</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditId(d.id); setEditName(d.name); setEditDirectorateId(d.directorate_id); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(d.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {divisions.length === 0 && (
                <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Belum ada divisi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
