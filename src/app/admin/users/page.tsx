'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Search, Trash2, UserPlus, X, Eye, EyeOff, Users } from 'lucide-react';

interface User { id: string; role: string; name: string; email: string; reg_no?: string; year?: number; section?: string; status: string; is_original_superadmin?: boolean; }

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showAddFaculty, setShowAddFaculty] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', email: '', department: 'CSE', password: '' });
    const [addLoading, setAddLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const loadUsers = async () => { const res = await fetch('/api/data?table=all-users'); setUsers(await res.json()); setLoading(false); };
    useEffect(() => { loadUsers(); }, []);

    const deleteUser = async (id: string, name: string) => {
        if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
        const res = await fetch('/api/admin/users', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
        if (res.ok) { toast.success('User deleted'); loadUsers(); } else toast.error('Cannot delete');
    };

    const addFaculty = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name || !addForm.email || !addForm.password) { toast.error('All fields are required'); return; }
        setAddLoading(true);
        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(addForm),
            });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Failed'); return; }
            toast.success('Faculty added successfully!');
            setShowAddFaculty(false);
            setAddForm({ name: '', email: '', department: 'CSE', password: '' });
            loadUsers();
        } catch { toast.error('Something went wrong'); } finally { setAddLoading(false); }
    };

    const filtered = users.filter(u => {
        if (roleFilter !== 'all' && u.role !== roleFilter) return false;
        if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    const roleColors: Record<string, string> = { student: '#6366f1', faculty: '#8b5cf6', admin: '#f59e0b', superadmin: '#ef4444' };
    const departments = ['CSE', 'EEE', 'Data Science', 'AI & ML', 'ECE', 'Mechanical', 'Civil'];

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={24} color="#6366f1" />User Management
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>{users.length} total users</p>
                </div>
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAddFaculty(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        border: 'none', color: 'white', fontSize: 13, fontWeight: 600,
                        boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                    }}
                >
                    <UserPlus size={16} /> Add Faculty
                </motion.button>
            </div>

            {/* Role Stats */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                {['student', 'faculty', 'admin', 'superadmin'].map(r => {
                    const count = users.filter(u => u.role === r).length;
                    return (
                        <div key={r} style={{ padding: '8px 14px', borderRadius: 10, background: `${roleColors[r]}08`, border: `1px solid ${roleColors[r]}15`, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: roleColors[r] }} />
                            <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{r}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Add Faculty Modal */}
            {showAddFaculty && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowAddFaculty(false)}>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)',
                            borderRadius: 16, padding: 28, width: '100%', maxWidth: 420,
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9' }}>Add Faculty</h2>
                            <button onClick={() => setShowAddFaculty(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={addFaculty}>
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className="glass-input" placeholder="Faculty name" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} className="glass-input" placeholder="faculty@email.com" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Department</label>
                                <select value={addForm.department} onChange={e => setAddForm(p => ({ ...p, department: e.target.value }))} className="glass-input" style={{ cursor: 'pointer' }}>
                                    {departments.map(d => <option key={d} value={d} style={{ background: '#0f172a' }}>{d}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <input type={showPassword ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} className="glass-input" placeholder="Set password" style={{ paddingRight: 48 }} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#86efac', marginBottom: 16 }}>
                                ✅ Admin-added faculty are <strong>immediately active</strong> — no OTP or approval needed.
                            </div>
                            <button type="submit" className="btn-primary" disabled={addLoading} style={{ width: '100%' }}>
                                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {addLoading && <span className="spinner" />}
                                    {addLoading ? 'Adding...' : 'Add Faculty'}
                                </span>
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                    <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} className="glass-input" placeholder="Search users..." style={{ paddingLeft: 40 }} />
                </div>
                {['all', 'student', 'faculty', 'admin', 'superadmin'].map(r => (
                    <button key={r} onClick={() => setRoleFilter(r)} style={{
                        padding: '10px 16px', borderRadius: 10, fontSize: 13, cursor: 'pointer', textTransform: 'capitalize',
                        border: `1px solid ${roleFilter === r ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'}`,
                        background: roleFilter === r ? 'rgba(99,102,241,0.12)' : 'transparent',
                        color: roleFilter === r ? '#818cf8' : '#94a3b8',
                    }}>{r}</button>
                ))}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
                {filtered.map((u, i) => (
                    <motion.div key={u.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="glass-card" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${roleColors[u.role] || '#6366f1'}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleColors[u.role], fontWeight: 700, fontSize: 14 }}>{u.name[0]}</div>
                            <div>
                                <p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>
                                    {u.name}
                                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: `${roleColors[u.role]}15`, color: roleColors[u.role], marginLeft: 6 }}>{u.role}</span>
                                    {u.status && u.status !== 'active' && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#fbbf24', marginLeft: 4 }}>{u.status}</span>
                                    )}
                                </p>
                                <p style={{ fontSize: 12, color: '#64748b' }}>{u.email}{u.reg_no ? ` · ${u.reg_no}` : ''}{u.section ? ` · ${u.section}` : ''}</p>
                            </div>
                        </div>
                        {!u.is_original_superadmin && <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => deleteUser(u.id, u.name)} style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 6, color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></motion.button>}
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
