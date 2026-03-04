import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';

// GET: List all rooms and labs with occupancy info
export async function GET(request: NextRequest) {
    const db = getDb();
    const rooms = db.prepare('SELECT * FROM rooms ORDER BY name').all();
    const labs = db.prepare('SELECT l.*, lt.name as lab_type_name FROM labs l LEFT JOIN lab_types lt ON l.lab_type_id = lt.id ORDER BY l.name').all();
    const labTypes = db.prepare('SELECT * FROM lab_types ORDER BY name').all();

    // Exclude classes being regenerated from occupancy count
    const excludeParam = request.nextUrl.searchParams.get('exclude_class_ids');
    const excludeIds = excludeParam ? excludeParam.split(',').filter(Boolean) : [];

    let roomOccQuery = 'SELECT room_id, COUNT(*) as booked_periods FROM room_schedule';
    let labOccQuery = 'SELECT lab_id, COUNT(*) as booked_periods FROM lab_schedule';
    let roomSchedQuery = 'SELECT rs.room_id, rs.day, rs.period, c.year, s.section_name FROM room_schedule rs LEFT JOIN classes c ON rs.class_id = c.id LEFT JOIN sections s ON c.section_id = s.id';
    let labSchedQuery = 'SELECT ls.lab_id, ls.day, ls.period, c.year, s.section_name FROM lab_schedule ls LEFT JOIN classes c ON ls.class_id = c.id LEFT JOIN sections s ON c.section_id = s.id';

    if (excludeIds.length > 0) {
        const placeholders = excludeIds.map(() => '?').join(',');
        roomOccQuery += ` WHERE class_id NOT IN (${placeholders})`;
        labOccQuery += ` WHERE class_id NOT IN (${placeholders})`;
        roomSchedQuery += ` WHERE rs.class_id NOT IN (${placeholders})`;
        labSchedQuery += ` WHERE ls.class_id NOT IN (${placeholders})`;
    }
    roomOccQuery += ' GROUP BY room_id';
    labOccQuery += ' GROUP BY lab_id';

    const roomOccupancy = db.prepare(roomOccQuery).all(...excludeIds) as { room_id: string; booked_periods: number }[];
    const labOccupancy = db.prepare(labOccQuery).all(...excludeIds) as { lab_id: string; booked_periods: number }[];
    const roomSchedules = db.prepare(roomSchedQuery).all(...excludeIds);
    const labSchedules = db.prepare(labSchedQuery).all(...excludeIds);

    return NextResponse.json({
        rooms, labs, labTypes,
        roomOccupancy: Object.fromEntries(roomOccupancy.map(r => [r.room_id, r.booked_periods])),
        labOccupancy: Object.fromEntries(labOccupancy.map(l => [l.lab_id, l.booked_periods])),
        roomSchedules, labSchedules,
    });
}

// POST: Add room or lab
export async function POST(request: NextRequest) {
    try {
        const { type, name, capacity, lab_type_id } = await request.json();
        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const db = getDb();
        const id = uuid();

        if (type === 'lab') {
            if (!lab_type_id) return NextResponse.json({ error: 'Lab type is required' }, { status: 400 });
            db.prepare('INSERT INTO labs (id, name, lab_type_id, capacity) VALUES (?, ?, ?, ?)').run(id, name, lab_type_id, capacity || 70);
        } else {
            db.prepare('INSERT INTO rooms (id, name, capacity) VALUES (?, ?, ?)').run(id, name, capacity || 70);
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Add room error:', error);
        return NextResponse.json({ error: 'Failed to add' }, { status: 500 });
    }
}

// DELETE: Remove room or lab
export async function DELETE(request: NextRequest) {
    const { id, type } = await request.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const db = getDb();

    if (type === 'lab') {
        const inUse = db.prepare('SELECT COUNT(*) as c FROM lab_schedule WHERE lab_id = ?').get(id) as { c: number };
        if (inUse.c > 0) return NextResponse.json({ error: 'Lab is in use in a timetable. Delete the timetable first.' }, { status: 400 });
        db.prepare('DELETE FROM labs WHERE id = ?').run(id);
    } else {
        const inUse = db.prepare('SELECT COUNT(*) as c FROM room_schedule WHERE room_id = ?').get(id) as { c: number };
        if (inUse.c > 0) return NextResponse.json({ error: 'Room is in use in a timetable. Delete the timetable first.' }, { status: 400 });
        db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    }

    return NextResponse.json({ success: true });
}
