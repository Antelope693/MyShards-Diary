import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  LogOut,
  Image as ImageIcon,
  XCircle,
  Check,
  RefreshCcw,
  MessageSquare,
  Pin,
  Download,
  Lock,
} from 'lucide-react';
import { diaryApi, uploadApi, greetingApi, usersApi, Diary, AuthUser } from '../api/client';
import ImageInsertModal from '../components/ImageInsertModal';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const formatBytes = (value?: number | null) => {
  if (value === undefined || value === null) return '0 B';
  if (value >= 1024 * 1024 * 1024) return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
};

interface ManagedUserInfo {
  id: number;
  username: string;
  display_name?: string;
  email?: string;
  bio?: string;
  role?: 'user' | 'admin' | 'maintainer';
  max_upload_size_bytes?: number;
  storage_quota_bytes?: number;
  used_storage_bytes?: number;
}

interface AdminProps {
  managedUser?: ManagedUserInfo;
  allowOwnerOverride?: boolean;
}

export default function Admin({ managedUser, allowOwnerOverride }: AdminProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [diaries, setDiaries] = useState<Diary[]>([]);
  const [collaborations, setCollaborations] = useState<Diary[]>([]);
  const [loading, setLoading] = useState(true);
  const [collaborationLoading, setCollaborationLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    coverImage: '',
    createdAt: '',
    isPinned: false,
    isLocked: false,
  });
  const [greeting, setGreeting] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showGreetingModal, setShowGreetingModal] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [storageInfo, setStorageInfo] = useState<{
    max: number;
    quota: number;
    used: number;
  } | null>(null);

  const currentOwner: AuthUser | ManagedUserInfo | null = managedUser || user || null;
  const isSelfDashboard = !managedUser;
  const canManageGreeting = isSelfDashboard && user?.role === 'maintainer';
  const ownerDisplayName = currentOwner ? currentOwner.display_name || currentOwner.username : '';
  const ownerEmail = currentOwner && 'email' in currentOwner ? currentOwner.email : undefined;
  const ownerRole = currentOwner && 'role' in currentOwner ? currentOwner.role : user?.role;

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  useEffect(() => {
    if (!currentOwner?.username) {
      return;
    }
    loadDiaries(currentOwner.username);
    if (canManageGreeting) {
      loadGreeting();
    }
  }, [currentOwner?.username, canManageGreeting]);

  useEffect(() => {
    if (isSelfDashboard && !managedUser) {
      usersApi
        .getMyLimits()
        .then((res) =>
          setStorageInfo({
            max: res.data.max_upload_size_bytes,
            quota: res.data.storage_quota_bytes,
            used: res.data.used_storage_bytes,
          })
        )
        .catch((error) => {
          console.warn('获取配额失败:', error);
        });
    } else if (managedUser) {
      setStorageInfo({
        max: managedUser.max_upload_size_bytes ?? 10 * 1024 * 1024,
        quota: managedUser.storage_quota_bytes ?? 200 * 1024 * 1024,
        used: managedUser.used_storage_bytes ?? 0,
      });
    }
  }, [isSelfDashboard, managedUser]);

  useEffect(() => {
    if (!isSelfDashboard || managedUser) {
      setCollaborations([]);
      return;
    }
    setCollaborationLoading(true);
    diaryApi
      .getCollaborations()
      .then((res) => setCollaborations(res.data))
      .catch((err) => {
        console.error('加载协作日记失败:', err);
      })
      .finally(() => setCollaborationLoading(false));
  }, [isSelfDashboard, managedUser]);

  const loadGreeting = async () => {
    if (!canManageGreeting) return;
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
      alert(t('admin.messages.save_success'));
    } catch (error) {
      console.error('保存问候语失败:', error);
      alert(t('admin.messages.save_failed'));
    }
  };

  const loadDiaries = async (ownerUsername: string) => {
    try {
      setLoading(true);
      const response = await diaryApi.getAll(ownerUsername);
      setDiaries(response.data);
    } catch (error) {
      console.error('加载日记失败:', error);
      alert(t('common.error'));
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
    setFormData({
      title: '',
      content: '',
      coverImage: '',
      createdAt: localDateTime,
      isPinned: false,
      isLocked: false,
    });
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
      isPinned: diary.is_pinned || false,
      isLocked: diary.is_locked || false,
    });
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      coverImage: '',
      createdAt: '',
      isPinned: false,
      isLocked: false,
    });
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await uploadApi.uploadImage(file);
      setFormData({ ...formData, coverImage: response.data.url });
    } catch (error) {
      console.error('上传失败:', error);
      alert(t('admin.messages.upload_failed'));
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
    if (!currentOwner?.username) {
      alert('尚未获取到当前用户信息，请刷新后重试');
      return;
    }
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

      const ownerOptions =
        allowOwnerOverride && managedUser
          ? {
            userId: managedUser.id,
          }
          : undefined;

      if (editingId) {
        await diaryApi.update(
          editingId,
          formData.title,
          formData.content,
          formData.coverImage || undefined,
          createdAt,
          formData.isPinned,
          formData.isLocked
        );
      } else {
        await diaryApi.create(
          formData.title,
          formData.content,
          formData.coverImage || undefined,
          createdAt,
          formData.isPinned,
          formData.isLocked,
          ownerOptions
        );
      }
      handleCancel();
      loadDiaries(currentOwner.username);
      if (isSelfDashboard && !managedUser) {
        loadCollaborations();
      }
    } catch (error) {
      console.error('保存失败:', error);
      alert(t('admin.messages.save_failed'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.messages.delete_confirm'))) {
      return;
    }

    try {
      await diaryApi.delete(id);
      if (currentOwner?.username) {
        loadDiaries(currentOwner.username);
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert(t('admin.messages.delete_failed'));
    }
  };

  const handleCollaboratorAction = async (
    diaryId: number,
    editorId: number,
    action: 'approve' | 'reject' | 'revoke'
  ) => {
    try {
      await diaryApi.updateCollaborator(diaryId, editorId, action);
      await loadDiaries(currentOwner?.username || '');
      if (isSelfDashboard && !managedUser) {
        loadCollaborations();
      }
    } catch (error: any) {
      alert(error?.response?.data?.error || '操作失败，请重试');
    }
  };

  const loadCollaborations = async () => {
    setCollaborationLoading(true);
    try {
      const { data } = await diaryApi.getCollaborations();
      setCollaborations(data);
    } catch (error) {
      console.error('加载协作日记失败:', error);
    } finally {
      setCollaborationLoading(false);
    }
  };

  const handleExportUser = async () => {
    if (!currentOwner?.username) {
      alert('尚未获取到用户信息，稍后再试');
      return;
    }
    try {
      const response = await usersApi.exportUser(currentOwner.username);
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentOwner.username}-diary-export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert(t('admin.messages.export_failed'));
    }
  };

  const handleRecalculateStorage = async () => {
    if (user?.role !== 'maintainer') {
      alert('只有维护者可以执行该操作');
      return;
    }
    const targetId = managedUser?.id ?? user?.id;
    if (!targetId) {
      return;
    }
    try {
      const response = await usersApi.recalcStorage(targetId);
      const nextUsed = response.data.used_storage_bytes;
      setStorageInfo((prev) =>
        prev
          ? {
            ...prev,
            used: nextUsed,
          }
          : null
      );
      alert(t('common.success'));
    } catch (error: any) {
      console.error('重新统计失败:', error);
      alert(error?.response?.data?.error || t('common.error'));
    }
  };

  const renderCollaboratorBlocks = (diary: Diary) => {
    const canManage =
      diary.permissions?.isOwner || user?.role === 'maintainer' || user?.role === 'admin';
    const approvedEditors = diary.editors || [];
    const pendingEditors = diary.pending_editors || [];
    if (approvedEditors.length === 0 && (!canManage || pendingEditors.length === 0)) {
      return null;
    }

    return (
      <div className="mt-4 space-y-4">
        {diary.is_locked && (
          <p className="text-xs text-purple-600 font-semibold">
            {t('admin.collaboration.locked_hint')}
          </p>
        )}
        {approvedEditors.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">{t('admin.collaboration.shared_author')}</p>
            <div className="flex flex-wrap gap-3">
              {approvedEditors.map((editor) => (
                <div
                  key={`${diary.id}-editor-${editor.user_id}`}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-sm font-semibold border border-indigo-100"
                >
                  <span>{editor.display_name || editor.username}</span>
                  {canManage && (
                    <button
                      onClick={() =>
                        handleCollaboratorAction(diary.id!, editor.user_id, 'revoke')
                      }
                      className="text-indigo-500 hover:text-indigo-700 transition"
                      title="移除协作者"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {canManage && pendingEditors.length > 0 && (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-400">{t('admin.collaboration.pending')}</p>
            {pendingEditors.map((editor) => (
              <div
                key={`${diary.id}-pending-${editor.user_id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-gray-800">
                    {editor.display_name || editor.username}
                  </p>
                  <p className="text-xs text-gray-500">
                    申请时间 {editor.created_at ? formatDate(editor.created_at) : '未知'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() =>
                      handleCollaboratorAction(diary.id!, editor.user_id, 'approve')
                    }
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-semibold hover:bg-emerald-200 transition"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    {t('admin.collaboration.approve')}
                  </button>
                  <button
                    onClick={() =>
                      handleCollaboratorAction(diary.id!, editor.user_id, 'reject')
                    }
                    className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-semibold hover:bg-rose-200 transition"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    {t('admin.collaboration.reject')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
        }
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-4 sm:mb-6 lg:mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.5em] text-gray-400 mb-2">
            {isSelfDashboard ? t('admin.dashboard_subtitle') : t('admin.maintainer_console')}
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-800">
            {ownerDisplayName ? t('admin.diary_of', { name: ownerDisplayName }) : t('admin.dashboard_title')}
          </h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          {!isCreating && !editingId && (
            <>
              {canManageGreeting && (
                <Button
                  onClick={() => setShowGreetingModal(true)}
                  className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-xs sm:text-sm font-semibold"
                  icon={<MessageSquare className="w-4 h-4" />}
                >
                  <span className="hidden sm:inline">{t('admin.set_greeting')}</span>
                  <span className="sm:hidden">{t('admin.greeting')}</span>
                </Button>
              )}
              <Button
                onClick={handleCreate}
                className="px-4 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-sm sm:text-base font-bold"
                icon={<Plus className="w-4 h-4" />}
              >
                {t('admin.new_diary')}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={handleExportUser}
            className="px-4 py-2 text-sm font-semibold"
            icon={<Download className="w-4 h-4" />}
          >
            {t('admin.export_data')}
          </Button>
          {isSelfDashboard && (
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="px-4 sm:px-6 py-2 bg-white/20 hover:bg-white/30 text-gray-800 backdrop-blur-sm text-sm font-semibold"
              icon={<LogOut className="w-4 h-4" />}
            >
              {t('admin.logout')}
            </Button>
          )}
        </div>
      </div>

      <Card className="mb-6 sm:mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-1">{t('admin.stats.author')}</p>
          <p className="text-lg font-semibold text-gray-800">{ownerDisplayName || '未知'}</p>
          <p className="text-sm text-gray-500">@{currentOwner?.username || 'unknown'}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-1">{t('admin.stats.role_label')}</p>
          <p className="text-lg font-semibold text-gray-800">
            {ownerRole === 'maintainer'
              ? t('admin.roles.maintainer')
              : ownerRole === 'admin'
                ? t('admin.roles.admin')
                : t('admin.roles.creator')}
          </p>
          {ownerEmail && <p className="text-sm text-gray-500">{ownerEmail}</p>}
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-1">{t('admin.stats.diary_count')}</p>
          <p className="text-lg font-semibold text-gray-800">{diaries.length}</p>
          <p className="text-sm text-gray-500">{t('admin.stats.current_list')}</p>
        </div>
      </Card>

      {storageInfo && (
        <Card className="mb-6 sm:mb-8 p-5 sm:p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">{t('admin.stats.storage')}</p>
              <div className="text-2xl font-bold text-gray-800">
                {formatBytes(storageInfo.used)} / {formatBytes(storageInfo.quota)}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('admin.stats.max_file')} {formatBytes(storageInfo.max)}</p>
            </div>
            {user?.role === 'maintainer' && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleRecalculateStorage}
                className="px-4 py-2 text-sm font-semibold"
                icon={<RefreshCcw className="w-4 h-4" />}
              >
                {t('admin.stats.recalc')}
              </Button>
            )}
          </div>
          <div className="mt-4">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((storageInfo.used / storageInfo.quota) * 100)
                  )}%`,
                }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>{t('admin.stats.used')} {formatBytes(storageInfo.used)}</span>
              <span>{t('admin.stats.remaining')} {formatBytes(Math.max(0, storageInfo.quota - storageInfo.used))}</span>
            </div>
          </div>
        </Card>
      )}

      {/* 创建/编辑表单 */}
      {(isCreating || editingId) && (
        <Card className="mb-6 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-800 mb-4 sm:mb-6 lg:mb-8">
            {editingId ? t('admin.edit_diary') : t('admin.new_diary')}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            <Input
              placeholder={t('admin.form.title')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-base sm:text-lg lg:text-xl font-medium"
            />

            {/* 日期时间选择 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('admin.form.created_at')}
              </label>
              <Input
                type="datetime-local"
                value={formData.createdAt}
                onChange={(e) => setFormData({ ...formData, createdAt: e.target.value })}
                className="text-base sm:text-lg"
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                {t('admin.form.created_at_hint')}
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
                {t('admin.form.pinned')}
              </label>
            </div>

            {/* 上锁选项 */}
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="isLocked"
                checked={formData.isLocked}
                onChange={(e) => setFormData({ ...formData, isLocked: e.target.checked })}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <label htmlFor="isLocked" className="text-sm font-semibold text-gray-700 cursor-pointer flex items-center space-x-2">
                <Lock className="w-4 h-4 text-purple-500" />
                <span>{t('admin.form.locked')}</span>
              </label>
            </div>

            {/* 封面图片 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {t('admin.form.cover_image')}
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
                    <p className="text-sm sm:text-base text-gray-600">{t('admin.form.upload_cover')}</p>
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
                  {t('admin.form.content_label')}
                </label>
                <button
                  type="button"
                  onClick={() => setShowImageModal(true)}
                  className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-xs sm:text-sm font-semibold w-full sm:w-auto"
                >
                  <ImageIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{t('admin.form.insert_image')}</span>
                </button>
              </div>
              <Textarea
                ref={contentTextareaRef}
                placeholder={t('admin.form.content_placeholder') + '\n\n' + t('admin.form.markdown_hint')}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={16}
                className="text-sm sm:text-base lg:text-lg leading-relaxed font-mono"
              />
              <p className="mt-2 text-xs sm:text-sm text-gray-500">
                {t('admin.form.markdown_hint')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button
                onClick={handleSave}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold"
                icon={<Save className="w-5 h-5 sm:w-6 sm:h-6" />}
              >
                {t('admin.form.save')}
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold"
                icon={<X className="w-5 h-5 sm:w-6 sm:h-6" />}
              >
                {t('admin.form.cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 日记列表 */}
      <div className="space-y-6">
        {diaries.length === 0 ? (
          <Card className="p-16 text-center shadow-2xl">
            <p className="text-gray-600 text-xl font-medium">{t('admin.messages.empty_list')}</p>
          </Card>
        ) : (
          diaries.map((diary) => (
            <Card
              key={diary.id}
              className="p-4 sm:p-6 lg:p-8 hover:shadow-3xl transition-all duration-300"
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
                        <span>{t('admin.form.pinned')}</span>
                      </span>
                    )}
                    {diary.is_locked && (
                      <span className="flex items-center space-x-1 text-xs sm:text-sm font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                        <Lock className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>{t('admin.collaboration.locked_hint').split('：')[0]}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm lg:text-base text-gray-500 mb-2 sm:mb-4 font-medium">{formatDate(diary.created_at)}</p>
                  <p className="text-gray-700 line-clamp-3 sm:line-clamp-4 text-sm sm:text-base lg:text-lg leading-relaxed break-words">{diary.content.replace(/\[img:[^\]]+\]/g, t('common.image')).replace(/#{1,6}\s/g, '').substring(0, 150)}...</p>
                  {renderCollaboratorBlocks(diary)}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-200">
                <Button
                  onClick={() => handleEdit(diary)}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 border-none text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3"
                  icon={<Edit className="w-4 h-4 sm:w-5 sm:h-5" />}
                >
                  {t('common.edit')}
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleDelete(diary.id!)}
                  className="text-sm sm:text-base px-4 sm:px-6 py-2.5 sm:py-3"
                  icon={<Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {isSelfDashboard && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{t('admin.collaboration.title')}</h2>
            <Button variant="outline" size="sm" onClick={loadCollaborations} icon={<RefreshCcw className="w-4 h-4" />}>
              {t('admin.collaboration.refresh')}
            </Button>
          </div>
          {collaborationLoading ? (
            <div className="flex items-center space-x-3 text-gray-500">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
              <span>{t('common.loading')}</span>
            </div>
          ) : collaborations.length === 0 ? (
            <Card variant="ghost" className="text-sm text-center border-dashed p-4">
              {t('admin.collaboration.empty')}
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {collaborations.map((diary) => (
                <Card
                  key={`collab-${diary.id}`}
                  className="p-4 shadow-sm"
                >
                  <p className="text-xs text-gray-500 mb-1">
                    {t('admin.collaboration.original_author')}：{diary.owner?.display_name || diary.owner?.username || t('common.unknown')}
                  </p>
                  <p className="text-lg font-semibold text-gray-800 line-clamp-2">{diary.title}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(diary.updated_at)}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                      {t('admin.collaboration.collaborating')}
                    </span>
                    {diary.permissions?.collaborationStatus === 'pending' && (
                      <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-semibold">
                        {t('admin.collaboration.pending_confirm')}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-sm text-gray-600 line-clamp-2 flex-1 mr-4">
                      {diary.content.replace(/\[img:[^\]]+\]/g, t('common.image')).substring(0, 80)}...
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(diary)}
                      className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2"
                      title={t('admin.edit_diary')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

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
              <h2 className="text-xl sm:text-2xl font-bold text-gray-800">{t('admin.set_greeting')}</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowGreetingModal(false)} className="p-2">
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </div>
            <div className="space-y-4 sm:space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('admin.greeting')}
                </label>
                <Textarea
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  rows={4}
                  placeholder={t('admin.greeting_placeholder')}
                  className="text-sm sm:text-base resize-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleSaveGreeting}
                  className="w-full sm:w-auto flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold"
                >
                  {t('common.save')}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setShowGreetingModal(false)}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base font-semibold"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
