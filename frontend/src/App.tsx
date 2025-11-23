import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Admin from './pages/Admin';
import Login from './pages/Login';
import DiaryDetail from './pages/DiaryDetail';
import Layout from './components/Layout';
import { useEffect, useState } from 'react';
import { authApi } from './api/client';

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi.verify()
        .then((res) => setIsAuthenticated(res.data.authenticated))
        .catch(() => {
          setIsAuthenticated(false);
          localStorage.removeItem('auth_token');
        });
    } else {
      setIsAuthenticated(false);
    }
  }, []);

  if (isAuthenticated === null) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/admin/login" replace />;
}

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedAdmin>
              <Admin />
            </ProtectedAdmin>
          }
        />
        <Route path="/diary/:id" element={<DiaryDetail />} />
      </Routes>
    </Layout>
  );
}

export default App;

