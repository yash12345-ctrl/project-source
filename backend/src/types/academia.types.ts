export interface AcademiaCredentials {
  username: string;
  password: string;
  portalPassword?: string;
}

export interface AttendanceRecord {
  course: string;
  attended: number;
  total: number;
  percentage: number;
}

export interface MarksRecord {
  course: string;
  test1: string;
  test2: string;
  average: string;
  grade: string;
}

export interface CourseRecord {
  code: string;
  title: string;
  type: string;
  faculty: string;
  slot: string;
  room: string;
}

export interface StudentProfile {
  registrationNumber: string;
  name: string;
  batch: string;
  mobile: string;
  program: string;
  department: string;
  semester: string;
  enrollmentStatus: string;
}

export interface TimeTableGridCell {
  time: string;
  slot: string;
}

export type TimeTableGrid = Record<string, TimeTableGridCell[]>;

export interface ScrapeResult {
  success: boolean;
  username?: string | undefined;
  attendance?: AttendanceRecord[] | undefined;
  marks?: MarksRecord[] | undefined;
  courses?: CourseRecord[] | undefined;
  profile?: StudentProfile | undefined;
  timetableGrid?: TimeTableGrid | undefined;
  error?: string | undefined;
  scrapedAt?: string | undefined;
}
