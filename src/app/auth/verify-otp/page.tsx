'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';
    const role = searchParams.get('role') || 'student';
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        pasted.split('').forEach((char, i) => {
            newOtp[i] = char;
        });
        setOtp(newOtp);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = otp.join('');
        if (code.length !== 6) {
            toast.error('Please enter all 6 digits');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, purpose: 'verification' }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Invalid OTP');
                if (data.attemptsLeft !== undefined) {
                    toast.error(`${data.attemptsLeft} attempt(s) remaining`);
                }
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
                return;
            }

            toast.success('Email verified successfully!');

            if (role === 'faculty') {
                // Faculty goes to pending approval screen
                router.push('/auth/faculty/register?verified=true');
            } else {
                // Student can now login
                router.push('/auth/student/login');
            }
        } catch {
            toast.error('Something went wrong.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            const res = await fetch('/api/auth/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, purpose: 'verification' }),
            });

            if (res.ok) {
                toast.success('New OTP sent!');
                setCountdown(60);
                setOtp(['', '', '', '', '', '']);
                inputRefs.current[0]?.focus();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to resend');
            }
        } catch {
            toast.error('Failed to resend OTP');
        } finally {
            setResending(false);
        }
    };

    // Mask email for display
    const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : '';

    return (
        <AuthLayout title="Verify Email" subtitle={`Enter the 6-digit code sent to ${maskedEmail}`}>
            <form onSubmit={handleSubmit}>
                {/* OTP Inputs */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 10,
                        marginBottom: 32,
                    }}
                >
                    {otp.map((digit, index) => (
                        <input
                            key={index}
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={index === 0 ? handlePaste : undefined}
                            style={{
                                width: 48, height: 56,
                                textAlign: 'center', fontSize: 22, fontWeight: 700,
                                background: 'rgba(255,255,255,0.04)',
                                border: digit ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                                borderRadius: 12, color: '#f1f5f9',
                                outline: 'none', transition: 'border 0.2s',
                            }}
                        />
                    ))}
                </div>

                {/* Timer & Resend */}
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                    <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>
                        OTP expires in <span style={{ color: '#818cf8', fontWeight: 600 }}>5 minutes</span>
                    </p>
                    {countdown > 0 ? (
                        <p style={{ color: '#64748b', fontSize: 13 }}>
                            Resend in <span style={{ color: '#818cf8' }}>{countdown}s</span>
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={handleResend}
                            disabled={resending}
                            style={{
                                background: 'none', border: 'none',
                                fontSize: 13, cursor: 'pointer',
                                color: '#818cf8', fontWeight: 500,
                            }}
                        >
                            {resending ? 'Sending...' : 'Resend OTP'}
                        </button>
                    )}
                </div>

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%' }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {loading && <span className="spinner" />}
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </span>
                </button>
            </form>
        </AuthLayout>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#030712' }} />}>
            <VerifyOTPContent />
        </Suspense>
    );
}
