'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Plus, Trash2, Building2, Users, GraduationCap } from 'lucide-react';

interface Section { id: string; department_id: string; year: number; section_name: string; student_count: number; max_capacity: number; }

export default function CollegeStructurePage() {
    const [sections, setSections] = useState<Section[]>([]);
    const [selectedYear, setSelectedYear] = useState(1);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [newSection, setNewSection] = useState('');

    const loadSections = async () => {
        const res = await fetch('/api/sections');
        const data = await res.json();
        setSections(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { loadSections(); }, []);

    const filtered = sections.filter(s => s.year === selectedYear);
    const totalStudents = sections.reduce((s, c) => s + c.student_count, 0);

    const addSection = async () => {
        if (!newSection.trim()) return;
        setAdding(true);
        const res = await fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ year: selectedYear, section_name: newSection.trim().toUpperCase(), max_capacity: 70 }) });
        const data = await res.json();
        if (res.ok) { toast.success('Section added'); setNewSection(''); loadSections(); } else toast.error(data.error);
        setAdding(false);
    };

    const deleteSection = async (id: string) => {
        if (!confirm('Delete this section?')) return;
        const res = await fetch(`/api/sections?id=${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) { toast.success('Deleted'); loadSections(); } else toast.error(data.error);
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Building2 size={24} color="#6366f1" />College Structure
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>Manage sections and capacity across all years</p>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total Sections', value: sections.length, color: '#6366f1' },
                    { label: 'Total Students', value: totalStudents, color: '#22c55e' },
                    { label: `Year ${selectedYear} Sections`, value: filtered.length, color: '#8b5cf6' },
                    { label: `Year ${selectedYear} Students`, value: filtered.reduce((s, c) => s + c.student_count, 0), color: '#f59e0b' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}03)`, border: `1px solid ${stat.color}12` }}>
                        <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</p>
                        <p style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9' }}>{stat.value}</p>
                    </motion.div>
                ))}
            </div>

            {/* Year Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, padding: 4, borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.06)', width: 'fit-content' }}>
                {[1, 2, 3, 4].map(y => (
                    <button key={y} onClick={() => setSelectedYear(y)} style={{
                        padding: '10px 22px', borderRadius: 10, fontSize: 13, cursor: 'pointer', border: 'none', fontWeight: selectedYear === y ? 600 : 400,
                        background: selectedYear === y ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))' : 'transparent',
                        color: selectedYear === y ? '#a5b4fc' : '#64748b', transition: 'all 0.2s ease',
                    }}>
                        <GraduationCap size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Year {y}
                    </button>
                ))}
            </div>

            {/* Add Section */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, padding: '16px 20px', borderRadius: 14, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                <input value={newSection} onChange={e => setNewSection(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSection()} className="glass-input" placeholder={`Add section to Year ${selectedYear} (e.g. D)`} style={{ width: 280, padding: '10px 14px' }} />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={addSection} disabled={adding} className="btn-primary" style={{ padding: '10px 20px' }}>
                    <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} />{adding ? 'Adding...' : 'Add Section'}</span>
                </motion.button>
            </div>

            {/* Sections Grid */}
            <AnimatePresence mode="wait">
                <motion.div key={selectedYear} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {filtered.map((s, i) => {
                        const usage = s.max_capacity > 0 ? Math.round((s.student_count / s.max_capacity) * 100) : 0;
                        const isFull = usage >= 100;
                        return (
                            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                style={{
                                    padding: 20, borderRadius: 16, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', fontWeight: 700, fontSize: 14 }}>{s.section_name}</div>
                                            <div>
                                                <p style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>Section {s.section_name}</p>
                                                <p style={{ fontSize: 11, color: '#64748b' }}>Year {s.year}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {s.student_count === 0 && (
                                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => deleteSection(s.id)}
                                            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 6, color: '#f87171', cursor: 'pointer' }}>
                                            <Trash2 size={14} />
                                        </motion.button>
                                    )}
                                </div>
                                {/* Capacity Bar */}
                                <div style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: 11, color: '#64748b' }}><Users size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{s.student_count} / {s.max_capacity}</span>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: isFull ? '#ef4444' : '#a5b4fc' }}>{usage}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(99,102,241,0.08)' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(usage, 100)}%` }} transition={{ duration: 0.8, delay: i * 0.05 }}
                                            style={{ height: '100%', borderRadius: 3, background: isFull ? 'linear-gradient(90deg, #ef4444, #f87171)' : 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    {filtered.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                            <Building2 size={28} color="#475569" style={{ marginBottom: 8 }} />
                            <p style={{ color: '#475569', fontSize: 14 }}>No sections for Year {selectedYear}</p>
                            <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Add your first section above</p>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
