import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Timetable views API — faculty-wise, room-wise, conflict report, generation summary
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view');
    const id = searchParams.get('id');
    const db = getDb();

    switch (view) {
        case 'faculty': {
            if (!id) {
                // Return all faculty with their schedule counts
                const faculty = db.prepare(`
                    SELECT p.id, p.name, p.email, p.department, COUNT(fs.id) as total_periods
                    FROM profiles p
                    LEFT JOIN faculty_schedule fs ON fs.faculty_id = p.id
                    WHERE p.role = 'faculty' AND p.status = 'active'
                    GROUP BY p.id
                    ORDER BY p.name
                `).all();
                return NextResponse.json(faculty);
            }
            // Return full schedule for specific faculty
            const schedule = db.prepare(`
                SELECT fs.day, fs.period, s.name as subject_name, s.type as subject_type,
                       c.year, sec.section_name, r.name as room_name, l.name as lab_name
                FROM faculty_schedule fs
                LEFT JOIN subjects s ON fs.subject_id = s.id
                LEFT JOIN classes c ON fs.class_id = c.id
                LEFT JOIN sections sec ON c.section_id = sec.id
                LEFT JOIN timetables t ON t.class_id = fs.class_id AND t.day = fs.day AND t.period = fs.period
                LEFT JOIN rooms r ON t.room_id = r.id
                LEFT JOIN labs l ON t.lab_id = l.id
                WHERE fs.faculty_id = ?
                ORDER BY fs.day, fs.period
            `).all(id);
            const info = db.prepare('SELECT name, email, department FROM profiles WHERE id = ?').get(id);
            return NextResponse.json({ info, schedule });
        }

        case 'room': {
            if (!id) {
                // Return all rooms with occupancy
                const rooms = db.prepare(`
                    SELECT r.id, r.name, r.capacity, COUNT(rs.id) as booked_periods
                    FROM rooms r
                    LEFT JOIN room_schedule rs ON rs.room_id = r.id
                    GROUP BY r.id
                    ORDER BY r.name
                `).all();
                const labs = db.prepare(`
                    SELECT l.id, l.name, l.capacity, lt.name as lab_type_name, COUNT(ls.id) as booked_periods
                    FROM labs l
                    LEFT JOIN lab_types lt ON l.lab_type_id = lt.id
                    LEFT JOIN lab_schedule ls ON ls.lab_id = l.id
                    GROUP BY l.id
                    ORDER BY l.name
                `).all();
                return NextResponse.json({ rooms, labs });
            }
            // Return schedule for specific room
            const schedule = db.prepare(`
                SELECT rs.day, rs.period, c.year, sec.section_name,
                       t.subject_id, s.name as subject_name, s.type as subject_type,
                       p.name as faculty_name
                FROM room_schedule rs
                LEFT JOIN classes c ON rs.class_id = c.id
                LEFT JOIN sections sec ON c.section_id = sec.id
                LEFT JOIN timetables t ON t.class_id = rs.class_id AND t.day = rs.day AND t.period = rs.period
                LEFT JOIN subjects s ON t.subject_id = s.id
                LEFT JOIN faculty_schedule fs ON fs.class_id = rs.class_id AND fs.day = rs.day AND fs.period = rs.period
                LEFT JOIN profiles p ON fs.faculty_id = p.id
                WHERE rs.room_id = ?
                ORDER BY rs.day, rs.period
            `).all(id);
            const info = db.prepare('SELECT name, capacity FROM rooms WHERE id = ?').get(id);
            return NextResponse.json({ info, schedule });
        }

        case 'lab': {
            if (!id) return NextResponse.json({ error: 'Lab ID required' }, { status: 400 });
            const schedule = db.prepare(`
                SELECT ls.day, ls.period, c.year, sec.section_name,
                       t.subject_id, s.name as subject_name, s.type as subject_type,
                       p.name as faculty_name
                FROM lab_schedule ls
                LEFT JOIN classes c ON ls.class_id = c.id
                LEFT JOIN sections sec ON c.section_id = sec.id
                LEFT JOIN timetables t ON t.class_id = ls.class_id AND t.day = ls.day AND t.period = ls.period
                LEFT JOIN subjects s ON t.subject_id = s.id
                LEFT JOIN faculty_schedule fs ON fs.class_id = ls.class_id AND fs.day = ls.day AND fs.period = ls.period
                LEFT JOIN profiles p ON fs.faculty_id = p.id
                WHERE ls.lab_id = ?
                ORDER BY ls.day, ls.period
            `).all(id);
            const info = db.prepare('SELECT l.name, l.capacity, lt.name as lab_type_name FROM labs l LEFT JOIN lab_types lt ON l.lab_type_id = lt.id WHERE l.id = ?').get(id);
            return NextResponse.json({ info, schedule });
        }

        case 'conflict-report': {
            // Check for any violations in current timetables
            const conflicts: string[] = [];

            // Check faculty double-booking
            const facultyDoubles = db.prepare(`
                SELECT faculty_id, day, period, COUNT(*) as cnt, p.name as faculty_name
                FROM faculty_schedule fs
                JOIN profiles p ON fs.faculty_id = p.id
                GROUP BY faculty_id, day, period
                HAVING cnt > 1
            `).all() as { faculty_id: string; day: string; period: number; cnt: number; faculty_name: string }[];
            for (const fd of facultyDoubles) {
                conflicts.push(`Faculty "${fd.faculty_name}" double-booked on ${fd.day} P${fd.period} (${fd.cnt} classes)`);
            }

            // Check room double-booking
            const roomDoubles = db.prepare(`
                SELECT room_id, day, period, COUNT(*) as cnt, r.name as room_name
                FROM room_schedule rs
                JOIN rooms r ON rs.room_id = r.id
                GROUP BY room_id, day, period
                HAVING cnt > 1
            `).all() as { room_id: string; day: string; period: number; cnt: number; room_name: string }[];
            for (const rd of roomDoubles) {
                conflicts.push(`Room "${rd.room_name}" double-booked on ${rd.day} P${rd.period} (${rd.cnt} classes)`);
            }

            // Check lab double-booking
            const labDoubles = db.prepare(`
                SELECT lab_id, day, period, COUNT(*) as cnt, l.name as lab_name
                FROM lab_schedule ls
                JOIN labs l ON ls.lab_id = l.id
                GROUP BY lab_id, day, period
                HAVING cnt > 1
            `).all() as { lab_id: string; day: string; period: number; cnt: number; lab_name: string }[];
            for (const ld of labDoubles) {
                conflicts.push(`Lab "${ld.lab_name}" double-booked on ${ld.day} P${ld.period} (${ld.cnt} classes)`);
            }

            // Check faculty availability violations
            const availViolations = db.prepare(`
                SELECT fs.faculty_id, fs.day, fs.period, p.name as faculty_name
                FROM faculty_schedule fs
                JOIN profiles p ON fs.faculty_id = p.id
                JOIN faculty_availability fa ON fa.faculty_id = fs.faculty_id AND fa.day = fs.day AND fa.period = fs.period
                WHERE fa.is_available = 0
            `).all() as { faculty_id: string; day: string; period: number; faculty_name: string }[];
            for (const av of availViolations) {
                conflicts.push(`Faculty "${av.faculty_name}" scheduled on ${av.day} P${av.period} but marked unavailable`);
            }

            return NextResponse.json({
                total_conflicts: conflicts.length,
                conflicts,
                status: conflicts.length === 0 ? 'clean' : 'has_conflicts',
            });
        }

        case 'generation-summary': {
            // Get last generation log
            const lastLog = db.prepare('SELECT * FROM generation_logs ORDER BY created_at DESC LIMIT 1').get();
            const allLogs = db.prepare('SELECT * FROM generation_logs ORDER BY created_at DESC LIMIT 20').all();

            // Check if data has changed since last generation
            const lastGen = db.prepare('SELECT created_at FROM generation_logs ORDER BY created_at DESC LIMIT 1').get() as { created_at: string } | undefined;
            const lastChange = db.prepare('SELECT MAX(last_changed) as lc FROM data_change_tracker').get() as { lc: string } | undefined;
            const isStale = lastGen && lastChange?.lc && new Date(lastChange.lc) > new Date(lastGen.created_at);

            return NextResponse.json({
                last_generation: lastLog || null,
                recent_logs: allLogs,
                is_stale: !!isStale,
            });
        }

        default:
            return NextResponse.json({ error: 'Unknown view type' }, { status: 400 });
    }
}
