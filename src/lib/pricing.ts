import { differenceInMinutes } from "date-fns";
import type { Location, PricingSheet } from "@/lib/types";

export type PricingMeta = {
  hourlyRate: number;
  driverFee: number;
  fallbackLocationId: string; // usually "default"
};

export type ResolvedLocationRate = {
  matchedLocationId: string;
  rateHourly: number | null;
  rate12h: number | null;
  rate24h: number | null;
};

export type PricingComputation = {
  totalHours: number;
  blocks24h: number;
  blocks12h: number;
  extraHours: number;
  baseTotal: number;
  driverFee: number;
  total: number;
  applied: {
    matchedLocationId: string;
    rate12h: number;
    rate24h: number;
  };
};

export function titleFromId(id: string) {
  return id
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function buildLocationsIndex(locations: Location[]) {
  const byId: Record<string, Location> = {};
  for (const loc of locations) byId[loc.id] = loc;
  return { byId };
}

export function getLocationChain(locationId: string, locationsById: Record<string, Location>) {
  const chain: string[] = [];
  const seen = new Set<string>();
  let current: string | undefined = locationId;

  while (current && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    const parent: string | undefined = locationsById[current]?.parentId;
    current = parent || undefined;
  }

  return chain;
}

/**
 * Resolve the 12h/24h rates using priority:
 * city → province → region (via parentId chain) → fallbackLocationId
 *
 * Note: We do NOT treat null as a match; null means "not available".
 */
export function resolveRatesForLocation(
  sheet: PricingSheet,
  locationId: string,
  locationsById: Record<string, Location>,
  fallbackLocationId: string
): ResolvedLocationRate | null {
  const chain = getLocationChain(locationId, locationsById);
  const candidates = [...chain, fallbackLocationId];

  for (const id of candidates) {
    const rate = sheet.rates?.[id];
    if (!rate) continue;
    return {
      matchedLocationId: id,
      rateHourly: rate["hourly"] ?? null,
      rate12h: rate["12h"] ?? null,
      rate24h: rate["24h"] ?? null
    };
  }

  return null;
}

export function computeRentalTotalStrictBlocks(args: {
  start: Date;
  end: Date;
  rate12h: number;
  rate24h: number;
  hourlyRate: number;
  withDriver: boolean;
  driverFee: number;
}): Omit<PricingComputation, "applied"> {
  const totalMinutes = differenceInMinutes(args.end, args.start);
  const totalHours = Math.ceil(totalMinutes / 60);

  const blocks24h = Math.floor(totalHours / 24);
  const remainderAfter24 = totalHours % 24;
  const blocks12h = Math.floor(remainderAfter24 / 12);
  const extraHours = remainderAfter24 % 12;

  const baseTotal =
    blocks24h * args.rate24h +
    blocks12h * args.rate12h +
    extraHours * args.hourlyRate;

  const driverFee = args.withDriver ? args.driverFee : 0;

  return {
    totalHours,
    blocks24h,
    blocks12h,
    extraHours,
    baseTotal,
    driverFee,
    total: baseTotal + driverFee
  };
}

