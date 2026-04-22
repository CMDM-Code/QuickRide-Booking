import type { Timestamp } from "firebase/firestore";

export type ScheduleScope =
  | { kind: "all" }
  | { kind: "carType"; carTypeId: string }
  | { kind: "carModel"; carModelId: string };

export type ScheduleAdjustment =
  | { kind: "flat"; amount: number }
  | { kind: "percent"; percent: number }; // +10 or -15

export type PricingSchedule = {
  id: string;
  name: string;
  enabled: boolean;
  scope: ScheduleScope;
  locationIds?: string[]; // optional scope to locations (any match)
  startAt?: Date | null;
  endAt?: Date | null;
  priority: number;
  createdAt?: Date | null;
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
  return {
    id: doc.id,
    name: String(doc.name ?? "Schedule"),
    enabled: Boolean(doc.enabled ?? true),
    scope: doc.scope ?? { kind: "all" },
    locationIds: Array.isArray(doc.locationIds) ? doc.locationIds : undefined,
    startAt: tsToDate(doc.startAt),
    endAt: tsToDate(doc.endAt),
    priority: typeof doc.priority === "number" ? doc.priority : 0,
    createdAt: tsToDate(doc.created_at ?? doc.createdAt),
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
  if (s.scope.kind === "carType") return s.scope.carTypeId === ctx.carTypeId;
  if (s.scope.kind === "carModel") return Boolean(ctx.carModelId) && s.scope.carModelId === ctx.carModelId;
  return false;
}

function locationMatches(s: PricingSchedule, locationIds: string[]) {
  if (!s.locationIds || s.locationIds.length === 0) return true;
  const set = new Set(locationIds);
  return s.locationIds.some((id) => set.has(id));
}

export function pickActiveSchedule(
  schedules: PricingSchedule[],
  ctx: { carTypeId: string; carModelId?: string; locationIds: string[]; now: Date }
) {
  const candidates = schedules
    .filter((s) => isScheduleActive(s, ctx.now))
    .filter((s) => scopeMatches(s, { carTypeId: ctx.carTypeId, carModelId: ctx.carModelId }))
    .filter((s) => locationMatches(s, ctx.locationIds));

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

