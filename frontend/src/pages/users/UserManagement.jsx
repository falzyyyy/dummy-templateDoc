import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchUsers = () => {
    api.get('/users').then(res => setUsers(res.data.users || []))
      .catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, []);

  const resetForm = () => { setForm({ name: '', email: '', password: '', role: 'user' }); setEditId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editId) {
        const payload = { name: form.name, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editId}`, payload);
      } else {
        await api.post('/users', form);
      }
      fetchUsers(); resetForm();
    } catch (err) {
      const errors = err.response?.data?.errors;
      alert(errors ? Object.values(errors).join('\n') : err.response?.data?.error || 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  const handleEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: '', role: user.role });
    setEditId(user.id); setShowForm(true);
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: user.is_active == 1 ? 0 : 1 });
      fetchUsers();
    } catch (err) { alert('Gagal mengubah status.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try { await api.delete(`/users/${id}`); fetchUsers(); }
    catch (err) { alert(err.response?.data?.error || 'Gagal menghapus.'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh] text-slate-500">Memuat data user...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Manajemen Pengguna</h1>
          <p className="text-sm text-slate-500 mt-1">{users.length} akun terdaftar di sistem.</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(!showForm); }} className={showForm ? 'btn-ghost' : 'btn-primary'}>
          {showForm ? 'Batal Tambah' : '+ Tambah User'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="card p-6 border-l-4 border-l-[#008f51] animate-fade-in">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">{editId ? 'Ubah Data User' : 'Tambah User Baru'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Nama pegawai..." required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Akses</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="input-field" placeholder="email@perusahaan.com" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Password {editId && <span className="text-slate-400 font-normal text-xs">(Kosongkan jika tidak diubah)</span>}
              </label>
              <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} className="input-field" placeholder="••••••••" {...(!editId && { required: true })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Level Akses (Role)</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className="input-field">
                <option value="user">User Standar (Hanya generate form)</option>
                <option value="admin">Administrator (Upload & kelola template)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={resetForm} className="btn-ghost">Batal</button>
              <button type="submit" disabled={saving} className="btn-primary min-w-[120px]">
                {saving ? 'Menyimpan...' : editId ? 'Simpan Perubahan' : 'Buat Akun'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4">Nama Lengkap</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${u.role === 'admin' ? 'bg-[#008f51]/10 text-[#008f51] border-[#008f51]/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {u.role === 'admin' ? 'Administrator' : 'User Standar'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleToggleActive(u)} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:shadow-sm transition-all ${u.is_active == 1 ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${u.is_active == 1 ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {u.is_active == 1 ? 'Aktif' : 'Dinonaktifkan'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(u)} className="btn-ghost px-3 py-1.5 text-xs text-slate-600" title="Edit">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(u.id)} className="btn-danger px-3 py-1.5 text-xs text-slate-500 border-transparent hover:border-red-200" title="Hapus">
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
