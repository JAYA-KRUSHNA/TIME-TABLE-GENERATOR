import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initializeDb(_db);
    runMigrations(_db);
  }
  return _db;
}

// Safely add columns that may be missing in older databases
function runMigrations(db: Database.Database) {
  const safeAddColumn = (table: string, column: string, definition: string) => {
    try {
      const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.find(c => c.name === column)) {
        db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        console.log(`✅ Migration: Added ${table}.${column}`);
      }
    } catch (e) {
      console.warn(`Migration skipped for ${table}.${column}:`, e);
    }
  };

  safeAddColumn('rooms', 'type', "TEXT DEFAULT 'theory'");
  safeAddColumn('subjects', 'subject_code', 'TEXT');
  safeAddColumn('subjects', 'year', 'INTEGER');
  safeAddColumn('faculty_subjects', 'created_at', 'TEXT');
  safeAddColumn('notifications', 'read_status', 'INTEGER DEFAULT 0');

  // Backfill nulls
  try { db.exec("UPDATE faculty_subjects SET created_at = datetime('now') WHERE created_at IS NULL"); } catch { }
  try { db.exec("UPDATE notifications SET read_status = read WHERE read_status IS NULL AND read IS NOT NULL"); } catch { }
}

function initializeDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL DEFAULT '',
      reg_no TEXT UNIQUE,
      year INTEGER,
      section TEXT,
      department TEXT DEFAULT 'CSE',
      status TEXT DEFAULT 'active',
      is_original_superadmin INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      section_name TEXT NOT NULL,
      student_count INTEGER DEFAULT 0,
      max_capacity INTEGER DEFAULT 70,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject_code TEXT,
      department_id TEXT NOT NULL,
      year INTEGER,
      type TEXT NOT NULL DEFAULT 'theory',
      hours_per_week INTEGER DEFAULT 3,
      lab_type_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS lab_types (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS labs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lab_type_id TEXT NOT NULL,
      capacity INTEGER DEFAULT 30,
      FOREIGN KEY (lab_type_id) REFERENCES lab_types(id)
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      capacity INTEGER DEFAULT 70,
      type TEXT DEFAULT 'theory'
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      department_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      section_id TEXT NOT NULL,
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (section_id) REFERENCES sections(id)
    );

    CREATE TABLE IF NOT EXISTS timetables (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      subject_id TEXT,
      room_id TEXT,
      lab_id TEXT,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS faculty_subjects (
      id TEXT PRIMARY KEY,
      faculty_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      FOREIGN KEY (faculty_id) REFERENCES profiles(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id),
      UNIQUE(faculty_id, subject_id)
    );

    CREATE TABLE IF NOT EXISTS faculty_schedule (
      id TEXT PRIMARY KEY,
      faculty_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT,
      FOREIGN KEY (faculty_id) REFERENCES profiles(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS faculty_assignments (
      id TEXT PRIMARY KEY,
      faculty_id TEXT NOT NULL,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      FOREIGN KEY (faculty_id) REFERENCES profiles(id),
      FOREIGN KEY (class_id) REFERENCES classes(id),
      FOREIGN KEY (subject_id) REFERENCES subjects(id)
    );

    CREATE TABLE IF NOT EXISTS room_schedule (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      class_id TEXT NOT NULL,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS lab_schedule (
      id TEXT PRIMARY KEY,
      lab_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      class_id TEXT NOT NULL,
      FOREIGN KEY (lab_id) REFERENCES labs(id),
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS extracurriculars (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      periods_per_week INTEGER NOT NULL,
      FOREIGN KEY (class_id) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      type TEXT DEFAULT 'direct',
      participant_ids TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      read_status INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id),
      FOREIGN KEY (sender_id) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES profiles(id)
    );

    CREATE TABLE IF NOT EXISTS academic_calendar (
      id TEXT PRIMARY KEY,
      department_id TEXT,
      date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target_table TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT 'verification',
      attempts INTEGER DEFAULT 0,
      max_attempts INTEGER DEFAULT 3,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS faculty_availability (
      id TEXT PRIMARY KEY,
      faculty_id TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL,
      is_available INTEGER DEFAULT 1,
      FOREIGN KEY (faculty_id) REFERENCES profiles(id),
      UNIQUE(faculty_id, day, period)
    );

    CREATE TABLE IF NOT EXISTS generation_logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT DEFAULT (datetime('now')),
      execution_time_ms INTEGER NOT NULL,
      class_ids_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      total_slots INTEGER DEFAULT 0,
      conflict_count INTEGER DEFAULT 0,
      soft_score_json TEXT,
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS data_change_tracker (
      id TEXT PRIMARY KEY,
      table_name TEXT NOT NULL,
      last_changed TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed default data if empty
  const deptCount = db.prepare('SELECT COUNT(*) as c FROM departments').get() as { c: number };
  if (deptCount.c === 0) {
    const deptId = crypto.randomUUID();
    db.prepare('INSERT INTO departments (id, name, code) VALUES (?, ?, ?)').run(deptId, 'Computer Science & Engineering', 'CSE');

    // Default sections
    for (let year = 1; year <= 4; year++) {
      for (const sec of ['A', 'B', 'C']) {
        db.prepare('INSERT INTO sections (id, department_id, year, section_name) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), deptId, year, sec);
      }
    }

    // Lab types
    const labTypes = ['Programming Lab', 'Networks Lab', 'Database Lab', 'AI/ML Lab', 'Electronics Lab', 'Physics Lab', 'Chemistry Lab'];
    for (const lt of labTypes) {
      db.prepare('INSERT INTO lab_types (id, name) VALUES (?, ?)').run(crypto.randomUUID(), lt);
    }

    // Default rooms (15 classrooms)
    for (let i = 1; i <= 15; i++) {
      db.prepare('INSERT INTO rooms (id, name, capacity) VALUES (?, ?, ?)').run(crypto.randomUUID(), `CR-${100 + i}`, 70);
    }

    // Default labs (3 labs)
    const progLabId = db.prepare("SELECT id FROM lab_types WHERE name = 'Programming Lab'").get() as { id: string } | undefined;
    const netLabId = db.prepare("SELECT id FROM lab_types WHERE name = 'Networks Lab'").get() as { id: string } | undefined;
    const dbLabId = db.prepare("SELECT id FROM lab_types WHERE name = 'Database Lab'").get() as { id: string } | undefined;
    if (progLabId) db.prepare('INSERT INTO labs (id, name, lab_type_id, capacity) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), 'Lab-1', progLabId.id, 70);
    if (netLabId) db.prepare('INSERT INTO labs (id, name, lab_type_id, capacity) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), 'Lab-2', netLabId.id, 70);
    if (dbLabId) db.prepare('INSERT INTO labs (id, name, lab_type_id, capacity) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), 'Lab-3', dbLabId.id, 70);
  }

  // Seed super admins if none exist
  const adminCount = db.prepare("SELECT COUNT(*) as c FROM profiles WHERE role = 'superadmin'").get() as { c: number };
  if (adminCount.c === 0) {
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('jk@12345', 10);
    const admins = [
      { email: 'jayakrushna1622@gmail.com', name: 'Jayakrushna' },
      { email: 'machanoorukeerthi24@gmail.com', name: 'Keerthi' },
    ];
    for (const admin of admins) {
      db.prepare('INSERT INTO profiles (id, role, name, email, password, department, status, is_original_superadmin) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
        crypto.randomUUID(), 'superadmin', admin.name, admin.email, hash, 'CSE', 'active', 1
      );
    }
  }
}

export function uuid(): string {
  return crypto.randomUUID();
}
