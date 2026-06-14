import axios from 'axios';
import { useAuthStore } from '../store';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 120000,
});

// Request interceptor — attach token
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor — handle token refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && error.response?.data?.code === 'TOKEN_EXPIRED' && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        useAuthStore.getState().setToken(data.accessToken);
        processQueue(null, data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ─── API Services ─────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
};

export const teamAPI = {
  getAll: () => api.get('/teams'),
  create: (data) => api.post('/teams', data),
  getMembers: (teamId) => api.get(`/teams/${teamId}/members`),
  addMember: (teamId, data) => api.post(`/teams/${teamId}/members`, data),
};

export const projectAPI = {
  getAll: (params) => api.get('/projects', { params }),
  getOne: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  getStats: (id) => api.get(`/projects/${id}/stats`),
  getMembers: (id) => api.get(`/projects/${id}/members`),
  addMember: (id, data) => api.post(`/projects/${id}/members`, data),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
  getActivity: (id) => api.get(`/projects/${id}/activity`),
};

export const taskAPI = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/tasks`, { params }),
  getBoard: (projectId) => api.get(`/projects/${projectId}/tasks/board`),
  create: (projectId, data) => api.post(`/projects/${projectId}/tasks`, data),
  update: (projectId, taskId, data) => api.put(`/projects/${projectId}/tasks/${taskId}`, data),
  move: (projectId, taskId, data) => api.patch(`/projects/${projectId}/tasks/${taskId}/move`, data),
  delete: (projectId, taskId) => api.delete(`/projects/${projectId}/tasks/${taskId}`),
  addComment: (projectId, taskId, data) => api.post(`/projects/${projectId}/tasks/${taskId}/comments`, data),
};

export const sprintAPI = {
  getAll: (projectId) => api.get(`/sprints/${projectId}`),
  create: (projectId, data) => api.post(`/sprints/${projectId}`, data),
  update: (projectId, sprintId, data) => api.put(`/sprints/${projectId}/${sprintId}`, data),
};

export const chatAPI = {
  getMessages: (projectId, params) => api.get(`/chat/${projectId}`, { params }),
  sendMessage: (projectId, data) => api.post(`/chat/${projectId}`, data),
};

export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  readAll: () => api.patch('/notifications/read-all'),
  read: (id) => api.patch(`/notifications/${id}/read`),
};

export const userAPI = {
  search: (q) => api.get('/users/search', { params: { q } }),
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  // GitHub Integration
  connectGithub: (pat) => api.post('/users/integrations/github', { pat }),
  getGithubData: () => api.get('/users/integrations/github'),
  getGithubRepos: () => api.get('/users/integrations/github/repos'),
  disconnectGithub: () => api.delete('/users/integrations/github'),
  // Jira Integration
  connectJira: (data) => api.post('/users/integrations/jira', data),
  getJiraData: () => api.get('/users/integrations/jira'),
  getJiraProjects: () => api.get('/users/integrations/jira/projects'),
  disconnectJira: () => api.delete('/users/integrations/jira'),
};

export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),
  getBurndown: (projectId) => api.get(`/analytics/project/${projectId}/burndown`),
};

export const aiAPI = {
  chat: (messages, project_context = null, context_type = 'general', project_id = null, conversation_id = null) =>
    api.post('/ai/chat', { messages, project_context, context_type, project_id, conversation_id }),
  getConversations: (projectId) => api.get(`/ai/conversations/${projectId}`),
  planSprint: (data) => api.post('/ai/sprint/plan', data),
  generateDocument: (data) => api.post('/ai/documents/generate', data),
  getDocuments: (projectId) => api.get(`/ai/documents/${projectId}`),
  deleteDocument: (id) => api.delete(`/ai/documents/${id}`),
  breakdownTask: (data) => api.post('/ai/tasks/breakdown', data),
  reviewCode: (data) => api.post('/ai/code/review', data),
  health: () => api.get('/ai/health'),
};

