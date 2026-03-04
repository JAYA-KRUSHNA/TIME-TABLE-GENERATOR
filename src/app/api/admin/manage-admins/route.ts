import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const { name, email, password, role } = await request.json();
    if (!name || !email || !password) return NextResponse.json({ error: 'All fields required' }, { status: 400 });

    const db = getDb();
    const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

    const hash = await hashPassword(password);
    const id = uuid();
    db.prepare('INSERT INTO profiles (id, role, name, email, password, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        id, role || 'admin', name, email, hash, 'CSE', 'active'
    );
    return NextResponse.json({ success: true });
}
