'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Shield, UserPlus, Trash2 } from 'lucide-react';

interface Admin { id: string; name: string; email: string; role: string; is_original_superadmin?: boolean; }

export default function SuperAdminPage() {
    const [admins, setAdmins] = useState<Admin[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', password: '' });

    const loadAdmins = async () => { const res = await fetch('/api/data?table=admins'); setAdmins(await res.json()); setLoading(false); };
    useEffect(() => { loadAdmins(); }, []);

    const addAdmin = async () => {
        if (!newAdmin.name || !newAdmin.email || !newAdmin.password) { toast.error('All fields required'); return; }
        setAdding(true);
        const res = await fetch('/api/admin/manage-admins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newAdmin, role: 'admin' }) });
        const data = await res.json();
        if (res.ok) { toast.success('Admin created'); setNewAdmin({ name: '', email: '', password: '' }); loadAdmins(); } else toast.error(data.error);
        setAdding(false);
    };

    const deleteAdmin = async (id: string) => {
        const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        if (res.ok) { toast.success('Deleted'); loadAdmins(); } else toast.error('Cannot delete original super admin');
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}><Shield size={24} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 10 }} />Super Admin Panel</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Manage administrator accounts</p>

            <div className="glass" style={{ padding: '24px 20px', marginBottom: 24, maxWidth: 500 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={18} />Create New Admin</h3>
                <div style={{ display: 'grid', gap: 10 }}>
                    <input value={newAdmin.name} onChange={e => setNewAdmin({ ...newAdmin, name: e.target.value })} className="glass-input" placeholder="Full Name" />
                    <input type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} className="glass-input" placeholder="Email" />
                    <input type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} className="glass-input" placeholder="Password" />
                    <button onClick={addAdmin} disabled={adding} className="btn-primary" style={{ padding: '12px 24px' }}><span style={{ position: 'relative', zIndex: 1 }}>{adding ? 'Creating...' : 'Create Admin'}</span></button>
                </div>
            </div>

            <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9', marginBottom: 12 }}>Current Administrators</h3>
            <div style={{ display: 'grid', gap: 10 }}>
                {admins.map((a, i) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: a.role === 'superadmin' ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Shield size={18} color={a.role === 'superadmin' ? '#ef4444' : '#6366f1'} />
                            </div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{a.name} {a.is_original_superadmin && <span style={{ fontSize: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 8px', borderRadius: 6, marginLeft: 4 }}>Original</span>}</p>
                                <p style={{ fontSize: 12, color: '#64748b' }}>{a.email} · <span style={{ textTransform: 'capitalize' }}>{a.role}</span></p>
                            </div>
                        </div>
                        {!a.is_original_superadmin && <button onClick={() => deleteAdmin(a.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={16} /></button>}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
