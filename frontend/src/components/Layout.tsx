import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen, Github, Mail, Settings, LayoutDashboard, UserCheck, Star, Users, Briefcase, MoreHorizontal, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationBox from './NotificationBox';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language.startsWith('zh') ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  // I need to check useAuth context. I'll assume I can just navigate or whatever.
  // Actually, I won't implement Logout unless requested.
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleUserAction = (action: string) => {
    if (!user) return;
    const base = `/space/${encodeURIComponent(user.username)}`;
    switch (action) {
      case 'space': navigate(base); break;
      case 'following': navigate(`${base}?view=following`); break;
      case 'collections': navigate(`${base}?view=collections`); break;
      case 'followers': navigate(`${base}?view=followers`); break;
      case 'career':
        alert(t('common.more')); // Translated alert or just keep generic
        return;
      case 'qa': navigate('/qa'); break;
      case 'more':
        // Show replay tutorial option? Or just navigate to 'more page'?
        // User said: "Can watch tutorial again in Creator - More Features".
        // And "More Features added Q&A".
        // I will add a 'qa' case.
        // And for tutorial, maybe I'll trigger it directly if action is 'tutorial'.
        alert('该功能正在秘密开发中...');
        return;
      case 'tutorial':
        // We need a way to trigger tutorial from here. 
        // I will emit a custom event or use a global context function if available.
        // For now, I'll just dispatch an event.
        window.dispatchEvent(new Event('trigger-tutorial'));
        break;
    }
    setIsUserMenuOpen(false);
  };
  const isAdmin = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  useEffect(() => {
    const activeTitle = 'MyShards(๑˃̵ᴗ˂̵) ♡';
    const inactiveTitle = '你别走呀˚‧º·(˚ ˃̣̣̥᷄⌓˂̣̣̥᷅ )‧º·˚';

    // 设置初始标题
    document.title = activeTitle;

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.hidden) {
        document.title = inactiveTitle;
      } else {
        document.title = activeTitle;
      }
    };

    // 监听窗口焦点变化（备用方案）
    const handleFocus = () => {
      document.title = activeTitle;
    };

    const handleBlur = () => {
      document.title = inactiveTitle;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleManageClick = () => {
    if (user?.role === 'maintainer' || user?.role === 'admin') {
      navigate('/admin/root');
      return;
    }
    if (user) {
      navigate('/admin');
      return;
    }
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen">
      <nav className="bg-white/95 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link
              to="/"
              id="tour-home-logo"
              className="flex items-center space-x-2 sm:space-x-3 text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
            >
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-purple-600" />
              <span className="hidden sm:inline font-title self-center">{t('nav.title')}</span>
              <span className="sm:hidden self-center">Diary</span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
              <Link
                to="/"
                className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${!isAdmin
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                  : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                  }`}
              >
                {t('nav.home')}
              </Link>
              {/* 社交图标 */}
              <div className="flex items-center space-x-3 sm:space-x-4 ml-2 sm:ml-4">
                <a
                  href="https://github.com/Antelope693/MyShards-Diary"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-purple-600 transition-colors duration-300 hover:scale-110 transform"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
                <a
                  href="https://space.bilibili.com/369400196?spm_id_from=333.1007.0.0"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-pink-500 transition-colors duration-300 hover:scale-110 transform"
                  aria-label="Bilibili"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M17.381 18.056c-1.226 0-2.381-.49-3.236-1.354l-1.354-1.354c-.49-.49-1.226-.49-1.716 0l-1.354 1.354c-.855.864-2.01 1.354-3.236 1.354H2.5v-12h5.625c1.226 0 2.381.49 3.236 1.354l1.354 1.354c.49.49 1.226.49 1.716 0l1.354-1.354c.855-.864 2.01-1.354 3.236-1.354H21.5v12h-4.119zm-1.5-10.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm-6 0c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5z" />
                  </svg>
                </a>
                <a
                  href="mailto:Twaion2025@outlook.com"
                  className="text-gray-700 hover:text-blue-600 transition-colors duration-300 hover:scale-110 transform"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
                </a>
              </div>

              {/* Language Switcher */}
              <button
                onClick={toggleLanguage}
                className="p-2 ml-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Switch Language / 切换语言"
              >
                <Languages className="w-5 h-5" />
              </button>

              {/* Notification Box (Only for logged in users) */}
              {user && (
                <div className="ml-2">
                  <NotificationBox />
                </div>
              )}
              {!user ? (
                <span className="hidden sm:inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold">
                  <span>{t('nav.guest')}</span>
                </span>
              ) : (
                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="hidden sm:inline-flex items-center space-x-1 px-3 py-1 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors cursor-pointer border border-transparent focus:border-purple-200"
                  >
                    <span>{user.display_name || user.username}</span>
                    <span className="uppercase tracking-wide text-[10px]">
                      {user.role === 'maintainer' ? t('nav.maintainer') : t('nav.admin')}
                    </span>
                  </button>

                  {/* User Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 z-50">
                      <button onClick={() => handleUserAction('space')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2">
                        <LayoutDashboard size={14} /> {t('nav.menu.space')}
                      </button>
                      <button onClick={() => handleUserAction('following')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2">
                        <UserCheck size={14} /> {t('nav.menu.following')}
                      </button>
                      <button onClick={() => handleUserAction('collections')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2">
                        <Star size={14} /> {t('nav.menu.collections')}
                      </button>
                      <button onClick={() => handleUserAction('followers')} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 flex items-center gap-2">
                        <Users size={14} /> {t('nav.menu.followers')}
                      </button>
                      <div className="h-px bg-gray-100 my-1" />
                      <button onClick={() => handleUserAction('career')} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                        <Briefcase size={14} /> {t('nav.menu.career')}
                      </button>
                      <button onClick={() => handleUserAction('qa')} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                        <Mail size={14} /> {t('nav.menu.qa')}
                      </button>
                      <button onClick={() => handleUserAction('tutorial')} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                        <BookOpen size={14} /> {t('nav.menu.tutorial')}
                      </button>
                      <button onClick={() => handleUserAction('more')} className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2">
                        <MoreHorizontal size={14} /> {t('nav.menu.more')}
                      </button>
                    </div>
                  )}
                  {/* Click outside listener? For now simple toggle is fine or use a backdrop if needed. 
                      Ideally we use a global click listener to close, but user didn't ask for perfection, just functionality. 
                      I'll assume toggle is enough or user clicks again. 
                      Actually, adding a screen-covering transparent div is easy and better. */}
                  {isUserMenuOpen && (
                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  )}
                </div>
              )}

              {/* Desktop Admin Button - Refactored for standard anchor behavior if possible or improved handler */}
              <button
                onClick={handleManageClick}
                className="hidden sm:inline-flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-all duration-300"
                title={user ? (user.role === 'maintainer' ? t('nav.maintainer') : t('nav.backend')) : t('nav.login')}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm font-semibold">
                  {user ? (user.role === 'maintainer' ? t('nav.maintainer') : t('nav.admin')) : t('nav.login')}
                </span>
              </button>
            </div>
          </div>
        </div>
      </nav >
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {children}
      </main>
      <button
        id="tour-backend-btn"
        onClick={handleManageClick}
        className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-2xl p-3 sm:p-5 flex flex-col items-center justify-center hover:scale-105 transition-transform focus:outline-none focus:ring-4 focus:ring-purple-300"
        aria-label="打开管理后台"
      >
        <Settings className="w-6 h-6 sm:w-7 sm:h-7" />
        <span className="text-[10px] sm:text-xs font-bold mt-1">
          {user ? (user.role === 'maintainer' || user.role === 'admin' ? t('nav.maintainer') : t('nav.backend')) : t('nav.login')}
        </span>
      </button>
      <footer className="mt-12 sm:mt-16 lg:mt-24 py-6 sm:py-8 lg:py-12 text-center text-gray-600">
        <p className="text-sm sm:text-base lg:text-lg font-medium">{t('footer.slogan')}</p>
      </footer>
    </div >
  );
}

