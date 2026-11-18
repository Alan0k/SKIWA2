import * as XLSX from 'xlsx';
import type { DatabasePayload, GenericRow, RoleKey, SchoolIdentity, StudentSubjectReport } from '../types/siakad';

export const ROLE_META: Record<RoleKey, { label: string; badge: string; icon: string }> = {
  admin: { label: 'Administrator', badge: 'bg-indigo-100 text-indigo-800', icon: 'shield-check' },
  kepala_sekolah: { label: 'Kepala Sekolah', badge: 'bg-amber-100 text-amber-800', icon: 'award' },
  guru: { label: 'Guru Mata Pelajaran', badge: 'bg-teal-100 text-teal-800', icon: 'book-open' },
  tendik: { label: 'Tendik', badge: 'bg-cyan-100 text-cyan-800', icon: 'briefcase' },
  wali_kelas: { label: 'Wali Kelas', badge: 'bg-emerald-100 text-emerald-800', icon: 'users' },
  waka_kurikulum: { label: 'Waka Kurikulum', badge: 'bg-blue-100 text-blue-800', icon: 'layers' },
  waka_kesiswaan: { label: 'Waka Kesiswaan', badge: 'bg-rose-100 text-rose-800', icon: 'user-check' },
  waka_humas: { label: 'Waka Humas', badge: 'bg-purple-100 text-purple-800', icon: 'globe' },
  waka_sarpras: { label: 'Waka Sarpras', badge: 'bg-orange-100 text-orange-800', icon: 'building-2' },
  admin_kokurikuler: { label: 'Admin Kokurikuler (P5)', badge: 'bg-cyan-100 text-cyan-800', icon: 'compass' },
  wali_murid: { label: 'Wali Murid', badge: 'bg-slate-200 text-slate-800', icon: 'heart-handshake' },
};

export const SEVEN_HABITS_KAIH = [
  { k: 'hab_bangun_pagi', label: '1. Bangun Pagi', short: 'Bangun Pagi' },
  { k: 'hab_beribadah', label: '2. Beribadah', short: 'Beribadah' },
  { k: 'hab_berolahraga', label: '3. Berolahraga', short: 'Berolahraga' },
  { k: 'hab_makan_sehat', label: '4. Makan Sehat & Bergizi', short: 'Makan Sehat' },
  { k: 'hab_gemar_belajar', label: '5. Gemar Belajar', short: 'Gemar Belajar' },
  { k: 'hab_bermasyarakat', label: '6. Bermasyarakat', short: 'Bermasyarakat' },
  { k: 'hab_tidur_cepat', label: '7. Tidur Cepat', short: 'Tidur Cepat' },
] as const;

export const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const ABS_STATUS: Record<string, { l: string; c: string }> = {
  H: { l: 'Hadir', c: '#16a34a' },
  S: { l: 'Sakit', c: '#f59e0b' },
  I: { l: 'Izin', c: '#3b82f6' },
  A: { l: 'Alpa', c: '#ef4444' },
};

export interface SchoolFieldItem {
  k: keyof SchoolIdentity;
  l: string;
  t: 'text' | 'select' | 'email' | 'number' | 'date';
  def: string;
  req?: number;
  span?: number;
  ph?: string;
  max?: number;
  opts?: string[];
  help?: string;
}

export const SCHOOL_FIELDS: Array<{ g: string; icon: string; items: SchoolFieldItem[] }> = [
  {
    g: 'Identitas Sekolah',
    icon: 'school',
    items: [
      { k: 'school_name', l: 'Nama Sekolah', t: 'text', req: 1, span: 2, def: 'SMP KRISTEN WAIBAKUL' },
      { k: 'school_npsn', l: 'NPSN', t: 'text', ph: '8 digit angka', max: 8, def: '50304088' },
      { k: 'school_nss', l: 'NSS', t: 'text', def: '' },
      { k: 'school_status', l: 'Status Sekolah', t: 'select', opts: ['Swasta', 'Negeri'], def: 'Swasta' },
      { k: 'school_accreditation', l: 'Akreditasi', t: 'select', opts: ['', 'A', 'B', 'C', 'Belum Terakreditasi'], def: '' },
      {
        k: 'school_foundation',
        l: 'Nama Yayasan / Penyelenggara',
        t: 'text',
        span: 2,
        def: 'YAYASAN PENDIDIKAN MASEHI SUMBA (YAPKRIS)',
        help: 'Dicetak di baris atas kop surat. Kosongkan jika tidak ada.',
      },
    ],
  },
  {
    g: 'Alamat & Kontak',
    icon: 'map-pin',
    items: [
      { k: 'school_address', l: 'Alamat Lengkap', t: 'text', span: 2, def: 'Jl. Trans Sumba, Waibakul, Kec. Katiku Tana, Kab. Sumba Tengah, NTT' },
      { k: 'school_regency', l: 'Kabupaten / Kota', t: 'text', def: 'Kabupaten Sumba Tengah' },
      { k: 'school_province', l: 'Provinsi', t: 'text', def: 'Nusa Tenggara Timur' },
      { k: 'school_postal_code', l: 'Kode Pos', t: 'text', ph: '5 digit', max: 5, def: '' },
      { k: 'school_phone', l: 'Telepon', t: 'text', def: '' },
      { k: 'school_email', l: 'Email', t: 'email', def: '' },
      { k: 'school_website', l: 'Website', t: 'text', def: '' },
    ],
  },
  {
    g: 'Kepala Sekolah',
    icon: 'award',
    items: [
      { k: 'headmaster_name', l: 'Nama Kepala Sekolah (beserta gelar)', t: 'text', req: 1, span: 2, def: 'Pdt. Kornelis Umbu Tay, S.Th., M.Pd.' },
      {
        k: 'headmaster_nip',
        l: 'NIP Kepala Sekolah',
        t: 'text',
        span: 2,
        def: '19750412 200501 1 009',
        help: 'Dicetak pada tanda tangan raport & surat. Isi "-" jika tidak ada NIP.',
      },
    ],
  },
  {
    g: 'Tahun Ajaran & Dokumen',
    icon: 'calendar-days',
    items: [
      { k: 'academic_year', l: 'Tahun Ajaran Aktif', t: 'text', ph: '2026/2027', req: 1, def: '2026/2027' },
      { k: 'active_semester', l: 'Semester Aktif', t: 'select', opts: ['Ganjil', 'Genap'], def: 'Ganjil' },
      { k: 'curriculum_name', l: 'Nama Kurikulum', t: 'text', def: 'Kurikulum Nasional' },
      { k: 'jp_duration_minutes', l: 'Durasi 1 JP (menit)', t: 'number', def: '40' },
      {
        k: 'report_place',
        l: 'Tempat Penandatanganan',
        t: 'text',
        def: 'Waibakul',
        help: 'Contoh: "Waibakul" pada "Waibakul, 18 Desember 2026".',
      },
      { k: 'report_date', l: 'Tanggal Pembagian Raport', t: 'date', def: '2026-12-18' },
    ],
  },
];

export function siEsc(s: unknown): string {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
}

export function siNameCase(name: unknown): string {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .map(w => (w.length <= 3 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

export function siInitials(name: unknown): string {
  const w = String(name || '').split(/\s+/).filter(Boolean);
  return w.length ? (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase() : 'SK';
}

export function formatIndoDate(iso: unknown): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  return `${Number(m[3])} ${bln[Number(m[2]) - 1]} ${m[1]}`;
}

export function getSettingVal(db: DatabasePayload, key: string, fallback: string): string {
  const found = (db.Settings || []).find(s => s.key === key);
  return found && found.value !== undefined && found.value !== null && String(found.value) !== ''
    ? String(found.value)
    : fallback;
}

export function getSchoolIdentity(db: DatabasePayload): SchoolIdentity {
  const o: Record<string, string> = {};
  SCHOOL_FIELDS.forEach(g =>
    g.items.forEach(f => {
      const found = (db.Settings || []).find(s => s.key === f.k);
      o[f.k] = found && found.value !== undefined && found.value !== null && String(found.value) !== '' ? String(found.value) : f.def;
    })
  );
  ['school_logo_left', 'school_logo_right'].forEach(k => {
    const f = (db.Settings || []).find(s => s.key === k);
    o[k] = f && f.value ? String(f.value) : '';
  });
  return o as unknown as SchoolIdentity;
}

export function siPlaceDate(db: DatabasePayload): string {
  const idn = getSchoolIdentity(db);
  const d = formatIndoDate(idn.report_date) || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${idn.report_place}, ${d}`;
}

export function normTime(v: unknown): string {
  const raw = String(v == null ? '' : v).trim();
  let m = /^(\d{1,2})[:.](\d{2})/.exec(raw);
  if (!m) m = /1899-12-30[T ](\d{1,2}):(\d{2})/i.exec(raw);
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

export function addMin(t: unknown, mins: number): string {
  const n = normTime(t);
  if (!n) return '';
  const p = n.split(':').map(Number);
  const x = p[0] * 60 + p[1] + Number(mins || 0);
  return ('0' + (Math.floor(x / 60) % 24)).slice(-2) + ':' + ('0' + (x % 60)).slice(-2);
}

export function getJpDuration(db: DatabasePayload): number {
  return Number(getSettingVal(db, 'jp_duration_minutes', '40')) || 40;
}

export function getSlots(db: DatabasePayload): GenericRow[] {
  return [...(db.JamPelajaran || [])].sort((a, b) => Number(a.slot_no) - Number(b.slot_no));
}

export function localISO(d = new Date()): string {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

export function todayDayName(): string {
  return ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][new Date().getDay()];
}

export function userName(db: DatabasePayload, id: unknown): string {
  const u = (db.UsersPublic || []).find(x => x.id === id);
  return u ? u.full_name : String(id || '-');
}

export function className(db: DatabasePayload, id: unknown): string {
  const c = (db.Classes || []).find(x => x.id === id);
  return c ? String(c.name) : String(id || '-');
}

export function subjectName(db: DatabasePayload, id: unknown): string {
  const s = (db.Subjects || []).find(x => x.id === id);
  return s ? String(s.name) : String(id || '-');
}

export function sortedClasses(db: DatabasePayload): GenericRow[] {
  return [...(db.Classes || [])].sort((a, b) => String(a.name).localeCompare(String(b.name), 'id', { numeric: true }));
}

export function activeStudentsOf(db: DatabasePayload, classId: string): GenericRow[] {
  return (db.Students || [])
    .filter(s => s.class_id === classId && String(s.status || 'Aktif') === 'Aktif')
    .sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'id'));
}

export interface ScheduleBlock {
  day_name: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  startSlot: number;
  endSlot: number;
  jp: number;
  start: string;
  end: string;
}

export function buildScheduleBlocks(db: DatabasePayload, rows: GenericRow[]): ScheduleBlock[] {
  const slotMap: Record<number, GenericRow> = {};
  getSlots(db).forEach(s => {
    slotMap[Number(s.slot_no)] = s;
  });
  const dur = getJpDuration(db);
  const sorted = [...rows].sort(
    (a, b) =>
      DAY_NAMES.indexOf(a.day_name) - DAY_NAMES.indexOf(b.day_name) ||
      String(a.class_id).localeCompare(String(b.class_id)) ||
      Number(a.slot_no) - Number(b.slot_no)
  );
  const out: ScheduleBlock[] = [];
  sorted.forEach(r => {
    const last = out[out.length - 1];
    if (
      last &&
      last.day_name === r.day_name &&
      last.class_id === r.class_id &&
      last.subject_id === r.subject_id &&
      last.teacher_id === r.teacher_id &&
      last.endSlot + 1 === Number(r.slot_no)
    ) {
      last.endSlot = Number(r.slot_no);
      last.jp++;
    } else {
      out.push({
        day_name: r.day_name,
        class_id: r.class_id,
        subject_id: r.subject_id,
        teacher_id: r.teacher_id,
        startSlot: Number(r.slot_no),
        endSlot: Number(r.slot_no),
        jp: 1,
        start: '',
        end: '',
      });
    }
  });
  out.forEach(b => {
    const s = slotMap[b.startSlot];
    const e = slotMap[b.endSlot];
    b.start = s ? normTime(s.start_time) : '';
    b.end = e ? addMin(e.start_time, dur) : '';
  });
  return out.sort((a, b) => DAY_NAMES.indexOf(a.day_name) - DAY_NAMES.indexOf(b.day_name) || a.startSlot - b.startSlot);
}

export function getTeacherAdminBlocks(db: DatabasePayload, tid: string): ScheduleBlock[] {
  return buildScheduleBlocks(db, (db.JadwalKelas || []).filter(r => r.teacher_id === tid));
}

export function adminBlocksJp(db: DatabasePayload, tid: string): number {
  return getTeacherAdminBlocks(db, tid).reduce((a, b) => a + b.jp, 0);
}

export function shortenTpText(text: unknown, maxLen = 78): string {
  const clean = String(text || '').trim().replace(/\.$/, '');
  if (clean.length <= maxLen) return clean;
  const sub = clean.substring(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  return (lastSpace > 20 ? sub.substring(0, lastSpace) : sub) + '...';
}

export function getStudentSubjectReport(
  db: DatabasePayload,
  studentId: string,
  classId: string,
  subjectId: string
): StudentSubjectReport {
  const classes = db.Classes || [];
  const cls = classes.find(c => String(c.id) === String(classId)) || { kkm: 75, grade_level: '7' };
  const kkmNum = Number(cls.kkm) || 75;
  const sessions = (db.AttendanceSessions || []).filter(
    s => String(s.class_id) === String(classId) && String(s.subject_id) === String(subjectId)
  );
  const sessionMap: Record<string, GenericRow> = {};
  sessions.forEach(s => {
    sessionMap[s.id] = s;
  });

  const records = (db.AttendanceRecords || []).filter(
    r => String(r.student_id) === String(studentId) && sessionMap[r.session_id]
  );
  const atpList = db.CpAtp_Prota || [];
  const atpById: Record<string, GenericRow> = {};
  const atpByCode: Record<string, GenericRow> = {};
  atpList.forEach(a => {
    atpById[a.id] = a;
    if (a.atp_code) atpByCode[a.atp_code] = a;
  });

  const nhScores: number[] = [];
  const stsScores: number[] = [];
  const sasScores: number[] = [];
  const atpScoresMap: Record<string, { id: string; code: string; tp_text: string; scores: number[] }> = {};

  records.forEach(rec => {
    if (rec.score === '' || rec.score === null || rec.score === undefined || isNaN(Number(rec.score))) return;
    const val = Number(rec.score);
    const sess = sessionMap[rec.session_id];
    const type = String(sess.session_type || 'NH').toUpperCase();
    if (type === 'NH') nhScores.push(val);
    else if (type === 'STS') stsScores.push(val);
    else if (type === 'SAS') sasScores.push(val);
    else nhScores.push(val);

    const atpObj = atpById[sess.atp_id] || atpByCode[sess.atp_code];
    if (atpObj) {
      if (!atpScoresMap[atpObj.id]) {
        atpScoresMap[atpObj.id] = { id: atpObj.id, code: atpObj.atp_code, tp_text: atpObj.tp_text, scores: [] };
      }
      atpScoresMap[atpObj.id].scores.push(val);
    }
  });

  const avg = (arr: number[]): number | null => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const avgNH = avg(nhScores);
  const avgSTS = avg(stsScores);
  const avgSAS = avg(sasScores);

  const components = [avgNH, avgSTS, avgSAS].filter((v): v is number => v !== null);
  const finalScore = components.length > 0 ? Math.round(avg(components)!) : null;

  let predicate = '-';
  let predicateFull = '-';
  if (finalScore !== null) {
    if (finalScore >= 90) {
      predicate = 'A';
      predicateFull = 'A (Sangat Baik)';
    } else if (finalScore >= kkmNum) {
      predicate = 'B';
      predicateFull = 'B (Baik)';
    } else if (finalScore >= 60) {
      predicate = 'C';
      predicateFull = 'C (Cukup)';
    } else {
      predicate = 'D';
      predicateFull = 'D (Perlu Bimbingan)';
    }
  }

  let description = 'Belum terdapat data penilaian pada semester ini.';
  const evaluatedAtps = Object.values(atpScoresMap).map(item => ({
    ...item,
    avg: Math.round(avg(item.scores)!),
  }));

  if (finalScore !== null) {
    const tuntasAtps = evaluatedAtps.filter(a => a.avg >= kkmNum).sort((a, b) => b.avg - a.avg);
    const belumTuntasAtps = evaluatedAtps.filter(a => a.avg < kkmNum).sort((a, b) => a.avg - b.avg);

    if (tuntasAtps.length > 0 && belumTuntasAtps.length > 0) {
      const top1 = tuntasAtps[0];
      const low1 = belumTuntasAtps[0];
      description = `Sudah tuntas dalam ${shortenTpText(top1.tp_text, 78)}, namun perlu perbaikan pada ${shortenTpText(low1.tp_text, 78)}.`;
    } else if (belumTuntasAtps.length > 0) {
      const picks = belumTuntasAtps
        .slice(0, 2)
        .map(a => shortenTpText(a.tp_text, 75))
        .join(' serta ');
      description = `Perlu pendampingan dan perbaikan pada capaian ${picks} agar mencapai ketuntasan minimal.`;
    } else if (tuntasAtps.length > 0) {
      const picks = tuntasAtps
        .slice(0, 2)
        .map(a => shortenTpText(a.tp_text, 78))
        .join(' dan ');
      const prefix = finalScore >= 90 ? 'Menunjukkan penguasaan sangat optimal dalam ' : 'Sudah tuntas dengan baik dalam ';
      description = `${prefix}${picks}.`;
    } else {
      const fallbackAtps = atpList
        .filter(a => String(a.subject_id) === String(subjectId) && String(a.grade_level) === String(cls.grade_level))
        .slice(0, 2);
      if (fallbackAtps.length > 0) {
        const tpSummary = fallbackAtps.map(a => shortenTpText(a.tp_text, 78)).join(' serta ');
        description =
          finalScore >= kkmNum
            ? `Sudah tuntas menguasai capaian pembelajaran ${tpSummary}.`
            : `Perlu bimbingan lebih lanjut dalam ${tpSummary}.`;
      } else {
        description =
          finalScore >= kkmNum
            ? `Tuntas mencapai kriteria ketuntasan minimal.`
            : `Belum mencapai kriteria ketuntasan minimal, perlu remedial terstruktur.`;
      }
    }
  }

  return {
    kkm: kkmNum,
    nhScores,
    avgNH: avgNH !== null ? Math.round(avgNH) : null,
    avgSTS: avgSTS !== null ? Math.round(avgSTS) : null,
    avgSAS: avgSAS !== null ? Math.round(avgSAS) : null,
    finalScore,
    predicate,
    predicateFull,
    description,
  };
}

export function predicateToScoreByKkm(pred: string, kkm: number): number {
  const k = Number(kkm) || 75;
  const map: Record<string, number> = {
    'A+': 98,
    A: 94,
    'A-': 90,
    'B+': Math.min(89, Math.max(k + 10, 86)),
    B: Math.min(88, Math.max(k + 5, 81)),
    'B-': k,
    'C+': Math.max(68, k - 3),
    C: 64,
    D: 55,
  };
  return map[pred] !== undefined ? map[pred] : k;
}

export function scoreToGradeLetter(score: unknown, kkm: number): string {
  if (score === '' || score === null || score === undefined || isNaN(Number(score))) return '-';
  const s = Number(score);
  const k = Number(kkm) || 75;
  if (s >= 96) return 'A+';
  if (s >= 92) return 'A';
  if (s >= 90) return 'A-';
  if (s >= Math.max(k + 9, 85)) return 'B+';
  if (s >= Math.max(k + 4, 80)) return 'B';
  if (s >= k) return 'B-';
  if (s >= 67) return 'C+';
  if (s >= 60) return 'C';
  return 'D';
}

export function isNilaiFinal(db: DatabasePayload, tcId: string): boolean {
  return (db.StatusNilai || []).some(x => x.teacher_class_id === tcId && x.status === 'Final');
}

export function getSubjectFinalState(db: DatabasePayload, classId: string, subjectId: string): 'final' | 'pending' | 'none' {
  const tcs = (db.TeacherClasses || []).filter(t => t.class_id === classId && t.subject_id === subjectId);
  if (!tcs.length) return 'none';
  return tcs.every(t => isNilaiFinal(db, t.id)) ? 'final' : 'pending';
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  center?: boolean;
}

export function getMenusForActiveRole(r: RoleKey | null): MenuItem[] {
  if (!r) return [];

  if (r === 'guru' || r === 'tendik') {
    return [
      { id: 'my_classes', label: 'Kelas Saya', icon: 'book-open' },
      { id: 'pelanggaran', label: 'Pelanggaran', icon: 'alert-triangle' },
      { id: 'dashboard', label: 'Beranda', icon: 'home', center: true },
      { id: 'guru_wali', label: 'Guru Wali', icon: 'heart-handshake' },
      { id: 'jurnal', label: 'Jurnal KBM', icon: 'file-text' },
    ];
  }

  if (r === 'wali_murid') {
    return [
      { id: 'wm_beranda', label: 'Beranda', icon: 'home' },
      { id: 'wm_rapor', label: 'Rapor & Capaian Anak', icon: 'award' },
      { id: 'wm_profil', label: 'Profil & Data Siswa', icon: 'user' },
      { id: 'wm_jadwal_ekskul', label: 'Jadwal & Ekskul Anak', icon: 'calendar' },
      { id: 'wm_karakter', label: 'Karakter & Bimbingan Wali', icon: 'heart-handshake' },
    ];
  }

  if (r === 'admin_kokurikuler') {
    return [
      { id: 'p5_dashboard', label: 'Dashboard Kokurikuler', icon: 'layout-dashboard' },
      { id: 'p5_proyek', label: 'Manajemen Proyek', icon: 'folder-kanban' },
      { id: 'p5_jadwal', label: 'Jadwal & Blok Proyek', icon: 'calendar-clock' },
      { id: 'p5_fasilitator', label: 'Penugasan Fasilitator', icon: 'users' },
      { id: 'p5_evaluasi', label: 'Evaluasi Karakter P5', icon: 'check-square' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  if (r === 'wali_kelas') {
    return [
      { id: 'dashboard', label: 'Beranda Wali Kelas', icon: 'layout-dashboard' },
      { id: 'wk_data_kelas', label: 'Data Kelas', icon: 'school' },
      { id: 'wk_data_siswa', label: 'Data Siswa', icon: 'users' },
      { id: 'wk_absensi', label: 'Absensi Siswa', icon: 'clipboard-check' },
      { id: 'leger', label: 'Penilaian & Leger Nilai', icon: 'table' },
      { id: 'raport', label: 'Pusat Cetak Raport', icon: 'printer' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  if (r === 'waka_kurikulum') {
    return [
      { id: 'dashboard', label: 'Beranda Kurikulum', icon: 'layout-dashboard' },
      { id: 'waka_kurikulum', label: 'Modul Waka Kurikulum', icon: 'layers' },
      { id: 'cp_atp', label: 'Data CP & ATP (Prota)', icon: 'book-marked' },
      { id: 'jadwal_mengajar', label: 'Jadwal Pelajaran', icon: 'calendar' },
      { id: 'jadwal_admin', label: 'Atur Jadwal (Semua Guru)', icon: 'calendar-range' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  if (r === 'waka_kesiswaan') {
    return [
      { id: 'dashboard', label: 'Beranda Kesiswaan', icon: 'layout-dashboard' },
      { id: 'waka_kesiswaan', label: 'Modul Waka Kesiswaan', icon: 'user-check' },
      { id: 'pelanggaran', label: 'Input Pelanggaran', icon: 'alert-triangle' },
      { id: 'ekskul', label: 'Ekstrakurikuler', icon: 'trophy' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  if (r === 'waka_humas') {
    return [
      { id: 'dashboard', label: 'Beranda Humas', icon: 'layout-dashboard' },
      { id: 'waka_humas', label: 'Modul Waka Humas', icon: 'globe' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  if (r === 'waka_sarpras') {
    return [
      { id: 'dashboard', label: 'Beranda Sarpras', icon: 'layout-dashboard' },
      { id: 'waka_sarpras', label: 'Modul Waka Sarpras', icon: 'building-2' },
      { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
    ];
  }

  const baseAdminKs: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard Utama', icon: 'layout-dashboard' },
    { id: 'students', label: 'Data Siswa', icon: 'users' },
    { id: 'absensi_siswa', label: 'Absensi Siswa', icon: 'clipboard-check' },
    { id: 'classes_subjects', label: 'Kelas & Mapel', icon: 'school' },
    { id: 'teacher_jabatans', label: 'Jabatan & Tugas Guru', icon: 'briefcase' },
    { id: 'teaching_assignments', label: 'Penugasan Mengajar', icon: 'book-open-check' },
    { id: 'ekskul', label: 'Ekstrakurikuler', icon: 'trophy' },
    { id: 'guru_wali', label: 'Guru Wali', icon: 'heart-handshake' },
    { id: 'additional_assignments', label: 'Penugasan Tambahan', icon: 'award' },
    { id: 'kehadiran_gtk', label: 'Kehadiran Kepsek, Guru & Tendik', icon: 'user-check' },
    { id: 'waka_kurikulum', label: 'Waka Kurikulum', icon: 'layers' },
    { id: 'waka_kesiswaan', label: 'Waka Kesiswaan', icon: 'user-check' },
    { id: 'waka_humas', label: 'Waka Humas', icon: 'globe' },
    { id: 'waka_sarpras', label: 'Waka Sarpras', icon: 'building-2' },
    { id: 'p5_dashboard', label: 'Kokurikuler (P5)', icon: 'compass' },
    { id: 'leger', label: 'Leger & Raport', icon: 'printer' },
    { id: 'pengumuman', label: 'PENGUMUMAN', icon: 'megaphone' },
  ];

  if (r === 'admin') {
    baseAdminKs.push({ id: 'jadwal_admin', label: 'Atur Jadwal Pelajaran', icon: 'calendar-range' });
    baseAdminKs.push({ id: 'school_identity', label: 'Identitas Sekolah', icon: 'landmark' });
    baseAdminKs.push({ id: 'system_admin', label: 'Pengguna, RBAC & Backup', icon: 'settings' });
    baseAdminKs.push({ id: 'reset_data', label: 'Reset Data (Tahun Baru)', icon: 'rotate-ccw' });
  }

  return baseAdminKs;
}

export function renderOfficialLetterheadHtml(idn: SchoolIdentity): string {
  const addr = [idn.school_address, idn.school_postal_code ? 'Kode Pos ' + idn.school_postal_code : ''].filter(Boolean).join(' • ');
  const line1 = [idn.school_npsn ? 'NPSN: ' + idn.school_npsn : '', addr].filter(Boolean).join(' • ');
  const line2 = [idn.school_phone ? 'Telp. ' + idn.school_phone : '', idn.school_email ? 'Email: ' + idn.school_email : '', idn.school_website].filter(Boolean).join(' • ');
  const hasLogo = !!(idn.school_logo_left || idn.school_logo_right);
  const logo = (src: string) =>
    src
      ? `<img src="${siEsc(src)}" style="height:70px;width:70px;object-fit:contain;flex:none;">`
      : hasLogo
        ? '<div style="width:70px;flex:none;"></div>'
        : '';
  return `
    <div style="display:flex;align-items:center;gap:12px;border-bottom:3px double #000;padding-bottom:8px;margin-bottom:12px;">
      ${logo(idn.school_logo_left)}
      <div style="flex:1;text-align:center;">
        ${idn.school_foundation ? `<div style="font-size:11pt;font-weight:bold;">${siEsc(idn.school_foundation)}</div>` : ''}
        <div style="font-size:15pt;font-weight:900;letter-spacing:0.5px;">${siEsc(idn.school_name)}</div>
        <div style="font-size:9pt;">${siEsc(line1)}</div>
        ${line2 ? `<div style="font-size:9pt;">${siEsc(line2)}</div>` : ''}
      </div>
      ${logo(idn.school_logo_right)}
    </div>
  `;
}

export function renderSignatureBlockHtml(db: DatabasePayload, roleTitle: string, personName: string, nip = '-'): string {
  const place = getSchoolIdentity(db).report_place;
  return `
    <div style="display:flex;justify-content:flex-end;margin-top:24px;font-size:10pt;">
      <div style="text-align:center;width:240px;">
        <p>${siEsc(place)}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p>${siEsc(roleTitle)},</p>
        <div style="height:60px;"></div>
        <p style="font-weight:bold;text-decoration:underline;">${siEsc(personName)}</p>
        <p>NIP. ${siEsc(nip || '-')}</p>
      </div>
    </div>
  `;
}

export function exportTableToExcel(rowsArray: unknown[][], sheetName: string, fileName: string): void {
  const ws = XLSX.utils.aoa_to_sheet(rowsArray);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 30));
  XLSX.writeFile(wb, fileName);
}

export async function copyTableTsv(rowsArray: unknown[][]): Promise<boolean> {
  const tsv = rowsArray.map(r => r.map(c => String(c ?? '').replace(/\t|\n/g, ' ')).join('\t')).join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    return true;
  } catch {
    return false;
  }
}

export function absCounts(rows: GenericRow[]): { H: number; S: number; I: number; A: number } {
  const o: Record<string, number> = { H: 0, S: 0, I: 0, A: 0 };
  rows.forEach(r => {
    if (o[r.status] !== undefined) o[r.status]++;
  });
  return o as { H: number; S: number; I: number; A: number };
}

export function monthLabel(ym: string): string {
  const bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const m = /^(\d{4})-(\d{2})$/.exec(ym || '');
  return m ? bln[Number(m[2]) - 1] + ' ' + m[1] : '';
}

const MON: Record<string, number> = {
  jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4,
  mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7, agu: 8, agt: 8, agustus: 8, aug: 8,
  sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12,
};
const p2 = (n: string | number) => String(n).padStart(2, '0');

export function kgDate(s: unknown): string {
  const str = String(s || '').trim();
  let m: RegExpMatchArray | null;
  if ((m = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/))) return `${m[1]}-${p2(m[2])}-${p2(m[3])}`;
  if ((m = str.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{4})/))) return `${m[3]}-${p2(m[2])}-${p2(m[1])}`;
  if ((m = str.match(/(\d{1,2})\s+([A-Za-z]+)\.?,?\s+(\d{4})/)) && MON[m[2].toLowerCase()]) {
    return `${m[3]}-${p2(MON[m[2].toLowerCase()])}-${p2(m[1])}`;
  }
  return '';
}

export function kgTime(s: unknown): string {
  const m = String(s || '').match(/(\d{1,2})[:.](\d{2})/);
  return m ? p2(m[1]) + ':' + m[2] : '';
}

export function kgStatus(s: unknown): string {
  const str = String(s || '').trim();
  const t = str.toLowerCase();
  if (!t) return 'Hadir';
  if (/^(h|hadir|present|masuk)/.test(t)) return /terlambat|late/.test(t) ? 'Terlambat' : 'Hadir';
  if (/terlambat|telat|late/.test(t)) return 'Terlambat';
  if (/^(s|sakit|sick)/.test(t)) return 'Sakit';
  if (/^(i|izin|ijin|permit)/.test(t)) return 'Izin';
  if (/^(a|alpa|alpha|absen|tanpa|mangkir)/.test(t)) return 'Alpa';
  if (/dinas|^dl|tugas/.test(t)) return 'Dinas Luar';
  if (/cuti|leave/.test(t)) return 'Cuti';
  return str;
}

export function kgParse(text: string): GenericRow[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return [];
  const sp = (l: string) => (l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : l.split(','));
  let map: Record<string, number> = { tanggal: 0, nama: 1, jam_masuk: 2, jam_pulang: 3, status: 4, keterangan: 5, jabatan: -1 };
  const h = sp(lines[0]).map(x => x.trim().toLowerCase());
  if (h.some(x => /^(nama|name|tanggal|date)/.test(x))) {
    map = { tanggal: -1, nama: -1, jam_masuk: -1, jam_pulang: -1, status: -1, keterangan: -1, jabatan: -1 };
    h.forEach((x, i) => {
      if (/tanggal|date/.test(x)) map.tanggal = i;
      else if (/nama|name/.test(x)) map.nama = i;
      else if (/masuk|check.?in|datang/.test(x)) map.jam_masuk = i;
      else if (/pulang|keluar|check.?out/.test(x)) map.jam_pulang = i;
      else if (/status|kehadiran/.test(x)) map.status = i;
      else if (/ket|catatan|note/.test(x)) map.keterangan = i;
      else if (/jabatan|role|posisi/.test(x)) map.jabatan = i;
    });
    lines.shift();
  }
  const g = (c: string[], k: string) => (map[k] >= 0 ? (c[map[k]] || '').trim() : '');
  return lines.map(l => {
    const c = sp(l);
    return {
      tanggal: kgDate(g(c, 'tanggal')),
      nama: g(c, 'nama'),
      jabatan: g(c, 'jabatan'),
      jam_masuk: kgTime(g(c, 'jam_masuk')),
      jam_pulang: kgTime(g(c, 'jam_pulang')),
      status: kgStatus(g(c, 'status')),
      keterangan: g(c, 'keterangan'),
    };
  });
}

export type FieldType = 't' | 'n' | 'd' | 'a' | 's' | 'u' | 'U' | 'st' | 'c' | 'sub' | 'r' | 'g';
export type FieldDef = [string, string, FieldType, string[]?];

export interface CrudConfig {
  t: string;
  cols?: string[];
  f: FieldDef[];
}

const YN = ['Ya', 'Tidak'];
const KOND = ['Baik', 'Rusak Ringan', 'Rusak Berat'];
const ROLE_KEYS = ['waka_kurikulum', 'waka_kesiswaan', 'waka_humas', 'waka_sarpras', 'wali_kelas', 'guru', 'tendik', 'admin_kokurikuler', 'kepala_sekolah', 'admin', 'wali_murid'];

export const CRUD_CONFIGS: Record<string, CrudConfig> = {
  Classes: {
    t: 'Kelas',
    cols: ['name', 'grade_level', 'kkm', 'wali_kelas_id'],
    f: [
      ['name', 'Nama Kelas', 't'],
      ['grade_level', 'Tingkat', 's', ['7', '8', '9']],
      ['kkm', 'KKM', 'n'],
      ['wali_kelas_id', 'Wali Kelas', 'u'],
      ['academic_year', 'Tahun Ajaran', 't'],
    ],
  },
  Subjects: {
    t: 'Mata Pelajaran',
    cols: ['code', 'name', 'jp_per_week'],
    f: [
      ['code', 'Kode', 't'],
      ['name', 'Nama Mapel', 't'],
      ['phase', 'Fase', 't'],
      ['jp_per_week', 'JP / Minggu', 'n'],
    ],
  },
  TeacherJabatans: {
    t: 'Jabatan Guru',
    f: [
      ['teacher_id', 'Guru', 'u'],
      ['jabatan_name', 'Nama Jabatan', 't'],
      ['role_key', 'Kunci Peran', 's', ROLE_KEYS],
      ['target_id', 'Target (ID kelas, bila ada)', 't'],
      ['sk_number', 'No SK', 't'],
      ['tmt_date', 'TMT', 'd'],
      ['jp_eq', 'Ekivalensi JP', 'n'],
      ['status', 'Status', 's', ['Aktif', 'Nonaktif']],
    ],
  },
  AdditionalAssignments: {
    t: 'Penugasan Tambahan',
    f: [
      ['category', 'Kategori', 's', ['Kepanitiaan', 'Pembimbingan Lomba', 'Tugas Lainnya']],
      ['title', 'Judul', 't'],
      ['pj_id', 'Penanggung Jawab', 'u'],
      ['member_ids', 'Anggota (ID dipisah koma)', 't'],
      ['sk_number', 'No SK', 't'],
      ['location', 'Lokasi', 't'],
      ['start_date', 'Mulai', 'd'],
      ['end_date', 'Selesai', 'd'],
      ['status', 'Status', 's', ['Berjalan', 'Selesai', 'Direncanakan']],
    ],
  },
  Users: {
    t: 'Pengguna',
    f: [
      ['full_name', 'Nama Lengkap', 't'],
      ['username', 'Username', 't'],
      ['password', 'Password (kosongkan = tidak diubah)', 't'],
      ['nip', 'NIP', 't'],
      ['role', 'Peran Dasar', 's', ROLE_KEYS],
      ['phone', 'No HP', 't'],
      ['status', 'Status', 's', ['Aktif', 'Nonaktif']],
    ],
  },
  JadwalPelajaran: {
    t: 'Jadwal',
    f: [
      ['teacher_id', 'Guru', 'u'],
      ['class_id', 'Kelas', 'c'],
      ['subject_id', 'Mapel', 'sub'],
      ['day_name', 'Hari', 's', DAY_NAMES],
      ['start_time', 'Jam Mulai', 't'],
      ['jp_count', 'Jumlah JP', 'n'],
      ['room_note', 'Ruang / Keterangan', 't'],
    ],
  },
  CpAtp_Prota: {
    t: 'CP/ATP',
    f: [
      ['subject_id', 'Mapel', 'sub'],
      ['grade_level', 'Tingkat', 's', ['7', '8', '9']],
      ['phase', 'Fase', 't'],
      ['element', 'Elemen', 't'],
      ['atp_code', 'Kode ATP', 't'],
      ['tp_text', 'Tujuan Pembelajaran', 'a'],
      ['scope_material', 'Lingkup Materi', 't'],
      ['semester', 'Semester', 's', ['Ganjil', 'Genap']],
      ['jp_allocation', 'Alokasi JP', 'n'],
      ['meeting_count', 'Jumlah Pertemuan', 'n'],
      ['week_number', 'Minggu Ke-', 'n'],
    ],
  },
  JurnalMengajar: {
    t: 'Jurnal',
    f: [
      ['journal_date', 'Tanggal', 'd'],
      ['meeting_no', 'Pertemuan Ke', 'n'],
      ['tp_text', 'Tujuan Pembelajaran', 'a'],
      ['material', 'Materi', 't'],
      ['activities', 'Kegiatan', 'a'],
      ['h_count', 'Hadir', 'n'],
      ['s_count', 'Sakit', 'n'],
      ['i_count', 'Izin', 'n'],
      ['a_count', 'Alpa', 'n'],
      ['attendance_pct', 'Kehadiran %', 'n'],
      ['problems_solutions', 'Permasalahan & Solusi', 'a'],
    ],
  },
  Ekstrakurikuler: {
    t: 'Ekstrakurikuler',
    f: [
      ['name', 'Nama', 't'],
      ['coach_id', 'Pembina', 'u'],
      ['schedule', 'Jadwal', 't'],
      ['is_mandatory', 'Wajib?', 's', ['false', 'true']],
      ['description', 'Deskripsi', 'a'],
    ],
  },
  Announcements: {
    t: 'Pengumuman',
    f: [
      ['title', 'Judul', 't'],
      ['category', 'Kategori', 's', ['Akademik', 'Kedinasan', 'Kesiswaan', 'Sarpras', 'Kegiatan', 'Umum']],
      ['priority', 'Prioritas', 's', ['Biasa', 'Penting', 'Mendesak']],
      ['is_pinned', 'Disematkan', 's', ['false', 'true']],
      ['content', 'Isi', 'a'],
    ],
  },
  KaldikEvents: {
    t: 'Agenda Kaldik',
    cols: ['start_date', 'end_date', 'title', 'category'],
    f: [
      ['title', 'Judul', 't'],
      ['start_date', 'Mulai', 'd'],
      ['end_date', 'Selesai', 'd'],
      ['category', 'Kategori', 's', ['Akademik', 'Kesiswaan', 'Libur Nasional', 'Asesmen']],
      ['description', 'Keterangan', 'a'],
    ],
  },
  SupervisiGuru: {
    t: 'Supervisi',
    cols: ['teacher_id', 'supervision_date', 'has_modul', 'has_atp', 'has_asesmen', 'has_jurnal', 'score'],
    f: [
      ['teacher_id', 'Guru Disupervisi', 'u'],
      ['supervisor_id', 'Supervisor', 'U'],
      ['supervision_date', 'Tanggal', 'd'],
      ['subject_id', 'Mapel', 'sub'],
      ['has_modul', 'Modul Ajar', 's', YN],
      ['has_atp', 'ATP/Prota', 's', YN],
      ['has_asesmen', 'Asesmen', 's', YN],
      ['has_jurnal', 'Jurnal', 's', YN],
      ['score', 'Skor', 'n'],
      ['feedback', 'Umpan Balik', 'a'],
    ],
  },
  KemitraanKomite: {
    t: 'Agenda Komite',
    cols: ['agenda_date', 'topic', 'participants', 'decision', 'status'],
    f: [
      ['agenda_date', 'Tanggal', 'd'],
      ['topic', 'Topik', 't'],
      ['participants', 'Peserta', 't'],
      ['decision', 'Keputusan', 'a'],
      ['status', 'Status', 's', ['Direncanakan', 'Terlaksana']],
    ],
  },
  MouKerjasama: {
    t: 'MoU',
    cols: ['partner_name', 'scope', 'start_date', 'end_date', 'pic_name', 'status'],
    f: [
      ['partner_name', 'Mitra', 't'],
      ['scope', 'Ruang Lingkup', 't'],
      ['start_date', 'Mulai', 'd'],
      ['end_date', 'Berakhir', 'd'],
      ['pic_name', 'PIC', 't'],
      ['status', 'Status', 's', ['Aktif', 'Proses', 'Berakhir']],
    ],
  },
  PublikasiSekolah: {
    t: 'Publikasi',
    cols: ['pub_date', 'title', 'channel', 'author_id'],
    f: [
      ['pub_date', 'Tanggal', 'd'],
      ['title', 'Judul', 't'],
      ['channel', 'Kanal', 't'],
      ['author_id', 'Penulis', 'U'],
      ['summary', 'Ringkasan', 'a'],
    ],
  },
  BukuTamu: {
    t: 'Buku Tamu',
    cols: ['visit_date', 'guest_name', 'institution', 'purpose', 'met_with'],
    f: [
      ['visit_date', 'Tanggal', 'd'],
      ['guest_name', 'Nama Tamu', 't'],
      ['institution', 'Instansi', 't'],
      ['purpose', 'Keperluan', 't'],
      ['met_with', 'Bertemu', 't'],
    ],
  },
  InventarisRuang: {
    t: 'Ruang',
    cols: ['room_code', 'room_name', 'condition', 'capacity', 'pic_name'],
    f: [
      ['room_code', 'Kode', 't'],
      ['room_name', 'Nama Ruang', 't'],
      ['condition', 'Kondisi', 's', KOND],
      ['capacity', 'Kapasitas', 'n'],
      ['pic_name', 'Penanggung Jawab', 't'],
    ],
  },
  BarangSarpras: {
    t: 'Barang',
    cols: ['item_code', 'item_name', 'room_id', 'quantity', 'condition', 'source_fund'],
    f: [
      ['item_code', 'Kode', 't'],
      ['item_name', 'Nama Barang', 't'],
      ['room_id', 'Ruang', 'r'],
      ['quantity', 'Jumlah', 'n'],
      ['condition', 'Kondisi', 's', KOND],
      ['source_fund', 'Sumber Dana', 't'],
    ],
  },
  TiketPerbaikan: {
    t: 'Tiket',
    cols: ['report_date', 'item_name', 'location', 'issue_desc', 'priority', 'status'],
    f: [
      ['report_date', 'Tanggal', 'd'],
      ['reporter_id', 'Pelapor', 'U'],
      ['item_name', 'Barang', 't'],
      ['location', 'Lokasi', 't'],
      ['issue_desc', 'Kerusakan', 'a'],
      ['priority', 'Prioritas', 's', ['Rendah', 'Sedang', 'Tinggi']],
      ['status', 'Status', 's', ['Baru', 'Proses', 'Selesai']],
    ],
  },
  PeminjamanSarpras: {
    t: 'Peminjaman',
    cols: ['borrow_date', 'return_date', 'borrower_name', 'item_name', 'quantity', 'status'],
    f: [
      ['borrow_date', 'Tgl Pinjam', 'd'],
      ['return_date', 'Tgl Kembali', 'd'],
      ['borrower_name', 'Peminjam', 't'],
      ['item_name', 'Barang', 't'],
      ['quantity', 'Jumlah', 'n'],
      ['purpose', 'Keperluan', 't'],
      ['status', 'Status', 's', ['Dipinjam', 'Dikembalikan']],
    ],
  },
  PrestasiSiswa: {
    t: 'Prestasi',
    cols: ['student_id', 'title', 'level', 'rank', 'event_date'],
    f: [
      ['student_id', 'Siswa', 'st'],
      ['title', 'Prestasi / Lomba', 't'],
      ['level', 'Tingkat', 's', ['Sekolah', 'Kecamatan', 'Kabupaten', 'Provinsi', 'Nasional']],
      ['rank', 'Peringkat', 't'],
      ['event_date', 'Tanggal', 'd'],
      ['organizer', 'Penyelenggara', 't'],
    ],
  },
  OsisMembers: {
    t: 'Pengurus OSIS',
    cols: ['student_id', 'position', 'division', 'period', 'status'],
    f: [
      ['student_id', 'Siswa', 'st'],
      ['position', 'Jabatan', 't'],
      ['division', 'Seksi/Bidang', 't'],
      ['period', 'Periode', 't'],
      ['status', 'Status', 's', ['Aktif', 'Nonaktif']],
    ],
  },
  PembiasaanKarakter: {
    t: 'Pembiasaan Karakter',
    cols: ['activity_date', 'activity_name', 'category', 'coordinator_id', 'participation_pct'],
    f: [
      ['activity_date', 'Tanggal', 'd'],
      ['activity_name', 'Kegiatan', 't'],
      ['category', 'Kategori', 't'],
      ['coordinator_id', 'Koordinator', 'u'],
      ['participation_pct', 'Partisipasi %', 'n'],
      ['note', 'Catatan', 'a'],
    ],
  },
  PelanggaranSiswa: {
    t: 'Pelanggaran',
    f: [
      ['student_id', 'Siswa', 'st'],
      ['reporter_id', 'Pelapor', 'U'],
      ['incident_date', 'Tanggal', 'd'],
      ['category', 'Kategori', 's', ['Ringan', 'Sedang', 'Berat']],
      ['description', 'Uraian', 'a'],
      ['points', 'Poin', 'n'],
      ['sanction', 'Sanksi / Tindak Lanjut', 'a'],
      ['status', 'Status', 's', ['Diproses', 'Dibina', 'Selesai']],
    ],
  },
  KehadiranGTK: {
    t: 'Kehadiran GTK',
    cols: ['tanggal', 'nama', 'jabatan', 'jam_masuk', 'jam_pulang', 'status', 'keterangan'],
    f: [
      ['tanggal', 'Tanggal', 'd'],
      ['nama', 'Nama', 'g'],
      ['jabatan', 'Jabatan', 't'],
      ['jam_masuk', 'Jam Masuk (HH:MM)', 't'],
      ['jam_pulang', 'Jam Pulang (HH:MM)', 't'],
      ['status', 'Status', 's', ['Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa', 'Dinas Luar', 'Cuti']],
      ['keterangan', 'Keterangan', 't'],
    ],
  },
};

export function resolveCrudDisplayValue(db: DatabasePayload, type: FieldType, v: unknown): string {
  if (v === undefined || v === null || v === '') return '';
  const s = String(v);
  if (type === 'u' || type === 'U') return (db.UsersPublic || []).find(x => x.id === s)?.full_name || s;
  if (type === 'st') return (db.Students || []).find(x => x.id === s)?.full_name || s;
  if (type === 'c') return String((db.Classes || []).find(x => x.id === s)?.name || s);
  if (type === 'sub') return String((db.Subjects || []).find(x => x.id === s)?.name || s);
  if (type === 'r') return String((db.InventarisRuang || []).find(x => x.id === s)?.room_name || s);
  return s;
}
