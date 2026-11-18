import React, { useState } from 'react';
import { ArrowRight, Download, FileCode2, GraduationCap } from 'lucide-react';
import type { DatabasePayload } from '../types/siakad';
import { getSchoolIdentity, getSettingVal, ROLE_META } from '../utils/siakadEngine';

export function LoginScreen({
  db,
  onQuickLogin,
  onManualLogin,
}: {
  db: DatabasePayload;
  onQuickLogin: (userId: string) => void;
  onManualLogin: (username: string, password: string) => void;
}) {
  const [tab, setTab] = useState<'guru' | 'manual' | 'cepat'>('guru');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const users = db.UsersPublic || [];
  const guruList = users.filter(u => (u.role === 'guru' || u.role === 'tendik') && u.status === 'Aktif');
  const quickOthers = users.filter(
    u => ['admin', 'kepala_sekolah', 'admin_kokurikuler', 'wali_murid'].includes(u.role) && u.status === 'Aktif'
  );
  const idn = getSchoolIdentity(db);

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault();
    onManualLogin(username, password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-teal-900 flex flex-col items-center justify-center p-4 gap-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left Branding Panel */}
        <div className="lg:col-span-5 bg-gradient-to-b from-indigo-700 to-teal-700 p-8 text-white flex flex-col justify-between">
          <div>
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <p className="text-xs font-semibold tracking-wider uppercase text-indigo-100 mb-3">
              T.A. {getSettingVal(db, 'academic_year', '2026/2027')} • {idn.curriculum_name}
            </p>
            <h1 className="text-2xl font-extrabold leading-tight">{idn.school_name}</h1>
            <p className="text-indigo-100 text-sm mt-2 leading-relaxed">
              Sistem Informasi Akademik Terpadu, Penilaian Kurikulum, Kokurikuler (P5), Wali Kelas &amp; Manajemen Sekolah.
            </p>
          </div>
          <div className="mt-8 pt-6 border-t border-white/20 text-xs text-indigo-100 space-y-1">
            <p className="font-semibold text-white">
              {[idn.school_regency, idn.school_province].filter(Boolean).join(', ')}
            </p>
            <p>{idn.school_address}</p>
          </div>
        </div>

        {/* Right Login Tabs */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col">
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6 text-xs sm:text-sm font-semibold">
            <button
              type="button"
              onClick={() => setTab('guru')}
              className={`flex-1 py-2.5 px-3 rounded-lg transition ${
                tab === 'guru' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1. Guru &amp; Tendik
            </button>
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={`flex-1 py-2.5 px-3 rounded-lg transition ${
                tab === 'manual' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2. Login Akun
            </button>
            <button
              type="button"
              onClick={() => setTab('cepat')}
              className={`flex-1 py-2.5 px-3 rounded-lg transition ${
                tab === 'cepat' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3. Pimpinan &amp; Wali
            </button>
          </div>

          {tab === 'guru' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-800 text-base">Pilih Nama Guru / Tendik</h2>
                <span className="text-xs text-slate-500">Deteksi otomatis multi-jabatan</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto custom-scroll pr-1">
                {guruList.map(g => {
                  const jabs = (db.TeacherJabatans || []).filter(j => j.teacher_id === g.id && j.status === 'Aktif');
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onQuickLogin(g.id)}
                      className="text-left p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition group flex items-start gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition">
                        {g.avatar_initials || 'GR'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{g.full_name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {jabs.length > 0
                            ? `${jabs.length + 1} Peran Aktif`
                            : g.role === 'tendik'
                              ? 'Tendik'
                              : 'Guru Mata Pelajaran'}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'manual' && (
            <form onSubmit={handleSubmitManual} className="space-y-4">
              <h2 className="font-bold text-slate-800 text-base">Masuk dengan Username &amp; Password</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Contoh: yohanes.um atau admin"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Default demo: 123456"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition"
              >
                Masuk ke Sistem
              </button>
            </form>
          )}

          {tab === 'cepat' && (
            <div className="space-y-3">
              <h2 className="font-bold text-slate-800 text-base">Akses Cepat Pimpinan, Admin &amp; Wali Murid</h2>
              <div className="grid grid-cols-1 gap-2.5">
                {quickOthers.map(u => {
                  const meta = ROLE_META[u.role] || { label: u.role, badge: 'bg-slate-100 text-slate-700' };
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => onQuickLogin(u.id)}
                      className="p-3.5 rounded-2xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 text-left">
                        <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center">
                          {u.avatar_initials || 'US'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">{u.full_name}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{meta.label}</p>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed Google Apps Script Download Bar */}
      <div className="w-full max-w-4xl bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200/80 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3 text-xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <FileCode2 className="w-5 h-5" />
          </div>
          <div>
            <p className="font-extrabold text-slate-800">Kode Google Apps Script Sudah Diperbaiki (Bebas Halaman Putih)</p>
            <p className="text-slate-500">Unduh langsung file utuh <span className="font-mono font-semibold">Code.gs</span> dan <span className="font-mono font-semibold">Index.html</span> siap pasang ke Google Apps Script.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href="/api/gas-download/Code.gs"
            download="Code.gs"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Code.gs (93 KB)
          </a>
          <a
            href="/api/gas-download/Index.html"
            download="Index.html"
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold inline-flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" /> Index.html (416 KB)
          </a>
        </div>
      </div>
    </div>
  );
}
