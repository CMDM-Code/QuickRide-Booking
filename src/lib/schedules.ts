import type { Timestamp } from "firebase/firestore";

export type ScheduleScope =
  | { kind: "all" }
  | { kind: "carType"; carTypeIds: string[] }
  | { kind: "carModel"; carModelIds: string[] };

export type ScheduleAdjustment =
  | { kind: "flat"; amount: number }
  | { kind: "percent"; percent: number }; // +10 or -15

export type PricingSchedule = {
  id: string;
  name: string;
  enabled: boolean;
  scope: ScheduleScope;
  locationIds?: string[]; // any match
  levelIds?: string[]; // any match
  startAt?: Date | null;
  endAt?: Date | null;
  priority: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
  adjustment: ScheduleAdjustment;
};

function tsToDate(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?._seconds === "number") return new Date(v._seconds * 1000);
  return null;
}

export function normalizeSchedule(doc: { id: string; [k: string]: any }): PricingSchedule {
  let scope = doc.scope ?? { kind: "all" };
  
  // Migration/Compat: if old single ID fields exist, convert to arrays
  if (scope.kind === "carType" && scope.carTypeId && !scope.carTypeIds) {
    scope.carTypeIds = [scope.carTypeId];
  }
  if (scope.kind === "carModel" && scope.carModelId && !scope.carModelIds) {
    scope.carModelIds = [scope.carModelId];
  }

  return {
    id: doc.id,
    name: String(doc.name ?? "Schedule"),
    enabled: Boolean(doc.enabled ?? true),
    scope: scope,
    locationIds: Array.isArray(doc.locationIds) ? doc.locationIds : undefined,
    levelIds: Array.isArray(doc.levelIds) ? doc.levelIds : undefined,
    startAt: tsToDate(doc.startAt),
    endAt: tsToDate(doc.endAt),
    priority: typeof doc.priority === "number" ? doc.priority : 0,
    createdAt: tsToDate(doc.created_at ?? doc.createdAt),
    updatedAt: tsToDate(doc.updated_at ?? doc.updatedAt),
    adjustment: doc.adjustment ?? { kind: "flat", amount: 0 }
  };
}

export function isScheduleActive(s: PricingSchedule, now: Date) {
  if (!s.enabled) return false;
  if (s.startAt && now < s.startAt) return false;
  if (s.endAt && now > s.endAt) return false;
  return true;
}

function scopeMatches(s: PricingSchedule, ctx: { carTypeId: string; carModelId?: string }) {
  if (s.scope.kind === "all") return true;
  if (s.scope.kind === "carType") return s.scope.carTypeIds.includes(ctx.carTypeId);
  if (s.scope.kind === "carModel") return Boolean(ctx.carModelId) && s.scope.carModelIds.includes(ctx.carModelId!);
  return false;
}

function locationMatches(s: PricingSchedule, locationIds: string[]) {
  if (!s.locationIds || s.locationIds.length === 0) return true;
  const set = new Set(locationIds);
  return s.locationIds.some((id) => set.has(id));
}

function levelMatches(s: PricingSchedule, levelIds: string[]) {
  if (!s.levelIds || s.levelIds.length === 0) return true;
  const set = new Set(levelIds);
  return s.levelIds.some((id) => set.has(id));
}

export function pickActiveSchedule(
  schedules: PricingSchedule[],
  ctx: { carTypeId: string; carModelId?: string; locationIds: string[]; levelIds?: string[]; now: Date }
) {
  const candidates = schedules
    .filter((s) => isScheduleActive(s, ctx.now))
    .filter((s) => scopeMatches(s, { carTypeId: ctx.carTypeId, carModelId: ctx.carModelId }))
    .filter((s) => locationMatches(s, ctx.locationIds))
    .filter((s) => levelMatches(s, ctx.levelIds ?? []));

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    const at = a.createdAt?.getTime() ?? 0;
    const bt = b.createdAt?.getTime() ?? 0;
    return bt - at;
  });

  return candidates[0] ?? null;
}

export function applyScheduleAdjustment(baseTotal: number, adj: ScheduleAdjustment) {
  if (adj.kind === "flat") return baseTotal + adj.amount;
  const factor = 1 + adj.percent / 100;
  return Math.round(baseTotal * factor);
}

export function overlaps(a: PricingSchedule, b: PricingSchedule) {
  const aStart = a.startAt?.getTime() ?? -Infinity;
  const aEnd = a.endAt?.getTime() ?? Infinity;
  const bStart = b.startAt?.getTime() ?? -Infinity;
  const bEnd = b.endAt?.getTime() ?? Infinity;
  return aStart <= bEnd && bStart <= aEnd;
}

