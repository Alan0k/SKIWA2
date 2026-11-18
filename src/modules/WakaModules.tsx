import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { saveJadwalCellApi, saveJamPelajaranApi } from '../api/client';
import { CrudTableCard, EnhancedDataTable, type ColumnDef } from '../components/DataTableTools';
import { StudentAchievementCell, studentAchievementText } from '../components/StudentBadges';
import { Modal } from '../components/UiPrimitives';
import type { ActorInfo, DatabasePayload, GenericRow, UserPublic } from '../types/siakad';
import {
  activeStudentsOf,
  addMin,
  DAY_NAMES,
  getJpDuration,
  getSlots,
  normTime,
  sortedClasses,
  subjectName,
  userName,
} from '../utils/siakadEngine';
import { PelanggaranAddModal } from './EkskulGuruWaliModules';

export function WakaKurikulumModule({
  db,
  onOpenCrud,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-extrabold text-slate-900">Panel Wakil Kepala Sekolah Bidang Kurikulum</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CrudTableCard
          sheet="KaldikEvents"
          title="Kalender Pendidikan (Kaldik)"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="SupervisiGuru"
          title="Supervisi Akademik Guru"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
      </div>
    </div>
  );
}

export function WakaKesiswaanModule({
  db,
  user,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  user: UserPublic;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  const students = db.Students || [];
  const violations = db.PelanggaranSiswa || [];
  const [addPelOpen, setAddPelOpen] = useState(false);
  const [historyStudentId, setHistoryStudentId] = useState<string | null>(null);

  const studentViolationSummary = students
    .map(st => {
      const list = violations.filter(v => v.student_id === st.id);
      const r = list.filter(v => v.category === 'Ringan').length;
      const s = list.filter(v => v.category === 'Sedang').length;
      const b = list.filter(v => v.category === 'Berat').length;
      const pts = list.reduce((acc, v) => acc + (Number(v.points) || 0), 0);
      let recSp = 'Aman / Pembinaan Rutin';
      if (pts >= 50 || b > 0) recSp = 'Rekomendasi SP-2 & Panggilan Orang Tua';
      else if (pts >= 20 || s > 0) recSp = 'Rekomendasi SP-1 & Konseling';
      return {
        id: st.id,
        st,
        list,
        r,
        s,
        b,
        pts,
        recSp,
      };
    })
    .filter(x => x.list.length > 0);

  const summaryCols: ColumnDef[] = [
    { key: 'full_name', label: 'Siswa', render: item => <span className="font-bold">{item.st.full_name}</span>, textValue: item => item.st.full_name },
    { key: 'class_id', label: 'Kelas', textValue: item => item.st.class_id },
    { key: 'r', label: 'Ringan', align: 'center', render: item => <span className="tabular-nums">{item.r}</span>, textValue: item => String(item.r) },
    { key: 's', label: 'Sedang', align: 'center', render: item => <span className="tabular-nums">{item.s}</span>, textValue: item => String(item.s) },
    { key: 'b', label: 'Berat', align: 'center', render: item => <span className="tabular-nums">{item.b}</span>, textValue: item => String(item.b) },
    { key: 'pts', label: 'Total Poin', align: 'center', render: item => <span className="font-extrabold text-rose-700 tabular-nums">{item.pts}</span>, textValue: item => String(item.pts) },
    {
      key: '_achievements',
      label: 'Prestasi Siswa',
      render: item => <StudentAchievementCell db={db} studentId={item.st.id} compact />,
      textValue: item => studentAchievementText(db, item.st.id),
    },
    { key: 'recSp', label: 'Rekomendasi Tindak Lanjut', render: item => <span className="font-semibold text-amber-800">{item.recSp}</span> },
  ];

  const histSt = historyStudentId ? students.find(s => s.id === historyStudentId) : null;
  const histList = historyStudentId ? violations.filter(v => v.student_id === historyStudentId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-slate-900">Panel Wakil Kepala Sekolah Bidang Kesiswaan</h2>
        <button
          type="button"
          onClick={() => setAddPelOpen(true)}
          className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
        >
          + Input Pelanggaran
        </button>
      </div>

      {/* REKAPAN TERPADU PELANGGARAN PER SISWA */}
      <div className="bg-white rounded-2xl border p-5 space-y-3">
        <h3 className="font-extrabold text-sm text-rose-800">
          Rekapan Terpadu Pelanggaran Tata Tertib Per Siswa (Input Semua Guru)
        </h3>
        <EnhancedDataTable
          columns={summaryCols}
          rows={studentViolationSummary}
          exportSheetName="Rekap_Pelanggaran_Siswa"
          renderActions={item => (
            <button
              type="button"
              onClick={() => setHistoryStudentId(item.st.id)}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold"
            >
              Detail Histori
            </button>
          )}
        />
      </div>

      {/* PATCH v2 CRUD TABLES: PRESTASI, OSIS, PEMBIASAAN */}
      <div className="space-y-4">
        <h3 className="text-lg font-extrabold text-slate-900">Kelola Data Kesiswaan (Tambah / Edit / Hapus)</h3>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <CrudTableCard
            sheet="PrestasiSiswa"
            title="Prestasi Siswa"
            db={db}
            onOpenCrud={onOpenCrud}
            onDelete={onDeleteRecord}
          />
          <CrudTableCard
            sheet="OsisMembers"
            title="Pengurus OSIS & MPK"
            db={db}
            onOpenCrud={onOpenCrud}
            onDelete={onDeleteRecord}
          />
          <CrudTableCard
            sheet="PembiasaanKarakter"
            title="Pembiasaan Karakter & Ibadah"
            db={db}
            onOpenCrud={onOpenCrud}
            onDelete={onDeleteRecord}
          />
        </div>
      </div>

      <PelanggaranAddModal
        open={addPelOpen}
        db={db}
        user={user}
        onClose={() => setAddPelOpen(false)}
        onSaveRecord={onSaveRecord}
      />

      <Modal
        open={Boolean(historyStudentId && histSt)}
        title={`Detail Histori Pelanggaran — ${histSt?.full_name || ''}`}
        onClose={() => setHistoryStudentId(null)}
      >
        <div className="space-y-2 text-xs">
          {histList.map(v => (
            <div key={v.id} className="p-3 rounded-xl border bg-slate-50">
              <div className="flex justify-between font-bold">
                <span>
                  {v.incident_date} • {v.category} (+{v.points} Poin)
                </span>
                <span>{v.status}</span>
              </div>
              <p className="mt-1">{v.description}</p>
              <p className="text-teal-700 mt-1">Sanksi: {v.sanction}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

export function WakaHumasModule({
  db,
  onOpenCrud,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-extrabold text-slate-900">Panel Wakil Kepala Sekolah Bidang Humas</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CrudTableCard
          sheet="KemitraanKomite"
          title="Kemitraan Komite Sekolah"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="MouKerjasama"
          title="MoU & Kerjasama Mitra"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="PublikasiSekolah"
          title="Publikasi Sekolah"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="BukuTamu"
          title="Buku Tamu Digital"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
      </div>
    </div>
  );
}

export function WakaSarprasModule({
  db,
  onOpenCrud,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-extrabold text-slate-900">Panel Wakil Kepala Sekolah Bidang Sarpras</h2>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <CrudTableCard
          sheet="InventarisRuang"
          title="Inventaris Ruang"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="BarangSarpras"
          title="Barang Sarpras (KIB)"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="TiketPerbaikan"
          title="Tiket Perbaikan"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
        <CrudTableCard
          sheet="PeminjamanSarpras"
          title="Peminjaman Sarpras"
          db={db}
          onOpenCrud={onOpenCrud}
          onDelete={onDeleteRecord}
        />
      </div>
    </div>
  );
}

export function JadwalAdminModule({
  db,
  actor,
  onReload,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo | null;
  onReload: (silent?: boolean) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const [day, setDay] = useState('Senin');
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const slots = getSlots(db);
  const classes = sortedClasses(db);
  const dur = getJpDuration(db);
  const tcs = db.TeacherClasses || [];

  const [slotDraft, setSlotDraft] = useState<Array<{ start_time: string; label: string }>>([]);

  useEffect(() => {
    setSlotDraft(
      slots.map(s => ({
        start_time: normTime(s.start_time),
        label: String(s.label || ''),
      }))
    );
  }, [db.JamPelajaran]);

  const addSlotRow = () => {
    setSlotDraft(prev => {
      const last = prev[prev.length - 1];
      return [...prev, { start_time: last ? addMin(last.start_time, dur) : '07:30', label: '' }];
    });
  };

  const removeSlotRow = () => {
    setSlotDraft(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const saveSlots = async () => {
    if (slotDraft.some(s => !normTime(s.start_time))) {
      onShowToast('Semua jam mulai harus diisi.', 'warning');
      return;
    }
    onShowLoader('Menyimpan jam pelajaran...');
    try {
      await saveJamPelajaranApi(
        slotDraft.map((s, i) => ({ slot_no: i + 1, start_time: normTime(s.start_time), label: s.label })),
        actor
      );
      await onReload(true);
      onShowToast('Jam pelajaran disimpan!', 'success');
    } catch (err: any) {
      onShowToast('Gagal menyimpan: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleCellChange = async (slotNo: number, classId: string, subjectId: string) => {
    const cellKey = `${day}_${slotNo}_${classId}`;
    setSavingCellKey(cellKey);
    try {
      await saveJadwalCellApi(day, slotNo, classId, subjectId, actor);
      await onReload(true);
      onShowToast(subjectId ? 'Jadwal tersimpan & diteruskan ke guru terkait.' : 'Jam dikosongkan.', 'success');
    } catch (err: any) {
      onShowToast(err?.message || String(err), 'error');
    } finally {
      setSavingCellKey(null);
    }
  };

  const load: Record<string, number> = {};
  (db.JadwalKelas || []).forEach(r => {
    if (r.teacher_id) load[r.teacher_id] = (load[r.teacher_id] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-indigo-700 to-teal-700 text-white p-6 rounded-3xl shadow-md">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Admin • Waka Kurikulum</span>
        <h2 className="text-2xl font-extrabold mt-1">Atur Jadwal Pelajaran</h2>
        <p className="text-xs text-indigo-100 mt-1">
          Pilih mata pelajaran pada tiap sel. Guru pengampu terisi otomatis dari Penugasan Mengajar, dan jadwal langsung
          tampil di beranda guru serta panel wali murid.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Jam Pelajaran (berlaku untuk semua hari)</span>
          </h3>
          <span className="text-[11px] text-slate-500">Jam selesai otomatis = jam mulai + {dur} menit (durasi 1 JP)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {slotDraft.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-xl border bg-slate-50">
              <span className="font-extrabold w-14">Jam {i + 1}</span>
              <input
                type="time"
                value={s.start_time}
                onChange={e => {
                  const v = e.target.value;
                  setSlotDraft(prev => prev.map((x, idx) => (idx === i ? { ...x, start_time: v } : x)));
                }}
                className="px-2 py-1 rounded-lg border font-bold bg-white"
              />
              <span className="text-slate-500 tabular-nums">
                s/d <strong className="text-slate-800">{addMin(s.start_time, dur) || '-'}</strong>
              </span>
              <input
                type="text"
                value={s.label}
                placeholder="Ket. (opsional)"
                onChange={e => {
                  const v = e.target.value;
                  setSlotDraft(prev => prev.map((x, idx) => (idx === i ? { ...x, label: v } : x)));
                }}
                className="flex-1 min-w-0 px-2 py-1 rounded-lg border bg-white"
              />
              {i === slotDraft.length - 1 && slotDraft.length > 1 && (
                <button
                  type="button"
                  onClick={removeSlotRow}
                  className="text-rose-600 font-bold px-1"
                  title="Hapus jam terakhir"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addSlotRow}
            className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
          >
            + Tambah Jam ke-
          </button>
          <button
            type="button"
            onClick={saveSlots}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            Simpan Jam Pelajaran
          </button>
        </div>
      </div>

      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border w-fit text-xs font-bold overflow-x-auto max-w-full">
        {DAY_NAMES.map(d => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(d)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap ${
              d === day ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3 sticky left-0 bg-slate-800 min-w-[110px]">Jam ke-</th>
                {classes.map(c => (
                  <th key={c.id} className="p-3 text-center">
                    Kelas {c.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {slots.map(s => (
                <tr key={s.slot_no}>
                  <td className="p-3 sticky left-0 bg-slate-50 font-extrabold">
                    Jam {s.slot_no}
                    <div className="text-[10px] font-semibold text-slate-500 tabular-nums">
                      {normTime(s.start_time)} – {addMin(s.start_time, dur)}
                      {s.label ? ` • ${s.label}` : ''}
                    </div>
                  </td>
                  {classes.map(c => {
                    const cur = (db.JadwalKelas || []).find(
                      r => r.day_name === day && Number(r.slot_no) === Number(s.slot_no) && r.class_id === c.id
                    );
                    const seen = new Set<string>();
                    const opts = tcs.filter(t => {
                      if (t.class_id !== c.id || seen.has(t.subject_id)) return false;
                      seen.add(t.subject_id);
                      return true;
                    });
                    const cellKey = `${day}_${s.slot_no}_${c.id}`;
                    return (
                      <td key={c.id} className="p-2 border-l border-slate-100">
                        {!opts.length ? (
                          <span className="text-[10px] text-slate-400">Belum ada penugasan mengajar</span>
                        ) : (
                          <select
                            disabled={savingCellKey === cellKey}
                            value={cur ? cur.subject_id : ''}
                            onChange={e => handleCellChange(Number(s.slot_no), c.id, e.target.value)}
                            className={`w-full min-w-[150px] px-2 py-1.5 rounded-lg border text-[11px] font-semibold ${
                              cur ? 'bg-indigo-50 border-indigo-300' : 'bg-white'
                            }`}
                          >
                            <option value="">—</option>
                            {opts.map(t => (
                              <option key={t.id} value={t.subject_id}>
                                {subjectName(db, t.subject_id)} — {userName(db, t.teacher_id)}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-extrabold text-slate-800 text-sm mb-3">Beban Mengajar Guru (JP per minggu dari jadwal ini)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
          {Object.keys(load).length > 0 ? (
            Object.keys(load).map(t => (
              <div key={t} className="p-2.5 rounded-xl bg-slate-50 border flex justify-between">
                <span className="font-semibold">{userName(db, t)}</span>
                <span className="font-extrabold text-indigo-700 tabular-nums">{load[t]} JP</span>
              </div>
            ))
          ) : (
            <p className="text-slate-500">Belum ada jadwal yang diisi.</p>
          )}
        </div>
      </div>
    </div>
  );
}
