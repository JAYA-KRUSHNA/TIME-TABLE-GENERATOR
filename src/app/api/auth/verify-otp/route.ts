import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, code, purpose = 'verification' } = body;

        if (!email || !code) {
            return NextResponse.json({ error: 'Email and code are required' }, { status: 400 });
        }

        const db = getDb();

        // Find matching OTP (most recent)
        const otpRecord = db.prepare(
            'SELECT * FROM otp_codes WHERE email = ? AND purpose = ? ORDER BY created_at DESC LIMIT 1'
        ).get(email, purpose) as {
            id: string; code: string; attempts: number; max_attempts: number; expires_at: string;
        } | undefined;

        if (!otpRecord) {
            return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 404 });
        }

        // Check expiry
        if (new Date(otpRecord.expires_at) < new Date()) {
            db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);
            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 410 });
        }

        // Check attempts
        if (otpRecord.attempts >= otpRecord.max_attempts) {
            db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);
            return NextResponse.json({ error: 'Maximum attempts exceeded. Please request a new OTP.' }, { status: 429 });
        }

        // Increment attempts
        db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(otpRecord.id);

        // Verify code
        if (otpRecord.code !== code) {
            const attemptsLeft = otpRecord.max_attempts - (otpRecord.attempts + 1);
            return NextResponse.json(
                { error: 'Invalid OTP', attemptsLeft },
                { status: 400 }
            );
        }

        // OTP is valid — clean up
        db.prepare('DELETE FROM otp_codes WHERE id = ?').run(otpRecord.id);

        // Update account status based on purpose
        if (purpose === 'verification') {
            const profile = db.prepare('SELECT role FROM profiles WHERE email = ?').get(email) as { role: string } | undefined;
            if (profile) {
                // Faculty: unverified → pending (needs admin approval)
                // Student: unverified → active (ready to use)
                const newStatus = profile.role === 'faculty' ? 'pending' : 'active';
                db.prepare('UPDATE profiles SET status = ? WHERE email = ?').run(newStatus, email);
            }
        }

        return NextResponse.json({ message: 'OTP verified successfully', verified: true });
    } catch (error) {
        console.error('Verify OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
