import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { generateOTP, sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, reg_no, year, section, email, password } = body;

        if (!name || !reg_no || !email || !password) {
            return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
        }

        // Normalize email and reg_no to lowercase for case-insensitive uniqueness
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedRegNo = reg_no.trim().toUpperCase(); // Reg numbers are typically uppercase

        const db = getDb();

        // Check existing (case-insensitive)
        const existingEmail = db.prepare('SELECT id FROM profiles WHERE LOWER(email) = ?').get(normalizedEmail);
        if (existingEmail) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

        const existingReg = db.prepare('SELECT id FROM profiles WHERE UPPER(reg_no) = ?').get(normalizedRegNo);
        if (existingReg) return NextResponse.json({ error: 'Registration number already exists' }, { status: 409 });

        const hash = await hashPassword(password);
        const id = uuid();

        // Set status to 'unverified' — will become 'active' after OTP verification
        db.prepare('INSERT INTO profiles (id, role, name, email, password, reg_no, year, section, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            id, 'student', name, normalizedEmail, hash, normalizedRegNo, year || null, section || null, 'CSE', 'unverified'
        );

        // Increment section count
        if (section && year) {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (dept) {
                db.prepare('UPDATE sections SET student_count = student_count + 1 WHERE department_id = ? AND year = ? AND section_name = ?').run(dept.id, year, section);
            }
        }

        // Send OTP for email verification
        db.prepare("DELETE FROM otp_codes WHERE email = ? AND purpose = 'verification'").run(normalizedEmail);
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        db.prepare('INSERT INTO otp_codes (id, email, code, purpose, attempts, max_attempts, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            uuid(), email, otp, 'verification', 0, 3, expiresAt
        );
        await sendOTPEmail(normalizedEmail, otp, name);

        return NextResponse.json({ success: true, email: normalizedEmail, message: 'OTP sent for verification' });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
    }
}
