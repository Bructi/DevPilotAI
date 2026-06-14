import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Rocket, Zap, Bot, BarChart3, Users, FileText, Kanban, Code2, ArrowRight,
  Play, MessageSquare, BrainCircuit, CheckCircle2, ShieldCheck, Sparkles, Star
} from 'lucide-react';

const AnimatedRobot = () => {
  return (
    <motion.div
      initial={{ y: 0 }}
      animate={{ y: [-15, 15, -15] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{ position: 'relative', width: '100%', maxWidth: 360, height: 420, margin: '0 auto', zIndex: 10 }}
    >
      {/* Robot Base SVG */}
      <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 20px 40px rgba(99,102,241,0.4))' }}>
        {/* Glow behind head */}
        <circle cx="200" cy="160" r="120" fill="url(#glow-grad)" opacity="0.5" />
        
        {/* Head */}
        <motion.path 
          d="M130 140 C130 100, 270 100, 270 140 L280 220 C280 260, 120 260, 130 220 Z" 
          fill="url(#head-grad)" stroke="#818cf8" strokeWidth="4" 
        />
        
        {/* Face plate */}
        <path d="M145 150 C145 130, 255 130, 255 150 L260 210 C260 230, 140 230, 145 210 Z" fill="#0a0a0f" />
        
        {/* Eyes (Animated) */}
        <motion.rect 
          x="165" y="165" width="25" height="15" rx="7.5" fill="#06b6d4"
          animate={{ height: [15, 2, 15], y: [165, 171, 165] }}
          transition={{ duration: 4, times: [0, 0.05, 0.1], repeat: Infinity, repeatDelay: 3 }}
        />
        <motion.rect 
          x="210" y="165" width="25" height="15" rx="7.5" fill="#06b6d4"
          animate={{ height: [15, 2, 15], y: [165, 171, 165] }}
          transition={{ duration: 4, times: [0, 0.05, 0.1], repeat: Infinity, repeatDelay: 3 }}
        />
        
        {/* Antenna */}
        <path d="M200 110 L200 70" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" />
        <motion.circle 
          cx="200" cy="65" r="12" fill="#06b6d4"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />

        {/* Neck */}
        <rect x="185" y="240" width="30" height="20" fill="#4f46e5" />
        
        {/* Body */}
        <path d="M110 280 C110 250, 290 250, 290 280 L310 380 C310 410, 90 410, 110 380 Z" fill="url(#head-grad)" stroke="#818cf8" strokeWidth="4" />
        
        {/* Core emblem */}
        <circle cx="200" cy="320" r="35" fill="#0a0a0f" stroke="#06b6d4" strokeWidth="3" />
        <motion.circle 
          cx="200" cy="320" r="20" fill="#06b6d4"
          animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />

        <defs>
          <linearGradient id="head-grad" x1="130" y1="100" x2="270" y2="260" gradientUnits="userSpaceOnUse">
            <stop stopColor="#312e81" />
            <stop offset="1" stopColor="#1e1b4b" />
          </linearGradient>
          <radialGradient id="glow-grad" cx="200" cy="160" r="120" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="1" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Floating UI Elements around the robot */}
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, delay: 0.5, repeat: Infinity }}
        style={{ position: 'absolute', top: '15%', left: '-5%', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '10px 15px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: '#10b981', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <CheckCircle2 size={16} /> Code Reviewed
      </motion.div>

      <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 3.5, delay: 1, repeat: Infinity }}
        style={{ position: 'absolute', bottom: '25%', right: '-5%', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', padding: '10px 15px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 600, color: '#8b5cf6', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
        <Zap size={16} /> Sprint Planned
      </motion.div>
    </motion.div>
  );
};

const laymanSteps = [
  { icon: MessageSquare, color: '#06b6d4', title: '1. Tell It What You Want', desc: 'No technical jargon required. Just describe your app or project idea in plain English to Dev Copilot.' },
  { icon: BrainCircuit, color: '#8b5cf6', title: '2. It Plans Everything', desc: 'Dev Copilot automatically creates your tasks, estimates timelines, and writes all the boring documentation for you.' },
  { icon: Rocket, color: '#10b981', title: '3. Watch It Build', desc: 'Invite your developers (or use it yourself). Dev Copilot tracks progress, reviews code, and ensures the project finishes on time.' }
];

const features = [
  { icon: Kanban, color: '#6366f1', title: 'Smart Kanban Board', desc: 'Drag-and-drop task management synced in real-time.' },
  { icon: Bot, color: '#8b5cf6', title: 'Dev Copilot Chat', desc: 'Your 24/7 AI manager. Ask it anything about your project.' },
  { icon: FileText, color: '#10b981', title: 'Auto Documentation', desc: 'Generates requirements and API docs instantly.' },
  { icon: Code2, color: '#f59e0b', title: 'AI Code Review', desc: 'Detect bugs and security issues automatically.' },
  { icon: Zap, color: '#ef4444', title: 'Agile Sprint Planner', desc: 'Organize backlog and launch sprints with AI-driven task estimation.' },
  { icon: BarChart3, color: '#ec4899', title: 'Advanced Analytics', desc: 'Visualize project velocity, burndown charts, and team productivity.' },
  { icon: Users, color: '#06b6d4', title: 'Team Collaboration', desc: 'Seamlessly invite developers, designers, and stakeholders to your workspace.' },
  { icon: ShieldCheck, color: '#14b8a6', title: 'Secure Access', desc: 'Role-based access control to keep your project data and code safe.' },
  { icon: Rocket, color: '#3b82f6', title: 'One-Click Deploy', desc: 'Integrate your CI/CD pipelines to deploy projects instantly with zero downtime.' },
];

const reviews = [
  { name: 'Sarah J.', role: 'Lead Developer at TechFlow', content: 'DevPilot AI completely transformed how we plan sprints. The auto-documentation feature alone saves us 10 hours a week.' },
  { name: 'Marcus T.', role: 'Startup Founder', content: 'I don\'t know how to code, but with Dev Copilot I built my MVP in 3 weeks. It managed the entire project for me.' },
  { name: 'Elena R.', role: 'Product Manager', content: 'The AI Code Review caught a critical security flaw before we pushed to production. Absolute lifesaver.' },
];

const faqs = [
  { q: 'Do I need to know how to code to use DevPilot AI?', a: 'Not at all! Dev Copilot is designed to understand plain English and manage the technical details for you.' },
  { q: 'Which AI models power DevPilot?', a: 'We use state-of-the-art AI models specifically tuned for software development to ensure fast, intelligent, and accurate responses.' },
  { q: 'Can I invite my team?', a: 'Yes! You can invite developers, designers, and stakeholders to collaborate in real-time on the Kanban board.' },
  { q: 'Is my project data secure?', a: 'Absolutely. We use role-based access control and secure encryption to ensure your code and ideas remain private.' },
];

const FadeIn = ({ children, delay = 0, ...props }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    {...props}
  >
    {children}
  </motion.div>
);

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{ background: '#0a0a0f', color: '#f8fafc', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ─── Navbar ─── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 5%',
        height: 68,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,15,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
            <Rocket size={18} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DevPilot AI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/login" className="hidden-mobile" style={{ padding: '8px 20px', borderRadius: 8, color: '#94a3b8', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 500 }}>
            Sign In
          </Link>
          <Link to="/register" style={{
            padding: '8px 20px', borderRadius: 8, textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
          }}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 5% 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Background Effects */}
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />

        <div className="flex-stack" style={{ maxWidth: 1200, width: '100%', display: 'flex', alignItems: 'center', gap: '40px', position: 'relative' }}>
          
          {/* Text Content */}
          <div style={{ flex: 1, zIndex: 2 }}>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', marginBottom: 24, fontSize: '0.8rem', fontWeight: 600, color: '#818cf8' }}>
                <Sparkles size={12} /> Meet Dev Copilot
              </div>
            </motion.div>

            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24 }}>
              Your Project Manager is now an{' '}
              <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                AI Robot.
              </span>
            </motion.h1>

            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: '#94a3b8', maxWidth: 540, marginBottom: 40, lineHeight: 1.7 }}>
              Don't know how to code? No problem. Describe your idea, and Dev Copilot will organize the tasks, plan the sprints, and review the code for you.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Link to="/register" style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
                borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
                boxShadow: '0 8px 30px rgba(99,102,241,0.4)', transition: 'all 0.2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(99,102,241,0.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(99,102,241,0.4)'; }}
              >
                Start for Free <ArrowRight size={16} />
              </Link>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 32px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f8fafc', borderRadius: 12, fontWeight: 600, fontSize: '1rem',
                cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(10px)',
              }}>
                <Play size={16} /> See How It Works
              </button>
            </motion.div>
          </div>

          {/* Animated Robot Graphic */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <AnimatedRobot />
          </div>

        </div>
      </section>

      {/* ─── Layman Section (How it works) ─── */}
      <section style={{ padding: '80px 5%', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(2rem, 3vw, 2.5rem)', fontWeight: 800, marginBottom: 16 }}>So simple, anyone can use it.</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: 600, margin: '0 auto' }}>
              Building software used to require teams of managers. Now, you just need Dev Copilot.
            </p>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 30 }}>
            {laymanSteps.map((step, i) => (
              <FadeIn key={step.title} delay={i * 0.2}>
                <div style={{
                  padding: '32px', borderRadius: 24,
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                  height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
                  transition: 'transform 0.3s',
                }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                >
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: `${step.color}1a`, border: `1px solid ${step.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
                    <step.icon size={32} style={{ color: step.color }} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 12 }}>{step.title}</h3>
                  <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{step.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Tech Features (For Pros) ─── */}
      <section style={{ padding: '100px 5%', maxWidth: 1200, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6366f1', letterSpacing: '0.1em', marginBottom: 12, textTransform: 'uppercase' }}>For Technical Teams</div>
          <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 16 }}>
            Powerful under the hood.
          </h2>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {features.map((feat, i) => (
            <FadeIn key={feat.title} delay={i * 0.1}>
              <div style={{
                padding: '24px', borderRadius: 16,
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                transition: 'all 0.3s'
              }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${feat.color}1a`, border: `1px solid ${feat.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <feat.icon size={22} style={{ color: feat.color }} />
                </div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: '1rem' }}>{feat.title}</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 }}>{feat.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section style={{ padding: '80px 5%', background: 'rgba(255,255,255,0.015)', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800, marginBottom: 16 }}>Loved by teams worldwide</h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem' }}>Don't just take our word for it.</p>
          </FadeIn>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 30 }}>
            {reviews.map((rev, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div style={{ padding: '32px', borderRadius: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                    {[1,2,3,4,5].map(star => <Star key={star} size={16} fill="#fbbf24" color="#fbbf24" />)}
                  </div>
                  <p style={{ color: '#e2e8f0', fontSize: '1rem', lineHeight: 1.7, fontStyle: 'italic', flex: 1 }}>"{rev.content}"</p>
                  <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16 }}>
                    <div style={{ fontWeight: 700, color: '#f8fafc' }}>{rev.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{rev.role}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FAQs ─── */}
      <section style={{ padding: '100px 5%', maxWidth: 800, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 800 }}>Frequently Asked Questions</h2>
        </FadeIn>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {faqs.map((faq, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <details style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '20px 24px', cursor: 'pointer' }}>
                <summary style={{ fontWeight: 600, fontSize: '1.05rem', color: '#f8fafc', listStyle: 'none', display: 'flex', justifyContent: 'space-between', outline: 'none' }}>
                  {faq.q}
                  <span style={{ color: '#6366f1', fontWeight: 800 }}>+</span>
                </summary>
                <p style={{ marginTop: 16, color: '#94a3b8', lineHeight: 1.6, fontSize: '0.95rem' }}>
                  {faq.a}
                </p>
              </details>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section style={{ padding: '80px 5%', textAlign: 'center' }}>
        <FadeIn>
          <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 5%', borderRadius: 24, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))', border: '1px solid rgba(99,102,241,0.25)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)', filter: 'blur(30px)' }} />
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 16 }}>Ready to ship faster?</h2>
            <p style={{ color: '#94a3b8', marginBottom: 32, fontSize: '1.05rem' }}>Join the future of software development with Dev Copilot.</p>
            <Link to="/register" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 36px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white',
              borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: '1rem',
              boxShadow: '0 8px 30px rgba(99,102,241,0.4)',
            }}>
              Start Building Now <ArrowRight size={16} />
            </Link>
          </div>
        </FadeIn>
      </section>

      {/* ─── Footer ─── */}
      <footer style={{ padding: '40px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Rocket size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>DevPilot AI</span>
        </div>
        <p style={{ color: '#475569', fontSize: '0.85rem' }}>© 2025 DevPilot AI. Built with ❤️ by Dev Copilot.</p>
      </footer>
    </div>
  );
}
