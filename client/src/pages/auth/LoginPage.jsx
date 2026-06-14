import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Rocket, ArrowRight, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authAPI } from '../../services/api';
import { useAuthStore } from '../../store';

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login(data);
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageWrapper title="Welcome back" subtitle="Sign in to your DevPilot account">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <FormField label="Email Address" icon={<Mail size={16} />} error={errors.email?.message}>
          <input type="email" placeholder="you@example.com" className="input" style={{ paddingLeft: 40 }} {...register('email')} />
        </FormField>

        <FormField label="Password" icon={<Lock size={16} />} error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="Your password" className="input" style={{ paddingLeft: 40, paddingRight: 40 }} {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#6366f1', textDecoration: 'none' }}>Forgot password?</Link>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><ArrowRight size={18} /> Sign In</>}
        </button>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Create one free</Link>
        </p>
      </form>
    </AuthPageWrapper>
  );
}

// ─── Register Page ─────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords don't match", path: ['confirmPassword'] });

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.register({ name: data.name, email: data.email, password: data.password });
      setAuth(res.data.user, res.data.accessToken);
      toast.success(`Welcome to DevPilot AI, ${res.data.user.name}! 🚀`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageWrapper title="Create your account" subtitle="Join thousands of developers using DevPilot AI">
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <FormField label="Full Name" error={errors.name?.message}>
          <input type="text" placeholder="John Doe" className="input" {...register('name')} />
        </FormField>
        <FormField label="Email Address" error={errors.email?.message}>
          <input type="email" placeholder="you@example.com" className="input" {...register('email')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <input type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" className="input" style={{ paddingRight: 40 }} {...register('password')} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </FormField>
        <FormField label="Confirm Password" error={errors.confirmPassword?.message}>
          <input type="password" placeholder="Repeat password" className="input" {...register('confirmPassword')} />
        </FormField>

        <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <><Rocket size={18} /> Create Account</>}
        </button>

        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </form>
    </AuthPageWrapper>
  );
}

// ─── Shared Auth Wrapper ───────────────────────────────────────────────────────
export function AuthPageWrapper({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', top: '20%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '20%', right: '20%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: 440, position: 'relative' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 28 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}>
              <Rocket size={22} color="white" />
            </div>
            <span style={{ fontSize: '1.3rem', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DevPilot AI</span>
          </Link>
          <h1 style={{ color: '#f8fafc', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>{title}</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{subtitle}</p>
        </div>

        {/* Form card */}
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
          {children}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Form Field ────────────────────────────────────────────────────────────────
export function FormField({ label, icon, error, children }) {
  return (
    <div style={{ position: 'relative' }}>
      <label className="label">{label}</label>
      <div style={{ position: 'relative' }}>
        {icon && (
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none', zIndex: 1 }}>
            {icon}
          </div>
        )}
        {children}
      </div>
      {error && <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 4, display: 'block' }}>{error}</span>}
    </div>
  );
}
