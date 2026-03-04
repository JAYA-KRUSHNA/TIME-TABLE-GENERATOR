'use client';

import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

export default function BackButton({ label = 'Back to Dashboard' }: { label?: string }) {
    const router = useRouter();
    return (
        <button
            onClick={() => router.back()}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 10,
                background: 'rgba(99,102,241,0.06)',
                border: '1px solid rgba(99,102,241,0.12)',
                color: '#94a3b8',
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 16,
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.12)';
                e.currentTarget.style.color = '#a5b4fc';
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(99,102,241,0.06)';
                e.currentTarget.style.color = '#94a3b8';
            }}
        >
            <ChevronLeft size={14} />
            {label}
        </button>
    );
}
