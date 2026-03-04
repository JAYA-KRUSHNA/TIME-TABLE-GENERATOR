'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { validatePassword, validateEmail } from '@/lib/validators';
import { Eye, EyeOff, Check, X } from 'lucide-react';

interface SectionOption {
    id: string;
    section_name: string;
    year: number;
    student_count: number;
    max_capacity: number;
}

export default function StudentRegisterPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [sections, setSections] = useState<SectionOption[]>([]);
    const [loadingSections, setLoadingSections] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        reg_no: '',
        year: '',
        section: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const passwordValidation = validatePassword(formData.password);

    // Fetch sections when year changes
    useEffect(() => {
        if (!formData.year) {
            setSections([]);
            setFormData(prev => ({ ...prev, section: '' }));
            return;
        }

        async function fetchSections() {
            setLoadingSections(true);
            try {
                const res = await fetch(`/api/sections?year=${formData.year}`);
                const data = await res.json();
                setSections(Array.isArray(data) ? data : []);
                setFormData(prev => ({ ...prev, section: '' }));
            } catch {
                setSections([]);
            } finally {
                setLoadingSections(false);
            }
        }
        fetchSections();
    }, [formData.year]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Client-side validation
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.reg_no.trim()) newErrors.reg_no = 'Registration number is required';
        if (!formData.year) newErrors.year = 'Year of study is required';
        if (!formData.section) newErrors.section = 'Section is required';
        if (!validateEmail(formData.email)) newErrors.email = 'Valid email is required';
        if (!passwordValidation.valid) newErrors.password = passwordValidation.errors[0];
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/register-student', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    reg_no: formData.reg_no,
                    year: parseInt(formData.year),
                    section: formData.section,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                if (data.error?.includes('email')) {
                    setErrors({ email: 'Email already registered' });
                } else if (data.error?.includes('registration')) {
                    setErrors({ reg_no: 'Registration number already exists' });
                } else {
                    toast.error(data.error || 'Registration failed');
                }
                return;
            }

            toast.success('OTP sent to your email!');
            router.push(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}&role=student`);
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Student Registration" subtitle="Create your OptiSchedule account">
            <form onSubmit={handleSubmit}>
                {/* Name */}
                <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="Enter your full name"
                    />
                    {errors.name && <p className="form-error">{errors.name}</p>}
                </div>

                {/* Registration Number */}
                <div className="form-group">
                    <label className="form-label">Registration Number</label>
                    <input
                        type="text"
                        name="reg_no"
                        value={formData.reg_no}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="e.g., 22CS101"
                    />
                    {errors.reg_no && <p className="form-error">{errors.reg_no}</p>}
                </div>

                {/* Year */}
                <div className="form-group">
                    <label className="form-label">Year of Study</label>
                    <select
                        name="year"
                        value={formData.year}
                        onChange={handleChange}
                        className="glass-input"
                        style={{ cursor: 'pointer' }}
                    >
                        <option value="" style={{ background: '#0f172a' }}>Select year</option>
                        <option value="1" style={{ background: '#0f172a' }}>1st Year</option>
                        <option value="2" style={{ background: '#0f172a' }}>2nd Year</option>
                        <option value="3" style={{ background: '#0f172a' }}>3rd Year</option>
                        <option value="4" style={{ background: '#0f172a' }}>4th Year</option>
                    </select>
                    {errors.year && <p className="form-error">{errors.year}</p>}
                </div>

                {/* Section — dynamic based on selected year */}
                <div className="form-group">
                    <label className="form-label">Section</label>
                    {!formData.year ? (
                        <select className="glass-input" disabled style={{ cursor: 'not-allowed', opacity: 0.5 }}>
                            <option style={{ background: '#0f172a' }}>Select year first</option>
                        </select>
                    ) : loadingSections ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 18px' }}>
                            <span className="spinner" style={{ width: 16, height: 16 }} />
                            <span style={{ color: '#94a3b8', fontSize: 14 }}>Loading sections...</span>
                        </div>
                    ) : sections.length === 0 ? (
                        <div style={{
                            padding: '14px 18px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: 12,
                            color: '#f87171',
                            fontSize: 13,
                        }}>
                            No sections available for Year {formData.year}. Contact admin.
                        </div>
                    ) : (
                        <select
                            name="section"
                            value={formData.section}
                            onChange={handleChange}
                            className="glass-input"
                            style={{ cursor: 'pointer' }}
                        >
                            <option value="" style={{ background: '#0f172a' }}>Select section</option>
                            {sections.map((sec) => (
                                <option
                                    key={sec.id}
                                    value={sec.section_name}
                                    style={{ background: '#0f172a' }}
                                    disabled={sec.student_count >= sec.max_capacity}
                                >
                                    Section {sec.section_name}
                                    {sec.student_count >= sec.max_capacity ? ' (Full)' : ` (${sec.student_count}/${sec.max_capacity})`}
                                </option>
                            ))}
                        </select>
                    )}
                    {errors.section && <p className="form-error">{errors.section}</p>}
                </div>

                {/* Email */}
                <div className="form-group">
                    <label className="form-label">Email Address</label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="you@email.com"
                    />
                    {errors.email && <p className="form-error">{errors.email}</p>}
                </div>

                {/* Password */}
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
                                position: 'absolute',
                                right: 14,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: '#64748b',
                                cursor: 'pointer',
                            }}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && <p className="form-error">{errors.password}</p>}

                    {/* Password requirements */}
                    {formData.password && (
                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {[
                                { label: 'Min 8 characters', test: formData.password.length >= 8 },
                                { label: 'Uppercase letter', test: /[A-Z]/.test(formData.password) },
                                { label: 'Lowercase letter', test: /[a-z]/.test(formData.password) },
                                { label: 'Number', test: /[0-9]/.test(formData.password) },
                                { label: 'Special character', test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password) },
                            ].map((req) => (
                                <div
                                    key={req.label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        fontSize: 12,
                                        color: req.test ? '#22c55e' : '#64748b',
                                    }}
                                >
                                    {req.test ? <Check size={12} /> : <X size={12} />}
                                    {req.label}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="glass-input"
                        placeholder="Re-enter your password"
                    />
                    {errors.confirmPassword && <p className="form-error">{errors.confirmPassword}</p>}
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ width: '100%', marginTop: 8 }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {loading && <span className="spinner" />}
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </span>
                </button>

                {/* Links */}
                <div style={{ textAlign: 'center', marginTop: 20 }}>
                    <p style={{ color: '#64748b', fontSize: 14 }}>
                        Already have an account?{' '}
                        <Link href="/auth/student/login" className="link-accent">
                            Sign In
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
