'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { BarChart3, Calendar, Shield, Activity, Users, GraduationCap, ClipboardCheck, FileText, Moon, Sun } from 'lucide-react';

export default function AdminSettingsPage() {
    const [activeTab, setActiveTab] = useState('analytics');
    const [stats, setStats] = useState({ totalStudents: 0, activeFaculty: 0, pendingApprovals: 0, totalSections: 0 });
    const [audits, setAudits] = useState<{ id: string; action: string; target_table: string; user_name: string; created_at: string }[]>([]);
    const [events, setEvents] = useState<{ id: string; date: string; event_type: string; description: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [darkMode, setDarkMode] = useState(true);
    const [newEvent, setNewEvent] = useState({ date: '', event_type: 'holiday', description: '' });

    useEffect(() => {
        Promise.all([
            fetch('/api/data?table=stats').then(r => r.json()),
            fetch('/api/data?table=audit-logs').then(r => r.json()),
            fetch('/api/data?table=calendar').then(r => r.json()),
        ]).then(([s, a, c]) => { setStats(s); setAudits(Array.isArray(a) ? a : []); setEvents(Array.isArray(c) ? c : []); setLoading(false); });
    }, []);

    const addEvent = async () => {
        if (!newEvent.date || !newEvent.description) { toast.error('Date and description required'); return; }
        await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add-calendar-event', ...newEvent }) });
        toast.success('Added'); setNewEvent({ date: '', event_type: 'holiday', description: '' });
        const res = await fetch('/api/data?table=calendar'); setEvents(await res.json());
    };

    const deleteEvent = async (id: string) => {
        await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-calendar-event', id }) });
        setEvents(prev => prev.filter(e => e.id !== id)); toast.success('Deleted');
    };

    const tabs = [{ id: 'analytics', label: 'Analytics', icon: BarChart3 }, { id: 'calendar', label: 'Calendar', icon: Calendar }, { id: 'audit', label: 'Audit Logs', icon: Shield }, { id: 'settings', label: 'Settings', icon: Activity }];
    const eventTypeColor: Record<string, string> = { holiday: '#22c55e', exam: '#ef4444', special: '#f59e0b' };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Settings & Analytics</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Monitor, configure, and audit your institution</p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: `1px solid ${activeTab === tab.id ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'}`, background: activeTab === tab.id ? 'rgba(99,102,241,0.12)' : 'transparent', color: activeTab === tab.id ? '#818cf8' : '#94a3b8', fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 14, cursor: 'pointer' }}><tab.icon size={16} />{tab.label}</button>
                ))}
            </div>

            {activeTab === 'analytics' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                        {[
                            { label: 'Total Students', value: stats.totalStudents, icon: Users, color: '#6366f1' },
                            { label: 'Active Faculty', value: stats.activeFaculty, icon: GraduationCap, color: '#8b5cf6' },
                            { label: 'Pending Approvals', value: stats.pendingApprovals, icon: ClipboardCheck, color: '#f59e0b' },
                            { label: 'Sections', value: stats.totalSections, icon: FileText, color: '#14b8a6' },
                        ].map((card, i) => (
                            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass-card" style={{ padding: '20px 18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${card.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><card.icon size={20} color={card.color} /></div>
                                    <div><p style={{ fontSize: 12, color: '#64748b' }}>{card.label}</p><p style={{ fontSize: 24, fontWeight: 700, color: '#f1f5f9' }}>{card.value}</p></div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'calendar' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="glass" style={{ padding: '24px 20px', marginBottom: 20 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Add Event</h3>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input type="date" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} className="glass-input" style={{ width: 180 }} />
                            <select value={newEvent.event_type} onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })} className="glass-input" style={{ width: 130, cursor: 'pointer' }}>
                                <option value="holiday" style={{ background: '#0f172a' }}>Holiday</option><option value="exam" style={{ background: '#0f172a' }}>Exam</option><option value="special" style={{ background: '#0f172a' }}>Special</option>
                            </select>
                            <input value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} className="glass-input" placeholder="Description" style={{ flex: 1, minWidth: 200 }} />
                            <button onClick={addEvent} className="btn-primary" style={{ padding: '12px 20px' }}><span style={{ position: 'relative', zIndex: 1 }}>Add</span></button>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {events.map(ev => (
                            <div key={ev.id} className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 4, height: 36, borderRadius: 2, background: eventTypeColor[ev.event_type] || '#64748b' }} />
                                    <div><p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{ev.description}</p>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{ev.date}</span>
                                            <span style={{ fontSize: 11, padding: '1px 8px', borderRadius: 6, background: `${eventTypeColor[ev.event_type]}15`, color: eventTypeColor[ev.event_type], textTransform: 'capitalize' }}>{ev.event_type}</span>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => deleteEvent(ev.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 16 }}>×</button>
                            </div>
                        ))}
                        {events.length === 0 && <div className="glass" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No calendar events</div>}
                    </div>
                </motion.div>
            )}

            {activeTab === 'audit' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {audits.length === 0 ? <div className="glass" style={{ textAlign: 'center', padding: 60, color: '#64748b' }}><Shield size={40} style={{ margin: '0 auto 16px', opacity: 0.4 }} />No audit logs</div> : (
                        <div className="glass" style={{ overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead><tr>{['Action', 'Table', 'User', 'Time'].map(h => <th key={h} style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', textAlign: 'left' }}>{h}</th>)}</tr></thead>
                                <tbody>{audits.map(a => (
                                    <tr key={a.id} style={{ borderTop: '1px solid rgba(99,102,241,0.06)' }}>
                                        <td style={{ padding: '10px 16px' }}><span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6, background: a.action === 'delete' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', color: a.action === 'delete' ? '#ef4444' : '#22c55e' }}>{a.action}</span></td>
                                        <td style={{ padding: '10px 16px', fontSize: 13, color: '#94a3b8' }}>{a.target_table}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 13, color: '#f1f5f9' }}>{a.user_name}</td>
                                        <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{new Date(a.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}</tbody>
                            </table>
                        </div>
                    )}
                </motion.div>
            )}

            {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="glass" style={{ padding: '28px 24px', maxWidth: 500 }}>
                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 20 }}>App Configuration</h3>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>{darkMode ? <Moon size={16} color="#818cf8" /> : <Sun size={16} color="#f59e0b" />}<span style={{ color: '#f1f5f9', fontSize: 14 }}>Dark Mode</span></div>
                            <button onClick={() => setDarkMode(!darkMode)} style={{ width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', position: 'relative', background: darkMode ? '#6366f1' : '#475569' }}><div style={{ width: 20, height: 20, borderRadius: '50%', background: 'white', position: 'absolute', top: 3, left: darkMode ? 25 : 3, transition: 'left 0.3s' }} /></button>
                        </div>
                        {[{ label: 'App Version', value: '1.0.0' }, { label: 'Database', value: 'SQLite (Local)' }, { label: 'Auth', value: 'JWT + bcrypt' }, { label: 'Department', value: 'CSE' }].map(item => (
                            <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                                <span style={{ color: '#64748b', fontSize: 14 }}>{item.label}</span><span style={{ color: '#f1f5f9', fontSize: 14 }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
}
