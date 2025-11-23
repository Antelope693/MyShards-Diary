import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, ArrowLeft } from 'lucide-react';
import { diaryApi, commentApi, Diary, Comment } from '../api/client';
import CommentSection from '../components/CommentSection';
import ContentRenderer from '../components/ContentRenderer';

export default function DiaryDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [diary, setDiary] = useState<Diary | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDiary();
      loadComments();
    }
  }, [id]);

  const loadDiary = async () => {
    try {
      const response = await diaryApi.getById(Number(id));
      setDiary(response.data);
    } catch (error) {
      console.error('加载日记失败:', error);
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
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-12 text-center border border-gray-200">
        <p className="text-gray-600 text-lg">日记不存在</p>
        <button
          onClick={() => navigate('/')}
          className="mt-4 px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => navigate('/')}
        className="mb-4 sm:mb-6 flex items-center space-x-2 text-gray-700 hover:text-gray-900 transition-colors font-semibold text-sm sm:text-base"
      >
        <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        <span>返回首页</span>
      </button>

      <article className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden mb-6 sm:mb-10 border border-gray-200">
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
        
        <div className="p-4 sm:p-6 md:p-10 lg:p-16">
          <h1 className="font-title text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-800 mb-4 sm:mb-6 leading-tight text-shadow-medium">{diary.title}</h1>
          <div className="flex items-center space-x-2 sm:space-x-3 text-gray-500 mb-6 sm:mb-8 lg:mb-10">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 flex-shrink-0" />
            <span className="text-sm sm:text-base lg:text-lg font-medium">{formatDate(diary.created_at)}</span>
          </div>
          <div className="prose prose-sm sm:prose-base lg:prose-lg xl:prose-xl max-w-none">
            <ContentRenderer content={diary.content} />
          </div>
        </div>
      </article>

      <CommentSection
        diaryId={diary.id}
        comments={comments}
        onCommentAdded={loadComments}
      />
    </div>
  );
}

