import { Link, useLocation } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
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

