'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Calendar, Users, MessageCircle, User, Download, Send, ChevronLeft, Clock, BookOpen, Beaker, LogOut } from 'lucide-react';

interface Profile { id: string; role: string; name: string; email: string; reg_no?: string; year?: number; section?: string; department?: string; }
interface TimetableEntry { day: string; period: number; subject_name: string; subject_type: string; room_name?: string; lab_name?: string; faculty_name?: string; }
interface FacultyMember { id: string; name: string; email: string; department: string; }
interface ConvoItem { id: string; other_name: string; other_id: string; last_message?: string; unread: boolean; }
interface MsgItem { id: string; content: string; sender_id: string; sender_name: string; created_at: string; }
interface NotifItem { id: string; type: string; title: string; body: string; read_status: number; created_at: string; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SCHEDULE = [
    { type: 'period' as const, period: 1, time: '9:00 - 9:50' },
    { type: 'period' as const, period: 2, time: '9:50 - 10:40' },
    { type: 'break' as const, label: 'Short Break', time: '10:40 - 11:00', icon: '☕' },
    { type: 'period' as const, period: 3, time: '11:00 - 11:50' },
    { type: 'period' as const, period: 4, time: '11:50 - 12:40' },
    { type: 'break' as const, label: 'Lunch Break', time: '12:40 - 1:50', icon: '🍽️' },
    { type: 'period' as const, period: 5, time: '1:50 - 2:40' },
    { type: 'period' as const, period: 6, time: '2:40 - 3:30' },
    { type: 'period' as const, period: 7, time: '3:30 - 4:20' },
];

const CELL_COLORS = {
    theory: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
    lab: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#86efac' },
    free: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)', text: '#fde68a' },
    empty: { bg: 'transparent', border: 'rgba(99,102,241,0.04)', text: '#334155' },
};

const tabs = [
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'notifications', label: 'Notices', icon: BookOpen },
    { id: 'faculty', label: 'Faculty', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'profile', label: 'Profile', icon: User },
];

export default function StudentDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('timetable');
    const [profile, setProfile] = useState<Profile | null>(null);
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [faculty, setFaculty] = useState<FacultyMember[]>([]);
    const [convos, setConvos] = useState<ConvoItem[]>([]);
    const [messages, setMessages] = useState<MsgItem[]>([]);
    const [activeConvo, setActiveConvo] = useState<ConvoItem | null>(null);
    const [msgInput, setMsgInput] = useState('');
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState<NotifItem[]>([]);

    useEffect(() => {
        async function safeJson(res: Response, fallback: unknown = []) {
            try { if (!res.ok) return fallback; const t = await res.text(); return t ? JSON.parse(t) : fallback; }
            catch { return fallback; }
        }
        async function load() {
            const [pRes, ttRes, fRes, cRes, nRes] = await Promise.all([
                fetch('/api/data?table=profile'), fetch('/api/data?table=my-timetable'),
                fetch('/api/data?table=faculty'), fetch('/api/data?table=conversations'),
                fetch('/api/data?table=notifications'),
            ]);
            setProfile(await safeJson(pRes, null)); setTimetable(await safeJson(ttRes));
            setFaculty(await safeJson(fRes)); setConvos(await safeJson(cRes));
            setNotifications(await safeJson(nRes));
            setLoading(false);
        }
        load();
    }, []);

    const getCell = (day: string, period: number) => timetable.find(t => t.day === day && t.period === period);
    const getCellType = (cell?: TimetableEntry): keyof typeof CELL_COLORS => {
        if (!cell) return 'empty';
        if (cell.lab_name || cell.subject_type === 'lab') return 'lab';
        if (cell.subject_type === 'free') return 'free';
        return 'theory';
    };

    const exportCSV = () => {
        let csv = 'Period,Time,' + DAYS.join(',') + '\n';
        SCHEDULE.filter(s => s.type === 'period').forEach(s => {
            csv += `P${s.period},${s.time},`;
            DAYS.forEach((d, i) => { const c = getCell(d, s.period!); csv += (c ? c.subject_name : '-') + (i < DAYS.length - 1 ? ',' : ''); });
            csv += '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `timetable_${profile?.reg_no || 'student'}.csv`; a.click();
    };

    const exportPDF = () => { window.print(); };

    const openConvo = async (convo: ConvoItem) => {
        setActiveConvo(convo);
        const res = await fetch(`/api/data?table=messages&conversation_id=${convo.id}`);
        setMessages(await res.json());
    };

    const sendMessage = async () => {
        if (!msgInput.trim() || !activeConvo) return;
        await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send-message', conversation_id: activeConvo.id, content: msgInput.trim() }) });
        setMsgInput('');
        const res = await fetch(`/api/data?table=messages&conversation_id=${activeConvo.id}`);
        setMessages(await res.json());
    };

    const startConvo = async (facultyId: string) => {
        const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-conversation', other_id: facultyId }) });
        const data = await res.json();
        const fac = faculty.find(f => f.id === facultyId);
        setActiveConvo({ id: data.id, other_name: fac?.name || 'Faculty', other_id: facultyId, unread: false });
        setMessages([]);
        setActiveTab('messages');
    };

    const handleLogout = async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { } router.push('/select-role'); };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#030712' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;

    const theoryCount = timetable.filter(e => e.subject_type === 'theory').length;
    const labCount = timetable.filter(e => e.lab_name || e.subject_type === 'lab').length;
    const freeCount = timetable.filter(e => e.subject_type === 'free').length;

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 12, marginBottom: 4 }}>
                            <Clock size={12} />
                            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>Welcome back, {profile?.name} 👋</h1>
                        <p style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                            {profile?.reg_no} · Year {profile?.year} · Section {profile?.section} · {profile?.department}
                        </p>
                    </div>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: 13, cursor: 'pointer' }}>
                        <LogOut size={14} />Logout
                    </motion.button>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.06)', width: 'fit-content' }}>
                    {tabs.map(tab => (
                        <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== 'messages') setActiveConvo(null); }} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none',
                            background: activeTab === tab.id ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))' : 'transparent',
                            color: activeTab === tab.id ? '#a5b4fc' : '#64748b', fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 13, cursor: 'pointer',
                            transition: 'all 0.2s ease',
                        }}><tab.icon size={15} />{tab.label}
                            {tab.id === 'messages' && convos.some(c => c.unread) && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1' }} />}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'timetable' && (
                        <motion.div key="tt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Stats + Export */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <div style={{ display: 'flex', gap: 14 }}>
                                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} />
                                        Theory ({theoryCount})
                                    </span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#22c55e', display: 'inline-block' }} />
                                        Lab ({labCount})
                                    </span>
                                    <span style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 8, height: 8, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} />
                                        Activity ({freeCount})
                                    </span>
                                </div>
                                <button onClick={exportCSV} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} />CSV</span>
                                </button>
                                <button onClick={exportPDF} style={{ padding: '8px 16px', fontSize: 13, borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.06)', color: '#a5b4fc', cursor: 'pointer' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Download size={14} />PDF</span>
                                </button>
                            </div>

                            {timetable.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                    <Calendar size={32} color="#475569" style={{ marginBottom: 12 }} />
                                    <p style={{ color: '#475569', fontSize: 14 }}>No timetable generated for your class yet</p>
                                </div>
                            ) : (
                                <div style={{ borderRadius: 18, overflow: 'auto', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.1)', boxShadow: '0 4px 30px rgba(0,0,0,0.2)' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                                                <th style={{ padding: '14px 12px', fontSize: 11, color: '#64748b', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', width: 90, borderBottom: '1px solid rgba(99,102,241,0.08)' }}>Time</th>
                                                {DAYS.map((d, i) => (
                                                    <th key={d} style={{ padding: '14px 8px', fontSize: 12, color: '#94a3b8', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid rgba(99,102,241,0.08)' }}>
                                                        <span style={{ display: 'block' }}>{d}</span>
                                                        <span style={{ display: 'block', fontSize: 10, color: '#475569', marginTop: 2 }}>{DAY_SHORT[i]}</span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {SCHEDULE.map((row, idx) => {
                                                if (row.type === 'break') {
                                                    return (
                                                        <tr key={`break-${idx}`}>
                                                            <td colSpan={7} style={{
                                                                padding: '8px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#fbbf24',
                                                                background: 'linear-gradient(90deg, rgba(251,191,36,0.03), rgba(251,191,36,0.06), rgba(251,191,36,0.03))',
                                                                borderTop: '1px dashed rgba(251,191,36,0.15)', borderBottom: '1px dashed rgba(251,191,36,0.15)',
                                                            }}>{row.icon} {row.label} <span style={{ color: '#92400e', fontWeight: 400 }}>({row.time})</span></td>
                                                        </tr>
                                                    );
                                                }
                                                const p = row.period!;
                                                return (
                                                    <tr key={p} style={{ borderBottom: '1px solid rgba(99,102,241,0.04)' }}>
                                                        <td style={{ padding: '8px 12px', fontSize: 11, fontWeight: 500, background: 'rgba(99,102,241,0.03)' }}>
                                                            <div style={{ color: '#94a3b8', fontWeight: 600 }}>P{p}</div>
                                                            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>{row.time}</div>
                                                        </td>
                                                        {DAYS.map(d => {
                                                            const cell = getCell(d, p);
                                                            const type = getCellType(cell);
                                                            const colors = CELL_COLORS[type];
                                                            return (
                                                                <td key={d} style={{ padding: '4px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                                                                    {cell ? (
                                                                        <div style={{
                                                                            padding: '7px 5px', borderRadius: 8, minHeight: 42,
                                                                            background: colors.bg, border: `1px solid ${colors.border}`,
                                                                            transition: 'all 0.2s ease',
                                                                        }}
                                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 4px 15px ${colors.border}`; }}
                                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                                                                        >
                                                                            <p style={{ fontSize: 11, fontWeight: 600, color: colors.text, lineHeight: 1.3 }}>{cell.subject_name}</p>
                                                                            {(cell.room_name || cell.lab_name) && <p style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{cell.lab_name ? `🔬 ${cell.lab_name}` : `📍 ${cell.room_name}`}</p>}
                                                                            {cell.faculty_name && <p style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>👤 {cell.faculty_name}</p>}
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ minHeight: 42, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                            <span style={{ color: '#1e293b', fontSize: 14 }}>·</span>
                                                                        </div>
                                                                    )}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'notifications' && (
                        <motion.div key="notifs" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{notifications.length} notification(s)</p>
                            {notifications.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 60, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                    <BookOpen size={32} color="#475569" style={{ marginBottom: 12 }} />
                                    <p style={{ color: '#475569', fontSize: 14 }}>No notifications yet</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gap: 10 }}>
                                    {notifications.map((n, i) => (
                                        <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                                            style={{
                                                padding: '18px 22px', borderRadius: 14,
                                                background: n.read_status ? 'rgba(15,23,42,0.3)' : 'rgba(99,102,241,0.06)',
                                                border: `1px solid ${n.read_status ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.15)'}`,
                                            }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    {!n.read_status && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />}
                                                    <h4 style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{n.title}</h4>
                                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: n.type === 'broadcast' ? 'rgba(245,158,11,0.1)' : 'rgba(99,102,241,0.1)', color: n.type === 'broadcast' ? '#fbbf24' : '#818cf8' }}>{n.type === 'broadcast' ? '📢 Broadcast' : n.type}</span>
                                                </div>
                                                <span style={{ fontSize: 11, color: '#475569', whiteSpace: 'nowrap' }}>{new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{n.body}</p>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'faculty' && (
                        <motion.div key="fac" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>{faculty.length} faculty members in your department</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                                {faculty.map((f, i) => (
                                    <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                        style={{
                                            padding: 20, borderRadius: 16, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontWeight: 700, fontSize: 16, border: '1px solid rgba(99,102,241,0.15)' }}>{f.name[0]}</div>
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{f.name}</p>
                                                <p style={{ fontSize: 11, color: '#64748b' }}>{f.email}</p>
                                                <p style={{ fontSize: 11, color: '#818cf8', marginTop: 1 }}>{f.department}</p>
                                            </div>
                                        </div>
                                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => startConvo(f.id)}
                                            style={{ marginTop: 14, width: '100%', padding: '9px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.06)', color: '#a5b4fc', fontSize: 12, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                            <MessageCircle size={13} />Send Message
                                        </motion.button>
                                    </motion.div>
                                ))}
                                {faculty.length === 0 && <div style={{ textAlign: 'center', padding: 50, color: '#475569', gridColumn: '1/-1', borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}><Users size={28} color="#475569" style={{ marginBottom: 8 }} /><p>No faculty registered yet</p></div>}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'messages' && (
                        <motion.div key="msg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {!activeConvo ? (
                                <div style={{ display: 'grid', gap: 8 }}>
                                    {convos.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                            <MessageCircle size={28} color="#475569" style={{ marginBottom: 8 }} />
                                            <p style={{ color: '#475569', fontSize: 14 }}>No conversations yet</p>
                                            <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Go to Faculty tab to start a conversation</p>
                                        </div>
                                    ) : convos.map(c => (
                                        <motion.button key={c.id} whileHover={{ x: 4 }} onClick={() => openConvo(c)}
                                            style={{
                                                padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                width: '100%', textAlign: 'left', cursor: 'pointer', borderRadius: 14,
                                                border: '1px solid rgba(99,102,241,0.08)', background: 'rgba(15,23,42,0.3)',
                                                transition: 'all 0.2s ease',
                                            }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontWeight: 600, fontSize: 14 }}>{c.other_name[0]}</div>
                                                <div>
                                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{c.other_name}</p>
                                                    <p style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{c.last_message || 'No messages yet'}</p>
                                                </div>
                                            </div>
                                            {c.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} />}
                                        </motion.button>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ height: 520, display: 'flex', flexDirection: 'column', borderRadius: 18, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.1)', overflow: 'hidden' }}>
                                    <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(99,102,241,0.03)' }}>
                                        <button onClick={() => setActiveConvo(null)} style={{ background: 'rgba(99,102,241,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={18} /></button>
                                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', fontWeight: 600, fontSize: 13 }}>{activeConvo.other_name[0]}</div>
                                        <p style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 14 }}>{activeConvo.other_name}</p>
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {messages.length === 0 && <p style={{ textAlign: 'center', color: '#475569', fontSize: 13, marginTop: 40 }}>Start the conversation...</p>}
                                        {messages.map(m => (
                                            <motion.div key={m.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                                style={{ alignSelf: m.sender_id === profile?.id ? 'flex-end' : 'flex-start', maxWidth: '70%', padding: '10px 14px', borderRadius: 12, background: m.sender_id === profile?.id ? 'rgba(99,102,241,0.12)' : 'rgba(15,23,42,0.6)', border: `1px solid ${m.sender_id === profile?.id ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.06)'}` }}>
                                                <p style={{ fontSize: 13, color: '#f1f5f9' }}>{m.content}</p>
                                                <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                            </motion.div>
                                        ))}
                                    </div>
                                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.08)', display: 'flex', gap: 8 }}>
                                        <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="glass-input" placeholder="Type a message..." style={{ flex: 1, padding: '10px 14px' }} />
                                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={sendMessage} className="btn-primary" style={{ padding: '10px 16px' }}>
                                            <span style={{ position: 'relative', zIndex: 1 }}><Send size={16} /></span>
                                        </motion.button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'profile' && profile && (
                        <motion.div key="prof" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                            {/* Hero Banner */}
                            <div style={{ borderRadius: 22, overflow: 'hidden', marginBottom: 20, background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(99,102,241,0.04) 100%)', border: '1px solid rgba(99,102,241,0.1)' }}>
                                <div style={{ padding: '48px 32px 40px', textAlign: 'center', position: 'relative' }}>
                                    {/* Decorative circles */}
                                    <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.06)' }} />
                                    <div style={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(139,92,246,0.04)', border: '1px solid rgba(139,92,246,0.06)' }} />

                                    <div style={{ width: 100, height: 100, borderRadius: 24, background: 'linear-gradient(135deg, #6366f1, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: 40, color: 'white', fontWeight: 700, boxShadow: '0 12px 40px rgba(99,102,241,0.35)', border: '3px solid rgba(255,255,255,0.1)', position: 'relative' }}>{profile.name[0]}</div>
                                    <h2 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', position: 'relative' }}>{profile.name}</h2>
                                    <span style={{ display: 'inline-block', padding: '5px 18px', borderRadius: 20, background: 'rgba(99,102,241,0.1)', color: '#a5b4fc', fontSize: 12, fontWeight: 500, marginTop: 8, border: '1px solid rgba(99,102,241,0.15)', position: 'relative' }}>🎓 Student</span>
                                </div>
                            </div>

                            {/* Quick Info Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
                                {[
                                    { label: 'Year', value: profile.year, icon: '📚', color: '#6366f1' },
                                    { label: 'Section', value: profile.section, icon: '🏛️', color: '#8b5cf6' },
                                    { label: 'Reg No', value: profile.reg_no, icon: '🪪', color: '#22c55e' },
                                ].map((card, i) => (
                                    <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                                        style={{ padding: '20px 18px', borderRadius: 16, background: 'rgba(15,23,42,0.4)', border: `1px solid ${card.color}15`, textAlign: 'center' }}>
                                        <span style={{ fontSize: 24, display: 'block', marginBottom: 8 }}>{card.icon}</span>
                                        <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{card.label}</p>
                                        <p style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>{card.value}</p>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Detail Rows */}
                            <div style={{ borderRadius: 18, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)', overflow: 'hidden' }}>
                                {[
                                    { label: 'Email Address', value: profile.email, icon: '✉️' },
                                    { label: 'Department', value: profile.department, icon: '🏢' },
                                    { label: 'Registration Number', value: profile.reg_no, icon: '🪪' },
                                    { label: 'Academic Year', value: `Year ${profile.year}`, icon: '📅' },
                                    { label: 'Section', value: `Section ${profile.section}`, icon: '📋' },
                                ].map((item, i) => (
                                    <div key={item.label} style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '16px 24px',
                                        borderBottom: i < 4 ? '1px solid rgba(99,102,241,0.05)' : 'none',
                                    }}>
                                        <span style={{ fontSize: 18, width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{item.label}</p>
                                            <p style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 500, marginTop: 2, wordBreak: 'break-word' }}>{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
