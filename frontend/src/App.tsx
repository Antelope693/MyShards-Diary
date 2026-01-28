import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import DiaryDetail from './pages/DiaryDetail';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';
import AdminRoot from './pages/AdminRoot';
import QAPage from './pages/QAPage';
import TutorialManager from './components/TutorialManager';

function ProtectedAdmin({
  children,
  requireMaintainer = false,
}: {
  children: React.ReactNode;
  requireMaintainer?: boolean;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (requireMaintainer && user.role !== 'maintainer' && user.role !== 'admin') {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <Layout>
      <TutorialManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/qa" element={<QAPage />} />
        <Route path="/space/:username" element={<Home />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdmin>
              <Admin />
            </ProtectedAdmin>
          }
        />
        <Route
          path="/admin/root"
          element={
            <ProtectedAdmin requireMaintainer>
              <AdminRoot />
            </ProtectedAdmin>
          }
        />
        <Route path="/diary/:id" element={<DiaryDetail />} />
      </Routes>
    </Layout>
  );
}

export default App;

