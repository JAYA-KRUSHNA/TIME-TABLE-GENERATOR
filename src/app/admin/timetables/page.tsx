'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, BookOpen, ChevronDown, Info, Beaker, Coffee, BookMarked, UserCircle, DoorOpen, AlertTriangle, Clock, BarChart3, RefreshCw, CheckCircle } from 'lucide-react';

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

const CELL_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    theory: { bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
    lab: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#86efac' },
    free: { bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.15)', text: '#fde68a' },
    empty: { bg: 'transparent', border: 'rgba(99,102,241,0.04)', text: '#334155' },
};

interface ClassOption { id: string; year: number; section_id: string; section_name: string; }
interface TimetableEntry { day: string; period: number; subject_name: string; subject_type: string; room_name?: string; lab_name?: string; faculty_name?: string; year?: number; section_name?: string; }
interface FacultyOption { id: string; name: string; email: string; department: string; total_periods: number; }
interface RoomOption { id: string; name: string; capacity: number; type: string; booked_periods: number; }
interface LabOption { id: string; name: string; capacity: number; lab_type_name: string; booked_periods: number; }
interface ConflictReport { total_conflicts: number; conflicts: string[]; status: string; }
interface SoftScore { consecutive_violations: number; distribution_score: number; back_to_back_labs: number; room_switches: number; total_score: number; }
interface GenSummary { last_generation: { execution_time_ms: number; status: string; soft_score_json: string; created_at: string; total_slots: number; } | null; is_stale: boolean; }

type ViewTab = 'class' | 'faculty' | 'room' | 'conflicts' | 'summary';

export default function TimetablesPage() {
    const [activeView, setActiveView] = useState<ViewTab>('class');
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
    const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [facultySchedule, setFacultySchedule] = useState<TimetableEntry[]>([]);
    const [facultyInfo, setFacultyInfo] = useState<{ name: string; email: string; department: string } | null>(null);
    const [roomList, setRoomList] = useState<RoomOption[]>([]);
    const [selectedRoom, setSelectedRoom] = useState('');
    const [roomSchedule, setRoomSchedule] = useState<TimetableEntry[]>([]);
    const [roomInfo, setRoomInfo] = useState<{ name: string; capacity: number; type: string } | null>(null);
    const [labList, setLabList] = useState<LabOption[]>([]);
    const [selectedLab, setSelectedLab] = useState('');
    const [labSchedule, setLabSchedule] = useState<TimetableEntry[]>([]);
    const [labInfo, setLabInfo] = useState<{ name: string; capacity: number; lab_type_name: string } | null>(null);
    const [conflicts, setConflicts] = useState<ConflictReport | null>(null);
    const [genSummary, setGenSummary] = useState<GenSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/data?table=classes').then(r => r.json()),
            fetch('/api/timetable/views?view=generation-summary').then(r => r.json()),
        ]).then(([clsData, sumData]) => {
            setClasses(Array.isArray(clsData) ? clsData : []);
            setGenSummary(sumData);
            setLoading(false);
        });
    }, []);

    const loadClassTT = async (classId: string) => {
        setSelectedClass(classId);
        const res = await fetch(`/api/data?table=timetable&class_id=${classId}`);
        setTimetable(await res.json());
    };

    const loadFacultyView = async () => {
        if (facultyList.length === 0) {
            const res = await fetch('/api/timetable/views?view=faculty');
            setFacultyList(await res.json());
        }
    };

    const loadFacultySchedule = async (fId: string) => {
        setSelectedFaculty(fId);
        const res = await fetch(`/api/timetable/views?view=faculty&id=${fId}`);
        const data = await res.json();
        setFacultyInfo(data.info);
        setFacultySchedule(data.schedule || []);
    };

    const loadRoomView = async () => {
        if (roomList.length === 0) {
            const res = await fetch('/api/timetable/views?view=room');
            const data = await res.json();
            setRoomList(data.rooms || []);
            setLabList(data.labs || []);
        }
    };

    const loadRoomSchedule = async (rId: string) => {
        setSelectedRoom(rId);
        setSelectedLab('');
        const res = await fetch(`/api/timetable/views?view=room&id=${rId}`);
        const data = await res.json();
        setRoomInfo(data.info);
        setRoomSchedule(data.schedule || []);
    };

    const loadLabSchedule = async (lId: string) => {
        setSelectedLab(lId);
        setSelectedRoom('');
        const res = await fetch(`/api/timetable/views?view=lab&id=${lId}`);
        const data = await res.json();
        setLabInfo(data.info);
        setLabSchedule(data.schedule || []);
    };

    const loadConflicts = async () => {
        const res = await fetch('/api/timetable/views?view=conflict-report');
        setConflicts(await res.json());
    };

    // Export CSV for current view
    const exportCSV = (data: TimetableEntry[], label: string) => {
        let csv = 'Period,Time,' + DAYS.join(',') + '\n';
        SCHEDULE.filter(s => s.type === 'period').forEach(s => {
            csv += `P${s.period},${s.time},`;
            DAYS.forEach((d, i) => {
                const c = data.find(t => t.day === d && t.period === s.period);
                let val = c ? c.subject_name : '-';
                if (c?.faculty_name) val += ` (${c.faculty_name})`;
                if (c?.room_name) val += ` [${c.room_name}]`;
                csv += val + (i < DAYS.length - 1 ? ',' : '');
            });
            csv += '\n';
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `timetable_${label}.csv`;
        a.click();
    };

    // Export PDF via print
    const exportPDF = () => {
        window.print();
    };

    const getCell = (data: TimetableEntry[], day: string, period: number) => data.find(t => t.day === day && t.period === period);
    const getCellType = (cell?: TimetableEntry): string => {
        if (!cell) return 'empty';
        if (cell.lab_name || cell.subject_type === 'lab') return 'lab';
        if (cell.subject_type === 'free') return 'free';
        return 'theory';
    };

    const views: { id: ViewTab; label: string; icon: typeof BookOpen }[] = [
        { id: 'class', label: 'Class-wise', icon: BookOpen },
        { id: 'faculty', label: 'Faculty-wise', icon: UserCircle },
        { id: 'room', label: 'Room-wise', icon: DoorOpen },
        { id: 'conflicts', label: 'Conflict Report', icon: AlertTriangle },
        { id: 'summary', label: 'Summary', icon: BarChart3 },
    ];

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    // Render timetable grid component
    const TimetableGrid = ({ data, title }: { data: TimetableEntry[]; title: string }) => (
        <div id="print-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                    {[{ label: 'Theory', color: '#6366f1' }, { label: 'Lab', color: '#22c55e' }, { label: 'Activity', color: '#f59e0b' }].map(l => (
                        <span key={l.label} style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: l.color, display: 'inline-block' }} />
                            {l.label} ({data.filter(d => getCellType(d) === l.label.toLowerCase()).length})
                        </span>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => exportCSV(data, title)} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
                        <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 4 }}><Download size={12} />CSV</span>
                    </button>
                    <button onClick={exportPDF} style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8, border: '1px solid rgba(99,102,241,0.15)', background: 'rgba(99,102,241,0.06)', color: '#a5b4fc', cursor: 'pointer' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Download size={12} />PDF</span>
                    </button>
                </div>
            </div>
            {data.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                    <BookOpen size={28} color="#475569" style={{ marginBottom: 8 }} />
                    <p style={{ color: '#475569', fontSize: 14 }}>No timetable data</p>
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
                                            <td colSpan={7} style={{ padding: '8px 16px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#fbbf24', background: 'linear-gradient(90deg, rgba(251,191,36,0.03), rgba(251,191,36,0.06), rgba(251,191,36,0.03))', borderTop: '1px dashed rgba(251,191,36,0.15)', borderBottom: '1px dashed rgba(251,191,36,0.15)' }}>
                                                {row.icon} {row.label} <span style={{ color: '#92400e', fontWeight: 400 }}>({row.time})</span>
                                            </td>
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
                                            const cell = getCell(data, d, p);
                                            const type = getCellType(cell);
                                            const colors = CELL_COLORS[type];
                                            return (
                                                <td key={d} style={{ padding: '4px 3px', textAlign: 'center', verticalAlign: 'top' }}>
                                                    {cell ? (
                                                        <div style={{ padding: '7px 5px', borderRadius: 8, minHeight: 42, background: colors.bg, border: `1px solid ${colors.border}`, transition: 'all 0.2s ease' }}
                                                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 4px 15px ${colors.border}`; }}
                                                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                                            <p style={{ fontSize: 11, fontWeight: 600, color: colors.text, lineHeight: 1.3 }}>{cell.subject_name}</p>
                                                            {(cell.room_name || cell.lab_name) && <p style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>{cell.lab_name ? `🔬 ${cell.lab_name}` : `📍 ${cell.room_name}`}</p>}
                                                            {cell.faculty_name && <p style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>👤 {cell.faculty_name}</p>}
                                                            {(cell.year || cell.section_name) && <p style={{ fontSize: 9, color: '#475569', marginTop: 1 }}>🎓 Y{cell.year}-{cell.section_name}</p>}
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
        </div>
    );

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <BookOpen size={24} color="#6366f1" />Generated Timetables
                    </h1>
                    <p style={{ color: '#64748b', fontSize: 14 }}>View class-wise, faculty-wise, and room-wise timetables</p>
                </div>
            </div>

            {/* Stale Banner */}
            {genSummary?.is_stale && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '12px 18px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <RefreshCw size={16} color="#f59e0b" />
                    <span style={{ fontSize: 13, color: '#fbbf24', flex: 1 }}>Input data has changed since last generation. Timetable may be outdated.</span>
                    <a href="/admin/timetable" style={{ fontSize: 12, color: '#818cf8', fontWeight: 500, textDecoration: 'none' }}>Regenerate →</a>
                </motion.div>
            )}

            {/* View Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.06)', width: 'fit-content', flexWrap: 'wrap' }}>
                {views.map(v => (
                    <button key={v.id} onClick={() => {
                        setActiveView(v.id);
                        if (v.id === 'faculty') loadFacultyView();
                        if (v.id === 'room') loadRoomView();
                        if (v.id === 'conflicts') loadConflicts();
                    }} style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: 'none',
                        background: activeView === v.id ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))' : 'transparent',
                        color: activeView === v.id ? '#a5b4fc' : '#64748b', fontWeight: activeView === v.id ? 600 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
                    }}><v.icon size={15} />{v.label}</button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {/* Class-wise View */}
                {activeView === 'class' && (
                    <motion.div key="class" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {/* Class Selector */}
                        <div style={{ position: 'relative', marginBottom: 20 }}>
                            <button onClick={() => setShowDropdown(!showDropdown)} style={{
                                padding: '12px 20px', borderRadius: 12, border: '1px solid rgba(99,102,241,0.15)',
                                background: 'rgba(15,23,42,0.4)', color: '#f1f5f9', fontSize: 14, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 10, minWidth: 220,
                            }}>
                                <BookOpen size={16} color="#818cf8" />
                                {selectedClass ? classes.find(c => c.id === selectedClass)?.section_name ? `Year ${classes.find(c => c.id === selectedClass)?.year} — ${classes.find(c => c.id === selectedClass)?.section_name}` : 'Select' : 'Select a class'}
                                <ChevronDown size={14} color="#64748b" style={{ marginLeft: 'auto' }} />
                            </button>
                            {showDropdown && (
                                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, borderRadius: 12, background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(99,102,241,0.15)', zIndex: 50, minWidth: 220, backdropFilter: 'blur(12px)' }}>
                                    {classes.map(c => (
                                        <button key={c.id} onClick={() => { loadClassTT(c.id); setShowDropdown(false); }}
                                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', background: c.id === selectedClass ? 'rgba(99,102,241,0.1)' : 'transparent', color: c.id === selectedClass ? '#a5b4fc' : '#94a3b8', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                                            Year {c.year} — Section {c.section_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {selectedClass && <TimetableGrid data={timetable} title={`class_${selectedClass}`} />}
                        {!selectedClass && (
                            <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                <BookOpen size={28} color="#475569" style={{ marginBottom: 8 }} />
                                <p style={{ color: '#475569', fontSize: 14 }}>Select a class to view its timetable</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Faculty-wise View */}
                {activeView === 'faculty' && (
                    <motion.div key="faculty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 16 }}>
                            {/* Faculty List */}
                            <div style={{ borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)', maxHeight: 600, overflowY: 'auto' }}>
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(99,102,241,0.06)', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                                    {facultyList.length} Faculty Members
                                </div>
                                {facultyList.map(f => (
                                    <button key={f.id} onClick={() => loadFacultySchedule(f.id)}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                                            border: 'none', borderBottom: '1px solid rgba(99,102,241,0.04)',
                                            background: selectedFaculty === f.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                            color: selectedFaculty === f.id ? '#a5b4fc' : '#94a3b8', cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        <p style={{ fontSize: 13, fontWeight: selectedFaculty === f.id ? 600 : 400 }}>{f.name}</p>
                                        <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{f.total_periods} periods/week</p>
                                    </button>
                                ))}
                            </div>
                            {/* Faculty Schedule */}
                            <div>
                                {selectedFaculty && facultyInfo ? (
                                    <>
                                        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <UserCircle size={18} color="#818cf8" />
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{facultyInfo.name}</p>
                                                <p style={{ fontSize: 11, color: '#64748b' }}>{facultyInfo.email} · {facultyInfo.department}</p>
                                            </div>
                                        </div>
                                        <TimetableGrid data={facultySchedule} title={`faculty_${facultyInfo.name}`} />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                        <UserCircle size={28} color="#475569" style={{ marginBottom: 8 }} />
                                        <p style={{ color: '#475569', fontSize: 14 }}>Select a faculty member to view their schedule</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Room-wise View */}
                {activeView === 'room' && (
                    <motion.div key="room" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: 16 }}>
                            {/* Room & Lab List */}
                            <div style={{ borderRadius: 14, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)', maxHeight: 600, overflowY: 'auto' }}>
                                {/* Classrooms Section */}
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(99,102,241,0.06)', fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <DoorOpen size={13} /> {roomList.length} Classrooms
                                </div>
                                {roomList.map(r => (
                                    <button key={r.id} onClick={() => loadRoomSchedule(r.id)}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                                            border: 'none', borderBottom: '1px solid rgba(99,102,241,0.04)',
                                            background: selectedRoom === r.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                                            color: selectedRoom === r.id ? '#a5b4fc' : '#94a3b8', cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        <p style={{ fontSize: 13, fontWeight: selectedRoom === r.id ? 600 : 400 }}>{r.name}</p>
                                        <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>Cap: {r.capacity} · {r.booked_periods} booked</p>
                                    </button>
                                ))}
                                {/* Labs Section */}
                                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(34,197,94,0.1)', borderTop: '2px solid rgba(34,197,94,0.15)', fontSize: 12, color: '#86efac', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.03)' }}>
                                    🔬 {labList.length} Labs
                                </div>
                                {labList.map(l => (
                                    <button key={l.id} onClick={() => loadLabSchedule(l.id)}
                                        style={{
                                            display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px',
                                            border: 'none', borderBottom: '1px solid rgba(34,197,94,0.04)',
                                            background: selectedLab === l.id ? 'rgba(34,197,94,0.08)' : 'transparent',
                                            color: selectedLab === l.id ? '#86efac' : '#94a3b8', cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                        }}>
                                        <p style={{ fontSize: 13, fontWeight: selectedLab === l.id ? 600 : 400 }}>{l.name}</p>
                                        <p style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{l.lab_type_name} · Cap: {l.capacity} · {l.booked_periods} booked</p>
                                    </button>
                                ))}
                            </div>
                            <div>
                                {selectedRoom && roomInfo ? (
                                    <>
                                        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <DoorOpen size={18} color="#818cf8" />
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{roomInfo.name}</p>
                                                <p style={{ fontSize: 11, color: '#64748b' }}>Capacity: {roomInfo.capacity}</p>
                                            </div>
                                        </div>
                                        <TimetableGrid data={roomSchedule} title={`room_${roomInfo.name}`} />
                                    </>
                                ) : selectedLab && labInfo ? (
                                    <>
                                        <div style={{ padding: '12px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ fontSize: 18 }}>🔬</span>
                                            <div>
                                                <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{labInfo.name}</p>
                                                <p style={{ fontSize: 11, color: '#64748b' }}>{labInfo.lab_type_name} · Capacity: {labInfo.capacity}</p>
                                            </div>
                                        </div>
                                        <TimetableGrid data={labSchedule} title={`lab_${labInfo.name}`} />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                        <DoorOpen size={28} color="#475569" style={{ marginBottom: 8 }} />
                                        <p style={{ color: '#475569', fontSize: 14 }}>Select a room or lab to view its schedule</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Conflict Report */}
                {activeView === 'conflicts' && (
                    <motion.div key="conflicts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {conflicts ? (
                            <div style={{ borderRadius: 18, padding: 24, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                    {conflicts.status === 'clean' ? <CheckCircle size={20} color="#22c55e" /> : <AlertTriangle size={20} color="#f59e0b" />}
                                    <h3 style={{ fontSize: 18, fontWeight: 600, color: conflicts.status === 'clean' ? '#22c55e' : '#fbbf24' }}>
                                        {conflicts.status === 'clean' ? 'No Conflicts Detected' : `${conflicts.total_conflicts} Conflict(s) Found`}
                                    </h3>
                                </div>
                                {conflicts.conflicts.length > 0 && (
                                    <div style={{ display: 'grid', gap: 8 }}>
                                        {conflicts.conflicts.map((c, i) => (
                                            <div key={i} style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <AlertTriangle size={14} color="#f59e0b" style={{ flexShrink: 0 }} />
                                                <span style={{ fontSize: 13, color: '#94a3b8' }}>{c}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {conflicts.status === 'clean' && (
                                    <p style={{ fontSize: 13, color: '#64748b', marginTop: 12 }}>
                                        ✅ All hard constraints are satisfied. No faculty double-bookings, no room conflicts, and all availability restrictions are respected.
                                    </p>
                                )}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
                                <p style={{ color: '#475569' }}>Loading conflict report...</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Summary View */}
                {activeView === 'summary' && (
                    <motion.div key="summary" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        {genSummary?.last_generation ? (() => {
                            const lg = genSummary.last_generation;
                            const scores: SoftScore | null = lg.soft_score_json ? JSON.parse(lg.soft_score_json) : null;
                            return (
                                <div style={{ borderRadius: 18, padding: 28, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                                        <BarChart3 size={20} color="#818cf8" />
                                        <h3 style={{ fontSize: 18, fontWeight: 600, color: '#f1f5f9' }}>Last Generation Summary</h3>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
                                        {[
                                            { label: 'Status', value: lg.status, color: lg.status === 'success' ? '#22c55e' : '#f59e0b' },
                                            { label: 'Execution Time', value: lg.execution_time_ms < 1000 ? `${lg.execution_time_ms}ms` : `${(lg.execution_time_ms / 1000).toFixed(1)}s`, color: lg.execution_time_ms < 5000 ? '#22c55e' : '#f59e0b' },
                                            { label: 'Total Slots', value: `${lg.total_slots}`, color: '#6366f1' },
                                            { label: 'Generated At', value: new Date(lg.created_at).toLocaleString(), color: '#94a3b8' },
                                        ].map(s => (
                                            <div key={s.label} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(99,102,241,0.03)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                                <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</p>
                                                <p style={{ fontSize: 16, fontWeight: 600, color: s.color, marginTop: 4, textTransform: 'capitalize' }}>{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {scores && (
                                        <>
                                            <h4 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12 }}>Soft Constraint Quality</h4>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                                                {[
                                                    { label: 'Overall Score', value: scores.total_score, good: scores.total_score >= 0, desc: 'Higher is better' },
                                                    { label: 'Distribution Score', value: scores.distribution_score, good: true, desc: 'Subject spread across days' },
                                                    { label: 'Consecutive Violations', value: scores.consecutive_violations, good: scores.consecutive_violations === 0, desc: 'Faculty >3 consecutive' },
                                                    { label: 'Back-to-back Labs', value: scores.back_to_back_labs, good: scores.back_to_back_labs === 0, desc: 'Adjacent lab sessions' },
                                                    { label: 'Room Switches', value: scores.room_switches, good: scores.room_switches <= 2, desc: 'Class room changes/day' },
                                                ].map(s => (
                                                    <div key={s.label} style={{ padding: '14px 16px', borderRadius: 12, background: s.good ? 'rgba(34,197,94,0.04)' : 'rgba(245,158,11,0.04)', border: `1px solid ${s.good ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)'}` }}>
                                                        <p style={{ fontSize: 11, color: '#64748b' }}>{s.label}</p>
                                                        <p style={{ fontSize: 22, fontWeight: 700, color: s.good ? '#22c55e' : '#f59e0b', marginTop: 4 }}>{s.value}</p>
                                                        <p style={{ fontSize: 10, color: '#475569', marginTop: 4 }}>{s.desc}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })() : (
                            <div style={{ textAlign: 'center', padding: 50, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                                <BarChart3 size={28} color="#475569" style={{ marginBottom: 8 }} />
                                <p style={{ color: '#475569', fontSize: 14 }}>No generation data yet</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Print styles */}
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    #print-area table { background: white !important; color: #000 !important; }
                    #print-area th, #print-area td { border: 1px solid #ddd !important; color: #000 !important; background: white !important; }
                    #print-area div { background: white !important; color: #000 !important; border-color: #ddd !important; }
                    #print-area p { color: #333 !important; }
                }
            `}</style>
        </div>
    );
}
