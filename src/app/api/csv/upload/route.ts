import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

/**
 * CSV Upload API — Admin only
 * Auto-detects type from column headers:
 * - Student: name, email, reg_no, year, section, department
 * - Faculty: name, email, department
 * - Subjects: name, subject_code, type, hours_per_week, year (optional)
 * - Rooms: name, capacity, type
 */

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return { headers: [], rows: [] };

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.every(v => v === '')) continue; // skip empty rows
        const row: Record<string, string> = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
        rows.push(row);
    }

    return { headers, rows };
}

function detectType(headers: string[]): 'student' | 'faculty' | 'subjects' | 'rooms' | 'unknown' {
    const h = new Set(headers);
    if (h.has('reg_no') && h.has('name') && h.has('email')) return 'student';
    if (h.has('name') && h.has('email') && !h.has('reg_no') && !h.has('capacity')) return 'faculty';
    if (h.has('name') && (h.has('hours_per_week') || h.has('subject_code'))) return 'subjects';
    if (h.has('name') && h.has('capacity')) return 'rooms';
    return 'unknown';
}

export async function POST(request: NextRequest) {
    try {
        // Auth check — admin only
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const db = getDb();
        const profile = db.prepare('SELECT role FROM profiles WHERE id = ?').get(user.id) as { role: string } | undefined;
        if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
            return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

        const text = await file.text();
        const { headers, rows } = parseCSV(text);

        if (headers.length === 0 || rows.length === 0) {
            return NextResponse.json({ error: 'CSV file is empty or has no data rows' }, { status: 400 });
        }

        const type = detectType(headers);
        if (type === 'unknown') {
            return NextResponse.json({
                error: 'Could not detect CSV type. Expected columns: Student (name, email, reg_no, year, section), Faculty (name, email, department), Subjects (name, type, hours_per_week), Rooms (name, capacity, type)',
                detected_headers: headers,
            }, { status: 400 });
        }

        const results = { type, inserted: 0, skipped: 0, errors: [] as string[] };
        const bcrypt = require('bcryptjs');
        const defaultPassword = bcrypt.hashSync('password123', 10);

        const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;

        if (type === 'student') {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const rowNum = i + 2; // 1-indexed + header
                const name = r.name?.trim();
                const email = r.email?.trim().toLowerCase();
                const regNo = r.reg_no?.trim().toUpperCase();
                const year = parseInt(r.year) || 0;
                const section = r.section?.trim().toUpperCase();
                const department = r.department?.trim() || 'CSE';

                // Required fields
                if (!name || !email || !regNo) {
                    results.errors.push(`Row ${rowNum}: Missing required field (name/email/reg_no)`);
                    results.skipped++;
                    continue;
                }
                if (year < 1 || year > 4) {
                    results.errors.push(`Row ${rowNum}: Invalid year "${r.year}" (must be 1-4)`);
                    results.skipped++;
                    continue;
                }
                if (!section) {
                    results.errors.push(`Row ${rowNum}: Missing section`);
                    results.skipped++;
                    continue;
                }

                // Duplicate email check
                const existingEmail = db.prepare('SELECT id FROM profiles WHERE LOWER(email) = ?').get(email);
                if (existingEmail) {
                    results.errors.push(`Row ${rowNum}: Email "${email}" already exists`);
                    results.skipped++;
                    continue;
                }

                // Duplicate reg_no check (case-insensitive)
                const existingReg = db.prepare('SELECT id FROM profiles WHERE UPPER(reg_no) = ?').get(regNo);
                if (existingReg) {
                    results.errors.push(`Row ${rowNum}: Reg No "${regNo}" already exists`);
                    results.skipped++;
                    continue;
                }

                // Section capacity check (max 70)
                if (dept) {
                    const sec = db.prepare('SELECT id, student_count, max_capacity FROM sections WHERE department_id = ? AND year = ? AND section_name = ?')
                        .get(dept.id, year, section) as { id: string; student_count: number; max_capacity: number } | undefined;
                    if (sec && sec.student_count >= sec.max_capacity) {
                        results.errors.push(`Row ${rowNum}: Section Y${year}-${section} is full (${sec.student_count}/${sec.max_capacity})`);
                        results.skipped++;
                        continue;
                    }
                }

                // Insert student
                db.prepare('INSERT INTO profiles (id, role, name, email, password, reg_no, year, section, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
                    .run(uuid(), 'student', name, email, defaultPassword, regNo, year, section, department, 'active');

                // Update section student count
                if (dept) {
                    db.prepare('UPDATE sections SET student_count = student_count + 1 WHERE department_id = ? AND year = ? AND section_name = ?')
                        .run(dept.id, year, section);
                }

                results.inserted++;
            }
        } else if (type === 'faculty') {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const rowNum = i + 2;
                const name = r.name?.trim();
                const email = r.email?.trim().toLowerCase();
                const department = r.department?.trim() || 'CSE';

                if (!name || !email) {
                    results.errors.push(`Row ${rowNum}: Missing required field (name/email)`);
                    results.skipped++;
                    continue;
                }

                const existingEmail = db.prepare('SELECT id FROM profiles WHERE LOWER(email) = ?').get(email);
                if (existingEmail) {
                    results.errors.push(`Row ${rowNum}: Email "${email}" already exists`);
                    results.skipped++;
                    continue;
                }

                db.prepare('INSERT INTO profiles (id, role, name, email, password, department, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .run(uuid(), 'faculty', name, email, defaultPassword, department, 'active');

                results.inserted++;
            }
        } else if (type === 'subjects') {
            if (!dept) return NextResponse.json({ error: 'Department not found' }, { status: 404 });

            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const rowNum = i + 2;
                const name = r.name?.trim();
                const subjectCode = r.subject_code?.trim() || '';
                const subjectType = r.type?.trim().toLowerCase() || 'theory';
                const hoursPerWeek = parseInt(r.hours_per_week) || 3;
                const year = r.year ? parseInt(r.year) : null;

                if (!name) {
                    results.errors.push(`Row ${rowNum}: Missing subject name`);
                    results.skipped++;
                    continue;
                }
                if (!['theory', 'lab', 'free'].includes(subjectType)) {
                    results.errors.push(`Row ${rowNum}: Invalid type "${subjectType}" (must be theory/lab/free)`);
                    results.skipped++;
                    continue;
                }
                if (year !== null && (year < 1 || year > 4)) {
                    results.errors.push(`Row ${rowNum}: Invalid year "${r.year}" (must be 1-4)`);
                    results.skipped++;
                    continue;
                }

                // Duplicate check (name + type + department + year)
                const existing = year
                    ? db.prepare('SELECT id FROM subjects WHERE name = ? AND type = ? AND department_id = ? AND year = ?').get(name, subjectType, dept.id, year)
                    : db.prepare('SELECT id FROM subjects WHERE name = ? AND type = ? AND department_id = ? AND year IS NULL').get(name, subjectType, dept.id);
                if (existing) {
                    results.errors.push(`Row ${rowNum}: Subject "${name}" (${subjectType}) year ${year || 'all'} already exists`);
                    results.skipped++;
                    continue;
                }

                db.prepare('INSERT INTO subjects (id, name, subject_code, department_id, type, hours_per_week, year) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .run(uuid(), name, subjectCode, dept.id, subjectType, hoursPerWeek, year);

                results.inserted++;
            }
        } else if (type === 'rooms') {
            for (let i = 0; i < rows.length; i++) {
                const r = rows[i];
                const rowNum = i + 2;
                const name = r.name?.trim();
                const capacity = parseInt(r.capacity) || 70;
                const roomType = r.type?.trim().toLowerCase() || 'theory';

                if (!name) {
                    results.errors.push(`Row ${rowNum}: Missing room name`);
                    results.skipped++;
                    continue;
                }

                // Duplicate name check
                const existing = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name);
                if (existing) {
                    results.errors.push(`Row ${rowNum}: Room "${name}" already exists`);
                    results.skipped++;
                    continue;
                }

                db.prepare('INSERT INTO rooms (id, name, capacity, type) VALUES (?, ?, ?, ?)')
                    .run(uuid(), name, capacity, roomType);

                results.inserted++;
            }
        }

        // Track data change
        db.prepare("INSERT OR REPLACE INTO data_change_tracker (id, table_name, last_changed) VALUES (?, ?, datetime('now'))").run(type, type);

        return NextResponse.json(results);
    } catch (error) {
        console.error('CSV upload error:', error);
        return NextResponse.json({ error: 'Upload failed: ' + (error as Error).message }, { status: 500 });
    }
}
