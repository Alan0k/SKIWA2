import React from 'react';
import {
  AlertTriangle,
  Award,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  Building2,
  Calendar,
  CalendarClock,
  CalendarRange,
  CheckSquare,
  ClipboardCheck,
  Compass,
  FileText,
  FolderKanban,
  Globe,
  HeartHandshake,
  Home,
  Landmark,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Printer,
  Repeat,
  RotateCcw,
  School,
  Settings,
  ShieldCheck,
  Table,
  Trophy,
  User,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import type { AvailableRoleOption, DatabasePayload, RoleKey, UserPublic } from '../types/siakad';
import { getMenusForActiveRole, getSchoolIdentity, getSettingVal, ROLE_META, siInitials } from '../utils/siakadEngine';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'shield-check': ShieldCheck,
  award: Award,
  'book-open': BookOpen,
  users: Users,
  layers: Layers,
  'user-check': UserCheck,
  globe: Globe,
  'building-2': Building2,
  compass: Compass,
  'heart-handshake': HeartHandshake,
  'alert-triangle': AlertTriangle,
  home: Home,
  'file-text': FileText,
  user: User,
  calendar: Calendar,
  'layout-dashboard': LayoutDashboard,
  'folder-kanban': FolderKanban,
  'calendar-clock': CalendarClock,
  'check-square': CheckSquare,
  megaphone: Megaphone,
  school: School,
  'clipboard-check': ClipboardCheck,
  table: Table,
  printer: Printer,
  'book-marked': BookMarked,
  'calendar-range': CalendarRange,
  trophy: Trophy,
  briefcase: Briefcase,
  'book-open-check': BookOpenCheck,
  landmark: Landmark,
  settings: Settings,
  'rotate-ccw': RotateCcw,
};

export function DynIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  const Comp = ICON_MAP[name] || Briefcase;
  return <Comp className={className} />;
}

export function AppShell({
  db,
  user,
  activeRole,
  availableRoles,
  activeMenu,
  mobileDrawerOpen,
  onToggleMobileDrawer,
  onNavigateMenu,
  onOpenRoleSwitcher,
  onLogout,
  children,
}: {
  db: DatabasePayload;
  user: UserPublic;
  activeRole: RoleKey;
  availableRoles: AvailableRoleOption[];
  activeMenu: string;
  mobileDrawerOpen: boolean;
  onToggleMobileDrawer: () => void;
  onNavigateMenu: (menuId: string) => void;
  onOpenRoleSwitcher: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}) {
  const isGuruRole = activeRole === 'guru' || activeRole === 'tendik';
  const menus = getMenusForActiveRole(activeRole);
  const roleMeta = ROLE_META[activeRole] || { label: activeRole, badge: 'bg-slate-100 text-slate-800', icon: 'briefcase' };
  const myTcCount = (db.TeacherClasses || []).filter(tc => tc.teacher_id === user.id).length;
  const idn = getSchoolIdentity(db);

  return (
    <div className="min-h-screen flex flex-col">
      {/* TOP NAVBAR */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between shadow-sm no-print">
        <div className="flex items-center gap-3">
          {!isGuruRole && (
            <button
              type="button"
              onClick={onToggleMobileDrawer}
              className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
              aria-label="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm">
              {siInitials(idn.school_name)}
            </div>
            <div>
              <h1 className="font-extrabold text-slate-900 text-sm sm:text-base leading-none">{idn.school_name}</h1>
              <p className="text-[11px] text-slate-500 mt-0.5">
                T.A. {getSettingVal(db, 'academic_year', '2026/2027')} • Semester {getSettingVal(db, 'active_semester', 'Ganjil')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs font-bold text-slate-800">{user.full_name}</span>
            <span className="text-[11px] font-semibold text-slate-500">{roleMeta.label}</span>
          </div>

          {availableRoles.length > 1 && (
            <button
              type="button"
              onClick={onOpenRoleSwitcher}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition"
              title="Ganti Peran Jabatan"
            >
              <Repeat className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ganti Peran</span>
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div className="flex-1 flex relative">
        {!isGuruRole && (
          <>
            <aside className="hidden lg:flex w-64 bg-white border-r border-slate-200 flex-col p-3 gap-1 shrink-0 no-print">
              {menus.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onNavigateMenu(m.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                    activeMenu === m.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DynIcon name={m.icon} className="w-4 h-4 shrink-0" />
                  <span className="truncate">{m.label}</span>
                </button>
              ))}
            </aside>

            {mobileDrawerOpen && (
              <>
                <div onClick={onToggleMobileDrawer} className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden no-print" />
                <aside className="fixed inset-y-0 left-0 w-72 bg-white z-50 p-4 flex flex-col gap-1.5 shadow-2xl lg:hidden overflow-y-auto no-print">
                  <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-200">
                    <span className="font-extrabold text-slate-800 text-sm">Menu Navigasi</span>
                    <button
                      type="button"
                      onClick={onToggleMobileDrawer}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {menus.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onNavigateMenu(m.id)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                        activeMenu === m.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <DynIcon name={m.icon} className="w-4 h-4 shrink-0" />
                      <span className="truncate">{m.label}</span>
                    </button>
                  ))}
                </aside>
              </>
            )}
          </>
        )}

        {/* MAIN WORKSPACE */}
        <main className={`flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full ${isGuruRole ? 'pb-28' : 'pb-10'}`}>
          {children}
        </main>
      </div>

      {/* BOTTOM NAVIGATION BAR 5 MENU KHUSUS ROLE GURU */}
      {isGuruRole && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] h-[72px] px-2 flex items-center justify-around no-print">
          {menus.map(m => {
            const active = activeMenu === m.id;
            if (m.center) {
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onNavigateMenu(m.id)}
                  className="relative -top-4 flex flex-col items-center justify-center"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl ${
                      active ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-800 text-white'
                    } shadow-lg flex items-center justify-center transition transform hover:scale-105`}
                  >
                    <DynIcon name={m.icon} className="w-6 h-6" />
                  </div>
                  <span className={`text-[11px] font-extrabold mt-1 ${active ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {m.label}
                  </span>
                </button>
              );
            }
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onNavigateMenu(m.id)}
                className={`flex-1 py-2 flex flex-col items-center justify-center relative ${
                  active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <DynIcon name={m.icon} className="w-5 h-5" />
                  {m.id === 'my_classes' && myTcCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 px-1.5 py-0.5 bg-teal-600 text-white text-[10px] font-bold rounded-full tabular-nums">
                      {myTcCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold mt-1 truncate max-w-[76px]">{m.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
