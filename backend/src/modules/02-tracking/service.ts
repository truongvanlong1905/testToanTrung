import type { UserSession } from "@/src/core/auth/auth";
import { AppError } from "@/src/core/http";
import {
  EXTERNAL_CONNECTOR_SPECS,
  type ExternalConnectorService,
  getExternalConnectorStatus,
  resolveAllowedTrackingOrigin,
  TrackingEventSchema,
} from "./contracts";
import {
  assertCanTriggerSync,
  assertCanViewTracking,
  canViewTrackingLeadPhone,
} from "./policy";
import {
  countTrackingEvents,
  createSyncJobRecord,
  createTrackingEventRecord,
  findTrackingEventByEventKey,
  listSyncJobRecords,
  queryTrackingOverviewData,
} from "./repository";

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const REQUEST_LIMIT = 60;
const WINDOW_MS = 60_000;

export function consumeTrackingRateLimit(ip: string): {
  allowed: boolean;
  retryAfter: number;
} {
  const now = Date.now();
  requestCounts.forEach((record, key) => {
    if (now >= record.resetAt) requestCounts.delete(key);
  });
  if (requestCounts.size >= 10_000 && !requestCounts.has(ip)) {
    return { allowed: false, retryAfter: 60 };
  }
  const record = requestCounts.get(ip);
  if (!record || now >= record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (record.count >= REQUEST_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  record.count += 1;
  return { allowed: true, retryAfter: 0 };
}

export function validateTrackingOriginOrThrow(originHeader: string | null): string {
  const origin = resolveAllowedTrackingOrigin(originHeader);
  if (!origin) {
    throw new AppError(
      403,
      "Website chưa được phép gửi tracking.",
      "ORIGIN_NOT_ALLOWED"
    );
  }
  return origin;
}

export async function getTrackingOverview(user: UserSession) {
  assertCanViewTracking(user);
  const fullAccess = canViewTrackingLeadPhone(user);
  const { events, syncJobs, siteStats, totalEvents } =
    await queryTrackingOverviewData(fullAccess);

  return {
    events,
    syncJobs,
    siteStats: Object.fromEntries(
      siteStats.map((site) => [site.websiteSource, site._count._all])
    ),
    totalEvents,
  };
}

export async function recordTrackingEvent(input: {
  originHeader: string | null;
  ip: string;
  forwardedIp: string | null;
  body: unknown;
}) {
  const origin = validateTrackingOriginOrThrow(input.originHeader);

  const limit = consumeTrackingRateLimit(input.ip);
  if (!limit.allowed) {
    return {
      rateLimited: true as const,
      origin,
      retryAfter: limit.retryAfter,
    };
  }

  const validation = TrackingEventSchema.safeParse(input.body);
  if (!validation.success) {
    throw new AppError(
      400,
      validation.error.issues[0]?.message || "Dữ liệu tracking không hợp lệ",
      "VALIDATION_ERROR"
    );
  }

  const {
    eventKey,
    websiteSource,
    source,
    medium,
    campaign,
    landingPage,
    device,
    location,
    contactChannel,
    utmParams,
    leadId,
  } = validation.data;

  // Idempotency check by eventKey (AC-17)
  if (eventKey) {
    const existing = await findTrackingEventByEventKey(eventKey);
    if (existing) {
      return {
        rateLimited: false as const,
        idempotentDuplicate: true as const,
        origin,
        event: existing,
      };
    }
  }

  const event = await createTrackingEventRecord({
    eventKey: eventKey || null,
    websiteSource: websiteSource || "Chưa có thông tin",
    source: source || "Chưa có thông tin",
    medium: medium || "Chưa có thông tin",
    campaign: campaign || null,
    landingPage: landingPage || "Chưa có thông tin",
    device: device || "Chưa có thông tin",
    location: location || null,
    contactChannel: contactChannel || null,
    utmParams:
      typeof utmParams === "string" ? utmParams : JSON.stringify(utmParams || {}),
    leadId: leadId || null,
    ipAddress: input.forwardedIp || null,
  });

  return {
    rateLimited: false as const,
    idempotentDuplicate: false as const,
    origin,
    event,
  };
}

export async function getSyncOverview(user: UserSession) {
  assertCanViewTracking(user);
  const syncJobs = await listSyncJobRecords();
  const connectors = (
    Object.keys(EXTERNAL_CONNECTOR_SPECS) as ExternalConnectorService[]
  ).map((service) => getExternalConnectorStatus(service));

  return {
    connectors,
    syncJobs,
  };
}

export async function executeSyncAction(
  user: UserSession,
  body: { service?: unknown; action?: string }
) {
  assertCanTriggerSync(user);

  const validServices = Object.keys(
    EXTERNAL_CONNECTOR_SPECS
  ) as ExternalConnectorService[];
  const service = body?.service as ExternalConnectorService;

  if (!validServices.includes(service)) {
    throw new AppError(400, "Dịch vụ đồng bộ không hợp lệ", "VALIDATION_ERROR");
  }

  const connectorStatus = getExternalConnectorStatus(service);
  const status = connectorStatus.isConfigured ? "ERROR" : "NOT_CONFIGURED";
  const errorMessage = !connectorStatus.isConfigured
    ? `Dịch vụ ${connectorStatus.label} chưa được cấu hình thông tin xác thực trên máy chủ.`
    : "Thông tin kết nối đã có nhưng trình đồng bộ trực tiếp đang tạm ngưng.";

  const job = await createSyncJobRecord({
    service,
    status,
    errorMessage,
  });

  return {
    httpStatus: !connectorStatus.isConfigured ? 400 : 501,
    status,
    errorMessage,
    job,
  };
}

export async function getTrackingDashboardSnapshot(createdAtFilter?: {
  gte?: Date;
  lte?: Date;
}): Promise<{ trackingEventsCount: number }> {
  const trackingEventsCount = await countTrackingEvents(createdAtFilter);
  return { trackingEventsCount };
}
