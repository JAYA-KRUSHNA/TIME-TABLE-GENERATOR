'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, ClipboardCheck, UserCheck, Clock, AlertCircle } from 'lucide-react';

interface PendingFaculty { id: string; name: string; email: string; department: string; created_at: string; }

export default function ApprovalsPage() {
    const [pending, setPending] = useState<PendingFaculty[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioning, setActioning] = useState<string | null>(null);

    const loadPending = async () => { const res = await fetch('/api/data?table=pending-faculty'); setPending(await res.json()); setLoading(false); };
    useEffect(() => { loadPending(); }, []);

    const handleAction = async (id: string, action: string) => {
        setActioning(id);
        const res = await fetch('/api/admin/faculty-approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ faculty_id: id, action }) });
        if (res.ok) { toast.success(action === 'approve' ? '✅ Faculty approved!' : '❌ Faculty rejected'); loadPending(); }
        else toast.error('Action failed');
        setActioning(null);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClipboardCheck size={24} color="#6366f1" />Faculty Approvals
                </h1>
                <p style={{ color: '#64748b', fontSize: 14 }}>Review and manage faculty registration requests</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '14px 20px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(251,191,36,0.08), rgba(251,191,36,0.03))', border: '1px solid rgba(251,191,36,0.12)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Clock size={18} color="#f59e0b" />
                    <div><p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Pending</p><p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{pending.length}</p></div>
                </motion.div>
            </div>

            {/* Content */}
            <AnimatePresence mode="wait">
                {pending.length === 0 ? (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ textAlign: 'center', padding: 60, borderRadius: 20, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                        <UserCheck size={40} color="#22c55e" style={{ marginBottom: 12 }} />
                        <p style={{ color: '#94a3b8', fontSize: 16, fontWeight: 500 }}>All caught up!</p>
                        <p style={{ color: '#475569', fontSize: 13, marginTop: 4 }}>No pending faculty approvals</p>
                    </motion.div>
                ) : (
                    <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{ display: 'grid', gap: 12 }}>
                        {pending.map((f, i) => (
                            <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                style={{
                                    padding: '20px 24px', borderRadius: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.15)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)'; }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(251,191,36,0.1), rgba(251,191,36,0.05))', border: '1px solid rgba(251,191,36,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', fontWeight: 700, fontSize: 16 }}>{f.name[0]}</div>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{f.name}</p>
                                        <p style={{ fontSize: 12, color: '#64748b' }}>{f.email}</p>
                                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(99,102,241,0.08)', color: '#a5b4fc' }}>{f.department}</span>
                                            <span style={{ fontSize: 11, color: '#475569' }}>Applied {new Date(f.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => handleAction(f.id, 'approve')} disabled={actioning === f.id}
                                        style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.06)', color: '#22c55e', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                        <CheckCircle size={14} />Approve
                                    </motion.button>
                                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                        onClick={() => handleAction(f.id, 'reject')} disabled={actioning === f.id}
                                        style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.06)', color: '#f87171', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                                        <XCircle size={14} />Reject
                                    </motion.button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
