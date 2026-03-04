'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { GraduationCap, BookOpen, Shield } from 'lucide-react';
import { useState } from 'react';
import ParticleField from '@/components/landing/ParticleField';

const roles = [
    {
        id: 'student',
        title: 'Student Portal',
        description: 'Access your timetable, view faculty info, and manage your academic schedule.',
        icon: GraduationCap,
        href: '/auth/student/login',
        gradient: 'linear-gradient(135deg, #6366f1, #818cf8)',
    },
    {
        id: 'faculty',
        title: 'Faculty Portal',
        description: 'View your teaching schedule, manage classes, and communicate with students.',
        icon: BookOpen,
        href: '/auth/faculty/login',
        gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    },
    {
        id: 'admin',
        title: 'Admin Portal',
        description: 'Configure schedules, manage users, and generate conflict-free timetables.',
        icon: Shield,
        href: '/auth/admin/login',
        gradient: 'linear-gradient(135deg, #ec4899, #f472b6)',
    },
];

function TiltCard({
    children,
    className = '',
}: {
    children: React.ReactNode;
    className?: string;
}) {
    const [transform, setTransform] = useState('perspective(1000px) rotateX(0) rotateY(0)');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;
        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0) rotateY(0)');
    };

    return (
        <div
            className={className}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                transform,
                transition: 'transform 0.15s ease-out',
                transformStyle: 'preserve-3d',
            }}
        >
            {children}
        </div>
    );
}

export default function SelectRolePage() {
    const router = useRouter();

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)',
                padding: '40px 20px',
            }}
        >
            <ParticleField />

            <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 1100 }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    style={{ textAlign: 'center', marginBottom: 60 }}
                >
                    <h1
                        style={{
                            fontSize: 'clamp(28px, 5vw, 42px)',
                            fontWeight: 700,
                            background: 'linear-gradient(135deg, #e2e8f0, #fff)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: 12,
                        }}
                    >
                        Welcome to OptiSchedule
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
                    }}
                >
                    {roles.map((role, index) => (
                        <motion.div
                            key={role.id}
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: index * 0.15 }}
                        >
                            <TiltCard>
                                <div
                                    className="glass-card"
                                    onClick={() => router.push(role.href)}
                                    style={{
                                        padding: '40px 32px',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {/* Glow effect */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: -50,
                                            left: '50%',
                                            transform: 'translateX(-50%)',
                                            width: 200,
                                            height: 200,
                                            background: role.gradient,
                                            opacity: 0.06,
                                            borderRadius: '50%',
                                            filter: 'blur(60px)',
                                        }}
                                    />

                                    {/* Icon */}
                                    <div
                                        style={{
                                            width: 72,
                                            height: 72,
                                            borderRadius: '20px',
                                            background: role.gradient,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 24px',
                                            boxShadow: `0 8px 30px ${role.gradient.includes('6366f1') ? 'rgba(99,102,241,0.3)' : role.gradient.includes('8b5cf6') ? 'rgba(139,92,246,0.3)' : 'rgba(236,72,153,0.3)'}`,
                                            position: 'relative',
                                        }}
                                    >
                                        <role.icon size={32} color="white" />
                                    </div>

                                    {/* Title */}
                                    <h3
                                        style={{
                                            fontSize: 22,
                                            fontWeight: 600,
                                            color: '#f1f5f9',
                                            marginBottom: 12,
                                        }}
                                    >
                                        {role.title}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        style={{
                                            fontSize: 14,
                                            color: '#94a3b8',
                                            lineHeight: 1.6,
                                            marginBottom: 24,
                                        }}
                                    >
                                        {role.description}
                                    </p>

                                    {/* Enter button */}
                                    <div
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            color: '#818cf8',
                                            fontSize: 14,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Enter Portal
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
                                            <polyline points="9 18 15 12 9 6" />
                                        </svg>
                                    </div>
                                </div>
                            </TiltCard>
                        </motion.div>
                    ))}
                </div>

                {/* Back link */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    style={{ textAlign: 'center', marginTop: 40 }}
                >
                    <button
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
                        }}
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
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
