import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { generateOTP, sendOTPEmail } from '@/lib/email';
import { validatePassword } from '@/lib/validators';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { reg_no, email, action, password } = body;

        const db = getDb();

        // Step 1: Find account and send OTP
        if (action === 'find') {
            let profile: { email: string; name: string } | undefined;

            if (reg_no) {
                // Student lookup by registration number
                profile = db.prepare("SELECT email, name FROM profiles WHERE reg_no = ? AND role = 'student'").get(reg_no) as typeof profile;
            } else if (email) {
                // Faculty/Admin lookup by email
                profile = db.prepare("SELECT email, name FROM profiles WHERE email = ? AND role IN ('faculty', 'admin', 'superadmin')").get(email) as typeof profile;
            }

            if (!profile) {
                return NextResponse.json({ error: reg_no ? 'Registration number not found' : 'Email not found' }, { status: 404 });
            }

            // Invalidate old OTPs
            db.prepare("DELETE FROM otp_codes WHERE email = ? AND purpose = 'password_reset'").run(profile.email);

            // Generate and send new OTP
            const otp = generateOTP();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            db.prepare('INSERT INTO otp_codes (id, email, code, purpose, attempts, max_attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
                uuid(), profile.email, otp, 'password_reset', 0, 3, expiresAt
            );

            await sendOTPEmail(profile.email, otp, profile.name);

            // Mask email for display
            const parts = profile.email.split('@');
            const masked = parts[0].slice(0, 2) + '***@' + parts[1];

            return NextResponse.json({ email: profile.email, maskedEmail: masked, message: 'OTP sent' });
        }

        // Step 2: Reset password
        if (action === 'reset') {
            if (!email || !password) {
                return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
            }

            const passwordCheck = validatePassword(password);
            if (!passwordCheck.valid) {
                return NextResponse.json({ error: passwordCheck.errors[0] }, { status: 400 });
            }

            // Find user
            const profile = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email) as { id: string } | undefined;

            if (!profile) {
                return NextResponse.json({ error: 'Account not found' }, { status: 404 });
            }

            // Hash and update password directly in SQLite
            const hash = await hashPassword(password);
            db.prepare('UPDATE profiles SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hash, profile.id);

            return NextResponse.json({ message: 'Password reset successful' });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
