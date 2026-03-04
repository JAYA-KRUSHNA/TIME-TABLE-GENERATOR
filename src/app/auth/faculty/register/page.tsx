'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { validatePassword, validateEmail } from '@/lib/validators';

export default function FacultyRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        department: 'CSE',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const passwordValidation = validatePassword(formData.password);

    const [registered, setRegistered] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!validateEmail(formData.email)) newErrors.email = 'Valid email is required';
        if (!passwordValidation.valid) newErrors.password = passwordValidation.errors[0];
        if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register-faculty', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error?.includes('email')) {
                    setErrors({ email: 'Email already registered' });
                } else {
                    toast.error(data.error || 'Registration failed');
                }
                return;
            }

            setRegistered(false);
            toast.success('OTP sent to your email!');
            router.push(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}&role=faculty`);
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const departments = ['CSE', 'EEE', 'Data Science', 'AI & ML', 'ECE', 'Mechanical', 'Civil'];

    if (registered) {
        return (
            <AuthLayout title="Registration Submitted" subtitle="Your account is pending approval">
                <div style={{
                    textAlign: 'center',
                    padding: '20px 0',
                }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'rgba(99, 102, 241, 0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                    }}>
                        <span style={{ fontSize: 36 }}>⏳</span>
                    </div>
                    <h3 style={{ color: '#e2e8f0', fontSize: 20, fontWeight: 600, marginBottom: 12 }}>
                        Please Wait for Approval
                    </h3>
                    <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                        Your faculty account has been created successfully. An administrator will review and approve your account.
                        You will be able to log in once your account is approved.
                    </p>
                    <div style={{
                        background: 'rgba(34, 197, 94, 0.08)',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        borderRadius: 10,
                        padding: '12px 16px',
                        fontSize: 13,
                        color: '#86efac',
                        marginBottom: 24,
                    }}>
                        ✅ Registration successful for <strong>{formData.email}</strong>
                    </div>
                    <Link href="/auth/faculty/login" className="btn-primary" style={{
                        display: 'inline-block', padding: '12px 32px', textDecoration: 'none',
                    }}>
                        Go to Login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title="Faculty Registration" subtitle="Join OptiSchedule as Faculty">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="glass-input" placeholder="Enter your full name" />
                    {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="glass-input" placeholder="you@email.com" />
                    {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                <div className="form-group">
                    <label className="form-label">Department</label>
                    <select name="department" value={formData.department} onChange={handleChange} className="glass-input" style={{ cursor: 'pointer' }}>
                        {departments.map((dept) => (
                            <option key={dept} value={dept} style={{ background: '#0f172a' }}>{dept}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label className="form-label">Password</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="glass-input"
                            placeholder="Create a strong password"
                            style={{ paddingRight: 48 }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                                background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && <p className="form-error">{errors.password}</p>}
                    {formData.password && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                { label: 'Min 8 characters', test: formData.password.length >= 8 },
                                { label: 'Uppercase letter', test: /[A-Z]/.test(formData.password) },
                                { label: 'Lowercase letter', test: /[a-z]/.test(formData.password) },
                                { label: 'Number', test: /[0-9]/.test(formData.password) },
                                { label: 'Special character', test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) },
                            ].map((req) => (
                                <div key={req.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: req.test ? '#22c55e' : '#64748b' }}>
                                    {req.test ? <Check size={12} /> : <X size={12} />}
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="glass-input" placeholder="Re-enter your password" />
                    {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>

                {/* Notice */}
                <div style={{
                    background: 'rgba(99, 102, 241, 0.08)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: 10,
                    padding: '12px 16px',
                    marginBottom: 20,
                    fontSize: 13,
                    color: '#94a3b8',
                    lineHeight: 1.6,
                }}>
                    ℹ️ After registration, your account will require <strong style={{ color: '#818cf8' }}>admin approval</strong> before you can log in.
                </div>

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {loading && <span className="spinner" />}
                        {loading ? 'Registering...' : 'Register as Faculty'}
                    </span>
                </button>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <p style={{ color: '#64748b', fontSize: 14 }}>
                        Already registered?{' '}
                        <Link href="/auth/faculty/login" className="link-accent">Sign In</Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}

