import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';

export default function UserManagement() {
  const { showAlert } = useAlert();
  const { user: currentUser, isSuperAdmin, isAdminDirektorat } = useAuth();
  const [users, setUsers] = useState([]);
  const [directorates, setDirectorates] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user', directorate_id: '', division_id: '', permissions: [] });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);

  const AVAILABLE_PERMISSIONS = [
    { id: 'upload_template', label: 'Upload & Konfigurasi Template' },
    { id: 'generate_doc', label: 'Generate Dokumen' },
    { id: 'manage_categories', label: 'Kelola Kategori' },
    { id: 'manage_directorates', label: 'Kelola Direktorat' },
    { id: 'manage_users', label: 'Kelola User' },
  ];

  const fetchData = async () => {
    try {
      const [uRes, dRes, divRes] = await Promise.all([
        api.get('/users'),
        api.get('/directorates'),
        api.get('/divisions')
      ]);
      setUsers(uRes.data.users || []);
      setDirectorates(dRes.data.directorates || []);
      setDivisions(divRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resetForm = () => { 
    setForm({ 
      name: '', email: '', password: '', role: 'user', 
      directorate_id: isAdminDirektorat ? currentUser?.directorate_id : '', 
      division_id: '', permissions: [] 
    }); 
    setEditId(null); setShowForm(false); 
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (payload.directorate_id === '') payload.directorate_id = null;
      if (payload.division_id === '') payload.division_id = null;

      if (editId) {
        await api.put(`/users/${editId}`, payload);
      } else {
        await api.post('/users', payload);
      }
      fetchData(); resetForm();
      showAlert('success', 'Berhasil', 'Data pengguna berhasil disimpan.');
    } catch (err) {
      const errors = err.response?.data?.errors;
      showAlert('error', 'Gagal Menyimpan', errors ? Object.values(errors).join(', ') : err.response?.data?.error || 'Gagal menyimpan.');
    } finally { setSaving(false); }
  };

  const handleEdit = (user) => {
    setForm({ 
      name: user.name, 
      email: user.email, 
      password: '', 
      role: user.role, 
      directorate_id: user.directorate_id || '',
      division_id: user.division_id || '',
      permissions: user.permissions || []
    });
    setEditId(user.id); setShowForm(true);
  };

  const handleTogglePermission = (permId) => {
    setForm(p => {
      const perms = p.permissions.includes(permId)
        ? p.permissions.filter(x => x !== permId)
        : [...p.permissions, permId];
      return { ...p, permissions: perms };
    });
  };

  const handleToggleActive = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { is_active: user.is_active == 1 ? 0 : 1 });
      fetchData();
      showAlert('success', 'Status Diubah', 'Status pengguna berhasil diperbarui.');
    } catch (err) { showAlert('error', 'Gagal', 'Gagal mengubah status.'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Apakah Anda yakin ingin menghapus user ini?')) return;
    try { 
      await api.delete(`/users/${id}`); 
      fetchData(); 
      showAlert('success', 'Dihapus', 'Pengguna berhasil dihapus.');
    } catch (err) { showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menghapus.'); }
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
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role Pengguna</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value, directorate_id: (e.target.value === 'superadmin') ? '' : p.directorate_id }))} className="input-field disabled:bg-slate-100 disabled:text-slate-500" disabled={isAdminDirektorat}>
                <option value="user">User Biasa</option>
                {isSuperAdmin && <option value="admin_direktorat">Admin Direktorat</option>}
                {isSuperAdmin && (!editId || form.role === 'superadmin') && <option value="superadmin">Super Admin</option>}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Direktorat</label>
              <select 
                value={form.directorate_id} 
                onChange={e => setForm(p => ({ ...p, directorate_id: e.target.value, division_id: '' }))} 
                className="input-field disabled:bg-slate-100 disabled:text-slate-500" 
                disabled={form.role === 'superadmin' || isAdminDirektorat}
              >
                {!isAdminDirektorat && <option value="">-- Lintas Direktorat (Super Admin) --</option>}
                {directorates.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Divisi</label>
              <select value={form.division_id} onChange={e => setForm(p => ({ ...p, division_id: e.target.value }))} className="input-field" disabled={!form.directorate_id}>
                <option value="">-- Pilih Divisi --</option>
                {divisions.filter(div => div.directorate_id == form.directorate_id).map(div => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-700 mb-2">Hak Akses Fitur Khusus</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {AVAILABLE_PERMISSIONS.map(p => (
                  <label key={p.id} className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={form.permissions.includes(p.id)}
                      onChange={() => handleTogglePermission(p.id)}
                      className="w-4 h-4 text-[#008f51] border-gray-300 rounded focus:ring-[#008f51]"
                    />
                    <span className="text-sm text-slate-700">{p.label}</span>
                  </label>
                ))}
              </div>
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
                <th className="px-6 py-4">Penempatan</th>
                <th className="px-6 py-4">Hak Akses</th>
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
                    <span className="text-sm font-medium text-slate-700 block">
                      {u.directorate_name || <span className="text-purple-600 bg-purple-50 px-2 py-0.5 rounded text-xs border border-purple-200">Global (Superadmin)</span>}
                    </span>
                    {u.division_name && <span className="text-xs text-slate-500 mt-1 block">Divisi: {u.division_name}</span>}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {u.role === 'superadmin' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200">Super Admin</span>
                      )}
                      {u.role === 'admin_direktorat' && (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">Admin Dir.</span>
                      )}
                      {(u.permissions || []).map(p => (
                        <span key={p} className="inline-block px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200" title={p}>
                          {p.replace('manage_', '').replace('_', ' ')}
                        </span>
                      ))}
                    </div>
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
