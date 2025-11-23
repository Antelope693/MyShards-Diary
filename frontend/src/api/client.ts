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
    config.headers.Authorization = token;
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

export interface Diary {
  id: number;
  title: string;
  content: string;
  cover_image?: string;
  images?: string[];
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  diary_id: number;
  author: string;
  content: string;
  reply_to?: number;
  reply_to_author?: string;
  created_at: string;
}

export const diaryApi = {
  getAll: () => client.get<Diary[]>('/diaries'),
  getById: (id: number) => client.get<Diary>(`/diaries/${id}`),
  create: (title: string, content: string, coverImage?: string, createdAt?: string, isPinned?: boolean) =>
    client.post<Diary>('/diaries', { title, content, cover_image: coverImage, created_at: createdAt, is_pinned: isPinned }),
  update: (id: number, title: string, content: string, coverImage?: string, createdAt?: string, isPinned?: boolean) =>
    client.put<Diary>(`/diaries/${id}`, { title, content, cover_image: coverImage, created_at: createdAt, is_pinned: isPinned }),
  delete: (id: number) => client.delete(`/diaries/${id}`),
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
  getByDiaryId: (diaryId: number) =>
    client.get<Comment[]>(`/comments/diary/${diaryId}`),
  create: (diaryId: number, author: string, content: string, replyTo?: number) =>
    client.post<Comment>('/comments', {
      diary_id: diaryId,
      author,
      content,
      reply_to: replyTo,
    }),
  delete: (id: number) => client.delete(`/comments/${id}`),
};

export const authApi = {
  login: (password: string) =>
    client.post<{ success: boolean; message: string; token: string }>('/auth/login', { password }),
  verify: () =>
    client.get<{ authenticated: boolean }>('/auth/verify'),
};

export const greetingApi = {
  get: () => client.get<{ id: number; content: string; updated_at: string }>('/greeting'),
  update: (content: string) =>
    client.put<{ id: number; content: string; updated_at: string }>('/greeting', { content }),
};

export default client;

