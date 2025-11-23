import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Save, X, LogOut, Image as ImageIcon, XCircle, MessageSquare, Pin } from 'lucide-react';
import { diaryApi, uploadApi, greetingApi, Diary } from '../api/client';
import ImageInsertModal from '../components/ImageInsertModal';

export default function Admin() {
  const navigate = useNavigate();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ 
    title: '', 
    content: '',
    coverImage: '',
    createdAt: '',
    isPinned: false
  });
  const [greeting, setGreeting] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/admin/login');
  };

  useEffect(() => {
    loadDiaries();
    loadGreeting();
  }, []);

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

  const handleSaveGreeting = async () => {
    try {
      await greetingApi.update(greeting);
      setShowGreetingModal(false);
      alert('问候语已更新');
    } catch (error) {
      console.error('保存问候语失败:', error);
      alert('保存问候语失败，请重试');
    }
  };

  const loadDiaries = async () => {
    try {
      const response = await diaryApi.getAll();
      setDiaries(response.data);
    } catch (error) {
      console.error('加载日记失败:', error);
      alert('加载日记失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setIsCreating(true);
    const now = new Date();
    const localDateTime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setFormData({ title: '', content: '', coverImage: '', createdAt: localDateTime, isPinned: false });
  };

  const handleEdit = (diary: Diary) => {
    setEditingId(diary.id);
    // 将数据库中的日期时间转换为本地日期时间格式（YYYY-MM-DDTHH:mm）
    let localDateTime = '';
    if (diary.created_at) {
      let date: Date;
      if (diary.created_at.includes('T')) {
        date = new Date(diary.created_at);
      } else if (diary.created_at.includes(' ')) {
        date = new Date(diary.created_at.replace(' ', 'T'));
      } else {
        date = new Date(diary.created_at + 'T00:00:00');
      }
      if (!isNaN(date.getTime())) {
        localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
      }
    }
    setFormData({ 
      title: diary.title, 
      content: diary.content,
      coverImage: diary.cover_image || '',
      createdAt: localDateTime,
      isPinned: diary.is_pinned || false
    });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({ title: '', content: '', coverImage: '', createdAt: '', isPinned: false });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadApi.uploadImage(file);
      setFormData({ ...formData, coverImage: response.data.url });
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传封面失败，请重试');
    }
  };

  const removeCover = () => {
    setFormData({ ...formData, coverImage: '' });
  };

  const handleInsertImage = (markup: string) => {
    const textarea = contentTextareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = formData.content;
    const newText = text.substring(0, start) + markup + text.substring(end);
    
    setFormData({ ...formData, content: newText });
    
    // 恢复光标位置
    setTimeout(() => {
      textarea.focus();
      const newPosition = start + markup.length;
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);
  };


  const handleSave = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('标题和内容不能为空');
      return;
    }

    try {
      // 将本地日期时间转换为数据库格式（YYYY-MM-DD HH:mm:ss）
      let createdAt: string | undefined;
      if (formData.createdAt) {
        const localDate = new Date(formData.createdAt);
        createdAt = localDate.toISOString().replace('T', ' ').substring(0, 19);
      }

      if (editingId) {
        await diaryApi.update(
          editingId, 
          formData.title, 
          formData.content,
          formData.coverImage || undefined,
          createdAt,
          formData.isPinned
        );
      } else {
        await diaryApi.create(
          formData.title, 
          formData.content,
          formData.coverImage || undefined,
          createdAt,
          formData.isPinned
        );
      }
      handleCancel();
      loadDiaries();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这篇日记吗？')) {
      return;
    }

    try {
      await diaryApi.delete(id);
      loadDiaries();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8 lg:mb-12">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-gray-800">日记管理</h1>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto flex-wrap">
          {!isCreating && !editingId && (
            <>
              <button
                onClick={() => setShowGreetingModal(true)}
                className="flex items-center space-x-2 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 lg:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-xs sm:text-sm lg:text-base"
              >
                <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 lg:w-5 lg:h-5" />
                <span className="hidden sm:inline">设置问候语</span>
                <span className="sm:hidden">问候语</span>
              </button>
              <button
                onClick={handleCreate}
                className="flex items-center space-x-2 px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-bold text-sm sm:text-base lg:text-lg flex-1 sm:flex-initial"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6" />
                <span>新建日记</span>
              </button>
            </>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 sm:px-6 py-2 sm:py-3 lg:py-4 bg-white/20 backdrop-blur-sm text-gray-800 rounded-lg sm:rounded-xl hover:bg-white/30 transition-all duration-300 font-semibold text-sm sm:text-base"
          >
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* 创建/编辑表单 */}
      {(isCreating || editingId) && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-10 mb-6 sm:mb-10 border border-gray-200">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-800 mb-4 sm:mb-6 lg:mb-8">
            {editingId ? '编辑日记' : '新建日记'}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            <input
              type="text"
              placeholder="日记标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base sm:text-lg lg:text-xl font-medium"
            />
            
            {/* 日期时间选择 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                创建时间
              </label>
              <input
                type="datetime-local"
                value={formData.createdAt}
                onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-base sm:text-lg"
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                可以自由设置日记的创建时间
              </p>
            </div>

            {/* 置顶选项 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="isPinned" className="text-sm font-semibold text-gray-700 cursor-pointer">
                置顶此日记
              </label>
            </div>
            
            {/* 封面图片 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                封面图片（可选）
              </label>
              {formData.coverImage ? (
                <div className="relative inline-block w-full max-w-md">
                  <img
                    src={formData.coverImage}
                    alt="封面"
                    className="w-full h-40 sm:h-48 object-cover rounded-lg sm:rounded-xl border-2 border-gray-200"
                  />
                  <button
                    onClick={removeCover}
                    className="absolute top-2 right-2 p-1.5 sm:p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-full max-w-md h-40 sm:h-48 border-2 border-dashed border-gray-300 rounded-lg sm:rounded-xl flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors bg-gray-50"
                >
                  <div className="text-center">
                    <ImageIcon className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm sm:text-base text-gray-600">点击上传封面</p>
                  </div>
                </div>
              )}
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
            </div>

            {/* 内容编辑器 */}
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  日记内容（支持 Markdown）
                </label>
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs sm:text-sm font-semibold w-full sm:w-auto"
                >
                  <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>插入图片</span>
                </button>
              </div>
              <textarea
                ref={contentTextareaRef}
                placeholder={'在这里输入日记内容...\n\n支持 Markdown 语法：\n- **粗体**\n- *斜体*\n- # 标题\n- [链接](url)\n- 列表等\n\n提示：点击"插入图片"按钮可以在正文中插入图片，并设置图片大小。'}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={16}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-sm sm:text-base lg:text-lg leading-relaxed font-mono"
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                提示：支持 Markdown 语法，图片会以标记形式插入，格式为 [img:图片地址:宽度百分比]
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                onClick={handleSave}
                className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-bold text-base sm:text-lg"
              >
                <Save className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>保存</span>
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center space-x-2 px-6 sm:px-8 py-3 sm:py-4 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-300 transition-all duration-300 font-semibold text-base sm:text-lg"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>取消</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日记列表 */}
      <div className="space-y-6">
        {diaries.length === 0 ? (
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-16 text-center border border-gray-200">
            <p className="text-gray-600 text-xl font-medium">还没有日记，点击"新建日记"开始吧！</p>
          </div>
        ) : (
          diaries.map((diary) => (
            <div
              key={diary.id}
              className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 hover:shadow-3xl transition-all duration-300 border border-gray-200"
            >
              {diary.cover_image && (
                <img
                  src={diary.cover_image}
                  alt={diary.title}
                  className="w-full h-48 sm:h-56 lg:h-64 object-cover rounded-xl sm:rounded-2xl mb-4 sm:mb-6"
                />
              )}
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-2 sm:mb-3">
                    <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 truncate">{diary.title}</h3>
                    {diary.is_pinned && (
                      <span className="flex items-center space-x-1 text-xs sm:text-sm font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                        <Pin className="w-3 h-3 sm:w-4 sm:h-4 fill-yellow-600" />
                        <span>置顶</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500 mb-2 sm:mb-4 font-medium">{formatDate(diary.created_at)}</p>
                  <p className="text-gray-700 line-clamp-3 sm:line-clamp-4 text-sm sm:text-base lg:text-lg leading-relaxed break-words">{diary.content.replace(/\[img:[^\]]+\]/g, '[图片]').replace(/#{1,6}\s/g, '').substring(0, 150)}...</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
                <button
                  onClick={() => handleEdit(diary)}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-sm sm:text-base"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>编辑</span>
                </button>
                <button
                  onClick={() => handleDelete(diary.id!)}
                  className="flex items-center justify-center space-x-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold text-sm sm:text-base"
                >
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>删除</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 图片插入模态框 */}
      <ImageInsertModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onInsert={handleInsertImage}
      />

      {/* 问候语设置模态框 */}
      {showGreetingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 my-4">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">设置问候语</h2>
              <button
                onClick={() => setShowGreetingModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  问候语内容
                </label>
                <textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={4}
                  placeholder="输入每日问候语..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleSaveGreeting}
                  className="flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg sm:rounded-xl hover:shadow-lg transition-all font-semibold text-sm sm:text-base"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowGreetingModal(false)}
                  className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl hover:bg-gray-300 transition-colors font-semibold text-sm sm:text-base"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
