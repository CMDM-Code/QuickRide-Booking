import { 
  PricingSchedule, 
  pickActiveSchedule, 
  applyScheduleAdjustment 
} from "./schedules";
import { 
  PricingSheet, 
  Location, 
  Booking,
  PricingMeta as PricingMetaType
} from "./types";
import { 
  buildLocationsIndex, 
  resolveRatesForLocation, 
  getLocationChain 
} from "./pricing";
import { 
  calculateTotalRental, 
  PricingBreakdown 
} from "./pricing-engine";
import { getSystemSettings } from "./settings-service";

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
  const vehicleId = booking.car_id;
  
  // We need to find the vehicle's car type. In a real scenario, we'd fetch the vehicle doc.
  // For recalculation, we assume the booking already has car_type_id or we use what's in the sheets.
  // Assuming booking has car_type_id stored.
  const carTypeId = (booking as any).car_type_id; 
  if (!carTypeId) return { totalPrice: booking.total_price, breakdown: (booking as any).price_breakdown, schedule: null };

  const sheet = pricingSheets.find(s => s.id === carTypeId);
  if (!sheet) return { totalPrice: booking.total_price, breakdown: (booking as any).price_breakdown, schedule: null };

  const start = booking.start_date instanceof Date ? booking.start_date : new Date(booking.start_date);
  const end = booking.end_date instanceof Date ? booking.end_date : new Date(booking.end_date);

  // For multi-destination, use the same logic as BookingForm (conservative max)
  let max12h: number | null = null;
  let max24h: number | null = null;
  let maxHourly: number | null = null;

  const destIds = Array.isArray(booking.location_id) ? booking.location_id : [booking.location_id];

  for (const locId of destIds) {
    const resolved = resolveRatesForLocation(sheet, locId, byId, pricingMeta.fallbackLocationId);
    if (!resolved || resolved.rate12h === null || resolved.rate24h === null) continue;

    if (max12h === null || resolved.rate12h > max12h) max12h = resolved.rate12h;
    if (max24h === null || resolved.rate24h > max24h) max24h = resolved.rate24h;
    if (maxHourly === null || (resolved.rateHourly ?? pricingMeta.hourlyRate) > maxHourly) {
        maxHourly = resolved.rateHourly ?? pricingMeta.hourlyRate;
    }
  }

  if (max12h === null || max24h === null) {
      return { totalPrice: booking.total_price, breakdown: (booking as any).price_breakdown, schedule: null };
  }

  const withDriver = (booking as any).with_driver ?? false;
  const breakdown = calculateTotalRental(
    start, 
    end, 
    max12h, 
    max24h, 
    withDriver, 
    maxHourly ?? pricingMeta.hourlyRate, 
    pricingMeta.driverFee
  );

  // Get active schedule (for the time the booking was made? No, 'recalculated' means current rules)
  // Actually, 'recalculated' usually implies 'live' pricing.
  const activeSchedule = pickActiveSchedule(schedules, {
    carTypeId,
    locationIds: destIds,
    now: new Date() // Or should it be booking.created_at? Recalculated usually means current live rules.
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
  const settings = getSystemSettings();
  
  if (settings.pricingBehaviorMode === 'locked') {
    return { price: booking.total_price, mode: 'locked' };
  }

  const recalculated = recalculateBookingPrice(booking, locations, pricingSheets, schedules, pricingMeta);
  return { 
    price: recalculated.totalPrice, 
    mode: 'live',
    schedule: recalculated.schedule
  };
}
