'use client';
/**
 * loyalty-service.ts — Simplified Rewards Summary (A2)
 *
 * Replaces the old earn/redeem/transaction ledger with a simple
 * tier-based summary based on completed trip count.
 * No point calculations, no redemption flow, no points balance.
 */

export type CustomerTier = 'New Member' | 'Regular' | 'Valued Customer';

export interface RewardsSummary {
  tier: CustomerTier;
  completedTrips: number;
  message: string;
  color: string;
}

/**
 * Returns the customer's tier and a friendly message based on trip count.
 */
export function getCustomerTier(completedTrips: number): RewardsSummary {
  if (completedTrips >= 10) {
    return {
      tier: 'Valued Customer',
      completedTrips,
      message: 'Thank you for choosing QuickRide!',
      color: 'text-yellow-600',
    };
  }
  if (completedTrips >= 3) {
    return {
      tier: 'Regular',
      completedTrips,
      message: 'Thank you for choosing QuickRide!',
      color: 'text-blue-600',
    };
  }
  return {
    tier: 'New Member',
    completedTrips,
    message: 'Thank you for choosing QuickRide!',
    color: 'text-green-600',
  };
}
