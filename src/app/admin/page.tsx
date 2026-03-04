'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, ClipboardCheck, Calendar, ArrowRight, Clock, Sparkles, TrendingUp, BookOpen, Building2, Upload, Activity } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    const [stats, setStats] = useState({ totalStudents: 0, activeFaculty: 0, pendingApprovals: 0, totalSections: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/data?table=stats').then(r => r.json()).then(data => { setStats(data); setLoading(false); });
    }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;

    const cards = [
        { label: 'Total Students', value: stats.totalStudents, icon: Users, color: '#6366f1', gradient: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))' },
        { label: 'Active Faculty', value: stats.activeFaculty, icon: GraduationCap, color: '#8b5cf6', gradient: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' },
        { label: 'Pending Approvals', value: stats.pendingApprovals, icon: ClipboardCheck, color: '#f59e0b', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))' },
        { label: 'Total Sections', value: stats.totalSections, icon: Calendar, color: '#14b8a6', gradient: 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(20,184,166,0.05))' },
    ];

    const quickActions = [
        { label: 'Generate Timetable', desc: 'Create optimized schedules', href: '/admin/timetable', icon: Sparkles, color: '#6366f1' },
        { label: 'View Timetables', desc: 'Browse generated schedules', href: '/admin/timetables', icon: BookOpen, color: '#22c55e' },
        { label: 'Data Import', desc: 'Bulk upload CSV data', href: '/admin/data-import', icon: Upload, color: '#14b8a6' },
        { label: 'Manage Rooms', desc: 'Classrooms & labs', href: '/admin/rooms', icon: Building2, color: '#8b5cf6' },
        { label: 'Generation Logs', desc: 'Audit generation history', href: '/admin/logs', icon: Activity, color: '#f43f5e' },
        { label: 'Faculty Approvals', desc: 'Review pending requests', href: '/admin/approvals', icon: ClipboardCheck, color: '#f59e0b' },
    ];

    const now = new Date();
    const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div>
            {/* Welcome Banner */}
            <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                    padding: '28px 32px', borderRadius: 20, marginBottom: 28,
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(20,184,166,0.06) 100%)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    position: 'relative', overflow: 'hidden',
                }}
            >
                <div style={{ position: 'absolute', top: -30, right: -30, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)' }} />
                <div style={{ position: 'absolute', bottom: -40, right: 100, width: 150, height: 150, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>
                        <Clock size={14} />
                        <span>{now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
                        {greeting} 👋
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.6 }}>
                        Welcome to OptiSchedule — your intelligent timetable management system
                    </p>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 32 }}>
                {cards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, type: 'spring', stiffness: 200 }}
                        style={{
                            padding: '24px 22px', borderRadius: 18,
                            background: card.gradient,
                            border: `1px solid ${card.color}20`,
                            cursor: 'default',
                            transition: 'all 0.3s ease',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${card.color}15`; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = `${card.color}20`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{card.label}</p>
                                <p style={{ fontSize: 36, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>{card.value}</p>
                            </div>
                            <div style={{
                                width: 48, height: 48, borderRadius: 14,
                                background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: `1px solid ${card.color}20`,
                            }}>
                                <card.icon size={22} color={card.color} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, color: '#64748b', fontSize: 12 }}>
                            <TrendingUp size={12} />
                            <span>Current count</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Quick Actions */}
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 14 }}>Quick Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {quickActions.map((action, i) => (
                    <motion.div key={action.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.08 }}>
                        <Link href={action.href} style={{ textDecoration: 'none' }}>
                            <div style={{
                                padding: '20px 22px', borderRadius: 16,
                                background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(99,102,241,0.1)',
                                cursor: 'pointer', transition: 'all 0.3s ease',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = `${action.color}40`; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.background = `${action.color}08`; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.1)'; e.currentTarget.style.transform = 'translateX(0)'; e.currentTarget.style.background = 'rgba(15,23,42,0.5)'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 12, background: `${action.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${action.color}20` }}>
                                        <action.icon size={20} color={action.color} />
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{action.label}</p>
                                        <p style={{ fontSize: 12, color: '#64748b' }}>{action.desc}</p>
                                    </div>
                                </div>
                                <ArrowRight size={16} color="#64748b" />
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
