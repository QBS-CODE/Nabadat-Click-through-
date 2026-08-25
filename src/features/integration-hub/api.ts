// M-13 Integration Hub console API client — CLICKTHROUGH MOCK.
//
// This is the demo/clickthrough build: it serves entirely from an in-memory store and NEVER
// contacts a backend (no fetch / callJson / getSessionToken / http.ts import). The export surface
// is byte-for-byte identical to the real `features/integration-hub/api.ts` — same params
// interfaces, same endpoint function names + signatures + return types, and the same re-export
// blocks — so every hook / page / component that imports from "@/features/integration-hub/api"
// compiles and renders unchanged.
//
// Domain objects are constructed DIRECTLY (camelCase), not via the wire types / `map*` mappers.
// The only things thrown are `IntegrationHubApiError` (a get-by-unknown-id 404) and
// `MappingImportError` (a deliberately-triggered import rejection, filename containing "reject").

import { IntegrationHubApiError } from "./integration-hub-api-error"
import { MappingImportError } from "./mapping-import-error"
import type {
  Credential,
  CredentialInput,
  DataType,
  GeneratedCredential,
  Integration,
  IntegrationCreateInput,
  IntegrationCreated,
  IntegrationListResult,
  IntegrationUpdateInput,
  MappingImportMode,
  MappingImportResult,
  Page,
  Parameter,
  ParameterListResult,
  ParameterMapping,
  ParameterMappingListResult,
  ParameterMappingSaveInput,
  ParameterOrigin,
  ParameterPatchResult,
  ParameterSaveInput,
  RequestLog,
  RequestLogListResult,
  Scenario,
  ServiceChannel,
  ServiceChannelSaveInput,
  UnmappedValueQueue,
  LogStatusClass,
  LogWindow,
} from "./dto"

export type {
  ApiErrorEnvelope,
  ChannelParameterAssignmentInput,
  CredentialInput,
  CredentialMechanism,
  CredentialStatus,
  DataType,
  GeneratedCredential,
  Integration,
  IntegrationCreateInput,
  IntegrationCreated,
  IntegrationListItem,
  IntegrationListResult,
  IntegrationHealthTiles,
  RequestLogListResult,
  RequestLogCounts,
  RequestLogAppliedFilter,
  LoggedParameter,
  IntegrationUpdateInput,
  LogStatusClass,
  LogWindow,
  MappingImportMode,
  MappingImportResult,
  MappingImportRowError,
  MappingParameter,
  ParameterMappingListResult,
  UnmappedValueQueue,
  OAuthScope,
  Page,
  Parameter,
  ParameterMapping,
  ParameterMappingSaveInput,
  ParameterOrigin,
  ParameterPatchResult,
  ParameterReference,
  ParameterSaveInput,
  RequestLog,
  Scenario,
  ServiceChannel,
  ServiceChannelSaveInput,
  UnmappedValue,
} from "./dto"
export type {
  AcceptedParameter,
  ChannelContractRow,
  Credential,
  IntegrationEndpoint,
  IntegrationFieldKey,
  ParameterCounts,
  MappingFieldKey,
  ParameterFieldKey,
  ParameterListResult,
} from "./dto"
export {
  CHANNEL_ERROR_CODES,
  CHANNEL_ID_MAX_LENGTH,
  DATA_TYPES,
  INTEGRATION_ERROR_CODES,
  MAPPING_ERROR_CODES,
  PARAMETER_ERROR_CODES,
  SCENARIOS,
  SCOPE_BY_SCENARIO,
  channelFieldForCode,
  integrationFieldForCode,
  mappingSupportFor,
  mappingFieldForCode,
  parameterFieldForCode,
  sanitizeChannelId,
  suggestApiField,
} from "./dto"
export { IntegrationHubApiError } from "./integration-hub-api-error"
export { MappingImportError } from "./mapping-import-error"
export { MAPPING_IMPORT_ERROR_CODES } from "./dto"

// ===========================================================================
// Params interfaces (identical to the real client)
// ===========================================================================

export interface PageParams {
  cursor?: string
  limit?: number
}

export interface ListServiceChannelsParams extends PageParams {
  active?: boolean
}

export interface ListParametersParams extends PageParams {
  origin?: ParameterOrigin
  type?: DataType
  q?: string
}

export interface ListIntegrationsParams extends PageParams {
  q?: string
  channel?: string
}

export interface ListRequestLogsParams extends PageParams {
  statusClass?: LogStatusClass
  integrationId?: string
  window?: LogWindow
}

// ===========================================================================
// Mock infrastructure
// ===========================================================================

const NOW = new Date("2026-08-24T12:00:00Z")

const clone = <T>(value: T): T => structuredClone(value)

const randomToken = (prefix: string) =>
  `${prefix}${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`

const nextId = (() => {
  let counter = 1000
  return (prefix: string) => `${prefix}-${++counter}`
})()

/** Slices to `limit` and reports whether more rows remained (single-page seeds ⇒ null cursor). */
function paginate<T>(rows: T[], limit?: number): { items: T[]; nextCursor: string | null } {
  const size = limit && limit > 0 ? limit : rows.length
  const items = rows.slice(0, size)
  return { items, nextCursor: rows.length > items.length ? randomToken("cur_") : null }
}

function notFound(code: string, message: string): IntegrationHubApiError {
  return new IntegrationHubApiError(404, {
    error: { code, message, correlation_id: randomToken("corr_") },
  })
}

/** Inbound scenario endpoint shapes, used to compose the SCR-02 endpoint preview. */
const SCENARIO_ENDPOINT: Record<
  Scenario,
  { method: string; base: string; scope: string; successStatus: number; successDescription: string }
> = {
  dispatch: {
    method: "POST",
    base: "/v1/survey-requests",
    scope: "survey-requests:write",
    successStatus: 202,
    successDescription: "Accepted — survey request queued for dispatch",
  },
  redirect_link: {
    method: "GET",
    base: "/v1/survey-links",
    scope: "survey-links:read",
    successStatus: 200,
    successDescription: "OK — returns the personalised survey redirect URL",
  },
  json_render: {
    method: "GET",
    base: "/v1/survey-definitions",
    scope: "survey-definitions:read",
    successStatus: 200,
    successDescription: "OK — returns the survey definition as JSON",
  },
  iframe_embed: {
    method: "GET",
    base: "/v1/survey-embed",
    scope: "survey-embed:read",
    successStatus: 200,
    successDescription: "OK — returns the embeddable survey markup",
  },
  response_ingestion: {
    method: "POST",
    base: "/v1/responses",
    scope: "responses:write",
    successStatus: 202,
    successDescription: "Accepted — response stored for processing",
  },
}

// ---------------------------------------------------------------------------
// Seed: Parameters (10 — 5 built-in, 5 custom)
// ---------------------------------------------------------------------------

function makeParameter(p: Partial<Parameter> & Pick<Parameter, "id" | "nameEn" | "nameAr" | "apiField" | "dataType" | "origin">): Parameter {
  const builtIn = p.origin === "built_in"
  return {
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    apiField: p.apiField,
    apiFieldLocked: p.apiFieldLocked ?? builtIn,
    dataType: p.dataType,
    dataTypeLocked: p.dataTypeLocked ?? builtIn,
    rangeMin: p.rangeMin ?? null,
    rangeMax: p.rangeMax ?? null,
    rangeUnit: p.rangeUnit ?? null,
    validationRule: p.validationRule ?? null,
    origin: p.origin,
    enabled: p.enabled ?? true,
    requiredByDefault: p.requiredByDefault ?? false,
    filterable: p.filterable ?? false,
    reportingVisibility: p.reportingVisibility ?? true,
    dashboardVisibility: p.dashboardVisibility ?? true,
    mappingSupport: p.mappingSupport ?? p.dataType === "list",
    mappingSupportChangeable:
      p.mappingSupportChangeable ??
      (p.dataType === "text" || p.dataType === "boolean" || p.dataType === "url"),
    mappingsCount: p.mappingsCount ?? 0,
    channelIds: p.channelIds ?? [],
  }
}

const parameterStore: Parameter[] = [
  makeParameter({ id: "p-1", nameEn: "Customer Name", nameAr: "اسم العميل", apiField: "customer_name", dataType: "text", origin: "built_in", requiredByDefault: true, filterable: true, channelIds: ["whatsapp", "web-widget", "legacy-sms", "mobile-app"] }),
  makeParameter({ id: "p-2", nameEn: "Mobile Number", nameAr: "رقم الجوال", apiField: "mobile_number", dataType: "phone", origin: "built_in", requiredByDefault: true, filterable: true, channelIds: ["whatsapp", "ivr", "legacy-sms"] }),
  makeParameter({ id: "p-3", nameEn: "Email Address", nameAr: "البريد الإلكتروني", apiField: "email", dataType: "email", origin: "built_in", filterable: true, channelIds: ["web-widget"] }),
  makeParameter({ id: "p-4", nameEn: "Language", nameAr: "اللغة", apiField: "language", dataType: "list", origin: "built_in", mappingSupport: true, mappingSupportChangeable: false, filterable: true, mappingsCount: 3, channelIds: ["whatsapp", "mobile-app"] }),
  makeParameter({ id: "p-5", nameEn: "Rating", nameAr: "التقييم", apiField: "rating", dataType: "range", origin: "built_in", rangeMin: 1, rangeMax: 5, rangeUnit: "stars", channelIds: ["ivr"] }),
  makeParameter({ id: "p-6", nameEn: "Branch", nameAr: "الفرع", apiField: "branch", dataType: "list", origin: "custom", mappingSupport: true, mappingSupportChangeable: false, filterable: true, mappingsCount: 4, channelIds: ["whatsapp", "mobile-app"] }),
  makeParameter({ id: "p-7", nameEn: "Channel Type", nameAr: "نوع القناة", apiField: "channel_type", dataType: "text", origin: "custom", mappingSupport: true, mappingSupportChangeable: true, filterable: true, mappingsCount: 3, channelIds: ["web-widget"] }),
  makeParameter({ id: "p-8", nameEn: "Visit Date", nameAr: "تاريخ الزيارة", apiField: "visit_date", dataType: "date", origin: "custom", enabled: false, channelIds: [] }),
  makeParameter({ id: "p-9", nameEn: "Transaction Amount", nameAr: "قيمة المعاملة", apiField: "transaction_amount", dataType: "currency", origin: "custom", filterable: true, channelIds: ["ivr", "mobile-app"] }),
  makeParameter({ id: "p-10", nameEn: "NPS Score", nameAr: "درجة الترشيح", apiField: "nps_score", dataType: "number", origin: "custom", rangeMin: 0, rangeMax: 10, filterable: true, channelIds: ["web-widget", "mobile-app"] }),
]

const parameterById = () => new Map(parameterStore.map((p) => [p.id, p]))

/** Parameters whose disable is blocked by references (BR-10 two-step), for the D-6 demo. */
const REFERENCES: Record<string, { kind: string; name: string }[]> = {
  "p-2": [
    { kind: "channel_contract", name: "WhatsApp Business" },
    { kind: "rule", name: "Escalate high-value complaints" },
  ],
  "p-10": [
    { kind: "scope_filter", name: "Detractors — Eastern Region" },
    { kind: "rule", name: "NPS drop alert" },
  ],
}

// ---------------------------------------------------------------------------
// Seed: Service channels (5)
// ---------------------------------------------------------------------------

function makeChannel(
  id: string,
  nameEn: string,
  nameAr: string,
  channelId: string,
  description: string | null,
  active: boolean,
  channelIdLocked: boolean,
  integrationsCount: number,
  spec: { pid: string; required: boolean }[],
): ServiceChannel {
  const byId = parameterById()
  const contract = spec.map((row) => {
    const param = byId.get(row.pid)
    return {
      parameterId: row.pid,
      apiField: param?.apiField ?? row.pid,
      nameEn: param?.nameEn ?? row.pid,
      nameAr: param?.nameAr ?? row.pid,
      supported: true,
      required: row.required,
    }
  })
  return {
    id,
    nameEn,
    nameAr,
    channelId,
    description,
    active,
    channelIdLocked,
    supportedCount: contract.length,
    requiredCount: contract.filter((c) => c.required).length,
    integrationsCount,
    contract,
  }
}

const channelStore: ServiceChannel[] = [
  makeChannel("sc-1", "WhatsApp Business", "واتساب للأعمال", "whatsapp", "Outbound survey dispatch over WhatsApp Business API.", true, true, 1, [
    { pid: "p-1", required: true },
    { pid: "p-2", required: true },
    { pid: "p-4", required: false },
    { pid: "p-6", required: false },
  ]),
  makeChannel("sc-2", "Web Widget", "ودجت الويب", "web-widget", "Embedded feedback widget on the customer portal.", true, false, 2, [
    { pid: "p-1", required: true },
    { pid: "p-3", required: false },
    { pid: "p-7", required: false },
    { pid: "p-10", required: true },
  ]),
  makeChannel("sc-3", "IVR Voice", "الرد الصوتي", "ivr", "Post-call IVR satisfaction survey.", true, true, 1, [
    { pid: "p-2", required: true },
    { pid: "p-5", required: true },
    { pid: "p-9", required: false },
  ]),
  makeChannel("sc-4", "Legacy SMS", "الرسائل القصيرة", "legacy-sms", "Deprecated SMS survey gateway — retained for historical data.", false, true, 0, [
    { pid: "p-1", required: false },
    { pid: "p-2", required: true },
  ]),
  makeChannel("sc-5", "Mobile App", "تطبيق الجوال", "mobile-app", "In-app survey prompts for the customer mobile application.", true, false, 1, [
    { pid: "p-1", required: true },
    { pid: "p-4", required: false },
    { pid: "p-6", required: false },
    { pid: "p-9", required: false },
    { pid: "p-10", required: false },
  ]),
]

const channelById = () => new Map(channelStore.map((c) => [c.id, c]))

// ---------------------------------------------------------------------------
// Seed: Integrations (5) — internal record; list item + detail are derived
// ---------------------------------------------------------------------------

interface StoredIntegration {
  id: string
  name: string
  description: string | null
  serviceChannelId: string
  scenario: Scenario
  active: boolean
  allowedOrigins: string[]
  linkExpiryOverrideHours: number | null
  credential: Credential | null
  createdAt: string
  updatedAt: string
  traffic: { requests24h: number; failedRequests24h: number; lastActivityAt: string | null }
}

const integrationStore: StoredIntegration[] = [
  {
    id: "int-1",
    name: "WhatsApp Survey Dispatch",
    description: "Production dispatch of post-interaction surveys via WhatsApp.",
    serviceChannelId: "sc-1",
    scenario: "dispatch",
    active: true,
    allowedOrigins: [],
    linkExpiryOverrideHours: null,
    credential: { id: "cred-1", mechanism: "api_key", labelOrClientName: "Production Key", scopes: ["survey-requests:write"], status: "active", generatedAt: "2026-07-15T09:00:00Z", generatedBy: "admin@tenant.sa", revokedAt: null },
    createdAt: "2026-07-15T09:00:00Z",
    updatedAt: "2026-08-20T08:30:00Z",
    traffic: { requests24h: 1240, failedRequests24h: 8, lastActivityAt: "2026-08-24T11:55:00Z" },
  },
  {
    id: "int-2",
    name: "Web Redirect Links",
    description: "OAuth-secured survey redirect links for the customer portal.",
    serviceChannelId: "sc-2",
    scenario: "redirect_link",
    active: true,
    allowedOrigins: [],
    linkExpiryOverrideHours: 48,
    credential: { id: "cred-2", mechanism: "oauth_client", labelOrClientName: "web-portal", scopes: ["survey-links:read"], status: "active", generatedAt: "2026-07-20T11:30:00Z", generatedBy: "admin@tenant.sa", revokedAt: null },
    createdAt: "2026-07-20T11:30:00Z",
    updatedAt: "2026-08-18T13:00:00Z",
    traffic: { requests24h: 640, failedRequests24h: 3, lastActivityAt: "2026-08-24T11:40:00Z" },
  },
  {
    id: "int-3",
    name: "Mobile Survey Definitions",
    description: "JSON survey definitions consumed by the mobile SDK. Deactivated pending SDK v3.",
    serviceChannelId: "sc-5",
    scenario: "json_render",
    active: false,
    allowedOrigins: [],
    linkExpiryOverrideHours: null,
    credential: { id: "cred-3", mechanism: "oauth_client", labelOrClientName: "mobile-sdk", scopes: ["survey-definitions:read"], status: "revoked", generatedAt: "2026-06-01T08:00:00Z", generatedBy: "admin@tenant.sa", revokedAt: "2026-08-01T10:00:00Z" },
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    traffic: { requests24h: 0, failedRequests24h: 0, lastActivityAt: null },
  },
  {
    id: "int-4",
    name: "Embedded Survey Frame",
    description: "Iframe-embedded survey for partner websites. Credential not yet generated.",
    serviceChannelId: "sc-2",
    scenario: "iframe_embed",
    active: true,
    allowedOrigins: ["https://example.com", "https://portal.example.com"],
    linkExpiryOverrideHours: null,
    credential: null,
    createdAt: "2026-08-19T14:00:00Z",
    updatedAt: "2026-08-19T14:00:00Z",
    traffic: { requests24h: 95, failedRequests24h: 6, lastActivityAt: "2026-08-24T09:30:00Z" },
  },
  {
    id: "int-5",
    name: "IVR Response Ingestion",
    description: "Inbound ingestion of IVR survey responses.",
    serviceChannelId: "sc-3",
    scenario: "response_ingestion",
    active: true,
    allowedOrigins: [],
    linkExpiryOverrideHours: null,
    credential: { id: "cred-5", mechanism: "api_key", labelOrClientName: "Ingestion Key", scopes: ["responses:write"], status: "active", generatedAt: "2026-08-05T07:45:00Z", generatedBy: "ops@tenant.sa", revokedAt: null },
    createdAt: "2026-08-05T07:45:00Z",
    updatedAt: "2026-08-22T16:00:00Z",
    traffic: { requests24h: 410, failedRequests24h: 15, lastActivityAt: "2026-08-24T06:15:00Z" },
  },
]

function errorRateDisplay(rate: number | null): string {
  return rate == null ? "—" : `${(rate * 100).toFixed(1)}%`
}

function rowBand(rate: number | null): string {
  if (rate == null) return "neutral"
  if (rate < 0.01) return "d2"
  if (rate <= 0.05) return "d3"
  return "d4"
}

function buildEndpoint(stored: StoredIntegration) {
  const channel = channelById().get(stored.serviceChannelId)
  const ep = SCENARIO_ENDPOINT[stored.scenario]
  const channelId = channel?.channelId ?? "unknown"
  return {
    method: ep.method,
    path: `${ep.base}/${channelId}`,
    pathTemplate: `${ep.base}/{channelId}`,
    requiredScope: ep.scope,
    successStatus: ep.successStatus,
    successDescription: ep.successDescription,
  }
}

function buildIntegrationDetail(stored: StoredIntegration): Integration {
  const channel = channelById().get(stored.serviceChannelId)
  const byId = parameterById()
  const acceptedParameters = (channel?.contract ?? [])
    .filter((row) => row.supported)
    .map((row) => ({
      parameterId: row.parameterId,
      apiField: row.apiField,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      dataType: byId.get(row.parameterId)?.dataType ?? "text",
      required: row.required,
    }))
  return {
    id: stored.id,
    name: stored.name,
    description: stored.description,
    serviceChannelId: stored.serviceChannelId,
    serviceChannelName: channel?.nameEn ?? "",
    channelId: channel?.channelId ?? "",
    serviceChannelActive: channel?.active ?? false,
    scenario: stored.scenario,
    active: stored.active,
    allowedOrigins: stored.allowedOrigins,
    linkExpiryOverrideHours: stored.linkExpiryOverrideHours,
    endpoint: buildEndpoint(stored),
    acceptedParameters,
    credential: stored.credential,
    createdAt: stored.createdAt,
    updatedAt: stored.updatedAt,
  }
}

function buildIntegrationListItem(stored: StoredIntegration) {
  const channel = channelById().get(stored.serviceChannelId)
  const requests = stored.traffic.requests24h
  const rate = requests > 0 ? stored.traffic.failedRequests24h / requests : null
  return {
    id: stored.id,
    name: stored.name,
    description: stored.description,
    serviceChannelId: stored.serviceChannelId,
    serviceChannelName: channel?.nameEn ?? "",
    channelId: channel?.channelId ?? "",
    scenario: stored.scenario,
    active: stored.active,
    endpointPath: buildEndpoint(stored).path,
    credentialMechanism: stored.credential?.mechanism ?? null,
    credentialStatus: stored.credential?.status ?? null,
    createdAt: stored.createdAt,
    traffic: {
      requests24h: requests,
      failedRequests24h: stored.traffic.failedRequests24h,
      errorRate: rate,
      errorRateDisplay: errorRateDisplay(rate),
      errorRateBand: rowBand(rate),
      lastActivityAt: stored.traffic.lastActivityAt,
    },
  }
}

function buildGeneratedCredential(stored: StoredIntegration, input: CredentialInput): GeneratedCredential {
  const scope = SCENARIO_ENDPOINT[stored.scenario].scope
  const generatedAt = new Date().toISOString()
  if (input.mechanism === "api_key") {
    const credential: Credential = {
      id: nextId("cred"),
      mechanism: "api_key",
      labelOrClientName: input.keyLabel,
      scopes: [scope] as Credential["scopes"],
      status: "active",
      generatedAt,
      generatedBy: "you@tenant.sa",
      revokedAt: null,
    }
    return {
      credential,
      secret: randomToken("nb_sk_live_"),
      clientId: null,
      grantType: null,
      accessTokenLifetimeSeconds: null,
      tokenEndpoint: null,
    }
  }
  const credential: Credential = {
    id: nextId("cred"),
    mechanism: "oauth_client",
    labelOrClientName: input.clientName,
    scopes: input.scopes,
    status: "active",
    generatedAt,
    generatedBy: "you@tenant.sa",
    revokedAt: null,
  }
  return {
    credential,
    secret: randomToken("nb_cs_"),
    clientId: `clt_${randomToken("")}`,
    grantType: "client_credentials",
    accessTokenLifetimeSeconds: 900,
    tokenEndpoint: "/api/v1/integration-hub/oauth/token",
  }
}

// ---------------------------------------------------------------------------
// Seed: Parameter mappings + unmapped-value queues
// ---------------------------------------------------------------------------

function makeMapping(parameterId: string, sourceValue: string, displayEn: string, displayAr: string, createdAt: string): ParameterMapping {
  return { id: nextId("map"), parameterId, sourceValue, displayEn, displayAr, status: "active", createdAt, updatedAt: createdAt }
}

const mappingStore: Record<string, ParameterMapping[]> = {
  "p-4": [
    makeMapping("p-4", "en", "English", "الإنجليزية", "2026-07-01T10:00:00Z"),
    makeMapping("p-4", "ar", "Arabic", "العربية", "2026-07-01T10:00:00Z"),
    makeMapping("p-4", "fr", "French", "الفرنسية", "2026-07-02T10:00:00Z"),
  ],
  "p-6": [
    makeMapping("p-6", "riyadh_01", "Riyadh — Main", "الرياض — الرئيسي", "2026-07-05T09:00:00Z"),
    makeMapping("p-6", "jeddah_02", "Jeddah — Corniche", "جدة — الكورنيش", "2026-07-05T09:00:00Z"),
    makeMapping("p-6", "dmm_03", "Dammam — Central", "الدمام — المركزي", "2026-07-06T09:00:00Z"),
    makeMapping("p-6", "MKH-04", "Makkah — Aziziyah", "مكة — العزيزية", "2026-07-06T09:00:00Z"),
  ],
  "p-7": [
    makeMapping("p-7", "wa", "WhatsApp", "واتساب", "2026-07-10T08:00:00Z"),
    makeMapping("p-7", "sms", "SMS", "رسالة نصية", "2026-07-10T08:00:00Z"),
    makeMapping("p-7", "web", "Web", "الويب", "2026-07-11T08:00:00Z"),
  ],
}

const unmappedStore: Record<string, { id: string; rawValue: string; firstSeenAt: string; lastSeenAt: string; occurrenceCount: number }[]> = {
  "p-4": [{ id: "u-1", rawValue: "de", firstSeenAt: "2026-08-22T10:00:00Z", lastSeenAt: "2026-08-24T08:00:00Z", occurrenceCount: 4 }],
  "p-6": [
    { id: "u-2", rawValue: "AUH-05", firstSeenAt: "2026-08-20T12:00:00Z", lastSeenAt: "2026-08-24T09:30:00Z", occurrenceCount: 12 },
    { id: "u-3", rawValue: "kwt_06", firstSeenAt: "2026-08-21T14:00:00Z", lastSeenAt: "2026-08-23T18:00:00Z", occurrenceCount: 5 },
  ],
  "p-7": [{ id: "u-4", rawValue: "ivr", firstSeenAt: "2026-08-19T09:00:00Z", lastSeenAt: "2026-08-24T07:00:00Z", occurrenceCount: 8 }],
}

function mappingCountFor(parameterId: string): number {
  return mappingStore[parameterId]?.length ?? 0
}

function mappingLabel(param: Parameter): string {
  return `${param.nameEn} — ${param.apiField} (${mappingCountFor(param.id)} values)`
}

// ---------------------------------------------------------------------------
// Seed: Request logs (16)
// ---------------------------------------------------------------------------

interface LoggedParam {
  apiField: string
  value: string | null
  registered: boolean
}

function makeLog(
  id: string,
  integrationId: string | null,
  integrationName: string | null,
  scenario: Scenario | null,
  timestamp: string,
  method: string,
  path: string,
  httpStatus: number,
  resultCode: string,
  latencyMs: number,
  credentialLabel: string | null,
  params: LoggedParam[],
  responseReturned: unknown,
  opts: { rejectedBeforeParameterParsing?: boolean; notice?: string | null; rejectionStage?: string | null } = {},
): RequestLog {
  const statusClass = httpStatus >= 500 ? "server_error" : httpStatus >= 400 ? "client_error" : "success"
  return {
    id,
    integrationId,
    integrationName,
    timestamp,
    method,
    path,
    scenario,
    httpStatus,
    resultCode,
    statusClass,
    latencyMs,
    credentialLabel,
    rejectionStage: opts.rejectionStage ?? null,
    parametersReceived: {
      rejectedBeforeParameterParsing: opts.rejectedBeforeParameterParsing ?? false,
      notice: opts.notice ?? null,
      items: params,
    },
    responseReturned,
  }
}

// ── Reference-style parameter sets + responses for the expanded log detail (BR-16: PII masked). ──
// Every logged request records the full inbound payload plus any unregistered keys (stored raw,
// reported here only) — the drawer mirrors the ratified prototype's two-column detail.
function dispatchParams(txId: string, custId: string, name: string, mobile: string, branch: string, tier: string): LoggedParam[] {
  return [
    { apiField: "transaction_id", value: txId, registered: true },
    { apiField: "customer_id", value: custId, registered: true },
    { apiField: "customer_name", value: name, registered: true },
    { apiField: "mobile", value: mobile, registered: true },
    { apiField: "service", value: "S002", registered: true },
    { apiField: "branch", value: branch, registered: true },
    { apiField: "vip", value: "false", registered: true },
    { apiField: "transaction_date", value: "2026-07-22T14:31:56Z", registered: true },
    { apiField: "loyalty_tier", value: `${tier} — unregistered key: stored raw, reported here only`, registered: false },
  ]
}
function ingestionParams(txId: string, mobile: string, rating: string, amount: string): LoggedParam[] {
  return [
    { apiField: "transaction_id", value: txId, registered: true },
    { apiField: "mobile", value: mobile, registered: true },
    { apiField: "rating", value: rating, registered: true },
    { apiField: "channel", value: "IVR", registered: true },
    { apiField: "transaction_amount", value: amount, registered: true },
    { apiField: "transaction_date", value: "2026-08-23T14:05:12Z", registered: true },
  ]
}
function redirectParams(custId: string, name: string, email: string): LoggedParam[] {
  return [
    { apiField: "customer_id", value: custId, registered: true },
    { apiField: "customer_name", value: name, registered: true },
    { apiField: "email", value: email, registered: true },
    { apiField: "campaign", value: "post_txn_2026q3", registered: true },
    { apiField: "language", value: "ar", registered: true },
  ]
}
function jsonParams(lang: string): LoggedParam[] {
  return [
    { apiField: "app_version", value: "3.4.1", registered: true },
    { apiField: "platform", value: "ios", registered: true },
    { apiField: "language", value: lang, registered: true },
  ]
}
const dispatchAccepted = (reqId: string) => ({ http: "202 Accepted", code: "ACCEPTED", request_id: reqId, message: "Survey request accepted for channel distribution (M-02)." })
const ingestionAccepted = (reqId: string) => ({ http: "202 Accepted", code: "ACCEPTED", request_id: reqId, message: "Response accepted for validation and storage (M-03)." })
const redirectOk = (reqId: string, url: string) => ({ http: "200 OK", code: "OK", request_id: reqId, redirect_url: url, message: "Personalised survey link issued." })
const jsonOk = (reqId: string, version: number) => ({ http: "200 OK", code: "OK", request_id: reqId, definition_version: version, message: "Survey definition returned." })
const errorResp = (httpStatus: string, code: string, reqId: string, message: string) => ({ http: httpStatus, code, request_id: reqId, message })

const requestLogStore: RequestLog[] = [
  makeLog("log-1", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-08-24T11:55:00Z", "POST", "/v1/survey-requests/whatsapp", 202, "ACCEPTED", 84, "Production Key",
    dispatchParams("TX-2026-771204", "C-991204", "A••••• M•-R•••••", "+9665••••312", "B01", "GOLD"),
    dispatchAccepted("req_9f31ab77")),
  makeLog("log-2", "int-2", "Web Redirect Links", "redirect_link", "2026-08-24T11:40:00Z", "GET", "/v1/survey-links/web-widget", 200, "OK", 41, "web-portal",
    redirectParams("C-884120", "S••• K•••", "s•••@•••.com"),
    redirectOk("req_2c7de1", "https://survey.example.com/s/9f3c2")),
  makeLog("log-3", "int-3", "Mobile Survey Definitions", "json_render", "2026-08-24T11:20:00Z", "GET", "/v1/survey-definitions/mobile-app", 401, "E-1401", 12, "mobile-sdk",
    [], errorResp("401 Unauthorized", "E-1401", "req_a1f004", "Credential suspended — regenerate the API key to resume."),
    { rejectedBeforeParameterParsing: true, notice: "— request rejected before parameter parsing (credential suspended)", rejectionStage: "authentication" }),
  makeLog("log-4", "int-5", "IVR Response Ingestion", "response_ingestion", "2026-08-24T09:30:00Z", "POST", "/v1/responses/ivr", 202, "ACCEPTED", 132, "Ingestion Key",
    ingestionParams("TX-2026-770991", "+9665••••7788", "4", "1,250.00"),
    ingestionAccepted("req_7b21c9")),
  makeLog("log-5", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-08-24T06:15:00Z", "POST", "/v1/survey-requests/whatsapp", 500, "E-1500", 5031, "Production Key",
    dispatchParams("TX-2026-770880", "C-990880", "N••• H•••", "+9665••••4501", "B04", "SILVER"),
    errorResp("500 Internal Server Error", "E-1500", "req_5f0a12", "Downstream dispatch provider timeout — the request will not be retried automatically."),
    { rejectionStage: "dispatch" }),
  makeLog("log-6", "int-3", "Mobile Survey Definitions", "json_render", "2026-08-24T02:00:00Z", "GET", "/v1/survey-definitions/mobile-app", 200, "OK", 28, "mobile-sdk",
    jsonParams("en"),
    jsonOk("req_0d94aa", 12)),
  makeLog("log-7", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-08-23T20:45:00Z", "POST", "/v1/survey-requests/whatsapp", 202, "ACCEPTED", 76, "Production Key",
    dispatchParams("TX-2026-770712", "C-990712", "R••• A•••", "+9665••••2290", "B01", "GOLD"),
    dispatchAccepted("req_88ce30")),
  makeLog("log-8", "int-5", "IVR Response Ingestion", "response_ingestion", "2026-08-23T14:10:00Z", "POST", "/v1/responses/ivr", 422, "E-1102", 44, "Ingestion Key",
    [...ingestionParams("TX-2026-770655", "+9665••••0090", "9", "480.00"), { apiField: "unknown_field", value: "x", registered: false }],
    errorResp("422 Unprocessable Entity", "E-1102", "req_31aa08", "Rating out of range (expected 1–5, received 9)."),
    { rejectionStage: "validation" }),
  makeLog("log-9", "int-2", "Web Redirect Links", "redirect_link", "2026-08-22T10:00:00Z", "GET", "/v1/survey-links/web-widget", 200, "OK", 39, "web-portal",
    redirectParams("C-882201", "M••• T•••", "m•••@•••.com"),
    redirectOk("req_45bd77", "https://survey.example.com/s/1a7b9")),
  makeLog("log-10", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-08-21T16:30:00Z", "POST", "/v1/survey-requests/whatsapp", 202, "ACCEPTED", 91, "Production Key",
    dispatchParams("TX-2026-770540", "C-990540", "F••• Q•••", "+9665••••8812", "B02", "GOLD"),
    dispatchAccepted("req_a9f2b1")),
  makeLog("log-11", "int-4", "Embedded Survey Frame", "iframe_embed", "2026-08-20T08:00:00Z", "GET", "/v1/survey-embed/web-widget", 400, "E-1001", 9, null,
    [], errorResp("400 Bad Request", "E-1001", "req_02ce41", "Missing or invalid credential — present a valid X-Api-Key header."),
    { rejectedBeforeParameterParsing: true, notice: "— request rejected before parameter parsing (no credential presented)", rejectionStage: "authentication" }),
  makeLog("log-12", "int-2", "Web Redirect Links", "redirect_link", "2026-08-18T12:00:00Z", "GET", "/v1/survey-links/web-widget", 200, "OK", 47, "web-portal",
    redirectParams("C-880012", "L••• B•••", "l•••@•••.sa"),
    redirectOk("req_c3e880", "https://survey.example.com/s/44c0d")),
  makeLog("log-13", "int-5", "IVR Response Ingestion", "response_ingestion", "2026-08-14T09:00:00Z", "POST", "/v1/responses/ivr", 503, "E-1503", 3010, "Ingestion Key",
    ingestionParams("TX-2026-769880", "+9665••••1199", "3", "95.00"),
    errorResp("503 Service Unavailable", "E-1503", "req_7710da", "Ingestion buffer unavailable — retry after a short delay."),
    { rejectionStage: "ingestion" }),
  makeLog("log-14", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-08-10T13:00:00Z", "POST", "/v1/survey-requests/whatsapp", 202, "ACCEPTED", 88, "Production Key",
    dispatchParams("TX-2026-768110", "C-988110", "H••• Z•••", "+9665••••3377", "B03", "PLATINUM"),
    dispatchAccepted("req_dd01f5")),
  makeLog("log-15", "int-2", "Web Redirect Links", "redirect_link", "2026-08-05T11:00:00Z", "GET", "/v1/survey-links/web-widget", 200, "OK", 52, "web-portal",
    redirectParams("C-875500", "Y••• N•••", "h•••@•••.sa"),
    redirectOk("req_e5a220", "https://survey.example.com/s/7db31")),
  makeLog("log-16", "int-1", "WhatsApp Survey Dispatch", "dispatch", "2026-07-28T15:00:00Z", "POST", "/v1/survey-requests/whatsapp", 429, "E-1301", 6, "Production Key",
    [], errorResp("429 Too Many Requests", "E-1301", "req_9a0c73", "Rate limit exceeded — reduce request frequency and retry."),
    { rejectedBeforeParameterParsing: true, notice: "— request rejected before parameter parsing (rate limited)", rejectionStage: "rate_limit" }),
]

// ===========================================================================
// Service channels (SCR-03/04)
// ===========================================================================

export async function listServiceChannels(
  params: ListServiceChannelsParams = {},
): Promise<Page<ServiceChannel>> {
  let rows = channelStore
  if (params.active !== undefined) rows = rows.filter((c) => c.active === params.active)
  const { items, nextCursor } = paginate(rows, params.limit)
  return { items: clone(items), nextCursor }
}

export async function getServiceChannel(id: string): Promise<ServiceChannel> {
  const found = channelStore.find((c) => c.id === id)
  if (!found) throw notFound("channel.not_found", `Service channel ${id} was not found.`)
  return clone(found)
}

export async function createServiceChannel(
  input: ServiceChannelSaveInput,
): Promise<ServiceChannel> {
  const byId = parameterById()
  const contract = input.contract.map((row) => {
    const param = byId.get(row.parameterId)
    return {
      parameterId: row.parameterId,
      apiField: param?.apiField ?? row.parameterId,
      nameEn: param?.nameEn ?? row.parameterId,
      nameAr: param?.nameAr ?? row.parameterId,
      supported: row.supported,
      required: row.supported && row.required,
    }
  })
  const supported = contract.filter((c) => c.supported)
  const channel: ServiceChannel = {
    id: nextId("sc"),
    nameEn: input.nameEn,
    nameAr: input.nameAr,
    channelId: input.channelId,
    description: input.description?.trim() ? input.description : null,
    active: input.active,
    channelIdLocked: false,
    supportedCount: supported.length,
    requiredCount: supported.filter((c) => c.required).length,
    integrationsCount: 0,
    contract,
  }
  channelStore.push(channel)
  return clone(channel)
}

export async function updateServiceChannel(
  id: string,
  input: ServiceChannelSaveInput,
): Promise<ServiceChannel> {
  const existing = channelStore.find((c) => c.id === id)
  if (!existing) throw notFound("channel.not_found", `Service channel ${id} was not found.`)
  const byId = parameterById()
  const contract = input.contract.map((row) => {
    const param = byId.get(row.parameterId)
    return {
      parameterId: row.parameterId,
      apiField: param?.apiField ?? row.parameterId,
      nameEn: param?.nameEn ?? row.parameterId,
      nameAr: param?.nameAr ?? row.parameterId,
      supported: row.supported,
      required: row.supported && row.required,
    }
  })
  const supported = contract.filter((c) => c.supported)
  existing.nameEn = input.nameEn
  existing.nameAr = input.nameAr
  // channelId is immutable once locked (BR-05); otherwise accept the edit.
  if (!existing.channelIdLocked) existing.channelId = input.channelId
  existing.description = input.description?.trim() ? input.description : null
  existing.active = input.active
  existing.contract = contract
  existing.supportedCount = supported.length
  existing.requiredCount = supported.filter((c) => c.required).length
  return clone(existing)
}

// ===========================================================================
// Parameters (SCR-05/06)
// ===========================================================================

function parameterCounts() {
  return {
    all: parameterStore.length,
    builtIn: parameterStore.filter((p) => p.origin === "built_in").length,
    custom: parameterStore.filter((p) => p.origin === "custom").length,
  }
}

export async function listParameters(
  params: ListParametersParams = {},
): Promise<ParameterListResult> {
  let rows = parameterStore
  if (params.origin) rows = rows.filter((p) => p.origin === params.origin)
  if (params.type) rows = rows.filter((p) => p.dataType === params.type)
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((p) => `${p.nameEn} ${p.nameAr} ${p.apiField}`.toLowerCase().includes(q))
  }
  const { items, nextCursor } = paginate(rows, params.limit)
  // Counts stay GLOBAL — never narrowed by the filters above (AC-S5-01).
  return { items: clone(items), nextCursor, counts: parameterCounts() }
}

export async function getParameter(id: string): Promise<Parameter> {
  const found = parameterStore.find((p) => p.id === id)
  if (!found) throw notFound("parameter.not_found", `Parameter ${id} was not found.`)
  return clone(found)
}

export async function createParameter(input: ParameterSaveInput): Promise<Parameter> {
  const changeable = input.dataType === "text" || input.dataType === "boolean" || input.dataType === "url"
  const param: Parameter = {
    id: nextId("p"),
    nameEn: input.nameEn,
    nameAr: input.nameAr,
    apiField: input.apiField,
    apiFieldLocked: false,
    dataType: input.dataType,
    dataTypeLocked: false,
    rangeMin: input.rangeMin ?? null,
    rangeMax: input.rangeMax ?? null,
    rangeUnit: input.rangeUnit ?? null,
    validationRule: input.validationRule?.trim() ? input.validationRule : null,
    origin: "custom",
    enabled: input.enabled ?? true,
    requiredByDefault: input.requiredByDefault,
    filterable: input.filterable,
    reportingVisibility: input.reportingVisibility,
    dashboardVisibility: input.dashboardVisibility,
    mappingSupport: input.dataType === "list" ? true : changeable ? input.mappingSupport : false,
    mappingSupportChangeable: changeable,
    mappingsCount: 0,
    channelIds: input.channelIds ?? [],
  }
  parameterStore.push(param)
  return clone(param)
}

export async function updateParameter(
  id: string,
  input: Partial<ParameterSaveInput>,
): Promise<ParameterPatchResult> {
  const existing = parameterStore.find((p) => p.id === id)
  if (!existing) throw notFound("parameter.not_found", `Parameter ${id} was not found.`)
  if (input.nameEn !== undefined) existing.nameEn = input.nameEn
  if (input.nameAr !== undefined) existing.nameAr = input.nameAr
  if (input.apiField !== undefined && !existing.apiFieldLocked) existing.apiField = input.apiField
  if (input.dataType !== undefined && !existing.dataTypeLocked) existing.dataType = input.dataType
  if (input.enabled !== undefined) existing.enabled = input.enabled
  if (input.rangeMin !== undefined) existing.rangeMin = input.rangeMin
  if (input.rangeMax !== undefined) existing.rangeMax = input.rangeMax
  if (input.rangeUnit !== undefined) existing.rangeUnit = input.rangeUnit
  if (input.validationRule !== undefined) existing.validationRule = input.validationRule
  if (input.requiredByDefault !== undefined) existing.requiredByDefault = input.requiredByDefault
  if (input.filterable !== undefined) existing.filterable = input.filterable
  if (input.reportingVisibility !== undefined) existing.reportingVisibility = input.reportingVisibility
  if (input.dashboardVisibility !== undefined) existing.dashboardVisibility = input.dashboardVisibility
  if (input.mappingSupport !== undefined && existing.mappingSupportChangeable) existing.mappingSupport = input.mappingSupport
  if (input.channelIds !== undefined) existing.channelIds = input.channelIds
  return { parameter: clone(existing), requiresConfirmation: false, references: [] }
}

export async function setParameterEnabled(
  id: string,
  enabled: boolean,
  confirmDisable = false,
): Promise<ParameterPatchResult> {
  const existing = parameterStore.find((p) => p.id === id)
  if (!existing) throw notFound("parameter.not_found", `Parameter ${id} was not found.`)
  const references = REFERENCES[id] ?? []
  // BR-10 two-step disable: a referenced parameter comes back unchanged with the reference list.
  if (!enabled && !confirmDisable && references.length > 0) {
    return { parameter: clone(existing), requiresConfirmation: true, references: clone(references) }
  }
  existing.enabled = enabled
  return { parameter: clone(existing), requiresConfirmation: false, references: [] }
}

// ===========================================================================
// Integrations + credentials (SCR-01/02)
// ===========================================================================

export async function listIntegrations(
  params: ListIntegrationsParams = {},
): Promise<IntegrationListResult> {
  let rows = integrationStore
  if (params.q) {
    const q = params.q.toLowerCase()
    rows = rows.filter((i) => i.name.toLowerCase().includes(q))
  }
  if (params.channel) {
    const byId = channelById()
    rows = rows.filter((i) => byId.get(i.serviceChannelId)?.channelId === params.channel)
  }
  const { items, nextCursor } = paginate(rows, params.limit)

  // Tiles are GLOBAL — computed over every integration, never the filtered subset.
  const totalIntegrations = integrationStore.length
  const activeIntegrations = integrationStore.filter((i) => i.active).length
  const requests24h = integrationStore.reduce((sum, i) => sum + i.traffic.requests24h, 0)
  const failedRequests24h = integrationStore.reduce((sum, i) => sum + i.traffic.failedRequests24h, 0)
  const errorRate = requests24h > 0 ? failedRequests24h / requests24h : null
  const tileBand = errorRate == null ? "none" : errorRate < 0.01 ? "d2" : errorRate <= 0.05 ? "d3" : "d4"

  return {
    items: items.map(buildIntegrationListItem),
    nextCursor,
    tiles: {
      totalIntegrations,
      activeIntegrations,
      integrationsDisplay: `${totalIntegrations} / ${activeIntegrations} active`,
      integrationsSubText: "Across all service channels",
      requests24h,
      requests24hDisplay: requests24h.toLocaleString("en-US"),
      requests24hSubText: "Rolling 24-hour window",
      failedRequests24h,
      errorRate,
      errorRateDisplay: errorRateDisplay(errorRate),
      errorRateSubText: `${failedRequests24h.toLocaleString("en-US")} failed of ${requests24h.toLocaleString("en-US")} requests`,
      errorRateBand: tileBand,
    },
  }
}

export async function getIntegration(id: string): Promise<Integration> {
  const found = integrationStore.find((i) => i.id === id)
  if (!found) throw notFound("integration.not_found", `Integration ${id} was not found.`)
  return clone(buildIntegrationDetail(found))
}

export async function createIntegration(
  input: IntegrationCreateInput,
): Promise<IntegrationCreated> {
  const timestamp = new Date().toISOString()
  const stored: StoredIntegration = {
    id: nextId("int"),
    name: input.name,
    description: input.description?.trim() ? input.description : null,
    serviceChannelId: input.serviceChannelId,
    scenario: input.scenario,
    active: true,
    allowedOrigins: input.allowedOrigins ?? [],
    linkExpiryOverrideHours: input.linkExpiryOverrideHours ?? null,
    credential: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    traffic: { requests24h: 0, failedRequests24h: 0, lastActivityAt: null },
  }
  const generated = buildGeneratedCredential(stored, input.credential)
  stored.credential = generated.credential
  integrationStore.push(stored)
  const channel = channelById().get(stored.serviceChannelId)
  if (channel) channel.integrationsCount += 1
  return { integration: clone(buildIntegrationDetail(stored)), credential: clone(generated) }
}

export async function updateIntegration(
  id: string,
  input: IntegrationUpdateInput,
): Promise<Integration> {
  const existing = integrationStore.find((i) => i.id === id)
  if (!existing) throw notFound("integration.not_found", `Integration ${id} was not found.`)
  existing.name = input.name
  existing.description = input.description?.trim() ? input.description : null
  existing.serviceChannelId = input.serviceChannelId
  // `scenario` is immutable (BR-02) — the input carries the unchanged value; keep the stored one.
  existing.allowedOrigins = input.allowedOrigins ?? []
  existing.linkExpiryOverrideHours = input.linkExpiryOverrideHours ?? null
  existing.updatedAt = new Date().toISOString()
  return clone(buildIntegrationDetail(existing))
}

export async function setIntegrationActive(id: string, active: boolean): Promise<Integration> {
  const existing = integrationStore.find((i) => i.id === id)
  if (!existing) throw notFound("integration.not_found", `Integration ${id} was not found.`)
  existing.active = active
  existing.updatedAt = new Date().toISOString()
  return clone(buildIntegrationDetail(existing))
}

export async function generateCredential(
  integrationId: string,
  input: CredentialInput,
): Promise<GeneratedCredential> {
  const existing = integrationStore.find((i) => i.id === integrationId)
  if (!existing) throw notFound("integration.not_found", `Integration ${integrationId} was not found.`)
  // Generating implicitly revokes the current active credential (BR-16).
  if (existing.credential && existing.credential.status === "active") {
    existing.credential.status = "revoked"
    existing.credential.revokedAt = new Date().toISOString()
  }
  const generated = buildGeneratedCredential(existing, input)
  existing.credential = generated.credential
  existing.updatedAt = new Date().toISOString()
  return clone(generated)
}

export async function revokeCredential(integrationId: string): Promise<void> {
  const existing = integrationStore.find((i) => i.id === integrationId)
  if (!existing) throw notFound("integration.not_found", `Integration ${integrationId} was not found.`)
  if (existing.credential) {
    existing.credential.status = "revoked"
    existing.credential.revokedAt = new Date().toISOString()
    existing.updatedAt = new Date().toISOString()
  }
}

// ===========================================================================
// Parameter mappings (SCR-07)
// ===========================================================================

export async function listMappings(
  parameterId: string,
  params: PageParams = {},
): Promise<ParameterMappingListResult> {
  const param = parameterStore.find((p) => p.id === parameterId)
  if (!param) throw notFound("parameter.not_found", `Parameter ${parameterId} was not found.`)
  const rows = mappingStore[parameterId] ?? []
  const { items, nextCursor } = paginate(rows, params.limit)
  return {
    parameter: {
      id: param.id,
      nameEn: param.nameEn,
      nameAr: param.nameAr,
      apiField: param.apiField,
      mappingCount: rows.length,
      label: mappingLabel(param),
    },
    items: clone(items),
    nextCursor,
    totalCount: rows.length,
  }
}

export async function listUnmappedValues(parameterId: string): Promise<UnmappedValueQueue> {
  const rows = unmappedStore[parameterId] ?? []
  const windowStart = new Date(NOW.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  return {
    items: rows.map((r) => ({
      id: r.id,
      parameterId,
      rawValue: r.rawValue,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
      occurrenceCount: r.occurrenceCount,
    })),
    windowDays: 7,
    windowStart,
  }
}

export async function createMapping(
  parameterId: string,
  input: ParameterMappingSaveInput,
): Promise<ParameterMapping> {
  const param = parameterStore.find((p) => p.id === parameterId)
  if (!param) throw notFound("parameter.not_found", `Parameter ${parameterId} was not found.`)
  const mapping = makeMapping(parameterId, input.sourceValue, input.displayEn, input.displayAr, new Date().toISOString())
  const list = (mappingStore[parameterId] ??= [])
  list.push(mapping)
  param.mappingsCount = list.length
  // Creating a mapping drains any matching unmapped-queue entry (case-insensitive).
  const queue = unmappedStore[parameterId]
  if (queue) {
    unmappedStore[parameterId] = queue.filter((u) => u.rawValue.toLowerCase() !== input.sourceValue.toLowerCase())
  }
  return clone(mapping)
}

export async function updateMapping(
  parameterId: string,
  mappingId: string,
  input: ParameterMappingSaveInput,
): Promise<ParameterMapping> {
  const list = mappingStore[parameterId] ?? []
  const existing = list.find((m) => m.id === mappingId)
  if (!existing) throw notFound("mapping.not_found", `Mapping ${mappingId} was not found.`)
  existing.sourceValue = input.sourceValue
  existing.displayEn = input.displayEn
  existing.displayAr = input.displayAr
  existing.updatedAt = new Date().toISOString()
  return clone(existing)
}

export async function deleteMapping(parameterId: string, mappingId: string): Promise<void> {
  const list = mappingStore[parameterId] ?? []
  mappingStore[parameterId] = list.filter((m) => m.id !== mappingId)
  const param = parameterStore.find((p) => p.id === parameterId)
  if (param) param.mappingsCount = mappingStore[parameterId].length
}

export async function exportMappings(
  parameterId: string,
): Promise<{ blob: Blob; filename: string }> {
  const rows = mappingStore[parameterId] ?? []
  const header = "source_value,display_en,display_ar"
  const body = rows.map((r) => `${r.sourceValue},${r.displayEn},${r.displayAr}`).join("\n")
  const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" })
  return { blob, filename: `mappings-${parameterId}.csv` }
}

/**
 * Mock import. Overall SUCCESS by default: appends two demo rows and reports the counts. To exercise
 * the wired error path (Dialog D-4's row-level report), upload a file whose name contains "reject"
 * — that throws `MappingImportError` carrying a couple of row errors, exactly as the real endpoint
 * would on a validation failure (VR-F09, all-or-nothing: zero rows applied).
 */
function runImport(parameterId: string, file: File, mode: MappingImportMode): MappingImportResult {
  const param = parameterStore.find((p) => p.id === parameterId)
  if (!param) throw notFound("parameter.not_found", `Parameter ${parameterId} was not found.`)

  if (file.name.toLowerCase().includes("reject")) {
    throw new MappingImportError(422, "validation.import_invalid", "The workbook has validation errors — no rows were applied.", [
      { row: 3, column: "display_ar", reason: "Arabic display value is required." },
      { row: 7, column: "source_value", reason: "Duplicate source value 'en' (case-insensitive)." },
    ])
  }

  const list = (mappingStore[parameterId] ??= [])
  if (mode === "replace_all") {
    const removed = list.length
    const replacement = [
      makeMapping(parameterId, "imp_a", "Imported A", "مستورد أ", new Date().toISOString()),
      makeMapping(parameterId, "imp_b", "Imported B", "مستورد ب", new Date().toISOString()),
      makeMapping(parameterId, "imp_c", "Imported C", "مستورد ج", new Date().toISOString()),
    ]
    mappingStore[parameterId] = replacement
    param.mappingsCount = replacement.length
    return { mode: "replace_all", rowsAdded: replacement.length, rowsUpdated: 0, rowsRemoved: removed, totalCount: replacement.length }
  }

  list.push(makeMapping(parameterId, "imp_new_1", "Imported New 1", "مستورد جديد ١", new Date().toISOString()))
  list.push(makeMapping(parameterId, "imp_new_2", "Imported New 2", "مستورد جديد ٢", new Date().toISOString()))
  param.mappingsCount = list.length
  return { mode: "merge", rowsAdded: 2, rowsUpdated: 1, rowsRemoved: 0, totalCount: list.length }
}

export async function importMappings(
  parameterId: string,
  file: File,
  mode: MappingImportMode,
): Promise<MappingImportResult> {
  return runImport(parameterId, file, mode)
}

export async function replaceAllMappings(
  parameterId: string,
  file: File,
): Promise<MappingImportResult> {
  return runImport(parameterId, file, "replace_all")
}

// ===========================================================================
// Request logs (SCR-08)
// ===========================================================================

const WINDOW_MS: Record<LogWindow, number> = {
  last_hour: 3600 * 1000,
  "24h": 24 * 3600 * 1000,
  "7d": 7 * 24 * 3600 * 1000,
  "30d": 30 * 24 * 3600 * 1000,
}

export async function listRequestLogs(
  params: ListRequestLogsParams = {},
): Promise<RequestLogListResult> {
  const window: LogWindow = params.window ?? "24h"
  const windowStart = new Date(NOW.getTime() - WINDOW_MS[window])
  const windowEnd = NOW

  // Window + integration filter first (drives the per-chip counts), then the status-class chip.
  const windowed = requestLogStore.filter((log) => {
    const ts = new Date(log.timestamp)
    if (ts < windowStart || ts > windowEnd) return false
    if (params.integrationId && log.integrationId !== params.integrationId) return false
    return true
  })

  const counts = {
    all: windowed.length,
    success: windowed.filter((l) => l.statusClass === "success").length,
    clientError: windowed.filter((l) => l.statusClass === "client_error").length,
    serverError: windowed.filter((l) => l.statusClass === "server_error").length,
  }

  const statusClass = params.statusClass ?? "all"
  const filtered =
    statusClass === "all" ? windowed : windowed.filter((l) => l.statusClass === statusClass)
  // Newest first.
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  const { items, nextCursor } = paginate(filtered, params.limit)

  return {
    items: clone(items),
    nextCursor,
    counts,
    appliedFilter: {
      statusClass,
      integrationId: params.integrationId ?? null,
      window,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    },
  }
}

export async function getRequestLog(id: string): Promise<RequestLog> {
  const found = requestLogStore.find((l) => l.id === id)
  if (!found) throw notFound("request_log.not_found", `Request log ${id} was not found.`)
  return clone(found)
}

export async function exportRequestLogs(
  params: ListRequestLogsParams = {},
): Promise<{ blob: Blob; filename: string }> {
  const { items } = await listRequestLogs({ ...params, limit: undefined })
  const header = "timestamp,integration,method,path,http_status,result_code,latency_ms"
  const body = items
    .map((l) => `${l.timestamp},${l.integrationName ?? ""},${l.method},${l.path},${l.httpStatus},${l.resultCode},${l.latencyMs}`)
    .join("\n")
  const blob = new Blob([`${header}\n${body}\n`], { type: "text/csv;charset=utf-8" })
  return { blob, filename: "request-logs.csv" }
}
