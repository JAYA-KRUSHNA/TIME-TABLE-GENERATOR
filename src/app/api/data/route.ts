import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Universal data API for client pages
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const table = searchParams.get('table');
    const db = getDb();

    switch (table) {
        case 'profile': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json(null);
            const profile = db.prepare('SELECT id, role, name, email, reg_no, year, section, department, status, is_original_superadmin FROM profiles WHERE id = ?').get(user.id);
            return NextResponse.json(profile);
        }
        case 'faculty': {
            const user = await getCurrentUser();
            // If student, only show faculty assigned to their class
            if (user && user.role === 'student') {
                const studentProfile = db.prepare('SELECT year, section FROM profiles WHERE id = ?').get(user.id) as { year: number; section: string } | undefined;
                if (studentProfile && studentProfile.year && studentProfile.section) {
                    const faculty = db.prepare(`
                        SELECT DISTINCT p.id, p.name, p.email, p.department
                        FROM profiles p
                        JOIN faculty_schedule fs ON fs.faculty_id = p.id
                        JOIN classes c ON fs.class_id = c.id
                        JOIN sections s ON c.section_id = s.id
                        WHERE p.role = 'faculty' AND p.status = 'active'
                          AND c.year = ? AND s.section_name = ?
                        ORDER BY p.name
                    `).all(studentProfile.year, studentProfile.section);
                    return NextResponse.json(faculty);
                }
            }
            // Fallback: all faculty (for admin, faculty, etc.)
            const faculty = db.prepare("SELECT id, name, email, department FROM profiles WHERE role = 'faculty' AND status = 'active' ORDER BY name").all();
            return NextResponse.json(faculty);
        }
        case 'all-users': {
            const users = db.prepare('SELECT id, role, name, email, reg_no, year, section, department, status, is_original_superadmin FROM profiles ORDER BY created_at DESC').all();
            return NextResponse.json(users);
        }
        case 'pending-faculty': {
            const pending = db.prepare("SELECT id, name, email, department, created_at FROM profiles WHERE role = 'faculty' AND status = 'pending' ORDER BY created_at DESC").all();
            return NextResponse.json(pending);
        }
        case 'admins': {
            const admins = db.prepare("SELECT id, name, email, role, status, is_original_superadmin FROM profiles WHERE role IN ('admin', 'superadmin') ORDER BY created_at").all();
            return NextResponse.json(admins);
        }
        case 'subjects': {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            const yearParam = searchParams.get('year');
            let subjects;
            if (dept && yearParam) {
                const year = parseInt(yearParam);
                subjects = db.prepare("SELECT id, name, type, hours_per_week, year FROM subjects WHERE department_id = ? AND type != 'free' AND year = ? ORDER BY name").all(dept.id, year);
            } else {
                subjects = dept ? db.prepare("SELECT id, name, type, hours_per_week, year FROM subjects WHERE department_id = ? AND type != 'free' AND year IS NOT NULL ORDER BY year, name").all(dept.id) : [];
            }
            return NextResponse.json(subjects);
        }
        case 'classes': {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (!dept) return NextResponse.json([]);
            const classes = db.prepare('SELECT c.id, c.year, c.section_id, s.section_name FROM classes c JOIN sections s ON c.section_id = s.id WHERE c.department_id = ? ORDER BY c.year').all(dept.id);
            return NextResponse.json(classes);
        }
        case 'timetable': {
            const classId = searchParams.get('class_id');
            if (!classId) return NextResponse.json([]);
            const entries = db.prepare(`
        SELECT t.day, t.period, t.subject_id, t.room_id, t.lab_id,
          s.name as subject_name, s.type as subject_type,
          r.name as room_name, l.name as lab_name,
          p.name as faculty_name
        FROM timetables t
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN labs l ON t.lab_id = l.id
        LEFT JOIN faculty_schedule fs ON fs.class_id = t.class_id AND fs.day = t.day AND fs.period = t.period
        LEFT JOIN profiles p ON fs.faculty_id = p.id
        WHERE t.class_id = ? ORDER BY t.period
      `).all(classId);
            return NextResponse.json(entries);
        }
        case 'my-timetable': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            const profile = db.prepare('SELECT year, section FROM profiles WHERE id = ?').get(user.id) as { year: number; section: string } | undefined;
            if (!profile?.year || !profile?.section) return NextResponse.json([]);
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (!dept) return NextResponse.json([]);
            const section = db.prepare('SELECT id FROM sections WHERE department_id = ? AND year = ? AND section_name = ?').get(dept.id, profile.year, profile.section) as { id: string } | undefined;
            if (!section) return NextResponse.json([]);
            const cls = db.prepare('SELECT id FROM classes WHERE section_id = ? AND department_id = ?').get(section.id, dept.id) as { id: string } | undefined;
            if (!cls) return NextResponse.json([]);
            const entries = db.prepare(`
        SELECT t.day, t.period, s.name as subject_name, s.type as subject_type,
          r.name as room_name, l.name as lab_name, p.name as faculty_name
        FROM timetables t
        LEFT JOIN subjects s ON t.subject_id = s.id
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN labs l ON t.lab_id = l.id
        LEFT JOIN faculty_schedule fs ON fs.class_id = t.class_id AND fs.day = t.day AND fs.period = t.period
        LEFT JOIN profiles p ON fs.faculty_id = p.id
        WHERE t.class_id = ? ORDER BY t.period
      `).all(cls.id);
            return NextResponse.json(entries);
        }
        case 'my-schedule': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            const schedule = db.prepare(`
        SELECT fs.day, fs.period, s.name as subject_name, s.type as subject_type, c.year, sec.section_name,
          r.name as room_name, l.name as lab_name
        FROM faculty_schedule fs
        LEFT JOIN subjects s ON fs.subject_id = s.id
        LEFT JOIN classes c ON fs.class_id = c.id
        LEFT JOIN sections sec ON c.section_id = sec.id
        LEFT JOIN timetables t ON t.class_id = fs.class_id AND t.day = fs.day AND t.period = fs.period
        LEFT JOIN rooms r ON t.room_id = r.id
        LEFT JOIN labs l ON t.lab_id = l.id
        WHERE fs.faculty_id = ?
      `).all(user.id);
            return NextResponse.json(schedule);
        }
        case 'my-interests': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            const interests = db.prepare('SELECT subject_id FROM faculty_subjects WHERE faculty_id = ?').all(user.id);
            return NextResponse.json(interests);
        }
        case 'my-classes': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            // Use faculty_schedule (actual placed slots) instead of faculty_assignments
            const assignments = db.prepare('SELECT DISTINCT class_id FROM faculty_schedule WHERE faculty_id = ?').all(user.id) as { class_id: string }[];
            const result = [];
            for (const a of assignments) {
                const cls = db.prepare('SELECT c.year, s.section_name FROM classes c JOIN sections s ON c.section_id = s.id WHERE c.id = ?').get(a.class_id) as { year: number; section_name: string } | undefined;
                if (cls) {
                    const students = db.prepare("SELECT id, name, reg_no, email FROM profiles WHERE role = 'student' AND year = ? AND section = ? AND status = 'active' ORDER BY name").all(cls.year, cls.section_name);
                    result.push({ id: a.class_id, year: cls.year, section_name: cls.section_name, students });
                }
            }
            return NextResponse.json(result);
        }
        case 'faculty-with-interests': {
            const faculty = db.prepare("SELECT id, name, email, department FROM profiles WHERE role = 'faculty' AND status = 'active' ORDER BY name").all() as { id: string; name: string; email: string; department: string }[];
            const result = faculty.map(f => {
                const subjects = db.prepare('SELECT s.name, s.type FROM faculty_subjects fs JOIN subjects s ON fs.subject_id = s.id WHERE fs.faculty_id = ?').all(f.id);
                return { ...f, subjects };
            });
            return NextResponse.json(result);
        }
        case 'conversations': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            const convos = db.prepare("SELECT id, type, participant_ids FROM conversations").all() as { id: string; type: string; participant_ids: string }[];
            const result = [];
            for (const c of convos) {
                const pids = JSON.parse(c.participant_ids) as string[];
                if (!pids.includes(user.id)) continue;
                const otherId = pids.find(p => p !== user.id);
                if (otherId) {
                    const other = db.prepare('SELECT name FROM profiles WHERE id = ?').get(otherId) as { name: string } | undefined;
                    const lastMsg = db.prepare('SELECT content, read_status FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 1').get(c.id) as { content: string; read_status: number } | undefined;
                    result.push({ id: c.id, type: c.type, other_name: other?.name || 'Unknown', other_id: otherId, last_message: lastMsg?.content, unread: lastMsg ? !lastMsg.read_status : false });
                }
            }
            return NextResponse.json(result);
        }
        case 'messages': {
            const convoId = searchParams.get('conversation_id');
            if (!convoId) return NextResponse.json([]);
            const msgs = db.prepare('SELECT m.id, m.content, m.sender_id, m.created_at, p.name as sender_name FROM messages m JOIN profiles p ON m.sender_id = p.id WHERE m.conversation_id = ? ORDER BY m.created_at').all(convoId);
            return NextResponse.json(msgs);
        }
        case 'stats': {
            const totalStudents = (db.prepare("SELECT COUNT(*) as c FROM profiles WHERE role = 'student'").get() as { c: number }).c;
            const activeFaculty = (db.prepare("SELECT COUNT(*) as c FROM profiles WHERE role = 'faculty' AND status = 'active'").get() as { c: number }).c;
            const pendingApprovals = (db.prepare("SELECT COUNT(*) as c FROM profiles WHERE role = 'faculty' AND status = 'pending'").get() as { c: number }).c;
            const totalSections = (db.prepare("SELECT COUNT(*) as c FROM sections").get() as { c: number }).c;
            return NextResponse.json({ totalStudents, activeFaculty, pendingApprovals, totalSections });
        }
        case 'audit-logs': {
            const logs = db.prepare('SELECT a.id, a.action, a.target_table, a.user_id, a.created_at, p.name as user_name FROM audit_logs a LEFT JOIN profiles p ON a.user_id = p.id ORDER BY a.created_at DESC LIMIT 50').all();
            return NextResponse.json(logs);
        }
        case 'calendar': {
            const events = db.prepare('SELECT * FROM academic_calendar ORDER BY date').all();
            return NextResponse.json(events);
        }
        case 'notifications': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json([]);
            const notifications = db.prepare('SELECT id, type, title, body, COALESCE(read_status, read, 0) as read_status, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id);
            return NextResponse.json(notifications);
        }
        default:
            return NextResponse.json({ error: 'Unknown table' }, { status: 400 });
    }
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    const { action } = body;
    const db = getDb();

    switch (action) {
        case 'send-message': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            const { conversation_id, content } = body;
            db.prepare('INSERT INTO messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)').run(uuid(), conversation_id, user.id, content);
            return NextResponse.json({ success: true });
        }
        case 'create-conversation': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            const { other_id } = body;
            // Check if exists
            const convos = db.prepare("SELECT id, participant_ids FROM conversations WHERE type = 'direct'").all() as { id: string; participant_ids: string }[];
            for (const c of convos) {
                const pids = JSON.parse(c.participant_ids) as string[];
                if (pids.includes(user.id) && pids.includes(other_id)) return NextResponse.json({ id: c.id, existing: true });
            }
            const id = uuid();
            db.prepare('INSERT INTO conversations (id, type, participant_ids) VALUES (?, ?, ?)').run(id, 'direct', JSON.stringify([user.id, other_id]));
            return NextResponse.json({ id, existing: false });
        }
        case 'save-interests': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
            const { subject_ids } = body;
            db.prepare('DELETE FROM faculty_subjects WHERE faculty_id = ?').run(user.id);
            if (subject_ids && subject_ids.length > 0) {
                const insert = db.prepare("INSERT INTO faculty_subjects (id, faculty_id, subject_id, created_at) VALUES (?, ?, ?, datetime('now'))");
                for (const sid of subject_ids) insert.run(uuid(), user.id, sid);
            }
            return NextResponse.json({ success: true });
        }
        case 'add-subject': {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (!dept) return NextResponse.json({ error: 'Dept not found' }, { status: 404 });
            const { name, type, hours_per_week, year } = body;
            // Check if subject with same name, type, and year already exists
            const existing = year
                ? db.prepare('SELECT id, hours_per_week FROM subjects WHERE name = ? AND type = ? AND department_id = ? AND year = ?').get(name, type, dept.id, year) as { id: string; hours_per_week: number } | undefined
                : db.prepare('SELECT id, hours_per_week FROM subjects WHERE name = ? AND type = ? AND department_id = ? AND year IS NULL').get(name, type, dept.id) as { id: string; hours_per_week: number } | undefined;
            if (existing) {
                const newHours = existing.hours_per_week + (hours_per_week || 3);
                db.prepare('UPDATE subjects SET hours_per_week = ? WHERE id = ?').run(newHours, existing.id);
                return NextResponse.json({ id: existing.id, name, type, hours_per_week: newHours, year: year || null });
            }
            const id = uuid();
            db.prepare('INSERT INTO subjects (id, name, department_id, type, hours_per_week, year) VALUES (?, ?, ?, ?, ?, ?)').run(id, name, dept.id, type, hours_per_week || 3, year || null);
            return NextResponse.json({ id, name, type, hours_per_week: hours_per_week || 3, year: year || null });
        }
        case 'delete-subject': {
            db.prepare('DELETE FROM subjects WHERE id = ?').run(body.id);
            return NextResponse.json({ success: true });
        }
        case 'add-calendar-event': {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            db.prepare('INSERT INTO academic_calendar (id, department_id, date, event_type, description) VALUES (?, ?, ?, ?, ?)').run(uuid(), dept?.id, body.date, body.event_type, body.description);
            return NextResponse.json({ success: true });
        }
        case 'delete-calendar-event': {
            db.prepare('DELETE FROM academic_calendar WHERE id = ?').run(body.id);
            return NextResponse.json({ success: true });
        }
        case 'broadcast': {
            const user = await getCurrentUser();
            if (!user) return NextResponse.json({ error: 'Not auth' }, { status: 401 });
            let targetRole = '';
            if (body.target === 'students') targetRole = 'student';
            else if (body.target === 'faculty') targetRole = 'faculty';
            const users = targetRole
                ? db.prepare("SELECT id FROM profiles WHERE role = ? AND status = 'active'").all(targetRole) as { id: string }[]
                : db.prepare("SELECT id FROM profiles WHERE role IN ('student', 'faculty') AND status = 'active'").all() as { id: string }[];
            const insertNotif = db.prepare('INSERT INTO notifications (id, user_id, type, title, body) VALUES (?, ?, ?, ?, ?)');
            for (const u of users) insertNotif.run(uuid(), u.id, 'broadcast', 'Admin Broadcast', body.content);
            return NextResponse.json({ success: true, count: users.length });
        }
        case 'create-class': {
            const dept = db.prepare("SELECT id FROM departments WHERE code = 'CSE'").get() as { id: string } | undefined;
            if (!dept) return NextResponse.json({ error: 'Dept not found' }, { status: 404 });
            const id = uuid();
            db.prepare('INSERT INTO classes (id, department_id, year, section_id) VALUES (?, ?, ?, ?)').run(id, dept.id, body.year, body.section_id);
            return NextResponse.json({ id });
        }
        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
