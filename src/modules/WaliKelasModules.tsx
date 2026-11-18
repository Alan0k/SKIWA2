import React, { useEffect, useState } from 'react';
import { Layers, Printer } from 'lucide-react';
import { saveAbsensiHarianApi } from '../api/client';
import { GroupedBarsChart } from '../components/Charts';
import {
  StudentAchievementCell,
  StudentViolationCell,
  studentAchievementText,
  studentViolationText,
} from '../components/StudentBadges';
import type { ActorInfo, DatabasePayload, GenericRow, RoleKey, UserPublic } from '../types/siakad';
import {
  ABS_STATUS,
  absCounts,
  activeStudentsOf,
  copyTableTsv,
  exportTableToExcel,
  formatIndoDate,
  getSchoolIdentity,
  getSettingVal,
  getStudentSubjectReport,
  getSubjectFinalState,
  isNilaiFinal,
  localISO,
  monthLabel,
  renderOfficialLetterheadHtml,
  renderSignatureBlockHtml,
  siEsc,
  siNameCase,
  siPlaceDate,
  sortedClasses,
  subjectName,
  userName,
} from '../utils/siakadEngine';

export function getActiveWaliClass(db: DatabasePayload, user: UserPublic, activeTargetId: string): GenericRow {
  const classes = db.Classes || [];
  if (activeTargetId) {
    const found = classes.find(c => c.id === activeTargetId);
    if (found) return found;
  }
  return (
    classes.find(c => c.wali_kelas_id === user.id) ||
    classes[0] || { id: 'CLS-7A', name: '7A', kkm: 75, grade_level: '7' }
  );
}

export function WkDataKelasModule({
  db,
  user,
  activeTargetId,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeTargetId: string;
}) {
  const cls = getActiveWaliClass(db, user, activeTargetId);
  const students = activeStudentsOf(db, cls.id);
  const tcs = (db.TeacherClasses || []).filter(t => t.class_id === cls.id);
  const male = students.filter(s => s.gender === 'L').length;

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-6 rounded-3xl shadow-md">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Panel Wali Kelas</span>
        <h2 className="text-2xl font-extrabold mt-1">Data Kelas {cls.name}</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded-2xl border">
          <p className="text-slate-400 font-bold uppercase">Nama Rombel</p>
          <p className="text-lg font-extrabold mt-1">Kelas {cls.name}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border">
          <p className="text-slate-400 font-bold uppercase">Tingkat</p>
          <p className="text-lg font-extrabold mt-1">{cls.grade_level || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border">
          <p className="text-slate-400 font-bold uppercase">KKM</p>
          <p className="text-lg font-extrabold mt-1 tabular-nums">{cls.kkm || '-'}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border">
          <p className="text-slate-400 font-bold uppercase">Tahun Ajaran</p>
          <p className="text-lg font-extrabold mt-1 tabular-nums">
            {cls.academic_year || getSettingVal(db, 'academic_year', '2026/2027')}
          </p>
        </div>
        <div className="bg-white p-4 rounded-2xl border col-span-2">
          <p className="text-slate-400 font-bold uppercase">Wali Kelas</p>
          <p className="text-sm font-extrabold mt-1">{userName(db, cls.wali_kelas_id)}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border col-span-2">
          <p className="text-slate-400 font-bold uppercase">Peserta Didik Aktif</p>
          <p className="text-sm font-extrabold mt-1 tabular-nums">
            {students.length} siswa (L: {male} • P: {students.length - male})
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 font-extrabold text-sm">Guru Mata Pelajaran &amp; Status Nilai</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">Mata Pelajaran</th>
                <th className="p-3">Guru Pengampu</th>
                <th className="p-3 text-center">Status Nilai</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tcs.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={3}>
                    Belum ada penugasan mengajar untuk kelas ini.
                  </td>
                </tr>
              ) : (
                tcs.map(t => {
                  const fin = isNilaiFinal(db, t.id);
                  return (
                    <tr key={t.id}>
                      <td className="p-3 font-bold">{subjectName(db, t.subject_id)}</td>
                      <td className="p-3">{userName(db, t.teacher_id)}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            fin ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {fin ? 'Sudah final' : 'Belum final'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function WkDataSiswaModule({
  db,
  user,
  activeTargetId,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeTargetId: string;
}) {
  const [search, setSearch] = useState('');
  const cls = getActiveWaliClass(db, user, activeTargetId);
  const q = search.trim().toLowerCase();
  const list = activeStudentsOf(db, cls.id).filter(
    s => !q || String(s.full_name).toLowerCase().includes(q) || String(s.nis).includes(q) || String(s.nisn).includes(q)
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Data Siswa — Kelas {cls.name}</h2>
          <p className="text-xs text-slate-500">Daftar peserta didik rombel Anda (data diubah oleh Admin)</p>
        </div>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama / NIS / NISN..."
          className="px-3.5 py-2 rounded-xl border text-xs font-semibold w-full sm:w-64 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">NIS</th>
                <th className="p-3">NISN</th>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3 text-center">L/P</th>
                <th className="p-3">Orang Tua / Wali</th>
                <th className="p-3">Telepon</th>
                <th className="p-3">Guru Wali</th>
                <th className="p-3">Pelanggaran</th>
                <th className="p-3">Prestasi Siswa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {list.length === 0 ? (
                <tr>
                  <td className="p-4 text-slate-500" colSpan={10}>
                    Tidak ada siswa yang cocok.
                  </td>
                </tr>
              ) : (
                list.map((s, i) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="p-3 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-semibold tabular-nums">{s.nis}</td>
                    <td className="p-3 tabular-nums">{s.nisn}</td>
                    <td className="p-3 font-bold">{s.full_name}</td>
                    <td className="p-3 text-center">{s.gender}</td>
                    <td className="p-3">{s.parent_name || '-'}</td>
                    <td className="p-3 tabular-nums">{s.parent_phone || '-'}</td>
                    <td className="p-3">{userName(db, s.guru_wali_id)}</td>
                    <td className="p-3">
                      <StudentViolationCell db={db} studentId={s.id} compact />
                    </td>
                    <td className="p-3">
                      <StudentAchievementCell db={db} studentId={s.id} compact />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AbsensiWaliModule({
  db,
  user,
  activeTargetId,
  actor,
  onReload,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeTargetId: string;
  actor: ActorInfo | null;
  onReload: (silent?: boolean) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const cls = getActiveWaliClass(db, user, activeTargetId);
  const students = activeStudentsOf(db, cls.id);
  const [absDate, setAbsDate] = useState(() => localISO());
  const [draft, setDraft] = useState<Record<string, { status: string; note: string }>>({});

  const existing = (db.AbsensiHarian || []).filter(a => a.class_id === cls.id && String(a.absen_date) === absDate);

  useEffect(() => {
    const next: Record<string, { status: string; note: string }> = {};
    students.forEach(s => {
      const e = existing.find(x => x.student_id === s.id);
      next[s.id] = { status: e ? String(e.status) : 'H', note: e ? String(e.note || '') : '' };
    });
    setDraft(next);
  }, [absDate, cls.id, db.AbsensiHarian, db.Students]);

  const absBtnClass = (st: string, active: boolean) => {
    const col: Record<string, string> = {
      H: 'bg-emerald-600',
      S: 'bg-amber-500',
      I: 'bg-blue-600',
      A: 'bg-rose-600',
    };
    return `w-9 h-9 rounded-lg text-xs font-extrabold border transition ${
      active ? `${col[st]} text-white border-transparent` : 'bg-white text-slate-500 border-slate-300 hover:bg-slate-100'
    }`;
  };

  const setAllStatus = (st: string) => {
    setDraft(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        next[id] = { ...next[id], status: st };
      });
      return next;
    });
  };

  const handleSave = async () => {
    const ids = Object.keys(draft);
    if (!ids.length) {
      onShowToast('Tidak ada siswa untuk disimpan.', 'warning');
      return;
    }
    onShowLoader('Menyimpan absensi...');
    try {
      const records = ids.map(id => ({ student_id: id, status: draft[id].status, note: draft[id].note }));
      await saveAbsensiHarianApi(absDate, cls.id, records, actor);
      await onReload(true);
      onShowToast(`Absensi tanggal ${formatIndoDate(absDate)} tersimpan!`, 'success');
    } catch (e: any) {
      onShowToast('Gagal menyimpan: ' + (e?.message || e), 'error');
    } finally {
      onHideLoader();
    }
  };

  const month = absDate.slice(0, 7);
  const monthRows = (db.AbsensiHarian || []).filter(a => a.class_id === cls.id && String(a.absen_date).startsWith(month));

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 text-white p-6 rounded-3xl shadow-md">
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">Panel Wali Kelas</span>
        <h2 className="text-2xl font-extrabold mt-1">Absensi Siswa — Kelas {cls.name}</h2>
        <p className="text-xs text-emerald-100 mt-1">
          Data absensi otomatis terekap di menu Absensi Siswa milik Admin &amp; Kepala Sekolah.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Absensi</label>
            <input
              type="date"
              value={absDate}
              max={localISO()}
              onChange={e => setAbsDate(e.target.value || localISO())}
              className="px-3 py-2 rounded-xl border font-bold text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAllStatus('H')}
              className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
            >
              Semua Hadir
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold"
            >
              Simpan Absensi
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-slate-600">
          {Object.keys(ABS_STATUS).map(k => (
            <span key={k}>
              <strong>{k}</strong> = {ABS_STATUS[k].l}
            </span>
          ))}
          {existing.length > 0 && (
            <span className="text-emerald-700">
              • Absensi tanggal ini sudah tersimpan ({existing.length} siswa), Anda dapat mengubahnya.
            </span>
          )}
        </div>

        <div className="divide-y">
          {students.length === 0 ? (
            <p className="py-6 text-center text-slate-500 text-xs">Belum ada siswa aktif di kelas ini.</p>
          ) : (
            students.map((s, i) => {
              const row = draft[s.id] || { status: 'H', note: '' };
              return (
                <div key={s.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs">
                  <div className="sm:w-64 font-bold text-slate-800">
                    {i + 1}. {s.full_name} <span className="text-slate-400 font-normal">({s.gender})</span>
                  </div>
                  <div className="flex gap-1.5">
                    {['H', 'S', 'I', 'A'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setDraft(prev => ({ ...prev, [s.id]: { ...row, status: st } }))}
                        className={absBtnClass(st, row.status === st)}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={row.note}
                    placeholder="Keterangan (opsional)"
                    onChange={e => setDraft(prev => ({ ...prev, [s.id]: { ...row, note: e.target.value } }))}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs"
                  />
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 font-extrabold text-sm text-slate-800">
          Rekap Kehadiran Bulan {monthLabel(month)}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3 text-center">Hadir</th>
                <th className="p-3 text-center">Sakit</th>
                <th className="p-3 text-center">Izin</th>
                <th className="p-3 text-center">Alpa</th>
                <th className="p-3 text-center">% Hadir</th>
                <th className="p-3">Pelanggaran</th>
                <th className="p-3">Prestasi Siswa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map(s => {
                const c = absCounts(monthRows.filter(r => r.student_id === s.id));
                const tot = c.H + c.S + c.I + c.A;
                return (
                  <tr key={s.id}>
                    <td className="p-3 font-bold">{s.full_name}</td>
                    <td className="p-3 text-center text-emerald-700 font-bold tabular-nums">{c.H}</td>
                    <td className="p-3 text-center text-amber-600 font-bold tabular-nums">{c.S}</td>
                    <td className="p-3 text-center text-blue-600 font-bold tabular-nums">{c.I}</td>
                    <td className="p-3 text-center text-rose-600 font-bold tabular-nums">{c.A}</td>
                    <td className="p-3 text-center font-extrabold tabular-nums">
                      {tot ? `${Math.round((c.H / tot) * 100)}%` : '-'}
                    </td>
                    <td className="p-3">
                      <StudentViolationCell db={db} studentId={s.id} compact />
                    </td>
                    <td className="p-3">
                      <StudentAchievementCell db={db} studentId={s.id} compact />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AbsensiRekapModule({
  db,
  onShowToast,
}: {
  db: DatabasePayload;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}) {
  const [month, setMonth] = useState(() => localISO().slice(0, 7));
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  const allClasses = sortedClasses(db);
  const rows = (db.AbsensiHarian || []).filter(a => String(a.absen_date).startsWith(month));
  const allPer = allClasses.map(c => {
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

  const per = filterClassId === 'ALL' ? allPer : allPer.filter(p => p.cls.id === filterClassId);

  const total: Record<'H' | 'S' | 'I' | 'A', number> = { H: 0, S: 0, I: 0, A: 0 };
  per.forEach(p => {
    total.H += p.cnt.H;
    total.S += p.cnt.S;
    total.I += p.cnt.I;
    total.A += p.cnt.A;
  });
  const grand = total.H + total.S + total.I + total.A;
  const sel =
    filterClassId !== 'ALL'
      ? per[0] || null
      : selectedClassId
        ? per.find(p => p.cls.id === selectedClassId) || null
        : null;

  const exportData: unknown[][] = [
    ['Kelas', 'Wali Kelas', 'Jumlah Siswa', 'Hari Terisi', 'Hadir', 'Sakit', 'Izin', 'Alpa', '% Hadir'],
    ...per.map(p => [
      p.cls.name,
      userName(db, p.cls.wali_kelas_id),
      p.students,
      p.days,
      p.cnt.H,
      p.cnt.S,
      p.cnt.I,
      p.cnt.A,
      p.pct === null ? '-' : `${p.pct}%`,
    ]),
  ];

  const handleCopyTsv = async () => {
    const ok = await copyTableTsv(exportData);
    onShowToast(ok ? 'Data berhasil disalin (TSV)!' : 'Gagal menyalin ke clipboard.', ok ? 'success' : 'error');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">
            Absensi Siswa — {filterClassId === 'ALL' ? 'Rekap Seluruh Kelas' : `Rekap Kelas ${sel?.cls.name || ''}`}
          </h2>
          <p className="text-xs text-slate-500">
            Sumber data: absensi harian yang diinput para Wali Kelas • Bulan {monthLabel(month)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterClassId}
            onChange={e => {
              const v = e.target.value;
              setFilterClassId(v);
              setSelectedClassId(v === 'ALL' ? null : v);
            }}
            className="px-3 py-2 rounded-xl border text-xs font-bold bg-white"
            aria-label="Filter Kelas"
          >
            <option value="ALL">Semua Kelas</option>
            {allClasses.map(c => (
              <option key={c.id} value={c.id}>
                Kelas {c.name}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value || localISO().slice(0, 7))}
            className="px-3 py-2 rounded-xl border text-xs font-bold bg-white"
          />
          <button type="button" onClick={handleCopyTsv} className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold">
            Salin TSV
          </button>
          <button
            type="button"
            onClick={() => exportTableToExcel(exportData, 'Rekap_Absensi', `Rekap_Absensi_${month}.xlsx`)}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Excel .xlsx
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(['H', 'S', 'I', 'A'] as const).map(k => (
          <div key={k} className="bg-white p-4 rounded-2xl border" style={{ borderTop: `4px solid ${ABS_STATUS[k].c}` }}>
            <p className="text-xs font-bold text-slate-500 uppercase">{ABS_STATUS[k].l}</p>
            <p className="text-2xl font-extrabold mt-1 tabular-nums">{total[k]}</p>
            <p className="text-[11px] text-slate-400 tabular-nums">
              {grand ? Math.round((total[k] / grand) * 100) : 0}% dari seluruh catatan
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-extrabold text-sm text-slate-800 mb-2">
          Grafik Kehadiran {filterClassId === 'ALL' ? 'per Kelas' : `Kelas ${sel?.cls.name || ''}`}
        </h3>
        {grand > 0 ? (
          <GroupedBarsChart
            labels={per.map(p => String(p.cls.name))}
            series={(['H', 'S', 'I', 'A'] as const).map(k => ({
              name: ABS_STATUS[k].l,
              color: ABS_STATUS[k].c,
              values: per.map(p => p.cnt[k]),
            }))}
            showValues
          />
        ) : (
          <p className="text-xs text-slate-500 py-6 text-center">Belum ada data absensi pada bulan ini.</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">Kelas</th>
                <th className="p-3">Wali Kelas</th>
                <th className="p-3 text-center">Siswa</th>
                <th className="p-3 text-center">Hari Terisi</th>
                <th className="p-3 text-center">Hadir</th>
                <th className="p-3 text-center">Sakit</th>
                <th className="p-3 text-center">Izin</th>
                <th className="p-3 text-center">Alpa</th>
                <th className="p-3 text-center">% Hadir</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {per.map(p => (
                <tr
                  key={p.cls.id}
                  onClick={() => setSelectedClassId(p.cls.id)}
                  className={`cursor-pointer hover:bg-indigo-50 ${sel && sel.cls.id === p.cls.id ? 'bg-indigo-50' : ''}`}
                >
                  <td className="p-3 font-extrabold text-indigo-700">Kelas {p.cls.name}</td>
                  <td className="p-3">{userName(db, p.cls.wali_kelas_id)}</td>
                  <td className="p-3 text-center tabular-nums">{p.students}</td>
                  <td className="p-3 text-center tabular-nums">{p.days}</td>
                  <td className="p-3 text-center font-bold text-emerald-700 tabular-nums">{p.cnt.H}</td>
                  <td className="p-3 text-center font-bold text-amber-600 tabular-nums">{p.cnt.S}</td>
                  <td className="p-3 text-center font-bold text-blue-600 tabular-nums">{p.cnt.I}</td>
                  <td className="p-3 text-center font-bold text-rose-600 tabular-nums">{p.cnt.A}</td>
                  <td className="p-3 text-center font-extrabold tabular-nums">{p.pct === null ? '-' : `${p.pct}%`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="px-5 py-2 text-[11px] text-slate-400 bg-slate-50">
          {filterClassId === 'ALL' ? 'Klik baris kelas atau gunakan filter Kelas untuk melihat rincian per siswa.' : 'Menampilkan rekap siswa untuk kelas terpilih.'}
        </p>
      </div>

      {sel && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 font-extrabold text-sm">
            Rincian Kelas {sel.cls.name} — {monthLabel(month)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-700 text-white">
                <tr>
                  <th className="p-3">Nama Siswa</th>
                  <th className="p-3 text-center">Hadir</th>
                  <th className="p-3 text-center">Sakit</th>
                  <th className="p-3 text-center">Izin</th>
                  <th className="p-3 text-center">Alpa</th>
                  <th className="p-3 text-center">% Hadir</th>
                  <th className="p-3">Pelanggaran</th>
                  <th className="p-3">Prestasi Siswa</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeStudentsOf(db, sel.cls.id).map(s => {
                  const classMonthRows = (db.AbsensiHarian || []).filter(
                    a => a.class_id === sel.cls.id && String(a.absen_date).startsWith(month)
                  );
                  const c = absCounts(classMonthRows.filter(r => r.student_id === s.id));
                  const t = c.H + c.S + c.I + c.A;
                  return (
                    <tr key={s.id}>
                      <td className="p-3 font-bold">{s.full_name}</td>
                      <td className="p-3 text-center tabular-nums">{c.H}</td>
                      <td className="p-3 text-center tabular-nums">{c.S}</td>
                      <td className="p-3 text-center tabular-nums">{c.I}</td>
                      <td className={`p-3 text-center tabular-nums ${c.A ? 'text-rose-600 font-extrabold' : ''}`}>{c.A}</td>
                      <td className="p-3 text-center font-bold tabular-nums">{t ? `${Math.round((c.H / t) * 100)}%` : '-'}</td>
                      <td className="p-3">
                        <StudentViolationCell db={db} studentId={s.id} compact />
                      </td>
                      <td className="p-3">
                        <StudentAchievementCell db={db} studentId={s.id} compact />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function LegerNilaiModule({
  db,
  user,
  activeRole,
  activeTargetId,
  onChangeTargetId,
  onShowToast,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  activeTargetId: string;
  onChangeTargetId: (id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onPrintHtml: (html: string) => void;
}) {
  const [legerTab, setLegerTab] = useState<'raport' | 'sikap'>('raport');
  const classes = db.Classes || [];
  const cls = getActiveWaliClass(db, user, activeTargetId);
  const students = (db.Students || []).filter(s => s.class_id === cls.id && s.status === 'Aktif');
  const subjects = db.Subjects || [];
  const attitudes = db.AttitudeRatings || [];

  const subState = subjects.map(s => getSubjectFinalState(db, cls.id, s.id));
  const pendingSubs = subjects.filter((_s, i) => subState[i] === 'pending');

  const headers = ['No', 'NIS', 'Nama Siswa', 'L/P', ...subjects.map(s => s.code), 'Jumlah', 'Rerata', 'Pelanggaran', 'Prestasi Siswa'];
  const rows = students.map((st, idx) => {
    const subVals = subjects.map(sub => getStudentSubjectReport(db, st.id, cls.id, sub.id).finalScore);
    const valid = subVals.filter((v): v is number => v !== null);
    const sum = valid.reduce((a, b) => a + b, 0);
    const avg = valid.length ? (sum / valid.length).toFixed(1) : '-';
    return [
      idx + 1,
      st.nis,
      st.full_name,
      st.gender,
      ...subVals.map(v => v ?? '-'),
      valid.length ? sum : '-',
      avg,
      studentViolationText(db, st.id),
      studentAchievementText(db, st.id),
    ];
  });

  const exportAoa: unknown[][] = [headers, ...rows];

  const handleCopyTsv = async () => {
    const ok = await copyTableTsv(exportAoa);
    onShowToast(ok ? 'Data berhasil disalin (TSV)! Siap tempel di Google Sheets / Excel.' : 'Gagal menyalin ke clipboard.', ok ? 'success' : 'error');
  };

  const handlePrintLeger = () => {
    const idn = getSchoolIdentity(db);
    onPrintHtml(`
      ${renderOfficialLetterheadHtml(idn)}
      <h3 style="text-align:center;font-weight:bold;margin:10px 0;">LEGER NILAI RAPORT PESERTA DIDIK — KELAS ${siEsc(cls.name)}</h3>
      <table>
        <thead><tr>${headers.map(h => `<th>${siEsc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${siEsc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      ${renderSignatureBlockHtml(db, 'Wali Kelas ' + cls.name, user.full_name, user.nip)}
    `);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Penilaian &amp; Leger Nilai — Kelas {cls.name}</h2>
          <p className="text-xs text-slate-500">
            Nilai akhir terhitung otomatis &amp; identik 100% dengan Guru Mapel dan Raport Siswa
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['admin', 'kepala_sekolah'].includes(activeRole) && (
            <select
              value={cls.id}
              onChange={e => onChangeTargetId(e.target.value)}
              className="px-3 py-2 rounded-xl border text-xs font-bold bg-white"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" onClick={handleCopyTsv} className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 text-xs font-bold">
            Salin TSV
          </button>
          <button
            type="button"
            onClick={() => exportTableToExcel(exportAoa, `Leger_${cls.name}`, `Leger_Nilai_${cls.name}.xlsx`)}
            className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Excel .xlsx
          </button>
          <button type="button" onClick={handlePrintLeger} className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
            Cetak Leger
          </button>
        </div>
      </div>

      <div
        className={`p-3.5 rounded-2xl border text-xs ${
          pendingSubs.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}
      >
        {pendingSubs.length > 0 ? (
          <>
            <strong>{pendingSubs.length} mata pelajaran belum final</strong> (kolom merah):{' '}
            {pendingSubs.map(s => s.name).join(', ')}. Tunggu guru mapel menekan &quot;Setujui Nilai&quot; sebelum mencetak raport.
          </>
        ) : (
          <>
            <strong>Seluruh nilai mata pelajaran sudah disetujui guru</strong> (kolom hijau) — leger siap dicetak.
          </>
        )}
        <span className="ml-2 inline-flex gap-3 font-semibold">
          <span>
            <i className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-600 mr-1" />
            Final
          </span>
          <span>
            <i className="inline-block w-2.5 h-2.5 rounded-sm bg-rose-600 mr-1" />
            Belum final
          </span>
        </span>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border w-fit text-xs font-bold">
        <button
          type="button"
          onClick={() => setLegerTab('raport')}
          className={`px-4 py-2 rounded-xl ${legerTab === 'raport' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
        >
          Leger Nilai Raport
        </button>
        <button
          type="button"
          onClick={() => setLegerTab('sikap')}
          className={`px-4 py-2 rounded-xl ${legerTab === 'sikap' ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
        >
          Rekapitulasi Nilai Sikap (1-5)
        </button>
      </div>

      {legerTab === 'raport' ? (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white">
                <tr>
                  {headers.map((h, hi) => {
                    const si = hi - 4;
                    const st = si >= 0 && si < subjects.length ? subState[si] : '';
                    return (
                      <th
                        key={hi}
                        className={`p-3 border border-slate-700 text-center ${
                          st === 'final' ? 'bg-emerald-600' : st === 'pending' ? 'bg-rose-600' : ''
                        }`}
                        title={
                          st === 'final' ? 'Nilai sudah final' : st === 'pending' ? 'Guru belum menyetujui nilai' : undefined
                        }
                      >
                        {h}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, ri) => (
                  <tr key={ri} className="hover:bg-slate-50">
                    {r.map((c, i) => {
                      const si = i - 4;
                      const st = si >= 0 && si < subjects.length ? subState[si] : '';
                      return (
                        <td
                          key={i}
                          className={`p-2.5 border border-slate-200 tabular-nums ${
                            i === 2 ? 'font-bold whitespace-nowrap' : 'text-center font-semibold'
                          } ${st === 'final' ? 'bg-emerald-50 text-emerald-800' : st === 'pending' ? 'bg-rose-50 text-rose-700' : ''}`}
                        >
                          {String(c)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Nama Siswa</th>
                <th className="p-3 text-center">Rerata Sikap (1-5)</th>
                <th className="p-3 text-center">Predikat Sikap</th>
                <th className="p-3">Pelanggaran</th>
                <th className="p-3">Prestasi Siswa</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {students.map((st, idx) => {
                const stAtt = attitudes.filter(a => a.student_id === st.id);
                const avg = stAtt.length
                  ? (stAtt.reduce((a, b) => a + Number(b.score), 0) / stAtt.length).toFixed(2)
                  : '4.50';
                return (
                  <tr key={st.id}>
                    <td className="p-3 tabular-nums">{idx + 1}</td>
                    <td className="p-3 font-bold">{st.full_name}</td>
                    <td className="p-3 text-center font-extrabold text-indigo-700 tabular-nums">{avg}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">Sangat Baik (A)</td>
                    <td className="p-3">
                      <StudentViolationCell db={db} studentId={st.id} compact />
                    </td>
                    <td className="p-3">
                      <StudentAchievementCell db={db} studentId={st.id} compact />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

export function buildStudentRaportHtml(db: DatabasePayload, studentId: string): string {
  const st = (db.Students || []).find(s => s.id === studentId);
  if (!st) return '';
  const cls = (db.Classes || []).find(c => c.id === st.class_id) || {
    id: st.class_id,
    name: st.class_id,
    kkm: 75,
  };
  const subjects = db.Subjects || [];
  const users = db.UsersPublic || [];
  const waliKelas = users.find(u => u.id === cls.wali_kelas_id) || { full_name: 'Wali Kelas', nip: '-' };
  const idn = getSchoolIdentity(db);

  // Bagian B: Ekstrakurikuler (Pramuka tanpa tulisan Wajib)
  const ekskuls = db.Ekstrakurikuler || [];
  const ekAssessments = (db.EkskulAssessments || []).filter(a => a.student_id === st.id);
  const ekskulRows: Array<{ name: string; predicate: string; note: string }> = [];
  const pramukaMaster = ekskuls.find(
    e => String(e.is_mandatory) === 'true' || String(e.name).toLowerCase().includes('pramuka')
  );
  const pramukaAss = pramukaMaster ? ekAssessments.find(a => a.ekskul_id === pramukaMaster.id) : null;
  ekskulRows.push({
    name: 'Praja Muda Karana (Pramuka)',
    predicate: pramukaAss ? String(pramukaAss.predicate) : 'Baik',
    note: pramukaAss ? String(pramukaAss.note) : 'Aktif mengikuti kegiatan kepramukaan dan pembinaan karakter.',
  });
  ekAssessments.forEach(a => {
    if (pramukaMaster && a.ekskul_id === pramukaMaster.id) return;
    const ekObj = ekskuls.find(e => e.id === a.ekskul_id);
    if (ekObj) {
      ekskulRows.push({ name: String(ekObj.name), predicate: String(a.predicate), note: String(a.note) });
    }
  });

  // Bagian C: Kokurikuler (P5)
  const targetProjects = (db.KokurikulerProjects || []).filter(p => String(p.target_classes || '').includes(cls.id));
  const p5Evals = (db.KokurikulerEvaluations || []).filter(e => e.student_id === st.id);

  // Bagian D: Ketidakhadiran
  const attRecs = (db.AttendanceRecords || []).filter(r => r.student_id === st.id);
  const sakitCnt = attRecs.filter(r => r.status === 'S').length;
  const izinCnt = attRecs.filter(r => r.status === 'I').length;
  const alpaCnt = attRecs.filter(r => r.status === 'A').length;

  // Bagian E: Catatan Wali Kelas & Guru Wali
  const gwRec = (db.GuruWaliRecords || []).find(r => r.student_id === st.id);
  const catatanWali = gwRec
    ? `${gwRec.note} ${gwRec.recommendation ? 'Rekomendasi: ' + gwRec.recommendation : ''}`
    : 'Peserta didik menunjukkan sikap sopan, beriman, dan semangat belajar yang baik. Terus tingkatkan prestasi di semester berikutnya.';

  const semLabel = getSettingVal(db, 'active_semester', 'Ganjil');
  const taLabel = getSettingVal(db, 'academic_year', '2026/2027');

  return `
    <div class="space-y-5 text-slate-900">
      ${renderOfficialLetterheadHtml(idn)}
      <div class="text-center border-b-2 border-slate-800 pb-2">
        <h3 class="font-extrabold text-base uppercase">LAPORAN HASIL BELAJAR PESERTA DIDIK (RAPORT)</h3>
        <p class="text-xs">Tahun Ajaran ${siEsc(taLabel)} • Semester ${siEsc(semLabel)}</p>
      </div>

      <div class="grid grid-cols-2 gap-4 text-xs">
        <div class="space-y-1">
          <p>Nama Peserta Didik : <strong>${siEsc(st.full_name)}</strong></p>
          <p>NIS / NISN : <strong>${siEsc(st.nis)} / ${siEsc(st.nisn)}</strong></p>
        </div>
        <div class="space-y-1">
          <p>Kelas / Fase : <strong>${siEsc(cls.name)} / Fase D</strong></p>
          <p>Semester : <strong>${semLabel === 'Genap' ? '2 (Genap)' : '1 (Ganjil)'}</strong></p>
          <p>Tahun Ajaran : <strong>${siEsc(taLabel)}</strong></p>
        </div>
      </div>

      <div>
        <h4 class="font-extrabold text-xs uppercase mb-1.5">A. Capaian Pembelajaran (Intrakurikuler)</h4>
        <table class="w-full text-xs border-collapse border border-slate-400">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-400 p-2 w-8">No</th>
              <th class="border border-slate-400 p-2 text-left">Mata Pelajaran</th>
              <th class="border border-slate-400 p-2 w-12 text-center">KKM</th>
              <th class="border border-slate-400 p-2 w-16 text-center">Nilai Akhir</th>
              <th class="border border-slate-400 p-2 w-16 text-center">Predikat</th>
              <th class="border border-slate-400 p-2 text-left">Capaian Kompetensi / Alur Tujuan Pembelajaran</th>
            </tr>
          </thead>
          <tbody>
            ${subjects
              .map((sub, idx) => {
                const rep = getStudentSubjectReport(db, st.id, cls.id, sub.id);
                return `
                  <tr>
                    <td class="border border-slate-400 p-2 text-center">${idx + 1}</td>
                    <td class="border border-slate-400 p-2 font-semibold">${siEsc(sub.name)}</td>
                    <td class="border border-slate-400 p-2 text-center">${siEsc(cls.kkm)}</td>
                    <td class="border border-slate-400 p-2 text-center font-bold">${rep.finalScore !== null ? rep.finalScore : '-'}</td>
                    <td class="border border-slate-400 p-2 text-center font-bold">${siEsc(rep.predicate)}</td>
                    <td class="border border-slate-400 p-2 leading-snug">${siEsc(rep.description)}</td>
                  </tr>
                `;
              })
              .join('')}
          </tbody>
        </table>
      </div>

      <div>
        <h4 class="font-extrabold text-xs uppercase mb-1.5">B. Kegiatan Ekstrakurikuler</h4>
        <table class="w-full text-xs border-collapse border border-slate-400">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-400 p-2 w-8">No</th>
              <th class="border border-slate-400 p-2 text-left">Kegiatan Ekstrakurikuler</th>
              <th class="border border-slate-400 p-2 w-28 text-center">Predikat</th>
              <th class="border border-slate-400 p-2 text-left">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${ekskulRows
              .map(
                (ek, idx) => `
                  <tr>
                    <td class="border border-slate-400 p-2 text-center">${idx + 1}</td>
                    <td class="border border-slate-400 p-2 font-semibold">${siEsc(ek.name)}</td>
                    <td class="border border-slate-400 p-2 text-center font-bold">${siEsc(ek.predicate)}</td>
                    <td class="border border-slate-400 p-2">${siEsc(ek.note)}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>

      <div>
        <h4 class="font-extrabold text-xs uppercase mb-1.5">C. Kokurikuler (Projek Penguatan Profil Pelajar)</h4>
        <table class="w-full text-xs border-collapse border border-slate-400">
          <thead class="bg-slate-100">
            <tr>
              <th class="border border-slate-400 p-2 w-8">No</th>
              <th class="border border-slate-400 p-2 text-left">Judul & Tema Projek</th>
              <th class="border border-slate-400 p-2 text-left">Capaian Dimensi</th>
              <th class="border border-slate-400 p-2 text-left">Catatan Proses Fasilitator</th>
            </tr>
          </thead>
          <tbody>
            ${
              targetProjects.length === 0
                ? '<tr><td colspan="4" class="border border-slate-400 p-2 text-center">Belum ada proyek kokurikuler pada semester ini.</td></tr>'
                : targetProjects
                    .map((prj, idx) => {
                      const ev = p5Evals.find(e => e.project_id === prj.id);
                      let dimText = `${siEsc(prj.dimensions)} (BSH)`;
                      if (ev && ev.dimension_scores) {
                        try {
                          const dObj = JSON.parse(ev.dimension_scores);
                          dimText = Object.entries(dObj)
                            .map(([k, v]) => `${siEsc(k)}: <strong>${siEsc(v)}</strong>`)
                            .join('; ');
                        } catch {
                          /* fallback */
                        }
                      }
                      return `
                        <tr>
                          <td class="border border-slate-400 p-2 text-center">${idx + 1}</td>
                          <td class="border border-slate-400 p-2"><strong>${siEsc(prj.title)}</strong><br><span class="text-[11px]">Tema: ${siEsc(prj.theme)}</span></td>
                          <td class="border border-slate-400 p-2">${dimText}</td>
                          <td class="border border-slate-400 p-2">${siEsc(ev ? ev.note : 'Peserta didik berpartisipasi aktif dalam seluruh tahapan proyek.')}</td>
                        </tr>
                      `;
                    })
                    .join('')
            }
          </tbody>
        </table>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 class="font-extrabold text-xs uppercase mb-1.5">D. Ketidakhadiran</h4>
          <table class="w-full text-xs border-collapse border border-slate-400">
            <tr><td class="border border-slate-400 p-2">Sakit</td><td class="border border-slate-400 p-2 font-bold">${sakitCnt} hari</td></tr>
            <tr><td class="border border-slate-400 p-2">Izin</td><td class="border border-slate-400 p-2 font-bold">${izinCnt} hari</td></tr>
            <tr><td class="border border-slate-400 p-2">Tanpa Keterangan</td><td class="border border-slate-400 p-2 font-bold">${alpaCnt} hari</td></tr>
          </table>
        </div>
        <div>
          <h4 class="font-extrabold text-xs uppercase mb-1.5">E. Catatan Wali Kelas & Karakter</h4>
          <div class="border border-slate-400 p-3 text-xs min-h-[88px]">
            ${siEsc(catatanWali)}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-3 gap-4 pt-6 text-xs text-center">
        <div>
          <p>Mengetahui,</p>
          <p>Orang Tua / Wali Murid</p>
          <div class="h-16"></div>
          <p class="font-bold underline">(${siEsc(st.parent_name || '....................................')})</p>
        </div>
        <div>
          <p>Mengetahui,</p>
          <p>Kepala ${siEsc(siNameCase(idn.school_name))}</p>
          <div class="h-16"></div>
          <p class="font-bold underline">${siEsc(idn.headmaster_name)}</p>
          <p>NIP. ${siEsc(idn.headmaster_nip || '-')}</p>
        </div>
        <div>
          <p>${siEsc(siPlaceDate(db))}</p>
          <p>Wali Kelas ${siEsc(cls.name)}</p>
          <div class="h-16"></div>
          <p class="font-bold underline">${siEsc(waliKelas.full_name)}</p>
          <p>NIP. ${siEsc(waliKelas.nip || '-')}</p>
        </div>
      </div>
    </div>
  `;
}

export function RaportCenterModule({
  db,
  user,
  activeTargetId,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeTargetId: string;
  onPrintHtml: (html: string) => void;
}) {
  const cls = getActiveWaliClass(db, user, activeTargetId);
  const students = (db.Students || []).filter(s => s.class_id === cls.id && s.status === 'Aktif');
  const [selectedId, setSelectedId] = useState(students[0]?.id || '');

  const previewStudent = students.find(s => s.id === selectedId) || students[0];
  const previewHtml = previewStudent ? buildStudentRaportHtml(db, previewStudent.id) : '';

  const printAll = () => {
    const allHtml = students
      .map(
        (s, i) => `
      <div class="${i < students.length - 1 ? 'page-break' : ''}">
        ${buildStudentRaportHtml(db, s.id)}
      </div>
    `
      )
      .join('');
    onPrintHtml(allHtml);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Pilih Siswa (Kelas {cls.name}):</span>
          <select
            value={previewStudent?.id || ''}
            onChange={e => setSelectedId(e.target.value)}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold bg-white"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.nis})
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {previewStudent && (
            <button
              type="button"
              onClick={() => onPrintHtml(buildStudentRaportHtml(db, previewStudent.id))}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Raport Siswa Ini</span>
            </button>
          )}
          <button
            type="button"
            onClick={printAll}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>Cetak Seluruh Kelas ({students.length} Siswa)</span>
          </button>
        </div>
      </div>

      {previewStudent && (
        <div className="bg-white rounded-2xl border border-slate-300 p-6 sm:p-8 shadow-sm">
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      )}
    </div>
  );
}
