/**
 * Stub for schedule-related types and helpers.
 * Scheduled pricing was removed per A3 simplification, but these exports
 * remain to satisfy existing imports until full refactor.
 */

export interface PricingSchedule {
  id: string;
  name?: string;
  car_type_ids?: string[];
  location_ids?: string[];
  start_date?: string;
  end_date?: string;
  adjustment?: { type: 'percentage' | 'flat'; value: number };
  active?: boolean;
}

/** No-op normalization to keep types consistent with Firestore data. */
export function normalizeSchedule(raw: any): PricingSchedule {
  return {
    id: raw?.id ?? '',
    name: raw?.name ?? '',
    car_type_ids: raw?.car_type_ids ?? [],
    location_ids: raw?.location_ids ?? [],
    start_date: raw?.start_date ?? '',
    end_date: raw?.end_date ?? '',
    adjustment: raw?.adjustment ?? undefined,
    active: raw?.active ?? false,
  };
}

/** Always returns null because scheduled pricing is removed (A3). */
export function pickActiveSchedule(
  _schedules: PricingSchedule[],
  _criteria: { carTypeId?: string; locationIds?: string[]; now?: Date }
): PricingSchedule | null {
  return null;
}

/** Returns base unchanged because scheduled pricing is removed (A3). */
export function applyScheduleAdjustment(
  baseTotal: number,
  _adjustment?: PricingSchedule['adjustment']
): number {
  return baseTotal;
}
