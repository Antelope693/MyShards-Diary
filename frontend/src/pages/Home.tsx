import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Image as ImageIcon, Pin } from 'lucide-react';
import { diaryApi, greetingApi, Diary } from '../api/client';

export default function Home() {
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [greeting, setGreeting] = useState('欢迎来到我的日记');
  const [loading, setLoading] = useState(true);
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  useEffect(() => {
    loadDiaries();
    loadGreeting();
  }, []);

  useEffect(() => {
    if (diaries.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = parseInt(entry.target.getAttribute('data-id') || '0');
            setVisibleItems((prev: Set<number>) => new Set([...prev, id]));
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    );

    itemRefs.current.forEach((element: HTMLElement) => {
      observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, [diaries]);

  const loadDiaries = async () => {
    try {
      const response = await diaryApi.getAll();
      setDiaries(response.data);
    } catch (error) {
      console.error('加载日记失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGreeting = async () => {
    try {
      const response = await greetingApi.get();
      if (response.data && response.data.content) {
        setGreeting(response.data.content);
      }
    } catch (error) {
      console.error('加载问候语失败:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '未知日期';
    // 处理 SQLite 日期格式 (YYYY-MM-DD HH:mm:ss)
    let date: Date;
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      // SQLite 格式: YYYY-MM-DD HH:mm:ss
      date = new Date(dateString.replace(' ', 'T'));
    } else {
      // 只有日期: YYYY-MM-DD
      date = new Date(dateString + 'T00:00:00');
    }
    
    if (isNaN(date.getTime())) {
      return '无效日期';
    }
    
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '未知时间';
    // 处理 SQLite 日期格式
    let date: Date;
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      date = new Date(dateString.replace(' ', 'T'));
    } else {
      date = new Date(dateString + 'T00:00:00');
    }
    
    if (isNaN(date.getTime())) {
      return '无效时间';
    }
    
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getYearMonth = (dateString: string) => {
    if (!dateString) return { year: new Date().getFullYear(), month: '未知', day: 1 };
    
    let date: Date;
    if (dateString.includes('T')) {
      date = new Date(dateString);
    } else if (dateString.includes(' ')) {
      date = new Date(dateString.replace(' ', 'T'));
    } else {
      date = new Date(dateString + 'T00:00:00');
    }
    
    if (isNaN(date.getTime())) {
      return { year: new Date().getFullYear(), month: '未知', day: 1 };
    }
    
    return {
      year: date.getFullYear(),
      month: date.toLocaleDateString('zh-CN', { month: 'long' }),
      day: date.getDate(),
    };
  };

  const truncateContent = (content: string, maxLength: number = 200) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  // 分离置顶日记和普通日记
  const pinnedDiaries = diaries.filter(diary => diary.is_pinned);
  const normalDiaries = diaries.filter(diary => !diary.is_pinned);

  // 按年月分组普通日记
  const groupedDiaries = normalDiaries.reduce((acc, diary) => {
    const { year, month } = getYearMonth(diary.created_at);
    const key = `${year}-${month}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(diary);
    return acc;
  }, {} as Record<string, Diary[]>);

  return (
    <div className="relative">

      <div className="relative z-10">
        {/* 标题区域 */}
        <div className="text-center mb-16 lg:mb-20">
          <h1 className="font-title text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 mb-4 sm:mb-5 tracking-tight text-shadow-soft">
            MyShards
          </h1>
          <p className="font-body text-lg sm:text-xl lg:text-2xl text-gray-500 font-light text-shadow-soft">在仍有选择的时候，不要让自己后悔</p>
        </div>

        {/* 问候语 */}
        <div className="text-center mb-16 lg:mb-20">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-sm p-6 sm:p-8 lg:p-10 border border-gray-100 inline-block max-w-2xl">
            <p className="text-elegant text-base sm:text-lg lg:text-xl text-gray-700 leading-relaxed text-shadow-soft">
              {greeting}
            </p>
          </div>
        </div>

        {diaries.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-16 text-center border border-gray-100">
            <p className="text-gray-600 text-xl font-medium">还没有日记，快去管理页面创建第一篇吧！</p>
          </div>
        ) : (
          <div className="relative">
            {/* 置顶日记 */}
            {pinnedDiaries.length > 0 && (
              <div className="mb-16 lg:mb-20">
                <div className="mb-10 lg:mb-12">
                  <div className="flex items-center space-x-3 mb-3">
                    <Pin className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <h2 className="font-title text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 tracking-tight text-shadow-color">置顶</h2>
                  </div>
                  <div className="mt-3 h-px bg-gradient-to-r from-amber-200 via-amber-300 to-transparent"></div>
                </div>
                <div className="space-y-8 lg:space-y-10">
                  {pinnedDiaries.map((diary) => (
                    <Link
                      key={diary.id}
                      to={`/diary/${diary.id}`}
                      className="block bg-gradient-to-br from-amber-50/90 to-yellow-50/90 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-amber-200/60 group"
                    >
                      {diary.cover_image && (
                        <div className="w-full h-52 sm:h-64 lg:h-72 overflow-hidden">
                          <img
                            src={diary.cover_image}
                            alt={diary.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                      )}
                      <div className="p-6 sm:p-7 lg:p-8">
                        <div className="flex items-center space-x-3 mb-5 -ml-4">
                          <Pin className="w-4 h-4 text-amber-600 fill-amber-600" />
                          <span className="text-xs sm:text-sm font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">置顶</span>
                          <div className="bg-indigo-50/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-indigo-600" />
                              <div>
                                <div className="text-sm font-bold text-indigo-700 leading-tight">
                                  {formatDate(diary.created_at)}
                                </div>
                                <div className="text-xs font-semibold text-indigo-600">
                                  {formatTime(diary.created_at)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <h2 className="font-title text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 group-hover:text-indigo-600 transition-colors leading-tight text-shadow-soft">
                          {diary.title}
                        </h2>
                        <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-5 line-clamp-3">
                          {truncateContent(diary.content)}
                        </p>
                        {diary.content.includes('[img:') && (
                          <div className="flex items-center space-x-2 text-indigo-600 mb-5">
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-sm font-medium">包含图片</span>
                          </div>
                        )}
                        <div className="flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700 text-sm sm:text-base">
                          <span>阅读全文</span>
                          <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 时间轴布局 */}
            <div className="relative">
              {/* 时间轴内容 */}
              {Object.entries(groupedDiaries).map(([key, monthDiaries]) => {
                const diaries = monthDiaries as Diary[];
                const { year, month } = getYearMonth(diaries[0].created_at);
                return (
                  <div key={key} className="mb-16 lg:mb-20">
                    {/* 月份标题 */}
                    <div className="mb-10 lg:mb-12">
                      <h2 className="font-title text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 tracking-tight text-shadow-medium">
                        {year}年 {month}
                      </h2>
                      <div className="mt-3 h-px bg-gradient-to-r from-gray-200 via-gray-300 to-transparent"></div>
                    </div>

                    {/* 时间轴日记列表 */}
                    <div className="relative">
                      {/* 时间轴竖线 */}
                      <div className="absolute left-6 sm:left-8 lg:left-12 top-0 bottom-0 w-0.5 hidden sm:block z-0">
                        <div className="timeline-line w-full h-full rounded-full"></div>
                      </div>

                      <div className="relative pl-16 sm:pl-20 lg:pl-24">
                        {diaries.map((diary: Diary, index: number) => {
                          const isVisible = visibleItems.has(diary.id);
                          
                          return (
                            <div
                              key={diary.id}
                              ref={(el: HTMLElement | null) => {
                                if (el) itemRefs.current.set(diary.id, el);
                              }}
                              data-id={diary.id}
                              className={`timeline-item relative mb-10 lg:mb-12 ${
                                isVisible ? 'opacity-100' : 'opacity-0'
                              }`}
                              style={{
                                animationDelay: `${index * 0.1}s`,
                              }}
                            >
                              {/* 时间轴节点 */}
                              <div className="absolute -left-16 sm:-left-20 lg:-left-24 top-8 z-20">
                                <div className={`timeline-node w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full border-3 lg:border-4 border-white shadow-md ${
                                  isVisible ? 'opacity-100' : 'opacity-0'
                                }`}
                                style={{
                                  animationDelay: `${index * 0.1 + 0.2}s`,
                                }}></div>
                              </div>

                              {/* 日期标签（桌面端显示在节点左侧） */}
                              <div className="hidden lg:block absolute -left-56 top-6 text-right w-28">
                                <div className="bg-indigo-50/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-indigo-100 shadow-sm">
                                  <div className="text-sm font-bold text-indigo-700 mb-1">
                                    {formatDate(diary.created_at)}
                                  </div>
                                  <div className="text-xs font-semibold text-indigo-600">
                                    {formatTime(diary.created_at)}
                                  </div>
                                </div>
                              </div>

                              {/* 日记卡片 */}
                              <Link
                                to={`/diary/${diary.id}`}
                                className="block bg-white/95 backdrop-blur-sm rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100 group"
                              >
                                {/* 封面图片 */}
                                {diary.cover_image && (
                                  <div className="w-full h-52 sm:h-64 lg:h-72 overflow-hidden">
                                    <img
                                      src={diary.cover_image}
                                      alt={diary.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                  </div>
                                )}

                                <div className="p-6 sm:p-7 lg:p-8">
                                  {/* 日期和时间（移动端和中等屏幕） */}
                                  <div className="flex items-center space-x-3 mb-5 lg:hidden -ml-4">
                                    <div className="bg-indigo-50/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                      <div className="flex items-center space-x-2">
                                        <Calendar className="w-4 h-4 text-indigo-600" />
                                        <div>
                                          <div className="text-sm font-bold text-indigo-700 leading-tight">
                                            {formatDate(diary.created_at)}
                                          </div>
                                          <div className="text-xs font-semibold text-indigo-600">
                                            {formatTime(diary.created_at)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 标题 */}
                                  <h2 className="font-title text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-4 group-hover:text-indigo-600 transition-colors leading-tight text-shadow-soft">
                                    {diary.title}
                                  </h2>

                                  {/* 内容预览 */}
                                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed mb-5 line-clamp-3">
                                    {truncateContent(diary.content)}
                                  </p>

                                  {/* 图片数量提示 */}
                                  {diary.content.includes('[img:') && (
                                    <div className="flex items-center space-x-2 text-indigo-600 mb-5">
                                      <ImageIcon className="w-4 h-4" />
                                      <span className="text-sm font-medium">包含图片</span>
                                    </div>
                                  )}

                                  {/* 阅读更多 */}
                                  <div className="flex items-center text-indigo-600 font-semibold group-hover:text-indigo-700 text-sm sm:text-base">
                                    <span>阅读全文</span>
                                    <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </div>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
