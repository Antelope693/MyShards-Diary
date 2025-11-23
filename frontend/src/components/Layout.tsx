import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Github, Mail } from 'lucide-react';
import { useEffect } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') && location.pathname !== '/admin/login';

  useEffect(() => {
    const activeTitle = '羚羊日寄(๑˃̵ᴗ˂̵) ♡';
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

  return (
    <div className="min-h-screen">
      <nav className="bg-white/95 backdrop-blur-md shadow-xl sticky top-0 z-50 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <Link
              to="/"
              className="flex items-center space-x-2 sm:space-x-3 text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent hover:scale-105 transition-transform"
            >
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-purple-600" />
              <span className="hidden sm:inline font-title">羚羊日寄</span>
              <span className="sm:hidden">日记</span>
            </Link>
            <div className="flex items-center space-x-2 sm:space-x-4 lg:space-x-6">
              <Link
                to="/"
                className={`px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold transition-all duration-300 ${
                  !isAdmin
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/50'
                    : 'text-gray-700 hover:bg-gray-100 hover:scale-105'
                }`}
              >
                首页
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
                    <path d="M17.381 18.056c-1.226 0-2.381-.49-3.236-1.354l-1.354-1.354c-.49-.49-1.226-.49-1.716 0l-1.354 1.354c-.855.864-2.01 1.354-3.236 1.354H2.5v-12h5.625c1.226 0 2.381.49 3.236 1.354l1.354 1.354c.49.49 1.226.49 1.716 0l1.354-1.354c.855-.864 2.01-1.354 3.236-1.354H21.5v12h-4.119zm-1.5-10.5c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5zm-6 0c0-.828-.672-1.5-1.5-1.5s-1.5.672-1.5 1.5.672 1.5 1.5 1.5 1.5-.672 1.5-1.5z"/>
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
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">
        {children}
      </main>
      <footer className="mt-12 sm:mt-16 lg:mt-24 py-6 sm:py-8 lg:py-12 text-center text-gray-600">
        <p className="text-sm sm:text-base lg:text-lg font-medium">© 2025 我的日记. 用心记录每一天</p>
      </footer>
    </div>
  );
}

