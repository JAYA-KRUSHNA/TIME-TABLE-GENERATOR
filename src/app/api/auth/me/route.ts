import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function GET() {
    const authUser = await getCurrentUser();
    if (!authUser) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const db = getDb();
    const profile = db.prepare('SELECT id, role, name, email, reg_no, year, section, department, status, is_original_superadmin FROM profiles WHERE id = ?').get(authUser.id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    return NextResponse.json({ profile });
}
