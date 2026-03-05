'use client';

import { useEffect, useState, useRef } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;
    delay?: number;
    onComplete?: () => void;
    className?: string;
}

export default function Typewriter({
    text,
    speed = 100,
    delay = 500,
    onComplete,
    className = '',
}: TypewriterProps) {
    const [displayed, setDisplayed] = useState('');
    const [showCursor, setShowCursor] = useState(true);
    const hasCompletedRef = useRef(false);
    const onCompleteRef = useRef(onComplete);

    // Keep the ref updated but don't trigger re-runs
    onCompleteRef.current = onComplete;

    useEffect(() => {
        // Only run once — never re-trigger
        if (hasCompletedRef.current) return;

        const timeout = setTimeout(() => {
            let index = 0;
            const interval = setInterval(() => {
                setDisplayed(text.slice(0, index + 1));
                index++;
                if (index === text.length) {
                    clearInterval(interval);
                    hasCompletedRef.current = true;
                    onCompleteRef.current?.();
                    // Hide cursor after a brief pause
                    setTimeout(() => setShowCursor(false), 800);
                }
            }, speed);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps — runs exactly once

    return (
        <span className={className}>
            {displayed}
            {showCursor && (
                <span
                    style={{
                        animation: 'blink 1s step-end infinite',
                        color: '#818cf8',
                        fontWeight: 300,
                    }}
                >
                    |
                </span>
            )}
            <style jsx>{`
                @keyframes blink {
                    50% { opacity: 0; }
                }
            `}</style>
        </span>
    );
}
