import fs from 'fs';
import path from 'path';
import {
  APP_CONFIG,
  SCHEMA_DEF,
  SCHOOL_SETTING_DEFS,
  addMinutes,
  createDefaultJamPelajaran,
  createInitialSeedData,
  formatMakassarTimestamp,
} from './seedData.ts';
import type { ActorInfo, AvailableRoleOption, DatabasePayload, GenericRow, RoleKey, UserRecord } from '../types/siakad.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'siakad-db.json');

type DbStore = Record<string, GenericRow[]>;

let dbCache: DbStore | null = null;
let writeQueue: Promise<any> = Promise.resolve();

function generateId(prefix: string): string {
  return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 90 + 10);
}

function normalizeTimeValue(value: unknown): string {
  if (value instanceof Date) {
    const h = ('0' + value.getHours()).slice(-2);
    const m = ('0' + value.getMinutes()).slice(-2);
    return `${h}:${m}`;
  }
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return '';
  let m = /^(?:1899-12-30[T ]?)?(\d{1,2})[:.](\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z)?$/i.exec(raw);
  if (!m) m = /^1899-12-30T(\d{1,2}):(\d{2})/i.exec(raw);
  if (!m) throw new Error('Format jam tidak valid: ' + raw + '. Gunakan HH:mm, contoh 07:45.');
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) throw new Error('Jam di luar rentang yang valid: ' + raw);
  return ('0' + h).slice(-2) + ':' + ('0' + min).slice(-2);
}

function getSettingFromStore(db: DbStore, key: string, fallback: string): string {
  const f = (db.Settings || []).find(r => String(r.key) === key);
  return f && String(f.value) !== '' ? String(f.value) : fallback;
}

function ensureStoreIntegrity(db: DbStore): DbStore {
  Object.keys(SCHEMA_DEF).forEach(table => {
    if (!Array.isArray(db[table])) {
      db[table] = [];
    }
  });

  // Ensure all SCHOOL_SETTING_DEFS keys exist without overwriting existing values
  SCHOOL_SETTING_DEFS.forEach(def => {
    if (!db.Settings.some(s => String(s.key) === def.key)) {
      db.Settings.push({ key: def.key, value: def.def, description: def.description });
    }
  });

  // Ensure JamPelajaran has default 8 slots if empty
  if (db.JamPelajaran.length === 0) {
    const dur = Number(getSettingFromStore(db, 'jp_duration_minutes', '40')) || 40;
    db.JamPelajaran = createDefaultJamPelajaran(dur);
  }

  // One-time upgrade for Tendik role, 7 Kebiasaan KAIH fields, and initial KehadiranGTK if empty
  if (!db.Settings.some(s => String(s.key) === '_migrated_v2_tendik_kaih')) {
    if (!db.Users.some(u => u.id === 'USR-TDK01' || u.role === 'tendik')) {
      db.Users.push({
        id: 'USR-TDK01',
        username: 'rudi.tendik',
        password: '123456',
        full_name: 'Rudi Hartono, A.Md.',
        nip: '19930812 202203 1 006',
        role: 'tendik',
        avatar_initials: 'RH',
        phone: '081239001110',
        status: 'Aktif',
      });
    }
    (db.GuruWaliRecords || []).forEach(r => {
      if (r.hab_bangun_pagi === undefined || r.hab_bangun_pagi === '') r.hab_bangun_pagi = Number(r.disiplin) || 4;
      if (r.hab_beribadah === undefined || r.hab_beribadah === '') r.hab_beribadah = Number(r.spiritual) || 5;
      if (r.hab_berolahraga === undefined || r.hab_berolahraga === '') r.hab_berolahraga = 4;
      if (r.hab_makan_sehat === undefined || r.hab_makan_sehat === '') r.hab_makan_sehat = 4;
      if (r.hab_gemar_belajar === undefined || r.hab_gemar_belajar === '') r.hab_gemar_belajar = Number(r.kemandirian) || 5;
      if (r.hab_bermasyarakat === undefined || r.hab_bermasyarakat === '') r.hab_bermasyarakat = Number(r.relasi_sosial) || 5;
      if (r.hab_tidur_cepat === undefined || r.hab_tidur_cepat === '') r.hab_tidur_cepat = 4;
    });
    if ((db.KehadiranGTK || []).length === 0) {
      const todayIso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(new Date());
      (db.Users || [])
        .filter(u => ['kepala_sekolah', 'guru', 'tendik'].includes(String(u.role)) && u.status === 'Aktif')
        .forEach((u, idx) => {
          db.KehadiranGTK.push({
            id: `KGT-SEED-${idx + 1}`,
            tanggal: todayIso,
            nama: u.full_name,
            jabatan: u.role === 'kepala_sekolah' ? 'Kepala Sekolah' : u.role === 'tendik' ? 'Tendik' : 'Guru',
            jam_masuk: idx === 3 ? '07:22' : '07:08',
            jam_pulang: '14:15',
            status: idx === 3 ? 'Terlambat' : 'Hadir',
            keterangan: idx === 3 ? 'Hujan deras di jalan' : 'Tepat waktu',
            user_id: u.id,
            sumber: 'Inisialisasi Sistem',
          });
        });
    }
    db.Settings.push({ key: '_migrated_v2_tendik_kaih', value: '1', description: 'Migrasi v2 Tendik & 7 KAIH' });
  }

  return db;
}

function loadDb(): DbStore {
  if (dbCache) return dbCache;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const parsed = JSON.parse(raw) as DbStore;
      dbCache = ensureStoreIntegrity(parsed);
      return dbCache;
    } catch {
      // Fall back to fresh seed if file is corrupted
    }
  }
  dbCache = ensureStoreIntegrity(createInitialSeedData());
  persistDb(dbCache);
  return dbCache;
}

function persistDb(db: DbStore): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function withWriteLock<T>(fn: (db: DbStore) => T): Promise<T> {
  const next = writeQueue.then(() => {
    const db = loadDb();
    const res = fn(db);
    persistDb(db);
    return res;
  });
  writeQueue = next.catch(() => {});
  return next;
}

function appendLog(
  db: DbStore,
  userId?: string,
  userName?: string,
  role?: string,
  action?: string,
  detail?: string
): void {
  db.ActivityLogs.push({
    id: generateId('LOG'),
    timestamp: formatMakassarTimestamp(),
    user_id: userId || 'SYS',
    user_name: userName || 'System',
    role: role || '-',
    action: action || '',
    detail: detail || '',
  });
}

function assertRole(actor: ActorInfo | null | undefined, roles: string[]): void {
  if (!actor || !roles.includes(actor.activeRole)) {
    throw new Error('Anda tidak memiliki hak akses untuk tindakan ini.');
  }
}

export function getInitialBootstrapData(): DatabasePayload {
  const db = loadDb();
  const payload: Record<string, any> = {};
  Object.keys(SCHEMA_DEF).forEach(table => {
    if (table === 'Users') {
      payload.UsersPublic = (db.Users || []).map(u => {
        const copy = { ...u };
        delete copy.password;
        return copy;
      });
    } else {
      payload[table] = db[table] || [];
    }
  });
  payload._warnings = [];
  return JSON.parse(JSON.stringify(payload)) as DatabasePayload;
}

function buildUserRolesList(
  user: UserRecord,
  jabatans: GenericRow[],
  classes: GenericRow[]
): AvailableRoleOption[] {
  const list: AvailableRoleOption[] = [];
  const roleLabels: Record<string, string> = {
    admin: 'Administrator Sistem',
    kepala_sekolah: 'Kepala Sekolah',
    guru: 'Guru Mata Pelajaran',
    tendik: 'Tendik',
    wali_kelas: 'Wali Kelas',
    waka_kurikulum: 'Wakil Kepala Sekolah Bidang Kurikulum',
    waka_kesiswaan: 'Wakil Kepala Sekolah Bidang Kesiswaan',
    waka_humas: 'Wakil Kepala Sekolah Bidang Humas',
    waka_sarpras: 'Wakil Kepala Sekolah Bidang Sarpras',
    admin_kokurikuler: 'Admin Kokurikuler (P5)',
    wali_murid: 'Orang Tua / Wali Murid',
  };

  list.push({
    role_key: user.role,
    label: roleLabels[user.role] || user.role,
    target_id: '',
    detail: user.role === 'guru' || user.role === 'tendik' ? 'Panel Guru / Tendik & Wali Siswa' : 'Akses Utama',
  });

  classes
    .filter(c => String(c.wali_kelas_id) === String(user.id))
    .forEach(cls => {
      const exists = list.some(r => r.role_key === 'wali_kelas' && r.target_id === cls.id);
      if (!exists) {
        list.push({
          role_key: 'wali_kelas',
          label: `Wali Kelas ${cls.name}`,
          target_id: cls.id,
          detail: `Rombongan Belajar Kelas ${cls.name}`,
        });
      }
    });

  jabatans
    .filter(j => String(j.teacher_id) === String(user.id) && j.status === 'Aktif')
    .forEach(jab => {
      const rk = (jab.role_key || 'guru') as RoleKey;
      const exists = list.some(r => r.role_key === rk && String(r.target_id || '') === String(jab.target_id || ''));
      if (!exists && rk !== 'guru' && rk !== 'tendik') {
        list.push({
          role_key: rk,
          label: jab.jabatan_name,
          target_id: jab.target_id || '',
          detail: jab.sk_number ? `SK: ${jab.sk_number}` : 'Tugas Tambahan Aktif',
        });
      }
    });

  return list;
}

export async function authenticateUser(loginPayload: {
  mode: 'quick' | 'manual';
  userId?: string;
  username?: string;
  password?: string;
}) {
  return withWriteLock(db => {
    const users = (db.Users || []) as UserRecord[];
    const jabatans = db.TeacherJabatans || [];
    const classes = db.Classes || [];

    let matchedUser: UserRecord | undefined;
    if (loginPayload.mode === 'quick') {
      matchedUser = users.find(u => u.id === loginPayload.userId && u.status === 'Aktif');
    } else {
      const uname = String(loginPayload.username || '').trim().toLowerCase();
      const pwd = String(loginPayload.password || '').trim();
      matchedUser = users.find(
        u => String(u.username).toLowerCase() === uname && String(u.password) === pwd && u.status === 'Aktif'
      );
    }

    if (!matchedUser) {
      return { success: false, message: 'Username atau password tidak sesuai / akun tidak aktif.' };
    }

    const roles = buildUserRolesList(matchedUser, jabatans, classes);
    const safeUser = { ...matchedUser };
    delete safeUser.password;

    appendLog(db, safeUser.id, safeUser.full_name, safeUser.role, 'LOGIN', 'Berhasil masuk ke sistem');
    return {
      success: true,
      user: safeUser,
      availableRoles: roles,
    };
  });
}

export async function saveRecord(sheetName: string, recordObj: GenericRow, actor?: ActorInfo | null) {
  if (!SCHEMA_DEF[sheetName]) {
    throw new Error('Sheet tidak dikenali: ' + sheetName);
  }
  return withWriteLock(db => {
    const headers = SCHEMA_DEF[sheetName];
    const rows = db[sheetName] || [];
    const copy: GenericRow = { ...recordObj };
    let isNew = false;

    if (!copy.id) {
      copy.id = generateId(sheetName.substring(0, 3).toUpperCase());
      isNew = true;
    }

    if (sheetName === 'Users' && isNew && !copy.password) {
      copy.password = '123456';
    }

    const existingIdx = rows.findIndex(r => String(r.id) === String(copy.id));

    if (sheetName === 'Users' && existingIdx >= 0 && !copy.password) {
      copy.password = rows[existingIdx].password;
    }

    if (sheetName === 'JadwalPelajaran') {
      copy.start_time = normalizeTimeValue(copy.start_time);
    } else if (sheetName === 'JamPelajaran') {
      copy.start_time = normalizeTimeValue(copy.start_time);
      copy.end_time = normalizeTimeValue(copy.end_time);
    }

    const normalized: GenericRow = {};
    headers.forEach(h => {
      normalized[h] = copy[h] !== undefined && copy[h] !== null ? copy[h] : '';
    });

    if (existingIdx >= 0) {
      rows[existingIdx] = normalized;
    } else {
      isNew = true;
      rows.push(normalized);
    }

    if (sheetName === 'Students' && isNew) {
      const pramuka = (db.Ekstrakurikuler || []).find(
        e => String(e.is_mandatory) === 'true' || String(e.name).toLowerCase().includes('pramuka')
      );
      if (pramuka) {
        db.EkskulAssessments.push({
          id: generateId('EKA'),
          ekskul_id: pramuka.id,
          student_id: normalized.id,
          predicate: 'Baik',
          note: 'Aktif mengikuti kegiatan kepramukaan.',
          semester: getSettingFromStore(db, 'active_semester', APP_CONFIG.DEFAULT_SEMESTER),
        });
      }
    }

    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      (isNew ? 'CREATE_' : 'UPDATE_') + sheetName,
      `ID: ${normalized.id}`
    );

    const safeRecord = { ...normalized };
    if (sheetName === 'Users') delete safeRecord.password;
    return { success: true, record: safeRecord, isNew };
  });
}

export async function deleteRecord(sheetName: string, recordId: string, actor?: ActorInfo | null) {
  if (!SCHEMA_DEF[sheetName]) {
    throw new Error('Sheet tidak dikenali: ' + sheetName);
  }
  return withWriteLock(db => {
    db[sheetName] = (db[sheetName] || []).filter(r => String(r.id) !== String(recordId));
    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      'DELETE_' + sheetName,
      `ID: ${recordId}`
    );
    return { success: true };
  });
}

export async function saveSessionAttendanceBatch(
  sessionId: string,
  recordsList: GenericRow[],
  actor?: ActorInfo | null
) {
  return withWriteLock(db => {
    const existing = db.AttendanceRecords || [];
    (recordsList || []).forEach(item => {
      const idx = existing.findIndex(
        r => String(r.session_id) === String(sessionId) && String(r.student_id) === String(item.student_id)
      );
      const recObj = {
        id: item.id || (idx >= 0 ? existing[idx].id : generateId('REC')),
        session_id: sessionId,
        student_id: item.student_id,
        status: item.status || 'H',
        score: item.score !== '' && item.score !== null && item.score !== undefined ? Number(item.score) : '',
        predicate: item.predicate || '',
        note: item.note || '',
      };
      if (idx >= 0) {
        existing[idx] = recObj;
      } else {
        existing.push(recObj);
      }
    });

    appendLog(
      db,
      actor?.id,
      actor?.full_name,
      actor?.activeRole,
      'BATCH_ATTENDANCE_SCORE',
      `Sesi ${sessionId} (${recordsList.length} siswa)`
    );
    return { success: true };
  });
}

export async function createSessionsFromProta(payload: GenericRow, actor?: ActorInfo | null) {
  return withWriteLock(db => {
    const count = Math.max(1, Math.min(20, Number(payload.meeting_count) || 1));
    const intervalDays = Math.max(1, Number(payload.interval_days) || 7);
    const baseDate = new Date(payload.start_date || new Date());
    const created: GenericRow[] = [];

    for (let i = 0; i < count; i++) {
      const d = new Date(baseDate.getTime() + i * intervalDays * 86400000);
      const dateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Makassar' }).format(d);
      const rec = {
        id: generateId('SES'),
        teacher_class_id: payload.teacher_class_id,
        class_id: payload.class_id,
        subject_id: payload.subject_id,
        teacher_id: payload.teacher_id,
        session_type: payload.session_type || 'NH',
        atp_id: payload.atp_id || '',
        atp_code: payload.atp_code || '',
        title: `${payload.title_prefix} — Pertemuan ${i + 1}`,
        session_date: dateStr,
        kbm_activities: '',
        kbm_problems: '',
        kbm_solutions: '',
      };
      created.push(rec);
      db.AttendanceSessions.push(rec);
    }

    appendLog(db, actor?.id, actor?.full_name, actor?.activeRole, 'GENERATE_SESSIONS_PROTA', `${count} sesi dibuat`);
    return { success: true, sessions: created };
  });
}

export async function saveClassAssignments(
  classId: string,
  pairs: Array<{ subject_id: string; teacher_id: string }>,
  actor?: ActorInfo | null
) {
  return withWriteLock(db => {
    const tcs = db.TeacherClasses || [];
    const moved: Record<string, string> = {};
    let added = 0;
    let updated = 0;
    let removed = 0;
    const toRemoveIds = new Set<string>();

    (pairs || []).forEach(p => {
      const existing = tcs.find(
        t => String(t.class_id) === String(classId) && String(t.subject_id) === String(p.subject_id)
      );
      if (existing) {
        if (!p.teacher_id) {
          toRemoveIds.add(String(existing.id));
          removed++;
        } else if (String(existing.teacher_id) !== String(p.teacher_id)) {
          existing.teacher_id = p.teacher_id;
          moved[String(existing.id)] = p.teacher_id;
          updated++;
        }
      } else if (p.teacher_id) {
        tcs.push({
          id: generateId('TCL'),
          teacher_id: p.teacher_id,
          class_id: classId,
          subject_id: p.subject_id,
          academic_year: getSettingFromStore(db, 'academic_year', APP_CONFIG.DEFAULT_YEAR),
          semester: getSettingFromStore(db, 'active_semester', APP_CONFIG.DEFAULT_SEMESTER),
        });
        added++;
      }
    });

    if (Object.keys(moved).length > 0) {
      (db.AttendanceSessions || []).forEach(s => {
        const nt = moved[String(s.teacher_class_id)];
        if (nt) s.teacher_id = nt;
      });
    }

    if (toRemoveIds.size > 0) {
      db.TeacherClasses = tcs.filter(t => !toRemoveIds.has(String(t.id)));
    }

    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      'SAVE_CLASS_ASSIGNMENTS',
      `Kelas ${classId}: +${added} ~${updated} -${removed}`
    );
    return { success: true, added, updated, removed };
  });
}

export async function addEkskulMembers(ekskulId: string, studentIds: string[], actor?: ActorInfo | null) {
  return withWriteLock(db => {
    const exist = new Set(
      (db.EkskulAssessments || [])
        .filter(a => String(a.ekskul_id) === String(ekskulId))
        .map(a => String(a.student_id))
    );
    let added = 0;
    const sem = getSettingFromStore(db, 'active_semester', APP_CONFIG.DEFAULT_SEMESTER);
    (studentIds || []).forEach(sid => {
      if (exist.has(String(sid))) return;
      exist.add(String(sid));
      db.EkskulAssessments.push({
        id: generateId('EKA'),
        ekskul_id: ekskulId,
        student_id: sid,
        predicate: 'Baik',
        note: '',
        semester: sem,
      });
      added++;
    });
    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      'ADD_EKSKUL_MEMBERS',
      `Ekskul ${ekskulId}: +${added}`
    );
    return { success: true, added };
  });
}

export async function importKehadiranGtk(rows: GenericRow[], actor?: ActorInfo | null) {
  return withWriteLock(db => {
    const users = db.Users || [];
    const uByName: Record<string, GenericRow> = {};
    users.forEach(u => {
      uByName[String(u.full_name).trim().toLowerCase()] = u;
    });

    const keyOf = (d: string, n: string) => String(d) + '|' + String(n).trim().toLowerCase();
    const existingMap: Record<string, number> = {};
    (db.KehadiranGTK || []).forEach((item, idx) => {
      existingMap[keyOf(item.tanggal, item.nama)] = idx;
    });

    let added = 0;
    let updated = 0;
    let skipped = 0;

    (rows || []).forEach(r => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r.tanggal)) || !String(r.nama || '').trim()) {
        skipped++;
        return;
      }
      const cleanName = String(r.nama).trim();
      const u = uByName[cleanName.toLowerCase()];
      const key = keyOf(r.tanggal, cleanName);
      const entry: GenericRow = {
        tanggal: r.tanggal,
        nama: cleanName,
        jabatan:
          r.jabatan ||
          (u ? (u.role === 'kepala_sekolah' ? 'Kepala Sekolah' : u.role === 'tendik' ? 'Tendik' : 'Guru') : ''),
        jam_masuk: r.jam_masuk || '',
        jam_pulang: r.jam_pulang || '',
        status: r.status || 'Hadir',
        keterangan: r.keterangan || '',
        user_id: u ? u.id : '',
        sumber: 'Impor Attendance Mgmt',
      };
      if (existingMap[key] !== undefined) {
        const idx = existingMap[key];
        entry.id = db.KehadiranGTK[idx].id;
        db.KehadiranGTK[idx] = entry;
        updated++;
      } else {
        entry.id = generateId('KGT');
        existingMap[key] = db.KehadiranGTK.length;
        db.KehadiranGTK.push(entry);
        added++;
      }
    });

    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      'IMPORT_KEHADIRAN_GTK',
      `+${added} ~${updated} lewat:${skipped}`
    );
    return { success: true, added, updated, skipped };
  });
}

export async function importStudentsBulk(rows: GenericRow[], actor?: ActorInfo | null) {
  assertRole(actor, ['admin']);
  return withWriteLock(db => {
    const classes = db.Classes || [];
    const users = db.Users || [];
    const students = db.Students || [];
    const pramuka = (db.Ekstrakurikuler || []).find(
      e => String(e.is_mandatory) === 'true' || String(e.name).toLowerCase().includes('pramuka')
    );
    const sem = getSettingFromStore(db, 'active_semester', APP_CONFIG.DEFAULT_SEMESTER);

    const resolveClassId = (raw: unknown): string => {
      const clean = String(raw || '').trim();
      if (!clean) return classes[0]?.id || '';
      const exact = classes.find(c => String(c.id).toLowerCase() === clean.toLowerCase());
      if (exact) return String(exact.id);
      const norm = clean.replace(/^kelas\s+/i, '').trim().toLowerCase();
      const byName = classes.find(c => String(c.name).trim().toLowerCase() === norm);
      return byName ? String(byName.id) : clean;
    };

    const resolveGuruWaliId = (raw: unknown): string => {
      const clean = String(raw || '').trim();
      if (!clean) return '';
      const byId = users.find(u => String(u.id).toLowerCase() === clean.toLowerCase());
      if (byId) return String(byId.id);
      const byName = users.find(
        u =>
          ['guru', 'tendik'].includes(String(u.role)) &&
          String(u.full_name).trim().toLowerCase() === clean.toLowerCase()
      );
      if (byName) return String(byName.id);
      const partial = users.find(
        u =>
          ['guru', 'tendik'].includes(String(u.role)) &&
          String(u.full_name).toLowerCase().includes(clean.toLowerCase())
      );
      return partial ? String(partial.id) : '';
    };

    let added = 0;
    let updated = 0;
    let skipped = 0;

    (rows || []).forEach(r => {
      const fullName = String(r.full_name || '').trim();
      if (!fullName) {
        skipped++;
        return;
      }
      const nis = String(r.nis || '').trim();
      const nisn = String(r.nisn || '').trim();
      const genderRaw = String(r.gender || 'L').trim().toUpperCase();
      const gender = genderRaw.startsWith('P') ? 'P' : 'L';
      const classId = resolveClassId(r.class_id);
      const guruWaliId = resolveGuruWaliId(r.guru_wali_id);

      const existingIdx = students.findIndex(
        s => (nis && String(s.nis).trim() === nis) || (nisn && String(s.nisn).trim() === nisn)
      );

      if (existingIdx >= 0) {
        const cur = students[existingIdx];
        students[existingIdx] = {
          ...cur,
          nis: nis || cur.nis,
          nisn: nisn || cur.nisn,
          full_name: fullName,
          gender,
          class_id: classId || cur.class_id,
          parent_name: String(r.parent_name ?? cur.parent_name ?? ''),
          parent_phone: String(r.parent_phone ?? cur.parent_phone ?? ''),
          guru_wali_id: guruWaliId || cur.guru_wali_id || '',
          literacy_level: String(r.literacy_level || cur.literacy_level || 'Cakap'),
          numeracy_level: String(r.numeracy_level || cur.numeracy_level || 'Cakap'),
          dream_job: String(r.dream_job ?? cur.dream_job ?? ''),
          status: 'Aktif',
        };
        updated++;
      } else {
        const newId = generateId('STD');
        students.push({
          id: newId,
          nis: nis || String(Math.floor(1000000 + Math.random() * 9000000)),
          nisn: nisn || '-',
          full_name: fullName,
          gender,
          class_id: classId,
          parent_name: String(r.parent_name || ''),
          parent_phone: String(r.parent_phone || ''),
          guru_wali_id: guruWaliId,
          literacy_level: String(r.literacy_level || 'Cakap'),
          numeracy_level: String(r.numeracy_level || 'Cakap'),
          dream_job: String(r.dream_job || ''),
          status: 'Aktif',
        });
        if (pramuka) {
          db.EkskulAssessments.push({
            id: generateId('EKA'),
            ekskul_id: pramuka.id,
            student_id: newId,
            predicate: 'Baik',
            note: 'Aktif mengikuti kegiatan kepramukaan.',
            semester: sem,
          });
        }
        added++;
      }
    });

    db.Students = students;
    appendLog(
      db,
      actor?.id || 'SYS',
      actor?.full_name || 'System',
      actor?.activeRole || '-',
      'IMPORT_STUDENTS_BULK',
      `Impor masal siswa: +${added} baru, ~${updated} diperbarui, ${skipped} dilewati`
    );
    return { success: true, added, updated, skipped };
  });
}

export async function saveSchoolSettings(values: Record<string, unknown>, actor?: ActorInfo | null) {
  if (!values || typeof values !== 'object') throw new Error('Data pengaturan tidak valid.');
  const defs: Record<string, { key: string; description: string; def: string }> = {};
  SCHOOL_SETTING_DEFS.forEach(d => {
    defs[d.key] = d;
  });
  const keys = Object.keys(values).filter(k => Boolean(defs[k]));
  if (!keys.length) throw new Error('Tidak ada pengaturan yang dikenali.');

  const onlyJp = keys.length === 1 && keys[0] === 'jp_duration_minutes';
  if (!onlyJp && (!actor || actor.activeRole !== 'admin')) {
    throw new Error('Hanya Administrator yang dapat mengubah identitas sekolah.');
  }

  const v = (k: string) => String(values[k] === undefined || values[k] === null ? '' : values[k]).trim();
  const has = (k: string) => keys.includes(k);

  if (has('school_name') && !v('school_name')) throw new Error('Nama sekolah wajib diisi.');
  if (has('headmaster_name') && !v('headmaster_name')) throw new Error('Nama kepala sekolah wajib diisi.');
  if (has('school_npsn') && v('school_npsn') && !/^\d{8}$/.test(v('school_npsn')))
    throw new Error('NPSN harus 8 digit angka.');
  if (has('school_postal_code') && v('school_postal_code') && !/^\d{5}$/.test(v('school_postal_code')))
    throw new Error('Kode pos harus 5 digit angka.');
  if (has('school_email') && v('school_email') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('school_email')))
    throw new Error('Format email tidak valid.');
  if (has('academic_year')) {
    const m = /^(\d{4})\/(\d{4})$/.exec(v('academic_year'));
    if (!m || Number(m[2]) !== Number(m[1]) + 1) throw new Error('Tahun ajaran harus berformat 2026/2027.');
  }
  if (has('active_semester') && !['Ganjil', 'Genap'].includes(v('active_semester')))
    throw new Error('Semester harus Ganjil atau Genap.');
  if (has('jp_duration_minutes')) {
    const n = Number(v('jp_duration_minutes'));
    if (!(n >= 1 && n <= 120) || Math.floor(n) !== n) throw new Error('Durasi 1 JP harus angka bulat 1-120 menit.');
  }
  ['school_logo_left', 'school_logo_right'].forEach(k => {
    if (has(k) && v(k)) {
      if (!/^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(v(k)))
        throw new Error('Format logo tidak valid (gunakan PNG/JPG).');
      if (v(k).length > 48000) throw new Error('Ukuran logo terlalu besar. Gunakan gambar yang lebih kecil.');
    }
  });
  if (has('report_date') && v('report_date') && !/^\d{4}-\d{2}-\d{2}$/.test(v('report_date')))
    throw new Error('Format tanggal raport tidak valid.');

  return withWriteLock(db => {
    const changed: string[] = [];
    const dedupMap = new Map<string, GenericRow>();
    (db.Settings || []).forEach(s => {
      if (!dedupMap.has(String(s.key))) dedupMap.set(String(s.key), s);
    });

    keys.forEach(k => {
      const val = v(k);
      const existing = dedupMap.get(k);
      if (existing) {
        if (String(existing.value) !== val) {
          existing.value = val;
          changed.push(k);
        }
      } else {
        const entry = { key: k, value: val, description: defs[k].description };
        dedupMap.set(k, entry);
        changed.push(k);
      }
    });

    db.Settings = Array.from(dedupMap.values());

    if (changed.length > 0) {
      appendLog(
        db,
        actor?.id || 'SYS',
        actor?.full_name || 'System',
        actor?.activeRole || '-',
        'UPDATE_IDENTITAS_SEKOLAH',
        'Diubah: ' + changed.join(', ')
      );
    }
    return { success: true, changed };
  });
}

export async function saveJamPelajaran(
  slots: Array<{ slot_no?: number; start_time: string; label?: string }>,
  actor?: ActorInfo | null
) {
  assertRole(actor, ['admin', 'waka_kurikulum']);
  if (!Array.isArray(slots) || !slots.length) throw new Error('Minimal harus ada 1 jam pelajaran.');
  slots.forEach((s, idx) => {
    if (!/^\d{1,2}:\d{2}$/.test(String(s.start_time || ''))) {
      throw new Error('Format jam mulai tidak valid pada jam ke-' + (s.slot_no || idx + 1));
    }
  });

  return withWriteLock(db => {
    const dur = Number(getSettingFromStore(db, 'jp_duration_minutes', '40')) || 40;
    db.JamPelajaran = slots.map((s, i) => {
      const st = addMinutes(s.start_time, 0);
      return {
        id: 'JAM-' + (i + 1),
        slot_no: i + 1,
        start_time: st,
        end_time: addMinutes(st, dur),
        label: String(s.label || ''),
      };
    });
    db.JadwalKelas = (db.JadwalKelas || []).filter(j => Number(j.slot_no) <= db.JamPelajaran.length);
    appendLog(db, actor!.id, actor!.full_name, actor!.activeRole, 'UPDATE_JamPelajaran', db.JamPelajaran.length + ' jam pelajaran');
    return { success: true, count: db.JamPelajaran.length };
  });
}

export async function saveJadwalCell(
  day: string,
  slotNo: number,
  classId: string,
  subjectId: string,
  actor?: ActorInfo | null
) {
  assertRole(actor, ['admin', 'waka_kurikulum']);
  return withWriteLock(db => {
    let teacherId = '';
    if (subjectId) {
      const tc = (db.TeacherClasses || []).find(
        t => String(t.class_id) === String(classId) && String(t.subject_id) === String(subjectId)
      );
      if (!tc) {
        throw new Error('Mapel ini belum memiliki guru pengampu di kelas tersebut. Atur dahulu di menu Penugasan Mengajar.');
      }
      teacherId = tc.teacher_id;
      const clash = (db.JadwalKelas || []).find(
        j =>
          String(j.day_name) === String(day) &&
          Number(j.slot_no) === Number(slotNo) &&
          String(j.teacher_id) === String(teacherId) &&
          String(j.class_id) !== String(classId)
      );
      if (clash) {
        const cn = ((db.Classes || []).find(c => String(c.id) === String(clash.class_id)) || {}).name || clash.class_id;
        const tn = ((db.Users || []).find(u => String(u.id) === String(teacherId)) || {}).full_name || teacherId;
        throw new Error(`Bentrok jadwal: ${tn} sudah mengajar di kelas ${cn} pada hari dan jam yang sama.`);
      }
    }

    db.JadwalKelas = (db.JadwalKelas || []).filter(
      j => !(String(j.day_name) === String(day) && Number(j.slot_no) === Number(slotNo) && String(j.class_id) === String(classId))
    );

    if (subjectId) {
      db.JadwalKelas.push({
        id: generateId('JDK'),
        day_name: day,
        slot_no: Number(slotNo),
        class_id: classId,
        subject_id: subjectId,
        teacher_id: teacherId,
      });
    }

    return { success: true, teacher_id: teacherId };
  });
}

export async function saveAbsensiHarian(
  date: string,
  classId: string,
  records: Array<{ student_id: string; status: string; note?: string }>,
  actor?: ActorInfo | null
) {
  assertRole(actor, ['admin', 'wali_kelas']);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) throw new Error('Tanggal tidak valid.');
  if (!Array.isArray(records) || !records.length) throw new Error('Tidak ada data absensi.');

  return withWriteLock(db => {
    records.forEach(r => {
      const st = ['H', 'S', 'I', 'A'].includes(String(r.status)) ? String(r.status) : 'H';
      const idx = (db.AbsensiHarian || []).findIndex(
        a => String(a.absen_date) === String(date) && String(a.student_id) === String(r.student_id)
      );
      if (idx >= 0) {
        db.AbsensiHarian[idx] = {
          id: db.AbsensiHarian[idx].id,
          absen_date: date,
          class_id: classId,
          student_id: r.student_id,
          status: st,
          note: String(r.note || ''),
          recorded_by: actor!.id,
        };
      } else {
        db.AbsensiHarian.push({
          id: generateId('ABS'),
          absen_date: date,
          class_id: classId,
          student_id: r.student_id,
          status: st,
          note: String(r.note || ''),
          recorded_by: actor!.id,
        });
      }
    });

    appendLog(db, actor!.id, actor!.full_name, actor!.activeRole, 'SAVE_AbsensiHarian', `${classId} ${date} (${records.length} siswa)`);
    return { success: true, count: records.length };
  });
}

export function exportDatabaseJson(): string {
  const db = loadDb();
  const full: Record<string, any> = {};
  Object.keys(SCHEMA_DEF).forEach(k => {
    full[k] = db[k] || [];
  });
  return JSON.stringify(full, null, 2);
}

export async function importDatabaseJson(jsonString: string, actor?: ActorInfo | null) {
  const parsed = JSON.parse(jsonString);
  return withWriteLock(db => {
    Object.keys(SCHEMA_DEF).forEach(name => {
      if (Array.isArray(parsed[name])) {
        db[name] = parsed[name];
      }
    });
    ensureStoreIntegrity(db);
    appendLog(db, actor?.id, actor?.full_name, actor?.activeRole, 'RESTORE_JSON', 'Restore seluruh database JSON');
    return { success: true };
  });
}

export async function resetDatabaseForNewAcademicYear(
  options: { keepUsers?: boolean; keepSubjects?: boolean; newAcademicYear?: string; newSemester?: string },
  actor?: ActorInfo | null
) {
  return withWriteLock(db => {
    const keepUsers = options?.keepUsers === true;
    const keepSubjects = options?.keepSubjects === true;
    const newAcademicYear = options?.newAcademicYear ? String(options.newAcademicYear).trim() : '2027/2028';
    const newSemester = options?.newSemester ? String(options.newSemester).trim() : 'Ganjil';

    Object.keys(SCHEMA_DEF).forEach(name => {
      if (['Settings', 'RolePermissions', 'ActivityLogs', 'JamPelajaran'].includes(name)) return;
      if (name === 'Users' && keepUsers) return;
      if (name === 'Subjects' && keepSubjects) return;
      db[name] = [];
    });

    if (!db.Users || db.Users.length === 0) {
      db.Users = [
        {
          id: actor?.id || 'USR-ADM',
          username: 'admin',
          password: '123456',
          full_name: actor?.full_name || 'Administrator Sekolah',
          nip: '-',
          role: 'admin',
          avatar_initials: 'AD',
          phone: '-',
          status: 'Aktif',
        },
      ];
    }

    if (!db.Ekstrakurikuler || db.Ekstrakurikuler.length === 0) {
      db.Ekstrakurikuler = [
        {
          id: 'EKS-01',
          name: 'Praja Muda Karana (Pramuka)',
          coach_id: '',
          schedule: 'Jumat, 14:30 - 16:30 WITA',
          is_mandatory: 'true',
          description: 'Pendidikan kepramukaan wajib seluruh peserta didik SMP Kristen Waibakul',
        },
      ];
    }

    db.Settings = (db.Settings || []).map(s => {
      if (s.key === 'academic_year') return { ...s, value: newAcademicYear };
      if (s.key === 'active_semester') return { ...s, value: newSemester };
      return s;
    });

    appendLog(
      db,
      actor?.id || 'USR-ADM',
      actor?.full_name || 'Admin',
      'admin',
      'RESET_DATABASE',
      `Reset database untuk Tahun Pelajaran ${newAcademicYear} (${newSemester}) | KeepUsers: ${keepUsers}, KeepSubjects: ${keepSubjects}`
    );

    return { success: true, newAcademicYear, newSemester };
  });
}
