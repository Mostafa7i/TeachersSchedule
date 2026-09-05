// constants/index.js - Application-wide constants

export const DAYS_OF_WEEK = [
  'الأحد',
  'الإثنين',
  'الثلاثاء',
  'الأربعاء',
  'الخميس',
  'الجمعة',
  'السبت',
];

export const WORK_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export const PERMISSIONS = {
  // Schedules
  SCHEDULES_VIEW: 'schedules.view',
  SCHEDULES_CREATE: 'schedules.create',
  SCHEDULES_EDIT: 'schedules.edit',
  SCHEDULES_DELETE: 'schedules.delete',
  SCHEDULES_EXPORT: 'schedules.export',
  SCHEDULES_EDIT_TITLE: 'schedules.edit_title',
  SCHEDULES_EDIT_HOMEWORK: 'schedules.edit_homework',
  SCHEDULES_EDIT_ACTIVITIES: 'schedules.edit_activities',
  SCHEDULES_EDIT_NOTES: 'schedules.edit_notes',
  SCHEDULES_COPY_WEEK: 'schedules.copy_week',
  // Users
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_DELETE: 'users.delete',
  // Roles
  ROLES_VIEW: 'roles.view',
  ROLES_CREATE: 'roles.create',
  ROLES_EDIT: 'roles.edit',
  ROLES_DELETE: 'roles.delete',
  // Subjects
  SUBJECTS_VIEW: 'subjects.view',
  SUBJECTS_CREATE: 'subjects.create',
  SUBJECTS_EDIT: 'subjects.edit',
  SUBJECTS_DELETE: 'subjects.delete',
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT: 'settings.edit',
  // Audit Logs
  AUDIT_VIEW: 'audit-logs.view',
};

export const MODULES = [
  { key: 'users', label: 'المستخدمون' },
  { key: 'schedules', label: 'الجداول' },
  { key: 'subjects', label: 'المواد' },
  { key: 'roles', label: 'الأدوار' },
  { key: 'permissions', label: 'الصلاحيات' },
  { key: 'settings', label: 'الإعدادات' },
  { key: 'audit-logs', label: 'سجل العمليات' },
];

export const SUBJECT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export const STATUS_LABELS = {
  active: 'نشط',
  inactive: 'معطل',
};
