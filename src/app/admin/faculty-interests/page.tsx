'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';

interface FacultyWithInterests { id: string; name: string; email: string; department: string; subjects: { name: string; type: string }[]; }

export default function FacultyInterestsPage() {
    const [faculty, setFaculty] = useState<FacultyWithInterests[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetch('/api/data?table=faculty-with-interests').then(r => r.json()).then(d => { setFaculty(Array.isArray(d) ? d : []); setLoading(false); }); }, []);

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    return (
        <div>
            <BackButton />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Faculty Interests</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>View faculty teaching preferences</p>
            <div style={{ display: 'grid', gap: 12 }}>
                {faculty.map(f => (
                    <div key={f.id} className="glass-card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontSize: 15, fontWeight: 600, color: '#f1f5f9' }}>{f.name}</p>
                                <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{f.email}</p>
                            </div>
                            <span style={{ fontSize: 12, color: '#94a3b8' }}>{f.subjects.length} interests</span>
                        </div>
                        {f.subjects.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                {f.subjects.map((s, i) => (
                                    <span key={i} style={{ padding: '4px 12px', borderRadius: 12, fontSize: 12, background: s.type === 'lab' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: s.type === 'lab' ? '#22c55e' : '#818cf8', border: `1px solid ${s.type === 'lab' ? 'rgba(34,197,94,0.2)' : 'rgba(99,102,241,0.2)'}` }}>{s.name}</span>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                {faculty.length === 0 && <div className="glass" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No faculty registered yet</div>}
            </div>
        </div>
    );
}
