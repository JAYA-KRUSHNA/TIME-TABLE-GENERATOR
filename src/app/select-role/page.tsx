'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';
import { useState } from 'react';
import AnimatedGridBackground from '@/components/landing/AnimatedGridBackground';
import GlowingOrb from '@/components/landing/GlowingOrb';

const roles = [
    {
        id: 'student',
        title: 'Student Portal',
        description: 'Access your timetable, view faculty info, and manage your academic schedule.',
        icon: GraduationCap,
        href: '/auth/student/login',
        gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
        shadowColor: 'rgba(99,102,241,0.3)',
        borderColor: 'rgba(99,102,241,0.25)',
    },
    {
        id: 'faculty',
        title: 'Faculty Portal',
        description: 'View your teaching schedule, manage classes, and communicate with students.',
        icon: BookOpen,
        href: '/auth/faculty/login',
        gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
        shadowColor: 'rgba(139,92,246,0.3)',
        borderColor: 'rgba(139,92,246,0.25)',
    },
    {
        id: 'admin',
        title: 'Admin Portal',
        description: 'Configure schedules, manage users, and generate conflict-free timetables.',
        icon: Shield,
        href: '/auth/admin/login',
        gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
        shadowColor: 'rgba(236,72,153,0.3)',
        borderColor: 'rgba(236,72,153,0.25)',
    },
];

function TiltCard3D({
    children,
}: {
    children: React.ReactNode;
}) {
    const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0) translateZ(0)');
    const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -10;
        const rotateY = ((x - centerX) / centerX) * 10;
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(30px)`);
        setGlowPos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0) rotateY(0) translateZ(0)');
        setGlowPos({ x: 50, y: 50 });
    };

    return (
        <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform,
                transition: 'transform 0.15s ease-out',
                transformStyle: 'preserve-3d',
                position: 'relative',
            }}
        >
            {/* Dynamic glow that follows cursor */}
            <div
                style={{
                    position: 'absolute',
                    inset: -1,
                    borderRadius: 22,
                    background: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(99,102,241,0.15) 0%, transparent 60%)`,
                    pointerEvents: 'none',
                    opacity: transform.includes('translateZ(30px)') ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    zIndex: 0,
                }}
            />
            {children}
        </div>
    );
}

export default function SelectRolePage() {
    const router = useRouter();

    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'linear-gradient(180deg, #030712 0%, #0a0f1e 30%, #0f172a 60%, #1e1b4b 100%)',
                padding: '40px 20px',
                overflow: 'hidden',
            }}
        >
            <AnimatedGridBackground />
            <GlowingOrb color="rgba(99, 102, 241, 0.1)" size={400} top="20%" left="70%" delay={0} />
            <GlowingOrb color="rgba(139, 92, 246, 0.07)" size={350} top="60%" left="10%" delay={2} />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100 }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30, rotateX: -10 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 0.7 }}
                    style={{ textAlign: 'center', marginBottom: 60 }}
                >
                    {/* Logo */}
                    <motion.div
                        initial={{ scale: 0, rotateY: -180 }}
                        animate={{ scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.8, ease: [0.175, 0.885, 0.32, 1.275] }}
                        style={{
                            width: 56,
                            height: 56,
                            borderRadius: 16,
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            boxShadow: '0 0 40px rgba(99,102,241,0.3)',
                        }}
                    >
                        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </motion.div>

                    <h1
                        style={{
                            fontSize: 'clamp(28px, 5vw, 44px)',
                            fontWeight: 700,
                            marginBottom: 12,
                            letterSpacing: '-0.5px',
                        }}
                    >
                        <span className="text-shimmer">Welcome to OptiSchedule</span>
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: 'clamp(14px, 2vw, 17px)' }}>
                        Select your role to continue
                    </p>
                </motion.div>

                {/* Role Cards */}
                <div
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 32,
                        maxWidth: 1000,
                        margin: '0 auto',
                        perspective: '1200px',
                    }}
                >
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 50, rotateY: -30, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, rotateY: 0, scale: 1 }}
                            transition={{
                                duration: 0.7,
                                delay: 0.2 + index * 0.15,
                                ease: [0.175, 0.885, 0.32, 1.275],
                            }}
                            style={{ transformStyle: 'preserve-3d' }}
                        >
                            <TiltCard3D>
                                <div
                                    className="role-card-shine"
                                    onClick={() => router.push(role.href)}
                                    style={{
                                        padding: '44px 32px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        borderRadius: 22,
                                        background: 'rgba(15, 23, 42, 0.5)',
                                        backdropFilter: 'blur(16px)',
                                        WebkitBackdropFilter: 'blur(16px)',
                                        border: '1px solid rgba(99, 102, 241, 0.12)',
                                        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        transformStyle: 'preserve-3d',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.borderColor = role.borderColor;
                                        e.currentTarget.style.boxShadow = `0 25px 60px rgba(0,0,0,0.3), 0 0 40px ${role.shadowColor}`;
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.12)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    {/* Top glow */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: -60,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 250,
                                            height: 250,
                                            background: role.gradient,
                                            opacity: 0.06,
                                            borderRadius: '50%',
                                            filter: 'blur(60px)',
                                        }}
                                    />

                                    {/* Icon */}
                                    <motion.div
                                        whileHover={{ scale: 1.08, rotateY: 10 }}
                                        transition={{ type: 'spring', stiffness: 300 }}
                                        style={{
                                            width: 76,
                                            height: 76,
                                            borderRadius: '22px',
                                            background: role.gradient,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 24px',
                                            boxShadow: `0 12px 35px ${role.shadowColor}`,
                                            position: 'relative',
                                            transform: 'translateZ(20px)',
                                        }}
                                    >
                                        <role.icon size={34} color="white" />
                                    </motion.div>

                                    {/* Title */}
                                    <h3
                                        style={{
                                            fontSize: 23,
                                            fontWeight: 700,
                                            color: '#f1f5f9',
                                            marginBottom: 12,
                                            transform: 'translateZ(15px)',
                                        }}
                                    >
                                        {role.title}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        style={{
                                            fontSize: 14,
                                            color: '#94a3b8',
                                            lineHeight: 1.7,
                                            marginBottom: 28,
                                            transform: 'translateZ(10px)',
                                        }}
                                    >
                                        {role.description}
                                    </p>

                                    {/* Enter button */}
                                    <motion.div
                                        whileHover={{ x: 4 }}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            color: '#818cf8',
                                            fontSize: 15,
                                            fontWeight: 600,
                                            transform: 'translateZ(10px)',
                                        }}
                                    >
                                        Enter Portal
                                        <svg
                                            width="18"
                                            height="18"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </motion.div>
                                </div>
                            </TiltCard3D>
                        </motion.div>
                    ))}
                </div>

                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    style={{ textAlign: 'center', marginTop: 44 }}
                >
                    <motion.button
                        whileHover={{ x: -4 }}
                        onClick={() => router.push('/')}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#64748b',
                            fontSize: 14,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontFamily: "'Inter', sans-serif",
                            transition: 'color 0.2s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#94a3b8'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; }}
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Back to Home
                    </motion.button>
                </motion.div>
            </div>
        </motion.div>
    );
}
