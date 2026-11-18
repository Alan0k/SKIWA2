import React, { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { FileDown, Upload } from 'lucide-react';
import { EnhancedDataTable, type ColumnDef } from '../components/DataTableTools';
import {
  StudentAchievementCell,
  StudentViolationCell,
  studentAchievementText,
  studentViolationText,
} from '../components/StudentBadges';
import { Modal } from '../components/UiPrimitives';
import type { ActorInfo, DatabasePayload, GenericRow } from '../types/siakad';
import { getSchoolIdentity, getSettingVal, siNameCase } from '../utils/siakadEngine';
import { importStudentsBulkApi, saveClassAssignmentsApi } from '../api/client';

function parseStudentImportText(raw: string): GenericRow[] {
  const lines = String(raw || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const splitLine = (line: string) => {
    if (line.includes('\t')) return line.split('\t').map(c => c.trim());
    if (line.includes(';')) return line.split(';').map(c => c.trim());
    return line.split(',').map(c => c.trim());
  };

  const first = splitLine(lines[0]).map(x => x.toLowerCase());
  const hasHeader = first.some(h => h.includes('nama') || h === 'nis' || h === 'nisn' || h.includes('kelas'));
  const dataLines = hasHeader ? lines.slice(1) : lines;

  const colIdx = (keys: string[], fallback: number) => {
    if (!hasHeader) return fallback;
    const idx = first.findIndex(h => keys.some(k => h === k || h.includes(k)));
    return idx >= 0 ? idx : fallback;
  };

  const idxNis = colIdx(['nis'], 0);
  const idxNisn = colIdx(['nisn'], 1);
  const idxName = colIdx(['nama', 'full_name'], 2);
  const idxGender = colIdx(['l/p', 'jk', 'gender', 'kelamin'], 3);
  const idxClass = colIdx(['kelas', 'class'], 4);
  const idxParent = colIdx(['ortu', 'orang tua', 'wali murid', 'parent_name'], 5);
  const idxPhone = colIdx(['hp', 'telp', 'phone', 'parent_phone'], 6);
  const idxGuruWali = colIdx(['guru wali', 'guru_wali'], 7);

  return dataLines
    .map(l => {
      const cols = splitLine(l);
      return {
        nis: cols[idxNis] || '',
        nisn: cols[idxNisn] || '',
        full_name: cols[idxName] || '',
        gender: cols[idxGender] || 'L',
        class_id: cols[idxClass] || '',
        parent_name: cols[idxParent] || '',
        parent_phone: cols[idxPhone] || '',
        guru_wali_id: cols[idxGuruWali] || '',
      };
    })
    .filter(r => r.full_name);
}

export function StudentsModule({
  db,
  actor,
  onReload,
  onSaveRecord,
  onDeleteRecord,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo;
  onReload: (silent?: boolean) => Promise<void>;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const students = db.Students || [];
  const classes = db.Classes || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');
  const idn = getSchoolIdentity(db);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [nis, setNis] = useState('');
  const [nisn, setNisn] = useState('');
  const [fullName, setFullName] = useState('');
  const [gender, setGender] = useState('L');
  const [classId, setClassId] = useState(classes[0]?.id || '');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [guruWaliId, setGuruWaliId] = useState(gurus[0]?.id || '');
  const [dreamJob, setDreamJob] = useState('');
  const [lit, setLit] = useState('Cakap');
  const [num, setNum] = useState('Cakap');

  const [importOpen, setImportOpen] = useState(false);
  const [pasteImportText, setPasteImportText] = useState('');
  const [uploadedRows, setUploadedRows] = useState<GenericRow[]>([]);

  const parsedImportRows = useMemo(() => {
    if (uploadedRows.length > 0) return uploadedRows;
    return parseStudentImportText(pasteImportText);
  }, [uploadedRows, pasteImportText]);

  const handleDownloadTemplate = () => {
    const sampleClass = classes[0]?.name || '7A';
    const sampleGuru = gurus[0]?.full_name || '';
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['NIS', 'NISN', 'Nama Lengkap', 'L/P', 'Kelas', 'Nama Orang Tua', 'No HP Ortu', 'Guru Wali'],
      ['260101', '0134567801', 'Contoh Nama Siswa', 'L', sampleClass, 'Nama Orang Tua', '081234567890', sampleGuru],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Siswa');
    XLSX.writeFile(wb, 'Template_Import_Siswa.xlsx');
    onShowToast('Template Excel berhasil diunduh.', 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawObjs = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        const mapped = rawObjs
          .map(o => {
            const get = (keys: string[]) => {
              const foundKey = Object.keys(o).find(k => keys.some(t => k.toLowerCase().trim() === t || k.toLowerCase().includes(t)));
              return foundKey ? String(o[foundKey] ?? '').trim() : '';
            };
            return {
              nis: get(['nis']),
              nisn: get(['nisn']),
              full_name: get(['nama lengkap', 'nama siswa', 'nama', 'full_name']),
              gender: get(['l/p', 'jk', 'jenis kelamin', 'gender']) || 'L',
              class_id: get(['kelas', 'rombel', 'class_id', 'class']),
              parent_name: get(['nama orang tua', 'orang tua', 'ortu', 'wali', 'parent_name']),
              parent_phone: get(['no hp', 'hp', 'telp', 'parent_phone']),
              guru_wali_id: get(['guru wali', 'guru_wali']),
              dream_job: get(['cita-cita', 'dream_job']),
            };
          })
          .filter(r => r.full_name);
        setUploadedRows(mapped);
        setPasteImportText('');
        onShowToast(`${mapped.length} data siswa terbaca dari file.`, 'info');
      } catch (err: any) {
        onShowToast('Gagal membaca file Excel/CSV: ' + (err?.message || err), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteImport = async () => {
    if (!parsedImportRows.length) {
      onShowToast('Belum ada data siswa valid untuk diimpor.', 'warning');
      return;
    }
    onShowLoader(`Mengimpor ${parsedImportRows.length} data siswa...`);
    try {
      const res = await importStudentsBulkApi(parsedImportRows, actor);
      await onReload(true);
      setImportOpen(false);
      setUploadedRows([]);
      setPasteImportText('');
      onShowToast(`Import selesai: ${res.added} siswa baru, ${res.updated} diperbarui.`, 'success');
    } catch (err: any) {
      onShowToast('Gagal import data siswa: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const openModalForm = (studentId = '') => {
    const st = studentId ? students.find(s => s.id === studentId) : null;
    setEditId(studentId);
    setNis(st?.nis || '');
    setNisn(st?.nisn || '');
    setFullName(st?.full_name || '');
    setGender(st?.gender || 'L');
    setClassId(st?.class_id || classes[0]?.id || '');
    setParentName(st?.parent_name || '');
    setParentPhone(st?.parent_phone || '');
    setGuruWaliId(st?.guru_wali_id || gurus[0]?.id || '');
    setDreamJob(st?.dream_job || '');
    setLit(st?.literacy_level || 'Cakap');
    setNum(st?.numeracy_level || 'Cakap');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'Students',
      {
        id: editId,
        nis,
        nisn,
        full_name: fullName,
        gender,
        class_id: classId,
        parent_name: parentName,
        parent_phone: parentPhone,
        guru_wali_id: guruWaliId,
        literacy_level: lit,
        numeracy_level: num,
        dream_job: dreamJob,
        status: 'Aktif',
      },
      editId ? 'Data siswa diperbarui!' : 'Siswa baru berhasil ditambahkan & otomatis terdaftar di Pramuka!'
    );
    setModalOpen(false);
  };

  const handleQuickGuruWaliChange = async (st: GenericRow, nextGuruId: string) => {
    await onSaveRecord(
      'Students',
      { ...st, guru_wali_id: nextGuruId },
      `Guru Wali ${st.full_name} berhasil diperbarui!`
    );
  };

  const orphans = students.filter(s => !classes.some(c => c.id === s.class_id));

  const columns: ColumnDef[] = [
    {
      key: 'nis',
      label: 'NIS / NISN',
      render: st => (
        <span className="font-mono tabular-nums">
          {st.nis}
          <br />
          <span className="text-slate-400">{st.nisn}</span>
        </span>
      ),
      textValue: st => `${st.nis} ${st.nisn}`,
    },
    { key: 'full_name', label: 'Nama Lengkap', render: st => <span className="font-bold text-slate-800">{st.full_name}</span> },
    { key: 'gender', label: 'L/P', render: st => <span className="font-bold">{st.gender}</span> },
    {
      key: 'class_id',
      label: 'Kelas',
      render: st => <span className="font-bold text-indigo-700">{classes.find(c => c.id === st.class_id)?.name || st.class_id}</span>,
      textValue: st => String(classes.find(c => c.id === st.class_id)?.name || st.class_id),
    },
    {
      key: 'guru_wali_id',
      label: 'Guru Wali',
      render: st => (
        <select
          value={st.guru_wali_id || ''}
          onChange={e => handleQuickGuruWaliChange(st, e.target.value)}
          className="px-2 py-1 rounded-lg border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 max-w-[180px]"
          title="Ganti Guru Wali siswa"
        >
          <option value="">-- Belum dipilih --</option>
          {gurus.map(g => (
            <option key={g.id} value={g.id}>
              {g.full_name}
            </option>
          ))}
        </select>
      ),
      textValue: st => gurus.find(g => g.id === st.guru_wali_id)?.full_name || '-',
    },
    {
      key: 'parent_name',
      label: 'Orang Tua / HP',
      render: st => (
        <>
          {st.parent_name}
          <br />
          <span className="text-slate-400">{st.parent_phone}</span>
        </>
      ),
      textValue: st => `${st.parent_name || ''} ${st.parent_phone || ''}`,
    },
    {
      key: 'literacy_level',
      label: 'Literasi / Numerasi',
      render: st => (
        <>
          Lit: <strong>{st.literacy_level}</strong>
          <br />
          Num: <strong>{st.numeracy_level}</strong>
        </>
      ),
      textValue: st => `Lit:${st.literacy_level} Num:${st.numeracy_level}`,
    },
    {
      key: '_violations',
      label: 'Pelanggaran (R/S/B & Poin)',
      render: st => <StudentViolationCell db={db} studentId={st.id} />,
      textValue: st => studentViolationText(db, st.id),
    },
    {
      key: '_achievements',
      label: 'Prestasi Siswa',
      render: st => <StudentAchievementCell db={db} studentId={st.id} />,
      textValue: st => studentAchievementText(db, st.id),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Data Peserta Didik {siNameCase(idn.school_name)}</h2>
          <p className="text-xs text-slate-500">
            Siswa baru otomatis terdaftar di Pramuka • Edit langsung Guru Wali di tabel • Kolom Pelanggaran &amp; Prestasi terhitung otomatis
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setUploadedRows([]);
              setPasteImportText('');
              setImportOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Import Data Siswa</span>
          </button>
          <button
            type="button"
            onClick={() => openModalForm('')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
          >
            + Tambah Siswa Baru
          </button>
        </div>
      </div>

      {orphans.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900">
          <p className="font-extrabold">{orphans.length} siswa belum masuk rombel</p>
          <p className="mt-1">
            Kolom <strong>class_id</strong> pada data Siswa tidak cocok dengan ID rombel di data Kelas (contoh ID yang benar:{' '}
            {classes.slice(0, 3).map((c, idx) => (
              <React.Fragment key={c.id}>
                {idx > 0 ? ', ' : ''}
                <strong>{c.id}</strong>
              </React.Fragment>
            ))}
            ). Contoh data bermasalah:{' '}
            {orphans
              .slice(0, 5)
              .map(s => `${s.full_name} (“${s.class_id || 'kosong'}”)`)
              .join(', ')}
            .
          </p>
        </div>
      )}

      <EnhancedDataTable
        columns={columns}
        rows={students}
        exportSheetName="Data_Siswa"
        renderActions={st => (
          <div className="space-x-2">
            <button type="button" onClick={() => openModalForm(st.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('Students', st.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      {/* MODAL IMPORT DATA SISWA MASSAL */}
      <Modal
        open={importOpen}
        title="Import Massal Data Siswa (Excel / CSV / Copy-Paste)"
        onClose={() => setImportOpen(false)}
        maxWidthClass="max-w-4xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-indigo-900">
              <p className="font-bold">Petunjuk Format Kolom:</p>
              <p className="mt-0.5">
                Urutan: <strong>NIS, NISN, Nama Lengkap, L/P, Kelas (contoh: 7A), Nama Orang Tua, No HP Ortu, Guru Wali</strong>. Jika NIS/NISN sudah ada, data otomatis diperbarui.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-2 rounded-xl bg-white border border-indigo-300 text-indigo-700 font-bold inline-flex items-center gap-1.5 shrink-0 hover:bg-indigo-100"
            >
              <FileDown className="w-4 h-4" />
              <span>Download Template .xlsx</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block font-bold text-slate-800">Opsi 1: Upload File Excel (.xlsx/.xls) atau CSV</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700"
              />
              {uploadedRows.length > 0 && (
                <p className="text-emerald-700 font-bold">✓ {uploadedRows.length} baris berhasil dibaca dari file.</p>
              )}
            </div>
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <label className="block font-bold text-slate-800">Opsi 2: Tempel Tabel (Copy dari Excel/Spreadsheet)</label>
              <textarea
                rows={4}
                value={pasteImportText}
                onChange={e => {
                  setUploadedRows([]);
                  setPasteImportText(e.target.value);
                }}
                placeholder="NIS	NISN	Nama Lengkap	L	7A	Nama Ortu	08123...	Nama Guru Wali"
                className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
              />
            </div>
          </div>

          {parsedImportRows.length > 0 && (
            <div className="space-y-2">
              <p className="font-extrabold text-slate-800">Preview Data Siap Import ({parsedImportRows.length} siswa):</p>
              <div className="overflow-x-auto max-h-56 border border-slate-200 rounded-xl">
                <table className="w-full text-[11px] text-left">
                  <thead className="bg-slate-800 text-white sticky top-0">
                    <tr>
                      <th className="p-2">No</th>
                      <th className="p-2">NIS</th>
                      <th className="p-2">NISN</th>
                      <th className="p-2">Nama Lengkap</th>
                      <th className="p-2">L/P</th>
                      <th className="p-2">Kelas</th>
                      <th className="p-2">Orang Tua</th>
                      <th className="p-2">Guru Wali</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedImportRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 tabular-nums">{i + 1}</td>
                        <td className="p-2 font-mono">{r.nis || '-'}</td>
                        <td className="p-2 font-mono">{r.nisn || '-'}</td>
                        <td className="p-2 font-bold">{r.full_name}</td>
                        <td className="p-2">{r.gender}</td>
                        <td className="p-2 font-semibold text-indigo-700">{r.class_id || '-'}</td>
                        <td className="p-2">{r.parent_name || '-'}</td>
                        <td className="p-2">{r.guru_wali_id || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-600"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={!parsedImportRows.length}
              onClick={handleExecuteImport}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold"
            >
              Jalankan Import ({parsedImportRows.length} Siswa)
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modalOpen}
        title={editId ? 'Edit Data Siswa' : 'Tambah Siswa Baru (+ Otomatis Ekskul Pramuka)'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block font-bold mb-1">NIS</label>
            <input required value={nis} onChange={e => setNis(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">NISN</label>
            <input required value={nisn} onChange={e => setNisn(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-bold mb-1">Nama Lengkap Siswa</label>
            <input required value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Jenis Kelamin</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="L">Laki-laki (L)</option>
              <option value="P">Perempuan (P)</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Kelas</label>
            <select value={classId} onChange={e => setClassId(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Nama Orang Tua / Wali</label>
            <input value={parentName} onChange={e => setParentName(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">No. HP Orang Tua</label>
            <input value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Guru Wali</label>
            <select value={guruWaliId} onChange={e => setGuruWaliId(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="">-- Belum dipilih --</option>
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Cita-cita</label>
            <input value={dreamJob} onChange={e => setDreamJob(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Tingkat Literasi</label>
            <select value={lit} onChange={e => setLit(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {['Perlu Intervensi', 'Berkembang', 'Cakap', 'Sangat Cakap'].map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">Tingkat Numerasi</label>
            <select value={num} onChange={e => setNum(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {['Perlu Intervensi', 'Berkembang', 'Cakap', 'Sangat Cakap'].map(l => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="sm:col-span-2 py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Data Siswa
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function ClassesSubjectsModule({
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
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');

  const [clsModal, setClsModal] = useState(false);
  const [cName, setCName] = useState('');
  const [cGrade, setCGrade] = useState('7');
  const [cKkm, setCKkm] = useState('75');
  const [cWali, setCWali] = useState(gurus[0]?.id || '');

  const [subModal, setSubModal] = useState(false);
  const [sCode, setSCode] = useState('');
  const [sName, setSName] = useState('');
  const [sJp, setSJp] = useState('3');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">Daftar Rombongan Belajar &amp; KKM</h3>
          <button type="button" onClick={() => setClsModal(true)} className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold">
            + Tambah Kelas
          </button>
        </div>
        <EnhancedDataTable
          minRowsForTools={5}
          columns={[
            { key: 'name', label: 'Kelas', render: c => <span className="font-bold">{c.name}</span> },
            { key: 'kkm', label: 'KKM', render: c => <span className="font-extrabold text-emerald-700 tabular-nums">{c.kkm}</span> },
            { key: 'wali_kelas_id', label: 'Wali Kelas', textValue: c => gurus.find(g => g.id === c.wali_kelas_id)?.full_name || '-' },
          ]}
          rows={classes}
          exportSheetName="Daftar_Kelas"
          renderActions={c => (
            <div className="space-x-2">
              <button type="button" onClick={() => onOpenCrud('Classes', c.id)} className="text-indigo-600 font-bold">
                Edit
              </button>
              <button type="button" onClick={() => onDeleteRecord('Classes', c.id)} className="text-rose-600 font-bold">
                Hapus
              </button>
            </div>
          )}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">Daftar Mata Pelajaran</h3>
          <button type="button" onClick={() => setSubModal(true)} className="px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold">
            + Tambah Mapel
          </button>
        </div>
        <EnhancedDataTable
          minRowsForTools={5}
          columns={[
            { key: 'code', label: 'Kode', render: s => <span className="font-mono font-bold">{s.code}</span> },
            { key: 'name', label: 'Mata Pelajaran', render: s => <span className="font-bold">{s.name}</span> },
            { key: 'jp_per_week', label: 'JP/Mgg', align: 'center', render: s => <span className="tabular-nums">{s.jp_per_week}</span> },
          ]}
          rows={subjects}
          exportSheetName="Daftar_Mapel"
          renderActions={s => (
            <div className="space-x-2">
              <button type="button" onClick={() => onOpenCrud('Subjects', s.id)} className="text-indigo-600 font-bold">
                Edit
              </button>
              <button type="button" onClick={() => onDeleteRecord('Subjects', s.id)} className="text-rose-600 font-bold">
                Hapus
              </button>
            </div>
          )}
        />
      </div>

      <Modal open={clsModal} title="Tambah Rombongan Belajar" onClose={() => setClsModal(false)}>
        <form
          onSubmit={async e => {
            e.preventDefault();
            await onSaveRecord(
              'Classes',
              {
                name: cName,
                grade_level: cGrade,
                wali_kelas_id: cWali,
                kkm: Number(cKkm),
                academic_year: getSettingVal(db, 'academic_year', '2026/2027'),
              },
              'Kelas ditambahkan!'
            );
            setCName('');
            setClsModal(false);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-bold mb-1">Nama Kelas (Contoh: 8B)</label>
            <input required value={cName} onChange={e => setCName(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Tingkat</label>
            <select value={cGrade} onChange={e => setCGrade(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">KKM Kelas</label>
            <input type="number" value={cKkm} onChange={e => setCKkm(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Wali Kelas</label>
            <select value={cWali} onChange={e => setCWali(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Kelas
          </button>
        </form>
      </Modal>

      <Modal open={subModal} title="Tambah Mata Pelajaran" onClose={() => setSubModal(false)}>
        <form
          onSubmit={async e => {
            e.preventDefault();
            await onSaveRecord(
              'Subjects',
              { code: sCode, name: sName, phase: 'D', jp_per_week: Number(sJp) },
              'Mapel ditambahkan!'
            );
            setSCode('');
            setSName('');
            setSubModal(false);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-bold mb-1">Kode Mapel</label>
            <input required value={sCode} onChange={e => setSCode(e.target.value)} placeholder="INF" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Nama Mata Pelajaran</label>
            <input required value={sName} onChange={e => setSName(e.target.value)} placeholder="Informatika" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">JP per Minggu</label>
            <input type="number" value={sJp} onChange={e => setSJp(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold">
            Simpan Mapel
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function TeacherJabatansModule({
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
  const [guruFilter, setGuruFilter] = useState('ALL');
  const [addOpen, setAddOpen] = useState(false);

  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');
  const classes = db.Classes || [];
  const jabs = (db.TeacherJabatans || []).filter(j => guruFilter === 'ALL' || j.teacher_id === guruFilter);

  const [jbTeacher, setJbTeacher] = useState(gurus[0]?.id || '');
  const [jbRoleKey, setJbRoleKey] = useState('wali_kelas');
  const [jbTarget, setJbTarget] = useState('');
  const [jbName, setJbName] = useState('');
  const [jbSk, setJbSk] = useState('');
  const [jbTmt, setJbTmt] = useState('2026-07-13');
  const [jbJp, setJbJp] = useState('2');

  const columns: ColumnDef[] = [
    { key: 'teacher_id', label: 'Nama Guru', render: j => <span className="font-bold">{gurus.find(u => u.id === j.teacher_id)?.full_name || j.teacher_id}</span>, textValue: j => gurus.find(u => u.id === j.teacher_id)?.full_name || String(j.teacher_id) },
    { key: 'jabatan_name', label: 'Jabatan / Tugas Tambahan', render: j => <span className="font-semibold text-indigo-700">{j.jabatan_name}</span> },
    { key: 'role_key', label: 'Role Akses', render: j => <span className="px-2 py-0.5 rounded bg-slate-100 font-mono">{j.role_key}</span> },
    { key: 'sk_number', label: 'Nomor SK', textValue: j => j.sk_number || '-' },
    { key: 'tmt_date', label: 'TMT', textValue: j => j.tmt_date || '-' },
    { key: 'jp_eq', label: 'Ekiv. JP', align: 'center', render: j => <span className="font-bold tabular-nums">{j.jp_eq || 0} JP</span>, textValue: j => `${j.jp_eq || 0} JP` },
    { key: 'status', label: 'Status', render: j => <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">{j.status}</span> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Jabatan &amp; Tugas Tambahan Guru (Multi-Jabatan)</h2>
          <p className="text-xs text-slate-500">Satu guru dapat memiliki lebih dari satu jabatan aktif (Waka, Wali Kelas, Pembina, Koordinator)</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={guruFilter} onChange={e => setGuruFilter(e.target.value)} className="px-3 py-2 rounded-xl border text-xs font-bold bg-white">
            <option value="ALL">Filter: Semua Guru</option>
            {gurus.map(g => (
              <option key={g.id} value={g.id}>
                {g.full_name}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setAddOpen(true)} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold">
            + Tambah SK Jabatan
          </button>
        </div>
      </div>

      <EnhancedDataTable
        columns={columns}
        rows={jabs}
        exportSheetName="Jabatan_Guru"
        renderActions={j => (
          <div className="space-x-2">
            <button type="button" onClick={() => onOpenCrud('TeacherJabatans', j.id)} className="text-indigo-600 font-bold">
              Edit
            </button>
            <button type="button" onClick={() => onDeleteRecord('TeacherJabatans', j.id)} className="text-rose-600 font-bold">
              Hapus
            </button>
          </div>
        )}
      />

      <Modal open={addOpen} title="Tambah Jabatan / Tugas Tambahan Guru" onClose={() => setAddOpen(false)}>
        <form
          onSubmit={async e => {
            e.preventDefault();
            await onSaveRecord(
              'TeacherJabatans',
              {
                teacher_id: jbTeacher,
                jabatan_name: jbName,
                role_key: jbRoleKey,
                target_id: jbTarget,
                sk_number: jbSk,
                tmt_date: jbTmt,
                jp_eq: Number(jbJp),
                status: 'Aktif',
              },
              'Jabatan tambahan guru berhasil disimpan!'
            );
            setJbName('');
            setAddOpen(false);
          }}
          className="space-y-3 text-xs"
        >
          <div>
            <label className="block font-bold mb-1">Pilih Guru</label>
            <select value={jbTeacher} onChange={e => setJbTeacher(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-bold bg-white">
              {gurus.map(g => (
                <option key={g.id} value={g.id}>
                  {g.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold mb-1">Role Akses Sistem</label>
              <select value={jbRoleKey} onChange={e => setJbRoleKey(e.target.value)} className="w-full px-3 py-2 rounded-xl border font-bold bg-white">
                <option value="wali_kelas">Wali Kelas</option>
                <option value="waka_kurikulum">Waka Kurikulum</option>
                <option value="waka_kesiswaan">Waka Kesiswaan</option>
                <option value="waka_humas">Waka Humas</option>
                <option value="waka_sarpras">Waka Sarpras</option>
                <option value="admin_kokurikuler">Koordinator P5</option>
                <option value="guru">Tugas Tambahan Internal (Pembina/Ka.Lab/TPPK)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Target Kelas (Jika Wali Kelas)</label>
              <select value={jbTarget} onChange={e => setJbTarget(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                <option value="">-- Tidak Ada --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Nama Jabatan Lengkap</label>
            <input required value={jbName} onChange={e => setJbName(e.target.value)} placeholder="Contoh: Wali Kelas 8A / Kepala Lab IPA" className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block font-bold mb-1">No. SK</label>
              <input value={jbSk} onChange={e => setJbSk(e.target.value)} placeholder="421.3/..." className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">TMT</label>
              <input type="date" value={jbTmt} onChange={e => setJbTmt(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
            <div>
              <label className="block font-bold mb-1">Ekivalensi JP</label>
              <input type="number" value={jbJp} onChange={e => setJbJp(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan SK Jabatan
          </button>
        </form>
      </Modal>
    </div>
  );
}

export function TeachingAssignmentsModule({
  db,
  actor,
  selectedAssignClassId,
  onSelectAssignClassId,
  onReload,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo;
  selectedAssignClassId: string | null;
  onSelectAssignClassId: (id: string | null) => void;
  onReload: (silent?: boolean) => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const classes = db.Classes || [];
  const subjects = db.Subjects || [];
  const tcs = db.TeacherClasses || [];
  const gurus = (db.UsersPublic || []).filter(u => u.role === 'guru' || u.role === 'tendik');

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [copySourceId, setCopySourceId] = useState('');

  useEffect(() => {
    if (!selectedAssignClassId) return;
    const classTcs = tcs.filter(t => t.class_id === selectedAssignClassId);
    const next: Record<string, string> = {};
    subjects.forEach(s => {
      const m = classTcs.find(t => t.subject_id === s.id);
      next[s.id] = m ? String(m.teacher_id) : '';
    });
    setDraft(next);
    setCopySourceId('');
  }, [selectedAssignClassId, db.TeacherClasses]);

  if (selectedAssignClassId) {
    const cls = classes.find(c => c.id === selectedAssignClassId) || { id: selectedAssignClassId, name: selectedAssignClassId };
    const others = classes.filter(c => c.id !== selectedAssignClassId);
    const assignedCount = subjects.filter(s => !!draft[s.id]).length;

    const handleCopy = () => {
      if (!copySourceId) {
        onShowToast('Pilih kelas sumber terlebih dahulu.', 'warning');
        return;
      }
      const srcTcs = tcs.filter(x => x.class_id === copySourceId);
      const next: Record<string, string> = {};
      subjects.forEach(s => {
        const m = srcTcs.find(x => x.subject_id === s.id);
        next[s.id] = m ? String(m.teacher_id) : '';
      });
      setDraft(next);
      onShowToast('Disalin. Klik "Simpan Semua Penugasan" untuk menyimpan.', 'success');
    };

    const handleSaveAll = async () => {
      const pairs = subjects.map(s => ({ subject_id: s.id, teacher_id: draft[s.id] || '' }));
      onShowLoader('Menyimpan penugasan mengajar...');
      try {
        await saveClassAssignmentsApi(selectedAssignClassId, pairs, actor);
        await onReload(true);
        onShowToast('Penugasan mengajar tersimpan!', 'success');
      } catch (err: any) {
        onShowToast('Gagal menyimpan: ' + err.message, 'error');
      } finally {
        onHideLoader();
      }
    };

    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectAssignClassId(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
            >
              ← Kembali ke Daftar Kelas
            </button>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Penugasan Mengajar — Kelas {cls.name}</h2>
              <p className="text-xs text-slate-500">
                Mapel mengikuti urutan menu Kelas &amp; Mapel. Pilih guru di sebelah kanan setiap mapel, lalu klik Simpan.
              </p>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-800 text-xs font-bold tabular-nums">
            {assignedCount} dari {subjects.length} mapel sudah ada gurunya
          </span>
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs">
          <select value={copySourceId} onChange={e => setCopySourceId(e.target.value)} className="px-3 py-2 rounded-xl border bg-white">
            <option value="">Salin penugasan dari kelas...</option>
            {others.map(c => (
              <option key={c.id} value={c.id}>
                Kelas {c.name}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleCopy} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 font-bold">
            Terapkan Salinan
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3 w-12">No</th>
                  <th className="p-3">Kode</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">JP/Mgg</th>
                  <th className="p-3 min-w-[240px]">Guru Pengampu</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-400">
                      Belum ada mata pelajaran. Tambahkan di menu Kelas &amp; Mapel.
                    </td>
                  </tr>
                ) : (
                  subjects.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold tabular-nums">{i + 1}</td>
                      <td className="p-3 font-mono">{s.code}</td>
                      <td className="p-3 font-extrabold text-slate-800">{s.name}</td>
                      <td className="p-3 text-center tabular-nums">{s.jp_per_week}</td>
                      <td className="p-3">
                        <select
                          value={draft[s.id] || ''}
                          onChange={e => setDraft(prev => ({ ...prev, [s.id]: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border font-semibold text-indigo-700 bg-white"
                        >
                          <option value="">— Belum ditugaskan —</option>
                          {gurus.map(g => (
                            <option key={g.id} value={g.id}>
                              {g.full_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={handleSaveAll} className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold">
            Simpan Semua Penugasan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Penugasan Mengajar (Semua Kelas)</h2>
        <p className="text-xs text-slate-500">Pilih kartu rombongan belajar di bawah ini untuk mengatur guru pengampu mata pelajaran</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-indigo-800 uppercase">Rekapan Penugasan Mengajar Aktif</p>
          <p className="text-lg font-extrabold text-indigo-950 mt-0.5 tabular-nums">
            {tcs.length} Penugasan Mata Pelajaran tersebar di {classes.length} Rombongan Belajar
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {classes.map(cls => {
          const count = tcs.filter(t => t.class_id === cls.id).length;
          const wali = gurus.find(g => g.id === cls.wali_kelas_id) || { full_name: '-' };
          return (
            <div
              key={cls.id}
              onClick={() => onSelectAssignClassId(cls.id)}
              className="cursor-pointer bg-white p-5 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 hover:shadow-md transition group"
            >
              <div className="flex items-center justify-between">
                <span className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white font-extrabold text-lg flex items-center justify-center transition">
                  {cls.name}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-xs font-bold tabular-nums">{count} Mapel</span>
              </div>
              <h3 className="font-extrabold text-slate-900 text-base mt-4">Rombel Kelas {cls.name}</h3>
              <p className="text-xs text-slate-500 mt-1">Wali Kelas: {wali.full_name}</p>
              <p className="text-xs font-bold text-indigo-600 mt-3 group-hover:underline">Kelola Penugasan Mapel →</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
