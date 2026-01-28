
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, ArrowLeft, UserCircle, Users, MessageSquare, Lock, MoreVertical, Share2, UserPlus, UserMinus, Flag, AlertTriangle, X, Star } from 'lucide-react';
import { diaryApi, commentApi, usersApi, reportsApi, collectsApi, Diary, Comment } from '../api/client';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import CommentSection from '../components/CommentSection';
import ContentRenderer from '../components/ContentRenderer';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { useRef } from 'react';

import { useTranslation } from 'react-i18next';

export default function DiaryDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (id) {
      loadDiary();
      loadComments();
    }
  }, [id]);

  const [isCollected, setIsCollected] = useState(false);

  useEffect(() => {
    if (id && user) {
      collectsApi.checkStatus(Number(id)).then(res => setIsCollected(res.data.isCollected)).catch(() => { });
    }
  }, [id, user]);

  const handleCollectToggle = async () => {
    if (!diary || !user) {
      if (!user) navigate('/admin/login');
      return;
    }
    try {
      if (isCollected) {
        await collectsApi.uncollect(diary.id);
        setIsCollected(false);
      } else {
        await collectsApi.collect(diary.id);
        setIsCollected(true);
      }
    } catch (e) {
      alert(t('diary.detail.op_failed'));
    }
  };

  const loadDiary = async () => {
    try {
      const response = await diaryApi.getById(Number(id));
      setDiary(response.data);
      if (user && response.data.user_id && response.data.user_id !== user.id) {
        checkFollowStatus(response.data.user_id);
      }
    } catch (error) {
      console.error(t('diary.detail.load_error'), error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const response = await commentApi.getByDiaryId(Number(id));
      setComments(response.data);
    } catch (error) {
      console.error('加载留言失败:', error);
    }
  };

  const handleRequestCollaboration = async () => {
    if (!diary) return;
    if (!user) {
      navigate('/admin/login');
      return;
    }
    try {
      const response = await diaryApi.requestEdit(diary.id);
      alert(response.data?.message || t('diary.detail.request_sent'));
      await loadDiary();
    } catch (error: any) {
      alert(error?.response?.data?.error || t('diary.detail.request_failed'));
    }
  };

  const reviewCollaborationRequest = async (editorId: number, action: 'approve' | 'reject') => {
    if (!diary) return;
    try {
      await diaryApi.updateCollaborator(diary.id, editorId, action);
      await loadDiary();
    } catch (error: any) {
      alert(error?.response?.data?.error || t('diary.detail.op_failed_retry'));
    }
  };

  const canReviewPending =
    user &&
    diary &&
    (user.role === 'maintainer' || user.role === 'admin' || diary.owner?.username === user.username);

  const collaborationStatus = diary?.permissions?.collaborationStatus || 'none';
  const canRequestCollab =
    user &&
    diary &&
    !diary.permissions?.isOwner &&
    !diary.permissions?.canEdit &&
    collaborationStatus !== 'pending' &&
    !diary.is_locked;



  const checkFollowStatus = async (targetUserId: number) => {
    try {
      const res = await usersApi.checkFollowStatus(targetUserId);
      setIsFollowing(res.data.isFollowing);
    } catch (error) {
      console.error('Check follow failed', error);
    }
  };

  const handleFollowToggle = async () => {
    if (!diary || !diary.user_id) return;
    try {
      if (isFollowing) {
        await usersApi.unfollow(diary.user_id);
        setIsFollowing(false);
      } else {
        await usersApi.follow(diary.user_id);
        setIsFollowing(true);
      }
      setShowMenu(false);
    } catch (error) {
      alert(t('diary.detail.op_failed_retry'));
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert(t('diary.detail.share_success'));
    setShowMenu(false);
  };

  const handleReport = async () => {
    if (!diary) return;
    try {
      await reportsApi.create('diary', diary.id, reportReason);
      alert(t('diary.detail.report_success'));
      setShowReportModal(false);
      setReportReason('');
    } catch (error) {
      alert(t('diary.detail.report_error'));
    }
  };

  const isOwner = user && diary && user.id === diary.user_id;

  const formatDate = (dateString: string) => {
    if (!dateString) return '未知日期';
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
      return '无效日期';
    }

    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
      </div>
    );
  }

  if (!diary) {
    return (
      <Card className="p-12 text-center shadow-2xl">
        <p className="text-gray-600 text-lg">{t('diary.detail.not_found')}</p>
        <Button
          onClick={() => navigate('/')}
          className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600"
        >
          {t('diary.detail.back_home')}
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-4 sm:mb-6 text-gray-700 hover:text-gray-900 font-semibold"
        icon={<ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />}
      >
        {t('diary.detail.back_home')}
      </Button>

      <Card noPadding className="overflow-hidden mb-6 sm:mb-10 shadow-2xl">
        {/* 封面图片 */}
        {diary.cover_image && (
          <div className="w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
            <img
              src={diary.cover_image}
              alt={diary.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-4 sm:p-6 md:p-10 lg:p-16 relative">
          <div className="flex justify-between items-start gap-4">
            <h1 className="font-title text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-800 mb-4 sm:mb-6 leading-tight text-shadow-medium flex-1">
              {diary.title}
            </h1>

            {/* Actions: Star & Menu */}
            <div className="flex items-center gap-2 relative shrink-0">
              {user && (
                <button
                  onClick={handleCollectToggle}
                  className={`p-2 rounded-full transition-all hover:scale-105 active:scale-95 ${isCollected
                    ? 'bg-amber-100 text-amber-500 hover:bg-amber-200'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-amber-500'
                    }`}
                  title={isCollected ? t('diary.detail.uncollect') : t('diary.detail.collect')}
                >
                  <Star className={`w-6 h-6 ${isCollected ? 'fill-current' : ''}`} />
                </button>
              )}

              {!isOwner && user && (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all hover:scale-105 active:scale-95"
                    title={t('common.more')}
                  >
                    <MoreVertical className="w-6 h-6" />
                  </button>
                  {/* ... menu items ... */}
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="py-1">
                        <button onClick={handleShare} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700">
                          <Share2 className="w-4 h-4 text-indigo-500" /> {t('diary.detail.share_diary')}
                        </button>

                        <button onClick={handleFollowToggle} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700">
                          {isFollowing ? (
                            <><UserMinus className="w-4 h-4 text-rose-500" /> {t('diary.detail.unfollow_author')}</>
                          ) : (
                            <><UserPlus className="w-4 h-4 text-emerald-500" /> {t('diary.detail.follow_author')}</>
                          )}
                        </button>

                        {canRequestCollab && (
                          <button onClick={() => { handleRequestCollaboration(); setShowMenu(false); }} className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 text-sm text-gray-700">
                            <MessageSquare className="w-4 h-4 text-purple-500" /> {t('diary.detail.request_collab')}
                          </button>
                        )}

                        <div className="h-px bg-gray-100 my-1" />

                        <button onClick={() => { setShowReportModal(true); setShowMenu(false); }} className="w-full px-4 py-3 text-left hover:bg-rose-50 flex items-center gap-3 text-sm text-rose-600">
                          <Flag className="w-4 h-4" /> {t('diary.detail.report_violation')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4 text-gray-500 mb-6 sm:mb-8 lg:mb-10">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0" />
              <span className="text-sm sm:text-base lg:text-lg font-medium">{formatDate(diary.created_at)}</span>
            </div>
            {diary.owner && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center space-x-3">
                  <UserCircle className="w-5 h-5 sm:w-6 sm:h-6 text-purple-500" />
                  <span className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700">
                    {t('diary.detail.author_label')}：{diary.owner.display_name || diary.owner.username}
                  </span>
                  <Link
                    to={`/space/${encodeURIComponent(diary.owner.username)}`}
                    className="text-xs sm:text-sm text-purple-600 hover:text-purple-700 underline-offset-2"
                  >
                    {t('diary.detail.view_more_from_author')}
                  </Link>
                </div>
                {diary.is_locked && (
                  <div className="flex items-center space-x-2 text-xs sm:text-sm text-purple-600 font-semibold">
                    <Lock className="w-4 h-4" />
                    <span>{t('diary.detail.locked_hint')}</span>
                  </div>
                )}
                {diary.editors && diary.editors.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2 flex items-center space-x-2">
                      <Users className="w-4 h-4 text-indigo-500" />
                      <span>{t('diary.detail.shared_authors')}</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {diary.editors.map((editor) => (
                        <span
                          key={`editor - ${editor.user_id} `}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100"
                        >
                          {editor.display_name || editor.username}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {canReviewPending && diary.pending_editors && diary.pending_editors.length > 0 && (
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-2">
                      <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{t('diary.detail.pending_section')}</p>
                      {diary.pending_editors.map((editor) => (
                        <div
                          key={`pending - ${editor.user_id} `}

                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-semibold text-gray-800">
                              {editor.display_name || editor.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {t('diary.detail.pending_time')} {editor.created_at ? formatDate(editor.created_at) : t('common.unknown')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => reviewCollaborationRequest(editor.user_id, 'approve')}
                              className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none"
                            >
                              {t('diary.detail.approve')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => reviewCollaborationRequest(editor.user_id, 'reject')}
                              className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none"
                            >
                              {t('diary.detail.reject')}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {user ? (
                    <>
                      {diary.permissions?.isOwner && (
                        <p className="text-xs text-gray-500">
                          {t('diary.detail.ownership_hint')}
                        </p>
                      )}
                      {!diary.permissions?.isOwner && diary.permissions?.isMaintainer && (
                        <p className="text-xs text-gray-500">
                          {t('diary.detail.admin_hint')}
                        </p>
                      )}
                      {!diary.permissions?.isOwner && !diary.permissions?.canEdit && (
                        <>
                          {diary.is_locked && (
                            <p className="text-xs text-gray-500">
                              {t('diary.detail.locked_hint')}
                            </p>
                          )}
                          {collaborationStatus === 'pending' && (
                            <p className="text-xs text-amber-600 font-semibold">
                              {t('diary.detail.collab_pending')}
                            </p>
                          )}
                          {collaborationStatus === 'revoked' && (
                            <p className="text-xs text-rose-600 font-semibold">
                              {t('diary.detail.collab_revoked')}
                            </p>
                          )}
                          {canRequestCollab && (
                            <p className="text-xs text-gray-500">
                              {t('diary.detail.request_collab_hint')}
                            </p>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => navigate('/admin/login')}
                      className="rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 border-none"
                    >
                      {t('diary.detail.login_to_collab')}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none">
            <ContentRenderer content={diary.content} />
          </div>
        </div>
      </Card>

      <CommentSection
        diaryId={diary.id}
        comments={comments}
        diaryOwnerUsername={diary.owner?.username}
        onCommentAdded={loadComments}
      />
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3 text-rose-600">
                <AlertTriangle className="w-6 h-6" />
                <h3 className="text-xl font-bold">{t('diary.detail.report_title')}</h3>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">{t('diary.detail.report_desc')}</p>

            <Input
              value={reportReason}
              onChange={e => setReportReason(e.target.value)}
              placeholder={t('diary.detail.report_placeholder')}
              className="mb-6 w-full"
            />

            <div className="flex gap-3">
              <Button onClick={handleReport} className="flex-1 bg-rose-600 hover:bg-rose-700 border-none text-white">{t('diary.detail.report_submit')}</Button>
              <Button variant="secondary" onClick={() => setShowReportModal(false)} className="flex-1">{t('common.cancel')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

