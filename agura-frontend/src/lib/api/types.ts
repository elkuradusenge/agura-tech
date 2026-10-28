/** Wire types mirroring the backend OpenAPI schema. */

export type Language = "rw" | "en" | "fr";

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface Page<T> {
  items: T[];
  pagination: Pagination;
}

export interface ApiErrorBody {
  error: {
    code: string;
    translation_key: string;
    message: string;
    details?: unknown;
  };
}

export interface UserAccount {
  id: string;
  phone: string;
  full_name: string | null;
  language: Language;
  province: string | null;
  district: string | null;
  status: "active" | "suspended" | "deleted";
  phone_verified: boolean;
  data_saver: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  reminder_morning_time: string;
  reminder_evening_time: string;
  message_opt_in: boolean;
  created_at: string;
}

export interface AdminAccount {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "super_admin" | "content_editor" | "data_analyst" | "support_agent";
  status: "active" | "suspended";
  permissions: string[];
  last_login_at: string | null;
  created_at: string;
}

export interface AuthResponse<TAccount> {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  expires_in: number;
  account: TAccount;
}

export type ProductStatus = "draft" | "trackable" | "paused" | "retired";
export type AgeGroup =
  | "kids_1_5"
  | "children_6_12"
  | "young_13_24"
  | "adults"
  | "older_60_plus";
export type TaskType =
  | "irrigation"
  | "spray_or_treatment"
  | "check"
  | "harvest"
  | "other";
export type TaskStatus = "pending" | "done" | "snoozed" | "skipped" | "missed";
export type TimeOfDay = "morning" | "evening";

export interface ProductRead {
  id: string;
  food_item_id: string | null;
  name_en: string;
  name_rw: string | null;
  photo_url: string | null;
  description_en: string | null;
  description_rw: string | null;
  status: ProductStatus;
  version: number;
  time_to_harvest_min_days: number | null;
  time_to_harvest_max_days: number | null;
  reviewer_name: string | null;
  reviewer_organisation: string | null;
  review_date: string | null;
  needs_expert_review: boolean;
  growing_steps_validated: boolean;
  published_at: string | null;
  created_at: string;
}

export interface ProductBenefit {
  age_group: AgeGroup;
  benefit_text: string | null;
}

export interface ProductNutrient {
  nutrient: string;
  amount_per_100g: number | null;
  unit: string | null;
  source: string | null;
}

export interface ScheduleTask {
  id: string;
  task_type: TaskType;
  day_offset: number;
  repeat_rule: "once" | "daily" | "weekly" | "custom";
  repeat_weekday: number | null;
  repeat_interval_days: number | null;
  repeat_until_day: number | null;
  time_of_day: TimeOfDay;
  instruction_text: string;
  reminder_enabled: boolean;
}

export interface ProvinceContext {
  available: boolean;
  province: string | null;
  share: number | null;
  suppressed: boolean;
  translation_key: string | null;
  source_name: string | null;
  source_year: number | null;
  survey_name: string | null;
}

export interface ProductDetail extends ProductRead {
  how_not_to_use: string | null;
  how_to_preserve: string | null;
  conditions_diseases: string | null;
  conditions_note_translation_key: string;
  harvest_method: string | null;
  irrigation_method: string | null;
  irrigation_frequency: "daily" | "weekly" | "custom" | null;
  irrigation_time_of_day: TimeOfDay | null;
  place_type: string | null;
  temperature_min_c: number | null;
  temperature_max_c: number | null;
  humidity_min_pct: number | null;
  humidity_max_pct: number | null;
  resources: Array<{ name: string; quantity?: string; estimated_cost?: number }>;
  recipes: Array<{ name: string; ingredients?: string[]; steps?: string }>;
  season_suitability: Record<string, unknown>;
  spray_details: Record<string, unknown>;
  benefits: ProductBenefit[];
  nutrients: ProductNutrient[];
  schedule_tasks: ScheduleTask[];
  province_context?: ProvinceContext | null;
}

export interface TaskRead {
  id: string;
  planting_id: string;
  task_type: TaskType;
  due_at: string;
  time_of_day: TimeOfDay;
  instruction_text: string;
  status: TaskStatus;
  completed_at: string | null;
  snoozed_until: string | null;
  skipped_reason: string | null;
  is_urgent: boolean;
}

export interface PlantingSummary {
  id: string;
  product_id: string;
  product_version: number;
  status: "active" | "paused" | "finished";
  quantity: number;
  started_on: string;
  expected_harvest_on: string | null;
  notes: string | null;
  created_at: string;
  product_name_en: string;
  product_name_rw: string | null;
  photo_url: string | null;
  progress_percent: number;
  days_left: number | null;
  next_task: TaskRead | null;
  checklist_snapshot: Array<Record<string, unknown>>;
}

export interface PlantingDetail extends PlantingSummary {
  tasks: TaskRead[];
  harvests: Array<Record<string, unknown>>;
}

export interface PlantingCreateResponse {
  planting: PlantingSummary;
  first_tasks: TaskRead[];
  expected_harvest_on: string | null;
}

export interface TodayResponse {
  date: string;
  morning: TaskRead[];
  evening: TaskRead[];
  completed_today: number;
}

export interface NotificationRead {
  id: string;
  type: string;
  title_translation_key: string;
  body_translation_key: string;
  /** Resolved from the admin editable template, in the farmer's language. */
  title: string | null;
  body: string | null;
  params: Record<string, unknown>;
  task_instance_id: string | null;
  sms_sent: boolean;
  read_at: string | null;
  created_at: string;
}

export interface HarvestRead {
  id: string;
  planting_id: string;
  harvested_on: string;
  quantity_kg: number | null;
  quantity_note: string | null;
  used_for: "eaten" | "sold" | "preserved";
  notes: string | null;
  created_at: string;
}

export interface HarvestSummary {
  total_kg: number;
  by_use: Record<string, number>;
  count: number;
}

export interface SpecialistRequestRead {
  id: string;
  product_id: string | null;
  specialist_type: "agronomist" | "experienced_farmer" | "training_visit";
  description: string;
  photo_url: string | null;
  status: "new" | "assigned" | "contacted" | "closed";
  assigned_to: string | null;
  contacted_at: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface FundingInterestRead {
  id: string;
  product_id: string | null;
  planned_size: string;
  location: string;
  building_or_land: string;
  experience: string | null;
  funding_needed: number | null;
  consent_to_share: boolean;
  consent_at: string | null;
  status: "new" | "reviewing" | "referred_to_brd" | "closed";
  referred_to_brd_at: string | null;
  brd_reference: string | null;
  created_at: string;
}

export interface SuppressedValue {
  value: number | null;
  count: number | null;
  suppressed: boolean;
  translation_key: string | null;
  threshold: number;
}

export interface AnalysisMeta {
  survey_id: string;
  survey_name: string;
  survey_year: number;
  source_name: string;
  source_year: number;
  small_cell_threshold: number;
  weighted: boolean;
}

export interface MushroomCell {
  level: string;
  province: string | null;
  district: string | null;
  sector: string | null;
  households_total: SuppressedValue;
  mushroom_households: SuppressedValue;
  share: SuppressedValue;
  unweighted_share: SuppressedValue;
  urban_share_of_mushroom: SuppressedValue;
  rural_share_of_mushroom: SuppressedValue;
  female_headed_share: SuppressedValue;
  existing_activity_share: SuppressedValue;
}

export interface RankingItem {
  rank: number;
  food_item_id: string;
  standard_name: string | null;
  province: string | null;
  gap_score: number | null;
  nutrition_value: number | null;
  nutrition_need: number | null;
  feasibility: number | null;
  total_score: number | null;
  cluster_label: string | null;
  explanation: string;
  pinned: boolean;
  reason_fields: Record<string, unknown>;
}

export interface RankingRun {
  id: string;
  survey_id: string | null;
  status: "pending" | "running" | "completed" | "failed";
  weights: Record<string, number>;
  score_basis: string;
  cluster_count: number | null;
  silhouette: number | null;
  warnings: string[];
  created_at: string;
  items: RankingItem[];
  clusters: Array<{
    level: string;
    unit: string;
    cluster_label: string;
    summary: Record<string, unknown>;
  }>;
}

export interface SurveyRead {
  id: string;
  name: string;
  year: number;
  original_filename: string;
  file_size_bytes: number;
  status: string;
  rows_raw: number | null;
  mapping_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobRead {
  id: string;
  survey_id: string;
  status: string;
  stage: string;
  progress_percent: number;
  rows_processed: number;
  error_code: string | null;
  error_message: string | null;
  error_translation_key: string | null;
  error_stage: string | null;
  summary: Record<string, unknown>;
  created_at: string;
}

export interface JobDetail extends JobRead {
  events: Array<{
    id: string;
    type: string;
    stage: string | null;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
}

export interface MappingRow {
  variable_name: string;
  platform_group: string;
  yes_code: string | null;
  yes_label: string | null;
  confirmed: boolean;
}

export interface QualityReport {
  survey_id: string;
  rows_raw: number;
  rows_after_dedup: number;
  exact_duplicate_rows: number;
  household_rows_read: number;
  duplicate_households: number;
  duplicate_persons: number;
  households_loaded: number;
  persons_loaded: number;
  household_variable_conflicts: number;
  rule_violations: Array<{ rule: string; count: number; detail: string }>;
  missing_rates: Record<string, number>;
  warnings: string[];
}

export interface MonitoringOverview {
  users: { total: number; active: number };
  plantings: { total: number; active: number };
  tasks: { total: number; done: number; completion_rate: number | null };
  reminders: { created: number; sms_sent: number; sms_failed: number };
  specialist_requests: { open: number };
  products: { trackable: number };
  harvests: { total: number };
}

export interface WsMessage {
  type: string;
  id: string;
  timestamp: string | null;
  payload: Record<string, unknown>;
}
