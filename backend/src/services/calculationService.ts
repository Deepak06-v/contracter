import { PaymentStatus } from '../models/Transaction';

/**
 * Safe currency arithmetic functions.
 * Amounts are rounded to 2 decimal places to avoid floating point inaccuracies.
 */

export function roundToTwoDecimals(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateSuggestedAmount(quantity?: number, unitPrice?: number): number | null {
  if (quantity !== undefined && unitPrice !== undefined && quantity > 0 && unitPrice > 0) {
    return roundToTwoDecimals(quantity * unitPrice);
  }
  return null;
}

export function calculateOutstandingAmount(totalAmount: number, amountPaid: number = 0): number {
  const diff = roundToTwoDecimals(totalAmount) - roundToTwoDecimals(amountPaid);
  return diff > 0 ? roundToTwoDecimals(diff) : 0;
}

export function determinePaymentStatus(totalAmount: number, amountPaid: number = 0): PaymentStatus {
  const total = roundToTwoDecimals(totalAmount);
  const paid = roundToTwoDecimals(amountPaid);

  if (paid >= total && total > 0) {
    return 'Paid';
  }
  if (paid > 0 && paid < total) {
    return 'Partially Paid';
  }
  return 'Unpaid';
}

export function hasPriceDiscrepancy(
  totalAmount: number,
  quantity?: number,
  unitPrice?: number
): { hasDiscrepancy: boolean; suggestedAmount: number | null; difference: number | null } {
  const suggested = calculateSuggestedAmount(quantity, unitPrice);
  if (suggested === null) {
    return { hasDiscrepancy: false, suggestedAmount: null, difference: null };
  }

  const diff = roundToTwoDecimals(Math.abs(totalAmount - suggested));
  const hasDiscrepancy = diff >= 0.01;

  return {
    hasDiscrepancy,
    suggestedAmount: suggested,
    difference: hasDiscrepancy ? diff : null,
  };
}
