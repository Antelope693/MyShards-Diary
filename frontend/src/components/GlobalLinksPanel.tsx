import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Loader2, RefreshCcw, Sparkles, X, LayoutDashboard, UserCheck, Star, Briefcase, MoreHorizontal, Shuffle, Clock, Flame, Compass } from 'lucide-react';
import { globalLinksApi, GlobalLink, recommendationsApi } from '../api/client';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface GlobalLinksPanelProps {
  activeUsername?: string;
}

export default function GlobalLinksPanel({ activeUsername }: GlobalLinksPanelProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<GlobalLink[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await globalLinksApi.getAll();
      setLinks(response.data.links || []);
    } catch (err: any) {
      console.error('加载“我们”列表失败:', err);
      setError(err?.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string, link: GlobalLink) => {
    if (!link.username) {
      if (link.url?.startsWith('http')) window.open(link.url);
      return;
    }
    const base = `/space/${encodeURIComponent(link.username)}`;
    switch (action) {
      case 'space':
        navigate(base);
        break;
      case 'following':
        navigate(`${base}?view=following`);
        break;
      case 'collections':
        navigate(`${base}?view=collections`);
        break;
      case 'followers':
        navigate(`${base}?view=followers`);
        break;
      case 'career':
      case 'more':
        alert(t('common.more'));
        return;
    }
    setIsOpen(false);
  };

  const handleNavigate = (link: GlobalLink) => {
    setExpandedUser(expandedUser === link.username ? null : (link.username || null));
  };


  const filteredLinks = useMemo(() => {
    if (!searchTerm.trim()) {
      return links;
    }
    const keyword = searchTerm.trim().toLowerCase();
    return links.filter(
      (link) =>
        link.name?.toLowerCase().includes(keyword) ||
        link.username?.toLowerCase().includes(keyword)
    );
  }, [links, searchTerm]);

  return (
    <div className="fixed left-2 top-32 sm:left-4 lg:left-6 z-40 flex flex-col gap-4">
      {/* We Panel Trigger */}
      <button
        id="tour-nav-we"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center space-x-2 rounded-r-full bg-white/90 backdrop-blur border border-gray-200/80 px-4 py-2 shadow-md hover:shadow-lg transition-all duration-300 w-fit"
      >
        <Users className="w-4 h-4 text-indigo-600 group-hover:text-indigo-700" />
        <span className="font-semibold text-gray-700 text-sm">{t('we.title')}</span>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-45 text-gray-500' : 'text-gray-400'}`}>
          <Sparkles className="w-4 h-4" />
        </div>
      </button>

      {/* They Panel Trigger */}
      <RecommendationsPanel />

      {/* We Panel Content */}
      <div
        className={`absolute top-0 left-full ml-4 w-80 sm:w-96 max-w-[90vw] transform transition-all duration-300 origin-top-left ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
          }`}
      >
        <div className="relative rounded-2xl bg-white/95 backdrop-blur border border-gray-100 shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 font-semibold mb-1">{t('we.badge')}</p>
              <h3 className="font-title text-xl text-gray-800 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{t('we.subtitle')}</span>
              </h3>
            </div>
            <button className="p-1 rounded-full hover:bg-gray-100" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm custom-scrollbar">
            <div className="space-y-3 shrink-0">
              <div className="flex items-center justify-between text-gray-500 text-xs uppercase tracking-[0.3em]">
                <span>{t('we.companions')}</span>
                <button
                  onClick={fetchLinks}
                  className="flex items-center space-x-1 text-indigo-600 hover:text-indigo-700 font-semibold"
                >
                  <RefreshCcw className="w-3 h-3" />
                  <span>{t('common.refresh')}</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder={t('we.search_placeholder')}
                  className="w-full border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-gray-50/60"
                />
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center space-x-3 text-gray-500 py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.loading')}</span>
              </div>
            ) : error ? (
              <div className="bg-rose-50 text-rose-600 px-4 py-3 rounded-lg border border-rose-100 text-sm">{error}</div>
            ) : links.length === 0 ? (
              <div className="text-gray-500 text-sm py-4">{t('we.no_users')}</div>
            ) : (
              <div className="space-y-3 pb-2">
                {filteredLinks.length === 0 ? (
                  <div className="text-sm text-gray-500 py-4">{t('we.no_matches')}</div>
                ) : (
                  filteredLinks.map((link) => {
                    const isActive = activeUsername && link.username === activeUsername;
                    const isExpanded = expandedUser === link.username;

                    return (
                      <div key={`${link.username || link.url}`} className="w-full">
                        <button
                          onClick={() => handleNavigate(link)}
                          className={`w-full text-left border rounded-xl p-4 transition-all duration-300 group relative ${isActive || isExpanded
                            ? 'border-indigo-400 bg-indigo-50/80 shadow-lg shadow-indigo-100'
                            : 'border-gray-100 hover:border-indigo-200 hover:shadow-sm hover:bg-white'
                            }`}
                        >
                          {/* Indicator for Dropdown */}
                          <div className={`absolute right-4 top-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-gray-400" />
                          </div>

                          <div className="flex items-center justify-between mb-1 pr-6">
                            <p className="font-semibold text-gray-800 flex items-center space-x-2">
                              <span className="group-hover:text-indigo-600 transition-colors">{link.name}</span>
                              {link.region && (
                                <span className="text-xs text-indigo-500 border border-indigo-100 rounded-full px-2 py-0.5">
                                  {link.region}
                                </span>
                              )}
                            </p>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{link.diary_count || 0} {t('common.diary_unit')}</span>
                          </div>
                          {link.description && <p className="text-sm text-gray-600 line-clamp-2 mb-2">{link.description}</p>}
                          {link.latest_diary_at && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                              <span>{new Date(link.latest_diary_at).toLocaleDateString()} {t('common.updated')}</span>
                            </div>
                          )}
                        </button>

                        {/* Dropdown Content */}
                        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-64 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                          <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-2 grid grid-cols-2 gap-2">
                            <ActionButton icon={<LayoutDashboard size={14} />} label={t('nav.menu.space')} onClick={() => handleAction('space', link)} />
                            <ActionButton icon={<UserCheck size={14} />} label={t('nav.menu.following')} onClick={() => handleAction('following', link)} />
                            <ActionButton icon={<Star size={14} />} label={t('nav.menu.collections')} onClick={() => handleAction('collections', link)} />
                            <ActionButton icon={<Users size={14} />} label={t('nav.menu.followers')} onClick={() => handleAction('followers', link)} />
                            <ActionButton icon={<Briefcase size={14} />} label={t('nav.menu.career')} onClick={() => handleAction('career', link)} />
                            <ActionButton icon={<MoreHorizontal size={14} />} label={t('nav.menu.more')} onClick={() => handleAction('more', link)} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecommendationsPanel() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'random' | 'newest' | 'hot'>('random');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await recommendationsApi.get(activeFilter);
      setItems(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, activeFilter]);

  return (
    <div className="relative">
      <button
        id="tour-nav-they"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center space-x-2 rounded-r-full bg-white/90 backdrop-blur border border-gray-200/80 px-4 py-2 shadow-md hover:shadow-lg transition-all duration-300 w-fit"
      >
        <Compass className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700" />
        <span className="font-semibold text-gray-700 text-sm">{t('they.title')}</span>
        <div className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-gray-500' : 'text-gray-400'}`}>
          <Sparkles className="w-4 h-4" />
        </div>
      </button>

      <div
        className={`absolute top-0 left-full ml-4 w-80 sm:w-96 max-w-[90vw] transform transition-all duration-300 origin-top-left z-50 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
          }`}
      >
        <div className="relative rounded-2xl bg-white/95 backdrop-blur border border-gray-100 shadow-xl overflow-hidden max-h-[80vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-500 font-semibold mb-1">{t('they.badge')}</p>
              <h3 className="font-title text-xl text-gray-800 flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>{t('they.subtitle')}</span>
              </h3>
            </div>
            <button className="p-1 rounded-full hover:bg-gray-100" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
            <FilterChip active={activeFilter === 'random'} onClick={() => setActiveFilter('random')} icon={<Shuffle className="w-3 h-3" />} label={t('they.filter.random')} />
            <FilterChip active={activeFilter === 'newest'} onClick={() => setActiveFilter('newest')} icon={<Clock className="w-3 h-3" />} label={t('they.filter.newest')} />
            <FilterChip active={activeFilter === 'hot'} onClick={() => setActiveFilter('hot')} icon={<Flame className="w-3 h-3" />} label={t('they.filter.hot')} />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm custom-scrollbar min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-200" />
                <span className="text-xs">{t('common.loading')}</span>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, idx) => (
                  <Link key={idx} to={`/diary/${item.id}`} className="block group">
                    <div className="p-4 rounded-xl border border-gray-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all duration-300">
                      <h4 className="font-bold text-gray-800 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">{item.title}</h4>
                      <p className="text-xs text-gray-500 mb-2">by {item.display_name || item.username}</p>
                      <p className="text-gray-600 text-xs line-clamp-2 leading-relaxed opacity-80">{item.content}</p>
                    </div>
                  </Link>
                ))}
                <button onClick={fetchItems} className="w-full py-3 text-xs text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors border border-dashed border-gray-200">
                  {t('they.refresh')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


function FilterChip({ active, onClick, icon, label, disabled }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 border ${active
        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-200'
        : disabled
          ? 'bg-gray-100 text-gray-400 border-transparent cursor-not-allowed'
          : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-600'
        }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function ActionButton({ icon, label, onClick }: { icon: any, label: string, onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-lg transition-all">
      {icon}
      <span>{label}</span>
    </button>
  )
}
