import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageSquare, Send, Reply, LogIn, Trash2 } from 'lucide-react';
import { commentApi, Comment } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

interface CommentSectionProps {
  diaryId: number;
  comments: Comment[];
  diaryOwnerUsername?: string;
  onCommentAdded: () => void;
}

export default function CommentSection({
  diaryId,
  comments,
  diaryOwnerUsername,
  onCommentAdded,
}: CommentSectionProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      alert(t('comments.validate_empty'));
      return;
    }
    setSubmitting(true);
    try {
      await commentApi.create(diaryId, content.trim());
      setContent('');
      onCommentAdded();
    } catch (error) {
      console.error('Failed to post comment:', error);
      alert(t('comments.post_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();
    if (!replyContent.trim()) {
      alert(t('comments.reply_empty'));
      return;
    }
    setSubmitting(true);
    try {
      await commentApi.create(diaryId, replyContent.trim(), commentId);
      setReplyContent('');
      setReplyingTo(null);
      onCommentAdded();
    } catch (error) {
      console.error('Failed to reply:', error);
      alert(t('comments.reply_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('comments.delete_confirm'))) {
      return;
    }
    try {
      await commentApi.delete(id);
      onCommentAdded();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert(t('comments.delete_failed'));
    }
  };

  const canDelete = (comment: Comment) => {
    if (!user) return false;
    if (user.role === 'maintainer' || user.role === 'admin') return true;
    if (comment.author_username && comment.author_username === user.username) return true;
    if (diaryOwnerUsername && diaryOwnerUsername === user.username) return true;
    return false;
  };

  const topLevelComments = comments.filter((c) => !c.reply_to);
  const repliesMap = new Map<number, Comment[]>();
  comments.forEach((comment) => {
    if (comment.reply_to) {
      if (!repliesMap.has(comment.reply_to)) {
        repliesMap.set(comment.reply_to, []);
      }
      repliesMap.get(comment.reply_to)!.push(comment);
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t('comments.title')} ({comments.length})</h2>
      </div>

      {!user ? (
        <div className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-gray-800 font-semibold text-base sm:text-lg">{t('comments.login_required')}</p>
            <p className="text-gray-500 text-sm sm:text-base mt-1">{t('comments.login_hint')}</p>
          </div>
          <button
            onClick={() => navigate('/admin/login')}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:shadow-lg transition-all"
          >
            <LogIn className="w-4 h-4" />
            <span>{t('comments.login_action')}</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-50 rounded-lg sm:rounded-xl">
          <p className="text-sm text-gray-500 mb-3">
            {t('comments.posting_as', { name: <span className="font-semibold text-purple-600">{user.display_name || user.username}</span> })}
          </p>
          <textarea
            placeholder={t('comments.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 sm:mb-4 text-sm sm:text-base resize-none"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base font-semibold w-full sm:w-auto disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{submitting ? t('comments.submitting') : t('comments.submit')}</span>
          </button>
        </form>
      )}

      <div className="space-y-4 sm:space-y-6">
        {topLevelComments.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">{t('comments.empty')}</p>
        ) : (
          topLevelComments.map((comment) => (
            <div key={comment.id} className="border-l-4 border-purple-500 pl-3 sm:pl-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base truncate">
                      {comment.display_name || comment.author}
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                  {canDelete(comment) && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base break-words">{comment.content}</p>
                {user && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-xs sm:text-sm"
                  >
                    <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{replyingTo === comment.id ? t('comments.cancel_reply') : t('comments.reply')}</span>
                  </button>
                )}

                {user && replyingTo === comment.id && (
                  <form
                    onSubmit={(e) => handleReply(e, comment.id)}
                    className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <textarea
                      placeholder={t('comments.reply_placeholder', { name: comment.display_name || comment.author })}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 text-sm sm:text-base resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex-1 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-semibold disabled:opacity-60"
                      >
                        {t('comments.send_reply')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm font-semibold"
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </form>
                )}

                {repliesMap.has(comment.id) && (
                  <div className="mt-3 sm:mt-4 ml-2 sm:ml-4 space-y-2 sm:space-y-3">
                    {repliesMap.get(comment.id)!.map((reply) => (
                      <div key={reply.id} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-gray-800 text-xs sm:text-sm">
                              {reply.display_name || reply.author}
                            </span>
                            {reply.reply_to_author && (
                              <span className="text-gray-500 text-xs ml-1 sm:ml-2">@{reply.reply_to_author}</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span>{formatDate(reply.created_at)}</span>
                            {canDelete(reply) && (
                              <button
                                onClick={() => handleDelete(reply.id)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-700 text-xs sm:text-sm break-words">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

