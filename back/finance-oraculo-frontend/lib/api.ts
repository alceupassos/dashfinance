import sampleData from "@/__mocks__/sample.json";
import { getAccessToken } from "@/lib/auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ??
  "";

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!API_BASE) {
  // eslint-disable-next-line no-console
  console.warn(
    "[api] NEXT_PUBLIC_API_BASE (ou NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL) não definido. As requisições reais falharão."
  );
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
    return {
      metrics: sampleData.reports.kpis.metrics,
      alerts: sampleData.profile.notifications.slice(0, 2),
      cashflow: sampleData.reports.cashflow.series
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

export async function getAdminSecurityTraffic(range: "past_24h" | "past_7d" = "past_24h") {
  return apiFetch(`admin-security-traffic?range=${range}`);
}

export async function getAdminSecurityDatabase(range: "past_24h" | "past_7d" = "past_24h") {
  return apiFetch(`admin-security-database?range=${range}`);
}

export async function getAdminSecurityOverview() {
  return apiFetch("admin-security-overview");
}

export async function getAdminSecuritySessions() {
  return apiFetch("admin-security-sessions");
}

export async function getAdminSecurityBackups() {
  return apiFetch("admin-security-backups");
}

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
