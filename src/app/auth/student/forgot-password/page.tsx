'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Eye, EyeOff } from 'lucide-react';
import { validatePassword } from '@/lib/validators';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
    const [loading, setLoading] = useState(false);
    const [regNo, setRegNo] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleFindAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!regNo.trim()) {
            setErrors({ regNo: 'Registration number is required' });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reg_no: regNo, action: 'find' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrors({ regNo: data.error || 'Account not found' });
                return;
            }
            setEmail(data.email);
            toast.success('OTP sent to your email!');
            setStep('otp');
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setErrors({ otp: 'Enter 6-digit OTP' });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp, purpose: 'password_reset' }),
            });
            const data = await res.json();
            if (!res.ok) {
                setErrors({ otp: data.error || 'Invalid OTP' });
                return;
            }
            setStep('reset');
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const validation = validatePassword(newPassword);
        if (!validation.valid) {
            setErrors({ password: validation.errors[0] });
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrors({ confirmPassword: 'Passwords do not match' });
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, action: 'reset', password: newPassword }),
            });
            if (!res.ok) {
                const data = await res.json();
                toast.error(data.error || 'Failed to reset');
                return;
            }
            toast.success('Password reset successful!');
            router.push('/auth/student/login');
        } catch {
            toast.error('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Reset Password" subtitle={
            step === 'email' ? 'Enter your registration number to find your account' :
                step === 'otp' ? `Enter the OTP sent to ${email}` :
                    'Create a new password'
        }>
            {step === 'email' && (
                <form onSubmit={handleFindAccount}>
                    <div className="form-group">
                        <label className="form-label">Registration Number</label>
                        <input
                            type="text"
                            value={regNo}
                            onChange={(e) => { setRegNo(e.target.value); setErrors({}); }}
                            className="glass-input"
                            placeholder="e.g., 22CS101"
                        />
                        {errors.regNo && <p className="form-error">{errors.regNo}</p>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading && <span className="spinner" />}
                            {loading ? 'Finding...' : 'Find Account'}
                        </span>
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <Link href="/auth/student/login" className="link-accent" style={{ fontSize: 13 }}>
                            Back to Login
                        </Link>
                    </div>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={handleVerifyOTP}>
                    <div className="form-group">
                        <label className="form-label">6-Digit OTP</label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setErrors({}); }}
                            className="glass-input"
                            placeholder="Enter OTP"
                            maxLength={6}
                            style={{ textAlign: 'center', fontSize: 20, letterSpacing: 8, fontWeight: 700 }}
                        />
                        {errors.otp && <p className="form-error">{errors.otp}</p>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading && <span className="spinner" />}
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </span>
                    </button>
                </form>
            )}

            {step === 'reset' && (
                <form onSubmit={handleResetPassword}>
                    <div className="form-group">
                        <label className="form-label">New Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => { setNewPassword(e.target.value); setErrors({}); }}
                                className="glass-input"
                                placeholder="New password"
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
                    </div>
                    <div className="form-group">
                        <label className="form-label">Confirm New Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); setErrors({}); }}
                            className="glass-input"
                            placeholder="Re-enter password"
                        />
                        {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {loading && <span className="spinner" />}
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </span>
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
