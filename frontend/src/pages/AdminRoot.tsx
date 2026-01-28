import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import {
  UserPlus,
  UserCircle2,
  ShieldCheck,
  Edit,
  Trash2,
  RefreshCcw,
  Search,
  Loader2,
  LogOut,
  MessageSquare,
  Home,
  X,
  Save,
} from 'lucide-react';
import Admin from './Admin';
import { usersApi, AdminUserInfo, greetingApi } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

type UserFormState = {
  username: string;
  display_name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'maintainer';
  bio: string;
  max_upload_mb: string;
  storage_quota_mb: string;
};

const emptyForm: UserFormState = {
  username: '',
  display_name: '',
  email: '',
  password: '',
  role: 'user',
  bio: '',
  max_upload_mb: '10',
  storage_quota_mb: '200',
};

const mbToBytes = (value: string, fallbackMb: number) => {
  const parsed = Number(value);
  const safeMb = Number.isFinite(parsed) && parsed > 0 ? parsed : fallbackMb;
  return Math.round(safeMb * 1024 * 1024);
};

export default function AdminRoot() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isMaintainer = user?.role === 'maintainer';
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState<AdminUserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUserInfo | null>(null);
  const [formData, setFormData] = useState<UserFormState>(emptyForm);
  const [editingUser, setEditingUser] = useState<AdminUserInfo | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [greeting, setGreeting] = useState('');
  const [showGreetingModal, setShowGreetingModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    if (isMaintainer) {
      loadGreeting();
    }
  }, [isMaintainer]);

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

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersApi.getAll();
      setUsers(response.data);
      if (!selectedUser && response.data.length > 0) {
        setSelectedUser(response.data[0]);
      }
    } catch (error) {
      console.error('加载用户失败:', error);
      alert('加载用户失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    return users.filter((item) =>
      `${item.username}${item.display_name || ''}${item.email || ''}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [users, search]);

  const resetForm = () => {
    setFormData(emptyForm);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.email.trim()) {
      alert('用户名和邮箱不能为空');
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      alert('新用户密码至少 6 位');
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const payload: Record<string, unknown> = {
          username: formData.username,
          display_name: formData.display_name,
          email: formData.email,
          bio: formData.bio,
        };
        if (formData.password) {
          payload.password = formData.password;
        }
        if (isMaintainer) {
          payload.role = formData.role;
          payload.max_upload_size_bytes = mbToBytes(formData.max_upload_mb, 10);
          payload.storage_quota_bytes = mbToBytes(formData.storage_quota_mb, 200);
        }
        await usersApi.update(editingUser.id, payload);
      } else {
        if (!isMaintainer) {
          alert('只有维护者可以创建新用户');
          setSaving(false);
          return;
        }
        await usersApi.create({
          username: formData.username,
          display_name: formData.display_name,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          bio: formData.bio,
          max_upload_size_bytes: mbToBytes(formData.max_upload_mb, 10),
          storage_quota_bytes: mbToBytes(formData.storage_quota_mb, 200),
        });
      }
      await fetchUsers();
      resetForm();
    } catch (error: any) {
      console.error('保存用户失败:', error);
      alert(error?.response?.data?.error || '保存用户失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (userInfo: AdminUserInfo) => {
    setEditingUser(userInfo);
    setFormData({
      username: userInfo.username,
      display_name: userInfo.display_name || '',
      email: userInfo.email || '',
      password: '',
      role: userInfo.role || 'user',
      bio: userInfo.bio || '',
      max_upload_mb: Math.round(
        (userInfo.max_upload_size_bytes || 10 * 1024 * 1024) / (1024 * 1024)
      ).toString(),
      storage_quota_mb: Math.round(
        (userInfo.storage_quota_bytes || 200 * 1024 * 1024) / (1024 * 1024)
      ).toString(),
    });
  };

  const handleDelete = async (userInfo: AdminUserInfo) => {
    if (!confirm(`确定要删除用户 ${userInfo.username} 吗？该用户的日记也会被删除。`)) {
      return;
    }
    try {
      await usersApi.remove(userInfo.id);
      if (selectedUser?.id === userInfo.id) {
        setSelectedUser(null);
      }
      await fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      alert('删除用户失败，请稍后再试');
    }
  };

  const handleToggleStatus = async (userInfo: AdminUserInfo) => {
    const nextStatus = userInfo.status === 'banned' ? 'active' : 'banned';
    if (userInfo.id === user?.id) {
      alert('不能修改自己的状态');
      return;
    }
    if (
      userInfo.role === 'maintainer' &&
      user?.role !== 'maintainer'
    ) {
      alert('只有维护者可以操作其他维护者');
      return;
    }
    try {
      await usersApi.updateStatus(userInfo.id, nextStatus);
      await fetchUsers();
    } catch (error: any) {
      console.error('更新状态失败:', error);
      alert(error?.response?.data?.error || '更新状态失败');
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-2">
            {isMaintainer ? 'Maintainer Only' : 'Admin Console'}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800">
            {isMaintainer ? '全局管理中心' : '管理员管理台'}
          </h1>
          <p className="text-gray-500 mt-1">欢迎回来，{user?.display_name || user?.username}</p>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() => navigate('/admin')}
            className="px-3 sm:px-4 py-2 text-sm font-semibold"
            icon={<Home className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">个人中心</span>
          </Button>
          {isMaintainer && (
            <Button
              onClick={() => setShowGreetingModal(true)}
              className="px-3 sm:px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-xs sm:text-sm font-semibold"
              icon={<MessageSquare className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">设置问候语</span>
              <span className="sm:hidden">问候语</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={fetchUsers}
            className="px-3 sm:px-4 py-2 text-sm font-semibold text-green-600 border-gray-200"
            icon={<RefreshCcw className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">刷新列表</span>
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="px-3 sm:px-4 py-2 bg-white/20 hover:bg-white/30 border border-gray-200 backdrop-blur-sm text-sm font-semibold text-gray-800"
            icon={<LogOut className="w-4 h-4 text-rose-500" />}
          >
            退出
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="space-y-6 xl:col-span-1">
          <Card className="p-4 sm:p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <UserCircle2 className="w-5 h-5 text-purple-600" />
                <span>用户列表</span>
              </h2>
              <span className="text-xs text-gray-500">共 {users.length} 人</span>
            </div>
            <div className="mb-4">
              <Input
                placeholder="搜索用户名 / 邮箱"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search className="w-4 h-4" />}
                className="text-sm"
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span>正在加载用户...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">暂无匹配用户</p>
              ) : (
                filteredUsers.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 sm:p-4 transition-all duration-200 ${selectedUser?.id === item.id
                      ? 'border-purple-400 bg-purple-50 shadow'
                      : 'border-gray-200 hover:border-purple-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{item.display_name || item.username}</p>
                        <p className="text-xs text-gray-500">@{item.username}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {item.role === 'maintainer'
                            ? '维护者'
                            : item.role === 'admin'
                              ? '管理员'
                              : '创作者'}{' '}
                          · {item.diary_count || 0} 篇日记
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold mt-1 ${item.status === 'banned'
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-emerald-100 text-emerald-600'
                            }`}
                        >
                          {item.status === 'banned' ? '已封禁' : '正常'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedUser(item)}
                          className={selectedUser?.id === item.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}
                        >
                          管理
                        </Button>
                        {(isMaintainer || isAdmin) && (
                          <Button
                            size="sm"
                            onClick={() => handleToggleStatus(item)}
                            className={item.status === 'banned'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'}
                          >
                            {item.status === 'banned' ? '解封' : '封禁'}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-500 hover:text-purple-600"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className="p-4 sm:p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-green-600" />
                <span>{editingUser ? '编辑用户' : '创建新用户'}</span>
              </h2>
              {editingUser && (
                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs text-purple-600">
                  清空
                </Button>
              )}
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <Input
                placeholder="用户名"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="text-sm"
              />
              <Input
                placeholder="显示名称（可选）"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                className="text-sm"
              />
              <Input
                type="email"
                placeholder="邮箱"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="text-sm"
              />
              <Textarea
                placeholder="简介 / 备注"
                rows={2}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="text-sm resize-none"
              />
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserFormState['role'] })}
                disabled={!isMaintainer}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
                <option value="maintainer">维护者</option>
              </select>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="number"
                  min={1}
                  placeholder="单文件上限 (MB)"
                  value={formData.max_upload_mb}
                  onChange={(e) => setFormData({ ...formData, max_upload_mb: e.target.value })}
                  disabled={!isMaintainer}
                  className="text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="总容量 (MB)"
                  value={formData.storage_quota_mb}
                  onChange={(e) => setFormData({ ...formData, storage_quota_mb: e.target.value })}
                  disabled={!isMaintainer}
                  className="text-sm"
                />
              </div>
              <Input
                type="password"
                placeholder={editingUser ? '新密码（留空保持不变）' : '初始密码'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="text-sm"
              />
              <Button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm hover:shadow-lg transition"
                icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              >
                <span>{editingUser ? '保存用户' : '创建用户'}</span>
              </Button>
              {!isMaintainer && !editingUser && (
                <p className="text-xs text-gray-500 text-center">只有维护者可以创建新用户。</p>
              )}
            </form>
          </Card>
        </div>

        <div className="xl:col-span-2">
          {selectedUser ? (
            <Card className="shadow">
              <div className="border-b border-gray-100 p-4 sm:p-6 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-400 mb-1">当前用户</p>
                  <h2 className="text-2xl font-bold text-gray-800">{selectedUser.display_name || selectedUser.username}</h2>
                  <p className="text-sm text-gray-500">@{selectedUser.username}</p>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span>
                    <strong className="text-gray-700">{selectedUser.diary_count || 0}</strong> 篇日记 ·{' '}
                    {selectedUser.role === 'maintainer'
                      ? '维护者'
                      : selectedUser.role === 'admin'
                        ? '管理员'
                        : '创作者'}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${selectedUser.status === 'banned'
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-emerald-100 text-emerald-600'
                      }`}
                  >
                    {selectedUser.status === 'banned' ? '已封禁' : '正常'}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <Admin managedUser={selectedUser} allowOwnerOverride />
              </div>
            </Card>
          ) : (
            <Card variant="ghost" className="border-dashed p-10 text-center text-gray-500">
              <p className="text-lg font-semibold mb-2">请选择一个用户以管理 TA 的日记</p>
              <p className="text-sm">左侧列表中点击“管理”按钮即可加载对应用户的后台</p>
            </Card>
          )}
        </div>
      </div>

      {/* 问候语编辑弹窗 */}
      {showGreetingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden border border-gray-100 transform transition-all">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-800">设置首页问候语</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowGreetingModal(false)} className="p-2 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                这里的文字将显示在首页顶部，欢迎所有访问者。
              </p>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={6}
                placeholder="在此输入您的问候语..."
                className="text-lg leading-relaxed bg-gray-50/30"
              />
            </div>
            <div className="p-6 bg-gray-50/50 flex space-x-3">
              <Button
                onClick={handleSaveGreeting}
                className="flex-1 py-3.5 text-base font-bold shadow-lg"
                icon={<Save className="w-5 h-5" />}
              >
                确认发布
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowGreetingModal(false)}
                className="px-6 py-3.5 text-base font-semibold border-gray-200 text-gray-600"
              >
                取消
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
