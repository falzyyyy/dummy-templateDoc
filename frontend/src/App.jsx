import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TemplateList from './pages/templates/TemplateList';
import UploadTemplate from './pages/templates/UploadTemplate';
import EditFields from './pages/templates/EditFields';
import FillTemplate from './pages/templates/FillTemplate';
import History from './pages/documents/History';
import UserManagement from './pages/users/UserManagement';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="text-[var(--text-muted)]">Memuat...</div></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAdmin) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="templates" element={<TemplateList />} />
        <Route path="templates/upload" element={<AdminRoute><UploadTemplate /></AdminRoute>} />
        <Route path="templates/:id/edit" element={<AdminRoute><EditFields /></AdminRoute>} />
        <Route path="templates/:slug/fill" element={<FillTemplate />} />
        <Route path="history" element={<History />} />
        <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
      </Route>
    </Routes>
  );
}
