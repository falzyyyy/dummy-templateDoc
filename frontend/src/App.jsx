import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TemplateList from './pages/templates/TemplateList';
import UploadTemplate from './pages/templates/UploadTemplate';
import EditFields from './pages/templates/EditFields';
import FillTemplate from './pages/templates/FillTemplate';
import CategoryList from './pages/templates/CategoryList';
import DirectorateList from './pages/directorates/DirectorateList';
import DivisionList from './pages/divisions/DivisionList';
import History from './pages/documents/History';
import UserManagement from './pages/users/UserManagement';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-[var(--text-muted)]">Memuat...</div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children, permission }) {
  const { isAdmin, hasPermission, loading } = useAuth();
  if (loading) return null;
  if (isAdmin) return children;
  if (permission && hasPermission(permission)) return children;
  return <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="templates/upload" element={<AdminRoute permission="upload_template"><UploadTemplate /></AdminRoute>} />
        <Route path="templates/:id/edit" element={<AdminRoute permission="upload_template"><EditFields /></AdminRoute>} />
        <Route path="templates/:slug/fill" element={<FillTemplate />} />
        <Route path="history" element={<History />} />
        <Route path="categories" element={<AdminRoute permission="manage_categories"><CategoryList /></AdminRoute>} />
        <Route path="directorates" element={<AdminRoute permission="manage_directorates"><DirectorateList /></AdminRoute>} />
        <Route path="divisions" element={<AdminRoute permission="manage_divisions"><DivisionList /></AdminRoute>} />
        <Route path="users" element={<AdminRoute permission="manage_users"><UserManagement /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
