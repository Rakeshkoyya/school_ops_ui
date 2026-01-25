// ============================================
// Core Types for School Operations Application
// ============================================

// Role Types for Navigation
// These are the standard roles that determine navigation visibility
export type StandardRoleName = 'Super Admin' | 'School Admin' | 'Staff';

// Helper to normalize role names for comparison
export function normalizeRoleName(roleName: string): StandardRoleName | null {
  const normalized = roleName.toLowerCase().trim();
  if (normalized === 'super admin' || normalized === 'superadmin') {
    return 'Super Admin';
  }
  if (normalized === 'school admin' || normalized === 'admin') {
    return 'School Admin';
  }
  if (normalized === 'staff' || normalized === 'teacher') {
    return 'Staff';
  }
  return null;
}

// User & Authentication Types
export interface User {
  id: number;
  username: string;
  name: string;
  phone?: string;
  is_active: boolean;
  is_super_admin: boolean;
  evo_points: number;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Student Type
export interface Student {
  id: number;
  project_id: number;
  student_name: string;
  class_name: string;
  section?: string;
  parent_name?: string;
  parent_phone_no?: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Basic project info (unique projects)
export interface ProjectInfo {
  id: number;
  name: string;
  slug: string;
  description?: string;
  theme_color?: string;
  logo_url?: string;
  status: string;
}

// User's role assignment in a project
export interface UserRoleInfo {
  role_id: number;
  role_name: string;
  project_id: number;
  project_name: string;
  project_slug: string;
  is_project_admin: boolean;
  is_role_admin: boolean;
  permissions: string[];
}

// Combined project + role for easier frontend use
export interface ProjectWithRole {
  id: number;
  name: string;
  slug: string;
  description?: string;
  theme_color?: string;
  logo_url?: string;
  status: string;
  role_id: number;
  role_name: string;
  is_project_admin: boolean;
  is_role_admin: boolean;
  permissions: string[];
}

export interface AuthMeResponse {
  user: User;
  projects: ProjectInfo[];  // Unique projects
  user_roles: UserRoleInfo[];  // All role assignments
  permissions: string[];
}

// Project Types
export interface Project {
  id: number;
  name: string;
  slug: string;
  description?: string;
  theme_color?: string;
  logo_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Permission Types (format: resource:action)
export type Permission =
  | 'task:view'
  | 'task:create'
  | 'task:assign'
  | 'task:update'
  | 'task:delete'
  | 'task_category:view'
  | 'task_category:create'
  | 'task_category:update'
  | 'task_category:delete'
  | 'attendance:view'
  | 'attendance:create'
  | 'attendance:update'
  | 'attendance:delete'
  | 'attendance:upload'
  | 'exam:view'
  | 'exam:create'
  | 'exam:update'
  | 'exam:delete'
  | 'exam:upload'
  | 'upload:view'
  | 'upload:create'
  | 'role:view'
  | 'role:create'
  | 'role:update'
  | 'role:delete'
  | 'role:assign'
  | 'user:view'
  | 'user:invite'
  | 'user:remove'
  | 'audit:view'
  | 'project:view'
  | 'project:update'
  | 'project:create'
  | 'project:delete'
  | 'notification:view'
  | 'notification:create';

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  project_id: number;
  project_name?: string;
  created_at: string;
  updated_at: string;
}

// Task Types
export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'overdue' | 'cancelled';

export interface TaskCategory {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  category_id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  start_time?: string;
  end_time?: string;
  due_date?: string;
  assigned_to_user_id?: number;
  assigned_to_role_id?: number;
  auto_rule_key?: string;
  created_by_id: number;
  created_at: string;
  updated_at: string;
  // Computed fields
  category_name?: string;
  assigned_user_name?: string;
  assigned_role_name?: string;
  created_by_name?: string;
  is_overdue?: boolean;
  time_remaining_seconds?: number;
  elapsed_seconds?: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  category_id?: number;
  due_date?: string;
  assigned_to_user_id?: number;
  assigned_to_role_id?: number;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  category_id?: number;
  status?: TaskStatus;
  due_date?: string;
  assigned_to_user_id?: number;
  assigned_to_role_id?: number;
}

export interface TasksGroupedByCategory {
  category_id?: number;
  category_name?: string;
  tasks: Task[];
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

export interface StaffTasksSummary {
  user_id: number;
  user_name: string;
  pending_count: number;
  in_progress_count: number;
  overdue_count: number;
  completed_today_count: number;
  tasks: Task[];
}

// Attendance Types
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  section: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks?: string;
  project_id: number;
  upload_id?: number;
  created_at: string;
  updated_at: string;
}

export interface AttendanceFilters {
  class_section?: string;
  class_name?: string;
  section?: string;
  date_from?: string;
  date_to?: string;
  status?: AttendanceStatus;
  student_id?: number;
}

export interface ClassSection {
  class_name: string;
  section: string | null;
  class_section: string;
  student_count: number;
}

export interface StudentAttendanceEntry {
  student_id: number;
  student_name: string;
  class_name: string;
  section: string | null;
  status: AttendanceStatus | null;
  remarks: string | null;
  record_id: number | null;
}

export interface AttendanceByClassResponse {
  class_section: string;
  attendance_date: string;
  students: StudentAttendanceEntry[];
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
}

export interface BulkAttendanceCreate {
  attendance_date: string;
  class_section: string;
  records: {
    student_id: number;
    status: AttendanceStatus;
    remarks?: string;
  }[];
}

export interface BulkAttendanceResponse {
  total_records: number;
  successful: number;
  failed: number;
  errors: { student_id?: number; message: string }[];
  message: string;
}

export interface AttendanceUploadError {
  row: number;
  student_name?: string;
  column?: string;
  message: string;
}

export interface AttendanceUploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  errors: AttendanceUploadError[];
  message: string;
}

export interface AttendanceSummary {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  date_from: string;
  date_to: string;
}

// Exam Types
export interface ExamRecord {
  id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  section: string | null;
  exam_name: string;
  subject: string;
  exam_date: string;
  marks_obtained: number;
  max_marks: number;
  grade?: string;
  remarks?: string;
  project_id: number;
  upload_id?: number;
  created_at: string;
  updated_at: string;
}

export interface ExamFilters {
  class_section?: string;
  class_name?: string;
  section?: string;
  exam_name?: string;
  subject?: string;
  month?: number;
  year?: number;
  date_from?: string;
  date_to?: string;
}

export interface StudentExamEntry {
  student_id: number;
  student_name: string;
  class_name: string;
  section: string | null;
  marks_obtained: number | null;
  max_marks: number | null;
  grade: string | null;
  remarks: string | null;
  record_id: number | null;
}

export interface ExamByClassResponse {
  class_section: string;
  exam_name: string;
  subject: string;
  exam_date: string | null;
  max_marks: number | null;
  students: StudentExamEntry[];
  total_students: number;
  average_marks: number | null;
  highest_marks: number | null;
  lowest_marks: number | null;
}

export interface BulkExamCreate {
  exam_name: string;
  subject: string;
  exam_date: string;
  max_marks: number;
  class_section: string;
  records: {
    student_id: number;
    marks_obtained: number;
    grade?: string;
    remarks?: string;
  }[];
}

export interface BulkExamResponse {
  total_records: number;
  successful: number;
  failed: number;
  errors: { student_id?: number; message: string }[];
  message: string;
}

export interface ExamUploadError {
  row: number;
  student_name?: string;
  column?: string;
  message: string;
}

export interface ExamUploadResult {
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  skipped_rows: number;
  errors: ExamUploadError[];
  message: string;
}

// Upload Types
export type UploadStatus = 'pending' | 'processing' | 'completed' | 'partial' | 'failed';
export type UploadType = 'attendance' | 'exam' | 'student' | 'other';

export interface Upload {
  id: number;
  file_name: string;
  file_size: number;
  upload_type: UploadType;
  status: UploadStatus;
  total_rows: number;
  successful_rows: number;
  failed_rows: number;
  error_message?: string;
  uploaded_by_id: number;
  uploaded_by_name?: string;
  project_id: number;
  processing_started_at?: string;
  processing_completed_at?: string;
  created_at: string;
  updated_at: string;
  errors?: UploadError[];
}

export interface UploadError {
  id: number;
  upload_id: number;
  row_number: number;
  column_name?: string;
  error_type: string;
  error_message: string;
  raw_value?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Audit Log Types
export interface AuditLog {
  id: number;
  action: string;
  entity_type: string;
  entity_id: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
  user: User;
  ip_address?: string;
  user_agent?: string;
  project_id: number;
  created_at: string;
}

// Notification Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: number;
  title: string;
  message: string;
  type: NotificationType;
  is_read: boolean;
  action_url?: string;
  user_id: number;
  created_at: string;
  read_at?: string;
}

// API Response Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  status_code: number;
}

// Dashboard Widget Types
export interface DashboardStats {
  pending_tasks: number;
  completed_tasks: number;
  recent_uploads: Upload[];
  failed_uploads: number;
  unread_notifications: number;
}

// User Management Types
export interface UserWithRoles extends User {
  roles: Role[];
  project_roles: {
    project_id: number;
    project_name: string;
    roles: Role[];
  }[];
}

export interface AssignRolePayload {
  user_id: number;
  role_ids: number[];
}

// Settings Types
export interface ProjectSettings {
  id: number;
  project_id: number;
  academic_year: string;
  default_timezone: string;
  attendance_cutoff_time: string;
  exam_grading_scale: Record<string, { min: number; max: number }>;
  notification_settings: {
    email_enabled: boolean;
    push_enabled: boolean;
  };
}
