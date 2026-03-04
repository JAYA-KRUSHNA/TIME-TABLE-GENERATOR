'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Clock, CheckCircle, XCircle, AlertTriangle, BarChart3, Calendar } from 'lucide-react';

interface LogEntry {
    id: string;
    timestamp: string;
    execution_time_ms: number;
    class_ids_json: string;
    status: string;
    total_slots: number;
    conflict_count: number;
    soft_score_json: string;
    error_message: string | null;
    created_at: string;
}

export default function GenerationLogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/timetable/views?view=generation-summary')
            .then(r => r.json())
            .then(data => { setLogs(data.recent_logs || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const statusIcon = (status: string) => {
        if (status === 'success') return <CheckCircle size={16} color="#22c55e" />;
        if (status === 'failed') return <XCircle size={16} color="#ef4444" />;
        return <AlertTriangle size={16} color="#f59e0b" />;
    };

    const statusColor = (status: string) => {
        if (status === 'success') return '#22c55e';
        if (status === 'failed') return '#ef4444';
        return '#f59e0b';
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 32, height: 32 }} /></div>;

    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    const avgTime = logs.length > 0 ? Math.round(logs.reduce((s, l) => s + l.execution_time_ms, 0) / logs.length) : 0;

    return (
        <div>
            <BackButton />
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Activity size={24} color="#6366f1" />Generation Logs
                </h1>
                <p style={{ color: '#64748b', fontSize: 14 }}>History of timetable generation attempts with performance metrics</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                {[
                    { label: 'Total Runs', value: logs.length, icon: Calendar, color: '#6366f1' },
                    { label: 'Successful', value: successCount, icon: CheckCircle, color: '#22c55e' },
                    { label: 'Failed', value: failedCount, icon: XCircle, color: '#ef4444' },
                    { label: 'Avg Time', value: `${avgTime}ms`, icon: Clock, color: '#f59e0b' },
                ].map((stat, i) => (
                    <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        style={{ flex: 1, padding: '14px 16px', borderRadius: 14, background: `linear-gradient(135deg, ${stat.color}08, ${stat.color}03)`, border: `1px solid ${stat.color}12` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <stat.icon size={16} color={stat.color} />
                            <div>
                                <p style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{stat.label}</p>
                                <p style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{stat.value}</p>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Logs Table */}
            {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 60, borderRadius: 16, background: 'rgba(15,23,42,0.3)', border: '1px solid rgba(99,102,241,0.06)' }}>
                    <Activity size={32} color="#475569" style={{ marginBottom: 12 }} />
                    <p style={{ color: '#475569', fontSize: 14 }}>No generation logs yet</p>
                    <p style={{ color: '#334155', fontSize: 12, marginTop: 4 }}>Generate a timetable to see logs here</p>
                </div>
            ) : (
                <div style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(99,102,241,0.1)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(99,102,241,0.06)' }}>
                                {['Status', 'Timestamp', 'Duration', 'Classes', 'Slots', 'Conflicts', 'Quality Score', 'Details'].map(h => (
                                    <th key={h} style={{ padding: '12px 14px', fontSize: 11, color: '#64748b', textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid rgba(99,102,241,0.08)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log, i) => {
                                const softScore = log.soft_score_json ? JSON.parse(log.soft_score_json) : null;
                                const classIds = log.class_ids_json ? JSON.parse(log.class_ids_json) : [];
                                return (
                                    <motion.tr key={log.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                                        style={{
                                            borderBottom: '1px solid rgba(99,102,241,0.04)',
                                            background: log.status === 'failed' ? 'rgba(239,68,68,0.03)' : 'transparent',
                                        }}>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {statusIcon(log.status)}
                                                <span style={{ fontSize: 12, fontWeight: 500, color: statusColor(log.status), textTransform: 'capitalize' }}>{log.status}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>
                                            {new Date(log.created_at).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: log.execution_time_ms < 5000 ? '#22c55e' : log.execution_time_ms < 15000 ? '#f59e0b' : '#ef4444', fontFamily: 'monospace' }}>
                                                {log.execution_time_ms < 1000 ? `${log.execution_time_ms}ms` : `${(log.execution_time_ms / 1000).toFixed(1)}s`}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>{classIds.length}</td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#94a3b8' }}>{log.total_slots}</td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <span style={{ fontSize: 12, fontWeight: 500, color: log.conflict_count === 0 ? '#22c55e' : '#f59e0b' }}>{log.conflict_count}</span>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            {softScore ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <BarChart3 size={12} color="#818cf8" />
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: softScore.total_score >= 0 ? '#22c55e' : '#f59e0b', fontFamily: 'monospace' }}>
                                                        {softScore.total_score}
                                                    </span>
                                                </div>
                                            ) : <span style={{ color: '#475569', fontSize: 12 }}>—</span>}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 11, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {log.error_message || (softScore ? `Dist:${softScore.distribution_score} Consec:${softScore.consecutive_violations} Labs:${softScore.back_to_back_labs}` : '—')}
                                        </td>
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
