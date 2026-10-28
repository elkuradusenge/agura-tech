/** Typed endpoint functions, one per backend route the app uses. */

import { api } from "./client";
import type {
  AdminAccount,
  AuthResponse,
  FundingInterestRead,
  HarvestRead,
  HarvestSummary,
  JobDetail,
  JobRead,
  MonitoringOverview,
  MushroomCell,
  NotificationRead,
  Page,
  PlantingCreateResponse,
  PlantingDetail,
  PlantingSummary,
  ProductDetail,
  ProductRead,
  QualityReport,
  RankingRun,
  SpecialistRequestRead,
  SurveyRead,
  TaskRead,
  TodayResponse,
  UserAccount,
  MappingRow,
} from "./types";

export const authApi = {
  register: (body: { phone: string; password: string; full_name?: string; language?: string }) =>
    api.post<AuthResponse<UserAccount>>("/auth/register", body),
  login: (body: { phone: string; password: string }) =>
    api.post<AuthResponse<UserAccount>>("/auth/login", body),
  adminMe: () => api.get<AdminAccount>("/auth/admin/me"),
  adminLogin: (body: { identifier: string; password: string }) =>
    api.post<AuthResponse<AdminAccount>>("/auth/admin/login", body),
  logout: (refresh_token: string | null) =>
    api.post<{ message: string }>("/auth/logout", { refresh_token }),
  requestReset: (phone: string) =>
    api.post<{ message: string; translation_key: string; debug_code: string | null }>(
      "/auth/password-reset/request",
      { phone },
    ),
  confirmReset: (body: { phone: string; code: string; new_password: string }) =>
    api.post<{ message: string }>("/auth/password-reset/confirm", body),
};

export const meApi = {
  read: () => api.get<UserAccount>("/me"),
  update: (body: Record<string, unknown>) => api.patch<UserAccount>("/me", body),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api.post<{ message: string }>("/me/password", body),
  deleteAccount: () => api.delete<{ deleted_at: string }>("/me"),
};

export const productsApi = {
  list: (query?: { q?: string; page?: number; page_size?: number }) =>
    api.get<Page<ProductRead>>("/products", { query }),
  detail: (id: string) => api.get<ProductDetail>(`/products/${id}`),
};

export const plantingsApi = {
  list: (query?: { status?: string; page?: number }) =>
    api.get<Page<PlantingSummary>>("/plantings", { query }),
  detail: (id: string) => api.get<PlantingDetail>(`/plantings/${id}`),
  create: (body: { product_id: string; quantity: number; started_on?: string; checklist?: unknown[] }) =>
    api.post<PlantingCreateResponse>("/plantings", body),
  update: (id: string, body: { status?: string; notes?: string }) =>
    api.patch<PlantingSummary>(`/plantings/${id}`, body),
};

export const tasksApi = {
  today: () => api.get<TodayResponse>("/tasks/today"),
  done: (id: string) => api.post<TaskRead>(`/tasks/${id}/done`),
  snooze: (id: string, hours: number) => api.post<TaskRead>(`/tasks/${id}/snooze`, { hours }),
  skip: (id: string, reason: string) => api.post<TaskRead>(`/tasks/${id}/skip`, { reason }),
};

export const notificationsApi = {
  list: (query?: { filter_by?: string; page?: number }) =>
    api.get<Page<NotificationRead>>("/notifications", { query }),
  unreadCount: () => api.get<{ unread: number }>("/notifications/unread-count"),
  markRead: (id: string) => api.post<NotificationRead>(`/notifications/${id}/read`),
};

export const harvestsApi = {
  create: (body: {
    planting_id: string;
    quantity_kg?: number;
    used_for: string;
    harvested_on?: string;
    notes?: string;
  }) => api.post<HarvestRead>("/harvests", body),
  list: (query?: { page?: number }) => api.get<Page<HarvestRead>>("/harvests", { query }),
  summary: () => api.get<HarvestSummary>("/harvests/summary"),
};

export const helpApi = {
  create: (body: { specialist_type: string; description: string; product_id?: string }) =>
    api.post<SpecialistRequestRead>("/specialist-requests", body),
  list: () => api.get<Page<SpecialistRequestRead>>("/specialist-requests"),
};

export const fundingApi = {
  create: (body: Record<string, unknown>) =>
    api.post<FundingInterestRead>("/funding-interest", body),
  list: () => api.get<Page<FundingInterestRead>>("/funding-interest"),
  partners: () => api.get<{ partners: Array<{ code: string; name: string; role: string }> }>("/partners"),
};

export const adminSurveysApi = {
  upload: (file: File, fields: { name: string; year: string; keep_file: string }) =>
    api.upload<{ survey: SurveyRead; job: JobRead }>("/admin/surveys/upload", file, fields),
  list: () => api.get<Page<SurveyRead>>("/admin/surveys"),
  detail: (id: string) => api.get<SurveyRead>(`/admin/surveys/${id}`),
  remove: (id: string) => api.delete<{ message: string }>(`/admin/surveys/${id}`),
  job: (id: string) => api.get<JobDetail>(`/admin/jobs/${id}`),
  mapping: (jobId: string) =>
    api.get<{ survey_id: string; confirmed: boolean; variables: MappingRow[] }>(
      `/admin/jobs/${jobId}/mapping`,
    ),
  confirmMapping: (jobId: string, updates: Array<{ variable_name: string; yes_code?: string | null }>) =>
    api.post<JobRead>(`/admin/jobs/${jobId}/mapping`, { updates }),
  quality: (surveyId: string) =>
    api.get<QualityReport>(`/admin/surveys/${surveyId}/quality-report`),
  dictionary: (surveyId: string) =>
    api.get<{ variables: Array<{ variable_name: string; label: string | null; section: string | null }> }>(
      `/admin/surveys/${surveyId}/dictionary`,
    ),
};

export const adminAnalysisApi = {
  mushroom: (query: { survey_id?: string; level?: string }) =>
    api.get<{ meta: unknown; items: MushroomCell[] }>("/admin/analysis/mushroom", { query }),
  foodSummary: (query: Record<string, string | number | undefined>) =>
    api.get<{ meta: unknown; items: Array<Record<string, unknown>> }>(
      "/admin/analysis/province-food-summary",
      { query },
    ),
  diversity: (query: Record<string, string | undefined>) =>
    api.get<{ meta: unknown; items: Array<Record<string, unknown>> }>("/admin/analysis/diversity", {
      query,
    }),
  readiness: (query: Record<string, string | undefined>) =>
    api.get<{ meta: unknown; items: Array<Record<string, unknown>> }>("/admin/analysis/readiness", {
      query,
    }),
  foodItems: (query?: { q?: string; group?: string }) =>
    api.get<Page<{ id: string; standard_name: string; group: string; source_variable: string }>>(
      "/admin/food-items",
      { query },
    ),
};

export const adminAiApi = {
  run: (body: Record<string, unknown>) => api.post<RankingRun>("/admin/ai/rankings", body),
  latest: (query?: { survey_id?: string; province?: string }) =>
    api.get<RankingRun>("/admin/ai/rankings/latest", { query }),
  nutrition: (query?: { page?: number }) =>
    api.get<Page<Record<string, unknown>>>("/admin/nutrition-reference", { query }),
  upsertNutrition: (body: Record<string, unknown>) =>
    api.put<Record<string, unknown>>("/admin/nutrition-reference", body),
  seedTemplates: () => api.post<{ written: number }>("/admin/message-templates/seed"),
};

export const adminProductsApi = {
  list: (query?: { status?: string; page?: number }) =>
    api.get<Page<ProductRead>>("/admin/products", { query }),
  detail: (id: string) => api.get<ProductDetail>(`/admin/products/${id}`),
  create: (body: Record<string, unknown>) => api.post<ProductDetail>("/admin/products", body),
  update: (id: string, body: Record<string, unknown>) =>
    api.put<ProductDetail>(`/admin/products/${id}`, body),
  markTrackable: (id: string) =>
    api.post<{ product: ProductRead; blockers: unknown[] }>(`/admin/products/${id}/mark-trackable`),
  pause: (id: string) => api.post<ProductRead>(`/admin/products/${id}/pause`),
  retire: (id: string) => api.post<ProductRead>(`/admin/products/${id}/retire`),
  statusTable: () =>
    api.get<Page<Record<string, unknown>>>("/admin/products/status-table"),
};

export const adminMonitoringApi = {
  overview: () => api.get<MonitoringOverview>("/admin/monitoring/overview"),
  funnel: () =>
    api.get<{ stages: Array<{ key: string; count: number }> }>("/admin/monitoring/funnel"),
  signups: () =>
    api.get<{ series: Array<{ date: string; count: number }> }>("/admin/monitoring/signups"),
  smsFailures: (query?: { page?: number; status?: string }) =>
    api.get<Page<Record<string, unknown>>>("/admin/monitoring/sms-failures", { query }),
  runReminders: () => api.post<Record<string, number>>("/admin/monitoring/run-reminders"),
};

export const adminSupportApi = {
  specialistRequests: (query?: { status?: string; page?: number }) =>
    api.get<Page<SpecialistRequestRead>>("/admin/specialist-requests", { query }),
  updateSpecialistRequest: (id: string, body: Record<string, unknown>) =>
    api.patch<SpecialistRequestRead>(`/admin/specialist-requests/${id}`, body),
  fundingInterest: (query?: { status?: string; page?: number }) =>
    api.get<Page<FundingInterestRead>>("/admin/funding-interest", { query }),
  referToBrd: (id: string, body: { brd_reference?: string; note?: string }) =>
    api.post<FundingInterestRead>(`/admin/funding-interest/${id}/refer-to-brd`, body),
  templates: (query?: { key?: string; language?: string }) =>
    api.get<{ items: Array<Record<string, unknown>>; available_variables: string[] }>(
      "/admin/message-templates",
      { query },
    ),
  saveTemplate: (key: string, language: string, body: Record<string, unknown>) =>
    api.put<Record<string, unknown>>(`/admin/message-templates/${key}/${language}`, body),
  auditLog: (query?: { action?: string; page?: number }) =>
    api.get<Page<Record<string, unknown>>>("/admin/audit-log", { query }),
  users: (query?: { q?: string; page?: number }) =>
    api.get<Page<Record<string, unknown>>>("/admin/users", { query }),
  suspendUser: (id: string) => api.post<Record<string, unknown>>(`/admin/users/${id}/suspend`),
  reactivateUser: (id: string) => api.post<Record<string, unknown>>(`/admin/users/${id}/reactivate`),
  resetUserPassword: (id: string) =>
    api.post<{ temporary_password: string }>(`/admin/users/${id}/reset-password`),
  settings: () =>
    api.get<{ items: Array<{ key: string; value: unknown; description: string | null }> }>(
      "/admin/settings",
    ),
  updateSetting: (key: string, value: unknown) =>
    api.put<{ key: string; value: unknown }>(`/admin/settings/${key}`, { value }),
};
