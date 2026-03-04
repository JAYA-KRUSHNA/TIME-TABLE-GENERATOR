'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { ChevronRight, ChevronLeft, Plus, Trash2, Wand2, DoorOpen, FlaskConical, Clock } from 'lucide-react';

const STEPS = [
    { title: 'Select Classes', desc: 'Choose which classes to generate timetables for' },
    { title: 'Subjects', desc: 'Add and configure subjects with hours' },
    { title: 'Classrooms', desc: 'Select classrooms for scheduling' },
    { title: 'Labs', desc: 'Select labs for lab sessions' },
    { title: 'Free Periods', desc: 'Add free periods / activities' },
    { title: 'Generate', desc: 'Set rules and generate' },
];

interface Room { id: string; name: string; capacity: number; }
interface Lab { id: string; name: string; lab_type_name: string; capacity: number; }
interface FreePeriod { name: string; periods_per_week: number; }

export default function TimetableGeneratorPage() {
    const [step, setStep] = useState(0);
    const [sections, setSections] = useState<{ id: string; year: number; section_name: string }[]>([]);
    const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
    const [subjects, setSubjects] = useState<{ id: string; name: string; type: string; hours_per_week: number; year: number | null }[]>([]);
    const [newSub, setNewSub] = useState({ name: '', type: 'theory', hours_per_week: 3 });
    const [rooms, setRooms] = useState<Room[]>([]);
    const [labs, setLabs] = useState<Lab[]>([]);
    const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
    const [selectedLabs, setSelectedLabs] = useState<string[]>([]);
    const [roomOccupancy, setRoomOccupancy] = useState<Record<string, number>>({});
    const [labOccupancy, setLabOccupancy] = useState<Record<string, number>>({});
    const [freePeriods, setFreePeriods] = useState<FreePeriod[]>([]);
    const [newFree, setNewFree] = useState({ name: '', periods_per_week: 1 });
    const [rules, setRules] = useState({ periods_per_day: 7, break_after_period: 4, max_consecutive_theory: 3, lab_requires_consecutive: true, lab_consecutive_periods: 2 });
    const [generating, setGenerating] = useState(false);
    const [result, setResult] = useState<{ success: boolean; total_slots: number; conflicts?: string[]; hard_violations?: string[]; optimizations?: number; execution_time_ms?: number; soft_scores?: { total_score: number; consecutive_violations: number; distribution_score: number; back_to_back_labs: number; room_switches: number } } | null>(null);
    const [loading, setLoading] = useState(true);
    const [existingTTSections, setExistingTTSections] = useState<string[]>([]); // section names that already have timetables

    // Derive the selected year from selected classes
    const selectedYear = (() => {
        const years = selectedClasses.map(id => sections.find(s => s.id === id)?.year).filter(Boolean) as number[];
        return years.length > 0 ? years[0] : null;
    })();

    // Filter subjects by selected year only (strict — no NULL year mixing)
    const filteredSubjects = selectedYear ? subjects.filter(s => s.year === selectedYear) : [];

    useEffect(() => {
        Promise.all([
            fetch('/api/sections').then(r => r.json()),
            fetch('/api/data?table=subjects').then(r => r.json()),
            fetch('/api/admin/rooms').then(r => r.json()),
        ]).then(([secs, subs, roomData]) => {
            setSections(Array.isArray(secs) ? secs : []);
            setSubjects(Array.isArray(subs) ? subs : []);
            setRooms(roomData.rooms || []);
            setLabs(roomData.labs || []);
            setRoomOccupancy(roomData.roomOccupancy || {});
            setLabOccupancy(roomData.labOccupancy || {});
            setLoading(false);
        });
    }, []);

    const toggleClass = (id: string) => setSelectedClasses(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
    const toggleRoom = (id: string) => setSelectedRooms(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    const toggleLab = (id: string) => setSelectedLabs(prev => prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]);

    const addSubject = async () => {
        if (!newSub.name.trim()) return;
        if (!selectedYear) { toast.error('Go back and select classes first'); return; }
        const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'add-subject', ...newSub, year: selectedYear }) });
        const data = await res.json();
        if (data.id) {
            setSubjects(prev => {
                const existing = prev.find(s => s.id === data.id);
                if (existing) return prev.map(s => s.id === data.id ? { ...s, hours_per_week: data.hours_per_week } : s);
                return [...prev, data];
            });
            setNewSub({ name: '', type: 'theory', hours_per_week: 3 });
            toast.success(subjects.find(s => s.id === data.id) ? `Updated "${data.name}" → ${data.hours_per_week}h/w` : `Added for Year ${selectedYear}`);
        }
    };

    const deleteSubject = async (id: string) => {
        await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-subject', id }) });
        setSubjects(prev => prev.filter(s => s.id !== id)); toast.success('Deleted');
    };

    const addFreePeriod = () => {
        if (!newFree.name.trim()) return;
        setFreePeriods(prev => [...prev, { ...newFree }]);
        setNewFree({ name: '', periods_per_week: 1 });
    };

    const handleGenerate = async () => {
        if (selectedClasses.length === 0) { toast.error('Select at least one class'); return; }
        // Rooms are optional — generator will work without them
        // if (selectedRooms.length === 0) { toast.error('Select at least one classroom'); return; }
        setGenerating(true); setResult(null);

        // Create class records
        const classIds: string[] = [];
        for (const secId of selectedClasses) {
            const sec = sections.find(s => s.id === secId);
            if (!sec) continue;
            const res = await fetch('/api/data?table=classes');
            const classes = await res.json();
            let cls = (Array.isArray(classes) ? classes : []).find((c: { section_id: string }) => c.section_id === secId);
            if (!cls) {
                const createRes = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-class', section_id: secId, year: sec.year }) });
                const created = await createRes.json();
                classIds.push(created.id);
            } else {
                classIds.push(cls.id);
            }
        }

        const res = await fetch('/api/timetable/generate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                class_ids: classIds,
                selected_room_ids: selectedRooms,
                selected_lab_ids: selectedLabs,
                free_periods: freePeriods,
                ...rules,
            }),
        });
        const data = await res.json();
        setResult(data);
        setGenerating(false);

        // Refresh room occupancy (no exclusions since timetable is now saved)
        await refreshRoomData();
    };

    // Refresh room/lab occupancy, excluding selected classes
    const refreshRoomData = async (excludeClassIds: string[] = []) => {
        const params = excludeClassIds.length > 0 ? `?exclude_class_ids=${excludeClassIds.join(',')}` : '';
        const roomData = await fetch(`/api/admin/rooms${params}`).then(r => r.json());
        setRooms(roomData.rooms || []);
        setLabs(roomData.labs || []);
        setRoomOccupancy(roomData.roomOccupancy || {});
        setLabOccupancy(roomData.labOccupancy || {});
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    const totalPeriods = 7 * 6;

    return (
        <div>
            <BackButton />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Timetable Generator</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>AI-powered scheduling wizard</p>

            {/* Steps indicator */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 28, overflowX: 'auto' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', minWidth: 70 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, background: i <= step ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,60,0.3)', color: i <= step ? '#818cf8' : '#475569', border: `2px solid ${i <= step ? '#6366f1' : '#1e293b'}` }}>{i + 1}</div>
                        <p style={{ fontSize: 10, color: i === step ? '#f1f5f9' : '#475569' }}>{s.title}</p>
                    </div>
                ))}
            </div>

            <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
                {/* Step 0: Select Classes */}
                {step === 0 && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Select Classes</h3>
                        {/* Group by year */}
                        {[...new Set(sections.map(s => s.year))].sort().map(year => {
                            const yearSections = sections.filter(s => s.year === year);
                            const selectedInYear = yearSections.filter(s => selectedClasses.includes(s.id));
                            return (
                                <div key={year} style={{ marginBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>Year {year}</span>
                                        <span style={{ fontSize: 11, color: '#475569' }}>({yearSections.length} sections)</span>
                                        {selectedInYear.length > 0 && selectedInYear.length < yearSections.length && (
                                            <button onClick={() => {
                                                const allIds = yearSections.map(s => s.id);
                                                setSelectedClasses(prev => [...new Set([...prev.filter(id => !yearSections.some(s => s.id === id)), ...allIds])]);
                                            }} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.06)', color: '#a5b4fc', cursor: 'pointer' }}>
                                                Select all Year {year}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                                        {yearSections.map(s => {
                                            const isSelected = selectedClasses.includes(s.id);
                                            // Disable if another year is already selected
                                            const isDisabled = selectedYear !== null && s.year !== selectedYear && !isSelected;
                                            return (
                                                <button key={s.id} onClick={() => !isDisabled && toggleClass(s.id)} style={{
                                                    padding: '12px', borderRadius: 10, textAlign: 'center', cursor: isDisabled ? 'not-allowed' : 'pointer',
                                                    border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.1)'}`,
                                                    background: isSelected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                                    color: isDisabled ? '#334155' : isSelected ? '#818cf8' : '#94a3b8',
                                                    opacity: isDisabled ? 0.5 : 1,
                                                }}>Y{s.year} {s.section_name}</button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {selectedYear && (
                            <p style={{ marginTop: 12, fontSize: 13, color: '#818cf8' }}>
                                {selectedClasses.length} class(es) selected for Year {selectedYear}
                            </p>
                        )}
                        {selectedYear && selectedClasses.length < sections.filter(s => s.year === selectedYear).length && (
                            <p style={{ marginTop: 4, fontSize: 12, color: '#fbbf24' }}>
                                ⚠ Not all Year {selectedYear} sections selected. Unselected sections will keep their existing timetable.
                            </p>
                        )}
                    </div>
                )}

                {/* Step 1: Subjects */}
                {step === 1 && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Subjects {selectedYear && <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 400 }}>— Year {selectedYear}</span>}</h3>
                        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Subjects added here apply to all Year {selectedYear} sections. Adding a duplicate increments hours.</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            <input value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} className="glass-input" placeholder="Subject name" style={{ flex: 1, minWidth: 150 }} />
                            <select value={newSub.type} onChange={e => setNewSub({ ...newSub, type: e.target.value })} className="glass-input" style={{ width: 120, cursor: 'pointer' }}>
                                <option value="theory" style={{ background: '#0f172a' }}>Theory</option>
                                <option value="lab" style={{ background: '#0f172a' }}>Lab</option>
                            </select>
                            <input type="number" value={newSub.hours_per_week} onChange={e => setNewSub({ ...newSub, hours_per_week: parseInt(e.target.value) || 1 })} className="glass-input" style={{ width: 80 }} min={1} max={10} />
                            <button onClick={addSubject} className="btn-primary" style={{ padding: '10px 16px' }}><span style={{ position: 'relative', zIndex: 1 }}><Plus size={16} /></span></button>
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            {filteredSubjects.length === 0 && <p style={{ color: '#475569', fontSize: 13 }}>No subjects for Year {selectedYear}. Add some above.</p>}
                            {filteredSubjects.map(s => (
                                <div key={s.id} className="glass-card" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <span style={{ fontSize: 14, color: '#f1f5f9' }}>{s.name}</span>
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 6, background: s.type === 'lab' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: s.type === 'lab' ? '#22c55e' : '#818cf8' }}>{s.type}</span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>{s.hours_per_week}h/w</span>
                                    </div>
                                    <button onClick={() => deleteSubject(s.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        {filteredSubjects.length > 0 && (
                            <p style={{ marginTop: 12, fontSize: 12, color: '#64748b' }}>
                                Total: {filteredSubjects.reduce((s, x) => s + x.hours_per_week, 0)}h/week (max 42 slots = 7 periods × 6 days)
                            </p>
                        )}
                    </div>
                )}

                {/* Step 2: Classrooms */}
                {step === 2 && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Select Classrooms</h3>
                        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Tap to select. Occupied rooms show usage from existing timetables.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                            {rooms.map(r => {
                                const booked = roomOccupancy[r.id] || 0;
                                const pct = Math.round((booked / totalPeriods) * 100);
                                const selected = selectedRooms.includes(r.id);
                                return (
                                    <button key={r.id} onClick={() => toggleRoom(r.id)} style={{
                                        padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                                        border: `1px solid ${selected ? 'rgba(99,102,241,0.5)' : booked > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(99,102,241,0.1)'}`,
                                        background: selected ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <DoorOpen size={16} style={{ color: selected ? '#818cf8' : '#64748b' }} />
                                            <span style={{ fontSize: 14, fontWeight: 600, color: selected ? '#818cf8' : '#f1f5f9' }}>{r.name}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>Cap: {r.capacity}</div>
                                        {booked > 0 && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 11, color: pct > 80 ? '#f87171' : '#fbbf24', marginBottom: 2 }}>{booked}/{totalPeriods} occupied ({pct}%)</div>
                                                <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(99,102,241,0.1)' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct > 80 ? '#ef4444' : '#f59e0b' }} />
                                                </div>
                                            </div>
                                        )}
                                        {booked === 0 && <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>✓ Available</div>}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedRooms.length > 0 && <p style={{ marginTop: 12, fontSize: 13, color: '#818cf8' }}>{selectedRooms.length} classroom(s) selected</p>}
                    </div>
                )}

                {/* Step 3: Labs */}
                {step === 3 && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Select Labs</h3>
                        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Select labs for lab sessions.</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                            {labs.map(l => {
                                const booked = labOccupancy[l.id] || 0;
                                const pct = Math.round((booked / totalPeriods) * 100);
                                const selected = selectedLabs.includes(l.id);
                                return (
                                    <button key={l.id} onClick={() => toggleLab(l.id)} style={{
                                        padding: 14, borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                                        border: `1px solid ${selected ? 'rgba(34,197,94,0.5)' : booked > 0 ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.1)'}`,
                                        background: selected ? 'rgba(34,197,94,0.08)' : 'transparent',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <FlaskConical size={16} style={{ color: selected ? '#22c55e' : '#64748b' }} />
                                            <span style={{ fontSize: 14, fontWeight: 600, color: selected ? '#22c55e' : '#f1f5f9' }}>{l.name}</span>
                                        </div>
                                        <div style={{ fontSize: 11, color: '#64748b' }}>{l.lab_type_name} · Cap: {l.capacity}</div>
                                        {booked > 0 && (
                                            <div style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 11, color: pct > 80 ? '#f87171' : '#fbbf24', marginBottom: 2 }}>{booked}/{totalPeriods} occupied ({pct}%)</div>
                                                <div style={{ width: '100%', height: 3, borderRadius: 2, background: 'rgba(34,197,94,0.1)' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: pct > 80 ? '#ef4444' : '#f59e0b' }} />
                                                </div>
                                            </div>
                                        )}
                                        {booked === 0 && <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>✓ Available</div>}
                                    </button>
                                );
                            })}
                        </div>
                        {labs.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: '#64748b' }}>No labs configured. Add labs in Rooms & Labs page.</div>}
                        {selectedLabs.length > 0 && <p style={{ marginTop: 12, fontSize: 13, color: '#22c55e' }}>{selectedLabs.length} lab(s) selected</p>}
                    </div>
                )}

                {/* Step 4: Free Periods */}
                {step === 4 && (
                    <div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 4 }}>Free Periods & Activities</h3>
                        <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Add breaks, library periods, or other activities.</p>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                            <input value={newFree.name} onChange={e => setNewFree({ ...newFree, name: e.target.value })} className="glass-input" placeholder="e.g. Library, Sports, Free" style={{ flex: 1, minWidth: 150 }} />
                            <input type="number" value={newFree.periods_per_week} onChange={e => setNewFree({ ...newFree, periods_per_week: parseInt(e.target.value) || 1 })} className="glass-input" style={{ width: 100 }} min={1} max={10} placeholder="Per week" />
                            <button onClick={addFreePeriod} className="btn-primary" style={{ padding: '10px 16px' }}><span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> Add</span></button>
                        </div>
                        <div style={{ display: 'grid', gap: 6 }}>
                            {freePeriods.map((fp, i) => (
                                <div key={i} className="glass-card" style={{ padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <Clock size={14} style={{ color: '#fbbf24' }} />
                                        <span style={{ fontSize: 14, color: '#f1f5f9' }}>{fp.name}</span>
                                        <span style={{ fontSize: 11, color: '#64748b' }}>{fp.periods_per_week} per week</span>
                                    </div>
                                    <button onClick={() => setFreePeriods(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                </div>
                            ))}
                        </div>
                        {freePeriods.length === 0 && <div style={{ textAlign: 'center', padding: 20, color: '#475569', fontSize: 13 }}>No free periods added. This is optional.</div>}
                    </div>
                )}

                {/* Step 5: Generate */}
                {step === 5 && (
                    <div>
                        {!result ? (
                            <div>
                                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Scheduling Rules</h3>
                                <div style={{ display: 'grid', gap: 16, maxWidth: 400, marginBottom: 28 }}>
                                    {[
                                        { label: 'Periods per day', key: 'periods_per_day' },
                                        { label: 'Break after period', key: 'break_after_period' },
                                        { label: 'Max consecutive theory', key: 'max_consecutive_theory' },
                                        { label: 'Lab consecutive periods', key: 'lab_consecutive_periods' },
                                    ].map(item => (
                                        <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <label style={{ color: '#94a3b8', fontSize: 14 }}>{item.label}</label>
                                            <input type="number" value={rules[item.key as keyof typeof rules] as number} onChange={e => setRules({ ...rules, [item.key]: parseInt(e.target.value) || 1 })} className="glass-input" style={{ width: 80, textAlign: 'center' }} />
                                        </div>
                                    ))}
                                </div>

                                {/* Summary */}
                                <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
                                    <h4 style={{ fontSize: 14, color: '#818cf8', marginBottom: 8 }}>Generation Summary</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>Classes: <strong style={{ color: '#f1f5f9' }}>{selectedClasses.length}</strong></div>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>Subjects: <strong style={{ color: '#f1f5f9' }}>{subjects.length}</strong></div>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>Rooms: <strong style={{ color: '#f1f5f9' }}>{selectedRooms.length}</strong></div>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>Labs: <strong style={{ color: '#f1f5f9' }}>{selectedLabs.length}</strong></div>
                                        <div style={{ fontSize: 13, color: '#94a3b8' }}>Free periods: <strong style={{ color: '#f1f5f9' }}>{freePeriods.length}</strong></div>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <Wand2 size={48} style={{ color: '#818cf8', margin: '0 auto 16px' }} />
                                    <button onClick={handleGenerate} disabled={generating} className="btn-primary" style={{ padding: '14px 32px' }}>
                                        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>{generating && <span className="spinner" />}{generating ? 'Generating...' : 'Generate Timetable'}</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                {/* Show success if slots were generated, even with soft conflicts */}
                                {(() => {
                                    const hasHardViolations = result.hard_violations && result.hard_violations.length > 0;
                                    const generated = result.total_slots > 0;
                                    const isSuccess = generated && !hasHardViolations;
                                    return (
                                        <>
                                            <div style={{ width: 64, height: 64, borderRadius: '50%', background: isSuccess ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 32 }}>{isSuccess ? '✓' : '!'}</div>
                                            <h3 style={{ fontSize: 18, fontWeight: 600, color: isSuccess ? '#22c55e' : '#f87171' }}>{isSuccess ? 'Generation Complete' : 'Generation Failed'}</h3>
                                            <p style={{ color: '#94a3b8', fontSize: 14, margin: '8px 0 4px' }}>{result.total_slots} slots assigned</p>
                                            {result.execution_time_ms && <p style={{ color: '#64748b', fontSize: 12, marginBottom: 4 }}>Completed in {result.execution_time_ms}ms</p>}
                                            {result.optimizations !== undefined && result.optimizations > 0 && <p style={{ color: '#818cf8', fontSize: 12, marginBottom: 12 }}>{result.optimizations} optimization swaps applied</p>}
                                            {result.soft_scores && (
                                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', margin: '8px 0 16px' }}>
                                                    <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>Quality: {result.soft_scores.total_score}</span>
                                                    <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', color: '#22c55e' }}>Spread: {result.soft_scores.distribution_score}</span>
                                                    {result.soft_scores.consecutive_violations > 0 && <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>Consecutive: {result.soft_scores.consecutive_violations}</span>}
                                                    {result.soft_scores.room_switches > 0 && <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.1)', color: '#fbbf24' }}>Room switches: {result.soft_scores.room_switches}</span>}
                                                </div>
                                            )}
                                            {hasHardViolations && (
                                                <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto 12px', padding: 16, borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', maxHeight: 150, overflowY: 'auto' }}>
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#f87171', marginBottom: 6 }}>Hard Constraint Violations:</p>
                                                    {result.hard_violations!.map((v, i) => <p key={i} style={{ fontSize: 12, color: '#f87171', marginBottom: 3 }}>✕ {v}</p>)}
                                                </div>
                                            )}
                                            {result.conflicts && result.conflicts.length > 0 && !hasHardViolations && (
                                                <div style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto 12px', padding: 16, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', maxHeight: 150, overflowY: 'auto' }}>
                                                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24', marginBottom: 6 }}>Warnings (non-blocking):</p>
                                                    {result.conflicts.map((c, i) => <p key={i} style={{ fontSize: 12, color: '#fbbf24', marginBottom: 3 }}>⚠ {c}</p>)}
                                                </div>
                                            )}
                                            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                                                <button onClick={() => { setResult(null); handleGenerate(); }} className="btn-primary" style={{ padding: '10px 20px' }}><span style={{ position: 'relative', zIndex: 1 }}>Regenerate</span></button>
                                                {isSuccess && <button onClick={() => window.location.href = '/admin/timetables'} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: 'rgba(34,197,94,0.08)', color: '#22c55e', cursor: 'pointer', fontSize: 14 }}>View Timetables →</button>}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={async () => {
                    const newStep = Math.max(0, step - 1);
                    if (newStep === 2 || newStep === 3) {
                        const res = await fetch('/api/data?table=classes'); const classes = await res.json();
                        const ids = (Array.isArray(classes) ? classes : []).filter((c: { section_id: string }) => selectedClasses.includes(c.section_id)).map((c: { id: string }) => c.id);
                        await refreshRoomData(ids);
                    }
                    setStep(newStep);
                }} disabled={step === 0} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.15)', background: 'transparent', color: step === 0 ? '#334155' : '#94a3b8', cursor: step === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}><ChevronLeft size={16} />Back</button>
                {step < 5 && <button onClick={async () => {
                    const newStep = Math.min(5, step + 1);
                    if (newStep === 2 || newStep === 3) {
                        const res = await fetch('/api/data?table=classes'); const classes = await res.json();
                        const ids = (Array.isArray(classes) ? classes : []).filter((c: { section_id: string }) => selectedClasses.includes(c.section_id)).map((c: { id: string }) => c.id);
                        await refreshRoomData(ids);
                    }
                    setStep(newStep);
                }} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>Next<ChevronRight size={16} /></button>}
            </div>
        </div>
    );
}
