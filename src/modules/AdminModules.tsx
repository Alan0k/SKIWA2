import React, { useEffect, useMemo, useState } from 'react';
import { Award, CalendarDays, Download, Eye, FileCode2, Image as ImageIcon, Landmark, MapPin, RotateCcw, School } from 'lucide-react';
import {
  exportDatabaseJsonApi,
  importDatabaseJsonApi,
  importKehadiranGtkApi,
  resetAcademicYearApi,
  saveSchoolSettingsApi,
} from '../api/client';
import { Modal } from '../components/UiPrimitives';
import type { ActorInfo, DatabasePayload, GenericRow, RoleKey, SchoolIdentity, UserPublic } from '../types/siakad';
import {
  exportTableToExcel,
  formatIndoDate,
  getSchoolIdentity,
  getSettingVal,
  kgParse,
  kgStatus,
  renderOfficialLetterheadHtml,
  renderSignatureBlockHtml,
  ROLE_META,
  SCHOOL_FIELDS,
  siEsc,
  siNameCase,
} from '../utils/siakadEngine';

export function KehadiranGtkModule({
  db,
  user,
  activeRole,
  actor,
  onReload,
  onOpenCrud,
  onDeleteRecord,
  onShowToast,
  onShowLoader,
  onHideLoader,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  actor: ActorInfo | null;
  onReload: (silent?: boolean) => Promise<void>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
  onPrintHtml: (html: string) => void;
}) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [who, setWho] = useState('ALL');
  const [tab, setTab] = useState<'rekap' | 'harian'>('rekap');
  const [importOpen, setImportOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const canEdit = ['admin', 'kepala_sekolah'].includes(activeRole);
  const me = String(user.full_name || '').toLowerCase();
  const users = db.UsersPublic || [];
  const gtkRows = db.KehadiranGTK || [];

  const people = useMemo(() => {
    const names = new Map<string, { nama: string; jabatan: string }>();
    users
      .filter(u => ['guru', 'tendik', 'kepala_sekolah'].includes(u.role))
      .forEach(u =>
        names.set(u.full_name.toLowerCase(), {
          nama: u.full_name,
          jabatan: u.role === 'kepala_sekolah' ? 'Kepala Sekolah' : u.role === 'tendik' ? 'Tendik' : 'Guru',
        })
      );
    gtkRows.forEach(r => {
      const k = String(r.nama || '').toLowerCase();
      if (k && !names.has(k)) names.set(k, { nama: String(r.nama), jabatan: String(r.jabatan || '-') });
    });
    return Array.from(names.values()).sort(
      (a, b) => (a.jabatan === 'Kepala Sekolah' ? -1 : 0) - (b.jabatan === 'Kepala Sekolah' ? -1 : 0) || a.nama.localeCompare(b.nama)
    );
  }, [users, gtkRows]);

  const monthRecs = gtkRows.filter(r => String(r.tanggal).startsWith(month));

  const recap = people.map(p => {
    const mine = monthRecs.filter(r => String(r.nama || '').toLowerCase() === p.nama.toLowerCase());
    const countOf = (k: string) => mine.filter(r => kgStatus(r.status) === k).length;
    const hadir = countOf('Hadir');
    const tl = countOf('Terlambat');
    const dl = countOf('Dinas Luar');
    const tot = mine.length;
    return {
      p,
      hadir,
      tl,
      sakit: countOf('Sakit'),
      izin: countOf('Izin'),
      alpa: countOf('Alpa'),
      dl,
      cuti: countOf('Cuti'),
      tot,
      pct: tot ? Math.round(((hadir + tl + dl) * 100) / tot) : null,
    };
  });

  const harianRows = monthRecs
    .filter(r => who === 'ALL' || String(r.nama).toLowerCase() === who.toLowerCase())
    .sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal)) || String(a.nama).localeCompare(String(b.nama)));

  const buildAoa = (): unknown[][] => {
    if (tab === 'rekap') {
      return [
        ['No', 'Nama', 'Jabatan', 'Hadir', 'Terlambat', 'Sakit', 'Izin', 'Alpa', 'Dinas Luar', 'Cuti', 'Total Hari', '% Hadir'],
        ...recap.map((r, i) => [
          i + 1,
          r.p.nama,
          r.p.jabatan,
          r.hadir,
          r.tl,
          r.sakit,
          r.izin,
          r.alpa,
          r.dl,
          r.cuti,
          r.tot,
          r.pct === null ? '-' : `${r.pct}%`,
        ]),
      ];
    }
    return [
      ['Tanggal', 'Nama', 'Jabatan', 'Masuk', 'Pulang', 'Status', 'Keterangan'],
      ...harianRows.map(r => [r.tanggal, r.nama, r.jabatan, r.jam_masuk, r.jam_pulang, r.status, r.keterangan]),
    ];
  };

  const handlePrint = () => {
    const idn = getSchoolIdentity(db);
    const ks = users.find(u => u.role === 'kepala_sekolah') || { full_name: idn.headmaster_name, nip: idn.headmaster_nip };
    const aoa = buildAoa();
    const head = aoa[0] || [];
    const body = aoa.slice(1);
    onPrintHtml(`
      ${renderOfficialLetterheadHtml(idn)}
      <h3 style="text-align:center;font-weight:bold;margin:6px 0">REKAPAN KEHADIRAN KEPALA SEKOLAH, GURU &amp; TENDIK<br>Bulan ${siEsc(month)}</h3>
      <div style="font-size:9pt">
        <table style="width:100%;border-collapse:collapse" border="1" cellpadding="4">
          <thead><tr>${head.map(h => `<th>${siEsc(h)}</th>`).join('')}</tr></thead>
          <tbody>${body.map(r => `<tr>${r.map(c => `<td>${siEsc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
        </table>
      </div>
      ${renderSignatureBlockHtml(db, 'Kepala Sekolah', ks.full_name, ks.nip)}
    `);
  };

  const parsedPreview = useMemo(() => kgParse(pasteText), [pasteText]);
  const validPreview = parsedPreview.filter(r => r.tanggal && r.nama);
  const knownSet = new Set(people.map(p => p.nama.toLowerCase()));
  const unknownNames = Array.from(new Set(validPreview.filter(r => !knownSet.has(String(r.nama).toLowerCase())).map(r => String(r.nama))));

  const handleSaveImport = async () => {
    if (!validPreview.length) {
      onShowToast('Tidak ada baris valid untuk disimpan.', 'warning');
      return;
    }
    onShowLoader(`Mengimpor ${validPreview.length} baris kehadiran...`);
    try {
      const r = await importKehadiranGtkApi(validPreview, actor);
      setImportOpen(false);
      setPasteText('');
      await onReload(true);
      onShowToast(`Impor selesai: ${r.added} baru, ${r.updated} diperbarui.`, 'success');
    } catch (err: any) {
      onShowToast('Gagal impor: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Rekapan Kehadiran Kepala Sekolah, Guru &amp; Tendik</h2>
          <p className="text-xs text-slate-500">
            Sumber: data <strong>KehadiranGTK</strong> (hasil salin dari aplikasi Attendance Management)
            {canEdit ? '' : ' • tampilan hanya-baca'}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onOpenCrud('KehadiranGTK', '')}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold"
            >
              + Input Manual
            </button>
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              Impor / Tempel dari Attendance Management
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="flex rounded-xl overflow-hidden border">
          <button
            type="button"
            onClick={() => setTab('rekap')}
            className={`px-3 py-2 font-bold ${tab === 'rekap' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          >
            Rekap per Orang
          </button>
          <button
            type="button"
            onClick={() => setTab('harian')}
            className={`px-3 py-2 font-bold ${tab === 'harian' ? 'bg-indigo-600 text-white' : 'bg-white'}`}
          >
            Data Harian
          </button>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value || new Date().toISOString().slice(0, 7))}
          className="px-3 py-2 rounded-xl border bg-white"
        />
        {tab === 'harian' && (
          <select value={who} onChange={e => setWho(e.target.value)} className="px-3 py-2 rounded-xl border bg-white">
            <option value="ALL">Semua orang</option>
            {people.map(p => (
              <option key={p.nama} value={p.nama}>
                {p.nama}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => exportTableToExcel(buildAoa(), 'Kehadiran GTK', `Rekap-Kehadiran-GTK-${month}.xlsx`)}
          className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 font-bold"
        >
          ⬇ Excel
        </button>
        <button type="button" onClick={handlePrint} className="px-3 py-2 rounded-xl bg-slate-100 font-bold">
          Cetak
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3">
        {tab === 'rekap' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3">No</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3 text-center">Hadir</th>
                  <th className="p-3 text-center">Terlambat</th>
                  <th className="p-3 text-center">Sakit</th>
                  <th className="p-3 text-center">Izin</th>
                  <th className="p-3 text-center">Alpa</th>
                  <th className="p-3 text-center">Dinas Luar</th>
                  <th className="p-3 text-center">Cuti</th>
                  <th className="p-3 text-center">Total Hari</th>
                  <th className="p-3 text-center">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recap.map((r, i) => (
                  <tr
                    key={r.p.nama}
                    className={r.p.nama.toLowerCase() === me ? 'bg-indigo-50 font-bold' : 'hover:bg-slate-50'}
                  >
                    <td className="p-3 tabular-nums">{i + 1}</td>
                    <td className="p-3 font-bold">{r.p.nama}</td>
                    <td className="p-3">{r.p.jabatan}</td>
                    <td className="p-3 text-center tabular-nums">{r.hadir}</td>
                    <td className="p-3 text-center tabular-nums">{r.tl}</td>
                    <td className="p-3 text-center tabular-nums">{r.sakit}</td>
                    <td className="p-3 text-center tabular-nums">{r.izin}</td>
                    <td className={`p-3 text-center tabular-nums ${r.alpa ? 'text-rose-600 font-bold' : ''}`}>{r.alpa}</td>
                    <td className="p-3 text-center tabular-nums">{r.dl}</td>
                    <td className="p-3 text-center tabular-nums">{r.cuti}</td>
                    <td className="p-3 text-center tabular-nums">{r.tot}</td>
                    <td
                      className={`p-3 text-center font-extrabold tabular-nums ${
                        r.pct == null
                          ? 'text-slate-400'
                          : r.pct >= 90
                            ? 'text-emerald-700'
                            : r.pct >= 75
                              ? 'text-amber-600'
                              : 'text-rose-600'
                      }`}
                    >
                      {r.pct == null ? '-' : `${r.pct}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Masuk</th>
                  <th className="p-3">Pulang</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Keterangan</th>
                  {canEdit && <th className="p-3 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {harianRows.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 8 : 7} className="p-6 text-center text-slate-400">
                      Belum ada data kehadiran pada bulan ini.
                    </td>
                  </tr>
                ) : (
                  harianRows.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap tabular-nums">{r.tanggal}</td>
                      <td className="p-3 font-bold">{r.nama}</td>
                      <td className="p-3">{r.jabatan}</td>
                      <td className="p-3 tabular-nums">{r.jam_masuk}</td>
                      <td className="p-3 tabular-nums">{r.jam_pulang}</td>
                      <td className="p-3 font-bold">{r.status}</td>
                      <td className="p-3 text-slate-500">{r.keterangan}</td>
                      {canEdit && (
                        <td className="p-3 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => onOpenCrud('KehadiranGTK', r.id)}
                            className="text-indigo-600 font-bold"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteRecord('KehadiranGTK', r.id)}
                            className="text-rose-600 font-bold"
                          >
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={importOpen}
        title="Impor Kehadiran dari Attendance Management v4.8.9"
        onClose={() => setImportOpen(false)}
        maxWidthClass="max-w-4xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveImport}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Simpan ke Database
            </button>
          </>
        }
      >
        <div className="space-y-3 text-xs">
          <p>
            Salin (Ctrl+C) tabel kehadiran dari aplikasi Attendance Management, lalu tempel di bawah. Jika baris pertama
            berisi judul kolom (Nama, Tanggal, Masuk, Pulang, Status, Keterangan), urutan kolom dikenali otomatis. Tanpa
            judul, urutan dianggap: <strong>Tanggal, Nama, Jam Masuk, Jam Pulang, Status, Keterangan</strong>. Data dengan
            tanggal + nama yang sama akan diperbarui, bukan digandakan.
          </p>
          <textarea
            rows={8}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border font-mono"
            placeholder="Tempel data di sini..."
          />
          {!pasteText.trim() ? (
            <div className="text-slate-500">Belum ada data.</div>
          ) : (
            <div className="text-slate-600">
              <p>
                <strong>{validPreview.length}</strong> baris valid dari {parsedPreview.length} baris
                {parsedPreview.length - validPreview.length > 0 && (
                  <span className="text-rose-600">
                    {' '}
                    ({parsedPreview.length - validPreview.length} dilewati: tanggal/nama tidak terbaca)
                  </span>
                )}
                .
                {unknownNames.length > 0 && (
                  <span className="text-amber-600">
                    {' '}
                    Nama belum ada di data pengguna: {unknownNames.slice(0, 5).join(', ')}
                    {unknownNames.length > 5 ? '...' : ''}
                  </span>
                )}
              </p>
              <div className="overflow-x-auto max-h-48 mt-2">
                <table className="w-full">
                  <tbody>
                    {validPreview.slice(0, 8).map((r, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-1">{r.tanggal}</td>
                        <td className="p-1">{r.nama}</td>
                        <td className="p-1">{r.jam_masuk}</td>
                        <td className="p-1">{r.jam_pulang}</td>
                        <td className="p-1 font-bold">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

export function SchoolIdentityModule({
  db,
  actor,
  onReload,
  onNavigateMenu,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo | null;
  onReload: (silent?: boolean) => Promise<void>;
  onNavigateMenu: (menuId: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const saved = getSchoolIdentity(db);
  const [form, setForm] = useState<SchoolIdentity>(saved);
  const [confirmPending, setConfirmPending] = useState<SchoolIdentity | null>(null);

  useEffect(() => {
    setForm(getSchoolIdentity(db));
  }, [db.Settings]);

  const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    school: School,
    'map-pin': MapPin,
    award: Award,
    'calendar-days': CalendarDays,
  };

  const handleLogoUpload = (side: 'school_logo_left' | 'school_logo_right', file?: File) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      onShowToast('File harus berupa gambar (PNG/JPG).', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        let out = '';
        const sizes = [220, 180, 150, 120, 96];
        for (let k = 0; k < sizes.length && !out; k++) {
          const sc = Math.min(1, sizes[k] / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * sc));
          c.height = Math.max(1, Math.round(img.height * sc));
          c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
          let d = c.toDataURL('image/png');
          if (d.length > 45000) {
            const c2 = document.createElement('canvas');
            c2.width = c.width;
            c2.height = c.height;
            const ctx2 = c2.getContext('2d');
            if (ctx2) {
              ctx2.fillStyle = '#fff';
              ctx2.fillRect(0, 0, c2.width, c2.height);
              ctx2.drawImage(img, 0, 0, c2.width, c2.height);
              d = c2.toDataURL('image/jpeg', 0.85);
            }
          }
          if (d.length <= 45000) out = d;
        }
        if (!out) {
          onShowToast('Gambar terlalu kompleks/besar. Gunakan logo yang lebih sederhana.', 'error');
          return;
        }
        setForm(prev => ({ ...prev, [side]: out }));
      };
      img.onerror = () => onShowToast('Gambar tidak dapat dibaca.', 'error');
      if (typeof ev.target?.result === 'string') {
        img.src = ev.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const validate = (v: SchoolIdentity): string => {
    if (!v.school_name.trim()) return 'Nama sekolah wajib diisi.';
    if (!v.headmaster_name.trim()) return 'Nama kepala sekolah wajib diisi.';
    if (v.school_npsn && !/^\d{8}$/.test(v.school_npsn.trim())) return 'NPSN harus 8 digit angka.';
    if (v.school_postal_code && !/^\d{5}$/.test(v.school_postal_code.trim())) return 'Kode pos harus 5 digit angka.';
    if (v.school_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.school_email.trim())) return 'Format email tidak valid.';
    const m = /^(\d{4})\/(\d{4})$/.exec(v.academic_year.trim());
    if (!m || Number(m[2]) !== Number(m[1]) + 1) {
      return 'Tahun ajaran harus berformat 2026/2027 (tahun kedua = tahun pertama + 1).';
    }
    const jp = Number(v.jp_duration_minutes);
    if (!(jp >= 1 && jp <= 120) || Math.floor(jp) !== jp) return 'Durasi 1 JP harus angka bulat 1–120 menit.';
    return '';
  };

  const persist = async (v: SchoolIdentity) => {
    onShowLoader('Menyimpan identitas sekolah...');
    try {
      const cleaned: Record<string, string> = {};
      (Object.keys(v) as Array<keyof SchoolIdentity>).forEach(k => {
        cleaned[k] = typeof v[k] === 'string' ? v[k].trim() : String(v[k] || '');
      });
      const res = await saveSchoolSettingsApi(cleaned, actor);
      await onReload(true);
      onShowToast(
        res.changed && res.changed.length ? 'Identitas sekolah berhasil disimpan!' : 'Tidak ada perubahan untuk disimpan.',
        'success'
      );
    } catch (err: any) {
      onShowToast('Gagal menyimpan: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleSave = () => {
    const err = validate(form);
    if (err) {
      onShowToast(err, 'warning');
      return;
    }
    const cur = getSchoolIdentity(db);
    if (form.academic_year.trim() !== cur.academic_year || form.active_semester !== cur.active_semester) {
      setConfirmPending(form);
      return;
    }
    persist(form);
  };

  const previewHtml =
    renderOfficialLetterheadHtml(form) +
    `<div style="display:flex;justify-content:flex-end;font-size:10pt;">
      <div style="text-align:center;width:260px;">
        <p>${siEsc(form.report_place)}, ${siEsc(formatIndoDate(form.report_date) || '…')}</p>
        <p>Kepala ${siEsc(siNameCase(form.school_name))},</p>
        <div style="height:40px;"></div>
        <p style="font-weight:bold;text-decoration:underline;">${siEsc(form.headmaster_name)}</p>
        <p>NIP. ${siEsc(form.headmaster_nip || '-')}</p>
      </div>
    </div>
    <p style="font-size:9pt;margin-top:8px;color:#64748b;">Tahun Ajaran ${siEsc(form.academic_year)} • Semester ${siEsc(form.active_semester)} • ${siEsc(form.curriculum_name)}</p>`;

  const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-semibold focus:outline-none focus:border-indigo-500 bg-white';

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-indigo-700 to-teal-700 text-white p-6 rounded-3xl shadow-md flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <Landmark className="w-6 h-6" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">Pengaturan • Khusus Admin</span>
          <h2 className="text-2xl font-extrabold mt-0.5">Identitas Sekolah</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Data di sini dipakai otomatis pada kop surat, raport, tanda tangan kepala sekolah, halaman login, dan header aplikasi.
          </p>
        </div>
      </div>

      {SCHOOL_FIELDS.map(g => {
        const Icon = GROUP_ICONS[g.icon] || School;
        return (
          <div key={g.g} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Icon className="w-4 h-4 text-indigo-600" />
              <span>{g.g}</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {g.items.map(f => (
                <div key={f.k} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                  <label className="block font-bold text-slate-700 mb-1">
                    {f.l}
                    {f.req ? <span className="text-rose-600"> *</span> : null}
                  </label>
                  {f.t === 'select' ? (
                    <select
                      value={form[f.k] || ''}
                      onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className={inputCls}
                    >
                      {(f.opts || []).map(o => (
                        <option key={o} value={o}>
                          {o === '' ? '— Pilih —' : o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.t}
                      value={form[f.k] || ''}
                      placeholder={f.ph}
                      maxLength={f.max}
                      min={f.t === 'number' ? 1 : undefined}
                      max={f.t === 'number' ? 120 : undefined}
                      onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                      className={inputCls}
                    />
                  )}
                  {f.help && <p className="text-[11px] text-slate-500 mt-1">{f.help}</p>}
                </div>
              ))}
            </div>
            {g.g === 'Tahun Ajaran & Dokumen' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                Mengubah tahun ajaran / semester di sini <strong>hanya mengganti label &amp; nilai bawaan</strong>, data lama
                tidak dihapus. Untuk memulai tahun pelajaran baru dengan data kosong, gunakan menu{' '}
                <button type="button" onClick={() => onNavigateMenu('reset_data')} className="font-extrabold underline">
                  Reset Data (Tahun Baru)
                </button>
                .
              </div>
            )}
          </div>
        );
      })}

      {/* Logo Kop Surat */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-indigo-600" />
          <span>Logo Kop Surat</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {(['school_logo_left', 'school_logo_right'] as const).map(side => (
            <div key={side} className="p-4 rounded-xl border border-dashed border-slate-300 flex items-center gap-4">
              <div className="w-20 h-20 shrink-0 rounded-lg bg-slate-50 border flex items-center justify-center overflow-hidden">
                {form[side] ? (
                  <img src={form[side]} alt={side} className="max-w-full max-h-full object-contain" />
                ) : (
                  <span className="text-[10px] text-slate-400 text-center px-1">Belum ada logo</span>
                )}
              </div>
              <div className="space-y-2 min-w-0">
                <p className="font-bold text-slate-700">Logo {side === 'school_logo_left' ? 'Kiri' : 'Kanan'}</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleLogoUpload(side, e.target.files?.[0])}
                  className="text-[11px] block max-w-full"
                />
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, [side]: '' }))}
                  className="text-rose-600 font-bold"
                >
                  Hapus logo
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500">
          Gambar diperkecil otomatis (±220 px). Gunakan PNG/JPG berbentuk persegi. Klik &quot;Simpan Identitas Sekolah&quot;
          agar logo tersimpan dan tampil di semua kop surat.
        </p>
      </div>

      {/* Live Preview */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-600" />
          <span>Pratinjau Kop Surat &amp; Tanda Tangan</span>
        </h3>
        <div
          className="border border-dashed border-slate-300 rounded-xl p-4 bg-white text-slate-900 overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => setForm(getSchoolIdentity(db))}
          className="sm:w-48 py-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-sm"
        >
          Batalkan Perubahan
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md"
        >
          Simpan Identitas Sekolah
        </button>
      </div>

      <Modal
        open={Boolean(confirmPending)}
        title="Konfirmasi Perubahan Tahun Ajaran / Semester"
        onClose={() => setConfirmPending(null)}
        maxWidthClass="max-w-lg"
        footer={
          <>
            <button
              type="button"
              onClick={() => setConfirmPending(null)}
              className="px-4 py-2 rounded-xl bg-slate-200 text-sm font-semibold"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={() => {
                const pending = confirmPending;
                setConfirmPending(null);
                if (pending) persist(pending);
              }}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Ya, Simpan
            </button>
          </>
        }
      >
        {confirmPending && (
          <p className="text-sm text-slate-700">
            Tahun ajaran/semester aktif akan berubah dari{' '}
            <strong>
              {saved.academic_year} ({saved.active_semester})
            </strong>{' '}
            menjadi{' '}
            <strong>
              {confirmPending.academic_year} ({confirmPending.active_semester})
            </strong>
            . Data nilai dan absensi yang sudah ada <strong>tidak</strong> ikut berubah atau terhapus. Lanjutkan?
          </p>
        )}
      </Modal>
    </div>
  );
}

export function SystemAdminModule({
  db,
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
  actor: ActorInfo | null;
  onReload: (silent?: boolean) => Promise<void>;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const users = db.UsersPublic || [];
  const logs = [...(db.ActivityLogs || [])].slice(-15).reverse();

  const [addOpen, setAddOpen] = useState(false);
  const [uFull, setUFull] = useState('');
  const [uName, setUName] = useState('');
  const [uRole, setURole] = useState<RoleKey>('guru');
  const [uNip, setUNip] = useState('');

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');

  const handleDownloadBackup = async () => {
    onShowLoader('Membuat file backup JSON...');
    try {
      const json = await exportDatabaseJsonApi();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_SMPK_Waibakul_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Backup JSON berhasil diunduh!', 'success');
    } catch (err: any) {
      onShowToast('Gagal export JSON: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleRunRestore = async () => {
    if (!restoreText.trim()) return;
    onShowLoader('Merestore database...');
    try {
      await importDatabaseJsonApi(restoreText, actor);
      await onReload(true);
      onShowToast('Database berhasil direstore!', 'success');
      setRestoreOpen(false);
      setRestoreText('');
    } catch (err: any) {
      onShowToast('JSON tidak valid: ' + (err?.message || err), 'error');
    } finally {
      onHideLoader();
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'Users',
      {
        full_name: uFull,
        username: uName,
        role: uRole,
        nip: uNip,
        avatar_initials: uFull.substring(0, 2).toUpperCase(),
        status: 'Aktif',
      },
      'Pengguna baru ditambahkan (Password default: 123456)'
    );
    setUFull('');
    setUName('');
    setUNip('');
    setAddOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-slate-900">Kelola Pengguna, RBAC &amp; Backup JSON</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
          >
            Download Backup JSON
          </button>
          <button
            type="button"
            onClick={() => setRestoreOpen(true)}
            className="px-4 py-2 rounded-xl bg-amber-500 text-slate-900 text-xs font-bold"
          >
            Restore JSON
          </button>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            + Tambah Pengguna
          </button>
        </div>
      </div>

      {/* Fixed GAS deployment download bar */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-extrabold text-emerald-950">Kode Utuh Google Apps Script (Sudah Diperbaiki &amp; Siap Pakai)</p>
            <p className="text-emerald-800">
              Unduh file <span className="font-mono font-semibold">Code.gs</span> dan{' '}
              <span className="font-mono font-semibold">Index.html</span> yang sudah bebas dari bug halaman putih.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href="/api/gas-download/Code.gs"
            download="Code.gs"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Code.gs
          </a>
          <a
            href="/api/gas-download/Index.html"
            download="Index.html"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Index.html
          </a>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="p-3">Nama Lengkap</th>
                <th className="p-3">Username</th>
                <th className="p-3">Role Utama</th>
                <th className="p-3">NIP / ID</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold">{u.full_name}</td>
                  <td className="p-3 font-mono">{u.username}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold">{u.role}</span>
                  </td>
                  <td className="p-3">{u.nip || '-'}</td>
                  <td className="p-3 text-emerald-700 font-bold">{u.status}</td>
                  <td className="p-3 text-right space-x-2">
                    <button type="button" onClick={() => onOpenCrud('Users', u.id)} className="text-indigo-600 font-bold">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDeleteRecord('Users', u.id)} className="text-rose-600 font-bold">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="font-bold text-slate-800 text-sm mb-3">Log Aktivitas Sistem Terbaru</h3>
        <div className="space-y-1.5 text-xs max-h-60 overflow-y-auto">
          {logs.map((l, idx) => (
            <div key={l.id || idx} className="p-2 rounded bg-slate-50 flex justify-between gap-2">
              <span>
                <strong>[{l.action}]</strong> {l.user_name}: {l.detail}
              </span>
              <span className="text-slate-400 shrink-0 tabular-nums">{l.timestamp}</span>
            </div>
          ))}
        </div>
      </div>

      <Modal open={addOpen} title="Tambah Pengguna Sistem" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleAddUser} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold mb-1">Nama Lengkap &amp; Gelar</label>
            <input required value={uFull} onChange={e => setUFull(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Username</label>
            <input required value={uName} onChange={e => setUName(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Role Dasar</label>
            <select value={uRole} onChange={e => setURole(e.target.value as RoleKey)} className="w-full px-3 py-2 rounded-xl border bg-white">
              {(Object.keys(ROLE_META) as RoleKey[]).map(r => (
                <option key={r} value={r}>
                  {ROLE_META[r].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold mb-1">NIP / Student ID (untuk Wali Murid)</label>
            <input value={uNip} onChange={e => setUNip(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Simpan Pengguna
          </button>
        </form>
      </Modal>

      <Modal open={restoreOpen} title="Restore Database dari File JSON" onClose={() => setRestoreOpen(false)}>
        <div className="space-y-3 text-xs">
          <p className="text-rose-700 font-semibold">
            Perhatian: Proses restore akan menimpa data pada database sesuai isi file JSON.
          </p>
          <textarea
            rows={6}
            value={restoreText}
            onChange={e => setRestoreText(e.target.value)}
            placeholder="Tempelkan isi file JSON backup di sini..."
            className="w-full p-3 rounded-xl border font-mono"
          />
          <button
            type="button"
            onClick={handleRunRestore}
            className="w-full py-2.5 rounded-xl bg-amber-500 text-slate-900 font-bold"
          >
            Jalankan Restore Database
          </button>
        </div>
      </Modal>
    </div>
  );
}

export function ResetDataModule({
  db,
  actor,
  onResetComplete,
  onShowToast,
  onShowLoader,
  onHideLoader,
}: {
  db: DatabasePayload;
  actor: ActorInfo | null;
  onResetComplete: () => Promise<void>;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onShowLoader: (text: string) => void;
  onHideLoader: () => void;
}) {
  const curYear = getSettingVal(db, 'academic_year', '2026/2027');
  const curSem = getSettingVal(db, 'active_semester', 'Ganjil');
  const [newYear, setNewYear] = useState('2027/2028');
  const [newSem, setNewSem] = useState('Ganjil');
  const [keepUsers, setKeepUsers] = useState(true);
  const [keepSubjects, setKeepSubjects] = useState(true);
  const [confirmText, setConfirmText] = useState('');

  const canReset = confirmText.trim().toUpperCase() === 'RESET DATA';

  const handleDownloadBackup = async () => {
    onShowLoader('Membuat file backup JSON...');
    try {
      const json = await exportDatabaseJsonApi();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Backup_SMPK_Waibakul_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      onShowToast('Backup JSON berhasil diunduh!', 'success');
    } finally {
      onHideLoader();
    }
  };

  const handleExecuteReset = async () => {
    if (!canReset) {
      onShowToast('Ketik RESET DATA terlebih dahulu untuk konfirmasi.', 'warning');
      return;
    }
    onShowLoader('Mengosongkan database & menyiapkan tahun pelajaran baru...');
    try {
      const res = await resetAcademicYearApi(
        {
          newAcademicYear: newYear.trim() || '2027/2028',
          newSemester: newSem,
          keepUsers,
          keepSubjects,
        },
        actor
      );
      if (res?.success) {
        setConfirmText('');
        await onResetComplete();
        onShowToast(
          `Database berhasil dikosongkan! Aplikasi siap untuk T.A. ${res.newAcademicYear} (${res.newSemester}).`,
          'success'
        );
      }
    } catch (e: any) {
      onShowToast('Gagal mereset database: ' + (e?.message || e), 'error');
    } finally {
      onHideLoader();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-rose-700 to-amber-700 text-white p-6 rounded-3xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-200">
              Manajemen Siklus Tahunan • Khusus Admin
            </span>
            <h2 className="text-2xl font-extrabold mt-0.5">Reset Data Aplikasi (Tahun Pelajaran Baru)</h2>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-rose-100 mt-3 leading-relaxed">
          Gunakan fitur ini pada akhir tahun pelajaran untuk mengosongkan seluruh data akademik, nilai, absensi, jurnal,
          raport, dan rombongan belajar sehingga aplikasi siap digunakan kembali dari awal pada tahun pelajaran berikutnya.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h3 className="font-extrabold text-slate-800 text-sm">
          Ringkasan Data Tersimpan Saat Ini (T.A. {curYear} — {curSem})
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-50 border">
            <p className="text-xs text-slate-500">Siswa</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{(db.Students || []).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border">
            <p className="text-xs text-slate-500">Kelas</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{(db.Classes || []).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border">
            <p className="text-xs text-slate-500">Sesi KBM</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{(db.AttendanceSessions || []).length}</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border">
            <p className="text-xs text-slate-500">Data Nilai/Absen</p>
            <p className="text-xl font-extrabold text-slate-900 tabular-nums">{(db.AttendanceRecords || []).length}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-bold text-amber-900 text-xs sm:text-sm">Langkah 1 (Disarankan): Unduh Arsip Cadangan JSON</p>
            <p className="text-xs text-amber-800 mt-0.5">
              Simpan arsip seluruh nilai, leger, dan data tahun {curYear} ke komputer sebelum menghapus.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shrink-0"
          >
            Download Backup JSON
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-rose-200 p-6 space-y-4">
        <h3 className="font-extrabold text-rose-800 text-base">Langkah 2: Konfigurasi Tahun Pelajaran Baru &amp; Reset</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tahun Pelajaran Baru</label>
            <input
              type="text"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              placeholder="Contoh: 2027/2028"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Semester Awal</label>
            <select
              value={newSem}
              onChange={e => setNewSem(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold bg-white"
            >
              <option value="Ganjil">Ganjil</option>
              <option value="Genap">Genap</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 pt-1 text-xs">
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={keepUsers}
              onChange={e => setKeepUsers(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600"
            />
            <div>
              <span className="font-bold text-slate-800">Pertahankan Data Akun Guru &amp; Pegawai (Users)</span>
              <p className="text-slate-500 mt-0.5">
                Jika dicentang, akun login guru tetap tersedia tanpa perlu input ulang. Jika tidak dicentang, hanya akun
                Admin utama yang dipertahankan.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={keepSubjects}
              onChange={e => setKeepSubjects(e.target.checked)}
              className="mt-0.5 rounded text-indigo-600"
            />
            <div>
              <span className="font-bold text-slate-800">Pertahankan Master Daftar Mata Pelajaran</span>
              <p className="text-slate-500 mt-0.5">
                Mempertahankan daftar kode dan nama mata pelajaran standar SMP Kristen Waibakul.
              </p>
            </div>
          </label>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
          <p className="font-bold text-rose-800">Konfirmasi Keamanan:</p>
          <p className="text-rose-700">
            Seluruh data Siswa, Rombel/Kelas, Penugasan Mengajar, Jabatan Tambahan, Absensi, Nilai, Jurnal KBM, Kokurikuler
            P5, Pelanggaran, Prestasi, Sarpras, Humas, dan Pengumuman akan dikosongkan permanen. Ketik{' '}
            <strong>RESET DATA</strong> di bawah ini untuk mengaktifkan tombol reset:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Ketik: RESET DATA"
            className="w-full px-3.5 py-2.5 rounded-xl border-2 border-rose-300 font-extrabold uppercase tracking-wider focus:outline-none focus:border-rose-600"
          />
        </div>

        <button
          type="button"
          disabled={!canReset}
          onClick={handleExecuteReset}
          className="w-full py-3.5 rounded-xl bg-rose-600 disabled:bg-slate-300 disabled:text-slate-500 hover:bg-rose-700 text-white font-extrabold text-sm shadow-md transition"
        >
          Kosongkan Semua Data &amp; Mulai Tahun Pelajaran Baru
        </button>
      </div>
    </div>
  );
}

export function PengumumanModule({
  db,
  user,
  onSaveRecord,
  onOpenCrud,
  onDeleteRecord,
  onPrintHtml,
}: {
  db: DatabasePayload;
  user: UserPublic;
  onSaveRecord: (sheet: string, obj: GenericRow, msg: string) => Promise<any>;
  onOpenCrud: (sheet: string, id: string) => void;
  onDeleteRecord: (sheet: string, id: string) => void;
  onPrintHtml: (html: string) => void;
}) {
  const idn = getSchoolIdentity(db);
  const list = [...(db.Announcements || [])].sort(
    (a, b) => (String(b.is_pinned) === 'true' ? 1 : 0) - (String(a.is_pinned) === 'true' ? 1 : 0)
  );

  const [addOpen, setAddOpen] = useState(false);
  const [cat, setCat] = useState('Akademik');
  const [pri, setPri] = useState('Biasa');
  const [pin, setPin] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handlePrint = (a: GenericRow) => {
    onPrintHtml(`
      ${renderOfficialLetterheadHtml(idn)}
      <h3 style="text-align:center;font-weight:bold;text-decoration:underline;margin:14px 0;">PENGUMUMAN / EDARAN SEKOLAH</h3>
      <p style="font-size:10pt;">Perihal: <strong>${siEsc(a.title)}</strong> (${siEsc(a.category)})</p>
      <p style="font-size:10pt;">Tanggal: ${siEsc(a.created_at)}</p>
      <div style="margin:18px 0;font-size:11pt;line-height:1.6;">${siEsc(a.content)}</div>
      ${renderSignatureBlockHtml(db, 'Kepala ' + siNameCase(idn.school_name), idn.headmaster_name, idn.headmaster_nip)}
    `);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSaveRecord(
      'Announcements',
      {
        created_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
        author_id: user.id,
        author_name: user.full_name,
        category: cat,
        priority: pri,
        is_pinned: pin ? 'true' : 'false',
        title,
        content,
      },
      'Pengumuman diterbitkan!'
    );
    setTitle('');
    setContent('');
    setPin(false);
    setAddOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Papan Pengumuman &amp; Edaran Resmi Sekolah</h2>
          <p className="text-xs text-slate-500">
            Informasi kedinasan, akademik, kesiswaan, dan agenda {siNameCase(idn.school_name)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
        >
          + Buat Pengumuman
        </button>
      </div>

      <div className="space-y-3">
        {list.map(a => (
          <div
            key={a.id}
            className={`bg-white p-5 rounded-2xl border ${
              String(a.is_pinned) === 'true' ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200'
            } space-y-2`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs">
                {String(a.is_pinned) === 'true' && (
                  <span className="px-2 py-0.5 rounded bg-amber-500 text-white font-bold">📌 PIN</span>
                )}
                <span className="px-2.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">{a.category}</span>
                <span
                  className={`px-2.5 py-0.5 rounded font-bold ${
                    a.priority === 'Mendesak' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {a.priority}
                </span>
                <span className="text-slate-400">
                  {a.created_at} • Oleh: {a.author_name}
                </span>
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handlePrint(a)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white font-bold"
                >
                  Cetak Edaran
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCrud('Announcements', a.id)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteRecord('Announcements', a.id)}
                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold"
                >
                  Hapus
                </button>
              </div>
            </div>
            <h3 className="font-extrabold text-base text-slate-900">{a.title}</h3>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{a.content}</p>
          </div>
        ))}
      </div>

      <Modal open={addOpen} title="Buat Pengumuman / Edaran Baru" onClose={() => setAddOpen(false)}>
        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold mb-1">Kategori</label>
              <select value={cat} onChange={e => setCat(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                {['Akademik', 'Kedinasan', 'Kesiswaan', 'Sarpras', 'Kegiatan', 'Umum'].map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-bold mb-1">Prioritas</label>
              <select value={pri} onChange={e => setPri(e.target.value)} className="w-full px-3 py-2 rounded-xl border bg-white">
                {['Biasa', 'Penting', 'Mendesak'].map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block font-bold mb-1">Judul Pengumuman</label>
            <input required value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <div>
            <label className="block font-bold mb-1">Isi Pengumuman</label>
            <textarea required rows={4} value={content} onChange={e => setContent(e.target.value)} className="w-full px-3 py-2 rounded-xl border" />
          </div>
          <label className="flex items-center gap-2 font-bold">
            <input type="checkbox" checked={pin} onChange={e => setPin(e.target.checked)} />
            <span>Sematkan (Pin) di paling atas</span>
          </label>
          <button type="submit" className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold">
            Terbitkan Pengumuman
          </button>
        </form>
      </Modal>
    </div>
  );
}
