'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';

export default function StudentLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        if (!formData.email) { setErrors({ email: 'Email is required' }); return; }
        if (!formData.password) { setErrors({ password: 'Password is required' }); return; }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (!res.ok) { setErrors({ password: data.error || 'Invalid credentials' }); setLoading(false); return; }
            if (data.user.role !== 'student') { setErrors({ email: 'Not a student account' }); await fetch('/api/auth/logout', { method: 'POST' }); setLoading(false); return; }
            toast.success('Welcome back!');
            router.push('/student');
        } catch { toast.error('Something went wrong.'); } finally { setLoading(false); }
    };

    return (
        <AuthLayout title="Student Login" subtitle="Access your timetable and courses">
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label className="form-label">Email Address</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="glass-input" placeholder="you@email.com" />{errors.email && <p className="form-error">{errors.email}</p>}</div>
                <div className="form-group"><label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}><input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange} className="glass-input" placeholder="Enter your password" style={{ paddingRight: 48 }} /><button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
                    {errors.password && <p className="form-error">{errors.password}</p>}
                </div>
                <div style={{ textAlign: 'right', marginBottom: 8 }}><Link href="/auth/student/forgot-password" style={{ fontSize: 13, color: '#818cf8' }}>Forgot Password?</Link></div>
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}><span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>{loading && <span className="spinner" />}{loading ? 'Signing In...' : 'Sign In'}</span></button>
                <p style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#94a3b8' }}>Don&apos;t have an account? <Link href="/auth/student/register" style={{ color: '#818cf8', fontWeight: 600 }}>Register</Link></p>
            </form>
        </AuthLayout>
    );
}
