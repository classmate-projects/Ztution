export type Role = "teacher" | "student";
export type EnrollmentStatus = "assigned" | "active";
export type SessionStatus = "scheduled" | "live" | "ended";

export interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  name: string;
  role: Role;
  created_at: string;
}

export interface ClassSessionRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  scheduled_at: string;
  status: SessionStatus;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface ClassRow {
  id: string;
  name: string;
  teacher_id: string;
  created_at: string;
}

export interface ClassStudentRow {
  class_id: string;
  student_id: string;
  status: EnrollmentStatus;
  assigned_at: string;
  joined_at: string | null;
}

/** Shape of `class_students` rows selected with an embedded `users(...)` join. */
export interface StudentEnrollmentRow {
  status: EnrollmentStatus;
  assigned_at: string;
  joined_at: string | null;
  users: { id: string; name: string; email: string } | null;
}

export interface MaterialRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface AssignmentRow {
  id: string;
  class_id: string;
  teacher_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  created_at: string;
}

export interface SubmissionRow {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  evaluated_at: string | null;
}
