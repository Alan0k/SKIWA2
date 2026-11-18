import type { ActorInfo, AvailableRoleOption, DatabasePayload, GenericRow, UserPublic } from '../types/siakad';

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
  }
  return data as T;
}

export async function fetchBootstrap(): Promise<DatabasePayload> {
  const res = await fetch('/api/bootstrap');
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'Gagal memuat database SIAKAD');
  }
  return res.json();
}

export async function loginApi(payload: {
  mode: 'quick' | 'manual';
  userId?: string;
  username?: string;
  password?: string;
}): Promise<{ success: boolean; message?: string; user?: UserPublic; availableRoles?: AvailableRoleOption[] }> {
  return postJson('/api/login', payload);
}

export async function saveRecordApi(sheetName: string, recordObj: GenericRow, actor: ActorInfo | null) {
  return postJson<{ success: boolean; record: GenericRow; isNew: boolean }>('/api/save', {
    sheetName,
    recordObj,
    actor,
  });
}

export async function deleteRecordApi(sheetName: string, recordId: string, actor: ActorInfo | null) {
  return postJson<{ success: boolean }>('/api/delete', {
    sheetName,
    recordId,
    actor,
  });
}

export async function saveSessionAttendanceBatchApi(
  sessionId: string,
  recordsList: GenericRow[],
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean }>('/api/attendance-batch', {
    sessionId,
    recordsList,
    actor,
  });
}

export async function createSessionsFromProtaApi(payload: GenericRow, actor: ActorInfo | null) {
  return postJson<{ success: boolean; sessions: GenericRow[] }>('/api/sessions-prota', {
    payload,
    actor,
  });
}

export async function saveClassAssignmentsApi(
  classId: string,
  pairs: Array<{ subject_id: string; teacher_id: string }>,
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean; added: number; updated: number; removed: number }>('/api/class-assignments', {
    classId,
    pairs,
    actor,
  });
}

export async function addEkskulMembersApi(ekskulId: string, studentIds: string[], actor: ActorInfo | null) {
  return postJson<{ success: boolean; added: number }>('/api/ekskul-members', {
    ekskulId,
    studentIds,
    actor,
  });
}

export async function importKehadiranGtkApi(rows: GenericRow[], actor: ActorInfo | null) {
  return postJson<{ success: boolean; added: number; updated: number; skipped: number }>('/api/kehadiran-import', {
    rows,
    actor,
  });
}

export async function importStudentsBulkApi(rows: GenericRow[], actor: ActorInfo | null) {
  return postJson<{ success: boolean; added: number; updated: number; skipped: number }>('/api/students-import', {
    rows,
    actor,
  });
}

export async function saveSchoolSettingsApi(values: Record<string, unknown>, actor: ActorInfo | null) {
  return postJson<{ success: boolean; changed: string[] }>('/api/school-settings', {
    values,
    actor,
  });
}

export async function saveJamPelajaranApi(
  slots: Array<{ slot_no?: number; start_time: string; label?: string }>,
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean; count: number }>('/api/jam-pelajaran', {
    slots,
    actor,
  });
}

export async function saveJadwalCellApi(
  day: string,
  slotNo: number,
  classId: string,
  subjectId: string,
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean; teacher_id: string }>('/api/jadwal-cell', {
    day,
    slotNo,
    classId,
    subjectId,
    actor,
  });
}

export async function saveAbsensiHarianApi(
  date: string,
  classId: string,
  records: Array<{ student_id: string; status: string; note?: string }>,
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean; count: number }>('/api/absensi-harian', {
    date,
    classId,
    records,
    actor,
  });
}

export async function exportDatabaseJsonApi(): Promise<string> {
  const res = await fetch('/api/export-json');
  if (!res.ok) throw new Error('Gagal mengunduh backup JSON');
  return res.text();
}

export async function importDatabaseJsonApi(jsonString: string, actor: ActorInfo | null) {
  return postJson<{ success: boolean }>('/api/import-json', { jsonString, actor });
}

export async function resetAcademicYearApi(
  options: { keepUsers: boolean; keepSubjects: boolean; newAcademicYear: string; newSemester: string },
  actor: ActorInfo | null
) {
  return postJson<{ success: boolean; newAcademicYear: string; newSemester: string }>('/api/reset-academic-year', {
    options,
    actor,
  });
}
