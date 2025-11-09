import sampleData from "@/__mocks__/sample.json";
import { getAccessToken } from "@/lib/auth";
import {
  mockAlerts,
  mockDivergences,
  mockFees,
  mockStatements
} from "@/lib/conciliation";
import type {
  BankStatementRow,
  ContractFeeDetail,
  DivergenceReport,
  FinancialAlert
} from "@/lib/conciliation";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ??
  (process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
    : "");

const ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

const SUPABASE_REST_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "")}/rest/v1`
  : "";

const SUPABASE_REST_KEY = ANON_KEY ?? "";

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE não definido. Usando fallback baseado em SUPABASE_URL:",
    API_BASE || "Nenhum"
  );
} else {
  console.log("[api] API_BASE configurado:", API_BASE);
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

interface FetchConfig {
  expectsBlob?: boolean;
  skipAuth?: boolean;
}

async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  config: FetchConfig = {}
): Promise<T> {
  const baseUrl = API_BASE.replace(/\/$/, "");
  const urlPath = path.replace(/^\/+/, "");

  const headers = new Headers(init.headers);

  if (!config.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (ANON_KEY) {
    headers.set("apikey", ANON_KEY);
  }

  const bodyIsFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !bodyIsFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}/${urlPath}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      // ignore
    }
    throw new ApiError(response.statusText, response.status, payload);
  }

  if (config.expectsBlob) {
    return (await response.blob()) as T;
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

async function supabaseRestFetch<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  if (!SUPABASE_REST_URL || !SUPABASE_REST_KEY) {
    throw new Error("Supabase REST configuration missing");
  }

  const headers = new Headers(init.headers ?? {});
  headers.set("apikey", SUPABASE_REST_KEY);
  headers.set("Authorization", `Bearer ${SUPABASE_REST_KEY}`);

  const bodyIsFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !bodyIsFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${SUPABASE_REST_URL}/${path}`, {
    ...init,
    headers
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => response.statusText);
    throw new ApiError(`Supabase REST error: ${response.statusText}`, response.status, payload);
  }

  return (await response.json()) as T;
}

// -----------------------
// Tipos principais
// -----------------------

export interface KpiMonthlyResponse {
  cards: Array<{
    label: string;
    value: number;
    delta?: number;
    caption?: string;
  }>;
  lineSeries: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  cashflow: Array<{
    category: string;
    in: number;
    out: number;
  }>;
  bridge: Array<{
    label: string;
    type: "increase" | "decrease" | "total";
    amount: number;
  }>;
  table: Array<Record<string, number | string>>;
}

export interface DashboardMetricsResponse {
  metrics: Array<{
    label: string;
    value: string | number;
    trend?: {
      value: number;
      direction: "up" | "down" | "flat";
    };
  }>;
  alerts: Array<{
    id: string;
    title: string;
    type: "error" | "warning" | "success";
    description: string;
    created_at: string;
  }>;
  cashflow: Array<{
    date: string;
    in: number;
    out: number;
  }>;
}

export interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  avatar_url?: string | null;
  role: string;
  two_factor_enabled?: boolean;
  default_company_cnpj?: string | null;
  available_companies: string[];
}

// -----------------------
// Auth & Perfil
// -----------------------

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
    avatar_url?: string | null;
  };
}

export interface DashboardCard {
  id: string;
  label: string;
  value: number;
  delta?: number;
  suffix?: string;
  caption?: string;
  trend?: "up" | "down" | "flat";
}

export interface DashboardCardsResponse {
  cards: DashboardCard[];
  generated_at?: string;
}

export async function postAuthLogin(payload: LoginPayload) {
  return apiFetch<LoginResponse>(
    "auth-login",
    {
      method: "POST",
      body: JSON.stringify(payload)
    },
    { skipAuth: true }
  );
}

export async function fetchProfile() {
  return apiFetch<ProfileResponse>("profile");
}

// -----------------------
// Dashboard & Análises
// -----------------------

type TargetParam = { type: "alias" | "cnpj"; value: string };

function buildTargetQuery(target: TargetParam) {
  if (target.type === "alias") {
    return `alias=${encodeURIComponent(target.value)}`;
  }
  return `cnpj=${encodeURIComponent(target.value)}`;
}

export interface RangeParams {
  target: TargetParam;
  from: string;
  to: string;
}

export async function getMonthlyKPI({ target, from, to }: RangeParams) {
  const query = `?${buildTargetQuery(target)}&from=${from}&to=${to}`;
  try {
    return await apiFetch<KpiMonthlyResponse>(`kpi-monthly${query}`);
  } catch (error) {
    console.warn("[api] getMonthlyKPI fallback", error);
    const sampleKpis = sampleData.kpis ?? {};
    const lineSeries =
      sampleKpis.lineSeries?.map((item: any) => {
        const revenue = item.revenue ?? item.Receita ?? item.receita ?? 0;
        const expenses = item.expenses ?? item.Custos ?? item.custos ?? 0;
        const additionalExpenses = item.despesas ?? item.Despesas ?? 0;
        const profit = item.profit ?? item.lucro ?? item.ebitda ?? revenue - expenses - additionalExpenses;
        return {
          month: item.month ?? item.mes ?? "",
          revenue,
          expenses: expenses + additionalExpenses,
          profit
        };
      }) ?? [];
    const cashflow =
      sampleKpis.cashflow?.map((item: any) => ({
        category: item.category ?? item.month ?? "",
        in: item.in ?? item.Entrada ?? 0,
        out: item.out ?? item.Saída ?? item.Saida ?? 0
      })) ?? [];
    const bridge =
      sampleKpis.bridge?.map((item: any, index: number) => ({
        label: item.label ?? `Item ${index + 1}`,
        type: (item.type as "increase" | "decrease" | "total") ?? (index === 0 ? "increase" : "decrease"),
        amount: item.amount ?? item.value ?? 0
      })) ?? [];
    const table =
      sampleKpis.table?.map((row: any) => ({
        month: row.month ?? row.mes ?? "",
        revenue: row.revenue ?? row.receita ?? 0,
        expenses: (row.expenses ?? row.despesas ?? 0) + (row.custos ?? 0),
        profit: row.profit ?? row.ebitda ?? 0,
        margin_percent: row.margin_percent ?? row.margem ?? 0
      })) ?? [];

    return {
      cards: sampleKpis.cards ?? [],
      lineSeries,
      cashflow,
      bridge,
      table
    } satisfies KpiMonthlyResponse;
  }
}

export async function getDashboardMetrics(target: TargetParam) {
  const query = `?${buildTargetQuery(target)}`;
  try {
    return await apiFetch<DashboardMetricsResponse>(`dashboard-metrics${query}`);
  } catch (error) {
    console.warn("[api] getDashboardMetrics fallback", error);
    const alerts = (sampleData.profile.notifications ?? []).slice(0, 2).map((alert: any) => ({
      id: alert.id ?? alert.uuid ?? `${alert.title}-${Math.random()}`,
      title: alert.title,
      type: alert.type,
      description: alert.description,
      created_at: alert.created_at ?? alert.createdAt ?? alert.timestamp ?? new Date().toISOString()
    }));
    return {
      metrics: sampleData.reports.kpis.metrics,
      alerts,
      cashflow: sampleData.reports.cashflow.series
    };
  }
}

export async function getDashboardCards(target: TargetParam) {
  const query = `?${buildTargetQuery(target)}`;
  try {
    return await apiFetch<DashboardCardsResponse>(`dashboard-cards${query}`);
  } catch (error) {
    console.warn("[api] getDashboardCards fallback", error);
    const base = sampleData.kpis?.cards ?? [];
    const extras = [
      { label: "Runway (meses)", value: 6.4, delta: 0, suffix: "meses", trend: "flat", caption: "proj. suave" },
      { label: "Burn Rate", value: 180000, delta: -0.12, caption: "mês" },
      { label: "DSO", value: 38, suffix: "dias", caption: "méd." },
      { label: "DPO", value: 43, suffix: "dias", caption: "méd." },
      { label: "Faturas vencidas", value: 12, caption: "+3 vs. semana" },
      { label: "Top despesas", value: 6, caption: "categorias" }
    ];
    const normalized = (base as any[])
      .map((item, index) => {
        const delta = typeof item.delta === "number" ? item.delta : undefined;
        const trend: DashboardCard["trend"] =
          delta === undefined ? "flat" : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
        return {
          id: `${item.label}-${index}`,
          label: item.label,
          value: typeof item.value === "number" ? item.value : Number(item.value) || 0,
          delta,
          caption: item.caption,
          trend
        };
      })
      .slice(0, 6);
    const payload: DashboardCard[] = normalized
      .concat(
        extras.map((extra, index) => ({
          id: `extra-${index}`,
          label: extra.label,
          value: extra.value,
          delta: extra.delta,
          suffix: extra.suffix,
          caption: extra.caption,
          trend: (extra.trend as DashboardCard["trend"]) ?? "flat"
        }))
      )
      .slice(0, 12);
    return {
      cards: payload,
      generated_at: new Date().toISOString()
    };
  }
}

export async function postAnalyze(style: "creative" | "technical", target: TargetParam) {
  const base = `analyze?style=${style}&${buildTargetQuery(target)}`;
  try {
    return await apiFetch<{ sections: unknown[] }>(base, { method: "POST" });
  } catch (error) {
    console.warn("[api] postAnalyze fallback", error);
    return { sections: sampleData.analysis[style] };
  }
}

export async function exportExcel(target: TargetParam, range?: { from?: string; to?: string }) {
  const params = new URLSearchParams(buildTargetQuery(target));
  if (range?.from) params.append("from", range.from);
  if (range?.to) params.append("to", range.to);
  return apiFetch<Blob>(`export-excel?${params.toString()}`, {}, { expectsBlob: true });
}

export async function uploadDre(file: File, target: TargetParam) {
  const formData = new FormData();
  formData.append("file", file);
  if (target.type === "alias") {
    formData.append("alias", target.value);
  } else {
    formData.append("cnpj", target.value);
  }
  return apiFetch<{ ok: boolean; message?: string; job_id?: string }>("upload-dre", {
    method: "POST",
    body: formData
  });
}

// -----------------------
// Targets & Empresas
// -----------------------

export interface TargetsResponse {
  aliases: Array<{
    id: string;
    label: string;
    members: string[];
  }>;
  cnpjs: Array<{
    value: string;
    label: string;
  }>;
}

export async function getTargets() {
  return apiFetch<TargetsResponse>("targets");
}

export async function getEmpresas(params?: { status?: string; integration?: string }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.integration) search.set("integration", params.integration);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch("empresas" + suffix);
}

// -----------------------
// Admin – Segurança
// -----------------------

export interface AdminSecurityTrafficPoint {
  timestamp: string;
  function_name: string;
  request_count: number;
  avg_latency_ms: number;
  error_count: number;
  request_bytes: number;
  response_bytes: number;
}

export interface AdminSecurityTrafficResponse {
  hourly: AdminSecurityTrafficPoint[];
  totals: {
    requests: number;
    bandwidth_in_mb: number | string;
    bandwidth_out_mb: number | string;
    error_rate: number | string;
  };
}

export async function getAdminSecurityTraffic(range: "past_24h" | "past_7d" = "past_24h") {
  return apiFetch<AdminSecurityTrafficResponse>(`admin-security-traffic?range=${range}`);
}

export interface VulnerabilityItem {
  id: string;
  title: string;
  severity: string;
  status: string;
  detected_at: string;
  owner: string;
}

export interface AdminSecurityOverviewResponse {
  cards: Array<{ label: string; value: number; trend: number }>;
  vulnerabilities: {
    distribution: Array<{ severity: string; count: number }>;
    list: VulnerabilityItem[];
  };
  recent_logins: Array<{ user: string; status: string; timestamp: string }>;
}

export interface AdminSecurityDatabasePoint {
  timestamp: string;
  active_connections: number;
  db_size_mb: number;
  avg_query_time_ms: number;
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
}

export interface GaugeStatus {
  value: number;
  status: string;
}

export interface AdminSecurityDatabaseResponse {
  time_series: AdminSecurityDatabasePoint[];
  gauges: {
    cpu: GaugeStatus;
    memory: GaugeStatus;
    disk: GaugeStatus;
  };
}

export async function getAdminSecurityDatabase(range: "past_24h" | "past_7d" = "past_24h") {
  return apiFetch<AdminSecurityDatabaseResponse>(`admin-security-database?range=${range}`);
}

export async function getAdminSecurityOverview() {
  try {
    return await apiFetch<AdminSecurityOverviewResponse>("admin-security-overview");
  } catch (error) {
    console.warn("[api] getAdminSecurityOverview fallback", error);
    return sampleSecurityOverview;
  }
}

export async function getAdminSecuritySessions() {
  try {
    return await apiFetch<AdminSecuritySessionsResponse>("admin-security-sessions");
  } catch (error) {
    console.warn("[api] getAdminSecuritySessions fallback", error);
    return sampleSecuritySessions;
  }
}

export async function getAdminSecurityBackups() {
  try {
    return await apiFetch<AdminSecurityBackupsResponse>("admin-security-backups");
  } catch (error) {
    console.warn("[api] getAdminSecurityBackups fallback", error);
    return sampleSecurityBackups;
  }
}

export interface AdminSecuritySession {
  user: string;
  ip: string;
  device: string;
  location: string;
  status: string;
  last_activity: string;
}

export interface AdminSecuritySessionsResponse {
  sessions: AdminSecuritySession[];
  device_distribution: Array<{ type: string; count: number }>;
  country_distribution: Array<{ country: string; count: number }>;
}

export interface AdminSecurityBackup {
  date: string;
  status: string;
  size_mb: number;
  duration_seconds: number;
  notes: string;
}

export interface AdminSecurityBackupsResponse {
  backups: AdminSecurityBackup[];
  stats: {
    success_rate: number;
    avg_duration_min: number;
  };
}

const sampleSecurityOverview: AdminSecurityOverviewResponse = {
  cards: [
    { label: "Incidentes críticos", value: 2, trend: -1 },
    { label: "Vulnerabilidades", value: 4, trend: 0 },
    { label: "Logins suspeitos", value: 3, trend: 1 }
  ],
  vulnerabilities: {
    distribution: [
      { severity: "critical", count: 1 },
      { severity: "high", count: 2 },
      { severity: "warning", count: 3 }
    ],
    list: [
      {
        id: "vuln-1",
        title: "SQL Injection em filtro",
        severity: "critical",
        status: "open",
        detected_at: new Date().toISOString(),
        owner: "time-security"
      }
    ]
  },
  recent_logins: [
    { user: "alceu@ifin.app.br", status: "success", timestamp: new Date().toISOString() }
  ]
};

const sampleSecuritySessions: AdminSecuritySessionsResponse = {
  sessions: [
    {
      user: "alceu@ifin.app.br",
      ip: "192.168.1.100",
      device: "desktop - Chrome/macOS",
      location: "São Paulo, BR",
      status: "active",
      last_activity: new Date().toISOString()
    }
  ],
  device_distribution: [
    { type: "desktop", count: 10 },
    { type: "mobile", count: 5 }
  ],
  country_distribution: [
    { country: "BR", count: 8 },
    { country: "US", count: 3 }
  ]
};

const sampleSecurityBackups: AdminSecurityBackupsResponse = {
  backups: [
    { date: "2025-11-06", status: "success", size_mb: 512, duration_seconds: 120, notes: "Nightly backup" }
  ],
  stats: {
    success_rate: 98,
    avg_duration_min: 3.2
  }
};

// -----------------------
// Admin – Gestão
// -----------------------

export interface GetAdminUsersParams {
  limit?: number;
  search?: string;
  role?: string;
}

export async function getAdminUsers(params: GetAdminUsersParams = {}): Promise<any[]> {
  const query = new URLSearchParams();
  if (params.limit) query.set("limit", String(params.limit));
  if (params.search) query.set("search", params.search);
  if (params.role && params.role !== "all") query.set("role", params.role);

  const suffix = query.toString() ? `?${query.toString()}` : "";

  try {
    return await apiFetch(`admin-users${suffix}`);
  } catch (error) {
    console.warn("[api] getAdminUsers fallback", error);
    return sampleData.admin?.users ?? [];
  }
}

export async function createAdminUser(payload: {
  email: string;
  name: string;
  role: string;
  password?: string;
}) {
  return apiFetch("admin-users", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminUser(id: string, payload: Record<string, unknown>) {
  return apiFetch(`admin-users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminUser(id: string) {
  return apiFetch(`admin-users/${id}`, { method: "DELETE" });
}

export interface AdminApiKey {
  id: string;
  name: string;
  provider: string;
  type: string;
  status: string;
  lastUsed?: string;
  masked: string;
  description?: string;
}

export async function getAdminApiKeys(): Promise<AdminApiKey[]> {
  try {
    return await apiFetch("admin-api-keys");
  } catch (error) {
    console.warn("[api] getAdminApiKeys fallback", error);
    const sampleKeys =
      sampleData.admin?.apiKeys?.map((key: any) => ({
        id: key.id,
        name: key.name,
        provider: key.provider,
        type: key.type,
        status: key.status,
        masked: key.masked,
        lastUsed: key.lastUsed ?? key.last_used ?? undefined,
        description: key.description
      })) ?? [
        {
          id: "demo",
          name: "OPENAI_API_KEY",
          provider: "openai",
          type: "llm",
          status: "active",
          masked: "sk-prod-****demo",
          lastUsed: "2025-11-06T10:00:00Z"
        }
      ];
    return sampleKeys;
  }
}

export async function createAdminApiKey(payload: { label: string; scopes: string[]; expires_in_days?: number }) {
  return apiFetch("admin-api-keys", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateAdminApiKey(id: string, payload: Record<string, unknown>) {
  return apiFetch(`admin-api-keys/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminApiKey(id: string) {
  return apiFetch(`admin-api-keys/${id}`, { method: "DELETE" });
}

export async function getAdminLlmConfig(endpoint: "providers" | "models" | "contexts" | "usage", params?: Record<string, string>) {
  const search = new URLSearchParams({ endpoint });
  if (params) {
    Object.entries(params).forEach(([key, value]) => search.set(key, value));
  }
  return apiFetch(`admin-llm-config?${search.toString()}`);
}

export async function updateAdminLlmConfig(payload: Record<string, unknown> = {}) {
  return apiFetch("admin-llm-config", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function getAdminFranchises(): Promise<any[]> {
  try {
    return await apiFetch("admin/franchises");
  } catch (error) {
    console.warn("[api] getAdminFranchises fallback", error);
    return sampleData.admin?.franchises ?? [];
  }
}

export async function upsertFranchise(payload: Record<string, unknown> = {}) {
  return apiFetch("admin/franchises", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

// -----------------------
// WhatsApp
// -----------------------

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQuerySuffix(params?: QueryParams) {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, String(value));
  });
  const result = search.toString();
  return result ? `?${result}` : "";
}

export async function getWhatsappConversations(params?: QueryParams) {
  const suffix = buildQuerySuffix(params);
  try {
    return await apiFetch<any[]>(`whatsapp-conversations${suffix}`);
  } catch (error) {
    console.warn("[api] getWhatsappConversations fallback", error);
    return sampleData.whatsapp?.conversations ?? [];
  }
}

export async function getWhatsappScheduled(params?: QueryParams) {
  const suffix = buildQuerySuffix(params);
  try {
    return await apiFetch<any[]>(`whatsapp-scheduled${suffix}`);
  } catch (error) {
    console.warn("[api] getWhatsappScheduled fallback", error);
    return sampleData.whatsapp?.scheduled ?? [];
  }
}

export async function getWhatsappTemplates(params?: QueryParams) {
  const suffix = buildQuerySuffix(params);
  try {
    return await apiFetch<any[]>(`whatsapp-templates${suffix}`);
  } catch (error) {
    console.warn("[api] getWhatsappTemplates fallback", error);
    return sampleData.whatsapp?.templates ?? [];
  }
}

// -----------------------
// Notificações (mock temporário)
// -----------------------

export async function markNotificationRead() {
  return { ok: true };
}

export async function markAllNotificationsRead() {
  return { ok: true };
}

// -----------------------
// Fallback mocks exportados (em breve removidos)
// -----------------------

export const mockTargets: TargetsResponse = {
  aliases:
    sampleData.targets.aliases?.map((alias: any) => {
      let members: string[] = [];
      if (Array.isArray(alias.members)) {
        members = alias.members;
      } else if (Array.isArray(alias.cnpjs)) {
        members = alias.cnpjs;
      } else if (typeof alias.empresas === "number" && alias.empresas > 0) {
        members = Array.from({ length: alias.empresas }, (_, index) => `empresa-${index + 1}`);
      }
      return {
        id: alias.id,
        label: alias.label,
        members
      };
    }) ?? [],
  cnpjs:
    sampleData.targets.cnpjs?.map((company: any) => ({
      value: company.value ?? company.id,
      label: company.label
    })) ?? []
};

export const mockClients = sampleData.clientes;
export const mockAutomations = sampleData.automations;
export const mockReports = sampleData.relatorios;

export const mockGroups =
  sampleData.grupos ??
  [
    {
      id: "oraculo-holding",
      label: "Oráculo Holding",
      empresas: 4
    }
  ];

// -----------------------
// Legacy compatibility / fallbacks
// -----------------------

export async function upsertAdminApiKey() {
  return { ok: true };
}

export async function deleteFranchise() {
  return { ok: true };
}

export async function getAdminLlmProviders(): Promise<any[]> {
  const response = await getAdminLlmConfig("providers");
  return (response as any).providers ?? [];
}

export async function getAdminLlmModels(): Promise<any[]> {
  const response = await getAdminLlmConfig("models");
  return (response as any).models ?? [];
}

export async function getAdminLlmContexts(): Promise<any[]> {
  const response = await getAdminLlmConfig("contexts");
  return (response as any).contexts ?? [];
}

export interface CompanyIntegration {
  type: string;
  status: "connected" | "inactive" | "error" | string;
  lastSync: string;
}

export interface CompanyUser {
  name: string;
  email: string;
  role: string;
  permissions?: string[];
}

export interface CompanyWhatsapp {
  phone?: string;
  preferredHour?: string;
  timezone?: string;
  messages?: Record<string, boolean>;
}

export interface CompanySummary {
  cnpj: string;
  nome?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  responsavel?: string;
  cadastro?: string;
  integrations?: Array<string | CompanyIntegration>;
  users?: CompanyUser[];
  whatsapp?: CompanyWhatsapp;
  status: string;
  lastSync: string;
}

export type TokenFunction = "onboarding" | "admin";

export interface OnboardingToken {
  id: string;
  token: string;
  empresa_id?: string;
  empresa_nome?: string;
  ativo: boolean;
  criado_em: string;
  ultimo_uso?: string;
  criado_por: string;
  funcao: TokenFunction;
}

interface CreateOnboardingTokenPayload {
  empresa_id?: string;
  funcao: TokenFunction;
  criado_por?: string;
}

const FALLBACK_ONBOARDING_TOKENS: OnboardingToken[] = [
  {
    id: "tok-volpe1",
    token: "VOLPE1",
    empresa_id: "12.345.678/0001-90",
    empresa_nome: "Matrix Consultoria LTDA",
    ativo: true,
    criado_em: "2025-10-01T08:30:00Z",
    ultimo_uso: "2025-11-06T09:15:00Z",
    criado_por: "Alceu Passos",
    funcao: "onboarding"
  },
  {
    id: "tok-adri5",
    token: "ADRI5",
    empresa_id: "91.234.567/0001-10",
    empresa_nome: "Atlas Comércio Digital",
    ativo: true,
    criado_em: "2025-10-15T09:10:00Z",
    ultimo_uso: "2025-11-05T15:42:00Z",
    criado_por: "Bruna Rezende",
    funcao: "admin"
  },
  {
    id: "tok-jes02",
    token: "JES02",
    empresa_id: "27.890.123/0001-72",
    empresa_nome: "Atlas Comércio Digital",
    ativo: true,
    criado_em: "2025-09-22T11:04:00Z",
    ultimo_uso: "2025-11-03T14:20:00Z",
    criado_por: "Jessica Kenupp",
    funcao: "onboarding"
  },
  {
    id: "tok-test1",
    token: "TEST1",
    ativo: false,
    criado_em: "2025-08-17T10:00:00Z",
    ultimo_uso: "2025-08-18T11:11:00Z",
    criado_por: "Auto Seed",
    funcao: "onboarding"
  }
];

function buildTokenCode(prefix = "VOL"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = prefix;
  while (code.length < 5) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 5);
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function getOnboardingTokens(): Promise<OnboardingToken[]> {
  return FALLBACK_ONBOARDING_TOKENS;
}

export async function createOnboardingToken(
  payload: CreateOnboardingTokenPayload
): Promise<OnboardingToken> {
  const company = FALLBACK_COMPANIES.find((item) => item.cnpj === payload.empresa_id);
  const baseCode = payload.funcao === "admin" ? "ADM" : "VOL";
  const token = buildTokenCode(baseCode);
  const newToken: OnboardingToken = {
    id: makeId(),
    token,
    empresa_id: payload.empresa_id,
    empresa_nome: company?.nome ?? company?.nomeFantasia ?? "-",
    ativo: true,
    criado_em: new Date().toISOString(),
    criado_por: payload.criado_por ?? "Sistema",
    funcao: payload.funcao
  };
  FALLBACK_ONBOARDING_TOKENS.unshift(newToken);
  return newToken;
}

export async function toggleOnboardingTokenStatus(id: string, ativo: boolean) {
  const token = FALLBACK_ONBOARDING_TOKENS.find((item) => item.id === id);
  if (token) {
    token.ativo = ativo;
  }
  return token ?? null;
}

export async function deleteOnboardingToken(id: string) {
  const index = FALLBACK_ONBOARDING_TOKENS.findIndex((item) => item.id === id);
  if (index >= 0) {
    FALLBACK_ONBOARDING_TOKENS.splice(index, 1);
    return { id };
  }
  return { id };
}

const FALLBACK_COMPANIES: CompanySummary[] = [
  {
    cnpj: "12.345.678/0001-90",
    nome: "Matrix Consultoria LTDA",
    razaoSocial: "Matrix Consultoria LTDA",
    nomeFantasia: "Matrix Consultoria",
    endereco: "Av. Paulista, 1000 - São Paulo/SP",
    telefone: "+55 11 4002-8922",
    email: "finance@matrix.com.br",
    responsavel: "Marina Guedes",
    cadastro: "2022-05-12",
    integrations: [
      { type: "F360", status: "connected", lastSync: "2025-11-06T10:00:00Z" },
      { type: "OMIE", status: "connected", lastSync: "2025-11-06T09:45:00Z" }
    ],
    users: [
      { name: "Marina Guedes", email: "marina@matrix.com.br", role: "admin", permissions: ["dre", "cashflow"] },
      { name: "Felipe Ramos", email: "felipe@matrix.com.br", role: "financeiro", permissions: ["dre"] }
    ],
    whatsapp: {
      phone: "+55 11 98888-2222",
      preferredHour: "09:00-18:00",
      timezone: "America/Sao_Paulo",
      messages: { boas_vindas: true, follow_up: true, inadimplencia: true }
    },
    status: "active",
    lastSync: "2025-11-06T10:00:00Z"
  },
  {
    cnpj: "91.234.567/0001-10",
    nome: "Atlas Comércio Digital",
    razaoSocial: "Atlas Comércio Digital Ltda",
    nomeFantasia: "Atlas Digital",
    endereco: "Rua das Nações, 250 - Belo Horizonte/MG",
    telefone: "+55 31 3222-9000",
    email: "contato@atlasdigital.com.br",
    responsavel: "Thiago Azevedo",
    cadastro: "2023-03-18",
    integrations: [{ type: "F360", status: "connected", lastSync: "2025-11-05T16:00:00Z" }],
    users: [
      { name: "Thiago Azevedo", email: "thiago@atlasdigital.com.br", role: "admin", permissions: ["dre"] },
      { name: "Laura Melo", email: "laura@atlasdigital.com.br", role: "financeiro", permissions: ["dre", "cashflow"] }
    ],
    whatsapp: {
      phone: "+55 31 97777-1111",
      preferredHour: "08:00-17:00",
      timezone: "America/Sao_Paulo",
      messages: { boas_vindas: true, follow_up: false, inadimplencia: true }
    },
    status: "active",
    lastSync: "2025-11-05T16:00:00Z"
  },
  {
    cnpj: "27.890.123/0001-72",
    nome: "BlueFit Academias",
    razaoSocial: "BlueFit Academias Brasil S/A",
    nomeFantasia: "BlueFit",
    endereco: "Av. Brasil, 400 - Curitiba/PR",
    telefone: "+55 41 3555-1212",
    email: "financeiro@bluefit.com.br",
    responsavel: "Jéssica Andrade",
    cadastro: "2021-09-05",
    integrations: [{ type: "OMIE", status: "inactive", lastSync: "2025-11-04T09:30:00Z" }],
    users: [
      { name: "Jéssica Andrade", email: "jessica@bluefit.com.br", role: "admin", permissions: ["dre", "cashflow"] }
    ],
    whatsapp: {
      phone: "+55 41 96666-5555",
      preferredHour: "10:00-19:00",
      timezone: "America/Sao_Paulo",
      messages: { boas_vindas: false, follow_up: true, inadimplencia: true }
    },
    status: "inactive",
    lastSync: "2025-11-04T09:30:00Z"
  }
];

export async function getCompaniesList(): Promise<CompanySummary[]> {
  return FALLBACK_COMPANIES;
}

export async function getCompanyDetails(cnpj: string): Promise<CompanySummary> {
  return (
    FALLBACK_COMPANIES.find((company) => company.cnpj === cnpj) ?? {
      cnpj,
      nome: "Empresa desconhecida",
      razaoSocial: "Empresa desconhecida",
      nomeFantasia: "Empresa desconhecida",
      endereco: "-",
      telefone: "-",
      email: "-",
      responsavel: "-",
      cadastro: new Date().toISOString(),
      integrations: [],
      users: [],
      whatsapp: {
        phone: "-",
        preferredHour: "-",
        timezone: "America/Sao_Paulo",
        messages: {}
      },
      lastSync: new Date().toISOString(),
      status: "inactive"
    }
  );
}

interface ContractFeeFilters {
  cnpj?: string;
  limit?: number;
}

export async function fetchContractFees(filters?: ContractFeeFilters): Promise<ContractFeeDetail[]> {
  try {
    const query = new URLSearchParams();
    query.set("select", "*");
    query.append("order", "created_at.desc");
    query.set("limit", String(filters?.limit ?? 200));
    if (filters?.cnpj) {
      query.append("company_cnpj", `eq.${filters.cnpj}`);
    }
    const path = `contract_fees?${query.toString()}`;
    return await supabaseRestFetch<ContractFeeDetail[]>(path);
  } catch (error) {
    console.warn("[api] fetchContractFees fallback", error);
    return mockFees;
  }
}

interface FinancialAlertsFilters {
  cnpj?: string;
  status?: string;
  limit?: number;
}

export async function fetchFinancialAlerts(filters?: FinancialAlertsFilters): Promise<FinancialAlert[]> {
  try {
    const query = new URLSearchParams();
    query.set("select", "id,company_cnpj,tipo_alerta,prioridade,titulo,mensagem,status,created_at");
    query.append("order", "created_at.desc");
    query.set("limit", String(filters?.limit ?? 200));
    if (filters?.cnpj) {
      query.append("company_cnpj", `eq.${filters.cnpj}`);
    }
    if (filters?.status && filters.status !== "all") {
      query.append("status", `eq.${filters.status}`);
    }
    const path = `financial_alerts?${query.toString()}`;
    return await supabaseRestFetch<FinancialAlert[]>(path);
  } catch (error) {
    console.warn("[api] fetchFinancialAlerts fallback", error);
    return mockAlerts;
  }
}

interface BankStatementFilters {
  cnpj?: string;
  bankCode?: string;
  limit?: number;
}

export async function fetchBankStatements(filters?: BankStatementFilters): Promise<BankStatementRow[]> {
  try {
    const query = new URLSearchParams();
    query.set("select", "id,data_movimento,tipo,valor,descricao,conciliado,conciliacao_id");
    query.append("order", "data_movimento.desc");
    query.set("limit", String(filters?.limit ?? 100));
    if (filters?.cnpj) {
      query.append("company_cnpj", `eq.${filters.cnpj}`);
    }
    if (filters?.bankCode) {
      query.append("banco_codigo", `eq.${filters.bankCode}`);
    }
    const path = `bank_statements?${query.toString()}`;
    return await supabaseRestFetch<BankStatementRow[]>(path);
  } catch (error) {
    console.warn("[api] fetchBankStatements fallback", error);
    return mockStatements;
  }
}

interface DivergenceFilters {
  cnpj?: string;
  limit?: number;
}

type SupabaseDivergence = {
  id: string;
  company_cnpj: string;
  tipo_operacao?: string;
  banco_codigo?: string;
  taxa_esperada?: number;
  taxa_cobrada?: number;
  diferenca?: number;
  percentual_diferenca?: number;
  status?: string;
  updated_at?: string;
};

export async function fetchDivergenceReports(filters?: DivergenceFilters): Promise<DivergenceReport[]> {
  try {
    const query = new URLSearchParams();
    query.set(
      "select",
      "id,company_cnpj,tipo_operacao,banco_codigo,taxa_esperada,taxa_cobrada,diferenca,percentual_diferenca,status,updated_at"
    );
    query.append("order", "updated_at.desc");
    query.set("limit", String(filters?.limit ?? 200));
    if (filters?.cnpj) {
      query.append("company_cnpj", `eq.${filters.cnpj}`);
    }
    const path = `v_taxas_divergentes?${query.toString()}`;
    const rows = await supabaseRestFetch<SupabaseDivergence[]>(path);
    return rows.map((row) => ({
      id: row.id,
      company_cnpj: row.company_cnpj,
      tipo: row.tipo_operacao ?? "—",
      banco_codigo: row.banco_codigo ?? "—",
      esperado: row.taxa_esperada ?? 0,
      cobrado: row.taxa_cobrada ?? 0,
      diferenca: row.diferenca ?? 0,
      percentual: row.percentual_diferenca ?? 0,
      status: (row.status as DivergenceReport["status"]) ?? "pendente",
      updated_at: row.updated_at ?? new Date().toISOString()
    }));
  } catch (error) {
    console.warn("[api] fetchDivergenceReports fallback", error);
    return mockDivergences;
  }
}

export async function getAuditHealth() {
  return sampleData.audit;
}

export async function getNotifications() {
  return sampleData.profile?.notifications ?? [];
}

export interface CashflowReportParams {
  cnpj?: string;
  from?: string;
  to?: string;
}

export async function getCashflowReport(_params?: CashflowReportParams) {
  return sampleData.reports?.cashflow ?? [];
}

export interface DreReportParams {
  cnpj?: string;
  from?: string;
  to?: string;
}

export async function getReportDre(_params?: DreReportParams) {
  return sampleData.reports?.dre ?? [];
}

export interface DreAnalysisResponse {
  insight: string;
  sections: unknown[];
}

export async function analyzeDre(): Promise<DreAnalysisResponse> {
  const sections = sampleData.analysis?.technical ?? [];
  const insight =
    sections
      .map((section: any) => {
        if (typeof section === "string") return section;
        if (section.summary) return section.summary;
        if (section.callouts?.length) {
          return section.callouts.map((callout: any) => callout.message).join(" ");
        }
        if (section.highlights?.length) {
          return section.highlights.join(" ");
        }
        return section.title ?? "";
      })
      .join(" ")
      .trim() || "Sem dados suficientes para gerar um insight.";

  return {
    insight,
    sections
  };
}

export interface FinancialKpiParams {
  cnpj?: string;
  from?: string;
  to?: string;
}

export async function getFinancialKpis(_params?: FinancialKpiParams) {
  return sampleData.reports?.kpis ?? { metrics: [] };
}

export interface PayableReceivableParams {
  cnpj?: string;
  from?: string;
  to?: string;
}

export async function getPayablesReport(_params?: PayableReceivableParams) {
  return sampleData.reports?.payables ?? [];
}

export async function getReceivablesReport(_params?: PayableReceivableParams) {
  return sampleData.reports?.receivables ?? [];
}

export interface WhatsappConfigResponse {
  evolution: {
    url: string;
    apiKeyMasked: string;
    instanceName: string;
    status: "connected" | "offline" | "error";
  };
  webhook: {
    url: string;
    secret: string;
    lastEvent?: string;
  };
  global: {
    autoMessages: boolean;
    processInterval: number;
    defaultHour: string;
    dailyLimit: number;
    defaultTemplate: string;
  };
}

export async function getWhatsappConfig(): Promise<WhatsappConfigResponse> {
  return {
    evolution: {
      url: "https://evolution.ifinance.app/instance/TORRE",
      apiKeyMasked: "evo_prod_******3f12",
      instanceName: "Torre-Finance",
      status: "connected"
    },
    webhook: {
      url: "https://hooks.ifinance.app/whatsapp",
      secret: "whatsapp-n8n-secret",
      lastEvent: "2025-11-06T19:42:00Z"
    },
    global: {
      autoMessages: true,
      processInterval: 15,
      defaultHour: "09:00",
      dailyLimit: 500,
      defaultTemplate: "fluxo_padrao"
    }
  };
}

export async function updateWhatsappConfig() {
  return { ok: true };
}

export interface AdminLlmUsage {
  summary: {
    totalUsd: number;
    totalRequests: number;
    topModel: string;
    topUser: string;
  };
  byModel: Array<{ model: string; usd: number }>;
  byUser: Array<{
    user: string;
    email: string;
    provider: string;
    requests: number;
    tokens: number;
    usd: number;
    percentage: number;
  }>;
}

export async function getAdminLlmUsage(month: string): Promise<AdminLlmUsage> {
  try {
    return (await getAdminLlmConfig("usage", { month })) as AdminLlmUsage;
  } catch (error) {
    console.warn("[api] getAdminLlmUsage fallback", error);
    return (
      sampleData.admin?.llmUsage ?? {
        summary: {
          totalUsd: 120.5,
          totalRequests: 1240,
          topModel: "claude-3-sonnet",
          topUser: "Alceu Passos"
        },
        byModel: [
          { model: "claude-3-sonnet", usd: 80.2 },
          { model: "gpt-4o-mini", usd: 40.3 }
        ],
        byUser: [
          {
            user: "Alceu Passos",
            email: "alceu@ifin.app.br",
            provider: "anthropic",
            requests: 620,
            tokens: 125000,
            usd: 60.1,
            percentage: 50
          }
        ]
      }
    );
  }
}

export async function scheduleWhatsappMessage() {
  return { ok: true };
}

export async function cancelWhatsappMessage() {
  return { ok: true };
}

export async function upsertWhatsappTemplate() {
  return { ok: true };
}

export async function firstAccessSetup() {
  return { ok: true };
}

export async function recoverPassword() {
  return { ok: true };
}
