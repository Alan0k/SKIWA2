import React, { useMemo, useState } from 'react';
import { AlertCircle, Star } from 'lucide-react';
import { addEkskulMembersApi } from '../api/client';
import { EnhancedDataTable, type ColumnDef } from '../components/DataTableTools';
import {
  StudentAchievementCell,
  StudentViolationCell,
  studentAchievementText,
  studentViolationText,
} from '../components/StudentBadges';
import { Modal } from '../components/UiPrimitives';
import type { ActorInfo, DatabasePayload, GenericRow, RoleKey, UserPublic } from '../types/siakad';
import { className, SEVEN_HABITS_KAIH, sortedClasses } from '../utils/siakadEngine';

export function EkskulModule({
  db,
  actor,
  selectedEkskulId,
  onSelectEkskulId,
  onReload,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo | null;
  selectedEkskulId: string | null;
  onSelectEkskulId: (id: string | null) => void;
  onReload: (silent?: boolean) => Promise<void>;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const eks = db.Ekstrakurikuler || [];
  const ass = db.EkskulAssessments || [];
  const students = db.Students || [];
  const classes = db.Classes || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');

  const [addOpen, setAddOpen] = useState(false);
  const [ekN, setEkN] = useState('');
  const [ekC, setEkC] = useState(gurus[0]?.id || '');
  const [ekS, setEkS] = useState('');
  const [ekD, setEkD] = useState('');

  const [memberModalEid, setMemberModalEid] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [pickedIds, setPickedIds] = useState<string[]>([]);

  const coachOf = (e: GenericRow) => gurus.find(g => g.id === e.coach_id)?.full_name || '-';
  const isWajib = (e: GenericRow) => String(e.is_mandatory) === 'true';

  const existingSet = useMemo(
    () => new Set(ass.filter(a => a.ekskul_id === memberModalEid).map(a => String(a.student_id))),
    [ass, memberModalEid]
  );

  const openMemberPicker = (eid: string) => {
    setMemberModalEid(eid);
    setMemberSearch('');
    setPickedIds([]);
  };

  const handleSaveMembers = async () => {
    if (!memberModalEid) return;
    if (!pickedIds.length) {
      onShowToast('Belum ada siswa yang dicentang.', 'warning');
      return;
    }
    onShowLoader('Menambahkan anggota...');
    try {
      const r = await addEkskulMembersApi(memberModalEid, pickedIds, actor);
      setMemberModalEid(null);
      await onReload(true);
      onShowToast(`${r?.added ?? pickedIds.length} anggota ditambahkan!`, 'success');
    } catch (err: any) {
      onShowToast('Gagal: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleAddEkskul = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'Ekstrakurikuler',
      {
        name: ekN,
        coach_id: ekC || gurus[0]?.id || '',
        schedule: ekS,
        is_mandatory: 'false',
        description: ekD,
      },
      'Ekskul ditambahkan!'
    );
    setEkN('');
    setEkS('');
    setEkD('');
    setAddOpen(false);
  };

  const selectedEk = selectedEkskulId ? eks.find(x => x.id === selectedEkskulId) : null;

  const memberRows = useMemo(() => {
    if (!selectedEk) return [];
    const cn = (cid: string) => classes.find(c => c.id === cid)?.name || '-';
    return ass
      .filter(a => a.ekskul_id === selectedEk.id)
      .map(a => ({ a, s: students.find(st => st.id === a.student_id) }))
      .filter((x): x is { a: GenericRow; s: GenericRow } => Boolean(x.s))
      .sort(
        (x, y) =>
          String(cn(x.s.class_id)).localeCompare(String(cn(y.s.class_id))) ||
          String(x.s.full_name).localeCompare(String(y.s.full_name))
      )
      .map((x, idx) => ({
        id: x.a.id,
        student_id: x.s.id,
        no: idx + 1,
        nis: x.s.nis,
        full_name: x.s.full_name,
        class_name: cn(x.s.class_id),
        predicate: x.a.predicate,
        note: x.a.note,
      }));
  }, [selectedEk, ass, students, classes]);

  const memberCols: ColumnDef[] = [
    { key: 'no', label: 'No', sortable: false, render: r => <span className="tabular-nums">{r.no}</span> },
    { key: 'nis', label: 'NIS', render: r => <span className="font-mono tabular-nums">{r.nis}</span> },
    { key: 'full_name', label: 'Nama Siswa', render: r => <span className="font-bold">{r.full_name}</span> },
    { key: 'class_name', label: 'Kelas' },
    { key: 'predicate', label: 'Predikat', render: r => <span className="font-bold">{r.predicate}</span> },
    {
      key: '_violations',
      label: 'Pelanggaran',
      render: r => <StudentViolationCell db={db} studentId={r.student_id} compact />,
      textValue: r => studentViolationText(db, r.student_id),
    },
    {
      key: '_achievements',
      label: 'Prestasi Siswa',
      render: r => <StudentAchievementCell db={db} studentId={r.student_id} compact />,
      textValue: r => studentAchievementText(db, r.student_id),
    },
    { key: 'note', label: 'Catatan', render: r => <span className="text-slate-500">{r.note}</span> },
  ];

  return (
    <div className="space-y-5">
      {selectedEk ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSelectEkskulId(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold"
              >
                ← Kembali ke Daftar Ekskul
              </button>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">{selectedEk.name} — Anggota</h2>
                <p className="text-xs text-slate-500">
                  Pembina: <strong>{coachOf(selectedEk)}</strong> • {selectedEk.schedule} • {memberRows.length} anggota
                  {isWajib(selectedEk) ? ' • diikuti seluruh siswa' : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onOpenCrud('Ekstrakurikuler', selectedEk.id)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold"
              >
                Edit Ekskul
              </button>
              <button
                type="button"
                onClick={() => openMemberPicker(selectedEk.id)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
              >
                + Tambah Anggota
              </button>
            </div>
          </div>

          <EnhancedDataTable
            columns={memberCols}
            rows={memberRows}
            emptyText='Belum ada anggota. Klik "+ Tambah Anggota".'
            exportSheetName={`Anggota_${selectedEk.name}`}
            renderActions={r => (
              <button
                type="button"
                onClick={() => onDeleteRecord('EkskulAssessments', r.id)}
                className="text-rose-600 font-bold hover:underline"
              >
                Keluarkan
              </button>
            )}
          />
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Manajemen Ekstrakurikuler</h2>
              <p className="text-xs text-slate-500">Klik kartu untuk melihat dan mengelola anggota ekskul</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEkC(gurus[0]?.id || '');
                setAddOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              + Tambah Ekstrakurikuler
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {eks.map(e => (
              <div
                key={e.id}
                onClick={() => onSelectEkskulId(e.id)}
                className="cursor-pointer bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:shadow-md transition flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                        isWajib(e) ? 'bg-indigo-100 text-indigo-800' : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {isWajib(e) ? 'Wajib' : 'Pilihan'}
                    </span>
                    <span className="text-xs font-bold text-slate-500 tabular-nums">
                      {ass.filter(a => a.ekskul_id === e.id).length} Anggota
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base mt-2">{e.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pembina: <strong>{coachOf(e)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">Jadwal: {e.schedule}</p>
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-xs font-bold text-indigo-600">Lihat anggota →</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={ev => {
                        ev.stopPropagation();
                        onOpenCrud('Ekstrakurikuler', e.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={ev => {
                        ev.stopPropagation();
                        onDeleteRecord('Ekstrakurikuler', e.id);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold"
                    >
                      Hapus
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Modal Tambah Ekskul */}
      <Modal open={addOpen} title="Tambah Ekstrakurikuler Baru" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleAddEkskul} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Nama Ekstrakurikuler</label>
            <input required value={ekN} onChange={e => setEkN(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Guru Pembina</label>
            <select value={ekC} onChange={e => setEkC(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Jadwal Latihan</label>
            <input
              value={ekS}
              onChange={e => setEkS(e.target.value)}
              placeholder="Sabtu, 15:00 WITA"
              className="w-full px-3 py-2 rounded-xl border"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Deskripsi</label>
            <textarea rows={2} value={ekD} onChange={e => setEkD(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Ekstrakurikuler
          </button>
        </form>
      </Modal>

      {/* Modal Tambah Anggota Ekskul (Centang per Kelas) */}
      <Modal
        open={Boolean(memberModalEid)}
        title="Tambah Anggota Ekstrakurikuler"
        onClose={() => setMemberModalEid(null)}
        maxWidthClass="max-w-3xl"
        footer={
          <>
            <span className="mr-auto text-xs font-bold text-indigo-700 self-center tabular-nums">
              {pickedIds.length} siswa dipilih
            </span>
            <button
              type="button"
              onClick={() => setMemberModalEid(null)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveMembers}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Simpan Anggota
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <input
            type="search"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Cari nama / NIS siswa..."
            className="w-full px-3 py-2 rounded-xl border"
          />
          <p className="text-slate-500">
            Siswa yang sudah menjadi anggota ditandai abu-abu. Centang siswa yang akan ditambahkan.
          </p>
          {classes.map(c => {
            const q = memberSearch.trim().toLowerCase();
            const ls = students.filter(
              s =>
                s.class_id === c.id &&
                (!q || String(s.full_name).toLowerCase().includes(q) || String(s.nis).toLowerCase().includes(q))
            );
            if (!ls.length) return null;
            const availIds = ls.filter(s => !existingSet.has(String(s.id))).map(s => String(s.id));
            const allChecked = availIds.length > 0 && availIds.every(id => pickedIds.includes(id));

            return (
              <details key={c.id} open className="border rounded-xl p-2">
                <summary className="font-bold cursor-pointer py-1">
                  Kelas {c.name} ({ls.length}){' '}
                  <label className="ml-3 font-normal" onClick={ev => ev.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={ev => {
                        if (ev.target.checked) {
                          setPickedIds(prev => Array.from(new Set([...prev, ...availIds])));
                        } else {
                          setPickedIds(prev => prev.filter(id => !availIds.includes(id)));
                        }
                      }}
                    />{' '}
                    Pilih semua kelas ini
                  </label>
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                  {ls.map(s => {
                    const already = existingSet.has(String(s.id));
                    const checked = already || pickedIds.includes(String(s.id));
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border ${
                          already ? 'bg-slate-100 text-slate-400' : 'hover:bg-indigo-50 cursor-pointer'
                        }`}
                      >
                        <input
                          type="checkbox"
                          disabled={already}
                          checked={checked}
                          onChange={ev => {
                            if (ev.target.checked) setPickedIds(prev => [...prev, String(s.id)]);
                            else setPickedIds(prev => prev.filter(x => x !== String(s.id)));
                          }}
                        />
                        <span className="font-semibold">{s.full_name}</span>
                        <span className="text-[10px] ml-auto font-mono">{s.nis}</span>
                      </label>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}

export function AdditionalAssignmentsModule({
  db,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  const list = db.AdditionalAssignments || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');

  const [addOpen, setAddOpen] = useState(false);
  const [aaCat, setAaCat] = useState('Kepanitiaan');
  const [aaTitle, setAaTitle] = useState('');
  const [aaPj, setAaPj] = useState(gurus[0]?.id || '');
  const [aaSk, setAaSk] = useState('');
  const [aaLoc, setAaLoc] = useState('SMP Kristen Waibakul');
  const [aaStart, setAaStart] = useState('');
  const [aaEnd, setAaEnd] = useState('');

  const columns: ColumnDef[] = [
    {
      key: 'category',
      label: 'Kategori',
      render: a => <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">{a.category}</span>,
    },
    { key: 'title', label: 'Nama Kegiatan / Tugas', render: a => <span className="font-bold">{a.title}</span> },
    {
      key: 'pj_id',
      label: 'Penanggung Jawab',
      textValue: a => gurus.find(g => g.id === a.pj_id)?.full_name || String(a.pj_id),
    },
    { key: 'sk_number', label: 'No. SK', textValue: a => a.sk_number || '-' },
    {
      key: '_loc_date',
      label: 'Lokasi & Tanggal',
      textValue: a => `${a.location || '-'} (${a.start_date || ''} s.d. ${a.end_date || ''})`,
    },
    { key: 'status', label: 'Status', render: a => <span className="font-bold text-emerald-700">{a.status}</span> },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'AdditionalAssignments',
      {
        category: aaCat,
        title: aaTitle,
        pj_id: aaPj || gurus[0]?.id || '',
        member_ids: aaPj || gurus[0]?.id || '',
        sk_number: aaSk,
        location: aaLoc,
        start_date: aaStart,
        end_date: aaEnd,
        status: 'Aktif',
      },
      'Penugasan ditambahkan!'
    );
    setAaTitle('');
    setAaSk('');
    setAddOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Penugasan Tambahan (Kepanitiaan &amp; Lomba)</h2>
          <p className="text-xs text-slate-500">
            Pengelolaan SK kepanitiaan sekolah, pembimbingan lomba siswa, dan tugas khusus
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAaPj(gurus[0]?.id || '');
            setAddOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
        >
          + Tambah Penugasan
        </button>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={list}
        exportSheetName="Penugasan_Tambahan"
        renderActions={a => (
          <div className="space-x-2">
            <button type="button" onClick={() => onOpenCrud('AdditionalAssignments', a.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('AdditionalAssignments', a.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <Modal open={addOpen} title="Tambah Penugasan Tambahan / Kepanitiaan" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Kategori</label>
            <select value={aaCat} onChange={e => setAaCat(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="Kepanitiaan">Kepanitiaan</option>
              <option value="Pembimbingan Lomba">Pembimbingan Lomba</option>
              <option value="Tugas Lainnya">Tugas Lainnya</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Judul Kegiatan</label>
            <input required value={aaTitle} onChange={e => setAaTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Penanggung Jawab</label>
            <select value={aaPj} onChange={e => setAaPj(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold mb-1">No. SK</label>
              <input value={aaSk} onChange={e => setAaSk(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Lokasi</label>
              <input value={aaLoc} onChange={e => setAaLoc(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Mulai</label>
              <input type="date" value={aaStart} onChange={e => setAaStart(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Selesai</label>
              <input type="date" value={aaEnd} onChange={e => setAaEnd(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Penugasan
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function GuruWaliModule({
  db,
  user,
  activeRole,
  onSaveRecord,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const isAdminOrKs = ['admin', 'kepala_sekolah'].includes(activeRole);
  const students = (db.Students || []).filter(s => (isAdminOrKs ? true : s.guru_wali_id === user.id));
  const records = db.GuruWaliRecords || [];
  const users = db.UsersPublic || [];

  const [assessStudentId, setAssessStudentId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({
    disiplin: 4,
    kemandirian: 4,
    kejujuran: 5,
    relasi_sosial: 4,
    spiritual: 5,
    keaktifan: 4,
  });
  const [habitScores, setHabitScores] = useState<Record<string, number>>({
    hab_bangun_pagi: 4,
    hab_beribadah: 5,
    hab_berolahraga: 4,
    hab_makan_sehat: 4,
    hab_gemar_belajar: 4,
    hab_bermasyarakat: 4,
    hab_tidur_cepat: 4,
  });
  const [gwNote, setGwNote] = useState('');
  const [gwRec, setGwRec] = useState('');

  const aspects = [
    { k: 'disiplin', l: '1. Kedisiplinan' },
    { k: 'kemandirian', l: '2. Kemandirian Belajar' },
    { k: 'kejujuran', l: '3. Kejujuran & Integritas' },
    { k: 'relasi_sosial', l: '4. Relasi Sosial & Empati' },
    { k: 'spiritual', l: '5. Kehidupan Spiritual' },
    { k: 'keaktifan', l: '6. Keaktifan & Tanggung Jawab' },
  ];

  const openAssess = (stId: string) => {
    const rec = records.find(r => r.student_id === stId);
    setAssessStudentId(stId);
    setScores({
      disiplin: rec ? Number(rec.disiplin) || 4 : 4,
      kemandirian: rec ? Number(rec.kemandirian) || 4 : 4,
      kejujuran: rec ? Number(rec.kejujuran) || 5 : 5,
      relasi_sosial: rec ? Number(rec.relasi_sosial) || 4 : 4,
      spiritual: rec ? Number(rec.spiritual) || 5 : 5,
      keaktifan: rec ? Number(rec.keaktifan) || 4 : 4,
    });
    const nextHab: Record<string, number> = {};
    SEVEN_HABITS_KAIH.forEach(h => {
      nextHab[h.k] = rec && rec[h.k] ? Number(rec[h.k]) || 4 : 4;
    });
    setHabitScores(nextHab);
    setGwNote(rec?.note || '');
    setGwRec(rec?.recommendation || '');
  };

  const activeSem = (db.Settings || []).find(s => s.key === 'active_semester')?.value || 'Ganjil';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assessStudentId) return;
    const existing = records.find(r => r.student_id === assessStudentId);
    await onSaveRecord(
      'GuruWaliRecords',
      {
        id: existing?.id || '',
        guru_wali_id: user.id,
        student_id: assessStudentId,
        semester: activeSem,
        disiplin: Number(scores.disiplin),
        kemandirian: Number(scores.kemandirian),
        kejujuran: Number(scores.kejujuran),
        relasi_sosial: Number(scores.relasi_sosial),
        spiritual: Number(scores.spiritual),
        keaktifan: Number(scores.keaktifan),
        hab_bangun_pagi: Number(habitScores.hab_bangun_pagi || 4),
        hab_beribadah: Number(habitScores.hab_beribadah || 4),
        hab_berolahraga: Number(habitScores.hab_berolahraga || 4),
        hab_makan_sehat: Number(habitScores.hab_makan_sehat || 4),
        hab_gemar_belajar: Number(habitScores.hab_gemar_belajar || 4),
        hab_bermasyarakat: Number(habitScores.hab_bermasyarakat || 4),
        hab_tidur_cepat: Number(habitScores.hab_tidur_cepat || 4),
        note: gwNote,
        recommendation: gwRec,
      },
      'Penilaian karakter & 7 Kebiasaan Guru Wali berhasil disimpan!'
    );
    setAssessStudentId(null);
  };

  const columns: ColumnDef[] = [
    { key: 'full_name', label: 'Nama Siswa Binaan', render: st => <span className="font-bold">{st.full_name}</span> },
    { key: 'class_id', label: 'Kelas', textValue: st => className(db, st.class_id) },
    {
      key: 'guru_wali_id',
      label: 'Guru Wali',
      render: st => <span className="text-slate-500">{users.find(u => u.id === st.guru_wali_id)?.full_name || '-'}</span>,
      textValue: st => users.find(u => u.id === st.guru_wali_id)?.full_name || '-',
    },
    {
      key: '_violations',
      label: 'Pelanggaran',
      render: st => <StudentViolationCell db={db} studentId={st.id} compact />,
      textValue: st => studentViolationText(db, st.id),
    },
    {
      key: '_achievements',
      label: 'Prestasi Siswa',
      render: st => <StudentAchievementCell db={db} studentId={st.id} compact />,
      textValue: st => studentAchievementText(db, st.id),
    },
    {
      key: '_avg',
      label: 'Skor 6 Aspek (1-5)',
      align: 'center',
      render: st => {
        const rec = records.find(r => r.student_id === st.id);
        const avgScore = rec
          ? (
              (Number(rec.disiplin) +
                Number(rec.kemandirian) +
                Number(rec.kejujuran) +
                Number(rec.relasi_sosial) +
                Number(rec.spiritual) +
                Number(rec.keaktifan)) /
              6
            ).toFixed(1)
          : 'Belum dinilai';
        return <span className="font-extrabold text-indigo-700 tabular-nums">{avgScore}</span>;
      },
    },
    {
      key: '_kaih',
      label: '7 Kebiasaan (★)',
      align: 'center',
      render: st => {
        const rec = records.find(r => r.student_id === st.id);
        if (!rec) return <span className="text-slate-400">Belum dinilai</span>;
        const avgKaih = (
          SEVEN_HABITS_KAIH.reduce((a, h) => a + (Number(rec[h.k]) || 0), 0) / SEVEN_HABITS_KAIH.length
        ).toFixed(1);
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-extrabold tabular-nums">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{avgKaih}/5</span>
          </span>
        );
      },
      textValue: st => {
        const rec = records.find(r => r.student_id === st.id);
        if (!rec) return 'Belum dinilai';
        return (
          (SEVEN_HABITS_KAIH.reduce((a, h) => a + (Number(rec[h.k]) || 0), 0) / SEVEN_HABITS_KAIH.length).toFixed(1) + '/5'
        );
      },
    },
    {
      key: '_note',
      label: 'Catatan Perkembangan',
      render: st => {
        const rec = records.find(r => r.student_id === st.id);
        return <span className="block max-w-xs">{rec ? rec.note : '-'}</span>;
      },
      textValue: st => records.find(r => r.student_id === st.id)?.note || '-',
    },
  ];

  const targetSt = assessStudentId ? students.find(s => s.id === assessStudentId) : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Bimbingan Karakter &amp; Guru Wali</h2>
        <p className="text-xs text-slate-500">
          Penilaian 6 aspek karakter, <strong>7 Kebiasaan Anak Indonesia Hebat (Rating 5 Bintang)</strong>, serta rekomendasi pembinaan siswa
        </p>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={students}
        exportSheetName="Guru_Wali"
        renderActions={st => (
          <button
            type="button"
            onClick={() => openAssess(st.id)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold"
          >
            Nilai Karakter &amp; 7 Kebiasaan
          </button>
        )}
      />

      <Modal
        open={Boolean(assessStudentId && targetSt)}
        title="Penilaian Karakter & 7 Kebiasaan Anak Indonesia Hebat"
        onClose={() => setAssessStudentId(null)}
        maxWidthClass="max-w-4xl"
      >
        {targetSt && (
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-2">
              <p className="font-extrabold text-indigo-950 text-sm">
                Peserta Didik: {targetSt.full_name} ({className(db, targetSt.class_id)})
              </p>
              <span className="text-[11px] font-semibold text-indigo-700">Semester: {activeSem}</span>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 mb-2">A. 6 Aspek Karakter Sekolah (Skala 1–5)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {aspects.map(a => (
                  <div key={a.k} className="p-2.5 rounded-xl bg-slate-50 border flex items-center justify-between">
                    <span className="font-bold">{a.l}</span>
                    <select
                      value={scores[a.k]}
                      onChange={e => setScores(prev => ({ ...prev, [a.k]: Number(e.target.value) }))}
                      className="px-2.5 py-1 rounded-lg border font-extrabold bg-white"
                    >
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-800 mb-2">
                B. 7 Kebiasaan Anak Indonesia Hebat (Klik Bintang 1–5)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {SEVEN_HABITS_KAIH.map((h, idx) => {
                  const val = habitScores[h.k] || 4;
                  return (
                    <div
                      key={h.k}
                      className="p-3 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center justify-between gap-2"
                    >
                      <span className="font-bold text-slate-800">
                        {idx + 1}. {h.label}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setHabitScores(prev => ({ ...prev, [h.k]: star }))}
                            className="p-0.5 transition hover:scale-110"
                            title={`${star} Bintang`}
                            aria-label={`${h.label} ${star} Bintang`}
                          >
                            <Star
                              className={`w-5 h-5 ${
                                star <= val ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="ml-1 font-extrabold text-amber-800 tabular-nums w-7 text-right">
                          {val}/5
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block font-bold mb-1">
                Catatan Perkembangan Karakter (Tampil di Rapor &amp; Portal Ortu)
              </label>
              <textarea
                rows={2}
                required
                value={gwNote}
                onChange={e => setGwNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Rekomendasi Pembinaan</label>
              <input
                value={gwRec}
                onChange={e => setGwRec(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
              Simpan Penilaian Guru Wali
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
}

export function PelanggaranAddModal({
  open,
  db,
  user,
  onClose,
  onSaveRecord,
}: {
  open: boolean;
  db: DatabasePayload;
  user: UserPublic;
  onClose: () => void;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const [clsFilter, setClsFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [studentId, setStudentId] = useState('');
  const [incidentDate, setIncidentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('Ringan');
  const [points, setPoints] = useState(5);
  const [description, setDescription] = useState('');
  const [sanction, setSanction] = useState('');

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (db.Students || [])
      .filter(s => String(s.status || 'Aktif') === 'Aktif')
      .filter(s => clsFilter === 'ALL' || s.class_id === clsFilter)
      .filter(s => !q || String(s.full_name).toLowerCase().includes(q) || String(s.nis).includes(q))
      .sort(
        (a, b) =>
          String(className(db, a.class_id)).localeCompare(String(className(db, b.class_id)), 'id', { numeric: true }) ||
          String(a.full_name).localeCompare(String(b.full_name), 'id')
      );
  }, [db, clsFilter, search]);

  const activeStudentId = filteredStudents.some(s => s.id === studentId)
    ? studentId
    : filteredStudents[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudentId) return;
    await onSaveRecord(
      'PelanggaranSiswa',
      {
        student_id: activeStudentId,
        reporter_id: user.id,
        incident_date: incidentDate,
        category,
        description,
        points: Number(points),
        sanction,
        status: 'Dalam Pembinaan',
      },
      'Pelanggaran siswa berhasil dicatat!'
    );
    setDescription('');
    setSanction('');
    onClose();
  };

  return (
    <Modal open={open} title="Input Catatan Pelanggaran Tata Tertib" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div>
          <label className="block font-bold mb-1">Peserta Didik</label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select
              value={clsFilter}
              onChange={e => setClsFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border font-bold bg-white"
            >
              <option value="ALL">Semua Kelas</option>
              {sortedClasses(db).map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / NIS..."
              className="px-3 py-2 rounded-xl border"
            />
          </div>
          <select
            required
            value={activeStudentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border font-bold bg-white"
          >
            {filteredStudents.length === 0 ? (
              <option value="">— Tidak ada siswa yang cocok —</option>
            ) : (
              filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.full_name} ({className(db, s.class_id)})
                </option>
              ))
            )}
          </select>
          <p className="text-[11px] text-slate-500 mt-1 tabular-nums">{filteredStudents.length} siswa ditemukan</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block font-bold mb-1">Tanggal Kejadian</label>
            <input
              type="date"
              required
              value={incidentDate}
              onChange={e => setIncidentDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border"
            />
          </div>
          <div>
            <label className="block font-bold mb-1">Kategori</label>
            <select
              value={category}
              onChange={e => {
                const v = e.target.value;
                setCategory(v);
                setPoints(v === 'Berat' ? 40 : v === 'Sedang' ? 15 : 5);
              }}
              className="w-full px-3 py-2 rounded-xl border font-bold bg-white"
            >
              <option value="Ringan">Ringan</option>
              <option value="Sedang">Sedang</option>
              <option value="Berat">Berat</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Poin</label>
            <input
              type="number"
              value={points}
              onChange={e => setPoints(Number(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border font-bold"
            />
          </div>
        </div>
        <div>
          <label className="block font-bold mb-1">Uraian Pelanggaran</label>
          <textarea
            required
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Sanksi / Tindak Lanjut Pembinaan</label>
          <input
            required
            value={sanction}
            onChange={e => setSanction(e.target.value)}
            placeholder="Teguran lisan / pembinaan wali kelas..."
            className="w-full px-3 py-2 rounded-xl border"
          />
        </div>
        <button type="submit" className="w-full py-2.5 rounded-xl bg-rose-600 text-white font-bold">
          Simpan Catatan Pelanggaran
        </button>
      </form>
    </Modal>
  );
}

export function PelanggaranModule({
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
  const [addOpen, setAddOpen] = useState(false);
  const students = db.Students || [];
  const classes = db.Classes || [];
  const violations = db.PelanggaranSiswa || [];
  const users = db.UsersPublic || [];

  const columns: ColumnDef[] = [
    { key: 'incident_date', label: 'Tanggal', render: v => <span className="whitespace-nowrap tabular-nums">{v.incident_date}</span> },
    {
      key: 'student_id',
      label: 'Nama Siswa & Kelas',
      render: v => {
        const st = students.find(s => s.id === v.student_id) || { full_name: v.student_id, class_id: '-' };
        const cls = classes.find(c => c.id === st.class_id) || { name: st.class_id };
        return (
          <span className="font-bold">
            {st.full_name} <span className="text-slate-400 font-normal">({cls.name})</span>
          </span>
        );
      },
      textValue: v => {
        const st = students.find(s => s.id === v.student_id);
        return st ? st.full_name : String(v.student_id);
      },
    },
    {
      key: 'category',
      label: 'Kategori',
      render: v => {
        const badgeColor =
          v.category === 'Berat'
            ? 'bg-rose-100 text-rose-800'
            : v.category === 'Sedang'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-slate-100 text-slate-700';
        return <span className={`px-2 py-0.5 rounded font-bold ${badgeColor}`}>{v.category}</span>;
      },
    },
    { key: 'description', label: 'Uraian Pelanggaran' },
    {
      key: 'points',
      label: 'Poin',
      align: 'center',
      render: v => <span className="font-extrabold text-rose-700 tabular-nums">+{v.points}</span>,
    },
    { key: 'sanction', label: 'Sanksi / Tindak Lanjut' },
    {
      key: 'reporter_id',
      label: 'Pelapor',
      render: v => <span className="text-slate-500">{users.find(u => u.id === v.reporter_id)?.full_name || 'Guru'}</span>,
      textValue: v => users.find(u => u.id === v.reporter_id)?.full_name || 'Guru',
    },
    { key: 'status', label: 'Status', render: v => <span className="font-semibold text-emerald-700">{v.status}</span> },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Catatan Pelanggaran Tata Tertib &amp; Sanksi</h2>
          <p className="text-xs text-slate-500">
            Setiap guru dapat mencatat pelanggaran siswa; data otomatis terakumulasi di Data Siswa &amp; Waka Kesiswaan
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5"
        >
          <AlertCircle className="w-4 h-4" />
          <span>+ Catat Pelanggaran Siswa</span>
        </button>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={violations}
        exportSheetName="Pelanggaran_Siswa"
        renderActions={v => (
          <div className="space-x-2">
            <button type="button" onClick={() => onOpenCrud('PelanggaranSiswa', v.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('PelanggaranSiswa', v.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <PelanggaranAddModal
        open={addOpen}
        db={db}
        user={user}
        onClose={() => setAddOpen(false)}
        onSaveRecord={onSaveRecord}
      />
    </div>
  );
}
