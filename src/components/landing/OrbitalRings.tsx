'use client';

import { motion } from 'framer-motion';

interface OrbitalRingsProps {
    size?: number;
}

export default function OrbitalRings({ size = 200 }: OrbitalRingsProps) {
    const rings = [
        { diameter: size, duration: 12, delay: 0, rotateX: 65, opacity: 0.2, color: '#6366f1' },
        { diameter: size * 0.85, duration: 18, delay: 2, rotateX: 72, opacity: 0.15, color: '#818cf8' },
        { diameter: size * 0.7, duration: 10, delay: 1, rotateX: 58, opacity: 0.1, color: '#a5b4fc' },
    ];

    return (
        <div
            style={{
                position: 'absolute',
                width: size,
                height: size,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                perspective: '800px',
                pointerEvents: 'none',
            }}
        >
            {rings.map((ring, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: ring.opacity, scale: 1 }}
                    transition={{ duration: 1.5, delay: 0.8 + ring.delay * 0.3 }}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        margin: 'auto',
                        width: ring.diameter,
                        height: ring.diameter,
                        borderRadius: '50%',
                        border: `1px solid ${ring.color}`,
                        transformStyle: 'preserve-3d',
                        animation: `orbit-${i} ${ring.duration}s linear infinite`,
                    }}
                />
            ))}
            <style jsx>{`
                @keyframes orbit-0 {
                    from { transform: rotateX(65deg) rotateZ(0deg); }
                    to   { transform: rotateX(65deg) rotateZ(360deg); }
                }
                @keyframes orbit-1 {
                    from { transform: rotateX(72deg) rotateY(30deg) rotateZ(0deg); }
                    to   { transform: rotateX(72deg) rotateY(30deg) rotateZ(-360deg); }
                }
                @keyframes orbit-2 {
                    from { transform: rotateX(58deg) rotateY(-20deg) rotateZ(0deg); }
                    to   { transform: rotateX(58deg) rotateY(-20deg) rotateZ(360deg); }
                }
            `}</style>
        </div>
    );
}
