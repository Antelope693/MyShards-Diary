import { useState } from 'react';
import { MessageSquare, Send, Reply } from 'lucide-react';
import { commentApi, Comment } from '../api/client';

interface CommentSectionProps {
  diaryId: number;
  comments: Comment[];
  onCommentAdded: () => void;
}

export default function CommentSection({
  diaryId,
  comments,
  onCommentAdded,
}: CommentSectionProps) {
  const [author, setAuthor] = useState('');
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyAuthor, setReplyAuthor] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!author.trim() || !content.trim()) {
      alert('请填写姓名和留言内容');
      return;
    }

    try {
      await commentApi.create(diaryId, author, content, replyingTo || undefined);
      setAuthor('');
      setContent('');
      setReplyingTo(null);
      onCommentAdded();
    } catch (error) {
      console.error('发表留言失败:', error);
      alert('发表留言失败，请重试');
    }
  };

  const handleReply = async (e: React.FormEvent, commentId: number) => {
    e.preventDefault();
    if (!replyAuthor.trim() || !replyContent.trim()) {
      alert('请填写姓名和回复内容');
      return;
    }

    try {
      await commentApi.create(diaryId, replyAuthor, replyContent, commentId);
      setReplyContent('');
      setReplyAuthor('');
      setReplyingTo(null);
      onCommentAdded();
    } catch (error) {
      console.error('回复失败:', error);
      alert('回复失败，请重试');
    }
  };

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

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
      <div className="flex items-center space-x-2 mb-4 sm:mb-6">
        <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">留言 ({comments.length})</h2>
      </div>

      {/* 留言表单 */}
      <form onSubmit={handleSubmit} className="mb-6 sm:mb-8 p-4 sm:p-6 bg-gray-50 rounded-lg sm:rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
          <input
            type="text"
            placeholder="您的姓名"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm sm:text-base"
          />
        </div>
        <textarea
          placeholder="写下您的留言..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-3 sm:mb-4 text-sm sm:text-base resize-none"
        />
        <button
          type="submit"
          className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base font-semibold w-full sm:w-auto"
        >
          <Send className="w-4 h-4" />
          <span>发表留言</span>
        </button>
      </form>

      {/* 留言列表 */}
      <div className="space-y-4 sm:space-y-6">
        {topLevelComments.length === 0 ? (
          <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">还没有留言，快来第一个留言吧！</p>
        ) : (
          topLevelComments.map((comment) => (
            <div key={comment.id} className="border-l-4 border-purple-500 pl-3 sm:pl-4">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{comment.author}</h4>
                    <p className="text-xs sm:text-sm text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                </div>
                <p className="text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base break-words">{comment.content}</p>
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 text-xs sm:text-sm"
                >
                  <Reply className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>回复</span>
                </button>

                {/* 回复表单 */}
                {replyingTo === comment.id && (
                  <form
                    onSubmit={(e) => handleReply(e, comment.id)}
                    className="mt-3 sm:mt-4 p-3 sm:p-4 bg-white rounded-lg border border-gray-200"
                  >
                    <input
                      type="text"
                      placeholder="您的姓名"
                      value={replyAuthor}
                      onChange={(e) => setReplyAuthor(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 text-sm sm:text-base"
                    />
                    <textarea
                      placeholder={`回复 ${comment.author}...`}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={2}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2 text-sm sm:text-base resize-none"
                    />
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        type="submit"
                        className="flex-1 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-semibold"
                      >
                        发送回复
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent('');
                          setReplyAuthor('');
                        }}
                        className="flex-1 px-3 sm:px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-xs sm:text-sm font-semibold"
                      >
                        取消
                      </button>
                    </div>
                  </form>
                )}

                {/* 显示回复 */}
                {repliesMap.has(comment.id) && (
                  <div className="mt-3 sm:mt-4 ml-2 sm:ml-4 space-y-2 sm:space-y-3">
                    {repliesMap.get(comment.id)!.map((reply) => (
                      <div key={reply.id} className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-gray-800 text-xs sm:text-sm">{reply.author}</span>
                            {reply.reply_to_author && (
                              <span className="text-gray-500 text-xs ml-1 sm:ml-2">
                                回复 {reply.reply_to_author}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 flex-shrink-0 ml-2">{formatDate(reply.created_at)}</p>
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

