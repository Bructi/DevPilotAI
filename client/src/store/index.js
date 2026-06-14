import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Auth Store ───────────────────────────────────────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setUser: (user) => set({ user }),
      setToken: (accessToken) => set({ accessToken }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'devpilot-auth',
      partialize: (state) => ({ user: state.user, accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// ─── UI Store ─────────────────────────────────────────────────────────────────
export const useUIStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarCollapsed: false,
      sidebarOpen: false, // mobile

      setTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        set({ theme });
      },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'devpilot-ui' }
  )
);

// ─── Notification Store ───────────────────────────────────────────────────────
export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) => set({ notifications }),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  addNotification: (notif) => set((s) => ({
    notifications: [notif, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  markRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n._id === id ? { ...n, is_read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, is_read: true })),
    unreadCount: 0,
  })),
}));

// ─── Project Store ────────────────────────────────────────────────────────────
export const useProjectStore = create((set) => ({
  currentProject: null,
  projects: [],

  setCurrentProject: (project) => set({ currentProject: project }),
  setProjects: (projects) => set({ projects }),
  updateProject: (updatedProject) => set((s) => ({
    projects: s.projects.map(p => p._id === updatedProject._id ? updatedProject : p),
    currentProject: s.currentProject?._id === updatedProject._id ? updatedProject : s.currentProject,
  })),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
}));
