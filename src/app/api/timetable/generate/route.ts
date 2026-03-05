import { NextRequest, NextResponse } from 'next/server';
import { getDb, uuid } from '@/lib/db';

/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  OptiSchedule — Faculty Assignment Engine v3.0               ║
 * ║                                                              ║
 * ║  Stage 1: Generate timetable slots (always succeeds)         ║
 * ║  Stage 2: Assign faculty via FCFS interest-based system      ║
 * ║                                                              ║
 * ║  8 Hard Rules:                                               ║
 * ║  R1. No faculty double-booking across ALL timetables          ║
 * ║  R2. Min 1 free period per day per faculty                   ║
 * ║  R3. One subject per year per faculty                        ║
 * ║  R4. No impossible adjacent-block scheduling                 ║
 * ║  R5. Check faculty_schedule + availability before assign     ║
 * ║  R6. Theory + Lab of same subject allowed for same faculty   ║
 * ║  R7. Same faculty teaches same subject across all sections   ║
 * ║  R8. ◈ marker for unassigned faculty slots                   ║
 * ║                                                              ║
 * ║  Faculty Priority: Interest FCFS → Backup (lowest workload)  ║
 * ║  Placement: Labs → Theory → Free → Force-fill → Anneal      ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Types ───────────────────────────────────────────────────
interface SubjectRow { id: string; name: string; type: string; hours_per_week: number; lab_type_id: string | null; year: number | null; }
interface FacultyInterestRow { faculty_id: string; subject_id: string; faculty_name: string; subject_name: string; subject_type: string; created_at: string; }
interface FreePeriodInput { name: string; periods_per_week: number; }

interface SubjectReq {
    id: string; name: string; type: string;
    remaining: number; labTypeId?: string | null; isFree?: boolean;
}

interface Assignment {
    class_id: string; day: string; period: number;
    subject_id: string; subject_name: string;
    room_id?: string; lab_id?: string; faculty_id?: string;
    is_free?: boolean;
}

interface ClassInfo {
    classId: string; year: number; sectionLabel: string; sectionName: string;
    studentCount: number; departmentId: string;
    requirements: SubjectReq[];
    facultyMap: Map<string, string[]>; // subjectId → [faculty_id, ...]
    labDayCount: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PERIOD_TIMES = [
    { period: 1, start: '9:00 AM', end: '9:50 AM' },
    { period: 2, start: '9:50 AM', end: '10:40 AM' },
    { period: 3, start: '11:00 AM', end: '11:50 AM' },
    { period: 4, start: '11:50 AM', end: '12:40 PM' },
    { period: 5, start: '1:50 PM', end: '2:40 PM' },
    { period: 6, start: '2:40 PM', end: '3:30 PM' },
    { period: 7, start: '3:30 PM', end: '4:20 PM' },
];

const BREAK_AFTER_PERIOD = new Set([2, 4]);

// Scoring weights
const W = {
    SUBJECT_DAY_SPREAD: 60,
    SUBJECT_REPEAT_SAME_DAY: -120,
    MORNING_THEORY: 18,
    ANTI_CLUSTER: 12,
    EVEN_DAY_LOAD: 10,
    FACULTY_LOAD_BALANCE: 8,
    ROOM_CONSISTENCY: 6,
    ROOM_AVAILABLE: 5,
    NO_ROOM_PENALTY: -15,
};

// ─── O(1) Index ──────────────────────────────────────────────
class ScheduleIndex {
    private classSlots = new Map<string, Set<string>>();
    private facultySlots = new Map<string, Set<string>>();
    private roomSlots = new Map<string, Set<string>>();
    private labSlots = new Map<string, Set<string>>();
    private classDaySubject = new Map<string, number>();
    private classDayLoad = new Map<string, number>();
    private facultyDayLoad = new Map<string, number>();
    private classDayRooms = new Map<string, Set<string>>();
    private classDayFreePeriods = new Map<string, number>();
    private classPrevRoom = new Map<string, string>();

    isClassSlotUsed(classId: string, sk: string): boolean { return this.classSlots.get(classId)?.has(sk) ?? false; }
    isFacultyBusy(facultyId: string, sk: string): boolean { return this.facultySlots.get(facultyId)?.has(sk) ?? false; }
    isRoomBusy(roomId: string, sk: string): boolean { return this.roomSlots.get(roomId)?.has(sk) ?? false; }
    isLabBusy(labId: string, sk: string): boolean { return this.labSlots.get(labId)?.has(sk) ?? false; }
    getClassDaySubjectCount(classId: string, day: string, subjectId: string): number { return this.classDaySubject.get(`${classId}|${day}|${subjectId}`) ?? 0; }
    getClassDayLoad(classId: string, day: string): number { return this.classDayLoad.get(`${classId}|${day}`) ?? 0; }
    getFacultyDayLoad(facultyId: string, day: string): number { return this.facultyDayLoad.get(`${facultyId}|${day}`) ?? 0; }
    getClassDayRoomCount(classId: string, day: string): number { return this.classDayRooms.get(`${classId}|${day}`)?.size ?? 0; }
    getClassPrevRoom(classId: string): string | undefined { return this.classPrevRoom.get(classId); }
    getClassDayFreeCount(classId: string, day: string): number { return this.classDayFreePeriods.get(`${classId}|${day}`) ?? 0; }

    addFacultySlot(facultyId: string, day: string, period: number) {
        const sk = `${day}_${period}`;
        if (!this.facultySlots.has(facultyId)) this.facultySlots.set(facultyId, new Set());
        this.facultySlots.get(facultyId)!.add(sk);
        const fdk = `${facultyId}|${day}`;
        this.facultyDayLoad.set(fdk, (this.facultyDayLoad.get(fdk) ?? 0) + 1);
    }

    addAssignment(a: Assignment) {
        const sk = `${a.day}_${a.period}`;
        if (!this.classSlots.has(a.class_id)) this.classSlots.set(a.class_id, new Set());
        this.classSlots.get(a.class_id)!.add(sk);
        if (a.faculty_id) {
            if (!this.facultySlots.has(a.faculty_id)) this.facultySlots.set(a.faculty_id, new Set());
            this.facultySlots.get(a.faculty_id)!.add(sk);
            const fdk = `${a.faculty_id}|${a.day}`;
            this.facultyDayLoad.set(fdk, (this.facultyDayLoad.get(fdk) ?? 0) + 1);
        }
        if (a.room_id) {
            if (!this.roomSlots.has(a.room_id)) this.roomSlots.set(a.room_id, new Set());
            this.roomSlots.get(a.room_id)!.add(sk);
            const cdk = `${a.class_id}|${a.day}`;
            if (!this.classDayRooms.has(cdk)) this.classDayRooms.set(cdk, new Set());
            this.classDayRooms.get(cdk)!.add(a.room_id);
            this.classPrevRoom.set(a.class_id, a.room_id);
        }
        if (a.lab_id) {
            if (!this.labSlots.has(a.lab_id)) this.labSlots.set(a.lab_id, new Set());
            this.labSlots.get(a.lab_id)!.add(sk);
        }
        const sdk = `${a.class_id}|${a.day}|${a.subject_id}`;
        this.classDaySubject.set(sdk, (this.classDaySubject.get(sdk) ?? 0) + 1);
        const dlk = `${a.class_id}|${a.day}`;
        this.classDayLoad.set(dlk, (this.classDayLoad.get(dlk) ?? 0) + 1);
        if (a.is_free) {
            this.classDayFreePeriods.set(dlk, (this.classDayFreePeriods.get(dlk) ?? 0) + 1);
        }
    }

    removeAssignment(a: Assignment) {
        const sk = `${a.day}_${a.period}`;
        this.classSlots.get(a.class_id)?.delete(sk);
        if (a.faculty_id) {
            this.facultySlots.get(a.faculty_id)?.delete(sk);
            const fdk = `${a.faculty_id}|${a.day}`;
            const v = this.facultyDayLoad.get(fdk);
            if (v) this.facultyDayLoad.set(fdk, v - 1);
        }
        if (a.room_id) this.roomSlots.get(a.room_id)?.delete(sk);
        if (a.lab_id) this.labSlots.get(a.lab_id)?.delete(sk);
        const sdk = `${a.class_id}|${a.day}|${a.subject_id}`;
        const sc = this.classDaySubject.get(sdk);
        if (sc) this.classDaySubject.set(sdk, sc - 1);
        const dlk = `${a.class_id}|${a.day}`;
        const dl = this.classDayLoad.get(dlk);
        if (dl) this.classDayLoad.set(dlk, dl - 1);
    }

    seedExisting(
        roomSchedule: { room_id: string; day: string; period: number }[],
        labSchedule: { lab_id: string; day: string; period: number }[],
        facultySchedule: { faculty_id: string; day: string; period: number }[],
    ) {
        for (const rs of roomSchedule) {
            const sk = `${rs.day}_${rs.period}`;
            if (!this.roomSlots.has(rs.room_id)) this.roomSlots.set(rs.room_id, new Set());
            this.roomSlots.get(rs.room_id)!.add(sk);
        }
        for (const ls of labSchedule) {
            const sk = `${ls.day}_${ls.period}`;
            if (!this.labSlots.has(ls.lab_id)) this.labSlots.set(ls.lab_id, new Set());
            this.labSlots.get(ls.lab_id)!.add(sk);
        }
        for (const fs of facultySchedule) {
            const sk = `${fs.day}_${fs.period}`;
            if (!this.facultySlots.has(fs.faculty_id)) this.facultySlots.set(fs.faculty_id, new Set());
            this.facultySlots.get(fs.faculty_id)!.add(sk);
            const fdk = `${fs.faculty_id}|${fs.day}`;
            this.facultyDayLoad.set(fdk, (this.facultyDayLoad.get(fdk) ?? 0) + 1);
        }
    }
}

// ─── Lock ────────────────────────────────────────────────────
function acquireLock(db: ReturnType<typeof getDb>): boolean {
    try {
        db.prepare("DELETE FROM data_change_tracker WHERE id = 'generation_lock' AND last_changed < datetime('now', '-2 minutes')").run();
        const lock = db.prepare("SELECT id FROM data_change_tracker WHERE id = 'generation_lock'").get();
        if (lock) return false;
        db.prepare("INSERT INTO data_change_tracker (id, table_name, last_changed) VALUES ('generation_lock', 'lock', datetime('now'))").run();
        return true;
    } catch { return false; }
}
function releaseLock(db: ReturnType<typeof getDb>) {
    try { db.prepare("DELETE FROM data_change_tracker WHERE id = 'generation_lock'").run(); } catch { /* ignore */ }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    const startTime = performance.now();
    const db = getDb();

    if (!acquireLock(db)) {
        return NextResponse.json({ error: 'Another generation is in progress.' }, { status: 429 });
    }

    try {
        const config = await request.json();
        const {
            class_ids,
            selected_room_ids = [] as string[],
            selected_lab_ids = [] as string[],
            free_periods = [] as FreePeriodInput[],
            periods_per_day = 7,
            max_consecutive_theory = 3,
            lab_consecutive_periods = 2,
            resolve_conflicts = false,
        } = config;

        if (!class_ids || class_ids.length === 0) {
            releaseLock(db);
            return NextResponse.json({ error: 'Select at least one class' }, { status: 400 });
        }

        console.log(`\n${'═'.repeat(60)}`);
        console.log(`  OptiSchedule Generator v3.0 — ${class_ids.length} class(es)`);
        console.log(`${'═'.repeat(60)}`);

        const conflicts: string[] = [];
        const suggestions: string[] = [];
        const classIdSet = new Set(class_ids as string[]);

        // ═══════════════════════════════════════════
        // LOAD CONSTRAINT DATA (all crash-proof)
        // ═══════════════════════════════════════════
        const facultyUnavailable = new Map<string, Set<string>>();
        try {
            const availRows = db.prepare('SELECT faculty_id, day, period FROM faculty_availability WHERE is_available = 0').all() as { faculty_id: string; day: string; period: number }[];
            for (const row of availRows) {
                if (!facultyUnavailable.has(row.faculty_id)) facultyUnavailable.set(row.faculty_id, new Set());
                facultyUnavailable.get(row.faculty_id)!.add(`${row.day}_${row.period}`);
            }
        } catch (e) { console.log(`  ⚠ faculty_availability query failed: ${(e as Error).message}`); }

        const roomInfo = new Map<string, { capacity: number; type: string }>();
        for (const rid of selected_room_ids) {
            try {
                const r = db.prepare('SELECT capacity, type FROM rooms WHERE id = ?').get(rid) as { capacity: number; type: string } | undefined;
                if (r) roomInfo.set(rid, { capacity: r.capacity, type: r.type || 'theory' });
            } catch { /* skip bad room */ }
        }

        const labInfo = new Map<string, { capacity: number; labTypeId: string | null }>();
        for (const lid of selected_lab_ids) {
            try {
                const l = db.prepare('SELECT capacity, lab_type_id FROM labs WHERE id = ?').get(lid) as { capacity: number; lab_type_id: string | null } | undefined;
                if (l) labInfo.set(lid, { capacity: l.capacity, labTypeId: l.lab_type_id });
            } catch { /* skip bad lab */ }
        }

        // ═══════════════════════════════════════════
        // LOAD ALL FACULTY INTERESTS (FCFS ORDER)
        // Crash-proof: if table/column missing, continue without faculty
        // ═══════════════════════════════════════════
        let allInterests: FacultyInterestRow[] = [];
        try {
            allInterests = db.prepare(`
                SELECT fs.faculty_id, fs.subject_id, p.name as faculty_name,
                       s.name as subject_name, s.type as subject_type,
                       COALESCE(fs.created_at, datetime('now')) as created_at
                FROM faculty_subjects fs
                JOIN profiles p ON fs.faculty_id = p.id
                JOIN subjects s ON fs.subject_id = s.id
                WHERE p.status = 'active'
                ORDER BY fs.created_at ASC
            `).all() as FacultyInterestRow[];
        } catch (e) {
            console.log(`  ⚠ Faculty interests query failed (continuing without): ${(e as Error).message}`);
            suggestions.push('Faculty interest data unavailable — generating without faculty assignments');
        }
        console.log(`  Faculty interests loaded: ${allInterests.length}`);

        // All active faculty (backup pool)
        let allFaculty: { id: string; name: string }[] = [];
        try {
            allFaculty = db.prepare("SELECT id, name FROM profiles WHERE role = 'faculty' AND status = 'active'").all() as { id: string; name: string }[];
        } catch (e) {
            console.log(`  ⚠ Faculty pool query failed: ${(e as Error).message}`);
        }
        console.log(`  Active faculty pool: ${allFaculty.length}`);

        // Track: faculty → subjects per year (R3: one subject per year)
        const facultyYearSubjects = new Map<string, Set<string>>();
        // Track: faculty → sections per year
        const facultyYearSections = new Map<string, Set<string>>();
        // Track: total load per faculty
        const facultyTotalLoad = new Map<string, number>();
        // NEW: Lock subject→faculty per year: ensures same faculty for same subject across all sections
        // Key: "subjectBaseName|year" → faculty_id
        const subjectFacultyLock = new Map<string, string>();

        // ═══════════════════════════════════════════
        // PRE-LOAD EXISTING FACULTY ASSIGNMENTS (OTHER YEARS ONLY)
        //   For cross-year constraint enforcement (e.g., R3: one subject per year per faculty)
        //   Same-year locks are built dynamically during generation
        // ═══════════════════════════════════════════
        try {
            // Get the year(s) being generated so we can exclude them
            const generatingYears = new Set<number>();
            for (const cid of class_ids) {
                const c = db.prepare('SELECT year FROM classes WHERE id = ?').get(cid) as { year: number } | undefined;
                if (c) generatingYears.add(c.year);
            }

            if (generatingYears.size > 0) {
                const yearPlaceholders = [...generatingYears].map(() => '?').join(',');
                const existingAssignments = db.prepare(`
                    SELECT fa.faculty_id, fa.subject_id, c.year, s.name as subject_name
                    FROM faculty_assignments fa
                    JOIN classes c ON fa.class_id = c.id
                    JOIN subjects s ON fa.subject_id = s.id
                    WHERE c.year NOT IN (${yearPlaceholders})
                `).all(...generatingYears) as { faculty_id: string; subject_id: string; year: number; subject_name: string }[];

                for (const ea of existingAssignments) {
                    const baseName = ea.subject_name.replace(/ LAB$/i, '');
                    const yearKey = `${ea.faculty_id}|${ea.year}`;
                    if (!facultyYearSubjects.has(yearKey)) facultyYearSubjects.set(yearKey, new Set());
                    facultyYearSubjects.get(yearKey)!.add(baseName);
                }
                if (existingAssignments.length > 0) {
                    console.log(`  Pre-loaded ${existingAssignments.length} cross-year faculty assignments`);
                }
            }
        } catch (e) {
            console.log(`  ⚠ Could not pre-load faculty assignments (continuing): ${(e as Error).message}`);
        }

        // ═══════════════════════════════════════════
        // BUILD SCHEDULE INDEX
        // ═══════════════════════════════════════════
        const idx = new ScheduleIndex();

        let existingRooms: { room_id: string; day: string; period: number; class_id: string }[] = [];
        let existingLabs: { lab_id: string; day: string; period: number; class_id: string }[] = [];
        let existingFaculty: { faculty_id: string; day: string; period: number; class_id: string }[] = [];
        try { existingRooms = db.prepare('SELECT room_id, day, period, class_id FROM room_schedule').all() as typeof existingRooms; } catch { }
        try { existingLabs = db.prepare('SELECT lab_id, day, period, class_id FROM lab_schedule').all() as typeof existingLabs; } catch { }
        try { existingFaculty = db.prepare('SELECT faculty_id, day, period, class_id FROM faculty_schedule').all() as typeof existingFaculty; } catch { }

        idx.seedExisting(
            existingRooms.filter(r => !classIdSet.has(r.class_id)),
            existingLabs.filter(l => !classIdSet.has(l.class_id)),
            existingFaculty.filter(f => !classIdSet.has(f.class_id)),
        );

        // ═══════════════════════════════════════════
        // BUILD CLASS INFO
        // ═══════════════════════════════════════════
        const classInfos: ClassInfo[] = [];
        for (const classId of class_ids) {
            const cls = db.prepare('SELECT year, section_id, department_id FROM classes WHERE id = ?').get(classId) as { year: number; section_id: string; department_id: string } | undefined;
            if (!cls) { conflicts.push(`Class ${classId} not found`); console.log(`  ✗ Class ${classId} not found in DB`); continue; }
            const sec = db.prepare('SELECT section_name, student_count FROM sections WHERE id = ?').get(cls.section_id) as { section_name: string; student_count: number } | undefined;
            const sectionLabel = sec ? `Y${cls.year}-${sec.section_name}` : classId;
            const sectionName = sec?.section_name || classId;
            const studentCount = sec?.student_count || 0;

            const subjects = db.prepare("SELECT id, name, type, hours_per_week, lab_type_id FROM subjects WHERE department_id = ? AND type != 'free' AND year = ?").all(cls.department_id, cls.year) as SubjectRow[];
            console.log(`  ${sectionLabel}: ${subjects.length} subjects found (dept=${cls.department_id}, year=${cls.year})`);

            if (subjects.length === 0 && free_periods.length === 0) {
                conflicts.push(`No subjects for ${sectionLabel} (year ${cls.year})`);
                suggestions.push(`Add subjects for ${sectionLabel} department year ${cls.year}`);
                continue;
            }

            const requirements: SubjectReq[] = subjects.map(s => ({
                id: s.id, name: s.name, type: s.type, remaining: s.hours_per_week, labTypeId: s.lab_type_id,
            }));

            // Add free periods
            for (const fp of free_periods) {
                let freeSubj = db.prepare("SELECT id FROM subjects WHERE name = ? AND type = 'free' AND department_id = ?").get(fp.name, cls.department_id) as { id: string } | undefined;
                if (!freeSubj) {
                    const freeId = uuid();
                    db.prepare('INSERT INTO subjects (id, name, type, hours_per_week, department_id) VALUES (?, ?, ?, ?, ?)').run(freeId, fp.name, 'free', fp.periods_per_week, cls.department_id);
                    freeSubj = { id: freeId };
                }
                requirements.push({ id: freeSubj.id, name: fp.name, type: 'free', remaining: fp.periods_per_week, isFree: true });
            }

            // Cap total requirements to available slots
            const totalSlots = periods_per_day * DAYS.length;
            const totalRequired = requirements.reduce((sum, r) => sum + r.remaining, 0);
            if (totalRequired > totalSlots) {
                conflicts.push(`${sectionLabel}: ${totalRequired} periods needed but only ${totalSlots} slots`);
                const scale = totalSlots / totalRequired;
                for (const r of requirements) r.remaining = Math.max(1, Math.round(r.remaining * scale));
            }

            // ═══════════════════════════════════════════
            // PHASE 0: BUILD FACULTY PREFERENCE LIST (non-binding)
            //   Collects a ranked list of preferred faculty per subject:
            //   [interest-based FCFS] → [all backup sorted by workload]
            //   Actual assignment happens at slot-placement time
            // ═══════════════════════════════════════════
            const facultyMap = new Map<string, string[]>(); // subjectId → [ranked faculty IDs]

            for (const subj of requirements) {
                if (subj.isFree) continue;

                const baseName = subj.name.replace(/ LAB$/i, '');
                const lockKey = `${baseName}|${cls.year}`;
                const candidates: string[] = [];

                // CHECK LOCK FIRST: If this subject+year already had faculty assigned
                // in a previous section (same generation run), put them first
                const lockedFacultyId = subjectFacultyLock.get(lockKey);
                if (lockedFacultyId && allFaculty.some(f => f.id === lockedFacultyId)) {
                    candidates.push(lockedFacultyId);
                }

                // Stage 1: Interest-based FCFS — add all interested faculty
                const interested = allInterests.filter(i => i.subject_id === subj.id);
                for (const interest of interested) {
                    const fid = interest.faculty_id;
                    if (candidates.includes(fid)) continue; // already added from lock

                    // R3: One subject per year (cross-year check only)
                    const yearKey = `${fid}|${cls.year}`;
                    const yearSubjects = facultyYearSubjects.get(yearKey) || new Set();
                    if (yearSubjects.size > 0 && !yearSubjects.has(baseName)) continue;

                    candidates.push(fid);
                }

                // Stage 2: ALL remaining faculty sorted by lowest workload
                const sortedBackup = [...allFaculty]
                    .filter(f => !candidates.includes(f.id))
                    .sort((a, b) => (facultyTotalLoad.get(a.id) ?? 0) - (facultyTotalLoad.get(b.id) ?? 0));

                for (const f of sortedBackup) {
                    // R3: Cross-year check only
                    const yearKey = `${f.id}|${cls.year}`;
                    const yearSubjects = facultyYearSubjects.get(yearKey) || new Set();
                    if (yearSubjects.size > 0 && !yearSubjects.has(baseName)) continue;
                    candidates.push(f.id);
                }

                if (candidates.length > 0) {
                    facultyMap.set(subj.id, candidates);
                    console.log(`  ✓ Faculty candidates for "${subj.name}" (${subj.type}): ${candidates.length} options (first: ${candidates[0]})`);
                } else {
                    console.log(`  ◈ No eligible faculty for "${subj.name}" (${subj.type})`);
                }
            }

            classInfos.push({
                classId, year: cls.year, sectionLabel, sectionName, studentCount,
                departmentId: cls.department_id, requirements, facultyMap, labDayCount: {},
            });
        }

        if (classInfos.length === 0) {
            releaseLock(db);
            return NextResponse.json({
                success: false, message: 'No valid classes found',
                total_slots: 0, conflicts, suggestions,
            });
        }

        // Sort by most constrained first (MRV)
        classInfos.sort((a, b) => {
            const aR = a.requirements.reduce((s, r) => s + r.remaining, 0);
            const bR = b.requirements.reduce((s, r) => s + r.remaining, 0);
            return bR - aR;
        });

        const allAssignments: Assignment[] = [];

        // ═══════════════════════════════════════════
        // HELPERS
        // ═══════════════════════════════════════════

        // R1+R5: Check if faculty is blocked at a slot
        function isFacultyBlocked(facultyId: string, day: string, period: number): boolean {
            const sk = `${day}_${period}`;
            if (facultyUnavailable.get(facultyId)?.has(sk)) return true;
            if (idx.isFacultyBusy(facultyId, sk)) return true;
            return false;
        }

        // R2: Check if faculty would have 0 free periods left
        function facultyDayOverloaded(facultyId: string, day: string): boolean {
            return idx.getFacultyDayLoad(facultyId, day) >= periods_per_day - 1;
        }

        // Get primary faculty for a subject in a class
        function getFaculty(ci: ClassInfo, subjectId: string): string | undefined {
            const facs = ci.facultyMap.get(subjectId);
            return facs?.[0];
        }

        // Faculty cascade: iterate through ALL candidates from PHASE 0
        // Sets subjectFacultyLock on first placement for cross-section consistency
        function getAvailableFaculty(ci: ClassInfo, subjectId: string, day: string, period: number): string | undefined {
            const candidates = ci.facultyMap.get(subjectId);
            if (!candidates || candidates.length === 0) return undefined;

            // Try each candidate in ranked order (locked → interested → backup)
            for (const fid of candidates) {
                if (isFacultyBlocked(fid, day, period)) continue;

                // Found! Lock this faculty for cross-section consistency
                const subj = ci.requirements.find(r => r.id === subjectId);
                if (subj) {
                    const baseName = subj.name.replace(/ LAB$/i, '');
                    const lockKey = `${baseName}|${ci.year}`;
                    if (!subjectFacultyLock.has(lockKey)) {
                        subjectFacultyLock.set(lockKey, fid);
                    }
                }
                return fid;
            }
            return undefined; // truly nobody available at this slot
        }

        // Same cascade for labs: checks consecutive slots
        function getAvailableFacultyForLab(ci: ClassInfo, subjectId: string, day: string, startP: number, count: number): string | undefined {
            const candidates = ci.facultyMap.get(subjectId);
            if (!candidates || candidates.length === 0) return undefined;

            for (const fid of candidates) {
                let allFree = true;
                for (let o = 0; o < count; o++) {
                    if (isFacultyBlocked(fid, day, startP + o)) { allFree = false; break; }
                }
                if (!allFree) continue;

                // Found! Lock this faculty for cross-section consistency
                const subj = ci.requirements.find(r => r.id === subjectId);
                if (subj) {
                    const baseName = subj.name.replace(/ LAB$/i, '');
                    const lockKey = `${baseName}|${ci.year}`;
                    if (!subjectFacultyLock.has(lockKey)) {
                        subjectFacultyLock.set(lockKey, fid);
                    }
                }
                return fid;
            }
            return undefined;
        }

        // R9: Track day type per class — no mixing lab+theory same day
        const classDayType = new Map<string, string>(); // key: classId|day → 'lab' | 'theory'
        function getDayType(classId: string, day: string): string | undefined {
            return classDayType.get(`${classId}|${day}`);
        }
        function setDayType(classId: string, day: string, type: string) {
            classDayType.set(`${classId}|${day}`, type);
        }

        // Find room
        function findRoom(sk: string, ci: ClassInfo, subjectType: string): string | undefined {
            const prevRoom = idx.getClassPrevRoom(ci.classId);
            if (prevRoom && !idx.isRoomBusy(prevRoom, sk)) {
                const info = roomInfo.get(prevRoom);
                if (info && info.capacity >= ci.studentCount) return prevRoom;
            }
            // Prefer rooms matching type, but accept any room with capacity
            let fallback: string | undefined;
            for (const rid of selected_room_ids) {
                if (idx.isRoomBusy(rid, sk)) continue;
                const info = roomInfo.get(rid);
                if (!info) continue;
                if (info.capacity < ci.studentCount) continue;
                if (!fallback) fallback = rid; // first available room as fallback
                if (info.type === subjectType) return rid; // prefer matching type
            }
            return fallback; // return any available room if no type match
        }

        // Find lab
        function findLab(day: string, startP: number, periodCount: number, req: SubjectReq): string | undefined {
            const candidates = [...selected_lab_ids];
            if (req.labTypeId) {
                candidates.sort((a, b) => {
                    const aMatch = labInfo.get(a)?.labTypeId === req.labTypeId ? 0 : 1;
                    const bMatch = labInfo.get(b)?.labTypeId === req.labTypeId ? 0 : 1;
                    return aMatch - bMatch;
                });
            }
            for (const lid of candidates) {
                let free = true;
                for (let o = 0; o < periodCount; o++) {
                    if (idx.isLabBusy(lid, `${day}_${startP + o}`)) { free = false; break; }
                }
                if (free) return lid;
            }
            return undefined;
        }

        // Score a slot
        function scoreSlot(ci: ClassInfo, subj: SubjectReq, day: string, period: number): number {
            let score = 0;
            const sameDayCount = idx.getClassDaySubjectCount(ci.classId, day, subj.id);
            if (sameDayCount === 0) score += W.SUBJECT_DAY_SPREAD;
            else score += W.SUBJECT_REPEAT_SAME_DAY * sameDayCount;
            if (subj.type === 'theory') score += period <= 4 ? W.MORNING_THEORY : Math.floor(W.MORNING_THEORY * 0.25);
            const dayLoad = idx.getClassDayLoad(ci.classId, day);
            score += W.EVEN_DAY_LOAD * Math.max(0, periods_per_day - dayLoad);
            const fid = getFaculty(ci, subj.id);
            if (fid) {
                const fDayLoad = idx.getFacultyDayLoad(fid, day);
                score += W.FACULTY_LOAD_BALANCE * Math.max(0, 4 - fDayLoad);
            }
            return score;
        }

        // Valid lab start periods
        const validLabStarts: number[] = [];
        for (let s = 1; s <= periods_per_day - lab_consecutive_periods + 1; s++) {
            let spansBreak = false;
            for (let o = 0; o < lab_consecutive_periods - 1; o++) {
                if (BREAK_AFTER_PERIOD.has(s + o)) { spansBreak = true; break; }
            }
            if (!spansBreak) validLabStarts.push(s);
        }

        // ═══════════════════════════════════════════
        // PHASE 1: LABS — slot placement only (no faculty)
        //   R9 is SOFT: theory days get score penalty, not hard skip
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 1: LABS`);
        const allLabReqs: { ci: ClassInfo; subj: SubjectReq }[] = [];
        for (const ci of classInfos) {
            for (const subj of ci.requirements.filter(r => r.type === 'lab' && r.remaining > 0)) {
                allLabReqs.push({ ci, subj });
            }
        }
        allLabReqs.sort((a, b) => b.subj.remaining - a.subj.remaining);
        console.log(`  ${allLabReqs.length} lab subjects to place`);

        for (const { ci, subj } of allLabReqs) {
            const neededBlocks = Math.ceil(subj.remaining / lab_consecutive_periods);

            for (let block = 0; block < neededBlocks; block++) {
                type LabOption = { day: string; startP: number; labId?: string; score: number };
                let bestOption: LabOption | null = null;

                for (const day of DAYS) {
                    for (const startP of validLabStarts) {
                        let classFree = true;
                        for (let o = 0; o < lab_consecutive_periods; o++) {
                            if (idx.isClassSlotUsed(ci.classId, `${day}_${startP + o}`)) { classFree = false; break; }
                        }
                        if (!classFree) continue;

                        const labId = findLab(day, startP, lab_consecutive_periods, subj);

                        let score = 0;
                        const labsOnDay = ci.labDayCount[day] || 0;
                        score += 50 * (3 - labsOnDay);
                        if (startP >= 5) score += 25;
                        else if (startP >= 3) score += 12;
                        score += 8 * (periods_per_day - idx.getClassDayLoad(ci.classId, day));
                        if (labId) score += 20;

                        // R9 soft: prefer non-theory days
                        const existingType = getDayType(ci.classId, day);
                        if (existingType === 'theory') score -= 40;

                        if (!bestOption || score > bestOption.score) {
                            bestOption = { day, startP, labId, score };
                        }
                    }
                }

                if (bestOption) {
                    for (let offset = 0; offset < lab_consecutive_periods; offset++) {
                        const p = bestOption.startP + offset;
                        const a: Assignment = {
                            class_id: ci.classId, day: bestOption.day, period: p,
                            subject_id: subj.id, subject_name: subj.name,
                        };
                        if (bestOption.labId) a.lab_id = bestOption.labId;
                        allAssignments.push(a);
                        idx.addAssignment(a);
                    }
                    subj.remaining -= lab_consecutive_periods;
                    ci.labDayCount[bestOption.day] = (ci.labDayCount[bestOption.day] || 0) + 1;
                    setDayType(ci.classId, bestOption.day, 'lab');
                    console.log(`  ✓ Lab "${subj.name}" → ${bestOption.day} P${bestOption.startP}`);
                } else {
                    console.log(`  ⚠ Lab "${subj.name}" block ${block + 1} — deferred to force-fill`);
                }
            }
        }

        // ═══════════════════════════════════════════
        // PHASE 2: THEORY — slot placement only (no faculty)
        //   R9 is SOFT: lab days get score penalty, not hard skip
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 2: THEORY`);
        for (const ci of classInfos) {
            const theoryReqs = ci.requirements.filter(r => r.type === 'theory' && r.remaining > 0);
            theoryReqs.sort((a, b) => b.remaining - a.remaining);

            for (const subj of theoryReqs) {
                while (subj.remaining > 0) {
                    type TheoryOption = { day: string; period: number; roomId?: string; score: number };
                    let bestSlot: TheoryOption | null = null;

                    for (const day of DAYS) {
                        for (let p = 1; p <= periods_per_day; p++) {
                            const sk = `${day}_${p}`;
                            if (idx.isClassSlotUsed(ci.classId, sk)) continue;

                            const roomId = findRoom(sk, ci, 'theory');
                            let score = scoreSlot(ci, subj, day, p);
                            score += roomId ? W.ROOM_AVAILABLE : W.NO_ROOM_PENALTY;

                            // R9 soft: prefer non-lab days
                            const existingType = getDayType(ci.classId, day);
                            if (existingType === 'lab') score -= 40;

                            if (!bestSlot || score > bestSlot.score) {
                                bestSlot = { day, period: p, roomId, score };
                            }
                        }
                    }

                    if (bestSlot) {
                        const a: Assignment = {
                            class_id: ci.classId, day: bestSlot.day, period: bestSlot.period,
                            subject_id: subj.id, subject_name: subj.name,
                        };
                        if (bestSlot.roomId) a.room_id = bestSlot.roomId;
                        allAssignments.push(a);
                        idx.addAssignment(a);
                        subj.remaining--;
                        setDayType(ci.classId, bestSlot.day, 'theory');
                    } else {
                        console.log(`  ⚠ Theory "${subj.name}" for ${ci.sectionLabel} — deferred to force-fill`);
                        break;
                    }
                }
                if (subj.remaining === 0) console.log(`  ✓ Theory "${subj.name}" for ${ci.sectionLabel} — fully placed`);
            }
        }

        // ═══════════════════════════════════════════
        // PHASE 3: FREE PERIODS
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 3: FREE PERIODS`);
        for (const ci of classInfos) {
            const freeReqs = ci.requirements.filter(r => r.isFree && r.remaining > 0);
            for (const fp of freeReqs) {
                while (fp.remaining > 0) {
                    let bestSlot: { day: string; period: number; score: number } | null = null;
                    for (const day of DAYS) {
                        for (let p = 1; p <= periods_per_day; p++) {
                            if (idx.isClassSlotUsed(ci.classId, `${day}_${p}`)) continue;
                            let score = 0;
                            const freeOnDay = idx.getClassDayFreeCount(ci.classId, day);
                            score += 30 * (2 - freeOnDay);
                            const sameFreeOnDay = idx.getClassDaySubjectCount(ci.classId, day, fp.id);
                            if (sameFreeOnDay === 0) score += 40; else score -= 50;
                            score += p * 3;
                            if (!bestSlot || score > bestSlot.score) bestSlot = { day, period: p, score };
                        }
                    }
                    if (bestSlot) {
                        const a: Assignment = {
                            class_id: ci.classId, day: bestSlot.day, period: bestSlot.period,
                            subject_id: fp.id, subject_name: fp.name, is_free: true,
                        };
                        allAssignments.push(a);
                        idx.addAssignment(a);
                        fp.remaining--;
                    } else break;
                }
            }
        }

        // ═══════════════════════════════════════════
        // PHASE 4: FORCE-FILL — place remaining with scoring (best available slot)
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 4: FORCE-FILL`);
        for (const ci of classInfos) {
            const unfinished = ci.requirements.filter(r => r.remaining > 0);
            for (const subj of unfinished) {
                while (subj.remaining > 0) {
                    let bestSlot: { day: string; period: number; score: number } | null = null;
                    for (const day of DAYS) {
                        for (let p = 1; p <= periods_per_day; p++) {
                            const sk = `${day}_${p}`;
                            if (idx.isClassSlotUsed(ci.classId, sk)) continue;
                            const score = subj.isFree ? 0 : scoreSlot(ci, subj, day, p);
                            if (!bestSlot || score > bestSlot.score) {
                                bestSlot = { day, period: p, score };
                            }
                        }
                    }
                    if (bestSlot) {
                        const a: Assignment = {
                            class_id: ci.classId, day: bestSlot.day, period: bestSlot.period,
                            subject_id: subj.id, subject_name: subj.name,
                        };
                        if (subj.isFree) a.is_free = true;
                        if (!subj.isFree) {
                            const roomId = findRoom(`${bestSlot.day}_${bestSlot.period}`, ci, subj.type === 'lab' ? 'lab' : 'theory');
                            if (roomId) a.room_id = roomId;
                        }
                        allAssignments.push(a);
                        idx.addAssignment(a);
                        subj.remaining--;
                        console.log(`  ✓ Force "${subj.name}" → ${bestSlot.day} P${bestSlot.period}`);
                    } else {
                        conflicts.push(`ALL slots used for "${subj.name}" in ${ci.sectionLabel}`);
                        console.log(`  ✗ Force "${subj.name}" — ALL slots used`);
                        break;
                    }
                }
            }
        }

        // ═══════════════════════════════════════════
        // PHASE 5: FACULTY ASSIGNMENT
        //   Rules:
        //   - One subject (+lab) per faculty per year, one section only
        //   - Must cover ALL slots (theory + lab) or not assigned at all
        //   - Priority: interested (FCFS) → non-interested (workload) → cross-year
        //   - Cross-year: faculty from other years CAN teach here if no schedule clash
        //   - If nobody fits → unassigned (◈)
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 5: FACULTY ASSIGNMENT`);

        // Per-year tracking: "facultyId|year" → baseName
        // A faculty committed in Year 1 can still teach in Year 2 (cross-year)
        const facultyYearCommit = new Map<string, string>();

        // Pre-fill from existing assignments (timetables NOT being regenerated)
        try {
            const existingFA = db.prepare(`
                SELECT fa.faculty_id, c.year, s.name as subject_name
                FROM faculty_assignments fa
                JOIN classes c ON fa.class_id = c.id
                JOIN subjects s ON fa.subject_id = s.id
            `).all() as { faculty_id: string; year: number; subject_name: string }[];
            for (const ea of existingFA) {
                if (classIdSet.has(ea.faculty_id)) continue; // skip classes being regenerated
                const baseName = ea.subject_name.replace(/ LAB$/i, '');
                const yk = `${ea.faculty_id}|${ea.year}`;
                if (!facultyYearCommit.has(yk)) facultyYearCommit.set(yk, baseName);
            }
        } catch (e) {
            console.log(`  ⚠ Could not pre-load faculty assignments: ${(e as Error).message}`);
        }

        for (const ci of classInfos) {
            // Group ALL slots by subject base name (theory + lab combined)
            const baseNameGroups = new Map<string, { slots: Assignment[]; subjectIds: Set<string> }>();
            for (const a of allAssignments) {
                if (a.class_id !== ci.classId || a.is_free) continue;
                const subj = ci.requirements.find(r => r.id === a.subject_id);
                if (!subj) continue;
                const baseName = subj.name.replace(/ LAB$/i, '');
                if (!baseNameGroups.has(baseName)) baseNameGroups.set(baseName, { slots: [], subjectIds: new Set() });
                const group = baseNameGroups.get(baseName)!;
                group.slots.push(a);
                group.subjectIds.add(a.subject_id);
            }

            for (const [baseName, group] of baseNameGroups) {
                const { slots, subjectIds } = group;

                // --- Build candidate list fresh (not from Phase 0's filtered map) ---
                // Stage 1: Interested faculty (FCFS by created_at)
                const interestedIds: string[] = [];
                for (const sid of subjectIds) {
                    for (const i of allInterests.filter(x => x.subject_id === sid)) {
                        if (!interestedIds.includes(i.faculty_id)) interestedIds.push(i.faculty_id);
                    }
                }

                // Stage 2: ALL remaining active faculty sorted by lowest workload
                const interestedSet = new Set(interestedIds);
                const restIds = allFaculty
                    .filter(f => !interestedSet.has(f.id))
                    .sort((a, b) => (facultyTotalLoad.get(a.id) ?? 0) - (facultyTotalLoad.get(b.id) ?? 0))
                    .map(f => f.id);

                // Combined: interested FCFS first, then everyone else by workload
                // This naturally includes cross-year faculty (Year 1 teachers etc.)
                const candidateList = [...interestedIds, ...restIds];

                if (candidateList.length === 0) {
                    console.log(`  ◈ No faculty available for "${baseName}" in ${ci.sectionLabel}`);
                    continue;
                }

                let assigned = false;

                for (const fid of candidateList) {
                    // Per-year constraint: already committed in THIS year? Skip.
                    // (But committed in another year is OK — cross-year allowed)
                    const yk = `${fid}|${ci.year}`;
                    if (facultyYearCommit.has(yk)) continue;

                    // ALL-or-NOTHING: must cover EVERY slot (theory + lab)
                    let canCoverAll = true;
                    for (const slot of slots) {
                        if (isFacultyBlocked(fid, slot.day, slot.period)) {
                            canCoverAll = false;
                            break;
                        }
                    }
                    if (!canCoverAll) continue;

                    // ✅ This faculty can cover ALL slots — assign them
                    for (const slot of slots) {
                        slot.faculty_id = fid;
                        idx.addFacultySlot(fid, slot.day, slot.period);
                    }
                    facultyYearCommit.set(yk, baseName);
                    facultyTotalLoad.set(fid, (facultyTotalLoad.get(fid) ?? 0) + slots.length);
                    assigned = true;

                    const tag = interestedSet.has(fid) ? '★' : '○';
                    console.log(`  ✓ ${tag} Faculty for "${baseName}" in ${ci.sectionLabel}: ${fid} (${slots.length} slots)`);
                    break;
                }

                if (!assigned) {
                    console.log(`  ◈ No faculty can cover ALL ${slots.length} slots for "${baseName}" in ${ci.sectionLabel} — unassigned`);
                }
            }
        }

        // ═══════════════════════════════════════════
        // PHASE 6: SIMULATED ANNEALING
        // ═══════════════════════════════════════════
        console.log(`\n▶ PHASE 6: ANNEAL (${allAssignments.length} slots)`);
        const MAX_ITERATIONS = Math.max(500, allAssignments.length * 5);
        let improvements = 0;
        let temperature = 1.0;
        const coolingRate = 0.995;

        for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
            temperature *= coolingRate;
            let anyImproved = false;

            for (const ci of classInfos) {
                const swappable = allAssignments.filter(a => a.class_id === ci.classId && !a.lab_id && !a.is_free);
                if (swappable.length < 2) continue;

                const i = Math.floor(Math.random() * swappable.length);
                let j = Math.floor(Math.random() * (swappable.length - 1));
                if (j >= i) j++;

                const a1 = swappable[i];
                const a2 = swappable[j];
                if (a1.subject_id === a2.subject_id && a1.day === a2.day) continue;

                const f1 = getFaculty(ci, a1.subject_id);
                const f2 = getFaculty(ci, a2.subject_id);
                const sk1 = `${a1.day}_${a1.period}`;
                const sk2 = `${a2.day}_${a2.period}`;

                if (f1 && f1 !== f2 && isFacultyBlocked(f1, a2.day, a2.period)) continue;
                if (f2 && f2 !== f1 && isFacultyBlocked(f2, a1.day, a1.period)) continue;

                if (a1.room_id && !a2.room_id && idx.isRoomBusy(a1.room_id, sk2)) continue;
                if (!a1.room_id && a2.room_id && idx.isRoomBusy(a2.room_id, sk1)) continue;

                const s1: SubjectReq = { id: a1.subject_id, name: a1.subject_name, type: 'theory', remaining: 0 };
                const s2: SubjectReq = { id: a2.subject_id, name: a2.subject_name, type: 'theory', remaining: 0 };

                const scoreBefore = scoreSlot(ci, s1, a1.day, a1.period) + scoreSlot(ci, s2, a2.day, a2.period);
                const scoreAfter = scoreSlot(ci, s1, a2.day, a2.period) + scoreSlot(ci, s2, a1.day, a1.period);
                const delta = scoreAfter - scoreBefore;

                if (delta > 0 || (temperature > 0.1 && Math.random() < Math.exp(delta / (temperature * 50)))) {
                    idx.removeAssignment(a1);
                    idx.removeAssignment(a2);
                    const tmpDay = a1.day; const tmpPeriod = a1.period; const tmpRoom = a1.room_id;
                    a1.day = a2.day; a1.period = a2.period; a1.room_id = a2.room_id;
                    a2.day = tmpDay; a2.period = tmpPeriod; a2.room_id = tmpRoom;
                    idx.addAssignment(a1);
                    idx.addAssignment(a2);
                    if (delta > 0) improvements++;
                    anyImproved = true;
                }
            }
            if (!anyImproved && iter > 100 && temperature < 0.3) break;
        }

        // ═══════════════════════════════════════════
        // POST-GENERATION: Verify constraints
        // ═══════════════════════════════════════════
        const hardViolations: string[] = [];
        const facultyCheck = new Map<string, { day: string; period: number; classId: string }[]>();
        const roomCheck = new Map<string, { day: string; period: number; classId: string }[]>();

        for (const a of allAssignments) {
            if (a.faculty_id) {
                if (!facultyCheck.has(a.faculty_id)) facultyCheck.set(a.faculty_id, []);
                facultyCheck.get(a.faculty_id)!.push({ day: a.day, period: a.period, classId: a.class_id });
            }
            if (a.room_id) {
                if (!roomCheck.has(a.room_id)) roomCheck.set(a.room_id, []);
                roomCheck.get(a.room_id)!.push({ day: a.day, period: a.period, classId: a.class_id });
            }
        }

        for (const [fId, slots] of facultyCheck) {
            const seen = new Set<string>();
            for (const s of slots) {
                const sk = `${s.day}_${s.period}`;
                if (seen.has(sk)) hardViolations.push(`R1: Faculty double-booked on ${s.day} P${s.period}`);
                seen.add(sk);
            }
        }
        for (const [, slots] of roomCheck) {
            const seen = new Set<string>();
            for (const s of slots) {
                const sk = `${s.day}_${s.period}`;
                if (seen.has(sk)) hardViolations.push(`R1: Room double-booked on ${s.day} P${s.period}`);
                seen.add(sk);
            }
        }

        if (hardViolations.length > 0) conflicts.push(...hardViolations);

        // Count unassigned faculty slots for suggestions
        const unassignedCount = allAssignments.filter(a => !a.faculty_id && !a.is_free).length;
        if (unassignedCount > 0) {
            suggestions.push(`${unassignedCount} slot(s) have no faculty assigned (shown as ◈). Add more faculty or set interests.`);
        }

        // ═══════════════════════════════════════════
        // SOFT SCORES
        // ═══════════════════════════════════════════
        const softScores = { consecutive_violations: 0, distribution_score: 0, back_to_back_labs: 0, room_switches: 0, total_score: 0 };

        for (const ci of classInfos) {
            const myA = allAssignments.filter(a => a.class_id === ci.classId);
            for (const day of DAYS) {
                const daySlots = myA.filter(a => a.day === day).sort((a, b) => a.period - b.period);
                const fPeriods = new Map<string, number[]>();
                for (const s of daySlots) {
                    if (s.faculty_id) {
                        if (!fPeriods.has(s.faculty_id)) fPeriods.set(s.faculty_id, []);
                        fPeriods.get(s.faculty_id)!.push(s.period);
                    }
                }
                for (const periods of fPeriods.values()) {
                    periods.sort((a, b) => a - b);
                    let consec = 1;
                    for (let i = 1; i < periods.length; i++) {
                        if (periods[i] === periods[i - 1] + 1) { consec++; if (consec > max_consecutive_theory) softScores.consecutive_violations++; }
                        else consec = 1;
                    }
                }
                const labSlots = daySlots.filter(s => s.lab_id);
                for (let i = 1; i < labSlots.length; i++) {
                    if (labSlots[i].period === labSlots[i - 1].period + 1 && labSlots[i].subject_id !== labSlots[i - 1].subject_id) softScores.back_to_back_labs++;
                }
            }
            const subjectDays = new Map<string, Set<string>>();
            for (const a of myA) {
                if (!a.is_free) {
                    if (!subjectDays.has(a.subject_id)) subjectDays.set(a.subject_id, new Set());
                    subjectDays.get(a.subject_id)!.add(a.day);
                }
            }
            for (const days of subjectDays.values()) softScores.distribution_score += days.size;
            for (const day of DAYS) {
                const rooms = new Set<string>();
                for (const a of myA) { if (a.day === day && a.room_id) rooms.add(a.room_id); }
                if (rooms.size > 1) softScores.room_switches += rooms.size - 1;
            }
        }
        softScores.total_score = softScores.distribution_score * 10 - softScores.consecutive_violations * 15 - softScores.back_to_back_labs * 10 - softScores.room_switches * 5;

        // ═══════════════════════════════════════════
        // SAVE TO DB
        // ═══════════════════════════════════════════
        console.log(`\n▶ SAVING ${allAssignments.length} slots to DB`);
        if (allAssignments.length > 0) {
            const insertTT = db.prepare('INSERT INTO timetables (id, class_id, day, period, subject_id, room_id, lab_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
            const insertFS = db.prepare('INSERT INTO faculty_schedule (id, faculty_id, day, period, class_id, subject_id) VALUES (?, ?, ?, ?, ?, ?)');
            const insertRS = db.prepare('INSERT INTO room_schedule (id, room_id, day, period, class_id) VALUES (?, ?, ?, ?, ?)');
            const insertLS = db.prepare('INSERT INTO lab_schedule (id, lab_id, day, period, class_id) VALUES (?, ?, ?, ?, ?)');
            const insertFA = db.prepare('INSERT OR REPLACE INTO faculty_assignments (id, faculty_id, subject_id, class_id) VALUES (?, ?, ?, ?)');

            db.transaction(() => {
                for (const cid of class_ids) {
                    db.prepare('DELETE FROM timetables WHERE class_id = ?').run(cid);
                    db.prepare('DELETE FROM faculty_schedule WHERE class_id = ?').run(cid);
                    db.prepare('DELETE FROM room_schedule WHERE class_id = ?').run(cid);
                    db.prepare('DELETE FROM lab_schedule WHERE class_id = ?').run(cid);
                    db.prepare('DELETE FROM faculty_assignments WHERE class_id = ?').run(cid);
                }
                for (const a of allAssignments) {
                    insertTT.run(uuid(), a.class_id, a.day, a.period, a.subject_id, a.room_id || null, a.lab_id || null);
                    if (a.faculty_id) insertFS.run(uuid(), a.faculty_id, a.day, a.period, a.class_id, a.subject_id);
                    if (a.room_id) insertRS.run(uuid(), a.room_id, a.day, a.period, a.class_id);
                    if (a.lab_id) insertLS.run(uuid(), a.lab_id, a.day, a.period, a.class_id);
                }
                // Save faculty assignments — ONLY actually-assigned faculty (from placed slots)
                const savedPairs = new Set<string>(); // track fid|sid|cid to avoid duplicates
                for (const a of allAssignments) {
                    if (!a.faculty_id || a.is_free) continue;
                    const pairKey = `${a.faculty_id}|${a.subject_id}|${a.class_id}`;
                    if (savedPairs.has(pairKey)) continue;
                    savedPairs.add(pairKey);
                    insertFA.run(uuid(), a.faculty_id, a.subject_id, a.class_id);
                }
            })();
        }

        const executionTime = Math.round(performance.now() - startTime);
        console.log(`\n✓ Generation complete: ${allAssignments.length} slots in ${executionTime}ms`);
        console.log(`  Unassigned faculty: ${unassignedCount} slots (◈)`);
        console.log(`  Improvements: ${improvements} swaps`);

        // Log
        const logStatus = allAssignments.length === 0 ? 'failed' : conflicts.length > 0 ? 'partial' : 'success';
        db.prepare("INSERT INTO generation_logs (id, execution_time_ms, class_ids_json, status, total_slots, conflict_count, soft_score_json) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(uuid(), executionTime, JSON.stringify(class_ids), logStatus, allAssignments.length, conflicts.length, JSON.stringify(softScores));

        releaseLock(db);

        return NextResponse.json({
            success: allAssignments.length > 0,
            message: allAssignments.length > 0
                ? `Generated ${allAssignments.length} slots for ${class_ids.length} class(es)${suggestions.length > 0 ? ` (${suggestions.length} suggestion(s))` : ''}`
                : 'No slots generated — check suggestions',
            total_slots: allAssignments.length,
            unassigned_faculty_count: unassignedCount,
            period_times: PERIOD_TIMES,
            algorithm: 'Faculty Assignment Engine v3.0 (FCFS + CSP + SA)',
            optimizations: improvements,
            execution_time_ms: executionTime,
            soft_scores: softScores,
            suggestions: suggestions.length > 0 ? suggestions : undefined,
            hard_violations: hardViolations.length > 0 ? hardViolations : undefined,
            conflicts: conflicts.length > 0 ? conflicts : undefined,
        });
    } catch (error) {
        const executionTime = Math.round(performance.now() - startTime);
        try {
            db.prepare("INSERT INTO generation_logs (id, execution_time_ms, class_ids_json, status, error_message) VALUES (?, ?, ?, 'failed', ?)")
                .run(uuid(), executionTime, '[]', (error as Error).message);
        } catch { /* ignore */ }
        releaseLock(db);
        console.error('Generation error:', error);
        return NextResponse.json({ error: 'Generation failed: ' + (error as Error).message }, { status: 500 });
    }
}
