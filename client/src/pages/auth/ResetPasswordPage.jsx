import React from 'react';
import { AuthPageWrapper, FormField } from './LoginPage';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';

const schema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error('Invalid or missing reset token.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, newPassword: data.password });
      toast.success('Password reset successfully! Please log in.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPageWrapper title="Invalid Token" subtitle="No reset token provided.">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Please use the link sent to your email.</p>
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      </AuthPageWrapper>
    );
  }

  return (
    <AuthPageWrapper title="Create New Password" subtitle="Enter your new password below.">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <FormField label="New Password" icon={<Lock size={16} />} error={errors.password?.message}>
          <input type="password" placeholder="••••••••" className="input" style={{ paddingLeft: 40 }} {...register('password')} />
        </FormField>
        <FormField label="Confirm Password" icon={<Lock size={16} />} error={errors.confirmPassword?.message}>
          <input type="password" placeholder="••••••••" className="input" style={{ paddingLeft: 40 }} {...register('confirmPassword')} />
        </FormField>
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : 'Reset Password'}
        </button>
      </form>
    </AuthPageWrapper>
  );
}
