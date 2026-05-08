import { differenceInHours, differenceInMinutes } from "date-fns";

export interface PricingBreakdown {
  totalHours: number;
  baseRate24hr: number;
  baseRate12hr: number;
  baseRateHourly: number;
  blocks24h: number;
  blocks12h: number;
  extraHours: number;
  driverFee: number;
  totalPrice: number;
}

/**
 * Calculates the total rental price and provides a breakdown.
 * 
 * Rules:
 * - Break total time into: 24h blocks → remaining 12h blocks → remaining hours (<12) at hourly rate
 * - Hourly rate is always meta.hourly_rate (location-independent)
 * - Driver fee is flat ONCE per booking (not per day/hour)
 */
export function calculateTotalRental(
  start: Date,
  end: Date,
  rate12hr: number,
  rate24hr: number,
  withDriver: boolean,
  hourlyRate: number = 200,
  driverFeeAmount: number = 1000
): PricingBreakdown {
  const totalMinutes = differenceInMinutes(end, start);
  const totalHoursFloat = totalMinutes / 60;
  const totalHours = Math.ceil(totalHoursFloat); // Round up to nearest hour

  const blocks24h = Math.floor(totalHours / 24);
  const remainderAfter24 = totalHours % 24;

  const blocks12h = Math.floor(remainderAfter24 / 12);
  const extraHours = remainderAfter24 % 12;

  let totalPrice =
    blocks24h * rate24hr +
    blocks12h * rate12hr +
    extraHours * hourlyRate;

  const driverFee = withDriver ? driverFeeAmount : 0;
  totalPrice += driverFee;

  return {
    totalHours,
    baseRate24hr: rate24hr,
    baseRate12hr: rate12hr,
    baseRateHourly: hourlyRate,
    blocks24h,
    blocks12h,
    extraHours,
    driverFee,
    totalPrice,
  };
}

// ─── B5.2 — Tax & Late Fee Functions ─────────────────────────────────────────

/**
 * Apply tax to a booking subtotal.
 * taxRate = percentage number, e.g. 12 means 12% VAT.
 */
export function applyTax(
  subtotal: number,
  taxRate: number
): { subtotal: number; taxAmount: number; total: number } {
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  return {
    subtotal,
    taxAmount: Math.round(taxAmount * 100) / 100,
    total: Math.round((subtotal + taxAmount) * 100) / 100,
  };
}

/**
 * Calculate late return fee.
 * endDateStr / returnDateStr are ISO strings.
 * Returns 0 if returned on time or early.
 */
export function calculateLateFee(
  endDateStr: string,
  returnDateStr: string | undefined,
  hourlyRate: number,
  lateFeeMethod: 'hourly_rate' | 'flat_amount' | 'percentage',
  lateFeeFlat: number,
  lateFeePercent: number,
  bookingTotal: number = 0
): number {
  const end = new Date(endDateStr);
  const returned = returnDateStr ? new Date(returnDateStr) : new Date();
  const minutesLate = (returned.getTime() - end.getTime()) / 60000;
  if (minutesLate <= 0) return 0;
  const hoursLate = Math.ceil(minutesLate / 60);
  switch (lateFeeMethod) {
    case 'hourly_rate': return Math.round(hoursLate * hourlyRate * 100) / 100;
    case 'flat_amount': return lateFeeFlat;
    case 'percentage':  return Math.round((bookingTotal * lateFeePercent) / 100 * 100) / 100;
    default: return 0;
  }
}
