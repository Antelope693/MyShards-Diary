import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加认证token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    if (config.headers.set) {
      config.headers.set('Authorization', finalToken);
    } else {
      config.headers.Authorization = finalToken;
    }
  }
  return config;
});

// 响应拦截器：处理401错误
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // 如果是管理页面，重定向到登录
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export interface DiaryOwner {
  username: string;
  display_name?: string;
}

export interface DiaryEditorSummary {
  user_id: number;
  username: string;
  display_name?: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  approved_at?: string;
  created_at?: string;
}

export interface DiaryPermissions {
  canEdit: boolean;
  isOwner: boolean;
  isMaintainer?: boolean;
  isAdmin?: boolean;
  collaborationStatus: 'owner' | 'staff' | 'approved' | 'pending' | 'rejected' | 'revoked' | 'none';
}

export interface Diary {
  id: number;
  user_id?: number;
  title: string;
  content: string;
  cover_image?: string;
  images?: string[];
  is_pinned?: boolean;
  is_locked?: boolean;
  created_at: string;
  updated_at: string;
  owner?: DiaryOwner;
  editors?: DiaryEditorSummary[];
  pending_editors?: DiaryEditorSummary[];
  permissions?: DiaryPermissions;
  collection_id?: number;
}

export interface Collection {
  id: number;
  title: string;
  description?: string;
  cover_image?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  diary_count?: number;
  username?: string;
  display_name?: string;
  diaries?: Diary[];
}

export interface Comment {
  id: number;
  diary_id: number;
  author: string;
  display_name?: string;
  author_username?: string;
  content: string;
  reply_to?: number;
  reply_to_author?: string;
  created_at: string;
}

export interface AuthUser {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  role: 'user' | 'admin' | 'maintainer';
  status: 'active' | 'banned';
}

type DiaryOwnerOptions = {
  userId?: number;
  username?: string;
};

export const diaryApi = {
  getAll: (username?: string) =>
    client.get<Diary[]>('/diaries', {
      params: username ? { user: username } : undefined,
    }),
  getById: (id: number) => client.get<Diary>(`/diaries/${id}`),
  getCollaborations: () => client.get<Diary[]>('/diaries/collaborations/mine'),
  create: (
    title: string,
    content: string,
    coverImage?: string,
    createdAt?: string,
    isPinned?: boolean,
    isLocked?: boolean,
    ownerOptions?: DiaryOwnerOptions,
    collectionId?: number
  ) =>
    client.post<Diary>('/diaries', {
      title,
      content,
      cover_image: coverImage,
      created_at: createdAt,
      is_pinned: isPinned,
      is_locked: isLocked,
      user_id: ownerOptions?.userId,
      username: ownerOptions?.username,
      collection_id: collectionId,
    }),
  update: (
    id: number,
    title: string,
    content: string,
    coverImage?: string,
    createdAt?: string,
    isPinned?: boolean,
    isLocked?: boolean,
    collectionId?: number
  ) =>
    client.put<Diary>(`/diaries/${id}`, {
      title,
      content,
      cover_image: coverImage,
      created_at: createdAt,
      is_pinned: isPinned,
      is_locked: isLocked,
      collection_id: collectionId,
    }),
  delete: (id: number) => client.delete(`/diaries/${id}`),
  requestEdit: (id: number) => client.post(`/diaries/${id}/collaborators`),
  updateCollaborator: (diaryId: number, editorId: number, action: 'approve' | 'reject' | 'revoke') =>
    client.patch(`/diaries/${diaryId}/collaborators/${editorId}`, { action }),
};

export const uploadApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return client.post<{ url: string; filename: string }>('/upload/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return client.post<{ urls: string[]; filenames: string[] }>('/upload/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export const commentApi = {
  getByDiaryId: (diaryId: number) => client.get<Comment[]>(`/comments/diary/${diaryId}`),
  create: (diaryId: number, content: string, replyTo?: number) =>
    client.post<Comment>('/comments', {
      diary_id: diaryId,
      content,
      reply_to: replyTo,
    }),
  delete: (id: number) => client.delete(`/comments/${id}`),
};

export const authApi = {
  register: (username: string, email: string, password: string) =>
    client.post<{ user: AuthUser; token: string }>('/auth/register', { username, email, password }),
  login: (emailOrUsername: string, password: string) =>
    client.post<{ user: AuthUser; token: string }>('/auth/login', { emailOrUsername, password }),
  me: () => client.get<{ user: AuthUser }>('/auth/me'),
  verify: () => client.get<{ authenticated: boolean; user: AuthUser }>('/auth/verify'),
};

export const greetingApi = {
  get: () => client.get<{ id: number; content: string; updated_at: string }>('/greeting'),
  update: (content: string) =>
    client.put<{ id: number; content: string; updated_at: string }>('/greeting', { content }),
};

export interface GlobalLink {
  id?: string;
  name: string;
  url: string;
  description?: string;
  region?: string | null;
  contact?: string | null;
  username?: string;
  diary_count?: number;
  latest_diary_at?: string;
}

export const globalLinksApi = {
  getAll: () =>
    client.get<{ links: GlobalLink[]; submissionEnabled?: boolean; source?: string; lastSyncedAt?: string }>(
      '/global-links'
    ),
};

export interface AdminUserInfo {
  id: number;
  username: string;
  display_name?: string;
  email: string;
  role: 'user' | 'admin' | 'maintainer';
  status: 'active' | 'banned';
  bio?: string;
  max_upload_size_bytes: number;
  storage_quota_bytes: number;
  used_storage_bytes: number;
  diary_count: number;
}

export const usersApi = {
  getMe: () => client.get<{ id: number; username: string; display_name: string; role: string }>('/auth/me'),
  getPublicList: () => client.get('/users/public/list'),
  getProfile: (username: string) => client.get(`/users/public/profile/${username}`),
  getAll: () => client.get<AdminUserInfo[]>('/users'),
  create: (payload: {
    username: string;
    email: string;
    password: string;
    role?: 'user' | 'admin' | 'maintainer';
    display_name?: string;
    bio?: string;
    max_upload_size_bytes?: number;
    storage_quota_bytes?: number;
  }) => client.post('/users', payload),
  update: (
    id: number,
    payload: Partial<{
      username: string;
      email: string;
      role: 'user' | 'admin' | 'maintainer';
      display_name: string;
      bio: string;
      password: string;
      max_upload_size_bytes: number;
      storage_quota_bytes: number;
      used_storage_bytes: number;
    }>
  ) => client.put(`/users/${id}`, payload),
  remove: (id: number) => client.delete(`/users/${id}`),
  exportUser: (username: string) => client.get(`/users/export/${username}`),
  recalcStorage: (userId: number) => client.post<{ used_storage_bytes: number }>(`/users/${userId}/recalculate-storage`),
  updateStatus: (userId: number, status: 'active' | 'banned') =>
    client.patch<{ id: number; status: 'active' | 'banned' }>(`/users/${userId}/status`, { status }),
  getMyLimits: () =>
    client.get<{ max_upload_size_bytes: number; storage_quota_bytes: number; used_storage_bytes: number }>(
      '/users/me/limits'
    ),
  checkFollowStatus: (userId: number) => client.get<{ isFollowing: boolean }>(`/users/${userId}/follow-status`),
  follow: (userId: number) => client.post<{ isFollowing: boolean }>(`/users/${userId}/follow`),
  unfollow: (userId: number) => client.delete<{ isFollowing: boolean }>(`/users/${userId}/follow`),
  pinUser: (userId: number, isPinned: boolean) => client.post(`/users/${userId}/pin`, { is_pinned: isPinned }),
  getFollowing: (username: string) => client.get<any[]>(`/users/${username}/following`),
  getFollowers: (username: string) => client.get<any[]>(`/users/${username}/followers`),
};

export const reportsApi = {
  create: (targetType: 'diary' | 'user' | 'comment', targetId: number, reason: string) =>
    client.post('/reports', { target_type: targetType, target_id: targetId, reason }),
};

export interface Notification {
  id: number;
  user_id: number;
  type: string;
  content: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export const notificationsApi = {
  getAll: () => client.get<Notification[]>('/notifications'),
  getUnreadCount: () => client.get<{ count: number }>('/notifications/unread-count'),
  markAsRead: (id: number) => client.put(`/notifications/${id}/read`),
  markAllAsRead: () => client.put('/notifications/read-all'),
};

export const collectionsApi = {
  getAll: (username?: string) => client.get<Collection[]>('/collections', { params: { user: username } }),
  getById: (id: number) => client.get<Collection>(`/collections/${id}`),
  create: (title: string, description?: string, coverImage?: string) => client.post<Collection>('/collections', { title, description, cover_image: coverImage }),
  update: (id: number, title: string, description?: string, coverImage?: string) => client.put<Collection>(`/collections/${id}`, { title, description, cover_image: coverImage }),
  delete: (id: number) => client.delete(`/collections/${id}`),
};

export const collectsApi = {
  checkStatus: (diaryId: number) => client.get<{ isCollected: boolean }>(`/collects/${diaryId}/collect-status`),
  collect: (diaryId: number) => client.post<{ isCollected: boolean }>(`/collects/${diaryId}/collect`),
  uncollect: (diaryId: number) => client.delete<{ isCollected: boolean }>(`/collects/${diaryId}/collect`),
  getList: (username: string) => client.get<Diary[]>(`/collects/list/${username}`),
};

export const recommendationsApi = {
  get: (type: 'random' | 'newest' | 'hot' = 'random') => client.get<Diary[]>(`/recommendations`, { params: { type } }),
};

export interface Issue {
  id: number;
  user_id: number;
  username?: string;
  display_name?: string;
  title: string;
  content: string;
  reply_content?: string;
  status: 'open' | 'replied' | 'closed';
  created_at: string;
  updated_at: string;
}

export const issuesApi = {
  getAll: () => client.get<Issue[]>('/issues'),
  create: (title: string, content: string) => client.post<Issue>('/issues', { title, content }),
  reply: (id: number, reply_content: string) => client.post(`/issues/${id}/reply`, { reply_content }),
};

export default client;

