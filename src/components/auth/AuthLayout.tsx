'use client';

import { motion } from 'framer-motion';

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle?: string;
}

export default function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(180deg, #030712 0%, #0f172a 50%, #1e1b4b 100%)',
                padding: '40px 20px',
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="glass"
                style={{
                    width: '100%',
                    maxWidth: 480,
                    padding: '40px 36px',
                }}
            >
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div
                        style={{
                            width: 52,
                            height: 52,
                            margin: '0 auto 16px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1, #818cf8)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 0 30px rgba(99, 102, 241, 0.25)',
                        }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                    </div>
                    <h2
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: '#f1f5f9',
                            marginBottom: 6,
                        }}
                    >
                        {title}
                    </h2>
                    {subtitle && (
                        <p style={{ fontSize: 14, color: '#94a3b8' }}>{subtitle}</p>
                    )}
                </div>

                {children}
            </motion.div>
        </div>
    );
}
