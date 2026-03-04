import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

// GET — fetch availability matrix for a faculty
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const facultyId = searchParams.get('faculty_id');
    const db = getDb();

    // If no faculty_id, get current user's availability
    let targetId = facultyId;
    if (!targetId) {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        targetId = user.id;
    }

    const rows = db.prepare('SELECT day, period, is_available FROM faculty_availability WHERE faculty_id = ?')
        .all(targetId) as { day: string; period: number; is_available: number }[];

    // Build matrix: { Monday: { 1: true, 2: false, ... }, ... }
    const matrix: Record<string, Record<number, boolean>> = {};
    for (const day of DAYS) {
        matrix[day] = {};
        for (const p of PERIODS) {
            matrix[day][p] = true; // default available
        }
    }
    for (const row of rows) {
        if (matrix[row.day]) {
            matrix[row.day][row.period] = row.is_available === 1;
        }
    }

    return NextResponse.json({ faculty_id: targetId, matrix });
}

// POST — save availability matrix
export async function POST(request: NextRequest) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const { faculty_id, matrix } = body;

    const db = getDb();

    // Faculty can only edit their own, admins can edit anyone
    const profile = db.prepare('SELECT role FROM profiles WHERE id = ?').get(user.id) as { role: string } | undefined;
    const targetId = (profile?.role === 'admin' || profile?.role === 'superadmin') && faculty_id
        ? faculty_id : user.id;

    // Delete existing and re-insert
    db.prepare('DELETE FROM faculty_availability WHERE faculty_id = ?').run(targetId);

    const insert = db.prepare('INSERT INTO faculty_availability (id, faculty_id, day, period, is_available) VALUES (?, ?, ?, ?, ?)');

    db.transaction(() => {
        for (const day of DAYS) {
            if (!matrix[day]) continue;
            for (const p of PERIODS) {
                const isAvailable = matrix[day]?.[p] !== false ? 1 : 0;
                insert.run(uuid(), targetId, day, p, isAvailable);
            }
        }
    })();

    // Track data change
    db.prepare("INSERT OR REPLACE INTO data_change_tracker (id, table_name, last_changed) VALUES ('faculty_availability', 'faculty_availability', datetime('now'))").run();

    return NextResponse.json({ success: true });
}
