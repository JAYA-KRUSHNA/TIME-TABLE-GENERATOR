import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = getDb();
    const profile = db.prepare('SELECT id, role, is_original_superadmin, section, year, email FROM profiles WHERE id = ?').get(id) as {
        id: string; role: string; is_original_superadmin: number; section?: string; year?: number; email: string;
    } | undefined;

    if (!profile) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (profile.is_original_superadmin) return NextResponse.json({ error: 'Cannot delete original super admin' }, { status: 403 });

    // Use transaction to ensure complete cascade deletion
    db.transaction(() => {
        // If student with section, decrement section count
        if (profile.role === 'student' && profile.section && profile.year) {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (dept) {
                db.prepare('UPDATE sections SET student_count = MAX(0, student_count - 1) WHERE department_id = ? AND year = ? AND section_name = ?').run(
                    dept.id, profile.year, profile.section
                );
            }
        }

        // ═══════════════════════════════════════════
        // CASCADE DELETE — remove ALL traces of user
        // ═══════════════════════════════════════════

        // Auth & verification
        db.prepare('DELETE FROM otp_codes WHERE email = ?').run(profile.email);

        // Faculty-specific data
        db.prepare('DELETE FROM faculty_assignments WHERE faculty_id = ?').run(id);
        db.prepare('DELETE FROM faculty_subjects WHERE faculty_id = ?').run(id);
        db.prepare('DELETE FROM faculty_schedule WHERE faculty_id = ?').run(id);
        db.prepare('DELETE FROM faculty_availability WHERE faculty_id = ?').run(id);

        // Messaging — delete messages they sent, and conversations they're in
        // Get conversation IDs where this user is a participant
        const convos = db.prepare("SELECT id, participant_ids FROM conversations").all() as { id: string; participant_ids: string }[];
        for (const c of convos) {
            try {
                const pids = JSON.parse(c.participant_ids) as string[];
                if (pids.includes(id)) {
                    // Delete all messages in this conversation
                    db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(c.id);
                    // Delete the conversation itself
                    db.prepare('DELETE FROM conversations WHERE id = ?').run(c.id);
                }
            } catch { /* skip malformed JSON */ }
        }

        // Notifications
        db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);

        // Audit logs (keep for audit trail but clear user_id reference)
        db.prepare('UPDATE audit_logs SET user_id = NULL WHERE user_id = ?').run(id);

        // Finally, delete the profile
        db.prepare('DELETE FROM profiles WHERE id = ?').run(id);
    })();

    return NextResponse.json({ success: true });
}

// POST: Admin adds a new faculty member (pre-approved, status='active')
export async function POST(request: NextRequest) {
    try {
        const { name, email, department, password } = await request.json();
        if (!name || !email || !password) return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });

        const db = getDb();

        // Check existing email
        const existing = db.prepare('SELECT id FROM profiles WHERE email = ?').get(email);
        if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });

        const hash = await hashPassword(password);
        const id = uuid();

        // Admin-added faculty are immediately active (no OTP, no approval needed)
        db.prepare('INSERT INTO profiles (id, role, name, email, password, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
            id, 'faculty', name, email, hash, department || 'CSE', 'active'
        );

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Add faculty error:', error);
        return NextResponse.json({ error: 'Failed to add faculty' }, { status: 500 });
    }
}
