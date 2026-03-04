'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, DoorOpen, FlaskConical, X, Building2, Users, BarChart3 } from 'lucide-react';

interface Room { id: string; name: string; capacity: number; }
interface Lab { id: string; name: string; capacity: number; lab_type_id: string; lab_type_name: string; }
interface LabType { id: string; name: string; }

export default function RoomsPage() {
    const [tab, setTab] = useState<'classrooms' | 'labs'>('classrooms');
    const [rooms, setRooms] = useState<Room[]>([]);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [labTypes, setLabTypes] = useState<LabType[]>([]);
    const [roomOccupancy, setRoomOccupancy] = useState<Record<string, number>>({});
    const [labOccupancy, setLabOccupancy] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ name: '', capacity: 70, lab_type_id: '' });
    const [addLoading, setAddLoading] = useState(false);

    const load = async () => {
        const res = await fetch('/api/admin/rooms');
        const data = await res.json();
        setRooms(data.rooms || []);
        setLabs(data.labs || []);
        setLabTypes(data.labTypes || []);
        setRoomOccupancy(data.roomOccupancy || {});
        setLabOccupancy(data.labOccupancy || {});
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!addForm.name.trim()) { toast.error('Name is required'); return; }
        setAddLoading(true);
        const body = tab === 'labs'
            ? { type: 'lab', name: addForm.name, capacity: addForm.capacity, lab_type_id: addForm.lab_type_id || labTypes[0]?.id }
            : { type: 'room', name: addForm.name, capacity: addForm.capacity };
        const res = await fetch('/api/admin/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (res.ok) { toast.success('Added!'); setShowAdd(false); setAddForm({ name: '', capacity: 70, lab_type_id: '' }); load(); }
        else { const d = await res.json(); toast.error(d.error); }
        setAddLoading(false);
    };

    const handleDelete = async (id: string, type: string, name: string) => {
        if (!confirm(`Delete ${name}?`)) return;
        const res = await fetch('/api/admin/rooms', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, type }) });
        if (res.ok) { toast.success('Deleted'); load(); }
        else { const d = await res.json(); toast.error(d.error); }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>;

    const totalPeriods = 7 * 6; // 7 periods × 6 days (Mon-Sat)

    const getOccColor = (pct: number) => pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
    const getOccLabel = (pct: number) => pct > 80 ? 'High' : pct > 50 ? 'Medium' : 'Low';

    // Overall stats
    const totalRoomBooked = Object.values(roomOccupancy).reduce((s, v) => s + v, 0);
    const totalLabBooked = Object.values(labOccupancy).reduce((s, v) => s + v, 0);
    const avgRoomOcc = rooms.length > 0 ? Math.round((totalRoomBooked / (rooms.length * totalPeriods)) * 100) : 0;
    const avgLabOcc = labs.length > 0 ? Math.round((totalLabBooked / (labs.length * totalPeriods)) * 100) : 0;

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={24} color="#6366f1" />
                        Rooms & Labs
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Manage classrooms and laboratory spaces</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAdd(true)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12,
                        cursor: 'pointer', background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                        border: 'none', color: 'white', fontSize: 13, fontWeight: 600,
                        boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                    }}
                >
                    <Plus size={16} /> Add {tab === 'labs' ? 'Lab' : 'Classroom'}
                </motion.button>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Classrooms', value: rooms.length, icon: DoorOpen, color: '#6366f1' },
                    { label: 'Labs', value: labs.length, icon: FlaskConical, color: '#22c55e' },
                    { label: 'Avg Room Usage', value: `${avgRoomOcc}%`, icon: BarChart3, color: getOccColor(avgRoomOcc) },
                    { label: 'Avg Lab Usage', value: `${avgLabOcc}%`, icon: BarChart3, color: getOccColor(avgLabOcc) },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{
                            padding: '16px 18px', borderRadius: 14,
                            background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}03)`,
                            border: `1px solid ${stat.color}15`,
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <stat.icon size={18} color={stat.color} />
                            <div>
                                <p style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</p>
                                <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{stat.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.06)', width: 'fit-content' }}>
                {[
                    { key: 'classrooms' as const, label: 'Classrooms', icon: DoorOpen, count: rooms.length },
                    { key: 'labs' as const, label: 'Labs', icon: FlaskConical, count: labs.length },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        padding: '10px 22px', borderRadius: 10, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                        border: 'none',
                        background: tab === t.key ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))' : 'transparent',
                        color: tab === t.key ? '#a5b4fc' : '#64748b', fontWeight: tab === t.key ? 600 : 400,
                        transition: 'all 0.2s ease',
                    }}>
                        <t.icon size={15} /> {t.label} <span style={{ fontSize: 11, opacity: 0.7 }}>({t.count})</span>
                    </button>
                ))}
            </div>

            {/* Add Modal */}
            <AnimatePresence>
                {showAdd && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowAdd(false)}>
                        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <h2 style={{ fontSize: 20, fontWeight: 600, color: '#f1f5f9' }}>Add {tab === 'labs' ? 'Lab' : 'Classroom'}</h2>
                                <button onClick={() => setShowAdd(false)} style={{ background: 'rgba(99,102,241,0.08)', border: 'none', color: '#94a3b8', cursor: 'pointer', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} className="glass-input" placeholder={tab === 'labs' ? 'e.g. Lab-4' : 'e.g. CR-116'} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Capacity</label>
                                    <input type="number" value={addForm.capacity} onChange={e => setAddForm(p => ({ ...p, capacity: parseInt(e.target.value) || 70 }))} className="glass-input" />
                                </div>
                                {tab === 'labs' && (
                                    <div className="form-group">
                                        <label className="form-label">Lab Type</label>
                                        <select value={addForm.lab_type_id} onChange={e => setAddForm(p => ({ ...p, lab_type_id: e.target.value }))} className="glass-input" style={{ cursor: 'pointer' }}>
                                            {labTypes.map(lt => <option key={lt.id} value={lt.id} style={{ background: '#0f172a' }}>{lt.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <button type="submit" className="btn-primary" disabled={addLoading} style={{ width: '100%', marginTop: 8 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                                        {addLoading && <span className="spinner" />}
                                        {addLoading ? 'Adding...' : `Add ${tab === 'labs' ? 'Lab' : 'Classroom'}`}
                                    </span>
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Room/Lab Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
                {(tab === 'classrooms' ? rooms : labs).map((item, i) => {
                    const isLab = tab === 'labs';
                    const booked = isLab ? (labOccupancy[(item as Lab).id] || 0) : (roomOccupancy[(item as Room).id] || 0);
                    const pct = Math.round((booked / totalPeriods) * 100);
                    const color = getOccColor(pct);
                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                            style={{
                                padding: '20px', borderRadius: 16,
                                background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: isLab ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
                                        border: `1px solid ${isLab ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)'}`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                    }}>
                                        {isLab ? <FlaskConical size={18} color="#22c55e" /> : <DoorOpen size={18} color="#6366f1" />}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{item.name}</p>
                                        {isLab && <p style={{ fontSize: 11, color: '#818cf8', marginTop: 2 }}>{(item as Lab).lab_type_name}</p>}
                                        <p style={{ fontSize: 11, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Users size={10} /> {item.capacity} seats
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => handleDelete(item.id, isLab ? 'lab' : 'room', item.name)} style={{ background: 'rgba(239,68,68,0.08)', border: 'none', color: '#f87171', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
                                ><Trash2 size={14} /></button>
                            </div>

                            {/* Usage bar */}
                            <div style={{ marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
                                    <span style={{ color: '#64748b' }}>{booked}/{totalPeriods} periods</span>
                                    <span style={{ color, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                        {pct}% · {getOccLabel(pct)}
                                    </span>
                                </div>
                                <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(99,102,241,0.06)', overflow: 'hidden' }}>
                                    <motion.div
                                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                        transition={{ delay: 0.2 + i * 0.03, duration: 0.6 }}
                                        style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${color}cc, ${color})` }}
                                    />
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {((tab === 'classrooms' && rooms.length === 0) || (tab === 'labs' && labs.length === 0)) && (
                <div style={{ textAlign: 'center', padding: '50px 20px', borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        {tab === 'labs' ? <FlaskConical size={24} color="#64748b" /> : <DoorOpen size={24} color="#64748b" />}
                    </div>
                    <p style={{ color: '#64748b', fontSize: 14 }}>No {tab === 'labs' ? 'labs' : 'classrooms'} configured</p>
                    <p style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>Click &quot;Add&quot; to create one</p>
                </div>
            )}
        </div>
    );
}
