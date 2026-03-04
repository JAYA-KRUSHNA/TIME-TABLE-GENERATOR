'use client';

import { useEffect, useState } from 'react';

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

    useEffect(() => {
        const timeout = setTimeout(() => {
            let index = 0;
            const interval = setInterval(() => {
                setDisplayed(text.slice(0, index + 1));
                index++;
                if (index === text.length) {
                    clearInterval(interval);
                    onComplete?.();
                    setTimeout(() => setShowCursor(false), 1500);
                }
            }, speed);

            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
    }, [text, speed, delay, onComplete]);

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
