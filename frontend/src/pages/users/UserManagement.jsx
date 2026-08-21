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
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  
  // DataTable States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [sortBy, setSortBy] = useState('users.created_at');
  const [sortDir, setSortDir] = useState('DESC');

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
        api.get('/users', {
          params: { search: searchTerm, role: filterRole, sort_by: sortBy, sort_dir: sortDir }
        }),
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

  useEffect(() => { 
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, filterRole, sortBy, sortDir]);

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

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const executeDelete = async (id) => {
    try { 
      await api.delete(`/users/${id}`); 
      fetchData(); 
      showAlert('success', 'Dihapus', 'Pengguna berhasil dihapus.');
    } catch (err) { 
      showAlert('error', 'Gagal', err.response?.data?.error || 'Gagal menghapus.'); 
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
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
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="admin_dspi">Admin DSPI</option>
                <option value="admin_dspn">Admin DSPN</option>
                <option value="admin_dsmk">Admin DSMK</option>
                <option value="admin_dppn">Admin DPPN</option>
                <option value="admin_dtdi">Admin DTDI</option>
                <option value="admin_dhkm">Admin DHKM</option>
                <option value="admin_dmas">Admin DMAS</option>
                <option value="admin_dksr">Admin DKSR</option>
                <option value="admin_datn">Admin DTAN</option>
                <option value="admin_pmkh">Admin PMKH</option>
                <option value="admin_dapn">Admin DAPN</option>
                <option value="admin_dksa">Admin DKSA</option>
                <option value="admin_dimr">Admin DIMR</option>
                <option value="admin_dsps">Admin DSPS</option>
                <option value="admin_dops">Admin DOPS</option>
                <option value="admin_dpdu">Admin DPDU</option>
                <option value="user">User</option>
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

      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <input 
          type="text" 
          placeholder="Cari nama atau email..." 
          className="input-field max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          className="input-field max-w-xs"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">Semua Role</option>
          <option value="superadmin">Super Admin</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => {
                  if (sortBy === 'users.name') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
                  else { setSortBy('users.name'); setSortDir('ASC'); }
                }}>
                  Nama Lengkap {sortBy === 'users.name' ? (sortDir === 'ASC' ? '↑' : '↓') : '↕'}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => {
                  if (sortBy === 'directorate_name') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
                  else { setSortBy('directorate_name'); setSortDir('ASC'); }
                }}>
                  Penempatan {sortBy === 'directorate_name' ? (sortDir === 'ASC' ? '↑' : '↓') : '↕'}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => {
                  if (sortBy === 'users.role') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
                  else { setSortBy('users.role'); setSortDir('ASC'); }
                }}>
                  Hak Akses {sortBy === 'users.role' ? (sortDir === 'ASC' ? '↑' : '↓') : '↕'}
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-slate-100" onClick={() => {
                  if (sortBy === 'users.is_active') setSortDir(sortDir === 'ASC' ? 'DESC' : 'ASC');
                  else { setSortBy('users.is_active'); setSortDir('ASC'); }
                }}>
                  Status {sortBy === 'users.is_active' ? (sortDir === 'ASC' ? '↑' : '↓') : '↕'}
                </th>
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

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus user ini? Data yang dihapus tidak dapat dikembalikan.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button 
                onClick={() => setDeleteConfirm({ isOpen: false, id: null })} 
                className="btn-ghost flex-1 py-2.5 text-sm font-medium"
              >
                Batal
              </button>
              <button 
                onClick={() => executeDelete(deleteConfirm.id)} 
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
