import React from 'react';
import { AuthPageWrapper, FormField } from './LoginPage';
import { Mail, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';

const schema = z.object({ email: z.string().email('Valid email required') });

export default function ForgotPasswordPage() {
  const [sent, setSent] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email: data.email });
      setSent(true);
      toast.success('Password reset link sent!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageWrapper title="Reset your password" subtitle="We'll send you a reset link">
      {sent ? (
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>📧</div>
          <p style={{ color: '#94a3b8', marginBottom: 24 }}>Check your email for the reset link.</p>
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <FormField label="Email Address" icon={<Mail size={16} />} error={errors.email?.message}>
            <input type="email" placeholder="you@example.com" className="input" style={{ paddingLeft: 40 }} {...register('email')} />
          </FormField>
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Send Reset Link'}
          </button>
          <Link to="/login" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.9rem', textAlign: 'center', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
            <ArrowLeft size={14} /> Back to Sign In
          </Link>
        </form>
      )}
    </AuthPageWrapper>
  );
}
