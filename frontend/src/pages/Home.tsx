import { useEffect, useState, useRef, useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Pin, MapPin, Users, Star, UserCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { diaryApi, greetingApi, Diary, usersApi, collectionsApi, collectsApi, Collection } from '../api/client';
import GlobalLinksPanel from '../components/GlobalLinksPanel';
import { Card } from '../components/ui/Card';
import TimelineNavigator from '../components/TimelineNavigator';
import CollectionCard from '../components/CollectionCard';
import { DiaryCardContent } from '../components/DiaryCardContent';
import { useAuth } from '../contexts/AuthContext';

interface PublicProfile {
  username: string;
  display_name?: string;
  bio?: string;
}

type TimelineItemType =
  | { type: 'diary'; data: Diary; date: Date; id: string }
  | { type: 'collection'; data: Collection; date: Date; id: string };

const maintainerUsername = import.meta.env.VITE_MAINTAINER_USERNAME || '羚羊';

const parseDate = (dateString: string) => {
  if (!dateString) return new Date();
  const normalized = dateString.replace(' ', 'T');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
};

export default function Home() {
  const { username } = useParams<{ username?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [activeUsername, setActiveUsername] = useState<string>('');

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [items, setItems] = useState<TimelineItemType[]>([]);
  const [pinnedDiaries, setPinnedDiaries] = useState<Diary[]>([]);
  const [greeting, setGreeting] = useState('');

  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const [expandedCollectionIds, setExpandedCollectionIds] = useState<Set<number>>(new Set());
  const [collectionDiariesMap, setCollectionDiariesMap] = useState<Record<number, Diary[]>>({});

  // Intersection Observer for scroll animations
  const [visibleItemIds, setVisibleItemIds] = useState<Set<string>>(new Set());
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  const [searchParams] = useSearchParams();
  const view = searchParams.get('view') || 'timeline';

  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<any[]>([]);
  const [collectedDiaries, setCollectedDiaries] = useState<Diary[]>([]);

  useEffect(() => {
    if (username) {
      if (activeUsername !== username) {
        setActiveUsername(username);
        loadData(username);
      }
      return;
    }

    if (authLoading) return;

    const target = user ? user.username : maintainerUsername;

    if (activeUsername !== target) {
      setActiveUsername(target);
      loadData(target);
    }
  }, [username, user, authLoading]);

  const loadData = async (targetUsername: string) => {
    setLoading(true);
    setProfileError('');
    try {
      const userRes = await usersApi.getProfile(targetUsername);
      setProfile(userRes.data as PublicProfile);

      if (view === 'following') {
        const res = await usersApi.getFollowing(targetUsername);
        setFollowingList(res.data);
      } else if (view === 'followers') {
        const res = await usersApi.getFollowers(targetUsername);
        setFollowersList(res.data);
      } else if (view === 'collections') {
        const res = await collectsApi.getList(targetUsername);
        setCollectedDiaries(res.data);
      } else {
        const [diaryRes, collectionRes, greetingRes] = await Promise.allSettled([
          diaryApi.getAll(targetUsername),
          collectionsApi.getAll(targetUsername),
          greetingApi.get()
        ]);

        let loadedDiaries: Diary[] = [];
        let loadedCollections: Collection[] = [];

        if (diaryRes.status === 'fulfilled') {
          loadedDiaries = diaryRes.value.data;
          setPinnedDiaries(loadedDiaries.filter(d => d.is_pinned));
        }
        if (collectionRes.status === 'fulfilled') {
          loadedCollections = collectionRes.value.data;
        }
        if (greetingRes.status === 'fulfilled' && greetingRes.value.data?.content) {
          setGreeting(greetingRes.value.data.content);
        } else {
          setGreeting(t('home.default_greeting'));
        }

        const independentDiaries = loadedDiaries.filter(d => !d.collection_id && !d.is_pinned);
        const timelineItems: TimelineItemType[] = [
          ...independentDiaries.map(d => ({ type: 'diary' as const, data: d, date: parseDate(d.created_at), id: `diary-${d.id}` })),
          ...loadedCollections.map(c => ({ type: 'collection' as const, data: c, date: parseDate(c.updated_at || c.created_at), id: `collection-${c.id}` }))
        ];
        timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());
        setItems(timelineItems);
      }

    } catch (e: any) {
      console.error('Data load error', e);
      if (e.response?.status === 404) setProfileError(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeUsername) loadData(activeUsername);
  }, [view]);

  // Grouping for Timeline
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItemType[]> = {};
    items.forEach(item => {
      const year = item.date.getFullYear();
      const month = item.date.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [items]);

  const timelineGroups = useMemo(() => {
    const years = new Set<number>();
    items.forEach(item => years.add(item.date.getFullYear()));
    const sortedYears = Array.from(years).sort((a, b) => b - a);

    return sortedYears.map(year => {
      const monthsInYear = new Set<number>();
      items.filter(i => i.date.getFullYear() === year).forEach(i => monthsInYear.add(i.date.getMonth() + 1));
      const sortedMonths = Array.from(monthsInYear).sort((a, b) => b - a);

      return {
        year,
        months: sortedMonths.map(m => ({
          monthStr: `${m}月`, // Keep generic or use i18n if strict needed. '月' is okay for now or use t('common.month_suffix')? I'll keep Chinese specific for consistent UI style unless strictly asked.
          id: `group-${year}-${m}`,
          label: `${m}月`
        }))
      };
    });
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-timline-id');
            if (id) setVisibleItemIds(prev => new Set([...prev, id]));
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    itemRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const toggleCollection = async (collectionId: number) => {
    setExpandedCollectionIds(prev => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
        if (!collectionDiariesMap[collectionId]) {
          collectionsApi.getById(collectionId).then(res => {
            if (res.data.diaries) {
              setCollectionDiariesMap(prevMap => ({
                ...prevMap,
                [collectionId]: res.data.diaries!
              }));
            }
          }).catch(console.error);
        }
      }
      return next;
    });
  };

  if (loading && !profile) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen pb-20">
      <GlobalLinksPanel activeUsername={activeUsername} />
      <TimelineNavigator groups={timelineGroups} />

      <div className="relative z-10 max-w-5xl mx-auto px-4">
        {/* Profile Header */}
        <div className="text-center py-20 lg:py-24 space-y-6">
          <h1 className="font-title text-5xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-2">
            {profile?.display_name || profile?.username || 'MyShards'}
          </h1>
          <p className="font-body text-xl text-gray-500 font-light max-w-2xl mx-auto">
            {profileError || profile?.bio || t('home.default_bio')}
          </p>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/50 backdrop-blur border border-gray-200 text-sm text-gray-600 shadow-sm">
            <MapPin className="w-4 h-4 text-indigo-500" />
            <span>{t('home.visiting', { name: activeUsername })}</span>
          </div>
        </div>

        {/* Greeting */}
        <div className="flex justify-center mb-16">
          <Card variant="glass" className="max-w-3xl text-center shadow-lg hover:shadow-xl transition-shadow">
            <p className="font-title text-xl text-gray-800 leading-relaxed">"{greeting || t('home.default_greeting')}"</p>
          </Card>
        </div>

        {/* View Content */}
        {view === 'timeline' ? (
          <div id="tour-timeline" className="relative border-l-4 border-indigo-100/50 pl-14 ml-1 md:pl-16 md:ml-0 space-y-20 min-h-[500px]">
            {/* Pinned Diaries */}
            {pinnedDiaries.length > 0 && (
              <section className="mb-20">
                <div className="relative mb-10">
                  <div className="absolute -left-11 md:-left-[76px] top-2 bg-white border-[4px] border-amber-400 w-6 h-6 rounded-full z-10 shadow-md" />
                  <div className="flex items-center gap-3 px-2">
                    <Pin className="w-6 h-6 text-amber-500" />
                    <h2 className="font-title text-3xl font-bold text-gray-800">{t('home.pinned')}</h2>
                  </div>
                </div>

                <div className="grid gap-8">
                  {pinnedDiaries.map(diary => (
                    <Link key={diary.id} to={`/diary/${diary.id}`} className="relative group block">
                      <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-16 w-12 md:w-16 h-0.5 bg-amber-200/50 pointer-events-none" />
                      <div className="absolute top-1/2 -translate-y-1/2 -left-12 md:-left-16 w-1.5 h-1.5 rounded-full bg-amber-300" />
                      <Card variant="glass" noPadding className="group border-amber-100/50 bg-gradient-to-br from-amber-50/30 to-white/80 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 transition-transform duration-300">
                        <DiaryCardContent diary={diary} isPinned />
                      </Card>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Timeline Content */}
            {Object.keys(groupedItems).length === 0 && !loading && (
              <div className="text-center py-20 text-gray-400 font-light">
                {t('home.no_content')}
              </div>
            )}

            {Object.entries(groupedItems).map(([key, groupItems]) => {
              const [year, month] = key.split('-');
              const groupId = `group-${year}-${month}`;

              return (
                <div key={key} id={groupId} className="relative scroll-mt-32">
                  <div className="absolute -left-11 md:-left-[76px] top-2 bg-white border-[4px] border-indigo-400 w-6 h-6 rounded-full z-10 shadow-md" />
                  <h3 className="font-title text-3xl font-bold mb-8 pl-2 select-none flex items-baseline gap-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                      {year}
                    </span>
                    <span className="text-xl text-gray-400 font-medium tracking-wide">{month}月</span>
                  </h3>

                  <div className="grid gap-12">
                    {groupItems.map((item) => {
                      const isVisible = visibleItemIds.has(item.id);
                      return (
                        <div
                          key={item.id}
                          ref={el => { if (el) itemRefs.current.set(item.id, el) }}
                          data-timline-id={item.id}
                          className={`relative transition-all duration-700 ease-out transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}
                        >
                          <div className="absolute top-8 -left-12 md:-left-16 w-12 md:w-16 h-0.5 bg-indigo-100/80 pointer-events-none" />
                          <div className="absolute top-8 -left-12 md:-left-16 w-1.5 h-1.5 rounded-full bg-indigo-200" />

                          {item.type === 'diary' ? (
                            <Link to={`/diary/${(item.data as Diary).id}`}>
                              <Card noPadding className="group hover:-translate-y-1 transition-transform duration-300">
                                <DiaryCardContent diary={item.data as Diary} />
                              </Card>
                            </Link>
                          ) : (
                            <div className="relative">
                              <CollectionCard
                                collection={item.data as Collection}
                                onClick={() => toggleCollection((item.data as Collection).id)}
                              />
                              {expandedCollectionIds.has((item.data as Collection).id) && (
                                <div className="mt-8 ml-4 md:ml-8 border-l-2 border-indigo-100 pl-8 space-y-8 animate-in slide-in-from-top-4 duration-300 fading-in">
                                  {collectionDiariesMap[(item.data as Collection).id]?.length ? (
                                    collectionDiariesMap[(item.data as Collection).id].map(d => (
                                      <div key={d.id} className="relative group">
                                        <div className="absolute top-8 -left-8 w-8 h-0.5 bg-indigo-100 pointer-events-none" />
                                        <div className="absolute top-8 -left-8 w-1.5 h-1.5 rounded-full bg-indigo-200" />
                                        <Link to={`/diary/${d.id}`}>
                                          <Card noPadding className="hover:-translate-y-1 transition-transform duration-300 bg-white/60">
                                            <DiaryCardContent diary={d} />
                                          </Card>
                                        </Link>
                                      </div>
                                    ))
                                  ) : (
                                    <div className="text-gray-400 text-sm italic py-4">{t('common.loading')}</div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : view === 'following' || view === 'followers' ? (
          <div className="max-w-3xl mx-auto min-h-[500px]">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
              {view === 'following' ? <UserCheck className="text-indigo-500" /> : <Users className="text-indigo-500" />}
              {view === 'following' ? t('nav.menu.following') : t('nav.menu.followers')}
            </h2>
            <div className="grid gap-4">
              {(view === 'following' ? followingList : followersList).map((u: any) => (
                <Link key={u.id} to={`/space/${u.username}`} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {u.display_name?.[0] || u.username[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{u.display_name || u.username}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{u.bio || '暂无介绍'}</p>
                    </div>
                  </div>
                  <div className="text-xs text-indigo-500 bg-indigo-50 px-2 py-1 rounded-full">
                    {u.diary_count || 0} 篇日记
                  </div>
                </Link>
              ))}
              {(view === 'following' ? followingList : followersList).length === 0 && (
                <div className="text-center py-20 text-gray-400">{t('we.no_matches')}</div>
              )}
            </div>
          </div>
        ) : view === 'collections' ? (
          <div className="max-w-3xl mx-auto min-h-[500px]">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
              <Star className="text-amber-400" />
              {t('nav.menu.collections')}
            </h2>
            <div className="grid gap-6">
              {collectedDiaries.map(d => (
                <Link key={d.id} to={`/diary/${d.id}`}>
                  <Card variant="glass" className="hover:-translate-y-1 transition-transform">
                    <DiaryCardContent diary={d} />
                    <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end text-xs text-gray-400">
                      Via {d.owner?.display_name || d.owner?.username || 'Unknown'}
                    </div>
                  </Card>
                </Link>
              ))}
              {collectedDiaries.length === 0 && (
                <div className="text-center py-20 text-gray-400">{t('home.no_content')}</div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div >
  );
}
