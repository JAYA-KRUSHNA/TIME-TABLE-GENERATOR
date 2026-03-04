import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const db = getDb();
    const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
    if (!dept) return NextResponse.json([]);

    let sections;
    if (year) {
        sections = db.prepare('SELECT * FROM sections WHERE department_id = ? AND year = ? ORDER BY section_name').all(dept.id, parseInt(year));
    } else {
        sections = db.prepare('SELECT * FROM sections WHERE department_id = ? ORDER BY year, section_name').all(dept.id);
    }
    return NextResponse.json(sections);
}

export async function POST(request: NextRequest) {
    try {
        const { year, section_name, max_capacity } = await request.json();
        const db = getDb();
        const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
        if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

        const existing = db.prepare('SELECT id FROM sections WHERE department_id = ? AND year = ? AND section_name = ?').get(dept.id, year, section_name);
        if (existing) return NextResponse.json({ error: 'Section already exists' }, { status: 409 });

        const id = uuid();
        db.prepare('INSERT INTO sections (id, department_id, year, section_name, max_capacity) VALUES (?, ?, ?, ?, ?)').run(id, dept.id, year, section_name, max_capacity || 70);
        return NextResponse.json({ id, success: true });
    } catch { return NextResponse.json({ error: 'Failed' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = getDb();
    const section = db.prepare('SELECT student_count FROM sections WHERE id = ?').get(id) as { student_count: number } | undefined;
    if (section && section.student_count > 0) return NextResponse.json({ error: 'Cannot delete section with students' }, { status: 400 });

    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
}
