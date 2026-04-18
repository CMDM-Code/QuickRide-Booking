import { differenceInHours, differenceInMinutes } from "date-fns";

export interface PricingBreakdown {
  totalHours: number;
  baseRate24hr: number;
  baseRate12hr: number;
  daysCount: number;
  hasHalfDay: boolean;
  extraHours: number;
  driverFee: number;
  totalPrice: number;
}

/**
 * Calculates the total rental price and provides a breakdown.
 * 
 * Rules:
 * - < 12 hours: PHP 200 per hour
 * - 12 to 24 hours: Use 12hr or 24hr flat rate
 * - Above 24 hours: (Days * 24hr rate) + (Remaining >= 12 ? 12hr rate : Remaining * 200)
 * - Driver fee: PHP 1,000 flat (one time per booking usually, or per day? Spec says "Add driver fee", usually daily for rentals but I will implement as flat for now as per "1000" in meta)
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

  let totalPrice = 0;
  let daysCount = 0;
  let hasHalfDay = false;
  let extraHours = 0;

  if (totalHours < 12) {
    // Under 12 hours = purely hourly
    totalPrice = totalHours * hourlyRate;
    extraHours = totalHours;
  } else if (totalHours <= 24) {
    // Between 12 and 24 hours
    // If hours are closer to 12, use 12hr rate? 
    // Usually, if you hit 12, you pay 12hr rate. If you go over significantly, you pay 24hr rate.
    // Spec says: "If 12 ≤ hours ≤ 24 → use 12hr or 24hr rate"
    // We will use 12hr rate if exactly 12, but once it's more economical or closer to 24, use 24hr.
    // Decision: 12hr rate for up to 12hr + some buffer, otherwise 24hr.
    // For simplicity: If hours <= 12 -> 12hr rate. If > 12 -> 24hr rate.
    if (totalHours === 12) {
      totalPrice = rate12hr;
      hasHalfDay = true;
    } else {
      totalPrice = rate24hr;
      daysCount = 1;
    }
  } else {
    // Above 24 hours
    daysCount = Math.floor(totalHours / 24);
    const remainder = totalHours % 24;

    totalPrice = daysCount * rate24hr;

    if (remainder >= 12) {
      totalPrice += rate12hr;
      hasHalfDay = true;
    } else {
      totalPrice += remainder * hourlyRate;
      extraHours = remainder;
    }
  }

  const driverFee = withDriver ? driverFeeAmount : 0;
  totalPrice += driverFee;

  return {
    totalHours,
    baseRate24hr: rate24hr,
    baseRate12hr: rate12hr,
    daysCount,
    hasHalfDay,
    extraHours,
    driverFee,
    totalPrice,
  };
}
