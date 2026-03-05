'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AnimatedGridBackground from '@/components/landing/AnimatedGridBackground';
import GlowingOrb from '@/components/landing/GlowingOrb';
import OrbitalRings from '@/components/landing/OrbitalRings';
import Typewriter from '@/components/landing/Typewriter';
import { Zap, Shield, BarChart3, Layers, ArrowRight, Clock, Cpu } from 'lucide-react';

/*
 * REVEAL SEQUENCE (cinematic — each phase waits for previous):
 *  Phase 0 → 1: Grid fades in, then logo flips in          (0–2s)
 *  Phase 1 → 2: Logo done, typewriter starts                (2–5s)
 *  Phase 2 → 3: Typewriter done, subtitle blur-reveals      (5–6.5s)
 *  Phase 3 → 4: Subtitle done, feature pills appear         (6.5–7.5s)
 *  Phase 4 → 5: Pills done, CTA + features stagger in      (7.5–9s)
 */

export default function LandingPage() {
  const router = useRouter();
  const heroRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0 });

  // Kick off phase 1 once on mount
  useEffect(() => {
    const t = setTimeout(() => setPhase(1), 1200);
    return () => clearTimeout(t);
  }, []);

  const advancePhase = useCallback((next: number, delayMs: number) => {
    setTimeout(() => setPhase(p => (p < next ? next : p)), delayMs);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
    const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    setTiltStyle({ rotateX: y * -3, rotateY: x * 3 });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTiltStyle({ rotateX: 0, rotateY: 0 });
  }, []);

  const handleGetStarted = () => {
    setIsExiting(true);
    setTimeout(() => router.push('/select-role'), 600);
  };

  const highlights = [
    { icon: Shield, label: 'Conflict-Free Scheduling' },
    { icon: Cpu, label: 'AI-Powered Generation' },
    { icon: Clock, label: 'Real-Time Updates' },
    { icon: Layers, label: 'Multi-Section Support' },
  ];

  const features = [
    { icon: Zap, title: 'Instant Generation', desc: 'Create conflict-free timetables for all sections in seconds', color: '#f59e0b' },
    { icon: Shield, title: 'Zero Conflicts', desc: 'Scored CSP algorithm ensures no faculty or room clashes', color: '#22c55e' },
    { icon: BarChart3, title: 'Smart Analytics', desc: 'Real-time occupancy tracking and resource utilization', color: '#6366f1' },
    { icon: Layers, title: 'Multi-Section', desc: 'Handle multiple years, sections, and departments at once', color: '#ec4899' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={isExiting
        ? { opacity: 0, scale: 0.95, filter: 'blur(8px)' }
        : { opacity: 1 }
      }
      transition={isExiting
        ? { duration: 0.5, ease: 'easeInOut' }
        : { duration: 1.5, ease: 'easeOut' }
      }
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: 'linear-gradient(180deg, #020617 0%, #0a0f1e 30%, #0f172a 60%, #1e1b4b 100%)',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Grid background — fades in first */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      >
        <AnimatedGridBackground />
      </motion.div>

      {/* Ambient orbs — fade in once typewriter starts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 4, ease: 'easeOut' }}
      >
        <GlowingOrb color="rgba(99, 102, 241, 0.12)" size={500} top="15%" left="60%" delay={0} />
        <GlowingOrb color="rgba(139, 92, 246, 0.08)" size={400} top="60%" left="15%" delay={3} />
        <GlowingOrb color="rgba(236, 72, 153, 0.05)" size={300} top="70%" left="75%" delay={6} />
      </motion.div>

      {/* 3D Parallax Container */}
      <div
        ref={heroRef}
        style={{
          position: 'relative',
          zIndex: 10,
          textAlign: 'center',
          padding: '0 24px',
          maxWidth: 1000,
          width: '100%',
          perspective: '1200px',
        }}
      >
        <motion.div
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.15s ease-out',
            transform: `perspective(1200px) rotateX(${tiltStyle.rotateX}deg) rotateY(${tiltStyle.rotateY}deg)`,
          }}
        >
          {/* ──── PHASE 1: Logo ──── */}
          <AnimatePresence>
            {phase >= 1 && (
              <motion.div
                initial={{ scale: 0, opacity: 0, rotateY: -180 }}
                animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                transition={{ duration: 1.4, ease: [0.175, 0.885, 0.32, 1.275] }}
                onAnimationComplete={() => advancePhase(2, 500)}
                style={{
                  position: 'relative',
                  width: 120,
                  height: 120,
                  margin: '0 auto 48px',
                }}
              >
                <OrbitalRings size={220} />
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%) translateZ(30px)',
                    width: 90,
                    height: 90,
                    borderRadius: '24px',
                    background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 60px rgba(99,102,241,0.4), 0 0 120px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ──── PHASE 2: Slow Typewriter Title ──── */}
          <AnimatePresence>
            {phase >= 2 && (
              <motion.h1
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                style={{
                  fontSize: 'clamp(48px, 10vw, 86px)',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  marginBottom: 22,
                  letterSpacing: '-2px',
                  transform: 'translateZ(20px)',
                }}
              >
                <span className="text-shimmer">
                  <Typewriter
                    text="OptiSchedule"
                    speed={140}
                    delay={300}
                    onComplete={() => advancePhase(3, 700)}
                  />
                </span>
              </motion.h1>
            )}
          </AnimatePresence>

          {/* ──── PHASE 3: Subtitle + Description ──── */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 25, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: 1, ease: 'easeOut' }}
                onAnimationComplete={() => advancePhase(4, 800)}
                style={{ transform: 'translateZ(15px)' }}
              >
                <p
                  style={{
                    fontSize: 'clamp(17px, 3vw, 24px)',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: 16,
                    background: 'linear-gradient(90deg, #818cf8, #c084fc, #818cf8)',
                    backgroundSize: '200% 100%',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    animation: 'shimmer 3s ease-in-out infinite',
                  }}
                >
                  AI-Powered Academic Timetable Generator
                </p>
                <p style={{
                  fontSize: 'clamp(13px, 2vw, 16px)',
                  color: '#64748b',
                  maxWidth: 560,
                  margin: '0 auto',
                  lineHeight: 1.7,
                }}>
                  Generate conflict-free, optimized schedules for your entire institution
                  in seconds — powered by advanced constraint satisfaction algorithms.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ──── PHASE 4: Highlight Pills (no percentages) ──── */}
          <AnimatePresence>
            {phase >= 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
                onAnimationComplete={() => advancePhase(5, 600)}
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 14,
                  marginTop: 40,
                  transform: 'translateZ(10px)',
                  flexWrap: 'wrap',
                }}
              >
                {highlights.map((h, i) => (
                  <motion.div
                    key={h.label}
                    initial={{ opacity: 0, y: 20, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      delay: i * 0.13,
                      duration: 0.6,
                      ease: [0.175, 0.885, 0.32, 1.275],
                    }}
                    className="stat-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 20px',
                      minWidth: 'auto',
                    }}
                  >
                    <h.icon size={16} color="#818cf8" />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#cbd5e1', letterSpacing: '0.2px' }}>{h.label}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ──── PHASE 5: CTA + Feature Cards ──── */}
          <AnimatePresence>
            {phase >= 5 && (
              <>
                {/* Get Started Button */}
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.7,
                    ease: [0.175, 0.885, 0.32, 1.275],
                  }}
                  style={{ marginTop: 40, transform: 'translateZ(25px)' }}
                >
                  <button
                    className="btn-glow"
                    onClick={handleGetStarted}
                    style={{
                      fontSize: 'clamp(16px, 2vw, 19px)',
                      letterSpacing: '0.3px',
                      padding: '18px 56px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                  >
                    Get Started
                    <ArrowRight size={20} />
                  </button>
                </motion.div>

                {/* Feature Cards */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: 16,
                    marginTop: 50,
                    transform: 'translateZ(5px)',
                  }}
                >
                  {features.map((f, i) => (
                    <motion.div
                      key={f.title}
                      initial={{ opacity: 0, y: 40, rotateX: -15 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{
                        delay: 0.5 + i * 0.15,
                        duration: 0.7,
                        ease: [0.175, 0.885, 0.32, 1.275],
                      }}
                      className="card-3d"
                      style={{
                        padding: '24px 18px',
                        borderRadius: 18,
                        textAlign: 'center',
                        background: 'rgba(15,23,42,0.5)',
                        border: '1px solid rgba(99,102,241,0.1)',
                        backdropFilter: 'blur(12px)',
                        cursor: 'default',
                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        transformStyle: 'preserve-3d',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = `${f.color}40`;
                        e.currentTarget.style.transform = 'translateY(-8px) translateZ(20px)';
                        e.currentTarget.style.boxShadow = `0 20px 50px rgba(0,0,0,0.3), 0 0 30px ${f.color}15`;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(99,102,241,0.1)';
                        e.currentTarget.style.transform = 'translateY(0) translateZ(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 14, margin: '0 auto 14px',
                        background: `linear-gradient(135deg, ${f.color}15, ${f.color}08)`,
                        border: `1px solid ${f.color}25`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: 'translateZ(10px)',
                      }}>
                        <f.icon size={22} color={f.color} />
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 6, transform: 'translateZ(5px)' }}>{f.title}</p>
                      <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>{f.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <AnimatePresence>
        {phase >= 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.25 }}
            transition={{ delay: 1.5, duration: 1 }}
            style={{ position: 'absolute', bottom: 28, zIndex: 10 }}
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
