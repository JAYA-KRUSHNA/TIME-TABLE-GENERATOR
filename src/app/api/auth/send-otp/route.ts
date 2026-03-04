import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { generateOTP, sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, purpose = 'verification' } = body;

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const db = getDb();

        // Get user name
        const profile = db.prepare('SELECT name FROM profiles WHERE email = ?').get(email) as { name: string } | undefined;
        const name = profile?.name || 'User';

        // Invalidate previous OTPs for this email+purpose
        db.prepare('DELETE FROM otp_codes WHERE email = ? AND purpose = ?').run(email, purpose);

        // Generate new OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

        db.prepare('INSERT INTO otp_codes (id, email, code, purpose, attempts, max_attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            uuid(), email, otp, purpose, 0, 3, expiresAt
        );

        await sendOTPEmail(email, otp, name);

        return NextResponse.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
