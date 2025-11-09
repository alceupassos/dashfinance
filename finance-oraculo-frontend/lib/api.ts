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

type QueryParams = Record<string, string | number | boolean | undefined>;

function buildQuerySuffix(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export type UsageActivityType = "all" | "pages" | "api_calls" | "llm" | "whatsapp";

export interface UsageAnalyticsUser {
  user_id: string;
  email: string;
  full_name: string;
  sessions: number;
  total_time_minutes: number;
  pages_visited: string[];
  features_used: string[];
  top_pages?: Array<{ page: string; visits: number }>;
  api_calls: number;
  llm_interactions: number;
  llm_tokens: number;
  llm_cost: number;
  whatsapp_sent: number;
  whatsapp_received: number;
  avg_session_minutes: string;
}

export interface UsageAnalyticsTimelinePoint {
  date: string;
  sessions: number;
  api_calls: number;
  llm_tokens: number;
  whatsapp_messages: number;
}

export interface UsageAnalyticsResponse {
  usage_details: UsageAnalyticsUser[];
  timeline: UsageAnalyticsTimelinePoint[];
  period: { from: string; to: string };
  total_users: number;
}

export interface UsageAnalyticsParams {
  userId?: string;
  empresaId?: string;
  dateFrom?: string;
  dateTo?: string;
  activityType?: UsageActivityType;
}

export async function getUsageAnalytics(params: UsageAnalyticsParams = {}): Promise<UsageAnalyticsResponse> {
  const search = new URLSearchParams();
  if (params.userId) search.set("user_id", params.userId);
  if (params.empresaId) search.set("empresa_id", params.empresaId);
  if (params.dateFrom) search.set("date_from", params.dateFrom);
  if (params.dateTo) search.set("date_to", params.dateTo);
  if (params.activityType && params.activityType !== "all") {
    search.set("activity_type", params.activityType);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<UsageAnalyticsResponse>(`usage-details${suffix}`);
}

export type MoodScoreTrend = "up" | "down" | "stable" | "flat" | string;

export interface AnalyticsMoodIndexPoint {
  date: string;
  score: number;
  justification?: string;
  status?: string;
  color?: string;
}

export interface AnalyticsMoodDriver {
  date: string;
  event: string;
  impact?: string;
  comment?: string;
  severity?: string;
  related_alert_id?: string;
  link?: string;
}

export interface AnalyticsMoodIndexSummary {
  average_score: number;
  previous_average_score?: number;
  variation_percentage?: number;
  alerts_open?: number;
  trend?: MoodScoreTrend;
  status?: string;
  updated_at?: string;
}

export interface AnalyticsMoodIndexResponse {
  summary: AnalyticsMoodIndexSummary;
  timeline: AnalyticsMoodIndexPoint[];
  drivers: AnalyticsMoodDriver[];
}

export interface AnalyticsMoodIndexParams {
  from: string;
  to: string;
  alias?: string;
  company_cnpj?: string;
  granularity?: "daily" | "weekly" | "monthly";
}

export async function fetchAnalyticsMoodIndex(params: AnalyticsMoodIndexParams): Promise<AnalyticsMoodIndexResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.alias) search.set("alias", params.alias);
  if (params.company_cnpj) search.set("company_cnpj", params.company_cnpj);
  if (params.granularity) search.set("granularity", params.granularity);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<AnalyticsMoodIndexResponse>(`analytics/mood-index${suffix}`);
}

export interface AnalyticsUserUsageSummary {
  active_users: number;
  total_sessions: number;
  actions_per_minute: number;
  top_feature?: string;
  updated_at?: string;
}

export interface AnalyticsUsageTimelinePoint {
  date: string;
  sessions: number;
  actions: number;
  active_users?: number;
}

export interface AnalyticsUsageHeatmapPoint {
  date: string;
  hour: number;
  actions: number;
}

export interface AnalyticsUserUsageRow {
  user_id: string;
  name?: string;
  email?: string;
  role?: string;
  last_access_at?: string;
  total_actions?: number;
  total_sessions?: number;
  avg_actions_per_session?: number;
  actions_per_minute?: number;
  two_factor_enabled?: boolean;
  status?: string;
}

export interface AnalyticsUserUsageResponse {
  summary: AnalyticsUserUsageSummary;
  users: AnalyticsUserUsageRow[];
  timeline: AnalyticsUsageTimelinePoint[];
  heatmap?: AnalyticsUsageHeatmapPoint[];
}

export interface AnalyticsUserUsageParams {
  from: string;
  to: string;
  role?: string;
  limit?: number;
}

export async function fetchAnalyticsUserUsage(params: AnalyticsUserUsageParams): Promise<AnalyticsUserUsageResponse> {
  const search = new URLSearchParams();
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  if (params.role) search.set("role", params.role);
  if (typeof params.limit === "number") search.set("limit", String(params.limit));
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return apiFetch<AnalyticsUserUsageResponse>(`analytics/user-usage${suffix}`);
}

export interface AnalyticsUserProfile {
  user_id: string;
  name?: string;
  email?: string;
  role?: string;
  companies?: string[];
  two_factor_enabled?: boolean;
  last_login_at?: string;
  status?: string;
  mood_score?: number;
  mood_trend?: MoodScoreTrend;
}

export interface AnalyticsUserUsageDetailSummary {
  total_actions: number;
  total_sessions: number;
  unique_sessions?: number;
  alerts_open?: number;
  last_activity_at?: string;
  mood_score?: number;
  mood_status?: string;
}

export interface AnalyticsUserEvent {
  id: string;
  timestamp: string;
  action: string;
  description?: string;
  result?: string;
  context?: string;
  category?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsUserUsageDetailResponse {
  user: AnalyticsUserProfile;
  summary: AnalyticsUserUsageDetailSummary;
  timeline: AnalyticsUsageTimelinePoint[];
  events: AnalyticsUserEvent[];
  alerts?: AnalyticsMoodDriver[];
  metadata?: {
    generated_at?: string;
    period?: { from: string; to: string };
  };
}

export interface AnalyticsUserUsageDetailParams {
  userId: string;
  from: string;
  to: string;
  role?: string;
}

export async function fetchAnalyticsUserUsageDetail({
  userId,
  from,
  to,
  role
}: AnalyticsUserUsageDetailParams): Promise<AnalyticsUserUsageDetailResponse> {
  const search = new URLSearchParams();
  if (from) search.set("from", from);
  if (to) search.set("to", to);
  if (role) search.set("role", role);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const encodedId = encodeURIComponent(userId);
  return apiFetch<AnalyticsUserUsageDetailResponse>(`analytics/user-usage/${encodedId}${suffix}`);
}

export interface UsageSession {
  id: string;
  user_id: string;
  company_cnpj?: string | null;
  session_start: string;
  session_end?: string | null;
  session_duration_seconds?: number | null;
  pages_visited: string[];
  features_used: string[];
  api_calls_count?: number | null;
  successful_calls?: number | null;
  failed_calls?: number | null;
  avg_duration_ms?: number | null;
  created_at?: string;
}

export interface GetUserUsageSessionsParams {
  userId: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  order?: "asc" | "desc";
}

export async function getUserUsageSessions({
  userId,
  dateFrom,
  dateTo,
  limit = 50,
  order = "desc",
}: GetUserUsageSessionsParams): Promise<UsageSession[]> {
  const params = new URLSearchParams();
  params.set(
    "select",
    "id,user_id,company_cnpj,session_start,session_end,session_duration_seconds,pages_visited,features_used,api_calls_count,successful_calls,failed_calls,avg_duration_ms,created_at"
  );
  params.append("order", `session_start.${order}`);
  params.set("user_id", `eq.${userId}`);
  if (dateFrom) {
    params.append("session_start", `gte.${dateFrom}T00:00:00Z`);
  }
  if (dateTo) {
    params.append("session_start", `lte.${dateTo}T23:59:59Z`);
  }
  params.set("limit", String(limit));
  const rows = await supabaseRestFetch<UsageSession[]>(`user_system_usage?${params.toString()}`);
  return rows.map((row) => ({
    ...row,
    pages_visited: Array.isArray(row.pages_visited) ? row.pages_visited : [],
    features_used: Array.isArray(row.features_used) ? row.features_used : [],
  }));
}

export type MoodGranularity = "daily" | "weekly" | "monthly";

export interface MoodIndexTimelinePoint {
  date: string;
  avg_mood_index?: number;
  avg_sentiment_score?: number;
  conversation_count?: number;
  sentiment_trend?: "improving" | "stable" | "declining";
  very_positive_count?: number;
  positive_count?: number;
  neutral_count?: number;
  negative_count?: number;
  very_negative_count?: number;
  min_mood_index?: number;
  max_mood_index?: number;
}

export interface MoodIndexAlert {
  type: string;
  date: string;
  change_percent: number;
  severity: string;
  message: string;
}

export interface MoodIndexSummary {
  avg_mood_index: number;
  total_conversations: number;
  recommended_action: string;
}

export interface MoodIndexTimelineResponse {
  timeline: MoodIndexTimelinePoint[];
  alerts: MoodIndexAlert[];
  summary: MoodIndexSummary;
  period: { from: string; to: string };
  granularity: MoodGranularity;
}

export interface MoodIndexTimelineParams {
  cnpj?: string;
  empresa_id?: string;
  phone_number?: string;
  date_from?: string;
  date_to?: string;
  granularity?: MoodGranularity;
}

export async function getMoodIndexTimeline(
  params: MoodIndexTimelineParams = {}
): Promise<MoodIndexTimelineResponse> {
  const search = new URLSearchParams();
  if (params.cnpj) search.set("cnpj", params.cnpj);
  if (params.empresa_id) search.set("empresa_id", params.empresa_id);
  if (params.phone_number) search.set("phone_number", params.phone_number);
  if (params.date_from) search.set("date_from", params.date_from);
  if (params.date_to) search.set("date_to", params.date_to);
  if (params.granularity) search.set("granularity", params.granularity);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiFetch<any>(`mood-index-timeline${suffix}`);

  const timeline = ensureArray<any>(response?.timeline ?? response ?? []).map((item) => ({
    date: item?.date ?? item?.period_date ?? "",
    avg_mood_index: Number(item?.avg_mood_index ?? item?.avg_sentiment_score ?? item?.score ?? 0),
    avg_sentiment_score: Number(item?.avg_sentiment_score ?? item?.avg_mood_index ?? item?.score ?? 0),
    conversation_count: Number(item?.conversation_count ?? item?.total_messages ?? 0),
    sentiment_trend: item?.sentiment_trend ?? undefined,
    very_positive_count: item?.very_positive_count ?? undefined,
    positive_count: item?.positive_count ?? undefined,
    neutral_count: item?.neutral_count ?? undefined,
    negative_count: item?.negative_count ?? undefined,
    very_negative_count: item?.very_negative_count ?? undefined,
    min_mood_index: typeof item?.min_mood_index === "number" ? item.min_mood_index : undefined,
    max_mood_index: typeof item?.max_mood_index === "number" ? item.max_mood_index : undefined
  }));

  const alerts = ensureArray<any>(response?.alerts).map((alert) => ({
    type: alert?.type ?? "info",
    date: alert?.date ?? "",
    change_percent: Number(alert?.change_percent ?? alert?.changePercent ?? 0),
    severity: alert?.severity ?? "low",
    message: alert?.message ?? ""
  }));

  const summary: MoodIndexSummary = {
    avg_mood_index: Number(
      response?.summary?.avg_mood_index ?? response?.summary?.avgMoodIndex ?? response?.summary ?? 0
    ),
    total_conversations: Number(
      response?.summary?.total_conversations ?? response?.summary?.totalConversations ?? 0
    ),
    recommended_action: response?.summary?.recommended_action ?? response?.summary?.recommendedAction ?? ""
  };

  return {
    timeline,
    alerts,
    summary,
    period: {
      from: response?.period?.from ?? params.date_from ?? "",
      to: response?.period?.to ?? params.date_to ?? ""
    },
    granularity: (response?.granularity ?? params.granularity ?? "daily") as MoodGranularity
  };
}

export interface WhatsappConversationSummary {
  id: string;
  empresa_cnpj: string;
  contato_phone: string;
  contato_nome?: string;
  contato_tipo?: string;
  ultimaMensagem?: string;
  ultimaMensagemEm?: string;
  ativo?: boolean;
  status?: string;
  totalMensagens?: number;
  naoLidas?: number;
  criadoEm?: string;
  ultimaAtualizacao?: string;
}

export interface WhatsappMessage {
  id: string;
  tipo: "enviada" | "recebida" | string;
  status: "enviada" | "entregue" | "lida" | "falha" | string;
  timestamp: string;
  textoEnviado?: string | null;
  textoRecebido?: string | null;
  templateUsada?: string | null;
  variaveisUsadas?: Record<string, string> | null;
}

export interface WhatsappConversationDetail extends WhatsappConversationSummary {
  mensagens: WhatsappMessage[];
}

export interface WhatsappConversationListResponse {
  data: WhatsappConversationSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface SendWhatsappMessagePayload {
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
  templateId?: string;
  variaveis?: Record<string, string>;
  idempotencyKey?: string;
}

export interface WhatsappSendResponse {
  success: boolean;
  messageId?: string;
  status?: string;
  timestamp?: string;
  data?: unknown;
}

export interface ScheduleWhatsappMessagePayload {
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
  dataAgendada: string;
  recorrencia?: "unica" | "diaria" | "semanal" | "mensal";
  templateId?: string;
  variaveis?: Record<string, string>;
  idempotencyKey?: string;
}

export interface ScheduleWhatsappMessageResponse {
  success: boolean;
  scheduledId?: string;
  status?: string;
  dataAgendada?: string;
  proximaTentativa?: string;
  timestamp?: string;
}

export interface WhatsappTemplate {
  id: string;
  nome: string;
  categoria: string;
  status: string;
  corpo: string;
  descricao?: string | null;
  variaveisObrigatorias: string[];
  variaveisOpcionais: string[];
  horaEnvioRecomendada?: string | null;
  empresaCnpj?: string | null;
  criadoEm?: string | null;
  ultimaAtualizacao?: string | null;
  provider?: string | null;
}

export interface UpsertWhatsappTemplatePayload {
  nome: string;
  categoria: string;
  status: string;
  corpo: string;
  descricao?: string | null;
  variaveisObrigatorias?: string[];
  variaveisOpcionais?: string[];
  horaEnvioRecomendada?: string | null;
  empresaCnpj?: string | null;
  provider?: string | null;
}

export interface WhatsappScheduledItem {
  id: string;
  empresa_cnpj?: string | null;
  contato_phone: string;
  contato_nome?: string | null;
  mensagem: string;
  templateId?: string | null;
  variaveisPreenChidas?: Record<string, string> | null;
  dataAgendada: string;
  recorrencia?: string | null;
  status: string;
  tentativas?: number | null;
  ultimaTentativa?: string | null;
  proximaTentativa?: string | null;
  criadoEm?: string | null;
  criadoPor?: string | null;
}

export interface WhatsappScheduledListResponse {
  data: WhatsappScheduledItem[];
  total: number;
  limit?: number;
  offset?: number;
}

export function ensureArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value === undefined || value === null) return [];
  return [value as T];
}

export function normalizeConversationSummary(raw: any): WhatsappConversationSummary {
  const id = String(raw?.id ?? raw?.conversation_id ?? "");
  const empresa_cnpj = String(
    raw?.empresa_cnpj ?? raw?.company_cnpj ?? raw?.cnpj ?? raw?.empresaCnpj ?? ""
  );
  const contato_phone =
    String(raw?.contato_phone ?? raw?.phone_number ?? raw?.contatoPhone ?? raw?.numero ?? "") || "";

  const contato_nome =
    raw?.contato_nome ?? raw?.contact_name ?? raw?.nome ?? raw?.contacto ?? raw?.cliente ?? undefined;

  const contato_tipo = raw?.contato_tipo ?? raw?.contact_type ?? raw?.tipo ?? undefined;

  const ultimaMensagem =
    raw?.ultimaMensagem ??
    raw?.lastMessage ??
    raw?.last_message ??
    raw?.last_message_text ??
    raw?.ultima_mensagem ??
    raw?.mensagem ??
    undefined;

  const ultimaMensagemEm =
    raw?.ultimaMensagemEm ??
    raw?.ultima_mensagem_em ??
    raw?.last_message_at ??
    raw?.ultimaAtualizacao ??
    raw?.updated_at ??
    raw?.ultima_mensagem_data ??
    undefined;

  const totalMensagens =
    raw?.totalMensagens ?? raw?.total_mensagens ?? raw?.total_messages ?? raw?.mensagens ?? undefined;

  const naoLidas =
    raw?.naoLidas ?? raw?.nao_lidas ?? raw?.unread_count ?? raw?.pendentes ?? undefined;

  const criadoEm = raw?.criadoEm ?? raw?.created_at ?? raw?.criado_em ?? undefined;

  const ultimaAtualizacao =
    raw?.ultimaAtualizacao ?? raw?.updated_at ?? raw?.ultimaMensagemEm ?? ultimaMensagemEm;

  const status = raw?.status ?? raw?.conversation_status ?? raw?.situacao ?? undefined;
  const ativo = typeof raw?.ativo === "boolean" ? raw.ativo : undefined;

  return {
    id,
    empresa_cnpj,
    contato_phone,
    contato_nome,
    contato_tipo,
    ultimaMensagem,
    ultimaMensagemEm,
    ativo,
    status,
    totalMensagens,
    naoLidas,
    criadoEm,
    ultimaAtualizacao
  };
}

export function normalizeMessage(raw: any, fallbackIndex = 0): WhatsappMessage {
  const timestamp =
    raw?.timestamp ?? raw?.created_at ?? raw?.sent_at ?? raw?.hora ?? new Date().toISOString();

  const tipo =
    raw?.tipo ??
    raw?.direction ??
    (raw?.textoEnviado || raw?.text_sent || raw?.texto_enviado || raw?.message_direction === "out"
      ? "enviada"
      : "recebida");

  const status =
    raw?.status ??
    raw?.delivery_status ??
    raw?.state ??
    (tipo === "enviada" ? "enviada" : "recebida");

  const textoEnviado =
    raw?.textoEnviado ??
    raw?.texto_enviado ??
    raw?.text_sent ??
    (tipo === "enviada" ? raw?.texto ?? raw?.text ?? raw?.mensagem ?? null : null);

  const textoRecebido =
    raw?.textoRecebido ??
    raw?.texto_recebido ??
    raw?.text_received ??
    (tipo !== "enviada" ? raw?.texto ?? raw?.text ?? raw?.mensagem ?? null : null);

  const templateUsada =
    raw?.templateUsada ?? raw?.template_id ?? raw?.template ?? raw?.templateUsado ?? null;

  const variaveisUsadas =
    raw?.variaveisUsadas ??
    raw?.variaveis_usadas ??
    raw?.variables ??
    raw?.metadata?.variables ??
    null;

  const id =
    String(
      raw?.id ??
        raw?.messageId ??
        raw?.message_id ??
        raw?.uuid ??
        `${timestamp}-${tipo}-${fallbackIndex}`
    ) || `${timestamp}-${fallbackIndex}`;

  return {
    id,
    tipo,
    status,
    timestamp: new Date(timestamp).toISOString(),
    textoEnviado,
    textoRecebido,
    templateUsada,
    variaveisUsadas
  };
}

export function normalizeConversationDetail(raw: any): WhatsappConversationDetail {
  const payload = raw?.data ?? raw;
  const base = normalizeConversationSummary(payload);
  const mensagensRaw =
    payload?.mensagens ??
    payload?.messages ??
    payload?.historico ??
    payload?.message_history ??
    [];

  const mensagens = ensureArray<any>(mensagensRaw).map((message, index) =>
    normalizeMessage(message, index)
  );

  return {
    ...base,
    mensagens
  };
}

export function normalizeTemplate(raw: any): WhatsappTemplate {
  const payload = raw?.data ?? raw;
  const id = String(payload?.id ?? payload?.template_id ?? "");
  const nome = String(payload?.nome ?? payload?.name ?? payload?.identifier ?? "template");
  const categoria = String(
    payload?.categoria ?? payload?.category ?? payload?.type ?? "general"
  );
  const status = String(payload?.status ?? payload?.estado ?? "ativa");

  const content = payload?.content ?? {};
  const corpo =
    payload?.corpo ??
    payload?.body ??
    content?.body ??
    payload?.mensagem ??
    payload?.texto ??
    "";

  const variaveisObrigatorias =
    payload?.variaveisObrigatorias ??
    content?.variaveisObrigatorias ??
    content?.required_variables ??
    payload?.variablesObrigatorias ??
    payload?.variables ?? [];

  const variaveisOpcionais =
    payload?.variaveisOpcionais ??
    content?.variaveisOpcionais ??
    content?.optional_variables ??
    [];

  const horaEnvioRecomendada =
    payload?.horaEnvioRecomendada ??
    payload?.recommended_hour ??
    content?.recommended_hour ??
    null;

  const descricao =
    payload?.descricao ??
    payload?.description ??
    content?.header ??
    null;

  const empresaCnpj =
    payload?.empresaCnpj ?? payload?.empresa_cnpj ?? payload?.company_cnpj ?? null;

  const criadoEm =
    payload?.criadoEm ?? payload?.created_at ?? payload?.criado_em ?? null;
  const ultimaAtualizacao =
    payload?.ultimaAtualizacao ?? payload?.updated_at ?? payload?.ultima_atualizacao ?? null;

  const provider = payload?.provider ?? content?.provider ?? null;

  return {
    id,
    nome,
    categoria,
    status,
    corpo,
    descricao,
    variaveisObrigatorias: ensureArray<string>(variaveisObrigatorias),
    variaveisOpcionais: ensureArray<string>(variaveisOpcionais),
    horaEnvioRecomendada,
    empresaCnpj,
    criadoEm,
    ultimaAtualizacao,
    provider
  };
}

export function normalizeScheduled(raw: any): WhatsappScheduledItem {
  const payload = raw?.data ?? raw;
  const id = String(payload?.id ?? payload?.scheduledId ?? payload?.scheduled_id ?? "");
  const empresa_cnpj =
    payload?.empresa_cnpj ?? payload?.company_cnpj ?? payload?.empresaCnpj ?? null;
  const contato_phone =
    payload?.contato_phone ?? payload?.phone_number ?? payload?.telefone ?? payload?.phone ?? "";
  const contato_nome =
    payload?.contato_nome ?? payload?.contact_name ?? payload?.nome ?? null;

  const mensagem =
    payload?.mensagem ??
    payload?.message ??
    payload?.message_content?.text ??
    payload?.message_content?.body ??
    payload?.message_content ??
    "";

  const templateId =
    payload?.templateId ?? payload?.template_id ?? payload?.template ?? null;

  const variaveisPreenChidas =
    payload?.variaveisPreenChidas ??
    payload?.variaveis_preenchidas ??
    payload?.variables ??
    payload?.message_content?.variables ??
    null;

  const dataAgendada =
    payload?.dataAgendada ??
    payload?.scheduled_for ??
    payload?.proximaTentativa ??
    payload?.scheduledFor ??
    new Date().toISOString();

  const recorrencia =
    payload?.recorrencia ??
    payload?.frequency ??
    payload?.schedule_type ??
    null;

  const status = payload?.status ?? payload?.situation ?? "agendada";

  const tentativas =
    payload?.tentativas ?? payload?.attempts ?? payload?.retry_count ?? null;
  const ultimaTentativa =
    payload?.ultimaTentativa ??
    payload?.last_attempt ??
    payload?.ultima_tentativa ??
    null;
  const proximaTentativa =
    payload?.proximaTentativa ??
    payload?.next_attempt ??
    payload?.scheduled_for ??
    null;

  const criadoEm =
    payload?.criadoEm ?? payload?.created_at ?? payload?.criado_em ?? null;
  const criadoPor =
    payload?.criadoPor ?? payload?.created_by ?? payload?.autor ?? null;

  return {
    id,
    empresa_cnpj,
    contato_phone,
    contato_nome,
    mensagem: typeof mensagem === "string" ? mensagem : JSON.stringify(mensagem),
    templateId,
    variaveisPreenChidas:
      typeof variaveisPreenChidas === "object" ? variaveisPreenChidas : null,
    dataAgendada: new Date(dataAgendada).toISOString(),
    recorrencia,
    status,
    tentativas: typeof tentativas === "number" ? tentativas : null,
    ultimaTentativa: ultimaTentativa ? new Date(ultimaTentativa).toISOString() : null,
    proximaTentativa: proximaTentativa ? new Date(proximaTentativa).toISOString() : null,
    criadoEm: criadoEm ? new Date(criadoEm).toISOString() : null,
    criadoPor
  };
}

export function normalizeGroupAliasRow(row: any): GroupAlias {
  return {
    id: String(row.id),
    label: row.label ?? row.name ?? row.alias ?? "—",
    description: row.description ?? row.desc ?? undefined,
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    members: ensureArray<any>(row.members).map((m: any, idx: number) => ({
      id: String(m?.id ?? `${row.id}-m-${idx}`),
      alias_id: row.id,
      company_cnpj: String(m?.company_cnpj ?? m?.cnpj ?? m),
      position: typeof m?.position === "number" ? m.position : idx,
      company_name: m?.company_name ?? m?.nome ?? undefined,
      integracao_f360: m?.integracao_f360 ?? m?.f360 ?? undefined,
      integracao_omie: m?.integracao_omie ?? m?.omie ?? undefined,
      whatsapp_ativo: m?.whatsapp_ativo ?? m?.whatsapp ?? undefined
    }))
  };
}

export function normalizeFinancialAlertRow(row: any): FinancialAlert {
  return {
    id: String(row.id),
    company_cnpj: row.company_cnpj ?? row.cnpj ?? "—",
    tipo_alerta: row.tipo_alerta ?? row.type ?? "conciliacao_pendente",
    prioridade: row.prioridade ?? row.priority ?? "baixa",
    titulo: row.titulo ?? row.title ?? "Alerta",
    mensagem: row.mensagem ?? row.message ?? "",
    status: row.status ?? "pendente",
    created_at: row.created_at ?? row.createdAt ?? new Date().toISOString(),
    resolucao_observacoes: row.resolucao_observacoes ?? row.resolution_notes ?? undefined,
    resolvido_em: row.resolvido_em ?? row.resolved_at ?? undefined,
    resolvido_por: row.resolvido_por ?? row.resolved_by ?? undefined
  };
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

export interface N8nStatusResponse {
  summary: {
    total_workflows: number;
    active_workflows: number;
    inactive_workflows: number;
    executions_24h: number;
    success_rate: number;
    avg_execution_time_sec: string | number;
  };
  executions: {
    total: number;
    successful: number;
    failed: number;
    running: number;
  };
  health: {
    status: "healthy" | "degraded" | "error";
    n8n_reachable: boolean;
    last_check?: string;
  };
}

export async function getN8nStatus() {
  return apiFetch<N8nStatusResponse>("n8n-status");
}

export type AutomationRunStatus = "running" | "success" | "failed" | "partial" | string;

export interface AutomationRun {
  id: string;
  workflow_name: string;
  workflow_id?: string | null;
  status: AutomationRunStatus;
  started_at: string;
  ended_at?: string | null;
  latencia_ms?: number | null;
  mensagens_enviadas?: number | null;
  erro?: string | null;
  created_at?: string | null;
}

export interface AutomationRunsParams {
  from?: string;
  to?: string;
  limit?: number;
  status?: AutomationRunStatus | "all";
}

export async function getAutomationRuns(params: AutomationRunsParams = {}): Promise<AutomationRun[]> {
  const search = new URLSearchParams();
  search.set(
    "select",
    "id,workflow_name,workflow_id,status,started_at,ended_at,latencia_ms,mensagens_enviadas,erro,created_at"
  );
  search.append("order", "started_at.desc");
  search.set("limit", String(params.limit ?? 50));
  if (params.from) {
    search.append("started_at", `gte.${params.from}`);
  }
  if (params.to) {
    search.append("started_at", `lte.${params.to}`);
  }
  if (params.status && params.status !== "all") {
    search.append("status", `eq.${params.status}`);
  }

  const rows = await supabaseRestFetch<AutomationRun[]>(`automation_runs?${search.toString()}`);
  return rows.map((row) => ({
    ...row,
    workflow_id: row.workflow_id ?? null,
    ended_at: row.ended_at ?? null,
    latencia_ms: typeof row.latencia_ms === "number" ? row.latencia_ms : null,
    mensagens_enviadas: typeof row.mensagens_enviadas === "number" ? row.mensagens_enviadas : null,
    erro: row.erro ?? null,
    created_at: row.created_at ?? null
  }));
}

export type McpServiceState = "healthy" | "warning" | "critical" | "degraded" | "offline" | "unknown" | string;

export interface McpServiceStatus {
  id: string;
  name: string;
  state: McpServiceState;
  latency_ms?: number;
  error_rate?: number;
  throughput_per_minute?: number;
  last_check?: string;
  messages_24h?: number;
  failures_24h?: number;
  detail?: string;
}

export interface McpStatusMetrics {
  latency_avg_ms?: number;
  error_percentage?: number;
  throughput_per_minute?: number;
}

export interface McpStatusResponse {
  environment: string;
  updated_at?: string;
  services: McpServiceStatus[];
  metrics?: McpStatusMetrics;
}

export interface McpStatusParams {
  environment?: string;
  period?: string;
}

export async function getMcpStatus(params: McpStatusParams = {}): Promise<McpStatusResponse> {
  const suffix = buildQuerySuffix({
    environment: params.environment,
    period: params.period
  });
  return apiFetch<McpStatusResponse>(`mcp/status${suffix}`);
}

export interface McpHealthDetail {
  name: string;
  state: McpServiceState;
  message?: string;
  last_check?: string;
}

export interface McpHealthResponse {
  environment: string;
  state: McpServiceState;
  latency_ms?: number;
  error_rate?: number;
  updated_at?: string;
  details?: McpHealthDetail[];
}

export interface McpHealthParams {
  environment?: string;
}

export async function getMcpHealth(params: McpHealthParams = {}): Promise<McpHealthResponse> {
  const suffix = buildQuerySuffix({
    environment: params.environment
  });
  return apiFetch<McpHealthResponse>(`health-check${suffix}`);
}

export interface McpAlertSummaryItem {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  service?: string;
  created_at: string;
  status?: string;
  link?: string;
}

export interface McpAlertsSummaryResponse {
  total: number;
  critical_open?: number;
  updated_at?: string;
  alerts: McpAlertSummaryItem[];
}

export interface McpAlertsSummaryParams {
  environment?: string;
  limit?: number;
  severity?: string;
}

export async function getMcpAlertsSummary(
  params: McpAlertsSummaryParams = {}
): Promise<McpAlertsSummaryResponse> {
  const suffix = buildQuerySuffix({
    environment: params.environment,
    limit: params.limit,
    severity: params.severity
  });
  return apiFetch<McpAlertsSummaryResponse>(`alerts-summary${suffix}`);
}

export interface McpDeploymentEntry {
  id: string;
  environment: string;
  started_at: string;
  finished_at?: string;
  status: "success" | "failed" | "running" | string;
  notes?: string;
  commit?: string;
  author?: string;
}

export interface McpDeploymentsResponse {
  entries: McpDeploymentEntry[];
  updated_at?: string;
}

export interface McpDeploymentsParams {
  environment?: string;
  limit?: number;
}

export async function getMcpDeployments(params: McpDeploymentsParams = {}): Promise<McpDeploymentsResponse> {
  const suffix = buildQuerySuffix({
    environment: params.environment,
    limit: params.limit
  });
  return apiFetch<McpDeploymentsResponse>(`mcp/deployments${suffix}`);
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

export async function getWhatsappConversations(
  params?: QueryParams
): Promise<WhatsappConversationListResponse> {
  const suffix = buildQuerySuffix(params);
  const response = await apiFetch<any>(`whatsapp-conversations${suffix}`);

  const rawList = ensureArray<any>(response?.data ?? response?.conversations ?? response);
  const limit =
    typeof response?.limit === "number"
      ? response.limit
      : (params?.limit ? Number(params.limit) : undefined) ?? rawList.length;
  const offset =
    typeof response?.offset === "number"
      ? response.offset
      : (params?.offset ? Number(params.offset) : undefined) ?? 0;
  const total =
    typeof response?.total === "number" ? response.total : Number(response?.count ?? rawList.length);

  return {
    data: rawList.map(normalizeConversationSummary),
    total,
    limit,
    offset
  };
}

export async function getWhatsappConversation(id: string): Promise<WhatsappConversationDetail> {
  const response = await apiFetch<any>(`whatsapp-conversations/${id}`);
  return normalizeConversationDetail(response);
}

export async function getWhatsappTemplates(params?: QueryParams): Promise<WhatsappTemplate[]> {
  const suffix = buildQuerySuffix(params);
  const response = await apiFetch<any>(`whatsapp-templates${suffix}`);
  const templates = ensureArray<any>(response?.data ?? response?.templates ?? response);
  return templates.map(normalizeTemplate);
}

export async function createWhatsappTemplate(
  payload: UpsertWhatsappTemplatePayload
): Promise<WhatsappTemplate> {
  const body = {
    name: payload.nome,
    category: payload.categoria,
    status: payload.status,
    content: {
      header: payload.descricao,
      body: payload.corpo,
      footer: payload.horaEnvioRecomendada,
      metadata: {
        variaveisObrigatorias: payload.variaveisObrigatorias ?? [],
        variaveisOpcionais: payload.variaveisOpcionais ?? [],
        empresaCnpj: payload.empresaCnpj ?? null
      }
    },
    variables: Array.from(
      new Set([
        ...(payload.variaveisObrigatorias ?? []),
        ...(payload.variaveisOpcionais ?? [])
      ])
    ),
    provider: payload.provider ?? "universal"
  };

  const [created] = await supabaseRestFetch<any[]>("whatsapp_templates", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(body)
  });

  return normalizeTemplate(created);
}

export async function updateWhatsappTemplate(
  id: string,
  payload: UpsertWhatsappTemplatePayload
): Promise<WhatsappTemplate> {
  const body = {
    name: payload.nome,
    category: payload.categoria,
    status: payload.status,
    content: {
      header: payload.descricao,
      body: payload.corpo,
      footer: payload.horaEnvioRecomendada,
      metadata: {
        variaveisObrigatorias: payload.variaveisObrigatorias ?? [],
        variaveisOpcionais: payload.variaveisOpcionais ?? [],
        empresaCnpj: payload.empresaCnpj ?? null
      }
    },
    variables: Array.from(
      new Set([
        ...(payload.variaveisObrigatorias ?? []),
        ...(payload.variaveisOpcionais ?? [])
      ])
    ),
    provider: payload.provider ?? "universal"
  };

  const [updated] = await supabaseRestFetch<any[]>(
    `whatsapp_templates?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(body)
    }
  );

  return normalizeTemplate(updated);
}

export async function duplicateWhatsappTemplate(
  template: WhatsappTemplate,
  overrides?: Partial<UpsertWhatsappTemplatePayload>
): Promise<WhatsappTemplate> {
  const base: UpsertWhatsappTemplatePayload = {
    nome: `${template.nome}-copy-${Date.now()}`,
    categoria: template.categoria,
    status: template.status,
    corpo: template.corpo,
    descricao: template.descricao,
    variaveisObrigatorias: template.variaveisObrigatorias,
    variaveisOpcionais: template.variaveisOpcionais,
    horaEnvioRecomendada: template.horaEnvioRecomendada,
    empresaCnpj: template.empresaCnpj,
    provider: template.provider ?? "universal"
  };

  return createWhatsappTemplate({ ...base, ...overrides });
}

export async function sendWhatsappMessage(
  payload: SendWhatsappMessagePayload,
  options: { preferReturnRepresentation?: boolean } = {}
): Promise<WhatsappSendResponse> {
  const headers: HeadersInit = {};
  if (options.preferReturnRepresentation) {
    headers["Prefer"] = "return=representation";
  }

  const response = await apiFetch<any>(
    "whatsapp-send",
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    }
  );

  if (response?.success === true && response?.data) {
    return {
      success: true,
      data: response.data,
      messageId: response.data?.messageId ?? response.data?.id,
      status: response.data?.status,
      timestamp: response.data?.timestamp
    };
  }

  return {
    success: response?.success ?? true,
    messageId: response?.messageId,
    status: response?.status,
    timestamp: response?.timestamp,
    data: response?.data
  };
}

export async function scheduleWhatsappMessage(
  payload: ScheduleWhatsappMessagePayload
): Promise<ScheduleWhatsappMessageResponse> {
  const response = await apiFetch<any>("whatsapp-schedule", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  return {
    success: response?.success ?? true,
    scheduledId: response?.scheduledId ?? response?.data?.id,
    status: response?.status ?? response?.data?.status,
    dataAgendada: response?.dataAgendada ?? response?.data?.dataAgendada,
    proximaTentativa: response?.proximaTentativa ?? response?.data?.proximaTentativa,
    timestamp: response?.timestamp ?? response?.data?.timestamp
  };
}

export async function cancelWhatsappScheduled(id: string): Promise<{ success: boolean }> {
  try {
    const response = await apiFetch<any>(`whatsapp-scheduled/${id}`, { method: "DELETE" });
    return { success: response?.success ?? true };
  } catch (primaryError) {
    // Try fallback endpoint if available
    try {
      const response = await apiFetch<any>(`whatsapp-scheduled-cancel/${id}`, {
        method: "DELETE"
      });
      return { success: response?.success ?? true };
    } catch (fallbackError) {
      throw primaryError instanceof Error ? primaryError : fallbackError;
    }
  }
}

export async function getWhatsappScheduled(
  params?: QueryParams
): Promise<WhatsappScheduledListResponse> {
  const suffix = buildQuerySuffix(params);
  const response = await apiFetch<any>(`whatsapp-scheduled${suffix}`);
  const items = ensureArray<any>(response?.data ?? response?.items ?? response);
  const total = typeof response?.total === "number" ? response.total : items.length;
  const limit =
    typeof response?.limit === "number"
      ? response.limit
      : (params?.limit ? Number(params.limit) : undefined) ?? items.length;
  const offset =
    typeof response?.offset === "number"
      ? response.offset
      : (params?.offset ? Number(params.offset) : undefined) ?? 0;

  return {
    data: items.map(normalizeScheduled),
    total,
    limit,
    offset
  };
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

export const mockGroups: GroupAlias[] = [
  {
    id: "oraculo-holding",
    label: "Oráculo Holding",
    description: "Holding que consolida clientes estratégicos",
    color: "violet",
    icon: "users",
    members: [
      { id: "member-matrix", company_cnpj: "12.345.678/0001-90", position: 0 },
      { id: "member-atlas", company_cnpj: "91.234.567/0001-10", position: 1 },
      { id: "member-bluefit", company_cnpj: "27.890.123/0001-72", position: 2 }
    ]
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
  integracao_f360?: boolean;
  integracao_omie?: boolean;
  whatsapp_ativo?: boolean;
  saldo_atual?: number;
  inadimplencia?: number;
  receita_mes?: number;
}

export interface CompanyListItem extends CompanySummary {
  integracao_f360?: boolean;
  integracao_omie?: boolean;
  whatsapp_ativo?: boolean;
  saldo_atual?: number;
  inadimplencia?: number;
  receita_mes?: number;
}

export interface GroupAliasMember {
  id: string;
  alias_id?: string;
  company_cnpj: string;
  position?: number;
  company_name?: string;
  integracao_f360?: boolean;
  integracao_omie?: boolean;
  whatsapp_ativo?: boolean;
}

export interface GroupAlias {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  members?: GroupAliasMember[];
}

function mapCompanyToListItem(company: CompanySummary): CompanyListItem {
  const integrations = company.integrations ?? [];
  const hasIntegration = (label: string) =>
    integrations.some((integration) => {
      const type = (typeof integration === "string" ? integration : integration.type)?.toUpperCase();
      return type === label;
    });

  return {
    ...company,
    integracao_f360: company.integracao_f360 ?? hasIntegration("F360"),
    integracao_omie: company.integracao_omie ?? hasIntegration("OMIE"),
    whatsapp_ativo: company.whatsapp_ativo ?? !!company.whatsapp?.phone,
    saldo_atual: company.saldo_atual ?? 0,
    inadimplencia: company.inadimplencia ?? 0,
    receita_mes: company.receita_mes ?? 0
  };
}

export interface CreateGroupPayload {
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  members: string[];
}

export async function createGroupAlias(payload: CreateGroupPayload): Promise<GroupAlias> {
  // Try HTTP endpoint first
  try {
    const created = await apiFetch<any>("group-aliases", {
      method: "POST",
      body: JSON.stringify({
        label: payload.label,
        description: payload.description,
        color: payload.color,
        icon: payload.icon,
        members: payload.members
      })
    });
    const membersArray: GroupAliasMember[] = ensureArray<any>(created?.members).map((m: any, idx: number) => ({
      id: String(m?.id ?? `${created?.id ?? "tmp"}-m-${idx}`),
      alias_id: created?.id,
      company_cnpj: String(m?.company_cnpj ?? m?.cnpj ?? m),
      position: typeof m?.position === "number" ? m.position : idx,
      company_name: m?.company_name ?? m?.nome ?? undefined,
      integracao_f360: m?.integracao_f360 ?? m?.f360 ?? undefined,
      integracao_omie: m?.integracao_omie ?? m?.omie ?? undefined,
      whatsapp_ativo: m?.whatsapp_ativo ?? m?.whatsapp ?? undefined
    }));
    return {
      id: String(created?.id ?? `alias-${Date.now()}`),
      label: created?.label ?? payload.label,
      description: created?.description ?? payload.description,
      color: created?.color ?? payload.color,
      icon: created?.icon ?? payload.icon,
      members: membersArray
    };
  } catch (httpErr) {
    // Fallback to Supabase REST
    const aliasResponse = await supabaseRestFetch<{ id: string }>("group_aliases", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        label: payload.label,
        description: payload.description,
        color: payload.color,
        icon: payload.icon
      })
    });

    const aliasId = aliasResponse?.id;
    const membersPayload = payload.members.map((company_cnpj, index) => ({
      alias_id: aliasId,
      company_cnpj,
      position: index
    }));

    let members: GroupAliasMember[] = [];
    if (membersPayload.length > 0 && aliasId) {
      members = await supabaseRestFetch<GroupAliasMember[]>("group_alias_members", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(membersPayload)
      });
    }

    return {
      id: aliasId ?? `alias-${Date.now()}`,
      label: payload.label,
      description: payload.description,
      color: payload.color,
      icon: payload.icon,
      members
    };
  }
}

export interface UpdateAlertStatusPayload {
  status: "pendente" | "em_analise" | "resolvido" | "ignorado";
  resolucao_observacoes?: string;
  resolvido_por?: string;
  resolvido_em?: string;
}

export async function updateFinancialAlertStatus(id: string, payload: UpdateAlertStatusPayload) {
  return apiFetch(`financial-alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export interface PatchAlertResolutionPayload {
  resolucao_tipo: "corrigir" | "falso_positivo" | "ignorar";
  resolucao_observacoes?: string;
  resolvido_por?: string;
  resolvido_em?: string;
}

export async function patchFinancialAlertResolution(id: string, payload: PatchAlertResolutionPayload) {
  return apiFetch(`financial-alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
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

interface OnboardingTokensResponse {
  tokens: Array<
    OnboardingToken & {
      empresa?: { nome_fantasia?: string; nome?: string };
    }
  >;
  total: number;
}

export async function getOnboardingTokens(): Promise<OnboardingToken[]> {
  try {
    const response = await apiFetch<OnboardingTokensResponse>("onboarding-tokens");
    return (response.tokens ?? []).map((token) => ({
      ...token,
      empresa_nome: token.empresa_nome ?? token.empresa?.nome_fantasia ?? token.empresa?.nome ?? "—"
    }));
  } catch (error) {
    console.warn("[api] getOnboardingTokens fallback", error);
    return FALLBACK_ONBOARDING_TOKENS;
  }
}

export async function createOnboardingToken(
  payload: CreateOnboardingTokenPayload
): Promise<unknown> {
  try {
    return await apiFetch("onboarding-tokens", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn("[api] createOnboardingToken fallback", error);
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
}

export async function toggleOnboardingTokenStatus(id: string, ativo: boolean) {
  try {
    return await apiFetch("onboarding-tokens", {
      method: "PUT",
      body: JSON.stringify({ id, ativo })
    });
  } catch (error) {
    console.warn("[api] toggleOnboardingTokenStatus fallback", error);
    const token = FALLBACK_ONBOARDING_TOKENS.find((item) => item.id === id);
    if (token) {
      token.ativo = ativo;
    }
    return token ?? null;
  }
}

export async function deleteOnboardingToken(id: string) {
  try {
    return await apiFetch("onboarding-tokens", {
      method: "DELETE",
      body: JSON.stringify({ id })
    });
  } catch (error) {
    console.warn("[api] deleteOnboardingToken fallback", error);
    const index = FALLBACK_ONBOARDING_TOKENS.findIndex((item) => item.id === id);
    if (index >= 0) {
      FALLBACK_ONBOARDING_TOKENS.splice(index, 1);
      return { id };
    }
    return { id };
  }
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

interface EmpresasListResponse {
  empresas: CompanySummary[];
  total: number;
}

export async function getCompaniesList(): Promise<CompanyListItem[]> {
  try {
    const response = await apiFetch<EmpresasListResponse>("empresas-list?limit=200");
    return (response.empresas ?? FALLBACK_COMPANIES).map(mapCompanyToListItem);
  } catch (error) {
    console.warn("[api] getCompaniesList fallback", error);
    return FALLBACK_COMPANIES.map(mapCompanyToListItem);
  }
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

export async function fetchGroupAliases(): Promise<GroupAlias[]> {
  // Prefer HTTP endpoint (aggregated with member details), fallback to Supabase REST and mocks
  try {
    const list = await apiFetch<any[]>("group-aliases");
    return ensureArray<any>(list).map((row) => normalizeGroupAliasRow(row));
  } catch (httpError) {
    try {
      return await supabaseRestFetch<GroupAlias[]>(
        "group_aliases?select=id,label,description,color,icon,members:group_alias_members(id,company_cnpj,position)&order=created_at.desc"
      );
    } catch (error) {
      console.warn("[api] fetchGroupAliases fallback", error);
      return mockGroups;
    }
  }
}

export async function getGroupAlias(id: string): Promise<GroupAlias> {
  try {
    const row = await apiFetch<any>(`group-aliases/${id}`);
    return normalizeGroupAliasRow(row);
  } catch {
    return await supabaseRestFetch<GroupAlias>(
      `group_aliases?id=eq.${id}&select=id,label,description,color,icon,members:group_alias_members(id,company_cnpj,position)`
    );
  }
}

export interface UpdateGroupPayload {
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  members?: string[];
}

export async function updateGroupAlias(id: string, payload: UpdateGroupPayload): Promise<void> {
  // Try HTTP endpoint first
  try {
    await apiFetch(`group-aliases/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
    return;
  } catch {
    await supabaseRestFetch(`group_aliases?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        label: payload.label,
        description: payload.description,
        color: payload.color,
        icon: payload.icon
      })
    });
    // Members editing via Supabase REST not implemented here (would require diffing rows)
  }
}

// -----------------------
// Admin – Analytics
// -----------------------

export interface MoodIndexParams {
  cnpj?: string;
  empresaId?: string;
  dateFrom?: string;
  dateTo?: string;
  granularity?: "daily" | "weekly" | "monthly";
}

export interface MoodIndexAlert {
  type: string;
  date: string;
  change_percent: number;
  severity: string;
  message: string;
}

export interface MoodIndexTimelineEntry {
  date: string;
  avg_mood_index: number;
  conversation_count: number;
  very_positive_count?: number;
  positive_count?: number;
  neutral_count?: number;
  negative_count?: number;
  very_negative_count?: number;
  min_mood_index?: number;
  max_mood_index?: number;
}

export interface MoodIndexSummary {
  avg_mood_index: number;
  total_conversations: number;
  recommended_action: string;
}

export interface MoodIndexResponse {
  timeline: MoodIndexTimelineEntry[];
  alerts: MoodIndexAlert[];
  summary: MoodIndexSummary;
  period: { from: string; to: string };
  granularity: "daily" | "weekly" | "monthly";
}

function normalizeMoodTimelineRow(raw: any): MoodIndexTimelineEntry {
  return {
    date: raw?.date ?? raw?.period_date ?? "",
    avg_mood_index: Number(raw?.avg_mood_index ?? raw?.avgMoodIndex ?? raw?.avg_sentiment_score ?? 0),
    conversation_count: Number(raw?.conversation_count ?? raw?.total_messages ?? 0),
    very_positive_count: raw?.very_positive_count ?? raw?.veryPositiveCount,
    positive_count: raw?.positive_count ?? raw?.positiveCount,
    neutral_count: raw?.neutral_count ?? raw?.neutralCount,
    negative_count: raw?.negative_count ?? raw?.negativeCount,
    very_negative_count: raw?.very_negative_count ?? raw?.veryNegativeCount,
    min_mood_index: typeof raw?.min_mood_index === "number" ? raw.min_mood_index : undefined,
    max_mood_index: typeof raw?.max_mood_index === "number" ? raw.max_mood_index : undefined
  };
}

function normalizeMoodAlert(raw: any): MoodIndexAlert {
  return {
    type: raw?.type ?? "info",
    date: raw?.date ?? "",
    change_percent: Number(raw?.change_percent ?? raw?.changePercent ?? 0),
    severity: raw?.severity ?? "low",
    message: raw?.message ?? ""
  };
}

export async function getMoodIndexTimeline(params: MoodIndexParams = {}): Promise<MoodIndexResponse> {
  const search = new URLSearchParams();
  if (params.cnpj) search.set("cnpj", params.cnpj);
  if (params.empresaId) search.set("empresa_id", params.empresaId);
  if (params.dateFrom) search.set("date_from", params.dateFrom);
  if (params.dateTo) search.set("date_to", params.dateTo);
  if (params.granularity) search.set("granularity", params.granularity);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiFetch<any>(`mood-index-timeline${suffix}`);

  const timeline = ensureArray<any>(response?.timeline ?? response?.data ?? []).map(normalizeMoodTimelineRow);
  const alerts = ensureArray<any>(response?.alerts).map(normalizeMoodAlert);
  const summary: MoodIndexSummary = {
    avg_mood_index: Number(response?.summary?.avg_mood_index ?? response?.summary?.avgMoodIndex ?? 0),
    total_conversations: Number(
      response?.summary?.total_conversations ?? response?.summary?.totalConversations ?? 0
    ),
    recommended_action: response?.summary?.recommended_action ?? response?.summary?.recommendedAction ?? ""
  };

  return {
    timeline,
    alerts,
    summary,
    period: {
      from: response?.period?.from ?? params.dateFrom ?? "",
      to: response?.period?.to ?? params.dateTo ?? ""
    },
    granularity: (response?.granularity ?? params.granularity ?? "daily") as MoodIndexResponse["granularity"]
  };
}

export type UsageActivityType = "pages" | "api_calls" | "llm" | "whatsapp";

export interface UsageDetail {
  user_id: string;
  email: string;
  full_name: string;
  sessions: number;
  total_time_minutes: number;
  pages_visited: string[];
  api_calls: number;
  llm_interactions: number;
  llm_tokens: number;
  llm_cost: number;
  whatsapp_sent: number;
  whatsapp_received: number;
  top_pages: UsageDetailTopPage[];
  avg_session_minutes: number;
}

export interface UsageDetailTopPage {
  page: string;
  visits: number;
}

export interface UsageTimelineEntry {
  date: string;
  sessions: number;
  api_calls: number;
  llm_tokens: number;
  whatsapp_messages: number;
}

export interface UsageDetailsResponse {
  usage_details: UsageDetail[];
  timeline: UsageTimelineEntry[];
  period: { from: string; to: string };
  total_users: number;
}

export interface UsageDetailsParams {
  userId?: string;
  empresaId?: string;
  dateFrom?: string;
  dateTo?: string;
  activityType?: UsageActivityType;
}

export async function getUsageDetails(params: UsageDetailsParams = {}): Promise<UsageDetailsResponse> {
  const search = new URLSearchParams();
  if (params.userId) search.set("user_id", params.userId);
  if (params.empresaId) search.set("empresa_id", params.empresaId);
  if (params.dateFrom) search.set("date_from", params.dateFrom);
  if (params.dateTo) search.set("date_to", params.dateTo);
  if (params.activityType) search.set("activity_type", params.activityType);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await apiFetch<any>(`usage-details${suffix}`);

  const usage = ensureArray<any>(response?.usage_details ?? response?.usage ?? []).map((item) => {
    const pagesVisited = ensureArray<string>(item.pages_visited ?? item.pagesVisited ?? []);
    const topPagesRaw = ensureArray<any>(item.top_pages ?? item.topPages ?? []);
    return {
      user_id: item.user_id ?? "",
      email: item.email ?? "",
      full_name: item.full_name ?? item.fullName ?? "",
      sessions: Number(item.sessions ?? 0),
      total_time_minutes: Number(item.total_time_minutes ?? item.total_time_minutes ?? 0),
      pages_visited: pagesVisited,
      api_calls: Number(item.api_calls ?? item.api_calls_count ?? 0),
      llm_interactions: Number(item.llm_interactions ?? item.llm_interactions_count ?? 0),
      llm_tokens: Number(item.llm_tokens ?? item.llm_tokens_used ?? 0),
      llm_cost: Number(item.llm_cost ?? item.llm_cost_usd ?? 0),
      whatsapp_sent: Number(item.whatsapp_sent ?? item.whatsapp_messages_sent ?? 0),
      whatsapp_received: Number(item.whatsapp_received ?? item.whatsapp_messages_received ?? 0),
      top_pages: topPagesRaw.map((page: any) => ({
        page: page?.page ?? page?.name ?? "",
        visits: Number(page?.visits ?? page?.count ?? 0)
      })),
      avg_session_minutes: Number(
        item.avg_session_minutes ?? item.avgSessionMinutes ?? item.avg_session_duration_minutes ?? 0
      )
    } satisfies UsageDetail;
  });

  const timeline = ensureArray<any>(response?.timeline ?? []).map((item) => ({
    date: item.date ?? "",
    sessions: Number(item.sessions ?? 0),
    api_calls: Number(item.api_calls ?? item.api_calls_count ?? 0),
    llm_tokens: Number(item.llm_tokens ?? item.llm_tokens_used ?? 0),
    whatsapp_messages: Number(
      item.whatsapp_messages ?? item.whatsapp_messages_sent ?? 0
    ) + Number(item.whatsapp_messages_received ?? 0)
  }));

  return {
    usage_details: usage,
    timeline,
    period: {
      from: response?.period?.from ?? params.dateFrom ?? "",
      to: response?.period?.to ?? params.dateTo ?? ""
    },
    total_users: Number(response?.total_users ?? usage.length)
  };
}

export interface UsageSessionParams {
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface UsageSessionRecord {
  id: string;
  user_id: string;
  user_email: string;
  company_cnpj: string | null;
  session_start: string;
  session_end: string | null;
  session_duration_seconds: number;
  pages_visited: string[];
  features_used: string[];
  api_calls_count: number;
  llm_interactions_count: number;
  whatsapp_messages_sent: number;
  whatsapp_messages_received: number;
  successful_calls: number;
  failed_calls: number;
  avg_duration_ms: number;
}

export async function getUserUsageSessions(
  userId: string,
  params: UsageSessionParams = {}
): Promise<UsageSessionRecord[]> {
  if (!userId) return [];

  const search = new URLSearchParams();
  search.set(
    "select",
    [
      "id",
      "user_id",
      "user_email",
      "company_cnpj",
      "session_start",
      "session_end",
      "session_duration_seconds",
      "pages_visited",
      "features_used",
      "api_calls_count",
      "llm_interactions_count",
      "whatsapp_messages_sent",
      "whatsapp_messages_received",
      "successful_calls",
      "failed_calls",
      "avg_duration_ms"
    ].join(",")
  );
  search.append("user_id", `eq.${userId}`);
  search.append("order", "session_start.desc");
  search.append("limit", String(params.limit ?? 20));

  if (params.dateFrom) {
    search.append("session_start", `gte.${params.dateFrom}T00:00:00`);
  }
  if (params.dateTo) {
    search.append("session_start", `lte.${params.dateTo}T23:59:59`);
  }

  const result = await supabaseRestFetch<any[]>(`user_system_usage?${search.toString()}`);

  return ensureArray<any>(result).map((item) => ({
    id: item?.id ?? `${item?.session_start ?? ""}-${item?.session_end ?? ""}`,
    user_id: item?.user_id ?? userId,
    user_email: item?.user_email ?? "",
    company_cnpj: item?.company_cnpj ?? null,
    session_start: item?.session_start ?? "",
    session_end: item?.session_end ?? null,
    session_duration_seconds: Number(item?.session_duration_seconds ?? 0),
    pages_visited: ensureArray<string>(item?.pages_visited ?? []),
    features_used: ensureArray<string>(item?.features_used ?? []),
    api_calls_count: Number(item?.api_calls_count ?? item?.api_calls ?? 0),
    llm_interactions_count: Number(item?.llm_interactions_count ?? item?.llm_interactions ?? 0),
    whatsapp_messages_sent: Number(item?.whatsapp_messages_sent ?? 0),
    whatsapp_messages_received: Number(item?.whatsapp_messages_received ?? 0),
    successful_calls: Number(item?.successful_calls ?? 0),
    failed_calls: Number(item?.failed_calls ?? 0),
    avg_duration_ms: Number(item?.avg_duration_ms ?? 0)
  }));
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
  // Prefer HTTP endpoint
  try {
    const params = new URLSearchParams();
    if (filters?.cnpj) params.set("cnpj", String(filters.cnpj));
    if (filters?.status && filters.status !== "all") params.set("status", String(filters.status));
    if (filters?.limit) params.set("limit", String(filters.limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await apiFetch<any>(`financial-alerts${suffix}`);
    const rows: any[] = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.alerts)
        ? response.alerts
        : Array.isArray(response)
          ? response
          : [];
    return rows.map((row) => normalizeFinancialAlertRow(row)) as FinancialAlert[];
  } catch {
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
}

export async function getFinancialAlert(id: string): Promise<FinancialAlert> {
  try {
    const row = await apiFetch<any>(`financial-alerts/${id}`);
    return normalizeFinancialAlertRow(row);
  } catch {
    const rows = await supabaseRestFetch<FinancialAlert[]>(
      `financial_alerts?id=eq.${encodeURIComponent(id)}&select=*`
    );
    return rows?.[0];
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
  empresa_id?: string;
  periodo?: string;
}

export interface CashflowEntry {
  data: string;
  descricao: string;
  tipo: "entrada" | "saida";
  valor: number;
  categoria: string;
  status: "realizado" | "previsto";
}

export interface CashflowPrediction {
  data: string;
  saldo: number;
  status: "ok" | "atencao" | "critico";
  emoji: string;
}

export interface CashflowReportResponse {
  saldo_inicial: number;
  saldo_final: number;
  saldo_atual: number;
  total_entradas: number;
  total_saidas: number;
  movimentacoes: CashflowEntry[];
  previsao_7_dias: CashflowPrediction[];
  periodo: string;
  empresa_cnpj: string;
}

export interface DreReportParams {
  cnpj?: string;
  empresa_id?: string;
  periodo?: string;
}

export interface DreStructured {
  periodo: string;
  receita_bruta: number;
  deducoes: number;
  receita_liquida: number;
  custos: number;
  lucro_bruto: number;
  despesas_operacionais: number;
  ebitda: number;
  depreciacao: number;
  ebit: number;
  despesas_financeiras: number;
  receitas_financeiras: number;
  lucro_antes_ir: number;
  ir_csll: number;
  lucro_liquido: number;
}

export interface DreReportResponse {
  dre: DreStructured;
  historico: DreStructured[];
  periodo: string;
  empresa_cnpj: string;
}

export interface FinancialKpiParams {
  cnpj?: string;
  limit?: number;
}

export interface FinancialKpiRow {
  month: string;
  company_cnpj: string;
  receita: number;
  custos: number;
  despesas: number;
  outras: number;
  ebitda: number;
  margem_bruta: number;
}

export interface FinancialKpisResponse {
  metrics: Array<{
    label: string;
    value: number;
    unit: "currency" | "percent" | "dias";
    caption?: string;
    trend?: number;
  }>;
}

export interface PayableReceivableParams {
  cnpj?: string;
  from?: string;
  to?: string;
}

export interface PayableRow {
  id: string;
  data_vencimento: string;
  fornecedor?: string;
  cliente?: string;
  categoria?: string;
  valor?: number;
  status?: string;
}

export interface PayableReportRow {
  dueDate: string;
  supplier: string;
  category: string;
  value: number;
  status: string;
}

export interface ReceivableReportRow {
  dueDate: string;
  client: string;
  category: string;
  value: number;
  status: string;
}

export async function getCashflowReport(params?: CashflowReportParams): Promise<CashflowReportResponse> {
  const suffix = buildQuerySuffix({
    cnpj: params?.cnpj,
    empresa_id: params?.empresa_id,
    periodo: params?.periodo
  });
  try {
    return await apiFetch<CashflowReportResponse>(`relatorios-cashflow${suffix}`);
  } catch (error) {
    console.warn("[api] getCashflowReport fallback", error);
    const periodo = params?.periodo ?? new Date().toISOString().slice(0, 7);
    return {
      saldo_inicial: 0,
      saldo_final: 0,
      saldo_atual: 0,
      total_entradas: 0,
      total_saidas: 0,
      movimentacoes: [],
      previsao_7_dias: [],
      periodo,
      empresa_cnpj: params?.cnpj ?? "00000000000000"
    };
  }
}

export async function getReportDre(params?: DreReportParams): Promise<DreReportResponse> {
  const suffix = buildQuerySuffix({
    cnpj: params?.cnpj,
    empresa_id: params?.empresa_id,
    periodo: params?.periodo
  });
  try {
    return await apiFetch<DreReportResponse>(`relatorios-dre${suffix}`);
  } catch (error) {
    console.warn("[api] getReportDre fallback", error);
    const periodo = params?.periodo ?? new Date().toISOString().slice(0, 7);
    const dre: DreStructured = {
      periodo,
      receita_bruta: 0,
      deducoes: 0,
      receita_liquida: 0,
      custos: 0,
      lucro_bruto: 0,
      despesas_operacionais: 0,
      ebitda: 0,
      depreciacao: 0,
      ebit: 0,
      despesas_financeiras: 0,
      receitas_financeiras: 0,
      lucro_antes_ir: 0,
      ir_csll: 0,
      lucro_liquido: 0
    };
    return {
      dre,
      historico: [],
      periodo,
      empresa_cnpj: params?.cnpj ?? "00000000000000"
    };
  }
}

export type FinancialInsightStatus = "ok" | "atencao" | "critico" | "attention" | "critical" | "warning" | string;

export interface FinancialInsightComparisonRow {
  label: string;
  current?: number;
  previous?: number;
  variation_percent?: number;
  unit?: "currency" | "percent" | "number" | string;
  raw?: Record<string, unknown>;
}

export interface FinancialInsightSeriesPoint {
  label: string;
  value: number;
}

export interface FinancialInsightSeries {
  name: string;
  data: FinancialInsightSeriesPoint[];
  color?: string;
}

export interface FinancialInsightChart {
  type?: "line" | "bar" | "area";
  series?: FinancialInsightSeries[];
}

export interface FinancialInsightOverview {
  summary?: string;
  highlights?: string[];
  comparison?: FinancialInsightComparisonRow[];
  dre_snapshot?: FinancialInsightComparisonRow[];
  chart?: FinancialInsightChart;
}

export interface FinancialInsightRisk {
  title: string;
  impact?: string;
  comment?: string;
  severity?: FinancialInsightStatus;
  alert_id?: string;
  link?: string;
  date?: string;
}

export interface FinancialInsightOpportunities {
  summary?: string;
  actions?: string[];
  next_steps?: string[];
  chart?: FinancialInsightChart;
}

export interface FinancialInsightMetadata {
  generated_at?: string;
  generated_by?: string;
  style?: string;
}

export interface FinancialInsightResponse {
  status?: FinancialInsightStatus;
  overview?: FinancialInsightOverview;
  risks?: FinancialInsightRisk[];
  opportunities?: FinancialInsightOpportunities;
  metadata?: FinancialInsightMetadata;
  period?: { from: string; to: string };
}

export interface FinancialInsightRequest {
  company_cnpj: string;
  from: string;
  to: string;
  style?: string;
  alias?: string;
}

export async function generateFinancialInsight(payload: FinancialInsightRequest): Promise<FinancialInsightResponse> {
  return apiFetch<FinancialInsightResponse>("analysis/financial-insight", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getFinancialKpis(params?: FinancialKpiParams): Promise<FinancialKpisResponse> {
  if (!params?.cnpj) {
    return { metrics: [] };
  }

  const query = new URLSearchParams({
    company_cnpj: `eq.${params.cnpj}`,
    order: "month.desc",
    limit: String(params.limit ?? 6)
  }).toString();

  try {
    const rows = await supabaseRestFetch<FinancialKpiRow[]>(`v_kpi_monthly_enriched?${query}`);
    const latest = rows[0];
    const previous = rows[1];

    if (!latest) return { metrics: [] };

    const computeTrend = (value?: number, prev?: number) => {
      if (prev === undefined || prev === 0 || value === undefined) return undefined;
      return (value - prev) / Math.abs(prev);
    };

    const metrics = [
      {
        label: "Receita",
        value: latest.receita ?? 0,
        unit: "currency" as const,
        caption: latest.month,
        trend: computeTrend(latest.receita, previous?.receita)
      },
      {
        label: "Custos",
        value: latest.custos ?? 0,
        unit: "currency" as const,
        caption: latest.month,
        trend: computeTrend(latest.custos, previous?.custos)
      },
      {
        label: "EBITDA",
        value: latest.ebitda ?? 0,
        unit: "currency" as const,
        caption: latest.month,
        trend: computeTrend(latest.ebitda, previous?.ebitda)
      },
      {
        label: "Margem bruta",
        value: (latest.margem_bruta ?? 0) * 100,
        unit: "percent" as const,
        caption: latest.month,
        trend: computeTrend(latest.margem_bruta, previous?.margem_bruta)
      }
    ];

    return { metrics };
  } catch (error) {
    console.warn("[api] getFinancialKpis fallback", error);
    return { metrics: [] };
  }
}

export async function getPayablesReport(params?: PayableReceivableParams): Promise<PayableReportRow[]> {
  const query = new URLSearchParams();
  if (params?.cnpj) {
    query.set("company_cnpj", `eq.${params.cnpj}`);
  }
  if (params?.from) {
    query.set("data_vencimento", `gte.${params.from}`);
  }
  if (params?.to) {
    query.set("data_vencimento", `lte.${params.to}`);
  }
  query.set("order", "data_vencimento.asc");
  query.set("limit", "50");

  try {
    const rows = await supabaseRestFetch<PayableRow[]>(`contas_pagar?${query.toString()}`);
    return rows.map((row) => ({
      ...row,
      dueDate: row.data_vencimento,
      supplier: row.fornecedor ?? row.cliente ?? "—",
      category: row.categoria ?? "—",
      value: row.valor ?? 0,
      status: row.status ?? "pending"
    }));
  } catch (error) {
    console.warn("[api] getPayablesReport fallback", error);
    return [];
  }
}

export async function getReceivablesReport(params?: PayableReceivableParams): Promise<ReceivableReportRow[]> {
  const query = new URLSearchParams();
  if (params?.cnpj) {
    query.set("company_cnpj", `eq.${params.cnpj}`);
  }
  if (params?.from) {
    query.set("data_vencimento", `gte.${params.from}`);
  }
  if (params?.to) {
    query.set("data_vencimento", `lte.${params.to}`);
  }
  query.set("order", "data_vencimento.asc");
  query.set("limit", "50");

  try {
    const rows = await supabaseRestFetch<PayableRow[]>(`contas_receber?${query}`);
    return rows.map((row) => ({
      ...row,
      dueDate: row.data_vencimento,
      client: row.cliente ?? row.fornecedor ?? "—",
      category: row.categoria ?? "—",
      value: row.valor ?? 0,
      status: row.status ?? "pending"
    }));
  } catch (error) {
    console.warn("[api] getReceivablesReport fallback", error);
    return [];
  }
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


export async function firstAccessSetup() {
  return { ok: true };
}

export async function recoverPassword() {
  return { ok: true };
}

// -----------------------
// Conciliation & Fees
// -----------------------

export async function fetchDivergentFees() {
  try {
    return await supabaseRestFetch<DivergenceReport[]>(
      "v_taxas_divergentes?select=*"
    );
  } catch (error) {
    console.warn("[api] fetchDivergentFees fallback", error);
    return mockDivergences;
  }
}

export async function createContractFee(fee: Partial<ContractFeeDetail>) {
  try {
    const result = await supabaseRestFetch<ContractFeeDetail[]>(
      "contract_fees",
      {
        method: "POST",
        body: JSON.stringify(fee)
      }
    );
    return result[0];
  } catch (error) {
    console.error("[api] createContractFee error", error);
    throw error;
  }
}

export async function updateContractFee(id: string, updates: Partial<ContractFeeDetail>) {
  try {
    return await supabaseRestFetch(
      `contract_fees?id=eq.${id}`,
      {
        method: "PATCH",
        body: JSON.stringify(updates)
      }
    );
  } catch (error) {
    console.error("[api] updateContractFee error", error);
    throw error;
  }
}

export async function deleteContractFee(id: string) {
  try {
    return await supabaseRestFetch(
      `contract_fees?id=eq.${id}`,
      { method: "DELETE" }
    );
  } catch (error) {
    console.error("[api] deleteContractFee error", error);
    throw error;
  }
}

export async function resolveAlert(
  alertId: string,
  status: "resolvido" | "ignorado" | "em_analise",
  observacoes?: string
) {
  try {
    return await supabaseRestFetch(
      `financial_alerts?id=eq.${alertId}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
          resolucao_observacoes: observacoes,
          resolvido_em: new Date().toISOString()
        })
      }
    );
  } catch (error) {
    console.error("[api] resolveAlert error", error);
    throw error;
  }
}

export async function uploadBankStatement(file: File, companyCnpj: string, bancoCodigo: string) {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("company_cnpj", companyCnpj);
    formData.append("banco_codigo", bancoCodigo);

    return await apiFetch(
      "import-bank-statement",
      {
        method: "POST",
        body: formData
      }
    );
  } catch (error) {
    console.error("[api] uploadBankStatement error", error);
    throw error;
  }
}

export async function validateFees(companyCnpj?: string) {
  try {
    return await apiFetch(
      "validate-fees",
      {
        method: "POST",
        body: JSON.stringify({ company_cnpj: companyCnpj })
      }
    );
  } catch (error) {
    console.error("[api] validateFees error", error);
    throw error;
  }
}

export async function reconcileBank(companyCnpj?: string) {
  try {
    return await apiFetch(
      "reconcile-bank",
      {
        method: "POST",
        body: JSON.stringify({ company_cnpj: companyCnpj })
      }
    );
  } catch (error) {
    console.error("[api] reconcileBank error", error);
    throw error;
  }
}

export async function reconcileCard(companyCnpj?: string) {
  try {
    return await apiFetch(
      "reconcile-card",
      {
        method: "POST",
        body: JSON.stringify({ company_cnpj: companyCnpj })
      }
    );
  } catch (error) {
    console.error("[api] reconcileCard error", error);
    throw error;
  }
}

export async function syncBankMetadata(companyCnpj?: string) {
  try {
    return await apiFetch(
      "sync-bank-metadata",
      {
        method: "POST",
        body: JSON.stringify({ company_cnpj: companyCnpj })
      }
    );
  } catch (error) {
    console.error("[api] syncBankMetadata error", error);
    throw error;
  }
}

export async function getBankStatementsFromERP(
  companyCnpj: string,
  options?: {
    banco_codigo?: string;
    data_from?: string;
    data_to?: string;
    days_back?: number;
  }
) {
  try {
    return await apiFetch(
      "get-bank-statements-from-erp",
      {
        method: "POST",
        body: JSON.stringify({
          company_cnpj: companyCnpj,
          ...options
        })
      }
    );
  } catch (error) {
    console.error("[api] getBankStatementsFromERP error", error);
    throw error;
  }
}
