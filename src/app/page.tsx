'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ParticleField from '@/components/landing/ParticleField';
import Typewriter from '@/components/landing/Typewriter';

export default function LandingPage() {
  const router = useRouter();
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);

  const features = [
    { icon: '🧠', title: 'AI-Powered', desc: 'Scored CSP algorithm with conflict-free optimization' },
    { icon: '🏫', title: 'Room Management', desc: 'Smart allocation for classrooms and labs' },
    { icon: '⚡', title: 'Instant Generation', desc: 'Generate timetables for all classes in seconds' },
    { icon: '📊', title: 'Real-time Insights', desc: 'Occupancy tracking and resource analytics' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(180deg, #030712 0%, #0f172a 40%, #1e1b4b 100%)',
        overflow: 'hidden',
      }}
    >
      <ParticleField />

      {/* Ambient glow effects */}
      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Floating shapes */}
      <motion.div
        style={{ position: 'absolute', top: '15%', left: '10%', width: 100, height: 100, borderRadius: '24px', border: '1px solid rgba(99,102,241,0.15)', transform: 'rotate(45deg)' }}
        animate={{ y: [0, -20, 0], rotate: [45, 50, 45], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{ position: 'absolute', bottom: '20%', right: '12%', width: 70, height: 70, borderRadius: '50%', border: '1px solid rgba(129,140,248,0.12)' }}
        animate={{ y: [0, 15, 0], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <motion.div
        style={{ position: 'absolute', top: '30%', right: '20%', width: 50, height: 50, border: '1px solid rgba(99,102,241,0.1)', transform: 'rotate(30deg)' }}
        animate={{ y: [0, -12, 0], rotate: [30, 35, 30], opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
      {/* Extra floating elements */}
      <motion.div
        style={{ position: 'absolute', top: '60%', left: '8%', width: 30, height: 30, borderRadius: 8, border: '1px solid rgba(99,102,241,0.08)' }}
        animate={{ y: [0, 10, 0], rotate: [0, 15, 0], opacity: [0.1, 0.25, 0.1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
      />
      <motion.div
        style={{ position: 'absolute', top: '10%', right: '8%', width: 40, height: 40, borderRadius: '50%', background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.08)' }}
        animate={{ y: [0, -8, 0], scale: [1, 1.1, 1], opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 4 }}
      />

      {/* Main content */}
      <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', padding: '0 20px', maxWidth: 900 }}>
        {/* Logo */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            width: 88, height: 88, margin: '0 auto 36px', borderRadius: '24px',
            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 60px rgba(99,102,241,0.3), 0 0 120px rgba(99,102,241,0.1)',
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
          </svg>
        </motion.div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(42px, 8vw, 76px)', fontWeight: 800, background: 'linear-gradient(135deg, #e2e8f0 0%, #fff 50%, #c7d2fe 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.1, marginBottom: 16, letterSpacing: '-1px' }}>
          <Typewriter
            text="OptiSchedule"
            speed={90}
            delay={800}
            onComplete={() => { setTimeout(() => setShowSubtitle(true), 300); }}
          />
        </h1>

        {/* Subtitle */}
        <AnimatePresence>
          {showSubtitle && (
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: 'easeOut' }}
              onAnimationComplete={() => setTimeout(() => { setShowButton(true); setTimeout(() => setShowFeatures(true), 600); }, 400)}
            >
              <p style={{ fontSize: 'clamp(16px, 3vw, 22px)', color: '#94a3b8', fontWeight: 400, letterSpacing: '0.5px', marginBottom: 12 }}>
                AI Powered Academic Timetable Generator
              </p>
              <p style={{ fontSize: 'clamp(13px, 2vw, 15px)', color: '#475569', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.6 }}>
                Generate conflict-free, optimized timetables for your entire institution in seconds — powered by advanced constraint satisfaction algorithms.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA Button */}
        <AnimatePresence>
          {showButton && (
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
              <button className="btn-glow" onClick={() => router.push('/select-role')} style={{ fontSize: 'clamp(16px, 2vw, 18px)', letterSpacing: '0.3px' }}>
                Get Started →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Feature Cards */}
        <AnimatePresence>
          {showFeatures && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginTop: 60 }}
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  style={{
                    padding: '20px 16px', borderRadius: 16, textAlign: 'center',
                    background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)',
                    backdropFilter: 'blur(8px)',
                    cursor: 'default', transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <span style={{ fontSize: 28, display: 'block', marginBottom: 10 }}>{f.icon}</span>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{f.title}</p>
                  <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scroll Indicator */}
        <AnimatePresence>
          {showButton && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 1.5, duration: 1 }} style={{ marginTop: 40 }}>
              <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
