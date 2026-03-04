import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
    const { faculty_id, action } = await request.json();
    if (!faculty_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const db = getDb();

    if (action === 'approve') {
        db.prepare("UPDATE profiles SET status = 'active' WHERE id = ? AND role = 'faculty'").run(faculty_id);
    } else if (action === 'reject') {
        // Delete the rejected faculty so they can re-register with the same email
        db.prepare("DELETE FROM profiles WHERE id = ? AND role = 'faculty'").run(faculty_id);
        db.prepare("DELETE FROM otp_codes WHERE email = (SELECT email FROM profiles WHERE id = ?)").run(faculty_id);
    }

    return NextResponse.json({ success: true });
}
