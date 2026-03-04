'use client';

import BackButton from '@/components/admin/BackButton';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Send, MessageCircle, Radio } from 'lucide-react';

interface ConvoItem { id: string; other_name: string; other_id: string; last_message?: string; unread: boolean; type: string; }
interface MsgItem { id: string; content: string; sender_id: string; sender_name: string; created_at: string; }
interface UserItem { id: string; name: string; email: string; role: string; }

export default function AdminMessagesPage() {
    const [profile, setProfile] = useState<{ id: string } | null>(null);
    const [convos, setConvos] = useState<ConvoItem[]>([]);
    const [messages, setMessages] = useState<MsgItem[]>([]);
    const [activeConvo, setActiveConvo] = useState<ConvoItem | null>(null);
    const [msgInput, setMsgInput] = useState('');
    const [tab, setTab] = useState<'chats' | 'broadcast'>('chats');
    const [broadcastTarget, setBroadcastTarget] = useState('all');
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [users, setUsers] = useState<UserItem[]>([]);
    const [searchUser, setSearchUser] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/data?table=profile').then(r => r.json()),
            fetch('/api/data?table=conversations').then(r => r.json()),
            fetch('/api/data?table=all-users').then(r => r.json()),
        ]).then(([p, c, u]) => { setProfile(p); setConvos(Array.isArray(c) ? c : []); setUsers(Array.isArray(u) ? u.filter((x: UserItem) => x.id !== p?.id) : []); });
    }, []);

    const openConvo = async (convo: ConvoItem) => { setActiveConvo(convo); const res = await fetch(`/api/data?table=messages&conversation_id=${convo.id}`); setMessages(await res.json()); };

    const sendMessage = async () => {
        if (!msgInput.trim() || !activeConvo) return;
        await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send-message', conversation_id: activeConvo.id, content: msgInput.trim() }) });
        setMsgInput(''); const res = await fetch(`/api/data?table=messages&conversation_id=${activeConvo.id}`); setMessages(await res.json());
    };

    const startChat = async (userId: string) => {
        const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create-conversation', other_id: userId }) });
        const data = await res.json();
        const u = users.find(x => x.id === userId);
        const convo = { id: data.id, other_name: u?.name || 'User', other_id: userId, unread: false, type: 'direct' };
        setActiveConvo(convo); setMessages([]); setSearchUser('');
    };

    const sendBroadcast = async () => {
        if (!broadcastMsg.trim()) return;
        setSending(true);
        try {
            const res = await fetch('/api/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'broadcast', target: broadcastTarget, content: broadcastMsg.trim() }) });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || 'Failed to send broadcast'); setSending(false); return; }
            toast.success(`Broadcast sent to ${data.count || 0} users`);
            setBroadcastMsg('');
        } catch (err) {
            toast.error('Network error sending broadcast');
            console.error('Broadcast error:', err);
        } finally {
            setSending(false);
        }
    };

    const filteredUsers = users.filter(u => searchUser && u.name.toLowerCase().includes(searchUser.toLowerCase()));

    return (
        <div>
            <BackButton />
            <h1 style={{ fontSize: 26, fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>Messages</h1>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Direct messages and broadcasts</p>

            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                <button onClick={() => setTab('chats')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `1px solid ${tab === 'chats' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`, background: tab === 'chats' ? 'rgba(99,102,241,0.12)' : 'transparent', color: tab === 'chats' ? '#818cf8' : '#94a3b8', cursor: 'pointer', fontSize: 14 }}><MessageCircle size={16} />Chats</button>
                <button onClick={() => setTab('broadcast')} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, border: `1px solid ${tab === 'broadcast' ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`, background: tab === 'broadcast' ? 'rgba(99,102,241,0.12)' : 'transparent', color: tab === 'broadcast' ? '#818cf8' : '#94a3b8', cursor: 'pointer', fontSize: 14 }}><Radio size={16} />Broadcast</button>
            </div>

            {tab === 'chats' && (
                <div style={{ display: 'grid', gridTemplateColumns: activeConvo ? '300px 1fr' : '1fr', gap: 16 }}>
                    <div>
                        <input value={searchUser} onChange={e => setSearchUser(e.target.value)} className="glass-input" placeholder="Search users to chat..." style={{ marginBottom: 12 }} />
                        {filteredUsers.length > 0 && (
                            <div className="glass" style={{ marginBottom: 12, padding: 8 }}>
                                {filteredUsers.slice(0, 5).map(u => (
                                    <button key={u.id} onClick={() => startChat(u.id)} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6 }}>
                                        <span style={{ fontSize: 13, color: '#f1f5f9' }}>{u.name}</span> <span style={{ fontSize: 11, color: '#64748b' }}>({u.role})</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div style={{ display: 'grid', gap: 6 }}>
                            {convos.map(c => (
                                <button key={c.id} onClick={() => openConvo(c)} style={{ padding: '12px 14px', borderRadius: 8, textAlign: 'left', cursor: 'pointer', background: activeConvo?.id === c.id ? 'rgba(99,102,241,0.1)' : 'rgba(15,23,42,0.3)', border: `1px solid ${activeConvo?.id === c.id ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.06)'}` }}>
                                    <p style={{ fontSize: 14, fontWeight: 500, color: '#f1f5f9' }}>{c.other_name}</p>
                                    <p style={{ fontSize: 12, color: '#64748b' }}>{c.last_message || 'No messages'}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeConvo && (
                        <div className="glass" style={{ height: 450, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(99,102,241,0.1)' }}><p style={{ fontWeight: 600, color: '#f1f5f9' }}>{activeConvo.other_name}</p></div>
                            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {messages.map(m => (
                                    <div key={m.id} style={{ alignSelf: m.sender_id === profile?.id ? 'flex-end' : 'flex-start', maxWidth: '70%', padding: '10px 14px', borderRadius: 12, background: m.sender_id === profile?.id ? 'rgba(99,102,241,0.15)' : 'rgba(30,30,60,0.5)' }}>
                                        <p style={{ fontSize: 13, color: '#f1f5f9' }}>{m.content}</p>
                                        <p style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                ))}
                            </div>
                            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.1)', display: 'flex', gap: 8 }}>
                                <input value={msgInput} onChange={e => setMsgInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="glass-input" placeholder="Type a message..." style={{ flex: 1 }} />
                                <button onClick={sendMessage} className="btn-primary" style={{ padding: '10px 16px' }}><span style={{ position: 'relative', zIndex: 1 }}><Send size={16} /></span></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === 'broadcast' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="glass" style={{ padding: 24, maxWidth: 500 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#f1f5f9', marginBottom: 16 }}>Send Broadcast</h3>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                            {['all', 'students', 'faculty'].map(t => (
                                <button key={t} onClick={() => setBroadcastTarget(t)} style={{ padding: '8px 16px', borderRadius: 8, border: `1px solid ${broadcastTarget === t ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.1)'}`, background: broadcastTarget === t ? 'rgba(99,102,241,0.12)' : 'transparent', color: broadcastTarget === t ? '#818cf8' : '#94a3b8', cursor: 'pointer', fontSize: 13, textTransform: 'capitalize' }}>{t}</button>
                            ))}
                        </div>
                        <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} className="glass-input" placeholder="Type your broadcast message..." rows={4} style={{ resize: 'none', marginBottom: 12, display: 'block', width: '100%' }} />
                        <button onClick={sendBroadcast} disabled={sending} className="btn-primary" style={{ padding: '12px 24px' }}><span style={{ position: 'relative', zIndex: 1 }}>{sending ? 'Sending...' : 'Send Broadcast'}</span></button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
