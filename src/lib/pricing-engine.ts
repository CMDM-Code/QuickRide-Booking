import { differenceInHours, differenceInMinutes } from "date-fns";

export interface PricingBreakdown {
  totalHours: number;
  baseRate24hr: number;
  baseRate12hr: number;
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
    blocks24h,
    blocks12h,
    extraHours,
    driverFee,
    totalPrice,
  };
}
