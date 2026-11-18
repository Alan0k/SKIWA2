import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Award,
  BellRing,
  BookMarked,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  MapPin,
  Megaphone,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { GroupedBarsChart } from '../components/Charts';
import { StudentAchievementCell, StudentViolationCell } from '../components/StudentBadges';
import type { DatabasePayload, GenericRow, RoleKey, UserPublic } from '../types/siakad';
import {
  ABS_STATUS,
  absCounts,
  addMin,
  adminBlocksJp,
  className,
  getJpDuration,
  getSchoolIdentity,
  getSettingVal,
  getStudentSubjectReport,
  getTeacherAdminBlocks,
  isNilaiFinal,
  kgStatus,
  localISO,
  monthLabel,
  normTime,
  siNameCase,
  sortedClasses,
  activeStudentsOf,
  subjectName,
  todayDayName,
} from '../utils/siakadEngine';

function absPerClass(db: DatabasePayload, month: string) {
  const rows = (db.AbsensiHarian || []).filter(a => String(a.absen_date).startsWith(month));
  return sortedClasses(db).map(c => {
    const cr = rows.filter(r => r.class_id === c.id);
    const cnt = absCounts(cr);
    const tot = cnt.H + cnt.S + cnt.I + cnt.A;
    return {
      cls: c,
      cnt,
      tot,
      days: new Set(cr.map(r => r.absen_date)).size,
      pct: tot ? Math.round((cnt.H / tot) * 100) : null,
      students: activeStudentsOf(db, c.id).length,
    };
  });
}

export function AdminKepsekDashboard({
  db,
  user,
  activeRole,
  onNavigateMenu,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  onNavigateMenu: (menuId: string) => void;
}) {
  const students = db.Students || [];
  const teachers = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');
  const classes = db.Classes || [];
  const addAssign = db.AdditionalAssignments || [];
  const announcements = (db.Announcements || []).slice(0, 3);
  const isKepsek = activeRole === 'kepala_sekolah';
  const idn = getSchoolIdentity(db);

  const month = localISO().slice(0, 7);
  const per = absPerClass(db, month);
  const hasAbs = per.some(p => p.tot > 0);

  // Atensi Cepat Manajemen & Grafik Kehadiran GTK (Kepsek)
  const tcs = db.TeacherClasses || [];
  const finalTcCount = tcs.filter(tc => isNilaiFinal(db, tc.id)).length;
  const openPelanggaranCount = (db.PelanggaranSiswa || []).filter(v => v.status !== 'Selesai').length;
  const supervisiCount = (db.SupervisiGuru || []).length;
  const openTiketCount = (db.TiketPerbaikan || []).filter(t => t.status !== 'Selesai').length;
  const classesWithAbsCount = per.filter(p => p.days > 0).length;
  const p5ProjectsCount = (db.KokurikulerProjects || []).length;
  const p5EvalCount = (db.KokurikulerEvaluations || []).length;

  const gtkMonthRows = (db.KehadiranGTK || []).filter(r => String(r.tanggal || '').startsWith(month));
  const gtkUsers = (db.UsersPublic || []).filter(u => ['kepala_sekolah', 'guru', 'tendik'].includes(u.role));
  const gtkGroups = [
    { key: 'Kepala Sekolah', label: 'Kepala Sekolah' },
    { key: 'Guru', label: 'Guru' },
    { key: 'Tendik', label: 'Tendik' },
  ];
  const gtkGroupOf = (row: GenericRow): string => {
    const j = String(row.jabatan || '').toLowerCase();
    if (j.includes('kepala')) return 'Kepala Sekolah';
    if (j.includes('tendik')) return 'Tendik';
    if (j.includes('guru')) return 'Guru';
    const matchedUser = gtkUsers.find(u => u.full_name.toLowerCase() === String(row.nama || '').toLowerCase());
    if (matchedUser?.role === 'kepala_sekolah') return 'Kepala Sekolah';
    if (matchedUser?.role === 'tendik') return 'Tendik';
    return 'Guru';
  };
  const gtkSeries = [
    {
      name: 'Hadir',
      color: '#10b981',
      values: gtkGroups.map(g => gtkMonthRows.filter(r => gtkGroupOf(r) === g.key && kgStatus(r.status) === 'Hadir').length),
    },
    {
      name: 'Terlambat',
      color: '#f59e0b',
      values: gtkGroups.map(g => gtkMonthRows.filter(r => gtkGroupOf(r) === g.key && kgStatus(r.status) === 'Terlambat').length),
    },
    {
      name: 'Izin/Sakit/DL/Cuti',
      color: '#3b82f6',
      values: gtkGroups.map(
        g =>
          gtkMonthRows.filter(
            r => gtkGroupOf(r) === g.key && ['Izin', 'Sakit', 'Dinas Luar', 'Cuti'].includes(kgStatus(r.status))
          ).length
      ),
    },
    {
      name: 'Alpa',
      color: '#ef4444',
      values: gtkGroups.map(g => gtkMonthRows.filter(r => gtkGroupOf(r) === g.key && kgStatus(r.status) === 'Alpa').length),
    },
  ];
  const hasGtkRows = gtkMonthRows.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-700 to-teal-700 text-white p-6 rounded-3xl shadow-md">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Ringkasan Eksekutif Sekolah</span>
          <h2 className="text-2xl font-extrabold mt-1">Selamat Datang, {user.full_name}</h2>
          <p className="text-sm text-indigo-100 mt-1">
            {siNameCase(idn.school_name)} • {idn.school_regency} • T.A. {getSettingVal(db, 'academic_year', '2026/2027')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigateMenu('pengumuman')}
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition"
          >
            <Megaphone className="w-4 h-4" />
            <span>Papan Pengumuman</span>
          </button>
        </div>
      </div>

      {/* DIAGRAM KEHADIRAN PER KELAS */}
      <div
        onClick={() => onNavigateMenu('absensi_siswa')}
        className="cursor-pointer bg-white rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-sm p-5"
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Kehadiran Siswa per Kelas</h3>
            <p className="text-[11px] text-slate-500">
              Bulan {monthLabel(month)} • rekap absensi dari seluruh Wali Kelas
            </p>
          </div>
          <span className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
            <span>Buka Absensi Siswa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
        {hasAbs ? (
          <GroupedBarsChart
            labels={per.map(p => String(p.cls.name))}
            series={['H', 'S', 'I', 'A'].map(k => ({
              name: ABS_STATUS[k].l,
              color: ABS_STATUS[k].c,
              values: per.map(p => p.cnt[k as keyof typeof p.cnt]),
            }))}
            showValues
            height={230}
          />
        ) : (
          <p className="text-xs text-slate-500 py-8 text-center">
            Belum ada data absensi bulan ini. Wali Kelas dapat mengisi pada menu Absensi Siswa.
          </p>
        )}
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigateMenu('students')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-sm"
        >
          <p className="text-xs font-bold text-slate-500 uppercase">Total Peserta Didik</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">{students.length}</p>
          <p className="text-xs text-teal-600 font-semibold mt-1 tabular-nums">
            L: {students.filter(s => s.gender === 'L').length} • P: {students.filter(s => s.gender === 'P').length}
          </p>
        </div>

        <div
          onClick={() => onNavigateMenu('teacher_jabatans')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-sm"
        >
          <p className="text-xs font-bold text-slate-500 uppercase">Pendidik &amp; Tendik</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">{teachers.length}</p>
          <p className="text-xs text-indigo-600 font-semibold mt-1 tabular-nums">
            {(db.TeacherJabatans || []).length} SK Jabatan Aktif
          </p>
        </div>

        <div
          onClick={() => onNavigateMenu('classes_subjects')}
          className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-400 transition shadow-sm"
        >
          <p className="text-xs font-bold text-slate-500 uppercase">Rombongan Belajar</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-2 tabular-nums">{classes.length}</p>
          <p className="text-xs text-slate-500 font-semibold mt-1">KKM Standar: 75</p>
        </div>

        <div
          onClick={() => onNavigateMenu('additional_assignments')}
          className="cursor-pointer bg-amber-50 p-5 rounded-2xl border-2 border-amber-300 hover:bg-amber-100/70 transition shadow-sm"
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-amber-800 uppercase">Kepanitiaan & Lomba</p>
            <ArrowUpRight className="w-4 h-4 text-amber-700" />
          </div>
          <p className="text-3xl font-extrabold text-amber-900 mt-2 tabular-nums">{addAssign.length}</p>
          <p className="text-xs text-amber-700 font-semibold mt-1">Klik untuk kelola Penugasan Tambahan</p>
        </div>
      </div>

      {isKepsek && (
        <>
          {/* ATENSI CEPAT MANAJEMEN */}
          <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                  <span>Atensi Cepat Manajemen Kepala Sekolah</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pantau progres operasional yang perlu dicek &amp; ditindaklanjuti; klik kartu untuk membuka modul terkait.
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                Update Real-Time
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div
                onClick={() => onNavigateMenu('waka_kurikulum')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-slate-50/70 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">Finalisasi Nilai Mapel</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold tabular-nums ${
                      finalTcCount === tcs.length && tcs.length > 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {finalTcCount}/{tcs.length} Final
                  </span>
                </div>
                <p className="text-slate-500">
                  {tcs.length - finalTcCount > 0
                    ? `${tcs.length - finalTcCount} mapel masih menunggu persetujuan final guru.`
                    : 'Seluruh mapel terpantau sudah disetujui.'}
                </p>
                <p className="text-indigo-700 font-bold pt-1">Cek Kurikulum →</p>
              </div>

              <div
                onClick={() => onNavigateMenu('absensi_siswa')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-slate-50/70 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">Kepatuhan Absensi Kelas</span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold tabular-nums">
                    {classesWithAbsCount}/{classes.length} Rombel
                  </span>
                </div>
                <p className="text-slate-500">
                  Rombel yang sudah mengisi absensi harian bulan {monthLabel(month)}.
                </p>
                <p className="text-indigo-700 font-bold pt-1">Cek Absensi Siswa →</p>
              </div>

              <div
                onClick={() => onNavigateMenu('waka_kurikulum')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-indigo-500 bg-slate-50/70 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">Supervisi Akademik Guru</span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold tabular-nums">
                    {supervisiCount}/{teachers.length} GTK
                  </span>
                </div>
                <p className="text-slate-500">
                  Jumlah pendidik yang telah disupervisi &amp; dicek perangkat ATP/jurnalnya.
                </p>
                <p className="text-indigo-700 font-bold pt-1">Lihat Supervisi →</p>
              </div>

              <div
                onClick={() => onNavigateMenu('waka_kesiswaan')}
                className="cursor-pointer p-4 rounded-xl border border-rose-200 hover:border-rose-500 bg-rose-50/40 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-rose-900 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Penanganan Pelanggaran</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold tabular-nums ${
                      openPelanggaranCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {openPelanggaranCount} Proses
                  </span>
                </div>
                <p className="text-slate-600">
                  {openPelanggaranCount > 0
                    ? `${openPelanggaranCount} catatan pelanggaran siswa belum berstatus Selesai.`
                    : 'Semua catatan pelanggaran telah tertangani.'}
                </p>
                <p className="text-rose-700 font-bold pt-1">Buka Kesiswaan →</p>
              </div>

              <div
                onClick={() => onNavigateMenu('p5_evaluasi')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-cyan-500 bg-cyan-50/40 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-cyan-950 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                    <span>Progres Kokurikuler P5</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold tabular-nums">
                    {p5ProjectsCount} Proyek • {p5EvalCount} Nilai
                  </span>
                </div>
                <p className="text-slate-600">Monitoring ketercapaian evaluasi dimensi P5 siswa sebelum cetak rapor.</p>
                <p className="text-cyan-800 font-bold pt-1">Cek Evaluasi P5 →</p>
              </div>

              <div
                onClick={() => onNavigateMenu('waka_sarpras')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-amber-500 bg-amber-50/40 transition space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-950 flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-amber-700" />
                    <span>Tiket Perbaikan Sarpras</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold tabular-nums">
                    {openTiketCount} Terbuka
                  </span>
                </div>
                <p className="text-slate-600">Laporan kerusakan sarana kelas &amp; fasilitas yang menunggu tindak lanjut.</p>
                <p className="text-amber-800 font-bold pt-1">Buka Sarpras →</p>
              </div>
            </div>
          </div>

          {/* GRAFIK KEHADIRAN KEPSEK, GURU & TENDIK */}
          <div
            onClick={() => onNavigateMenu('kehadiran_gtk')}
            className="cursor-pointer bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 transition shadow-sm p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Grafik Kehadiran Kepala Sekolah, Guru &amp; Tendik</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Bulan {monthLabel(month)} • klik grafik untuk membuka menu Kehadiran Kepsek, Guru &amp; Tendik
                </p>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <span>Buka Kehadiran Kepsek, Guru &amp; Tendik</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
            {hasGtkRows ? (
              <GroupedBarsChart
                labels={gtkGroups.map(g => g.label)}
                series={gtkSeries}
                showValues
                height={220}
              />
            ) : (
              <p className="text-xs text-slate-500 py-8 text-center">
                Belum ada catatan KehadiranGTK pada bulan {monthLabel(month)}. Klik kartu ini untuk input atau impor absensi GTK.
              </p>
            )}
          </div>
        </>
      )}

      {isKepsek && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-600" />
              <span>Monitoring Kegiatan Kepanitiaan & Pembimbingan Lomba</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateMenu('additional_assignments')}
              className="text-xs font-bold text-indigo-600 hover:underline"
            >
              Lihat Semua →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {addAssign.map(a => (
              <div
                key={a.id}
                onClick={() => onNavigateMenu('additional_assignments')}
                className="cursor-pointer p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/60 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">{a.category}</span>
                  <span className="text-xs font-semibold text-emerald-700">{a.status}</span>
                </div>
                <p className="font-bold text-slate-800 text-sm mt-2">{a.title}</p>
                <p className="text-xs text-slate-500 mt-1">
                  SK: {a.sk_number || '-'} • Lokasi: {a.location || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENGUMUMAN TERBARU */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-800 text-base">Pengumuman & Edaran Sekolah Terbaru</h3>
          <button
            type="button"
            onClick={() => onNavigateMenu('pengumuman')}
            className="text-xs font-bold text-indigo-600 hover:underline"
          >
            Kelola Pengumuman →
          </button>
        </div>
        <div className="space-y-3">
          {announcements.map(ann => (
            <div key={ann.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="px-2 py-0.5 rounded-md font-bold bg-indigo-100 text-indigo-800">{ann.category}</span>
                <span className="text-slate-400">{ann.created_at}</span>
              </div>
              <p className="font-bold text-slate-800 text-sm">{ann.title}</p>
              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ann.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GuruBeranda({
  db,
  user,
  onNavigateMenu,
  onOpenWorkspaceFromSchedule,
}: {
  db: DatabasePayload;
  user: UserPublic;
  onNavigateMenu: (menuId: string) => void;
  onOpenWorkspaceFromSchedule: (classId: string, subjectId: string) => void;
}) {
  const mySchedules = (db.JadwalPelajaran || []).filter(j => j.teacher_id === user.id);
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];
  const jpDuration = getJpDuration(db);
  const totalJp = mySchedules.reduce((acc, j) => acc + (Number(j.jp_count) || 0), 0) + adminBlocksJp(db, user.id);

  const adminBlocks = getTeacherAdminBlocks(db, user.id);
  const today = todayDayName();
  const todaysBlocks = adminBlocks.filter(b => b.day_name === today);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-teal-600 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Ruang Kerja Pendidik</p>
        <h2 className="text-xl sm:text-2xl font-extrabold mt-1">Syalom, {user.full_name}</h2>
        <p className="text-xs sm:text-sm text-indigo-100 mt-1 tabular-nums">
          Beban Mengajar Minggu Ini: <strong>{totalJp} JP</strong> ({totalJp * jpDuration} Menit)
        </p>
      </div>

      {adminBlocks.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <BellRing className="w-4 h-4 text-indigo-600" />
              <span>Jadwal Mengajar Hari Ini ({today})</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigateMenu('jadwal_mengajar')}
              className="text-xs font-bold text-indigo-700 hover:underline"
            >
              Lihat jadwal lengkap
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {todaysBlocks.length > 0 ? (
              todaysBlocks.map((b, i) => (
                <div
                  key={`${b.class_id}-${b.startSlot}-${i}`}
                  className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-extrabold text-slate-900">
                      Kelas {className(db, b.class_id)} — {subjectName(db, b.subject_id)}
                    </p>
                    <p className="text-slate-500">
                      Jam ke-{b.startSlot === b.endSlot ? b.startSlot : `${b.startSlot}–${b.endSlot}`} • {b.jp} JP
                    </p>
                  </div>
                  <div className="text-right font-extrabold text-indigo-700 tabular-nums">
                    {b.start || '-'} – {b.end || '-'}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Tidak ada jam mengajar hari ini.</p>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-3">
            Jadwal disusun Admin sesuai penugasan mengajar Anda • {adminBlocks.length} sesi per minggu.
          </p>
        </div>
      )}

      {/* 4 TOMBOL AKSES CEPAT */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onNavigateMenu('jadwal_mengajar')}
          className="p-4 rounded-2xl bg-white border-2 border-indigo-100 hover:border-indigo-500 shadow-sm flex items-center gap-4 text-left transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">Jadwal Mengajar</p>
            <p className="text-xs text-slate-500 mt-0.5">Atur jam & hari KBM</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateMenu('pengumuman')}
          className="p-4 rounded-2xl bg-white border-2 border-amber-100 hover:border-amber-500 shadow-sm flex items-center gap-4 text-left transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 group-hover:bg-amber-500 group-hover:text-white flex items-center justify-center transition">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">PENGUMUMAN</p>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">{(db.Announcements || []).length} informasi sekolah</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateMenu('cp_atp')}
          className="p-4 rounded-2xl bg-white border-2 border-teal-100 hover:border-teal-500 shadow-sm flex items-center gap-4 text-left transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white flex items-center justify-center transition">
            <BookMarked className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">Data CP & ATP (Prota)</p>
            <p className="text-xs text-slate-500 mt-0.5">Kurikulum & Progres TP</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigateMenu('kehadiran_gtk')}
          className="p-4 rounded-2xl bg-white border-2 border-emerald-100 hover:border-emerald-500 shadow-sm flex items-center gap-4 text-left transition group"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800 text-sm">Rekap Kehadiran</p>
            <p className="text-xs text-slate-500 mt-0.5">Kepsek, Guru &amp; Tendik</p>
          </div>
        </button>
      </div>

      {/* KARTU BESAR JADWAL MENGAJAR GURU */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Jadwal Mengajar Minggu Ini</span>
            </h3>
            <p className="text-xs text-slate-500">
              Klik kartu jadwal untuk langsung membuka Kelas Saya & mengisi Absensi/Nilai
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateMenu('jadwal_mengajar')}
            className="px-3.5 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100"
          >
            + Kelola Jadwal
          </button>
        </div>

        {mySchedules.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <p className="text-sm font-semibold text-slate-600">Belum ada jadwal mengajar yang tercatat.</p>
            <button
              type="button"
              onClick={() => onNavigateMenu('jadwal_mengajar')}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Tambah Jadwal Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mySchedules.map(j => {
              const cls = classes.find(c => c.id === j.class_id) || { name: j.class_id };
              const sub = subjects.find(s => s.id === j.subject_id) || { name: j.subject_id };
              return (
                <div
                  key={j.id}
                  onClick={() => onOpenWorkspaceFromSchedule(String(j.class_id), String(j.subject_id))}
                  className="cursor-pointer p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 border-2 border-slate-200 hover:border-indigo-500 transition shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold text-xs uppercase">
                      {j.day_name}
                    </span>
                    <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 tabular-nums">
                      Pukul {normTime(j.start_time)} – {addMin(j.start_time, (Number(j.jp_count) || 0) * jpDuration)} •{' '}
                      {j.jp_count} JP ({Number(j.jp_count) * jpDuration} mnt)
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-slate-900">
                    Kelas {cls.name} — {sub.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-teal-600" />
                    <span>Lokasi: {j.room_note || 'Ruang Kelas'}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function WaliKelasBeranda({
  db,
  waliClass,
  onNavigateMenu,
}: {
  db: DatabasePayload;
  waliClass: GenericRow;
  onNavigateMenu: (menuId: string) => void;
}) {
  const students = (db.Students || []).filter(s => s.class_id === waliClass.id && s.status === 'Aktif');
  const subjects = db.Subjects || [];
  const maleCount = students.filter(s => s.gender === 'L').length;
  const femaleCount = students.filter(s => s.gender === 'P').length;
  const idn = getSchoolIdentity(db);

  const rankings = students
    .map(st => {
      const scores = subjects
        .map(sub => getStudentSubjectReport(db, st.id, waliClass.id, sub.id).finalScore)
        .filter((v): v is number => v !== null);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      const tuntasAll = scores.length > 0 && scores.every(v => v >= Number(waliClass.kkm));
      return { st, avg: Number(avg.toFixed(1)), tuntasAll };
    })
    .sort((a, b) => b.avg - a.avg);

  const classAvg = rankings.length ? (rankings.reduce((a, b) => a + b.avg, 0) / rankings.length).toFixed(1) : '0.0';
  const tuntasPct = rankings.length ? Math.round((rankings.filter(r => r.tuntasAll).length / rankings.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-6 rounded-3xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            Panel Wali Kelas Rombel {waliClass.name}
          </span>
          <h2 className="text-2xl font-extrabold mt-1">
            Kelas {waliClass.name} — {siNameCase(idn.school_name)}
          </h2>
          <p className="text-xs text-emerald-100 mt-1 tabular-nums">
            KKM Kelas: {waliClass.kkm} • Tahun Ajaran {getSettingVal(db, 'academic_year', '2026/2027')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onNavigateMenu('leger')}
            className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-extrabold text-xs"
          >
            Buka Leger Nilai
          </button>
          <button
            type="button"
            onClick={() => onNavigateMenu('raport')}
            className="px-4 py-2.5 rounded-xl bg-emerald-900/50 text-white border border-white/30 font-extrabold text-xs"
          >
            Cetak Raport
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border">
          <p className="text-xs font-bold text-slate-500 uppercase">Total Peserta Didik</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">{students.length} Siswa</p>
          <p className="text-xs font-semibold text-indigo-700 mt-1 tabular-nums">
            Laki-laki: {maleCount} • Perempuan: {femaleCount}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border">
          <p className="text-xs font-bold text-slate-500 uppercase">Rerata Nilai Kelas</p>
          <p className="text-3xl font-extrabold text-teal-700 mt-1 tabular-nums">{classAvg}</p>
          <p className="text-xs text-slate-500 mt-1">Berdasarkan nilai akhir terpadu</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border">
          <p className="text-xs font-bold text-slate-500 uppercase">Ketuntasan KKM ({waliClass.kkm})</p>
          <p className="text-3xl font-extrabold text-emerald-700 mt-1 tabular-nums">{tuntasPct}%</p>
          <p className="text-xs text-slate-500 mt-1">Siswa tuntas seluruh mapel dinilai</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Peringkat Akademik Siswa Kelas {waliClass.name}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-2.5">Peringkat</th>
                <th className="p-2.5">NIS</th>
                <th className="p-2.5">Nama Siswa</th>
                <th className="p-2.5 text-center">L/P</th>
                <th className="p-2.5 text-center">Rerata Nilai</th>
                <th className="p-2.5">Pelanggaran</th>
                <th className="p-2.5">Prestasi Siswa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rankings.map((r, i) => (
                <tr key={r.st.id}>
                  <td className="p-2.5 font-extrabold text-indigo-700 tabular-nums">#{i + 1}</td>
                  <td className="p-2.5 tabular-nums">{r.st.nis}</td>
                  <td className="p-2.5 font-bold">{r.st.full_name}</td>
                  <td className="p-2.5 text-center">{r.st.gender}</td>
                  <td className="p-2.5 text-center font-extrabold tabular-nums">{r.avg}</td>
                  <td className="p-2.5">
                    <StudentViolationCell db={db} studentId={r.st.id} compact />
                  </td>
                  <td className="p-2.5">
                    <StudentAchievementCell db={db} studentId={r.st.id} compact />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
