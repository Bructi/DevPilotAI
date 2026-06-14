import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { notificationAPI } from '../services/api';
import { useNotificationStore } from '../store';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const typeColors = {
  task_assigned: '#6366f1', mention: '#8b5cf6', deadline: '#ef4444',
  sprint_start: '#10b981', comment: '#06b6d4', system: '#94a3b8',
};

export default function NotificationsPage() {
  const { markAllRead } = useNotificationStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationAPI.getAll({ limit: 50 }).then(r => r.data),
  });

  const readAllMutation = useMutation({
    mutationFn: notificationAPI.readAll,
    onSuccess: () => { markAllRead(); queryClient.invalidateQueries(['notifications']); toast.success('All notifications marked as read'); },
  });

  const notifications = data?.notifications || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{data?.unread_count || 0} unread notifications</p>
        </div>
        {data?.unread_count > 0 && (
          <button onClick={() => readAllMutation.mutate()} className="btn btn-secondary btn-sm" style={{ gap: 6 }}>
            <CheckCheck size={13} /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 14 }} />)}
        </div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <Bell size={48} style={{ color: 'var(--border-color-light)', margin: '0 auto 16px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>No notifications</h3>
          <p>You're all caught up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map((notif, i) => {
            const color = typeColors[notif.type] || '#64748b';
            return (
              <motion.div key={notif._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div style={{ display: 'flex', gap: 14, padding: '16px 20px', background: notif.is_read ? 'var(--bg-glass)' : 'rgba(99,102,241,0.08)', border: `1px solid ${notif.is_read ? 'var(--border-color)' : 'rgba(99,102,241,0.2)'}`, borderRadius: 14, transition: 'all 0.2s' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: notif.is_read ? 'transparent' : color, border: `2px solid ${color}`, marginTop: 6, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem', marginBottom: 3 }}>{notif.title}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginBottom: 6 }}>{notif.message}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(notif.createdAt), 'MMM d, h:mm a')}</div>
                  </div>
                  {!notif.is_read && (
                    <button onClick={() => notificationAPI.read(notif._id)} className="btn btn-ghost btn-icon" style={{ color: '#6366f1', padding: 6, flexShrink: 0 }} title="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
