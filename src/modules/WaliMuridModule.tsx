import React from 'react';
import { AlertTriangle, ShieldCheck, Star, Trophy } from 'lucide-react';
import { GroupedBarsChart, RadarChart } from '../components/Charts';
import type { DatabasePayload, UserPublic } from '../types/siakad';
import {
  activeStudentsOf,
  addMin,
  DAY_NAMES,
  getJpDuration,
  getSchoolIdentity,
  getSettingVal,
  getSlots,
  getStudentSubjectReport,
  normTime,
  SEVEN_HABITS_KAIH,
  siNameCase,
  subjectName,
  todayDayName,
  userName,
} from '../utils/siakadEngine';

export function WaliMuridModule({
  db,
  user,
  menuId,
  onNavigateMenu,
}: {
  db: DatabasePayload;
  user: UserPublic;
  menuId: string;
  onNavigateMenu: (menuId: string) => void;
}) {
  const students = db.Students || [];
  // Akun wali murid wajib ditautkan ke ID siswa melalui kolom Users.nip.
  const linkedStudentId = String(user.nip || '').trim();
  const child = linkedStudentId ? students.find(s => String(s.id).trim() === linkedStudentId) : null;

  if (!child) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-2xl border border-amber-200 space-y-2">
        <h2 className="font-extrabold text-slate-900">Data peserta didik belum tertaut</h2>
        <p className="text-sm text-slate-600">
          Akun wali murid ini belum terhubung dengan ID siswa yang valid. Silakan hubungi Administrator agar kolom NIP pada
          akun wali murid diisi dengan ID siswa yang benar.
        </p>
      </div>
    );
  }

  const cls = (db.Classes || []).find(c => c.id === child.class_id) || {
    id: child.class_id,
    name: child.class_id,
    kkm: 75,
  };
  const subjects = db.Subjects || [];
  const users = db.UsersPublic || [];
  const guruWali = users.find(u => u.id === child.guru_wali_id) || { full_name: '-' };

  const tabs = [
    { id: 'wm_beranda', label: 'Beranda' },
    { id: 'wm_rapor', label: '1. Rapor & Capaian Anak' },
    { id: 'wm_profil', label: '2. Profil & Data Siswa' },
    { id: 'wm_jadwal_ekskul', label: '3. Jadwal & Ekskul Anak' },
    { id: 'wm_karakter', label: '4. Karakter & Bimbingan Wali' },
  ];

  const renderTopBar = () => (
    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border mb-5">
      {tabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onNavigateMenu(t.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
            menuId === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  if (menuId === 'wm_beranda') {
    const classmates = activeStudentsOf(db, cls.id);
    const kkm = Number(cls.kkm) || 75;
    const rows = subjects
      .map(sub => {
        const mine = getStudentSubjectReport(db, child.id, cls.id, sub.id).finalScore;
        const vals = classmates
          .map(s => getStudentSubjectReport(db, s.id, cls.id, sub.id).finalScore)
          .filter((v): v is number => v !== null);
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
        return { name: sub.name, code: sub.code || sub.name, mine, avg };
      })
      .filter(r => r.mine !== null || r.avg !== null);

    const scored = rows.filter(r => r.mine !== null) as Array<{ name: string; code: string; mine: number; avg: number | null }>;
    const overall = scored.length ? scored.reduce((a, b) => a + b.mine, 0) / scored.length : null;
    const first = String(child.full_name).split(' ')[0];
    const firstCap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

    const aspects = db.AttitudeAspects || [];
    const ratings = db.AttitudeRatings || [];
    const avgOf = (arr: any[]) => (arr.length ? arr.reduce((a, b) => a + Number(b.score || 0), 0) / arr.length : 0);
    const myAtt = aspects.map(a => avgOf(ratings.filter(r => r.student_id === child.id && r.aspect_id === a.id)));
    const clsAtt = aspects.map(a =>
      avgOf(ratings.filter(r => r.aspect_id === a.id && classmates.some(s => s.id === r.student_id)))
    );
    const hasAtt = aspects.length >= 3 && myAtt.some(v => v > 0);

    const best = [...scored].sort((a, b) => b.mine - a.mine).slice(0, 2).map(r => r.name);
    const low = scored.filter(r => r.mine < kkm).sort((a, b) => a.mine - b.mine).slice(0, 2).map(r => r.name);
    const catatan =
      scored.length && overall !== null
        ? `Capaian paling menonjol pada ${best.join(' dan ')}. ${
            low.length ? `Perlu pendampingan lebih pada ${low.join(' dan ')}.` : 'Seluruh mata pelajaran telah mencapai KKM.'
          } Rata-rata nilai akhir ${overall.toFixed(1).replace('.', ',')}.`
        : 'Belum terdapat data nilai pada semester ini.';

    const violations = (db.PelanggaranSiswa || [])
      .filter(v => v.student_id === child.id)
      .sort((a, b) => String(b.incident_date).localeCompare(String(a.incident_date)));
    const achievements = (db.PrestasiSiswa || [])
      .filter(p => p.student_id === child.id)
      .sort((a, b) => String(b.event_date || '').localeCompare(String(a.event_date || '')));
    const gwRec = (db.GuruWaliRecords || []).find(r => r.student_id === child.id);
    const hasHabits = Boolean(gwRec && SEVEN_HABITS_KAIH.some(h => Number(gwRec[h.k] || 0) > 0));
    const habitValues = SEVEN_HABITS_KAIH.map(h => (gwRec ? Number(gwRec[h.k]) || 0 : 0));
    const idn = getSchoolIdentity(db);

    const dl = (k: string, v: string) => (
      <div className="flex gap-2">
        <span className="w-28 shrink-0 text-slate-500">{k}</span>
        <span className="font-bold text-slate-900">: {v}</span>
      </div>
    );

    return (
      <div>
        {renderTopBar()}
        <div className="bg-white rounded-2xl border p-5 sm:p-6 space-y-5 max-w-4xl mx-auto">
          <h2 className="text-center text-lg font-extrabold tracking-wide text-slate-900">GRAFIK CAPAIAN BELAJAR</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs pb-4 border-b-2 border-slate-800">
            <div className="space-y-1.5">
              {dl('Nama Murid', String(child.full_name).toUpperCase())}
              {dl('NISN / NIS', `${child.nisn} / ${child.nis}`)}
              {dl('Nama Sekolah', siNameCase(idn.school_name))}
              {dl('Alamat', idn.school_address)}
            </div>
            <div className="space-y-1.5">
              {dl('Kelas', cls.name)}
              {dl('Fase', 'D')}
              {dl('Semester', getSettingVal(db, 'active_semester', 'Ganjil') === 'Genap' ? '2 (Genap)' : '1 (Ganjil)')}
              {dl('Tahun Pelajaran', getSettingVal(db, 'academic_year', '2026/2027'))}
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-4">
            <p className="text-xs font-extrabold text-slate-800 mb-2">Nilai akhir dibanding rata-rata kelas</p>
            {rows.length > 0 ? (
              <GroupedBarsChart
                labels={rows.map(r => r.code)}
                series={[
                  { name: `Nilai ${firstCap}`, color: '#1d4ed8', values: rows.map(r => r.mine || 0) },
                  { name: 'Rata-rata kelas', color: '#c0c7d3', values: rows.map(r => (r.avg ? Math.round(r.avg * 10) / 10 : 0)) },
                ]}
                max={100}
                height={240}
              />
            ) : (
              <p className="text-xs text-slate-500 py-6 text-center">Belum ada data nilai.</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-300 rounded-xl p-4">
              <p className="text-xs font-extrabold text-slate-800 mb-2">Profil capaian sikap</p>
              {hasAtt ? (
                <RadarChart
                  labels={aspects.map(a => a.name)}
                  series={[
                    { name: firstCap, color: '#2563eb', values: myAtt },
                    { name: 'Kelas', color: '#64748b', values: clsAtt, dashed: true },
                  ]}
                  max={5}
                />
              ) : (
                <p className="text-xs text-slate-500 py-10 text-center">Belum ada nilai sikap dari guru mata pelajaran.</p>
              )}
            </div>

            <div className="border border-amber-300 bg-amber-50/30 rounded-xl p-4">
              <p className="text-xs font-extrabold text-slate-800 mb-1">
                Grafik 7 Kebiasaan Anak Indonesia Hebat
              </p>
              <p className="text-[11px] text-slate-500 mb-2">Penilaian Guru Wali (skala 1–5 bintang)</p>
              {hasHabits ? (
                <RadarChart
                  labels={SEVEN_HABITS_KAIH.map(h => h.short)}
                  series={[{ name: firstCap, color: '#d97706', values: habitValues }]}
                  max={5}
                />
              ) : (
                <p className="text-xs text-slate-500 py-10 text-center">
                  Belum ada penilaian 7 Kebiasaan Anak Indonesia Hebat dari Guru Wali.
                </p>
              )}
            </div>
          </div>

          <div className="border border-slate-300 rounded-xl p-4">
            <p className="text-xs font-extrabold text-slate-800 mb-2">Ringkasan Nilai per Mata Pelajaran</p>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 p-1.5 text-left">Mapel</th>
                  <th className="border border-slate-400 p-1.5 text-center w-16">Nilai</th>
                  <th className="border border-slate-400 p-1.5 text-center w-16">Kelas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 p-1.5">{r.code}</td>
                    <td
                      className={`border border-slate-300 p-1.5 text-center font-extrabold tabular-nums ${
                        r.mine !== null && r.mine < kkm ? 'text-rose-600' : ''
                      }`}
                    >
                      {r.mine ?? '-'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center tabular-nums">
                      {r.avg !== null ? r.avg.toFixed(1).replace('.', ',') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border border-slate-300 rounded-xl p-4 text-xs">
            <p>
              <strong>Catatan capaian:</strong> {catatan}
            </p>
          </div>

          {/* KOLOM INFORMASI RINGKAS PELANGGARAN & PRESTASI SISWA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="border border-rose-200 bg-rose-50/40 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-rose-900 flex items-center gap-1.5">
                    {violations.length > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>Informasi Pelanggaran Siswa (Ringkas)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-rose-200 font-bold text-rose-700 tabular-nums">
                    {violations.reduce((a, v) => a + (Number(v.points) || 0), 0)} Poin
                  </span>
                </div>
                {violations.length === 0 ? (
                  <p className="text-slate-600">
                    Tidak ada catatan pelanggaran tata tertib. Ananda menunjukkan kedisiplinan yang baik di sekolah.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-slate-700">
                      Tercatat <strong>{violations.length} kasus</strong> pelanggaran. Terbaru:
                    </p>
                    <div className="p-2.5 rounded-lg bg-white border border-rose-200">
                      <p className="font-bold text-rose-800">
                        {violations[0].incident_date} • {violations[0].category} (+{violations[0].points} poin)
                      </p>
                      <p className="text-slate-600 line-clamp-2 mt-0.5">{violations[0].description}</p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigateMenu('wm_karakter')}
                className="text-left font-bold text-rose-700 hover:underline"
              >
                Lihat penjelasan lengkap di Karakter &amp; Bimbingan Wali →
              </button>
            </div>

            <div className="border border-amber-200 bg-amber-50/40 rounded-xl p-4 flex flex-col justify-between gap-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-amber-900 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Informasi Prestasi Siswa (Ringkas)</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white border border-amber-200 font-bold text-amber-800 tabular-nums">
                    {achievements.length} Prestasi
                  </span>
                </div>
                {achievements.length === 0 ? (
                  <p className="text-slate-600">
                    Belum ada prestasi lomba atau penghargaan yang tercatat pada semester ini.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    <p className="text-slate-700">
                      Tercatat <strong>{achievements.length} capaian prestasi</strong>. Terbaru:
                    </p>
                    <div className="p-2.5 rounded-lg bg-white border border-amber-200">
                      <p className="font-bold text-amber-900">
                        {achievements[0].rank ? `${achievements[0].rank} • ` : ''}
                        {achievements[0].title}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        Tingkat {achievements[0].level || '-'} • {achievements[0].event_date || '-'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => onNavigateMenu('wm_karakter')}
                className="text-left font-bold text-amber-800 hover:underline"
              >
                Lihat detail prestasi lengkap →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (menuId === 'wm_rapor') {
    return (
      <div>
        {renderTopBar()}
        <div className="bg-white rounded-2xl border p-5 space-y-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Rapor Akademik &amp; Capaian Kompetensi — {child.full_name}</h2>
            <p className="text-xs text-slate-500">
              Kelas {cls.name} • KKM {cls.kkm} • Real-time dari penilaian guru mata pelajaran
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">KKM</th>
                  <th className="p-3 text-center">Nilai Akhir</th>
                  <th className="p-3 text-center">Predikat</th>
                  <th className="p-3">Deskripsi Capaian Kompetensi / Alur TP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map(sub => {
                  const rep = getStudentSubjectReport(db, child.id, cls.id, sub.id);
                  return (
                    <tr key={sub.id}>
                      <td className="p-3 font-bold">{sub.name}</td>
                      <td className="p-3 text-center tabular-nums">{cls.kkm}</td>
                      <td className="p-3 text-center font-extrabold text-indigo-700 tabular-nums">{rep.finalScore ?? '-'}</td>
                      <td className="p-3 text-center font-bold">{rep.predicateFull}</td>
                      <td className="p-3">{rep.description}</td>
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

  if (menuId === 'wm_profil') {
    return (
      <div>
        {renderTopBar()}
        <div className="bg-white rounded-2xl border p-6 max-w-2xl space-y-3 text-xs">
          <h2 className="text-lg font-extrabold text-slate-900">Profil &amp; Data Peserta Didik</h2>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Nama Lengkap</p>
              <p className="font-bold text-sm mt-0.5">{child.full_name}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">NIS / NISN</p>
              <p className="font-bold text-sm mt-0.5 tabular-nums">
                {child.nis} / {child.nisn}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Kelas</p>
              <p className="font-bold text-sm mt-0.5">Kelas {cls.name}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50">
              <p className="text-slate-400">Cita-cita</p>
              <p className="font-bold text-sm mt-0.5">{child.dream_job || '-'}</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-50">
              <p className="text-indigo-600">Tingkat Literasi</p>
              <p className="font-extrabold text-sm text-indigo-900 mt-0.5">{child.literacy_level}</p>
            </div>
            <div className="p-3 rounded-xl bg-teal-50">
              <p className="text-teal-600">Tingkat Numerasi</p>
              <p className="font-extrabold text-sm text-teal-900 mt-0.5">{child.numeracy_level}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (menuId === 'wm_jadwal_ekskul') {
    const schedules = (db.JadwalPelajaran || []).filter(j => j.class_id === cls.id);
    const ekAssess = (db.EkskulAssessments || []).filter(a => a.student_id === child.id);
    const ekskuls = db.Ekstrakurikuler || [];
    const jk = (db.JadwalKelas || []).filter(r => r.class_id === cls.id);
    const dur = getJpDuration(db);
    const today = todayDayName();
    const days = DAY_NAMES.filter(d => d !== 'Sabtu' || jk.some(x => x.day_name === 'Sabtu'));
    const slots = getSlots(db);

    return (
      <div>
        {renderTopBar()}
        <div className="grid grid-cols-1 gap-5 text-xs">
          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="font-extrabold text-sm">Jadwal Pelajaran Kelas {cls.name}</h3>
            {jk.length === 0 ? (
              schedules.length > 0 ? (
                schedules.map(j => {
                  const sub = subjects.find(s => s.id === j.subject_id) || { name: j.subject_id };
                  return (
                    <div key={j.id} className="p-3 rounded-xl bg-slate-50 border flex justify-between">
                      <span>
                        <strong>{j.day_name}</strong> ({normTime(j.start_time)}–
                        {addMin(j.start_time, (Number(j.jp_count) || 0) * dur)}) — {sub.name}
                      </span>
                      <span className="font-bold tabular-nums">{j.jp_count} JP</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-500">Jadwal belum disusun oleh sekolah.</p>
              )
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="p-2 text-left">Jam</th>
                      {days.map(d => (
                        <th key={d} className={`p-2 ${d === today ? 'bg-indigo-600' : ''}`}>
                          {d}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map(s => (
                      <tr key={s.slot_no}>
                        <td className="p-2 border whitespace-nowrap font-bold bg-slate-50 tabular-nums">
                          {s.slot_no}
                          <div className="text-[10px] font-normal text-slate-500">
                            {normTime(s.start_time)}–{addMin(s.start_time, dur)}
                          </div>
                        </td>
                        {days.map(d => {
                          const r = jk.find(x => x.day_name === d && Number(x.slot_no) === Number(s.slot_no));
                          return (
                            <td key={d} className={`p-2 border ${d === today ? 'bg-indigo-50' : ''}`}>
                              {r && (
                                <>
                                  <div className="font-bold">{subjectName(db, r.subject_id)}</div>
                                  <div className="text-[10px] text-slate-500">{userName(db, r.teacher_id)}</div>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border space-y-3">
            <h3 className="font-extrabold text-sm">Ekstrakurikuler yang Diikuti</h3>
            {ekAssess.map(a => {
              const ek = ekskuls.find(e => e.id === a.ekskul_id) || { name: 'Pramuka' };
              return (
                <div key={a.id} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex justify-between font-bold">
                    <span>{ek.name}</span>
                    <span className="text-emerald-800">{a.predicate}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{a.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // wm_karakter
  const gwRec = (db.GuruWaliRecords || []).find(r => r.student_id === child.id);
  const fullViolations = (db.PelanggaranSiswa || [])
    .filter(v => v.student_id === child.id)
    .sort((a, b) => String(b.incident_date).localeCompare(String(a.incident_date)));
  const fullAchievements = (db.PrestasiSiswa || [])
    .filter(p => p.student_id === child.id)
    .sort((a, b) => String(b.event_date || '').localeCompare(String(a.event_date || '')));
  const totalPoinPelanggaran = fullViolations.reduce((a, v) => a + (Number(v.points) || 0), 0);

  return (
    <div>
      {renderTopBar()}
      <div className="space-y-5 max-w-4xl">
        <div className="bg-white p-6 rounded-2xl border space-y-4 text-xs">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Catatan Pembimbingan Karakter dari Guru Wali</h2>
            <p className="text-slate-500">
              Guru Wali Pembimbing: <strong>{guruWali.full_name}</strong>
            </p>
          </div>
          {gwRec ? (
            <>
              <div>
                <h3 className="font-extrabold text-slate-800 mb-2">6 Aspek Karakter Sekolah</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Disiplin: <strong className="tabular-nums">{gwRec.disiplin}/5</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Kemandirian: <strong className="tabular-nums">{gwRec.kemandirian}/5</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Kejujuran: <strong className="tabular-nums">{gwRec.kejujuran}/5</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Relasi Sosial: <strong className="tabular-nums">{gwRec.relasi_sosial}/5</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Spiritual: <strong className="tabular-nums">{gwRec.spiritual}/5</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border">
                    Keaktifan: <strong className="tabular-nums">{gwRec.keaktifan}/5</strong>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-800 mb-2">
                  7 Kebiasaan Anak Indonesia Hebat (Rating 5 Bintang)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SEVEN_HABITS_KAIH.map((h, idx) => {
                    const val = Number(gwRec[h.k] || 0);
                    return (
                      <div
                        key={h.k}
                        className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between gap-2"
                      >
                        <span className="font-bold text-slate-800">
                          {idx + 1}. {h.label}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          {[1, 2, 3, 4, 5].map(st => (
                            <Star
                              key={st}
                              className={`w-4 h-4 ${
                                st <= val ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          ))}
                          <span className="ml-1.5 font-extrabold text-amber-900 tabular-nums">{val}/5</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                <p className="font-bold text-indigo-900">Catatan Perkembangan:</p>
                <p className="mt-1 text-slate-800">{gwRec.note}</p>
                <p className="font-bold text-teal-800 mt-2">Rekomendasi: {gwRec.recommendation || '-'}</p>
              </div>
            </>
          ) : (
            <p className="text-slate-500">Belum ada catatan pembimbingan pada semester ini.</p>
          )}
        </div>

        {/* INFORMASI PELANGGARAN & PRESTASI LENGKAP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div className="bg-white p-5 rounded-2xl border border-rose-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-rose-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Riwayat Pelanggaran Tata Tertib (Lengkap)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold tabular-nums">
                Total {totalPoinPelanggaran} Poin
              </span>
            </div>
            {fullViolations.length === 0 ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800">
                Tidak terdapat catatan pelanggaran tata tertib untuk <strong>{child.full_name}</strong>.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fullViolations.map(v => (
                  <div key={v.id} className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-200 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold text-rose-900">
                        {v.incident_date} • Kategori {v.category}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-extrabold tabular-nums">
                        +{v.points} Poin
                      </span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">
                      <strong>Uraian:</strong> {v.description}
                    </p>
                    <p className="text-teal-800">
                      <strong>Sanksi / Tindak Lanjut:</strong> {v.sanction || '-'}
                    </p>
                    <div className="flex flex-wrap justify-between gap-2 pt-1 text-[11px] text-slate-500">
                      <span>Pelapor: {userName(db, v.reporter_id)}</span>
                      <span className="font-bold text-slate-700">Status: {v.status || '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-600" />
                <span>Rekam Prestasi Siswa (Lengkap)</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold tabular-nums">
                {fullAchievements.length} Penghargaan
              </span>
            </div>
            {fullAchievements.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-600">
                Belum terdapat data prestasi yang tercatat untuk <strong>{child.full_name}</strong>.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fullAchievements.map(p => (
                  <div key={p.id} className="p-3.5 rounded-xl bg-amber-50/40 border border-amber-200 space-y-1.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-extrabold text-amber-950">{p.title}</span>
                      {p.rank && (
                        <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-950 font-extrabold">
                          {p.rank}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700">
                      <strong>Tingkat:</strong> {p.level || '-'} • <strong>Tanggal:</strong> {p.event_date || '-'}
                    </p>
                    <p className="text-slate-600">
                      <strong>Penyelenggara:</strong> {p.organizer || '-'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
