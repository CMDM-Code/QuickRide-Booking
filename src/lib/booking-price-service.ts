import { 
  PricingSchedule, 
  pickActiveSchedule, 
  applyScheduleAdjustment 
} from "./schedules";
import { 
  PricingSheet, 
  Location, 
  Booking
} from "./types";
import { 
  buildLocationsIndex, 
  resolveRatesForLocation, 
  getLocationChain,
  PricingMeta as PricingMetaType
} from "./pricing";
import { 
  calculateTotalRental, 
  PricingBreakdown 
} from "./pricing-engine";
import { getPricingBehaviorMode } from "./settings-service";

/**
 * Recalculates the price for a booking based on current system rules.
 * This is used when the system is in 'recalculated' mode.
 */
export function recalculateBookingPrice(
  booking: Booking,
  locations: Location[],
  pricingSheets: PricingSheet[],
  schedules: PricingSchedule[],
  pricingMeta: PricingMetaType
): { totalPrice: number; breakdown: PricingBreakdown; schedule: PricingSchedule | null } {
  const { byId } = buildLocationsIndex(locations);
  
  // car_type_id is needed to find the correct pricing sheet.
  // We try multiple sources for it.
  const carTypeId = (booking as any).car_type_id || booking.vehicle?.car_type_id;
  
  if (!carTypeId) {
    return { totalPrice: booking.total_price, breakdown: (booking as any).price_breakdown, schedule: null };
  }

  const sheet = pricingSheets.find(s => s.id === carTypeId);
  if (!sheet) return { totalPrice: booking.total_price, breakdown: (booking as any).price_breakdown, schedule: null };

  const start = new Date(booking.start_date);
  const end = new Date(booking.end_date);

  // For multi-destination, we check the pickup location and all dropoff locations
  const destIds = [
    booking.pickup_location_id,
    ...(booking.dropoff_locations_ids || [])
  ].filter(Boolean);

  let max12h: number | null = null;
  let max24h: number | null = null;
  let maxHourly: number | null = null;

  for (const locId of destIds) {
    const resolved = resolveRatesForLocation(sheet, locId, byId, pricingMeta.fallbackLocationId);
    if (!resolved) continue;

    if (resolved.rate12h !== null && (max12h === null || resolved.rate12h > max12h)) max12h = resolved.rate12h;
    if (resolved.rate24h !== null && (max24h === null || resolved.rate24h > max24h)) max24h = resolved.rate24h;
    
    const hourly = resolved.rateHourly ?? pricingMeta.hourlyRate;
    if (maxHourly === null || hourly > maxHourly) maxHourly = hourly;
  }

  // Fallbacks if no rates found
  if (max12h === null) max12h = 0;
  if (max24h === null) max24h = 0;

  const withDriver = booking.with_driver ?? false;
  const breakdown = calculateTotalRental(
    start, 
    end, 
    max12h, 
    max24h, 
    withDriver, 
    maxHourly ?? pricingMeta.hourlyRate, 
    pricingMeta.driverFee
  );

  // Get active schedule
  const activeSchedule = pickActiveSchedule(schedules, {
    carTypeId,
    locationIds: destIds,
    now: new Date() 
  });

  const baseTotal =
    breakdown.blocks24h * breakdown.baseRate24hr +
    breakdown.blocks12h * breakdown.baseRate12hr +
    breakdown.extraHours * breakdown.baseRateHourly;
    
  const adjustedBase = activeSchedule ? applyScheduleAdjustment(baseTotal, activeSchedule.adjustment) : baseTotal;
  const finalTotal = adjustedBase + breakdown.driverFee;

  return {
    totalPrice: finalTotal,
    breakdown: { ...breakdown, totalPrice: finalTotal },
    schedule: activeSchedule
  };
}

/**
 * Returns the price to display for a booking based on the current system mode.
 */
export function getDisplayPrice(
  booking: Booking,
  locations: Location[],
  pricingSheets: PricingSheet[],
  schedules: PricingSchedule[],
  pricingMeta: PricingMetaType
): { price: number; mode: 'locked' | 'live'; schedule?: PricingSchedule | null } {
  if (getPricingBehaviorMode() === 'locked') {
    return { price: booking.total_price, mode: 'locked' };
  }

  const recalculated = recalculateBookingPrice(booking, locations, pricingSheets, schedules, pricingMeta);
  return { 
    price: recalculated.totalPrice, 
    mode: 'live',
    schedule: recalculated.schedule
  };
}
