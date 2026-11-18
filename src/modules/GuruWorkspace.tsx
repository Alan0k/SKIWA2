import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Award,
  BookOpen,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardEdit,
  Compass,
  FileSpreadsheet,
  MousePointerClick,
  Pencil,
  Plus,
  Save,
  Trash2,
  Trophy,
  Wand2,
} from 'lucide-react';
import { EnhancedDataTable, type ColumnDef } from '../components/DataTableTools';
import {
  StudentAchievementCell,
  StudentViolationCell,
  studentAchievementText,
  studentViolationText,
} from '../components/StudentBadges';
import { Modal } from '../components/UiPrimitives';
import type { ActorInfo, DatabasePayload, GenericRow, RoleKey, UserPublic } from '../types/siakad';
import {
  adminBlocksJp,
  addMin,
  className,
  copyTableTsv,
  DAY_NAMES,
  exportTableToExcel,
  getJpDuration,
  getSchoolIdentity,
  getSettingVal,
  getStudentSubjectReport,
  getTeacherAdminBlocks,
  isNilaiFinal,
  normTime,
  predicateToScoreByKkm,
  renderOfficialLetterheadHtml,
  renderSignatureBlockHtml,
  scoreToGradeLetter,
  shortenTpText,
  siEsc,
  siNameCase,
  subjectName,
  todayDayName,
} from '../utils/siakadEngine';
import {
  createSessionsFromProtaApi,
  saveSchoolSettingsApi,
  saveSessionAttendanceBatchApi,
} from '../api/client';

export function P5EvaluationModal({
  open,
  projectId,
  evalId,
  db,
  user,
  onClose,
  onSaveRecord,
}: {
  open: boolean;
  projectId: string;
  evalId: string;
  db: DatabasePayload;
  user: UserPublic;
  onClose: () => void;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
}) {
  const prj = (db.KokurikulerProjects || []).find(p => p.id === projectId);
  const existing = evalId ? (db.KokurikulerEvaluations || []).find(e => e.id === evalId) : null;
  const targetClasses = prj
    ? String(prj.target_classes || '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
    : [];
  const students = (db.Students || []).filter(s => targetClasses.length === 0 || targetClasses.includes(s.class_id));
  const dims = prj
    ? String(prj.dimensions || 'Gotong Royong, Kreatif')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
    : [];

  const [studentId, setStudentId] = useState('');
  const [dimScores, setDimScores] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open || !prj) return;
    let parsed: Record<string, string> = {};
    if (existing?.dimension_scores) {
      try {
        parsed = JSON.parse(existing.dimension_scores);
      } catch {
        parsed = {};
      }
    }
    const initDims: Record<string, string> = {};
    dims.forEach(d => {
      initDims[d] = parsed[d] || 'BSH';
    });
    setStudentId(existing ? String(existing.student_id) : students[0]?.id || '');
    setDimScores(initDims);
    setNote(existing ? String(existing.note || '') : '');
  }, [open, projectId, evalId]);

  if (!open || !prj) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stObj = (db.Students || []).find(s => s.id === studentId);
    const firstPred = Object.values(dimScores)[0] || 'BSH';
    await onSaveRecord(
      'KokurikulerEvaluations',
      {
        id: evalId || '',
        project_id: projectId,
        student_id: studentId,
        class_id: stObj ? stObj.class_id : '',
        dimension_scores: JSON.stringify(dimScores),
        final_predicate: firstPred,
        note,
        reviewed_by: user.full_name,
      },
      'Evaluasi P5 berhasil disimpan & disinkronkan ke Rapor!'
    );
    onClose();
  };

  return (
    <Modal open={open} title={existing ? 'Edit Evaluasi P5 Siswa' : 'Input Evaluasi P5 Siswa'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Peserta Didik</label>
          <select
            required
            disabled={!!existing}
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-white"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.class_id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700">Capaian Multi-Dimensi Profil Pelajar</label>
          {dims.map(d => (
            <div key={d} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-bold text-slate-800">{d}</span>
              <select
                value={dimScores[d] || 'BSH'}
                onChange={e => setDimScores(prev => ({ ...prev, [d]: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-extrabold bg-white"
              >
                <option value="BB">BB (Belum Berkembang)</option>
                <option value="MB">MB (Mulai Berkembang)</option>
                <option value="BSH">BSH (Berkembang Sesuai Harapan)</option>
                <option value="SAB">SAB (Sangat Berkembang)</option>
              </select>
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Proses & Deskripsi Rapor P5</label>
          <textarea
            rows={3}
            required
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            placeholder="Catatan perkembangan karakter siswa dalam proyek ini..."
          />
        </div>

        <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
          Simpan Evaluasi Kokurikuler (Sinkron ke Rapor)
        </button>
      </form>
    </Modal>
  );
}

export function GuruMyClasses({
  db,
  user,
  activeRole,
  actor,
  selectedTeacherClassId,
  onSelectTeacherClassId,
  selectedSessionId,
  onSelectSessionId,
  autoOpenAddSession,
  onClearAutoOpenAddSession,
  onReload,
  onSaveRecord,
  onDeleteRecord,
  onShowToast,
  onShowLoader,
  onHideLoader,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  actor: ActorInfo;
  selectedTeacherClassId: string | null;
  onSelectTeacherClassId: (id: string | null) => void;
  selectedSessionId: string | null;
  onSelectSessionId: (id: string | null) => void;
  autoOpenAddSession?: boolean;
  onClearAutoOpenAddSession?: () => void;
  onReload: (silent?: boolean) => Promise<void>;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onDeleteRecord: (sheet: string, id: string, msg?: string, skipConfirm?: boolean) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
  onPrintHtml: (html: string) => void;
}) {
  const [tab, setTab] = useState<'intra' | 'ekskul' | 'p5' | 'tambahan'>('intra');
  const [sessionFilter, setSessionFilter] = useState<'ALL' | 'NH' | 'STS' | 'SAS'>('ALL');

  // Session draft state for attendance & grades
  const [attDraft, setAttDraft] = useState<Record<string, { status: string; score: string; predicate: string }>>({});
  const [bulkPred, setBulkPred] = useState('B+');

  // Modals
  const [addSessionOpen, setAddSessionOpen] = useState(false);
  const [mSessType, setMSessType] = useState('NH');
  const [mSessAtp, setMSessAtp] = useState('');
  const [mSessTitle, setMSessTitle] = useState('');
  const [mSessDate, setMSessDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pSessAtp, setPSessAtp] = useState('');
  const [pSessCount, setPSessCount] = useState('3');
  const [pSessInterval, setPSessInterval] = useState('7');
  const [pSessStart, setPSessStart] = useState(() => new Date().toISOString().split('T')[0]);

  const [editSessionOpen, setEditSessionOpen] = useState(false);
  const [eSessType, setESessType] = useState('NH');
  const [eSessAtp, setESessAtp] = useState('');
  const [eSessTitle, setESessTitle] = useState('');
  const [eSessDate, setESessDate] = useState('');

  const [kbmModalSessionId, setKbmModalSessionId] = useState<string | null>(null);
  const [kbmActs, setKbmActs] = useState<string[]>([]);
  const [kbmProb, setKbmProb] = useState('');
  const [kbmSol, setKbmSol] = useState('');

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportFmt, setReportFmt] = useState<'31col' | 'ringkas'>('31col');
  const [reportAttScale, setReportAttScale] = useState<'100' | '5'>('100');

  const [ekModal, setEkModal] = useState<{ open: boolean; id: string; ekskulId: string; fixedStudentId: string }>({
    open: false,
    id: '',
    ekskulId: '',
    fixedStudentId: '',
  });
  const [ekStudentId, setEkStudentId] = useState('');
  const [ekPred, setEkPred] = useState('Baik');
  const [ekNote, setEkNote] = useState('');

  const [p5EvalModal, setP5EvalModal] = useState<{ open: boolean; projectId: string; evalId: string }>({
    open: false,
    projectId: '',
    evalId: '',
  });

  const myTcs = (db.TeacherClasses || []).filter(tc => tc.teacher_id === user.id);
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];
  const activeTc = myTcs.find(t => t.id === selectedTeacherClassId) || myTcs[0] || null;
  const activeClass = activeTc
    ? classes.find(c => c.id === activeTc.class_id) || { id: activeTc.class_id, name: activeTc.class_id, kkm: 75, grade_level: '7' }
    : null;
  const activeSub = activeTc
    ? subjects.find(s => s.id === activeTc.subject_id) || { id: activeTc.subject_id, name: activeTc.subject_id, code: activeTc.subject_id }
    : null;

  let sessions = activeTc
    ? (db.AttendanceSessions || []).filter(s => s.class_id === activeTc.class_id && s.subject_id === activeTc.subject_id)
    : [];
  if (sessionFilter !== 'ALL') sessions = sessions.filter(s => s.session_type === sessionFilter);
  const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;
  const classStudents = activeTc
    ? (db.Students || []).filter(st => st.class_id === activeTc.class_id && st.status === 'Aktif')
    : [];

  useEffect(() => {
    if (autoOpenAddSession && activeTc) {
      setTab('intra');
      setAddSessionOpen(true);
      onClearAutoOpenAddSession?.();
    }
  }, [autoOpenAddSession, activeTc]);

  useEffect(() => {
    if (!selectedSession || !activeClass) {
      setAttDraft({});
      return;
    }
    const allRecords = db.AttendanceRecords || [];
    const next: Record<string, { status: string; score: string; predicate: string }> = {};
    classStudents.forEach(st => {
      const rec = allRecords.find(r => r.session_id === selectedSession.id && r.student_id === st.id);
      const scoreStr = rec && rec.score !== undefined && rec.score !== null ? String(rec.score) : '';
      const predStr = rec?.predicate || scoreToGradeLetter(scoreStr, Number(activeClass.kkm) || 75);
      next[st.id] = {
        status: rec?.status || 'H',
        score: scoreStr,
        predicate: predStr,
      };
    });
    setAttDraft(next);
  }, [selectedSession?.id, db.AttendanceRecords]);

  const toggleNilaiFinal = async (makeFinal: boolean) => {
    if (!activeTc) return;
    const sn = (db.StatusNilai || []).find(x => x.teacher_class_id === activeTc.id);
    await onSaveRecord(
      'StatusNilai',
      {
        id: sn ? sn.id : undefined,
        teacher_class_id: activeTc.id,
        class_id: activeTc.class_id,
        subject_id: activeTc.subject_id,
        status: makeFinal ? 'Final' : 'Belum',
        approved_by: user.id,
        approved_at: new Date().toLocaleString('sv-SE').slice(0, 16),
      },
      makeFinal
        ? 'Nilai disetujui — Wali Kelas melihat mapel ini sudah final.'
        : 'Persetujuan dibatalkan — Wali Kelas melihat nilai belum selesai.'
    );
  };

  const handleSaveCurrentSessionRecords = async () => {
    if (!selectedSession) return;
    const payload = classStudents.map(st => {
      const row = attDraft[st.id] || { status: 'H', score: '', predicate: '-' };
      return {
        student_id: st.id,
        status: row.status || 'H',
        score: row.score === '' ? '' : Number(row.score),
        predicate: row.predicate === '-' ? '' : row.predicate,
        note: '',
      };
    });
    onShowLoader('Menyimpan nilai & presensi...');
    try {
      await saveSessionAttendanceBatchApi(selectedSession.id, payload, actor);
      await onReload(true);
      onShowToast('Absensi & Nilai sesi berhasil disimpan!', 'success');
    } catch (e: any) {
      onShowToast(e.message, 'error');
    } finally {
      onHideLoader();
    }
  };

  const atpsForClass =
    activeClass && activeTc
      ? (db.CpAtp_Prota || []).filter(
          a => a.subject_id === activeTc.subject_id && String(a.grade_level) === String(activeClass.grade_level)
        )
      : [];

  const handleSubmitManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTc) return;
    const atpObj = (db.CpAtp_Prota || []).find(a => a.id === mSessAtp);
    const rec = await onSaveRecord(
      'AttendanceSessions',
      {
        teacher_class_id: activeTc.id,
        class_id: activeTc.class_id,
        subject_id: activeTc.subject_id,
        teacher_id: user.id,
        session_type: mSessType,
        atp_id: mSessAtp,
        atp_code: atpObj ? atpObj.atp_code : '',
        title: mSessTitle,
        session_date: mSessDate,
      },
      'Sesi pertemuan berhasil ditambahkan!'
    );
    if (rec?.id) onSelectSessionId(rec.id);
    setMSessTitle('');
    setAddSessionOpen(false);
  };

  const handleSubmitAutoProtaSessions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTc) return;
    const atpObj = (db.CpAtp_Prota || []).find(a => a.id === pSessAtp);
    if (!atpObj) return;
    onShowLoader('Men-generate sesi pertemuan dari Prota...');
    try {
      await createSessionsFromProtaApi(
        {
          teacher_class_id: activeTc.id,
          class_id: activeTc.class_id,
          subject_id: activeTc.subject_id,
          teacher_id: user.id,
          session_type: 'NH',
          atp_id: atpObj.id,
          atp_code: atpObj.atp_code,
          title_prefix: atpObj.scope_material,
          meeting_count: pSessCount,
          interval_days: pSessInterval,
          start_date: pSessStart,
        },
        actor
      );
      await onReload(true);
      onShowToast('Sesi pertemuan otomatis dari Prota berhasil dibuat!', 'success');
      setAddSessionOpen(false);
    } catch (err: any) {
      onShowToast(err.message, 'error');
    } finally {
      onHideLoader();
    }
  };

  const openEditSession = (sess: GenericRow) => {
    setESessType(String(sess.session_type || 'NH'));
    setESessAtp(String(sess.atp_id || ''));
    setESessTitle(String(sess.title || ''));
    setESessDate(String(sess.session_date || new Date().toISOString().split('T')[0]));
    setEditSessionOpen(true);
  };

  const handleSubmitEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;
    const atpObj = (db.CpAtp_Prota || []).find(a => a.id === eSessAtp);
    await onSaveRecord(
      'AttendanceSessions',
      {
        ...selectedSession,
        session_type: eSessType,
        atp_id: eSessAtp,
        atp_code: atpObj ? atpObj.atp_code : selectedSession.atp_code || '',
        title: eSessTitle,
        session_date: eSessDate,
      },
      'Nama dan detail sesi berhasil diperbarui!'
    );
    setEditSessionOpen(false);
  };

  const openKbmNotes = (sess: GenericRow) => {
    setKbmModalSessionId(sess.id);
    setKbmActs(
      String(sess.kbm_activities || '')
        .split(',')
        .map(x => x.trim())
        .filter(Boolean)
    );
    setKbmProb(String(sess.kbm_problems || ''));
    setKbmSol(String(sess.kbm_solutions || ''));
  };

  const saveKbmNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    const sess = (db.AttendanceSessions || []).find(s => s.id === kbmModalSessionId);
    if (!sess) return;
    await onSaveRecord(
      'AttendanceSessions',
      {
        ...sess,
        kbm_activities: kbmActs.join(', '),
        kbm_problems: kbmProb,
        kbm_solutions: kbmSol,
      },
      'Catatan pembelajaran disimpan & siap ditarik di Jurnal Mengajar!'
    );
    setKbmModalSessionId(null);
  };

  // Report table builder
  const buildReportData = () => {
    if (!activeClass || !activeSub) return { headers: [] as string[], rows: [] as (string | number)[][] };
    const attitudes = (db.AttitudeRatings || []).filter(
      a => a.class_id === activeClass.id && a.subject_id === activeSub.id
    );
    const nhCols = Array.from({ length: 15 }, (_, i) => `NH${i + 1}`);
    const headers =
      reportFmt === '31col'
        ? ['No', 'NIS', 'Nama Siswa', 'L/P', ...nhCols, 'Rerata NH', 'STS', 'SAS', 'Nilai Akhir', 'Predikat', 'Sikap', 'Ketuntasan', 'Pelanggaran', 'Prestasi Siswa', 'Deskripsi Capaian TP']
        : ['No', 'NIS', 'Nama Siswa', 'Rerata NH', 'STS', 'SAS', 'Nilai Akhir', 'Predikat', 'Sikap', 'Ketuntasan', 'Pelanggaran', 'Prestasi Siswa', 'Deskripsi Capaian Kompetensi'];

    const rows = classStudents.map((st, idx) => {
      const rep = getStudentSubjectReport(db, st.id, activeClass.id, activeSub.id);
      const stAtt = attitudes.filter(a => a.student_id === st.id);
      const avgAtt5 = stAtt.length ? stAtt.reduce((a, b) => a + Number(b.score || 4), 0) / stAtt.length : 4.5;
      const attDisplay = reportAttScale === '100' ? Math.round(avgAtt5 * 20) : avgAtt5.toFixed(1);
      const statusTuntas = rep.finalScore !== null ? (rep.finalScore >= Number(activeClass.kkm) ? 'Tuntas' : 'Belum Tuntas') : '-';
      const vText = studentViolationText(db, st.id);
      const pText = studentAchievementText(db, st.id);
      if (reportFmt === '31col') {
        const nhCells = Array.from({ length: 15 }, (_, i) => (rep.nhScores[i] !== undefined ? rep.nhScores[i] : '-'));
        return [
          idx + 1,
          st.nis,
          st.full_name,
          st.gender,
          ...nhCells,
          rep.avgNH ?? '-',
          rep.avgSTS ?? '-',
          rep.avgSAS ?? '-',
          rep.finalScore ?? '-',
          rep.predicate,
          attDisplay,
          statusTuntas,
          vText,
          pText,
          rep.description,
        ];
      }
      return [
        idx + 1,
        st.nis,
        st.full_name,
        rep.avgNH ?? '-',
        rep.avgSTS ?? '-',
        rep.avgSAS ?? '-',
        rep.finalScore ?? '-',
        rep.predicate,
        attDisplay,
        statusTuntas,
        vText,
        pText,
        rep.description,
      ];
    });
    return { headers, rows };
  };

  const renderEkskulTab = () => {
    const myEkskuls = (db.Ekstrakurikuler || []).filter(e => e.coach_id === user.id || activeRole === 'admin');
    const students = db.Students || [];
    const assessments = db.EkskulAssessments || [];
    if (!myEkskuls.length) {
      return (
        <div className="p-6 bg-white rounded-2xl border text-sm text-slate-500">
          Anda tidak terdaftar sebagai Pembina Ekstrakurikuler.
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {myEkskuls.map(eks => {
          const members = assessments.filter(a => a.ekskul_id === eks.id);
          return (
            <div key={eks.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">{eks.name}</h3>
                  <p className="text-xs text-slate-500">
                    Jadwal: {eks.schedule} • Peserta: {members.length} Siswa
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEkModal({ open: true, id: '', ekskulId: eks.id, fixedStudentId: '' });
                    setEkStudentId(students[0]?.id || '');
                    setEkPred('Baik');
                    setEkNote('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold"
                >
                  + Tambah / Nilai Anggota
                </button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Predikat</th>
                      <th className="p-2.5">Pelanggaran</th>
                      <th className="p-2.5">Prestasi Siswa</th>
                      <th className="p-2.5">Catatan Pembina</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {members.map(m => {
                      const st = students.find(s => s.id === m.student_id) || { full_name: m.student_id };
                      return (
                        <tr key={m.id}>
                          <td className="p-2.5 font-bold">{st.full_name}</td>
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">{m.predicate}</span>
                          </td>
                          <td className="p-2.5">
                            <StudentViolationCell db={db} studentId={m.student_id} compact />
                          </td>
                          <td className="p-2.5">
                            <StudentAchievementCell db={db} studentId={m.student_id} compact />
                          </td>
                          <td className="p-2.5">{m.note || '-'}</td>
                          <td className="p-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEkModal({ open: true, id: m.id, ekskulId: m.ekskul_id, fixedStudentId: m.student_id });
                                setEkPred(m.predicate || 'Baik');
                                setEkNote(m.note || '');
                              }}
                              className="text-indigo-600 font-bold hover:underline"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderP5Tab = () => {
    const projects = (db.KokurikulerProjects || []).filter(
      p => p.coordinator_id === user.id || String(p.facilitator_ids || '').includes(user.id)
    );
    const evals = db.KokurikulerEvaluations || [];
    const students = db.Students || [];
    if (!projects.length) {
      return (
        <div className="p-6 bg-white rounded-2xl border text-sm text-slate-500">
          Anda belum ditugaskan sebagai Koordinator atau Fasilitator Proyek P5.
        </div>
      );
    }
    return (
      <div className="space-y-5">
        {projects.map(prj => {
          const pEvals = evals.filter(ev => ev.project_id === prj.id);
          return (
            <div key={prj.id} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="px-2.5 py-0.5 rounded-md bg-cyan-100 text-cyan-800 text-xs font-bold">{prj.theme}</span>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1">{prj.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dimensi: <strong>{prj.dimensions}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setP5EvalModal({ open: true, projectId: prj.id, evalId: '' })}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                >
                  + Input Evaluasi P5 Siswa
                </button>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-800 text-white">
                    <tr>
                      <th className="p-2.5">Siswa</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">Pelanggaran</th>
                      <th className="p-2.5">Prestasi Siswa</th>
                      <th className="p-2.5">Capaian Per Dimensi</th>
                      <th className="p-2.5">Catatan Proses</th>
                      <th className="p-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pEvals.map(ev => {
                      const st = students.find(s => s.id === ev.student_id) || { full_name: ev.student_id };
                      const cls = classes.find(c => c.id === ev.class_id) || { name: ev.class_id };
                      let dimObj: Record<string, string> = {};
                      try {
                        dimObj = JSON.parse(ev.dimension_scores || '{}');
                      } catch {
                        dimObj = {};
                      }
                      return (
                        <tr key={ev.id}>
                          <td className="p-2.5 font-bold">{st.full_name}</td>
                          <td className="p-2.5">{cls.name}</td>
                          <td className="p-2.5">
                            <StudentViolationCell db={db} studentId={ev.student_id} compact />
                          </td>
                          <td className="p-2.5">
                            <StudentAchievementCell db={db} studentId={ev.student_id} compact />
                          </td>
                          <td className="p-2.5">
                            {Object.entries(dimObj).length > 0
                              ? Object.entries(dimObj).map(([k, v]) => (
                                  <span key={k} className="inline-block mr-1 mb-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold">
                                    {k}: {v}
                                  </span>
                                ))
                              : ev.final_predicate}
                          </td>
                          <td className="p-2.5">{ev.note || '-'}</td>
                          <td className="p-2.5 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => setP5EvalModal({ open: true, projectId: prj.id, evalId: ev.id })}
                              className="text-indigo-600 font-bold"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteRecord('KokurikulerEvaluations', ev.id)}
                              className="text-rose-600 font-bold"
                            >
                              Hapus
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTambahanTab = () => {
    const list = (db.AdditionalAssignments || []).filter(
      a => a.pj_id === user.id || String(a.member_ids || '').includes(user.id)
    );
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-base mb-4">Daftar Kepanitiaan & Penugasan Tambahan Anda</h3>
        {list.length === 0 ? (
          <p className="text-xs text-slate-500">Belum ada penugasan tambahan yang tercatat.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">{a.category}</span>
                <h4 className="font-bold text-slate-900 text-sm mt-2">{a.title}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  SK: {a.sk_number || '-'} • {a.start_date} s.d. {a.end_date}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const { headers: repHeaders, rows: repRows } = reportModalOpen ? buildReportData() : { headers: [], rows: [] };
  const kkmNum = activeClass ? Number(activeClass.kkm) || 75 : 75;
  const fin = activeTc ? isNilaiFinal(db, activeTc.id) : false;

  const isFocusedSession = tab === 'intra' && !!selectedSession && !!activeClass && !!activeSub;

  return (
    <div className="space-y-5">
      {!isFocusedSession && (
        <>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Kelas Saya (4 Pilar Pembelajaran)</h2>
            <p className="text-xs text-slate-500">Kelola Intrakurikuler, Ekstrakurikuler, Kokurikuler (P5), dan Penugasan Tambahan</p>
          </div>

          {/* 4 TAB PILAR */}
          <div className="flex overflow-x-auto gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
            {[
              { id: 'intra' as const, label: '1. Intrakurikuler', Icon: BookOpen },
              { id: 'ekskul' as const, label: '2. Ekstrakurikuler', Icon: Trophy },
              { id: 'p5' as const, label: '3. Kokurikuler (P5)', Icon: Compass },
              { id: 'tambahan' as const, label: '4. Penugasan Tambahan', Icon: Award },
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 whitespace-nowrap transition ${
                  tab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <t.Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'intra' && (
        <>
          {myTcs.length === 0 ? (
            <div className="p-8 bg-white rounded-2xl border text-center text-sm text-slate-500">
              Anda belum memiliki penugasan mengajar intrakurikuler. Hubungi Admin/Waka Kurikulum.
            </div>
          ) : isFocusedSession && selectedSession && activeClass && activeSub ? (
            <div className="space-y-4">
              {/* Dedicated Focus Header */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectSessionId(null)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-extrabold flex items-center gap-1.5 transition"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Daftar Sesi</span>
                  </button>
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800">Kelas {activeClass.name}</span>
                    <span> • {activeSub.name}</span>
                    <span className="ml-2 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 tabular-nums">
                      KKM {kkmNum}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(true)}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Rekap Nilai Mapel</span>
                  </button>
                </div>
              </div>

              {/* Dedicated Full-Width Session Workspace */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-5 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-600 text-white text-xs font-extrabold">
                        {selectedSession.session_type}
                      </span>
                      <h2 className="font-extrabold text-slate-900 text-lg">{selectedSession.title}</h2>
                      <button
                        type="button"
                        onClick={() => openEditSession(selectedSession)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold inline-flex items-center gap-1"
                        title="Edit Nama / Detail Sesi"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Edit Sesi</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2.5 text-xs text-slate-600">
                      <label className="flex items-center gap-1.5 font-semibold">
                        <span>Tanggal Pertemuan:</span>
                        <input
                          type="date"
                          value={selectedSession.session_date}
                          onChange={e =>
                            onSaveRecord(
                              'AttendanceSessions',
                              { ...selectedSession, session_date: e.target.value },
                              'Tanggal sesi diperbarui!'
                            )
                          }
                          className="px-2 py-1 rounded-lg border border-slate-300 text-xs font-bold text-slate-800 tabular-nums"
                        />
                      </label>
                      {selectedSession.atp_code && (
                        <span className="px-2 py-1 rounded-lg bg-teal-50 text-teal-800 font-bold">
                          ATP: {selectedSession.atp_code}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditSession(selectedSession)}
                      className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit Nama Sesi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openKbmNotes(selectedSession)}
                      className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5"
                    >
                      <ClipboardEdit className="w-4 h-4" />
                      <span>Catatan Pembelajaran Kelas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteRecord('AttendanceSessions', selectedSession.id, 'Sesi pertemuan dihapus.', true);
                        onSelectSessionId(null);
                      }}
                      className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setAttDraft(prev => {
                        const next = { ...prev };
                        classStudents.forEach(s => {
                          next[s.id] = { ...(next[s.id] || { score: '', predicate: '-' }), status: 'H' };
                        });
                        return next;
                      });
                      onShowToast('Seluruh siswa ditandai Hadir (H). Jangan lupa klik Simpan.', 'info');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 w-fit"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Set Hadir Semua (H)</span>
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">Isi Nilai Massal Predikat:</span>
                    <select
                      value={bulkPred}
                      onChange={e => setBulkPred(e.target.value)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold bg-white"
                    >
                      <option value="A+">A+ (98)</option>
                      <option value="A">A (94)</option>
                      <option value="A-">A- (90)</option>
                      <option value="B+">B+ ({predicateToScoreByKkm('B+', kkmNum)})</option>
                      <option value="B">B ({predicateToScoreByKkm('B', kkmNum)})</option>
                      <option value="B-">B- (KKM {kkmNum})</option>
                      <option value="C+">C+ ({predicateToScoreByKkm('C+', kkmNum)})</option>
                      <option value="C">C (64)</option>
                      <option value="D">D (55)</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const sc = String(predicateToScoreByKkm(bulkPred, kkmNum));
                        setAttDraft(prev => {
                          const next = { ...prev };
                          classStudents.forEach(s => {
                            next[s.id] = { ...(next[s.id] || { status: 'H' }), score: sc, predicate: bulkPred };
                          });
                          return next;
                        });
                        onShowToast(`Predikat ${bulkPred} (Nilai ${sc}) diterapkan ke seluruh siswa.`, 'info');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                    >
                      Terapkan ke Semua
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-800 text-white text-xs">
                      <tr>
                        <th className="p-3 w-10">No</th>
                        <th className="p-3">Nama Peserta Didik</th>
                        <th className="p-3">Pelanggaran</th>
                        <th className="p-3">Prestasi Siswa</th>
                        <th className="p-3 text-center">Kehadiran (H/S/I/A)</th>
                        <th className="p-3 w-24 text-center">Nilai (0-100)</th>
                        <th className="p-3 w-28 text-center">Predikat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {classStudents.map((st, idx) => {
                        const cur = attDraft[st.id] || { status: 'H', score: '', predicate: '-' };
                        return (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="p-3 text-xs font-bold text-slate-500 tabular-nums">{idx + 1}</td>
                            <td className="p-3">
                              <p className="font-bold text-slate-800 text-xs sm:text-sm">{st.full_name}</p>
                              <p className="text-[11px] text-slate-400 tabular-nums">NIS: {st.nis}</p>
                            </td>
                            <td className="p-3">
                              <StudentViolationCell db={db} studentId={st.id} compact />
                            </td>
                            <td className="p-3">
                              <StudentAchievementCell db={db} studentId={st.id} compact />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                {['H', 'S', 'I', 'A'].map(code => (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() =>
                                      setAttDraft(prev => ({
                                        ...prev,
                                        [st.id]: { ...cur, status: code },
                                      }))
                                    }
                                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold border transition ${
                                      cur.status === code
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                                    }`}
                                  >
                                    {code}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={cur.score}
                                onChange={e => {
                                  const v = e.target.value;
                                  setAttDraft(prev => ({
                                    ...prev,
                                    [st.id]: {
                                      ...cur,
                                      score: v,
                                      predicate: scoreToGradeLetter(v, kkmNum),
                                    },
                                  }));
                                }}
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-center font-bold text-sm tabular-nums focus:ring-2 focus:ring-indigo-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <select
                                value={cur.predicate}
                                onChange={e => {
                                  const pred = e.target.value;
                                  setAttDraft(prev => ({
                                    ...prev,
                                    [st.id]: {
                                      ...cur,
                                      predicate: pred,
                                      score: pred === '-' ? '' : String(predicateToScoreByKkm(pred, kkmNum)),
                                    },
                                  }));
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs font-extrabold bg-slate-50"
                              >
                                <option value="-">-</option>
                                {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D'].map(p => (
                                  <option key={p} value={p}>
                                    {p}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => onSelectSessionId(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Kembali ke Daftar Sesi</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveCurrentSessionRecords}
                    className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Absensi & Nilai Sesi Ini</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            activeTc &&
            activeClass &&
            activeSub && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Pilih Kelas & Mapel:</span>
                    <select
                      value={activeTc.id}
                      onChange={e => {
                        onSelectTeacherClassId(e.target.value);
                        onSelectSessionId(null);
                      }}
                      className="px-3.5 py-2 rounded-xl border border-slate-300 font-bold text-sm text-slate-800 bg-slate-50"
                    >
                      {myTcs.map(tc => {
                        const c = classes.find(x => x.id === tc.class_id) || { name: tc.class_id };
                        const s = subjects.find(x => x.id === tc.subject_id) || { name: tc.subject_id };
                        return (
                          <option key={tc.id} value={tc.id}>
                            Kelas {c.name} — {s.name}
                          </option>
                        );
                      })}
                    </select>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200 tabular-nums">
                      KKM: {kkmNum}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 items-center">
                    {fin ? (
                      <>
                        <span className="px-3 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Nilai Final</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleNilaiFinal(false)}
                          className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold"
                        >
                          Batalkan Persetujuan
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleNilaiFinal(true)}
                        title="Beritahu Wali Kelas bahwa seluruh nilai mapel ini selesai diinput"
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Setujui Nilai (Selesai)</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setReportModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Rekap & Cetak Nilai Resmi</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAddSessionOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Sesi Pertemuan</span>
                    </button>
                  </div>
                </div>

                {/* DAFTAR SESI PERTEMUAN */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-800 text-base tabular-nums">
                        Daftar Sesi Pertemuan ({sessions.length})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pilih salah satu sesi untuk membuka lembar presensi, input nilai, &amp; catatan pembelajaran di halaman fokus.
                      </p>
                    </div>
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-lg text-xs font-bold">
                      {(['ALL', 'NH', 'STS', 'SAS'] as const).map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSessionFilter(f)}
                          className={`px-3 py-1 rounded-md ${
                            sessionFilter === f ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          {f === 'ALL' ? 'Semua' : f}
                        </button>
                      ))}
                    </div>
                  </div>

                  {sessions.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
                      <MousePointerClick className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">
                        Belum ada sesi pertemuan. Klik &quot;+ Tambah Sesi Pertemuan&quot;.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {sessions.map(s => {
                        const typeColors: Record<string, string> = {
                          NH: 'bg-teal-100 text-teal-800',
                          STS: 'bg-amber-100 text-amber-800',
                          SAS: 'bg-rose-100 text-rose-800',
                        };
                        return (
                          <div
                            key={s.id}
                            onClick={() => onSelectSessionId(s.id)}
                            className="cursor-pointer p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50/40 transition flex flex-col justify-between gap-2 bg-slate-50/60"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                    typeColors[s.session_type] || 'bg-slate-200'
                                  }`}
                                >
                                  {s.session_type}
                                </span>
                                <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{s.session_date}</span>
                              </div>
                              <p className="font-bold text-slate-800 text-sm mt-2">{s.title}</p>
                              {s.atp_code && <p className="text-[11px] text-indigo-600 font-semibold mt-1">ATP: {s.atp_code}</p>}
                            </div>
                            <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[11px] font-bold text-indigo-700">
                              <span>Buka Sesi Pertemuan →</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )
          )}
        </>
      )}

      {tab === 'ekskul' && renderEkskulTab()}
      {tab === 'p5' && renderP5Tab()}
      {tab === 'tambahan' && renderTambahanTab()}

      {/* MODAL TAMBAH SESI */}
      <Modal
        open={addSessionOpen}
        title="Tambah Sesi Pertemuan & Penilaian"
        onClose={() => setAddSessionOpen(false)}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900">
            Anda dapat menambahkan <strong>1 Sesi Manual</strong> maupun men-generate <strong>Banyak Sesi Otomatis dari Prota</strong> berdasarkan jumlah pertemuan pada materi Prota.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form onSubmit={handleSubmitManualSession} className="p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-slate-800 text-sm">Opsi A: Tambah Sesi Manual</h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Jenis Asesmen / Sesi</label>
                <select
                  value={mSessType}
                  onChange={e => setMSessType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
                >
                  <option value="NH">NH (Nilai Harian / Formatif)</option>
                  <option value="STS">STS (Sumatif Tengah Semester)</option>
                  <option value="SAS">SAS (Sumatif Akhir Semester)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tautkan Alur Tujuan Pembelajaran (ATP)</label>
                <select
                  value={mSessAtp}
                  onChange={e => setMSessAtp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                >
                  <option value="">-- Pilih ATP dari Prota --</option>
                  {atpsForClass.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.atp_code} — {shortenTpText(a.tp_text, 55)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Judul Pertemuan / Penilaian</label>
                <input
                  required
                  value={mSessTitle}
                  onChange={e => setMSessTitle(e.target.value)}
                  placeholder="Contoh: NH 3: Kalor & Perpindahannya"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Pertemuan</label>
                <input
                  type="date"
                  required
                  value={mSessDate}
                  onChange={e => setMSessDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs">
                Simpan Sesi Manual
              </button>
            </form>

            <form onSubmit={handleSubmitAutoProtaSessions} className="p-4 rounded-2xl border border-teal-200 bg-teal-50/30 space-y-3">
              <h4 className="font-extrabold text-teal-900 text-sm">Opsi B: Generate Otomatis dari Prota</h4>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Pilih Lingkup Materi / ATP Prota</label>
                <select
                  required
                  value={pSessAtp}
                  onChange={e => {
                    const id = e.target.value;
                    setPSessAtp(id);
                    const found = atpsForClass.find(a => a.id === id);
                    if (found) setPSessCount(String(found.meeting_count || 2));
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                >
                  <option value="">-- Pilih Materi Prota --</option>
                  {atpsForClass.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.atp_code}: {a.scope_material} ({a.meeting_count || 2} Pertemuan)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Jumlah Pertemuan</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={pSessCount}
                    onChange={e => setPSessCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Interval Hari</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={pSessInterval}
                    onChange={e => setPSessInterval(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal Mulai Pertemuan 1</label>
                <input
                  type="date"
                  required
                  value={pSessStart}
                  onChange={e => setPSessStart(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs">
                Generate Sesi Otomatis
              </button>
            </form>
          </div>
        </div>
      </Modal>

      {/* MODAL EDIT SESI PERTEMUAN */}
      <Modal
        open={editSessionOpen}
        title="Edit Nama & Detail Sesi Pertemuan"
        onClose={() => setEditSessionOpen(false)}
      >
        <form onSubmit={handleSubmitEditSession} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1">Jenis Sesi</label>
            <select
              value={eSessType}
              onChange={e => setESessType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
            >
              <option value="NH">NH (Nilai Harian / Formatif)</option>
              <option value="STS">STS (Sumatif Tengah Semester)</option>
              <option value="SAS">SAS (Sumatif Akhir Semester)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Kaitkan dengan ATP / Lingkup Materi</label>
            <select
              value={eSessAtp}
              onChange={e => setESessAtp(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option value="">-- Tidak dikaitkan --</option>
              {atpsForClass.map(a => (
                <option key={a.id} value={a.id}>
                  {a.atp_code} — {a.scope_material}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Nama / Judul Sesi / Bab Materi</label>
            <input
              type="text"
              required
              value={eSessTitle}
              onChange={e => setESessTitle(e.target.value)}
              placeholder="Contoh: Pertemuan 1 - Bilangan Bulat"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1">Tanggal Pertemuan</label>
            <input
              type="date"
              required
              value={eSessDate}
              onChange={e => setESessDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
          >
            Simpan Perubahan Sesi
          </button>
        </form>
      </Modal>

      {/* MODAL CATATAN KBM */}
      <Modal
        open={!!kbmModalSessionId}
        title={`Catatan Pembelajaran Kelas — ${selectedSession?.title || ''}`}
        onClose={() => setKbmModalSessionId(null)}
      >
        <form onSubmit={saveKbmNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">Aktivitas Pembelajaran (Pilih Cepat)</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {['Ceramah Interaktif', 'Diskusi Kelompok', 'Presentasi', 'Penugasan', 'Asesmen Formatif', 'Praktik/Demonstrasi'].map(
                act => (
                  <label
                    key={act}
                    className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={kbmActs.includes(act)}
                      onChange={e =>
                        setKbmActs(prev => (e.target.checked ? [...prev, act] : prev.filter(x => x !== act)))
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>{act}</span>
                  </label>
                )
              )}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Permasalahan dalam KBM</label>
            <textarea
              rows={2}
              value={kbmProb}
              onChange={e => setKbmProb(e.target.value)}
              placeholder="Catat kendala pemahaman siswa atau sarana..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Solusi & Tindak Lanjut</label>
            <textarea
              rows={2}
              value={kbmSol}
              onChange={e => setKbmSol(e.target.value)}
              placeholder="Langkah remedial / pengayaan yang dilakukan..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs">
            Simpan Catatan Pembelajaran (Tersinkron ke Jurnal)
          </button>
        </form>
      </Modal>

      {/* MODAL REKAP & CETAK NILAI RESMI */}
      <Modal
        open={reportModalOpen}
        title={`Daftar Nilai Resmi — Kelas ${activeClass?.name || ''} (${activeSub?.name || ''})`}
        onClose={() => setReportModalOpen(false)}
        maxWidthClass="max-w-6xl"
      >
        {activeClass && activeSub && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={reportFmt}
                  onChange={e => setReportFmt(e.target.value as '31col' | 'ringkas')}
                  className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-white"
                >
                  <option value="31col">Format Lengkap (31 Kolom)</option>
                  <option value="ringkas">Format Ringkas</option>
                </select>
                <select
                  value={reportAttScale}
                  onChange={e => setReportAttScale(e.target.value as '100' | '5')}
                  className="px-3 py-1.5 rounded-lg border text-xs font-bold bg-white"
                >
                  <option value="100">Sikap Skala 100</option>
                  <option value="5">Sikap Skala 1-5</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await copyTableTsv([repHeaders, ...repRows]);
                    onShowToast(ok ? 'Tabel disalin ke clipboard (TSV)!' : 'Gagal menyalin TSV.', ok ? 'success' : 'error');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                >
                  Salin TSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    exportTableToExcel(
                      [repHeaders, ...repRows],
                      `Nilai_${activeClass.name}`,
                      `Daftar_Nilai_${activeClass.name}_${activeSub.code || activeSub.name}.xlsx`
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Download .xlsx
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idn = getSchoolIdentity(db);
                    const html = `
                      ${renderOfficialLetterheadHtml(idn)}
                      <h3 style="text-align:center;font-weight:bold;margin:10px 0;">DAFTAR NILAI HASIL BELAJAR PESERTA DIDIK</h3>
                      <p style="font-size:10pt;margin-bottom:8px;">Mata Pelajaran: <strong>${siEsc(activeSub.name)}</strong> | Kelas: <strong>${siEsc(activeClass.name)}</strong> | KKM: <strong>${siEsc(activeClass.kkm)}</strong></p>
                      <table>
                        <thead><tr>${repHeaders.map(h => `<th>${siEsc(h)}</th>`).join('')}</tr></thead>
                        <tbody>${repRows.map(r => `<tr>${r.map(c => `<td>${siEsc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
                      </table>
                      ${renderSignatureBlockHtml(db, 'Guru Mata Pelajaran', user.full_name, user.nip)}
                    `;
                    onPrintHtml(html);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
                >
                  Cetak / PDF
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-slate-800 text-white">
                  <tr>
                    {repHeaders.map(h => (
                      <th key={h} className="p-2 border border-slate-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {repRows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td
                          key={ci}
                          className={`p-2 border border-slate-200 ${ci === 2 ? 'font-bold whitespace-nowrap' : 'tabular-nums'}`}
                        >
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL EKSKUL PENILAIAN */}
      <Modal
        open={ekModal.open}
        title={ekModal.id ? 'Edit Penilaian Ekstrakurikuler' : 'Input Penilaian Ekstrakurikuler'}
        onClose={() => setEkModal(p => ({ ...p, open: false }))}
      >
        <form
          onSubmit={async e => {
            e.preventDefault();
            await onSaveRecord(
              'EkskulAssessments',
              {
                id: ekModal.id || '',
                ekskul_id: ekModal.ekskulId,
                student_id: ekModal.fixedStudentId || ekStudentId,
                predicate: ekPred,
                note: ekNote,
                semester: getSettingVal(db, 'active_semester', 'Ganjil'),
              },
              'Penilaian ekstrakurikuler tersimpan!'
            );
            setEkModal(p => ({ ...p, open: false }));
          }}
          className="space-y-3 text-xs"
        >
          {!ekModal.id && (
            <div>
              <label className="block font-bold mb-1">Pilih Siswa</label>
              <select
                required
                value={ekStudentId}
                onChange={e => setEkStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border bg-white"
              >
                {(db.Students || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.full_name} ({s.class_id})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block font-bold mb-1">Predikat</label>
            <select
              value={ekPred}
              onChange={e => setEkPred(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border font-bold bg-white"
            >
              <option value="Sangat Baik">Sangat Baik</option>
              <option value="Baik">Baik</option>
              <option value="Cukup">Cukup</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Catatan Pembina</label>
            <textarea
              rows={3}
              value={ekNote}
              onChange={e => setEkNote(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border"
              placeholder="Deskripsi keaktifan & capaian siswa..."
            />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold">
            {ekModal.id ? 'Perbarui Nilai' : 'Simpan Penilaian Ekskul'}
          </button>
        </form>
      </Modal>

      <P5EvaluationModal
        open={p5EvalModal.open}
        projectId={p5EvalModal.projectId}
        evalId={p5EvalModal.evalId}
        db={db}
        user={user}
        onClose={() => setP5EvalModal(p => ({ ...p, open: false }))}
        onSaveRecord={onSaveRecord}
      />
    </div>
  );
}

export function CpAtpProtaModule({
  db,
  user,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
  onShowToast,
  onConvertProtaToSession,
}: {
  db: DatabasePayload;
  user: UserPublic;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onConvertProtaToSession: (protaId: string) => void;
}) {
  const [subFilter, setSubFilter] = useState('ALL');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);
  const [autoOpen, setAutoOpen] = useState(false);

  const subjects = db.Subjects || [];
  const allProta = db.CpAtp_Prota || [];
  const sessions = db.AttendanceSessions || [];
  const idn = getSchoolIdentity(db);

  const [prSub, setPrSub] = useState(subjects[0]?.id || '');
  const [prGrade, setPrGrade] = useState('7');
  const [prElem, setPrElem] = useState('');
  const [prCode, setPrCode] = useState('');
  const [prTp, setPrTp] = useState('');
  const [prScope, setPrScope] = useState('');
  const [prSem, setPrSem] = useState('Ganjil');
  const [prJp, setPrJp] = useState('12');
  const [prMeet, setPrMeet] = useState('3');
  const [prWeek, setPrWeek] = useState('');

  const [apSub, setApSub] = useState(subjects[0]?.id || '');
  const [apGrade, setApGrade] = useState('7');
  const [apJpWeek, setApJpWeek] = useState('4');
  const [apWeeks, setApWeeks] = useState('18');

  const filtered = allProta.filter(
    p => (subFilter === 'ALL' || p.subject_id === subFilter) && (gradeFilter === 'ALL' || String(p.grade_level) === gradeFilter)
  );

  const totalTargetMeetings = filtered.reduce((acc, p) => acc + (Number(p.meeting_count) || 1), 0);
  const taughtMeetings = filtered.reduce((acc, p) => {
    const linked = sessions.filter(s => s.atp_id === p.id || s.atp_code === p.atp_code).length;
    return acc + Math.min(Number(p.meeting_count) || 1, linked);
  }, 0);
  const progressPct = totalTargetMeetings > 0 ? Math.round((taughtMeetings / totalTargetMeetings) * 100) : 0;

  const handleSaveProta = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'CpAtp_Prota',
      {
        subject_id: prSub,
        grade_level: prGrade,
        phase: 'D',
        element: prElem,
        atp_code: prCode,
        tp_text: prTp,
        scope_material: prScope,
        semester: prSem,
        jp_allocation: Number(prJp),
        meeting_count: Number(prMeet),
        week_number: prWeek,
      },
      'Data CP & ATP berhasil ditambahkan!'
    );
    setPrElem('');
    setPrCode('');
    setPrTp('');
    setPrScope('');
    setAddOpen(false);
  };

  const handleRunAutoProta = async (e: React.FormEvent) => {
    e.preventDefault();
    const sub = subjects.find(s => s.id === apSub) || { code: 'MAPEL', name: 'Mata Pelajaran' };
    const jpWeek = Number(apJpWeek) || 4;
    const effWeeks = Number(apWeeks) || 18;
    const unitWeeks = Math.max(3, Math.floor(effWeeks / 3));
    const sem = getSettingVal(db, 'active_semester', 'Ganjil');
    for (let i = 1; i <= 3; i++) {
      const startW = (i - 1) * unitWeeks + 1;
      const endW = Math.min(effWeeks, i * unitWeeks);
      await onSaveRecord(
        'CpAtp_Prota',
        {
          subject_id: apSub,
          grade_level: apGrade,
          phase: 'D',
          element: `Elemen ${i} (${sub.name})`,
          atp_code: `${sub.code || 'MP'}.${apGrade}.${Date.now().toString().slice(-2)}${i}`,
          tp_text: `Menganalisis dan menerapkan konsep utama unit ${i} pada mata pelajaran ${sub.name} kelas ${apGrade} secara kontekstual.`,
          scope_material: `Unit Materi ${i} — ${sub.name}`,
          semester: sem,
          jp_allocation: unitWeeks * jpWeek,
          meeting_count: unitWeeks,
          week_number: `${startW}-${endW}`,
        },
        i === 3 ? '3 Unit Prota otomatis berhasil disusun!' : ''
      );
    }
    setAutoOpen(false);
  };

  const columns: ColumnDef[] = [
    { key: 'grade_level', label: 'Fase/Kls', render: p => <span className="font-bold">{p.phase || 'D'} / Kls {p.grade_level}</span>, textValue: p => `${p.phase || 'D'} / Kls ${p.grade_level}` },
    { key: 'element', label: 'Elemen' },
    { key: 'atp_code', label: 'Kode ATP', render: p => <span className="font-extrabold text-indigo-700">{p.atp_code}</span> },
    { key: 'tp_text', label: 'Tujuan Pembelajaran (TP)', render: p => <span className="block max-w-xs">{p.tp_text}</span> },
    { key: 'scope_material', label: 'Lingkup Materi', render: p => <span className="font-semibold">{p.scope_material}</span> },
    { key: 'semester', label: 'Sem' },
    { key: 'jp_allocation', label: 'JP', align: 'center', render: p => <span className="font-bold tabular-nums">{p.jp_allocation}</span> },
    { key: 'meeting_count', label: 'Pertemuan', align: 'center', render: p => <span className="font-bold text-teal-700 tabular-nums">{p.meeting_count}x</span> },
    { key: 'week_number', label: 'Minggu Ke-', align: 'center' },
  ];

  const handleConvert = (protaId: string) => {
    const prota = allProta.find(p => p.id === protaId);
    if (!prota) return;
    const myTcs = (db.TeacherClasses || []).filter(tc => tc.teacher_id === user.id && tc.subject_id === prota.subject_id);
    if (myTcs.length === 0) {
      onShowToast('Anda tidak mengampu mata pelajaran ini di Kelas Saya.', 'warning');
      return;
    }
    onConvertProtaToSession(myTcs[0].id);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Data CP &amp; ATP — Program Tahunan (Prota)</h2>
          <p className="text-xs text-slate-500">
            Fase D {idn.curriculum_name} {siNameCase(idn.school_name)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAutoOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Wand2 className="w-4 h-4" />
            <span>Susun Prota Otomatis</span>
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah CP/ATP</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-extrabold text-slate-700 uppercase">Diagram Kemajuan Realisasi Prota</span>
          <span className="text-sm font-extrabold text-indigo-700 tabular-nums">
            {taughtMeetings} / {totalTargetMeetings} Pertemuan ({progressPct}%)
          </span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-600 to-teal-500 transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <select value={subFilter} onChange={e => setSubFilter(e.target.value)} className="px-3 py-2 rounded-xl border text-xs font-bold bg-white">
          <option value="ALL">Semua Mata Pelajaran</option>
          {subjects.map(s => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} className="px-3 py-2 rounded-xl border text-xs font-bold bg-white">
          <option value="ALL">Semua Jenjang (7, 8, 9)</option>
          <option value="7">Kelas 7</option>
          <option value="8">Kelas 8</option>
          <option value="9">Kelas 9</option>
        </select>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={filtered}
        exportSheetName="CP_ATP_Prota"
        renderActions={p => (
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => handleConvert(p.id)}
              className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 font-bold hover:bg-teal-100"
            >
              Jadikan Sesi Pertemuan
            </button>
            <button type="button" onClick={() => onOpenCrud('CpAtp_Prota', p.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('CpAtp_Prota', p.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <Modal open={addOpen} title="Tambah Data CP & ATP (Prota)" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleSaveProta} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Mata Pelajaran</label>
            <select required value={prSub} onChange={e => setPrSub(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {subjects.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Jenjang Kelas</label>
            <select value={prGrade} onChange={e => setPrGrade(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="7">Kelas 7</option>
              <option value="8">Kelas 8</option>
              <option value="9">Kelas 9</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Elemen</label>
            <input required value={prElem} onChange={e => setPrElem(e.target.value)} placeholder="Contoh: Pemahaman IPA / Bilangan" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Kode CP &amp; ATP</label>
            <input required value={prCode} onChange={e => setPrCode(e.target.value)} placeholder="Contoh: IPA.7.4" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold mb-1">Tujuan Pembelajaran (TP)</label>
            <textarea required rows={2} value={prTp} onChange={e => setPrTp(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Lingkup Materi</label>
            <input required value={prScope} onChange={e => setPrScope(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Semester</label>
            <select value={prSem} onChange={e => setPrSem(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Alokasi JP</label>
            <input type="number" value={prJp} onChange={e => setPrJp(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Jumlah Pertemuan</label>
            <input type="number" value={prMeet} onChange={e => setPrMeet(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold mb-1">Minggu Ke-</label>
            <input value={prWeek} onChange={e => setPrWeek(e.target.value)} placeholder="Contoh: 12-14" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Data Prota
          </button>
        </form>
      </Modal>

      <Modal open={autoOpen} title="Susun Prota Otomatis" onClose={() => setAutoOpen(false)}>
        <form onSubmit={handleRunAutoProta} className="space-y-3 text-xs">
          <p className="text-slate-600">Sistem akan menyusun struktur ATP &amp; distribusi minggu efektif Gasal/Genap secara otomatis.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Mata Pelajaran</label>
              <select value={apSub} onChange={e => setApSub(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Jenjang Kelas</label>
              <select value={apGrade} onChange={e => setApGrade(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                <option value="7">Kelas 7</option>
                <option value="8">Kelas 8</option>
                <option value="9">Kelas 9</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">JP per Minggu</label>
              <input type="number" value={apJpWeek} onChange={e => setApJpWeek(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Minggu Efektif (Gasal / Genap)</label>
              <input type="number" value={apWeeks} onChange={e => setApWeeks(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold">
            Generate Kerangka Prota
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function GuruJurnalModule({
  db,
  user,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
  onShowToast,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onPrintHtml: (html: string) => void;
}) {
  const myTcs = (db.TeacherClasses || []).filter(tc => tc.teacher_id === user.id);
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];

  const [classId, setClassId] = useState(myTcs[0]?.class_id || '');
  const [subjectId, setSubjectId] = useState(myTcs[0]?.subject_id || '');
  const [addOpen, setAddOpen] = useState(false);

  const [jnDate, setJnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [jnNo, setJnNo] = useState('1');
  const [jnTp, setJnTp] = useState('');
  const [jnMat, setJnMat] = useState('');
  const [jnActs, setJnActs] = useState<string[]>([]);
  const [jnH, setJnH] = useState('25');
  const [jnS, setJnS] = useState('0');
  const [jnI, setJnI] = useState('0');
  const [jnA, setJnA] = useState('0');
  const [jnProb, setJnProb] = useState('');

  useEffect(() => {
    if (myTcs.length > 0 && (!classId || !subjectId)) {
      setClassId(myTcs[0].class_id);
      setSubjectId(myTcs[0].subject_id);
    }
  }, [myTcs.length]);

  const journals = (db.JurnalMengajar || []).filter(
    j => j.teacher_id === user.id && (!classId || j.class_id === classId) && (!subjectId || j.subject_id === subjectId)
  );

  const pullJournalFromSessions = async () => {
    const sessions = (db.AttendanceSessions || []).filter(
      s => s.teacher_id === user.id && s.class_id === classId && s.subject_id === subjectId
    );
    const existingSessionIds = (db.JurnalMengajar || []).map(j => j.session_id);
    const records = db.AttendanceRecords || [];
    const atps = db.CpAtp_Prota || [];

    let added = 0;
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (existingSessionIds.includes(s.id)) continue;
      const sRecs = records.filter(r => r.session_id === s.id);
      const h = sRecs.filter(r => r.status === 'H').length;
      const sk = sRecs.filter(r => r.status === 'S').length;
      const iz = sRecs.filter(r => r.status === 'I').length;
      const al = sRecs.filter(r => r.status === 'A').length;
      const tot = Math.max(1, sRecs.length);
      const atp = atps.find(a => a.id === s.atp_id || a.atp_code === s.atp_code);

      await onSaveRecord(
        'JurnalMengajar',
        {
          teacher_id: user.id,
          class_id: s.class_id,
          subject_id: s.subject_id,
          session_id: s.id,
          journal_date: s.session_date,
          meeting_no: i + 1,
          tp_text: atp ? atp.tp_text : s.title,
          material: s.title,
          activities: s.kbm_activities || 'Diskusi & Penugasan',
          h_count: h,
          s_count: sk,
          i_count: iz,
          a_count: al,
          attendance_pct: Math.round((h / tot) * 100),
          problems_solutions: [s.kbm_problems, s.kbm_solutions].filter(Boolean).join(' | ') || 'KBM berjalan lancar.',
        },
        ''
      );
      added++;
    }
    onShowToast(
      added > 0 ? `${added} entri jurnal berhasil ditarik dari sesi mengajar!` : 'Semua sesi sudah tersinkron ke jurnal.',
      'info'
    );
  };

  const handleSaveManualJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(jnH) || 0;
    const s = Number(jnS) || 0;
    const i = Number(jnI) || 0;
    const a = Number(jnA) || 0;
    const tot = Math.max(1, h + s + i + a);
    await onSaveRecord(
      'JurnalMengajar',
      {
        teacher_id: user.id,
        class_id: classId,
        subject_id: subjectId,
        journal_date: jnDate,
        meeting_no: Number(jnNo),
        tp_text: jnTp,
        material: jnMat,
        activities: jnActs.join(', '),
        h_count: h,
        s_count: s,
        i_count: i,
        a_count: a,
        attendance_pct: Math.round((h / tot) * 100),
        problems_solutions: jnProb,
      },
      'Jurnal mengajar berhasil disimpan!'
    );
    setAddOpen(false);
  };

  const handleExportExcel = () => {
    const headers = ['No', 'Hari/Tanggal', 'Pertemuan Ke', 'Tujuan Pembelajaran', 'Materi', 'Kegiatan KBM', 'H/S/I/A', '% Hadir', 'Permasalahan & Solusi'];
    const rows = journals.map((j, i) => [
      i + 1,
      j.journal_date,
      j.meeting_no,
      j.tp_text,
      j.material,
      j.activities,
      `${j.h_count}/${j.s_count}/${j.i_count}/${j.a_count}`,
      `${j.attendance_pct}%`,
      j.problems_solutions,
    ]);
    exportTableToExcel([headers, ...rows], 'Jurnal_KBM', `Jurnal_Mengajar_${classId}.xlsx`);
  };

  const handlePrint = () => {
    const idn = getSchoolIdentity(db);
    const headers = ['No', 'Tanggal', 'Pert.', 'Tujuan Pembelajaran', 'Materi', 'Kegiatan', 'H/S/I/A', '%', 'Permasalahan & Solusi'];
    const rows = journals.map((j, i) => [
      i + 1,
      j.journal_date,
      j.meeting_no,
      j.tp_text,
      j.material,
      j.activities,
      `${j.h_count}/${j.s_count}/${j.i_count}/${j.a_count}`,
      `${j.attendance_pct}%`,
      j.problems_solutions,
    ]);
    onPrintHtml(`
      ${renderOfficialLetterheadHtml(idn)}
      <h3 style="text-align:center;font-weight:bold;margin:10px 0;">JURNAL PELAKSANAAN PEMBELAJARAN (KBM)</h3>
      <table>
        <thead><tr>${headers.map(h => `<th>${siEsc(h)}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${siEsc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
      ${renderSignatureBlockHtml(db, 'Guru Mata Pelajaran', user.full_name, user.nip)}
    `);
  };

  const atpsForSub = (db.CpAtp_Prota || []).filter(a => a.subject_id === subjectId);

  const columns: ColumnDef[] = [
    { key: '_no', label: 'No', render: (_, idx) => <span className="font-bold tabular-nums">{idx + 1}</span>, textValue: (_, idx) => String(idx + 1) },
    { key: 'journal_date', label: 'Hari/Tanggal', render: j => <span className="whitespace-nowrap font-semibold tabular-nums">{j.journal_date}</span> },
    { key: 'meeting_no', label: 'Pert. Ke', align: 'center', render: j => <span className="font-bold tabular-nums">{j.meeting_no}</span> },
    { key: 'tp_text', label: 'Tujuan Pembelajaran', render: j => <span className="block max-w-xs">{j.tp_text}</span> },
    { key: 'material', label: 'Materi', render: j => <span className="font-bold">{j.material}</span> },
    { key: 'activities', label: 'Kegiatan KBM' },
    { key: '_hsia', label: 'Absensi (H/S/I/A)', align: 'center', render: j => <span className="font-bold tabular-nums">{j.h_count}/{j.s_count}/{j.i_count}/{j.a_count}</span>, textValue: j => `${j.h_count}/${j.s_count}/${j.i_count}/${j.a_count}` },
    { key: 'attendance_pct', label: '% Hadir', align: 'center', render: j => <span className="font-extrabold text-emerald-700 tabular-nums">{j.attendance_pct}%</span>, textValue: j => `${j.attendance_pct}%` },
    { key: 'problems_solutions', label: 'Permasalahan & Solusi', textValue: j => j.problems_solutions || '-' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Jurnal Mengajar Guru (KBM)</h2>
          <p className="text-xs text-slate-500">Rekam jejak pelaksanaan pembelajaran harian terintegrasi presensi &amp; ATP</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pullJournalFromSessions}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-900 text-xs font-extrabold flex items-center gap-1.5"
          >
            Tarik Otomatis dari Sesi Mengajar
          </button>
          <button
            type="button"
            onClick={() => {
              setJnTp(atpsForSub[0]?.tp_text || '');
              setAddOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            + Tambah Manual
          </button>
          <button type="button" onClick={handleExportExcel} className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold">
            Excel .xlsx
          </button>
          <button type="button" onClick={handlePrint} className="px-3.5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold">
            Cetak Jurnal
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-wrap gap-3 items-center">
        <span className="text-xs font-bold text-slate-500">Filter Kelas &amp; Mapel:</span>
        <select
          value={`${classId}|${subjectId}`}
          onChange={e => {
            const [c, s] = e.target.value.split('|');
            setClassId(c);
            setSubjectId(s);
          }}
          className="px-3 py-2 rounded-xl border text-xs font-bold bg-white"
        >
          {myTcs.map(tc => {
            const c = classes.find(x => x.id === tc.class_id) || { name: tc.class_id };
            const s = subjects.find(x => x.id === tc.subject_id) || { name: tc.subject_id };
            const val = `${tc.class_id}|${tc.subject_id}`;
            return (
              <option key={tc.id} value={val}>
                Kelas {c.name} — {s.name}
              </option>
            );
          })}
        </select>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={journals}
        exportSheetName="Jurnal_KBM"
        renderActions={j => (
          <div className="space-x-2">
            <button type="button" onClick={() => onOpenCrud('JurnalMengajar', j.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('JurnalMengajar', j.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <Modal open={addOpen} title="Tambah Entri Jurnal Mengajar" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleSaveManualJournal} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Tanggal</label>
              <input type="date" required value={jnDate} onChange={e => setJnDate(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Pertemuan Ke-</label>
              <input type="number" value={jnNo} onChange={e => setJnNo(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Tujuan Pembelajaran (Tarik dari ATP Prota)</label>
            <select value={jnTp} onChange={e => setJnTp(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="">-- Pilih atau isi manual --</option>
              {atpsForSub.map(a => (
                <option key={a.id} value={a.tp_text}>
                  {a.atp_code} — {shortenTpText(a.tp_text, 65)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Materi Pokok</label>
            <input required value={jnMat} onChange={e => setJnMat(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Kegiatan Belajar Mengajar</label>
            <div className="grid grid-cols-3 gap-2">
              {['Ceramah', 'Diskusi', 'Presentasi', 'Penugasan', 'Asesmen Formatif', 'Praktik/Demonstrasi'].map(a => (
                <label key={a} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={jnActs.includes(a)}
                    onChange={e => setJnActs(p => (e.target.checked ? [...p, a] : p.filter(x => x !== a)))}
                  />
                  <span>{a}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="block font-bold">Hadir</label>
              <input type="number" value={jnH} onChange={e => setJnH(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border" />
            </div>
            <div>
              <label className="block font-bold">Sakit</label>
              <input type="number" value={jnS} onChange={e => setJnS(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border" />
            </div>
            <div>
              <label className="block font-bold">Izin</label>
              <input type="number" value={jnI} onChange={e => setJnI(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border" />
            </div>
            <div>
              <label className="block font-bold">Alpa</label>
              <input type="number" value={jnA} onChange={e => setJnA(e.target.value)} className="w-full px-2 py-1.5 rounded-lg border" />
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Permasalahan dalam KBM &amp; Solusi</label>
            <textarea rows={2} value={jnProb} onChange={e => setJnProb(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Jurnal
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function GuruJadwalModule({
  db,
  user,
  actor,
  onReload,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  user: UserPublic;
  actor: ActorInfo;
  onReload: (silent?: boolean) => Promise<void>;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const mySchedules = (db.JadwalPelajaran || []).filter(j => j.teacher_id === user.id);
  const myTcs = (db.TeacherClasses || []).filter(tc => tc.teacher_id === user.id);
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];
  const jpDuration = getJpDuration(db);
  const totalJp = mySchedules.reduce((a, b) => a + (Number(b.jp_count) || 0), 0) + adminBlocksJp(db, user.id);

  const [jpDurInput, setJpDurInput] = useState(String(jpDuration));
  const [jdTc, setJdTc] = useState(myTcs[0] ? `${myTcs[0].class_id}|${myTcs[0].subject_id}` : '');
  const [jdDay, setJdDay] = useState('Senin');
  const [jdTime, setJdTime] = useState('07:30');
  const [jdJp, setJdJp] = useState(2);
  const [jdRoom, setJdRoom] = useState('');

  useEffect(() => {
    setJpDurInput(String(jpDuration));
  }, [jpDuration]);

  useEffect(() => {
    if (myTcs.length > 0 && !jdTc) {
      setJdTc(`${myTcs[0].class_id}|${myTcs[0].subject_id}`);
    }
  }, [myTcs.length]);

  const adminBlocks = getTeacherAdminBlocks(db, user.id);
  const today = todayDayName();

  const handleUpdateJpDuration = async (val: string) => {
    onShowLoader('Menyimpan durasi JP...');
    try {
      await saveSchoolSettingsApi({ jp_duration_minutes: String(val) }, actor);
      await onReload(true);
      onShowToast('Durasi 1 JP diperbarui!', 'success');
    } catch (err: any) {
      onShowToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleSaveNewSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jdTc) return;
    const [classId, subjectId] = jdTc.split('|');
    await onSaveRecord(
      'JadwalPelajaran',
      {
        teacher_id: user.id,
        class_id: classId,
        subject_id: subjectId,
        day_name: jdDay,
        start_time: normTime(jdTime),
        jp_count: Number(jdJp),
        room_note: jdRoom,
      },
      'Jadwal mengajar berhasil ditambahkan!'
    );
    setJdRoom('');
  };

  const columns: ColumnDef[] = [
    { key: 'day_name', label: 'Hari', render: j => <span className="font-extrabold text-indigo-700">{j.day_name}</span> },
    { key: 'start_time', label: 'Jam Mulai', render: j => <span className="font-bold tabular-nums">{normTime(j.start_time) || '-'} WITA</span>, textValue: j => `${normTime(j.start_time) || '-'} WITA` },
    { key: '_end', label: 'Jam Selesai', render: j => <span className="font-bold tabular-nums">{addMin(j.start_time, (Number(j.jp_count) || 0) * jpDuration) || '-'} WITA</span>, textValue: j => `${addMin(j.start_time, (Number(j.jp_count) || 0) * jpDuration) || '-'} WITA` },
    { key: 'class_id', label: 'Kelas', render: j => <span className="font-bold">Kelas {className(db, j.class_id)}</span>, textValue: j => `Kelas ${className(db, j.class_id)}` },
    { key: 'subject_id', label: 'Mata Pelajaran', textValue: j => subjectName(db, j.subject_id) },
    { key: 'jp_count', label: 'JP', align: 'center', render: j => <span className="font-bold tabular-nums">{j.jp_count} JP</span>, textValue: j => `${j.jp_count} JP` },
    { key: 'room_note', label: 'Ruangan', textValue: j => j.room_note || '-' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Jadwal Mengajar &amp; Pengaturan JP</h2>
          <p className="text-xs text-slate-500 tabular-nums">
            Total Beban Minggu Ini: <strong>{totalJp} JP</strong> ({totalJp * jpDuration} Menit)
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-200 text-xs">
          <span className="font-bold text-slate-600">Durasi 1 JP (Menit):</span>
          <input
            type="number"
            value={jpDurInput}
            onChange={e => setJpDurInput(e.target.value)}
            onBlur={e => {
              if (e.target.value !== String(jpDuration)) handleUpdateJpDuration(e.target.value);
            }}
            className="w-16 px-2 py-1 rounded-lg border font-bold text-center tabular-nums"
          />
        </div>
      </div>

      {/* JADWAL RESMI DARI ADMIN / WAKA KURIKULUM */}
      <div className="bg-white rounded-2xl border-2 border-indigo-100 overflow-hidden">
        <div className="px-5 py-3 bg-indigo-50 flex items-center justify-between">
          <h3 className="font-extrabold text-indigo-900 text-sm flex items-center gap-2">
            <CalendarCheck className="w-4 h-4" />
            <span>Jadwal Resmi dari Admin / Waka Kurikulum</span>
          </h3>
          <span className="text-[11px] font-bold text-indigo-700 tabular-nums">
            {adminBlocks.reduce((a, b) => a + b.jp, 0)} JP / minggu
          </span>
        </div>
        {adminBlocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Hari</th>
                  <th className="p-3">Jam ke</th>
                  <th className="p-3">Jam Mulai</th>
                  <th className="p-3">Jam Selesai</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">JP</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {adminBlocks.map((b, i) => (
                  <tr key={i} className={b.day_name === today ? 'bg-amber-50' : ''}>
                    <td className="p-3 font-extrabold text-indigo-700">
                      {b.day_name}
                      {b.day_name === today && (
                        <span className="ml-1 text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">Hari ini</span>
                      )}
                    </td>
                    <td className="p-3 tabular-nums">
                      {b.startSlot === b.endSlot ? b.startSlot : `${b.startSlot}–${b.endSlot}`}
                    </td>
                    <td className="p-3 font-bold tabular-nums">{b.start || '-'} WITA</td>
                    <td className="p-3 font-bold tabular-nums">{b.end || '-'} WITA</td>
                    <td className="p-3 font-bold">Kelas {className(db, b.class_id)}</td>
                    <td className="p-3">{subjectName(db, b.subject_id)}</td>
                    <td className="p-3 text-center font-bold tabular-nums">{b.jp} JP</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-5 text-xs text-slate-500">
            Admin belum menyusun jadwal untuk Anda. Jadwal akan otomatis muncul di sini setelah disusun berdasarkan penugasan mengajar Anda.
          </p>
        )}
      </div>

      {/* FORM TAMBAH JADWAL */}
      <form
        onSubmit={handleSaveNewSchedule}
        className="bg-white p-5 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-7 gap-3 text-xs items-end"
      >
        <div className="sm:col-span-2">
          <label className="block font-bold mb-1">Kelas &amp; Mata Pelajaran</label>
          <select required value={jdTc} onChange={e => setJdTc(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-bold bg-white">
            {myTcs.map(tc => {
              const c = classes.find(x => x.id === tc.class_id) || { name: tc.class_id };
              const s = subjects.find(x => x.id === tc.subject_id) || { name: tc.subject_id };
              return (
                <option key={tc.id} value={`${tc.class_id}|${tc.subject_id}`}>
                  Kelas {c.name} — {s.name}
                </option>
              );
            })}
          </select>
        </div>
        <div>
          <label className="block font-bold mb-1">Hari</label>
          <select value={jdDay} onChange={e => setJdDay(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-bold bg-white">
            {DAY_NAMES.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-bold mb-1">Jam Mulai</label>
          <input type="time" value={jdTime} onChange={e => setJdTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-bold" />
        </div>
        <div>
          <label className="block font-bold mb-1">Jam Selesai (otomatis)</label>
          <input
            type="text"
            readOnly
            tabIndex={-1}
            value={addMin(jdTime, Math.max(1, Math.min(8, jdJp)) * jpDuration) || '-'}
            className="w-full px-3 py-2 rounded-xl border bg-slate-100 text-slate-600 font-extrabold tabular-nums"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Jumlah JP</label>
          <input
            type="number"
            min={1}
            max={8}
            value={jdJp}
            onChange={e => setJdJp(Number(e.target.value) || 2)}
            className="w-full px-3 py-2 rounded-xl border font-bold"
          />
        </div>
        <div>
          <label className="block font-bold mb-1">Ruangan</label>
          <input value={jdRoom} onChange={e => setJdRoom(e.target.value)} placeholder="Ruang 7A" className="w-full px-3 py-2 rounded-xl border" />
        </div>
        <button type="submit" className="sm:col-span-7 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
          + Tambahkan ke Jadwal Mengajar
        </button>
      </form>

      <EnhancedDataTable
        columns={columns}
        rows={mySchedules}
        exportSheetName="Jadwal_Mengajar"
        renderActions={j => (
          <div className="space-x-2">
            <button type="button" onClick={() => onOpenCrud('JadwalPelajaran', j.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('JadwalPelajaran', j.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />
    </div>
  );
}
