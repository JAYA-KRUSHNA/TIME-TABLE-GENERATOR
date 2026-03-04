'use client';

import BackButton from '@/components/admin/BackButton';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Upload, FileText, Users, BookOpen, DoorOpen, CheckCircle, XCircle, AlertTriangle, Download, Info } from 'lucide-react';

const TEMPLATES = [
    {
        type: 'student',
        label: 'Students',
        icon: Users,
        color: '#6366f1',
        columns: 'name,email,reg_no,year,section,department',
        sample: 'name,email,reg_no,year,section,department\nJohn Doe,john@example.com,22B01A0501,3,A,CSE\nJane Smith,jane@example.com,22B01A0502,3,A,CSE',
    },
    {
        type: 'faculty',
        label: 'Faculty',
        icon: BookOpen,
        color: '#22c55e',
        columns: 'name,email,department',
        sample: 'name,email,department\nDr. Kumar,kumar@example.com,CSE\nProf. Singh,singh@example.com,CSE',
    },
    {
        type: 'subjects',
        label: 'Subjects',
        icon: FileText,
        color: '#f59e0b',
        columns: 'name,subject_code,type,hours_per_week',
        sample: 'name,subject_code,type,hours_per_week\nData Structures,CS301,theory,4\nOS Lab,CS302L,lab,3',
    },
    {
        type: 'rooms',
        label: 'Rooms',
        icon: DoorOpen,
        color: '#8b5cf6',
        columns: 'name,capacity,type',
        sample: 'name,capacity,type\nRoom 101,70,theory\nRoom 102,70,theory\nLab 201,35,lab',
    },
];

interface UploadResult {
    type: string;
    inserted: number;
    skipped: number;
    errors: string[];
}

export default function DataImportPage() {
    const [dragging, setDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            toast.error('Please upload a CSV file');
            return;
        }

        setUploading(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/csv/upload', { method: 'POST', body: formData });
            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Upload failed');
                setResult({ type: 'error', inserted: 0, skipped: 0, errors: [data.error] });
            } else {
                setResult(data);
                if (data.inserted > 0) toast.success(`Imported ${data.inserted} ${data.type}(s)`);
                if (data.skipped > 0) toast(`${data.skipped} rows skipped`, { icon: '⚠️' });
            }
        } catch (err) {
            toast.error('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const downloadTemplate = (template: typeof TEMPLATES[0]) => {
        const blob = new Blob([template.sample], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${template.type}_template.csv`;
        a.click();
    };

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Upload size={24} color="#6366f1" />Data Import
                </h1>
                <p style={{ color: '#64748b', fontSize: 14 }}>Upload CSV files to bulk-import students, faculty, subjects, or rooms</p>
            </div>

            {/* Upload Zone */}
            <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                onClick={() => fileRef.current?.click()}
                style={{
                    padding: '48px 32px', borderRadius: 18, textAlign: 'center', cursor: 'pointer',
                    background: dragging ? 'rgba(99,102,241,0.08)' : 'rgba(15,23,42,0.4)',
                    border: `2px dashed ${dragging ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.15)'}`,
                    transition: 'all 0.3s ease', marginBottom: 24,
                }}
            >
                <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
                <motion.div
                    animate={uploading ? { rotate: 360 } : {}}
                    transition={{ duration: 1, repeat: uploading ? Infinity : 0, ease: 'linear' }}
                    style={{ width: 56, height: 56, borderRadius: 14, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: '1px solid rgba(99,102,241,0.15)' }}
                >
                    <Upload size={24} color="#818cf8" />
                </motion.div>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 }}>
                    {uploading ? 'Uploading...' : dragging ? 'Drop your CSV here' : 'Drop CSV file here or click to browse'}
                </p>
                <p style={{ fontSize: 12, color: '#64748b' }}>
                    Auto-detects: Students, Faculty, Subjects, or Rooms based on column headers
                </p>
            </motion.div>

            {/* Info Box */}
            <div style={{ padding: '14px 18px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)', marginBottom: 24, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <Info size={16} color="#818cf8" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                    <strong style={{ color: '#a5b4fc' }}>Validation rules:</strong> Duplicate emails and reg numbers are rejected. Student sections are capped at 70 members.
                    Faculty are auto-approved. All fields are validated before insertion.
                </div>
            </div>

            {/* Results */}
            <AnimatePresence>
                {result && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        style={{ borderRadius: 18, padding: 24, background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.08)', marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                            {result.inserted > 0 ? <CheckCircle size={20} color="#22c55e" /> : <AlertTriangle size={20} color="#f59e0b" />}
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9' }}>
                                Import Result — {result.type?.charAt(0).toUpperCase() + result.type?.slice(1)}
                            </h3>
                        </div>

                        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                            <div style={{ flex: 1, padding: '14px 16px', borderRadius: 12, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)' }}>
                                <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Inserted</p>
                                <p style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{result.inserted}</p>
                            </div>
                            <div style={{ flex: 1, padding: '14px 16px', borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
                                <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase' }}>Skipped</p>
                                <p style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{result.skipped}</p>
                            </div>
                        </div>

                        {result.errors.length > 0 && (
                            <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 10, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)', padding: 14 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: '#f87171', marginBottom: 8 }}>
                                    <XCircle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                    {result.errors.length} Issue(s)
                                </p>
                                {result.errors.map((err, i) => (
                                    <p key={i} style={{ fontSize: 11, color: '#94a3b8', padding: '3px 0', borderBottom: i < result.errors.length - 1 ? '1px solid rgba(239,68,68,0.06)' : 'none' }}>
                                        {err}
                                    </p>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Templates */}
            <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Download Templates
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
                    {TEMPLATES.map((t, i) => (
                        <motion.div key={t.type} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                            onClick={() => downloadTemplate(t)}
                            style={{
                                padding: 18, borderRadius: 14, cursor: 'pointer',
                                background: 'rgba(15,23,42,0.3)', border: `1px solid ${t.color}15`,
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = `${t.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = `${t.color}15`; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${t.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.color}20` }}>
                                    <t.icon size={16} color={t.color} />
                                </div>
                                <div>
                                    <p style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{t.label}</p>
                                    <p style={{ fontSize: 10, color: '#64748b' }}>CSV Template</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: t.color }}>
                                <Download size={12} /> Download Template
                            </div>
                            <p style={{ fontSize: 10, color: '#475569', marginTop: 6, fontFamily: 'monospace' }}>{t.columns}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
