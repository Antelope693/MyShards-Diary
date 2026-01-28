import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LogIn, AlertCircle, UserPlus, Mail, User } from 'lucide-react';
import { authApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTranslation } from 'react-i18next';

type Mode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const { login: persistSession } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      authApi
        .verify()
        .then((res) => {
          if (res.data.authenticated) {
            persistSession(token, res.data.user);
            navigate('/admin');
          }
        })
        .catch(() => {
          localStorage.removeItem('auth_token');
        });
    }
  }, [navigate, persistSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'register') {
      if (!username.trim()) return setError(t('common.error')); // Simplify or add specific errors to json later
      if (!email.trim()) return setError(t('common.error'));
      if (password.length < 6) return setError(t('common.error'));
      if (password !== confirmPassword) return setError(t('common.error'));
    } else {
      if (!identifier.trim()) return setError(t('common.error'));
      if (!password.trim()) return setError(t('common.error'));
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const response = await authApi.register(username.trim(), email.trim(), password);
        localStorage.setItem('auth_token', response.data.token);
        persistSession(response.data.token, response.data.user);
        navigate('/admin');
      } else {
        const response = await authApi.login(identifier.trim(), password);
        localStorage.setItem('auth_token', response.data.token);
        persistSession(response.data.token, response.data.user);
        navigate('/admin');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || (mode === 'login' ? t('common.error') : t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-tr from-purple-600 to-blue-600 rounded-2xl mb-6 shadow-xl shadow-purple-500/20 transform hover:scale-110 transition-transform duration-500">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-title text-3xl font-bold text-gray-800 mb-3 tracking-tight">
            MyShards Diary
          </h1>
          <p className="text-gray-500 font-body">
            {mode === 'login' ? t('auth.subtitle_login') : t('auth.subtitle_register')}
          </p>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-xl mb-8">
          <button
            onClick={() => switchMode('login')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'login' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('nav.login')}
          </button>
          <button
            onClick={() => switchMode('register')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${mode === 'register' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {t('nav.register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="flex items-center space-x-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {mode === 'register' ? (
            <>
              <Input
                label={t('auth.username')}
                placeholder={t('auth.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                icon={<User className="w-5 h-5" />}
              />
              <Input
                type="email"
                label={t('auth.email')}
                placeholder={t('auth.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                icon={<Mail className="w-5 h-5" />}
              />
            </>
          ) : (
            <Input
              label={t('auth.username') + ' / ' + t('auth.email')} // Approximate "Account" or "Email/User"
              placeholder={t('auth.username') + ' / ' + t('auth.email')}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              icon={<User className="w-5 h-5" />}
            />
          )}

          <Input
            type="password"
            label={t('auth.password')}
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-5 h-5" />}
          />

          {mode === 'register' && (
            <Input
              type="password"
              label={t('common.confirm') + ' ' + t('auth.password')}
              placeholder={t('auth.password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          )}

          <Button
            type="submit"
            className="w-full mt-4"
            size="lg"
            loading={loading}
            icon={mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          >
            {mode === 'login' ? t('auth.go_login') : t('auth.go_register')}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-sm text-gray-400 hover:text-purple-600 transition-colors font-medium"
          >
            {t('nav.home')}
          </button>
        </div>
      </Card>
    </div>
  );
}
