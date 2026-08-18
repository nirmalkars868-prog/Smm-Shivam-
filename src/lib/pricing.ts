import { Service } from '../types';

/**
 * Single centralized pricing module for SMM Panel.
 * Ensures that the rate shown in service lists, service details,
 * and dropdowns is 100% identical to the rate used in order charge calculations.
 */

/**
 * Returns the selling rate per 1,000 units in panel base currency (INR).
 */
export function getServiceSellingRate(service: Service): number {
  if (!service) return 0;
  return Number(service.sellingRate) || 0;
}

/**
 * Formats the displayed rate per 1,000 units for UI rendering.
 * e.g., "₹100.00" or "$1.1628"
 */
export function formatServiceRate(service: Service, currency: string = 'INR'): string {
  const rate = getServiceSellingRate(service);
  if (currency === 'INR') {
    return `₹${rate.toFixed(2)}`;
  }
  return `$${(rate / 86).toFixed(4)}`;
}

/**
 * Calculates the total order charge for a given quantity.
 * charge = (quantity / 1000) * sellingRate
 */
export function calculateOrderPrice(service: Service, quantity: number): number {
  if (!service || !quantity) return 0;
  const ratePer1000 = getServiceSellingRate(service);
  return Number(((quantity / 1000) * ratePer1000).toFixed(2));
}
