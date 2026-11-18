import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Layers } from 'lucide-react';
import {
  deleteRecordApi,
  fetchBootstrap,
  loginApi,
  saveRecordApi,
} from './api/client';
import { AppShell, DynIcon } from './components/AppShell';
import { LoginScreen } from './components/LoginScreen';
import {
  CrudModal,
  DeleteConfirmModal,
  GlobalLoader,
  Modal,
  ToastContainer,
  type ToastItem,
} from './components/UiPrimitives';
import {
  KehadiranGtkModule,
  PengumumanModule,
  ResetDataModule,
  SchoolIdentityModule,
  SystemAdminModule,
} from './modules/AdminModules';
import {
  AdminKepsekDashboard,
  GuruBeranda,
  WaliKelasBeranda,
} from './modules/Dashboards';
import {
  AdditionalAssignmentsModule,
  EkskulModule,
  GuruWaliModule,
  PelanggaranModule,
} from './modules/EkskulGuruWaliModules';
import {
  CpAtpProtaModule,
  GuruJadwalModule,
  GuruJurnalModule,
  GuruMyClasses,
} from './modules/GuruWorkspace';
import { KokurikulerModule } from './modules/KokurikulerModule';
import {
  ClassesSubjectsModule,
  StudentsModule,
  TeacherJabatansModule,
  TeachingAssignmentsModule,
} from './modules/StudentsClassesModules';
import {
  JadwalAdminModule,
  WakaHumasModule,
  WakaKesiswaanModule,
  WakaKurikulumModule,
  WakaSarprasModule,
} from './modules/WakaModules';
import {
  AbsensiRekapModule,
  AbsensiWaliModule,
  getActiveWaliClass,
  LegerNilaiModule,
  RaportCenterModule,
  WkDataKelasModule,
  WkDataSiswaModule,
} from './modules/WaliKelasModules';
import { WaliMuridModule } from './modules/WaliMuridModule';
import type {
  ActorInfo,
  AvailableRoleOption,
  DatabasePayload,
  GenericRow,
  RoleKey,
  UserPublic,
} from './types/siakad';
import { ROLE_META } from './utils/siakadEngine';

function getDefaultMenu(roleKey: RoleKey): string {
  if (roleKey === 'wali_murid') return 'wm_beranda';
  if (roleKey === 'admin_kokurikuler') return 'p5_dashboard';
  return 'dashboard';
}

export default function App() {
  const [db, setDb] = useState<DatabasePayload | null>(null);
  const [bootError, setBootError] = useState<string>('');
  const [loader, setLoader] = useState<{ visible: boolean; text: string }>({
    visible: true,
    text: 'Menghubungkan ke SIAKAD SMP Kristen Waibakul...',
  });
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Auth & Navigation state
  const [user, setUser] = useState<UserPublic | null>(null);
  const [activeRole, setActiveRole] = useState<RoleKey | null>(null);
  const [activeTargetId, setActiveTargetId] = useState<string>('');
  const [availableRoles, setAvailableRoles] = useState<AvailableRoleOption[]>([]);
  const [activeMenu, setActiveMenu] = useState<string>('dashboard');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [roleSwitcherOpen, setRoleSwitcherOpen] = useState<boolean>(false);

  // Module interaction states
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [autoOpenAddSession, setAutoOpenAddSession] = useState<boolean>(false);
  const [selectedAssignClassId, setSelectedAssignClassId] = useState<string | null>(null);
  const [selectedEkskulId, setSelectedEkskulId] = useState<string | null>(null);
  const [adminLegerTab, setAdminLegerTab] = useState<'leger' | 'raport'>('leger');

  // CRUD & Delete modals + Print area
  const [crudState, setCrudState] = useState<{ open: boolean; sheet: string; recordId: string }>({
    open: false,
    sheet: '',
    recordId: '',
  });
  const [pendingDelete, setPendingDelete] = useState<{
    sheet: string;
    id: string;
    msg?: string;
  } | null>(null);
  const [printHtml, setPrintHtml] = useState<string>('');

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    },
    []
  );

  const showLoader = useCallback((text = 'Memproses data...') => {
    setLoader({ visible: true, text });
  }, []);

  const hideLoader = useCallback(() => {
    setLoader(prev => ({ ...prev, visible: false }));
  }, []);

  const loadAppData = useCallback(
    async (silent = false) => {
      if (!silent) showLoader('Mengambil data database SIAKAD...');
      try {
        const res = await fetchBootstrap();
        setDb(res);
        setBootError('');
        if (!silent && Array.isArray(res._warnings) && res._warnings.length > 0) {
          showToast(
            `${res._warnings.length} tabel perlu diperiksa: ${res._warnings[0]}`,
            'warning'
          );
        }
      } catch (err: any) {
        const msg = err?.message || String(err);
        if (!silent) {
          setBootError(msg);
        }
        showToast('Gagal memuat database: ' + msg, 'error');
      } finally {
        if (!silent) hideLoader();
      }
    },
    [showLoader, hideLoader, showToast]
  );

  useEffect(() => {
    loadAppData(false);
  }, [loadAppData]);

  const actor: ActorInfo | null = user
    ? {
        id: user.id,
        full_name: user.full_name,
        activeRole: activeRole || user.role,
      }
    : null;

  const applyActiveRole = useCallback((roleKey: RoleKey, targetId = '') => {
    setActiveRole(roleKey);
    setActiveTargetId(targetId);
    setActiveMenu(getDefaultMenu(roleKey));
    setMobileDrawerOpen(false);
    setSelectedEkskulId(null);
  }, []);

  const handleLoginSuccess = useCallback(
    (loggedUser: UserPublic, roles: AvailableRoleOption[]) => {
      setUser(loggedUser);
      setAvailableRoles(roles);
      const first = roles[0] || {
        role_key: loggedUser.role,
        label: loggedUser.role,
        target_id: '',
        detail: '',
      };
      applyActiveRole(first.role_key, first.target_id || '');
      showToast(`Selamat datang, ${loggedUser.full_name}!`, 'success');
      if (roles.length > 1) {
        setTimeout(() => {
          setRoleSwitcherOpen(true);
        }, 350);
      }
    },
    [applyActiveRole, showToast]
  );

  const handleQuickLogin = async (userId: string) => {
    showLoader('Membuka ruang kerja...');
    try {
      const res = await loginApi({ mode: 'quick', userId });
      if (!res.success || !res.user) {
        showToast(res.message || 'Login gagal.', 'error');
        return;
      }
      handleLoginSuccess(res.user, res.availableRoles || []);
    } catch (err: any) {
      showToast('Gagal login: ' + (err?.message || err), 'error');
    } finally {
      hideLoader();
    }
  };

  const handleManualLogin = async (username: string, password: string) => {
    showLoader('Memverifikasi kredensial...');
    try {
      const res = await loginApi({ mode: 'manual', username, password });
      if (!res.success || !res.user) {
        showToast(res.message || 'Username atau password salah.', 'error');
        return;
      }
      handleLoginSuccess(res.user, res.availableRoles || []);
    } catch (err: any) {
      showToast('Gagal login: ' + (err?.message || err), 'error');
    } finally {
      hideLoader();
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveRole(null);
    setActiveTargetId('');
    setAvailableRoles([]);
    setActiveMenu('dashboard');
    setSelectedTeacherClassId(null);
    setSelectedSessionId(null);
    setSelectedAssignClassId(null);
    setSelectedEkskulId(null);
    setRoleSwitcherOpen(false);
    setMobileDrawerOpen(false);
  };

  const handleSaveRecord = useCallback(
    async (sheetName: string, obj: GenericRow, successMsg = 'Data berhasil disimpan!') => {
      showLoader('Menyimpan ke database...');
      try {
        const res = await saveRecordApi(sheetName, obj, actor);
        await loadAppData(true);
        if (successMsg) showToast(successMsg, 'success');
        return res;
      } catch (err: any) {
        showToast('Gagal menyimpan data: ' + (err?.message || err), 'error');
        throw err;
      } finally {
        hideLoader();
      }
    },
    [actor, loadAppData, showLoader, hideLoader, showToast]
  );

  const executeDelete = useCallback(
    async (sheetName: string, recordId: string, successMsg = 'Data telah dihapus!') => {
      showLoader('Menghapus data...');
      try {
        await deleteRecordApi(sheetName, recordId, actor);
        if (sheetName === 'AttendanceSessions' && selectedSessionId === recordId) {
          setSelectedSessionId(null);
        }
        await loadAppData(true);
        showToast(successMsg, 'info');
      } catch (err: any) {
        showToast('Gagal menghapus: ' + (err?.message || err), 'error');
      } finally {
        hideLoader();
      }
    },
    [actor, loadAppData, selectedSessionId, showLoader, hideLoader, showToast]
  );

  const handleDeleteRecord = useCallback(
    (sheetName: string, recordId: string, msg?: string, skipConfirm = false) => {
      if (skipConfirm || sheetName === 'AttendanceSessions') {
        void executeDelete(sheetName, recordId, msg);
        return;
      }
      setPendingDelete({ sheet: sheetName, id: recordId, msg });
    },
    [executeDelete]
  );

  const handleOpenCrud = useCallback((sheet: string, id: string) => {
    setCrudState({ open: true, sheet, recordId: id });
  }, []);

  const handlePrintHtml = useCallback((html: string) => {
    setPrintHtml(html);
    setTimeout(() => {
      window.print();
    }, 250);
  }, []);

  const handleNavigateMenu = useCallback((menuId: string) => {
    setActiveMenu(menuId);
    setMobileDrawerOpen(false);
    setSelectedEkskulId(null);
  }, []);

  const handleOpenWorkspaceFromSchedule = useCallback(
    (classId: string, subjectId: string) => {
      if (!db || !user) return;
      const tc = (db.TeacherClasses || []).find(
        t => t.teacher_id === user.id && t.class_id === classId && t.subject_id === subjectId
      );
      if (tc) {
        setSelectedTeacherClassId(tc.id);
        setSelectedSessionId(null);
      } else {
        showToast('Membuka daftar Kelas Saya untuk mapel terkait.', 'info');
      }
      setActiveMenu('my_classes');
      setMobileDrawerOpen(false);
    },
    [db, user, showToast]
  );

  const handleConvertProtaToSession = useCallback((tcId: string) => {
    setSelectedTeacherClassId(tcId);
    setSelectedSessionId(null);
    setAutoOpenAddSession(true);
    setActiveMenu('my_classes');
    setMobileDrawerOpen(false);
  }, []);

  // Render active workspace page
  const renderActivePage = () => {
    if (!db || !user || !activeRole) return null;
    const m = activeMenu;
    const r = activeRole;

    if (m === 'dashboard') {
      if (r === 'guru' || r === 'tendik') {
        return (
          <GuruBeranda
            db={db}
            user={user}
            onNavigateMenu={handleNavigateMenu}
            onOpenWorkspaceFromSchedule={handleOpenWorkspaceFromSchedule}
          />
        );
      }
      if (r === 'wali_kelas') {
        const waliClass = getActiveWaliClass(db, user, activeTargetId);
        return (
          <WaliKelasBeranda
            db={db}
            waliClass={waliClass}
            onNavigateMenu={handleNavigateMenu}
          />
        );
      }
      return (
        <AdminKepsekDashboard
          db={db}
          user={user}
          activeRole={r}
          onNavigateMenu={handleNavigateMenu}
        />
      );
    }

    if (m === 'my_classes' && actor) {
      return (
        <GuruMyClasses
          db={db}
          user={user}
          activeRole={r}
          actor={actor}
          selectedTeacherClassId={selectedTeacherClassId}
          onSelectTeacherClassId={id => {
            setSelectedTeacherClassId(id);
            setSelectedSessionId(null);
          }}
          selectedSessionId={selectedSessionId}
          onSelectSessionId={setSelectedSessionId}
          autoOpenAddSession={autoOpenAddSession}
          onClearAutoOpenAddSession={() => setAutoOpenAddSession(false)}
          onReload={loadAppData}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
          onPrintHtml={handlePrintHtml}
        />
      );
    }

    if (m === 'jurnal') {
      return (
        <GuruJurnalModule
          db={db}
          user={user}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onPrintHtml={handlePrintHtml}
        />
      );
    }

    if (m === 'jadwal_mengajar' && actor) {
      return (
        <GuruJadwalModule
          db={db}
          user={user}
          actor={actor}
          onReload={loadAppData}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'cp_atp') {
      return (
        <CpAtpProtaModule
          db={db}
          user={user}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onConvertProtaToSession={handleConvertProtaToSession}
        />
      );
    }

    if (m === 'pelanggaran') {
      return (
        <PelanggaranModule
          db={db}
          user={user}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'guru_wali') {
      return (
        <GuruWaliModule
          db={db}
          user={user}
          activeRole={r}
          onSaveRecord={handleSaveRecord}
        />
      );
    }

    if (m === 'students' && actor) {
      return (
        <StudentsModule
          db={db}
          actor={actor}
          onReload={loadAppData}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'classes_subjects') {
      return (
        <ClassesSubjectsModule
          db={db}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'teacher_jabatans') {
      return (
        <TeacherJabatansModule
          db={db}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'teaching_assignments' && actor) {
      return (
        <TeachingAssignmentsModule
          db={db}
          actor={actor}
          selectedAssignClassId={selectedAssignClassId}
          onSelectAssignClassId={setSelectedAssignClassId}
          onReload={loadAppData}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'ekskul') {
      return (
        <EkskulModule
          db={db}
          actor={actor}
          selectedEkskulId={selectedEkskulId}
          onSelectEkskulId={setSelectedEkskulId}
          onReload={loadAppData}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'additional_assignments') {
      return (
        <AdditionalAssignmentsModule
          db={db}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'kehadiran_gtk') {
      if (r === 'wali_murid') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Akses ditolak.
          </div>
        );
      }
      return (
        <KehadiranGtkModule
          db={db}
          user={user}
          activeRole={r}
          actor={actor}
          onReload={loadAppData}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
          onPrintHtml={handlePrintHtml}
        />
      );
    }

    if (m === 'system_admin') {
      if (r !== 'admin') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Menu ini khusus Administrator.
          </div>
        );
      }
      return (
        <SystemAdminModule
          db={db}
          actor={actor}
          onReload={loadAppData}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'jadwal_admin') {
      if (r !== 'admin' && r !== 'waka_kurikulum') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Menu ini khusus Admin / Waka Kurikulum.
          </div>
        );
      }
      return (
        <JadwalAdminModule
          db={db}
          actor={actor}
          onReload={loadAppData}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'absensi_siswa') {
      return <AbsensiRekapModule db={db} onShowToast={showToast} />;
    }

    if (m === 'wk_data_kelas') {
      return (
        <WkDataKelasModule db={db} user={user} activeTargetId={activeTargetId} />
      );
    }

    if (m === 'wk_data_siswa') {
      return (
        <WkDataSiswaModule db={db} user={user} activeTargetId={activeTargetId} />
      );
    }

    if (m === 'wk_absensi') {
      return (
        <AbsensiWaliModule
          db={db}
          user={user}
          activeTargetId={activeTargetId}
          actor={actor}
          onReload={loadAppData}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'school_identity') {
      if (r !== 'admin') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Menu ini khusus Administrator.
          </div>
        );
      }
      return (
        <SchoolIdentityModule
          db={db}
          actor={actor}
          onReload={loadAppData}
          onNavigateMenu={handleNavigateMenu}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m === 'reset_data') {
      if (r !== 'admin') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Menu ini khusus Administrator.
          </div>
        );
      }
      return (
        <ResetDataModule
          db={db}
          actor={actor}
          onResetComplete={async () => {
            await loadAppData(true);
            setActiveMenu('dashboard');
          }}
          onShowToast={showToast}
          onShowLoader={showLoader}
          onHideLoader={hideLoader}
        />
      );
    }

    if (m.startsWith('p5_')) {
      return (
        <KokurikulerModule
          db={db}
          user={user}
          subMenu={m}
          onNavigateMenu={handleNavigateMenu}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'waka_kurikulum') {
      return (
        <WakaKurikulumModule
          db={db}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'waka_kesiswaan') {
      return (
        <WakaKesiswaanModule
          db={db}
          user={user}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'waka_humas') {
      return (
        <WakaHumasModule
          db={db}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'waka_sarpras') {
      return (
        <WakaSarprasModule
          db={db}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
        />
      );
    }

    if (m === 'leger') {
      const isExecutive = r === 'admin' || r === 'kepala_sekolah';
      return (
        <div className="space-y-5">
          {isExecutive && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdminLegerTab('leger')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    adminLegerTab === 'leger'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Leger Nilai Kelas
                </button>
                <button
                  type="button"
                  onClick={() => setAdminLegerTab('raport')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    adminLegerTab === 'raport'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Pusat Cetak Raport
                </button>
              </div>
              {adminLegerTab === 'raport' && (
                <select
                  value={activeTargetId || (db.Classes || [])[0]?.id || ''}
                  onChange={e => setActiveTargetId(e.target.value)}
                  className="px-3 py-2 rounded-xl border text-xs font-bold bg-white"
                >
                  {(db.Classes || []).map(c => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {isExecutive && adminLegerTab === 'raport' ? (
            <RaportCenterModule
              db={db}
              user={user}
              activeTargetId={activeTargetId}
              onPrintHtml={handlePrintHtml}
            />
          ) : (
            <LegerNilaiModule
              db={db}
              user={user}
              activeRole={r}
              activeTargetId={activeTargetId}
              onChangeTargetId={setActiveTargetId}
              onShowToast={showToast}
              onPrintHtml={handlePrintHtml}
            />
          )}
        </div>
      );
    }

    if (m === 'raport') {
      return (
        <RaportCenterModule
          db={db}
          user={user}
          activeTargetId={activeTargetId}
          onPrintHtml={handlePrintHtml}
        />
      );
    }

    if (m.startsWith('wm_')) {
      return (
        <WaliMuridModule
          db={db}
          user={user}
          menuId={m}
          onNavigateMenu={handleNavigateMenu}
        />
      );
    }

    if (m === 'pengumuman') {
      if (r === 'wali_murid') {
        return (
          <div className="p-8 bg-rose-50 text-rose-700 rounded-2xl font-bold">
            Akses ditolak.
          </div>
        );
      }
      return (
        <PengumumanModule
          db={db}
          user={user}
          onSaveRecord={handleSaveRecord}
          onOpenCrud={handleOpenCrud}
          onDeleteRecord={handleDeleteRecord}
          onPrintHtml={handlePrintHtml}
        />
      );
    }

    return (
      <div className="p-6 bg-white rounded-2xl border">
        Halaman tidak ditemukan.
      </div>
    );
  };

  return (
    <>
      <GlobalLoader visible={loader.visible} text={loader.text} />
      <ToastContainer toasts={toasts} />

      {/* HIDDEN PRINT AREA */}
      <div
        id="printArea"
        className="hidden print:block"
        dangerouslySetInnerHTML={{ __html: printHtml }}
      />

      {bootError && !db ? (
        <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 no-print">
          <div className="max-w-lg w-full bg-rose-50 border border-rose-200 rounded-2xl p-6 text-rose-900 space-y-3">
            <h2 className="text-lg font-extrabold">Gagal Memuat SIAKAD</h2>
            <pre className="text-xs whitespace-pre-wrap bg-white p-3 rounded-xl border border-rose-200">
              {bootError}
            </pre>
            <button
              type="button"
              onClick={() => loadAppData(false)}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
            >
              Muat Ulang Data
            </button>
          </div>
        </div>
      ) : !db ? (
        <div className="min-h-screen flex items-center justify-center text-sm text-slate-600 no-print">
          Memuat SIAKAD SMP Kristen Waibakul...
        </div>
      ) : !user || !activeRole ? (
        <LoginScreen
          db={db}
          onQuickLogin={handleQuickLogin}
          onManualLogin={handleManualLogin}
        />
      ) : (
        <AppShell
          db={db}
          user={user}
          activeRole={activeRole}
          availableRoles={availableRoles}
          activeMenu={activeMenu}
          mobileDrawerOpen={mobileDrawerOpen}
          onToggleMobileDrawer={() => setMobileDrawerOpen(prev => !prev)}
          onNavigateMenu={handleNavigateMenu}
          onOpenRoleSwitcher={() => setRoleSwitcherOpen(true)}
          onLogout={handleLogout}
        >
          {renderActivePage()}
        </AppShell>
      )}

      {/* MULTI-ROLE SWITCHER MODAL */}
      <Modal
        open={roleSwitcherOpen && availableRoles.length > 1}
        title="Pilih Peran / Jabatan Aktif"
        onClose={() => setRoleSwitcherOpen(false)}
        maxWidthClass="max-w-lg"
        footer={
          <button
            type="button"
            onClick={() => setRoleSwitcherOpen(false)}
            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold"
          >
            Tutup
          </button>
        }
      >
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-800 flex items-start gap-2.5">
            <Layers className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600" />
            <span>
              Anda terdaftar memiliki <strong>{availableRoles.length} peran aktif</strong>. Silakan pilih ruang kerja yang ingin dibuka:
            </span>
          </div>
          <div className="space-y-2.5">
            {availableRoles.map(r => {
              const meta = ROLE_META[r.role_key] || {
                label: r.label,
                badge: 'bg-slate-100 text-slate-800',
                icon: 'briefcase',
              };
              const isCurrent =
                activeRole === r.role_key &&
                String(activeTargetId || '') === String(r.target_id || '');
              return (
                <button
                  key={`${r.role_key}-${r.target_id}`}
                  type="button"
                  onClick={() => {
                    applyActiveRole(r.role_key, r.target_id || '');
                    setRoleSwitcherOpen(false);
                    showToast(`Beralih ke peran: ${r.label}`, 'info');
                  }}
                  className={`w-full text-left p-4 rounded-2xl border-2 ${
                    isCurrent
                      ? 'border-indigo-600 bg-indigo-50/40'
                      : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50'
                  } transition flex items-center justify-between gap-3`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <DynIcon name={meta.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{r.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{r.detail}</p>
                    </div>
                  </div>
                  {isCurrent && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-xs font-bold inline-flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* GENERIC CRUD EDIT MODAL */}
      {db && (
        <CrudModal
          open={crudState.open}
          sheet={crudState.sheet}
          recordId={crudState.recordId}
          db={db}
          onClose={() => setCrudState({ open: false, sheet: '', recordId: '' })}
          onSave={handleSaveRecord}
        />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        open={Boolean(pendingDelete)}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          const { sheet, id, msg } = pendingDelete;
          setPendingDelete(null);
          void executeDelete(sheet, id, msg);
        }}
      />
    </>
  );
}
