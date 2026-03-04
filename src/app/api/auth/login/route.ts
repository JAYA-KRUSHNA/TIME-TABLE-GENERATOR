import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const { email, password } = await request.json();
        if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });

        const db = getDb();
        const normalizedEmail = email.trim().toLowerCase();
        const user = db.prepare('SELECT id, email, role, password, status FROM profiles WHERE LOWER(email) = ?').get(normalizedEmail) as { id: string; email: string; role: string; password: string; status: string } | undefined;

        if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        const valid = await verifyPassword(password, user.password);
        if (!valid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

        if (user.status === 'unverified') return NextResponse.json({ error: 'Please verify your email first. Check your inbox for the OTP.' }, { status: 403 });
        if (user.status === 'pending') return NextResponse.json({ error: 'Account pending admin approval. Please wait.' }, { status: 403 });
        if (user.status === 'rejected') return NextResponse.json({ error: 'Account has been rejected' }, { status: 403 });

        const token = await createToken({ id: user.id, email: user.email, role: user.role });
        await setAuthCookie(token);

        return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
