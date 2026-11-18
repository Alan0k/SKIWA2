export type RoleKey =
  | 'admin'
  | 'kepala_sekolah'
  | 'guru'
  | 'tendik'
  | 'wali_kelas'
  | 'waka_kurikulum'
  | 'waka_kesiswaan'
  | 'waka_humas'
  | 'waka_sarpras'
  | 'admin_kokurikuler'
  | 'wali_murid';

export interface UserPublic {
  id: string;
  username: string;
  full_name: string;
  nip: string;
  role: RoleKey;
  avatar_initials: string;
  phone: string;
  status: string;
}

export interface UserRecord extends UserPublic {
  password?: string;
}

export interface AvailableRoleOption {
  role_key: RoleKey;
  label: string;
  target_id: string;
  detail: string;
}

export type GenericRow = Record<string, any>;

export interface DatabasePayload {
  UsersPublic: UserPublic[];
  Classes: GenericRow[];
  Subjects: GenericRow[];
  Students: GenericRow[];
  TeacherClasses: GenericRow[];
  TeacherJabatans: GenericRow[];
  CpAtp_Prota: GenericRow[];
  AttendanceSessions: GenericRow[];
  AttendanceRecords: GenericRow[];
  JurnalMengajar: GenericRow[];
  JadwalPelajaran: GenericRow[];
  AttitudeAspects: GenericRow[];
  JamPelajaran: GenericRow[];
  JadwalKelas: GenericRow[];
  AbsensiHarian: GenericRow[];
  StatusNilai: GenericRow[];
  AttitudeRatings: GenericRow[];
  Ekstrakurikuler: GenericRow[];
  EkskulAssessments: GenericRow[];
  KokurikulerProjects: GenericRow[];
  KokurikulerEvaluations: GenericRow[];
  GuruWaliRecords: GenericRow[];
  AdditionalAssignments: GenericRow[];
  PelanggaranSiswa: GenericRow[];
  PrestasiSiswa: GenericRow[];
  OsisMembers: GenericRow[];
  PembiasaanKarakter: GenericRow[];
  KaldikEvents: GenericRow[];
  SupervisiGuru: GenericRow[];
  KemitraanKomite: GenericRow[];
  MouKerjasama: GenericRow[];
  PublikasiSekolah: GenericRow[];
  BukuTamu: GenericRow[];
  InventarisRuang: GenericRow[];
  BarangSarpras: GenericRow[];
  TiketPerbaikan: GenericRow[];
  PeminjamanSarpras: GenericRow[];
  Announcements: GenericRow[];
  ActivityLogs: GenericRow[];
  KehadiranGTK: GenericRow[];
  RolePermissions: GenericRow[];
  Settings: GenericRow[];
  _warnings?: string[];
  [key: string]: any;
}

export interface ActorInfo {
  id: string;
  full_name: string;
  activeRole: string;
}

export interface StudentSubjectReport {
  kkm: number;
  nhScores: number[];
  avgNH: number | null;
  avgSTS: number | null;
  avgSAS: number | null;
  finalScore: number | null;
  predicate: string;
  predicateFull: string;
  description: string;
}

export interface SchoolIdentity {
  school_name: string;
  school_npsn: string;
  school_nss: string;
  school_status: string;
  school_accreditation: string;
  school_foundation: string;
  school_address: string;
  school_regency: string;
  school_province: string;
  school_postal_code: string;
  school_phone: string;
  school_email: string;
  school_website: string;
  headmaster_name: string;
  headmaster_nip: string;
  academic_year: string;
  active_semester: string;
  curriculum_name: string;
  jp_duration_minutes: string;
  report_place: string;
  report_date: string;
  school_logo_left: string;
  school_logo_right: string;
}
