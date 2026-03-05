'use client';

import { motion } from 'framer-motion';

interface GlowingOrbProps {
    color?: string;
    size?: number;
    top?: string;
    left?: string;
    delay?: number;
}

export default function GlowingOrb({
    color = 'rgba(99, 102, 241, 0.15)',
    size = 300,
    top = '30%',
    left = '60%',
    delay = 0,
}: GlowingOrbProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{
                opacity: [0, 1, 1, 0.8, 1],
                scale: [0.3, 1, 1.1, 0.95, 1],
                x: [0, 30, -20, 10, 0],
                y: [0, -20, 15, -10, 0],
            }}
            transition={{
                duration: 20,
                delay,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
            style={{
                position: 'absolute',
                top,
                left,
                width: size,
                height: size,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
                filter: `blur(${size * 0.3}px)`,
                pointerEvents: 'none',
                zIndex: 1,
            }}
        />
    );
}
