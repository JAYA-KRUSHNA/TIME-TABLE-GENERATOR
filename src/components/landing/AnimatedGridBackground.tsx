'use client';

import { useEffect, useRef } from 'react';

export default function AnimatedGridBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animId: number;
        let time = 0;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        const draw = () => {
            time += 0.003;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const spacing = 60;
            const cols = Math.ceil(canvas.width / spacing) + 1;
            const rows = Math.ceil(canvas.height / spacing) + 1;
            const cx = canvas.width / 2;
            const cy = canvas.height / 2;

            // Draw grid lines
            ctx.lineWidth = 0.5;
            for (let i = 0; i < cols; i++) {
                const x = i * spacing;
                const dist = Math.abs(x - cx) / cx;
                const alpha = Math.max(0.02, 0.08 * (1 - dist));
                ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
                ctx.stroke();
            }
            for (let j = 0; j < rows; j++) {
                const y = j * spacing;
                const dist = Math.abs(y - cy) / cy;
                const alpha = Math.max(0.02, 0.08 * (1 - dist));
                ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
                ctx.stroke();
            }

            // Draw intersection dots with pulse
            for (let i = 0; i < cols; i++) {
                for (let j = 0; j < rows; j++) {
                    const x = i * spacing;
                    const y = j * spacing;
                    const dx = x - cx;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const maxDist = Math.sqrt(cx * cx + cy * cy);
                    const normDist = dist / maxDist;

                    const pulse = Math.sin(time * 2 + dist * 0.01) * 0.5 + 0.5;
                    const alpha = Math.max(0.03, (1 - normDist) * 0.25 * pulse);
                    const size = 1 + pulse * 1.5 * (1 - normDist);

                    ctx.beginPath();
                    ctx.arc(x, y, size, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(129, 140, 248, ${alpha})`;
                    ctx.fill();
                }
            }

            // Radial gradient overlay (center glow)
            const gradient = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy * 0.7, maxR());
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.06)');
            gradient.addColorStop(0.5, 'rgba(99, 102, 241, 0.02)');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Scanning line effect
            const scanY = ((time * 80) % (canvas.height + 200)) - 100;
            const scanGrad = ctx.createLinearGradient(0, scanY - 60, 0, scanY + 60);
            scanGrad.addColorStop(0, 'transparent');
            scanGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.04)');
            scanGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = scanGrad;
            ctx.fillRect(0, scanY - 60, canvas.width, 120);

            animId = requestAnimationFrame(draw);
        };

        function maxR() {
            return Math.max(window.innerWidth, window.innerHeight) * 0.6;
        }

        resize();
        draw();
        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 0,
                pointerEvents: 'none',
            }}
        />
    );
}
