import React from 'react';
import { Trophy } from 'lucide-react';
import type { DatabasePayload } from '../types/siakad';

export function getStudentViolationsSummary(db: DatabasePayload, studentId: string) {
  const rows = (db.PelanggaranSiswa || []).filter(p => p.student_id === studentId);
  const count = rows.length;
  const totalPoin = rows.reduce((acc, r) => acc + Number(r.points || 0), 0);
  const rCount = rows.filter(r => r.category === 'Ringan').length;
  const sCount = rows.filter(r => r.category === 'Sedang').length;
  const bCount = rows.filter(r => r.category === 'Berat').length;
  const openCount = rows.filter(r => r.status !== 'Selesai').length;
  return { rows, count, totalPoin, rCount, sCount, bCount, openCount };
}

export function studentViolationText(db: DatabasePayload, studentId: string): string {
  const s = getStudentViolationsSummary(db, studentId);
  if (s.count === 0) return '0 poin (Aman)';
  return `${s.count} kasus / ${s.totalPoin} poin (R:${s.rCount} S:${s.sCount} B:${s.bCount})`;
}

export function StudentViolationCell({
  db,
  studentId,
  compact = false,
}: {
  db: DatabasePayload;
  studentId: string;
  compact?: boolean;
}) {
  const s = getStudentViolationsSummary(db, studentId);
  if (s.count === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
        0 poin • Aman
      </span>
    );
  }
  const badgeCls =
    s.bCount > 0 || s.totalPoin >= 30
      ? 'bg-rose-100 text-rose-800 border-rose-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

  return (
    <div className="space-y-0.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${badgeCls}`}>
        {s.count}x • {s.totalPoin} poin
      </span>
      {!compact && (
        <p className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">
          R:{s.rCount} S:{s.sCount} B:{s.bCount}
          {s.openCount > 0 ? ` • ${s.openCount} proses` : ''}
        </p>
      )}
    </div>
  );
}

export function getStudentAchievementsSummary(db: DatabasePayload, studentId: string) {
  const rows = (db.PrestasiSiswa || []).filter(p => p.student_id === studentId);
  return { rows, count: rows.length };
}

export function studentAchievementText(db: DatabasePayload, studentId: string): string {
  const { rows } = getStudentAchievementsSummary(db, studentId);
  if (!rows.length) return '-';
  return rows
    .map(p => `${p.rank ? `${p.rank} ` : ''}${p.title || '-'}${p.level ? ` (${p.level})` : ''}`)
    .join('; ');
}

export function StudentAchievementCell({
  db,
  studentId,
  compact = false,
}: {
  db: DatabasePayload;
  studentId: string;
  compact?: boolean;
}) {
  const { rows } = getStudentAchievementsSummary(db, studentId);
  if (!rows.length) {
    return <span className="text-[11px] text-slate-400 font-medium">-</span>;
  }

  return (
    <div className="space-y-1 max-w-[200px]">
      {rows.slice(0, compact ? 1 : 2).map((p, idx) => (
        <div
          key={p.id || idx}
          className="inline-flex items-start gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] leading-tight"
        >
          <Trophy className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
          <span className="truncate font-semibold">
            {p.rank ? `${p.rank} • ` : ''}
            {p.title}
            {!compact && p.level ? ` (${p.level})` : ''}
          </span>
        </div>
      ))}
      {rows.length > (compact ? 1 : 2) && (
        <p className="text-[10px] font-bold text-amber-700">+{rows.length - (compact ? 1 : 2)} prestasi lainnya</p>
      )}
    </div>
  );
}
