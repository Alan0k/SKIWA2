import React, { useState } from 'react';
import { EnhancedDataTable, type ColumnDef } from '../components/DataTableTools';
import {
  StudentAchievementCell,
  StudentViolationCell,
  studentAchievementText,
  studentViolationText,
} from '../components/StudentBadges';
import { Modal } from '../components/UiPrimitives';
import type { DatabasePayload, GenericRow, UserPublic } from '../types/siakad';
import { getSettingVal } from '../utils/siakadEngine';
import { P5EvaluationModal } from './GuruWorkspace';

export function KokurikulerModule({
  db,
  user,
  subMenu,
  onNavigateMenu,
  onSaveRecord,
  onDeleteRecord,
}: {
  db: DatabasePayload;
  user: UserPublic;
  subMenu: string;
  onNavigateMenu: (menuId: string) => void;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onDeleteRecord: (sheet: string, id: string) => void;
}) {
  const projects = db.KokurikulerProjects || [];
  const evals = db.KokurikulerEvaluations || [];
  const students = db.Students || [];
  const classes = db.Classes || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');

  const [prjFilter, setPrjFilter] = useState('ALL');
  const [clsFilter, setClsFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const [addOpen, setAddOpen] = useState(false);
  const [p5T, setP5T] = useState('');
  const [p5Th, setP5Th] = useState('');
  const [p5Dim, setP5Dim] = useState('Gotong Royong, Bernalar Kritis, Kreatif');
  const [p5Cls, setP5Cls] = useState('CLS-7A,CLS-7B');
  const [p5C, setP5C] = useState(gurus[0]?.id || '');
  const [p5D, setP5D] = useState('');

  const [evalModal, setEvalModal] = useState<{ open: boolean; projectId: string; evalId: string }>({
    open: false,
    projectId: '',
    evalId: '',
  });

  const navTabs = [
    { id: 'p5_dashboard', label: 'Dashboard P5' },
    { id: 'p5_proyek', label: '1. Manajemen Proyek' },
    { id: 'p5_jadwal', label: '2. Jadwal & Blok Proyek' },
    { id: 'p5_fasilitator', label: '3. Penugasan Fasilitator' },
    { id: 'p5_evaluasi', label: '4. Evaluasi Karakter P5 (Review Rapor)' },
  ];

  const renderNavPills = () => (
    <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 mb-5">
      {navTabs.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => onNavigateMenu(t.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold ${
            subMenu === t.id ? 'bg-cyan-700 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );

  const handleSaveNewProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const sem = getSettingVal(db, 'active_semester', 'Ganjil');
    const ta = getSettingVal(db, 'academic_year', '2026/2027');
    await onSaveRecord(
      'KokurikulerProjects',
      {
        title: p5T,
        theme: p5Th,
        description: p5D,
        dimensions: p5Dim,
        target_classes: p5Cls,
        coordinator_id: p5C || gurus[0]?.id || '',
        facilitator_ids: p5C || gurus[0]?.id || '',
        schedule_block: `Semester ${sem} ${ta}`,
        academic_year: ta,
        status: 'Berjalan',
      },
      'Proyek P5 ditambahkan!'
    );
    setP5T('');
    setP5Th('');
    setP5D('');
    setAddOpen(false);
  };

  if (subMenu === 'p5_dashboard') {
    return (
      <div>
        {renderNavPills()}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-2xl border">
            <p className="text-xs font-bold text-slate-500">Total Proyek P5</p>
            <p className="text-3xl font-extrabold text-cyan-800 mt-1 tabular-nums">{projects.length}</p>
          </div>
          <div
            onClick={() => onNavigateMenu('p5_jadwal')}
            className="cursor-pointer bg-cyan-50 p-5 rounded-2xl border border-cyan-200 hover:bg-cyan-100"
          >
            <p className="text-xs font-bold text-cyan-800">Pintasan</p>
            <p className="font-extrabold text-sm mt-1">Atur Jadwal &amp; Blok →</p>
          </div>
          <div
            onClick={() => onNavigateMenu('p5_fasilitator')}
            className="cursor-pointer bg-indigo-50 p-5 rounded-2xl border border-indigo-200 hover:bg-indigo-100"
          >
            <p className="text-xs font-bold text-indigo-800">Pintasan</p>
            <p className="font-extrabold text-sm mt-1">Penugasan Fasilitator →</p>
          </div>
          <div
            onClick={() => onNavigateMenu('p5_evaluasi')}
            className="cursor-pointer bg-emerald-50 p-5 rounded-2xl border border-emerald-200 hover:bg-emerald-100"
          >
            <p className="text-xs font-bold text-emerald-800">Review Rapor</p>
            <p className="font-extrabold text-sm mt-1 tabular-nums">{evals.length} Evaluasi Siswa →</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <div
              key={p.id}
              onClick={() => onNavigateMenu('p5_evaluasi')}
              className="cursor-pointer bg-white p-5 rounded-2xl border hover:border-cyan-500 transition"
            >
              <span className="px-2.5 py-0.5 rounded bg-cyan-100 text-cyan-800 text-xs font-bold">{p.theme}</span>
              <h3 className="font-extrabold text-base text-slate-900 mt-2">{p.title}</h3>
              <p className="text-xs text-slate-500 mt-1">{p.description}</p>
              <p className="text-xs font-bold text-indigo-700 mt-3">Jadwal: {p.schedule_block}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (subMenu === 'p5_proyek') {
    const columns: ColumnDef[] = [
      { key: 'title', label: 'Judul Proyek', render: p => <span className="font-bold">{p.title}</span> },
      { key: 'theme', label: 'Tema' },
      { key: 'dimensions', label: 'Dimensi' },
      { key: 'target_classes', label: 'Kelas Sasaran', render: p => <span className="font-bold">{p.target_classes}</span> },
      { key: 'status', label: 'Status', render: p => <span className="text-emerald-700 font-bold">{p.status}</span> },
    ];

    return (
      <div>
        {renderNavPills()}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-extrabold">Manajemen Proyek Kokurikuler (P5)</h2>
          <button
            type="button"
            onClick={() => {
              setP5C(gurus[0]?.id || '');
              setAddOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-700 text-white text-xs font-bold"
          >
            + Tambah Proyek P5
          </button>
        </div>
        <EnhancedDataTable
          columns={columns}
          rows={projects}
          exportSheetName="Proyek_P5"
          renderActions={p => (
            <button type="button" onClick={() => onDeleteRecord('KokurikulerProjects', p.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          )}
        />

        <Modal open={addOpen} title="Tambah Proyek Kokurikuler (P5)" onClose={() => setAddOpen(false)}>
          <form onSubmit={handleSaveNewProject} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold mb-1">Judul Proyek</label>
              <input required value={p5T} onChange={e => setP5T(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Tema P5</label>
              <input
                required
                value={p5Th}
                onChange={e => setP5Th(e.target.value)}
                placeholder="Kearifan Lokal / Kewirausahaan / Suara Demokrasi"
                className="w-full px-3 py-2 rounded-xl border"
              />
            </div>
            <div>
              <label className="block font-bold mb-1">Dimensi (pisahkan koma)</label>
              <input required value={p5Dim} onChange={e => setP5Dim(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Kelas Sasaran (Contoh: CLS-7A,CLS-7B)</label>
              <input value={p5Cls} onChange={e => setP5Cls(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Koordinator</label>
              <select value={p5C} onChange={e => setP5C(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                {gurus.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Deskripsi</label>
              <textarea rows={2} value={p5D} onChange={e => setP5D(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <button type="submit" className="w-full py-2.5 rounded-xl bg-cyan-700 text-white font-bold">
              Simpan Proyek
            </button>
          </form>
        </Modal>
      </div>
    );
  }

  if (subMenu === 'p5_jadwal') {
    return (
      <div>
        {renderNavPills()}
        <h2 className="text-lg font-extrabold mb-4">Jadwal &amp; Blok Pelaksanaan Proyek P5</h2>
        <div className="space-y-4">
          {projects.map(p => (
            <P5JadwalRowForm key={p.id} project={p} onSaveRecord={onSaveRecord} />
          ))}
        </div>
      </div>
    );
  }

  if (subMenu === 'p5_fasilitator') {
    return (
      <div>
        {renderNavPills()}
        <h2 className="text-lg font-extrabold mb-4">Penugasan Koordinator &amp; Fasilitator Proyek P5</h2>
        <div className="space-y-4">
          {projects.map(p => (
            <P5FacilitatorsRowForm key={p.id} project={p} gurus={gurus} onSaveRecord={onSaveRecord} />
          ))}
        </div>
      </div>
    );
  }

  // p5_evaluasi
  const filteredEvals = evals.filter(ev => {
    const st = students.find(s => s.id === ev.student_id) || { full_name: '' };
    const matchPrj = prjFilter === 'ALL' || ev.project_id === prjFilter;
    const matchCls = clsFilter === 'ALL' || ev.class_id === clsFilter;
    const matchSearch = !search || String(st.full_name).toLowerCase().includes(search.toLowerCase());
    return matchPrj && matchCls && matchSearch;
  });

  const evalCols: ColumnDef[] = [
    {
      key: 'student_id',
      label: 'Siswa',
      render: ev => <span className="font-bold">{students.find(s => s.id === ev.student_id)?.full_name || ev.student_id}</span>,
      textValue: ev => students.find(s => s.id === ev.student_id)?.full_name || String(ev.student_id),
    },
    { key: 'class_id', label: 'Kelas' },
    {
      key: '_violations',
      label: 'Pelanggaran',
      render: ev => <StudentViolationCell db={db} studentId={ev.student_id} compact />,
      textValue: ev => studentViolationText(db, ev.student_id),
    },
    {
      key: '_achievements',
      label: 'Prestasi Siswa',
      render: ev => <StudentAchievementCell db={db} studentId={ev.student_id} compact />,
      textValue: ev => studentAchievementText(db, ev.student_id),
    },
    {
      key: 'project_id',
      label: 'Proyek P5',
      render: ev => <span className="font-semibold">{projects.find(p => p.id === ev.project_id)?.title || ev.project_id}</span>,
      textValue: ev => projects.find(p => p.id === ev.project_id)?.title || String(ev.project_id),
    },
    {
      key: 'dimension_scores',
      label: 'Capaian Dimensi',
      render: ev => {
        let dimObj: Record<string, string> = {};
        try {
          dimObj = JSON.parse(ev.dimension_scores || '{}');
        } catch {
          dimObj = {};
        }
        return (
          <div className="flex flex-wrap gap-1">
            {Object.entries(dimObj).map(([k, v]) => (
              <span key={k} className="inline-block px-2 py-0.5 rounded bg-cyan-50 text-cyan-800 font-bold">
                {k}: {v}
              </span>
            ))}
          </div>
        );
      },
      textValue: ev => String(ev.dimension_scores || ''),
    },
    { key: 'note', label: 'Catatan Rapor', render: ev => <span className="block max-w-xs">{ev.note}</span> },
  ];

  return (
    <div>
      {renderNavPills()}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-extrabold">Evaluasi Karakter P5 (Review Rapor Siswa)</h2>
          <p className="text-xs text-slate-500">
            Tinjau, tambah, edit, atau hapus capaian dimensi (BB/MB/BSH/SAB) dan catatan sebelum dicetak pada Rapor
          </p>
        </div>
        {projects[0] && (
          <button
            type="button"
            onClick={() =>
              setEvalModal({
                open: true,
                projectId: prjFilter !== 'ALL' ? prjFilter : projects[0].id,
                evalId: '',
              })
            }
            className="px-4 py-2 rounded-xl bg-cyan-700 text-white text-xs font-bold"
          >
            + Tambah Evaluasi P5
          </button>
        )}
      </div>

      <div className="bg-white p-3.5 rounded-2xl border flex flex-wrap gap-2 mb-4 text-xs">
        <select value={prjFilter} onChange={e => setPrjFilter(e.target.value)} className="px-3 py-2 rounded-xl border font-bold bg-white">
          <option value="ALL">Semua Proyek P5</option>
          {projects.map(p => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <select value={clsFilter} onChange={e => setClsFilter(e.target.value)} className="px-3 py-2 rounded-xl border font-bold bg-white">
          <option value="ALL">Semua Kelas</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              Kelas {c.name}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Cari nama siswa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-xl border"
        />
      </div>

      <EnhancedDataTable
        columns={evalCols}
        rows={filteredEvals}
        exportSheetName="Evaluasi_P5"
        renderActions={ev => (
          <div className="space-x-2 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setEvalModal({ open: true, projectId: ev.project_id, evalId: ev.id })}
              className="text-indigo-600 font-bold"
            >
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('KokurikulerEvaluations', ev.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <P5EvaluationModal
        open={evalModal.open}
        projectId={evalModal.projectId}
        evalId={evalModal.evalId}
        db={db}
        user={user}
        onClose={() => setEvalModal(p => ({ ...p, open: false }))}
        onSaveRecord={onSaveRecord}
      />
    </div>
  );
}

function P5JadwalRowForm({
  project,
  onSaveRecord,
}: {
  project: GenericRow;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const [block, setBlock] = useState(String(project.schedule_block || ''));
  const [targetCls, setTargetCls] = useState(String(project.target_classes || ''));
  const [status, setStatus] = useState(String(project.status || 'Berjalan'));

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSaveRecord(
          'KokurikulerProjects',
          {
            ...project,
            schedule_block: block,
            target_classes: targetCls,
            status,
          },
          'Jadwal blok proyek diperbarui!'
        );
      }}
      className="bg-white p-5 rounded-2xl border grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
    >
      <div className="sm:col-span-2">
        <p className="font-extrabold text-slate-900 text-sm mb-1">{project.title}</p>
        <label className="block font-bold text-slate-500 mb-1">Jadwal Blok Pelaksanaan</label>
        <input value={block} onChange={e => setBlock(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
      </div>
      <div>
        <label className="block font-bold text-slate-500 mb-1">Kelas Sasaran (ID dipisah koma)</label>
        <input value={targetCls} onChange={e => setTargetCls(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
      </div>
      <div className="flex gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className="px-3 py-2 rounded-xl border font-bold bg-white">
          {['Perencanaan', 'Berjalan', 'Selesai'].map(s => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="submit" className="px-4 py-2 rounded-xl bg-cyan-700 text-white font-bold">
          Simpan
        </button>
      </div>
    </form>
  );
}

function P5FacilitatorsRowForm({
  project,
  gurus,
  onSaveRecord,
}: {
  project: GenericRow;
  gurus: UserPublic[];
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const [coord, setCoord] = useState(String(project.coordinator_id || gurus[0]?.id || ''));
  const [facs, setFacs] = useState<string[]>(() =>
    String(project.facilitator_ids || '')
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
  );

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        onSaveRecord(
          'KokurikulerProjects',
          {
            ...project,
            coordinator_id: coord,
            facilitator_ids: facs.join(','),
          },
          'Tim fasilitator P5 diperbarui!'
        );
      }}
      className="bg-white p-5 rounded-2xl border space-y-3 text-xs"
    >
      <h3 className="font-extrabold text-sm text-slate-900">{project.title}</h3>
      <div>
        <label className="block font-bold mb-1">Koordinator Utama</label>
        <select value={coord} onChange={e => setCoord(e.target.value)} className="w-full sm:w-80 px-3 py-2 rounded-xl border font-bold bg-white">
          {gurus.map(g => (
            <option key={g.id} value={g.id}>
              {g.full_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block font-bold mb-1">Pilih Guru Fasilitator Pendamping (Multi-select):</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {gurus.map(g => (
            <label key={g.id} className="flex items-center gap-2 p-2 rounded-xl border bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={facs.includes(g.id)}
                onChange={e => setFacs(prev => (e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id)))}
              />
              <span>{g.full_name}</span>
            </label>
          ))}
        </div>
      </div>
      <button type="submit" className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold">
        Simpan Penugasan Tim P5
      </button>
    </form>
  );
}
