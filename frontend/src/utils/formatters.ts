/**
 * Formats a number into Indian Rupee (INR) representation with ₹ symbol.
 */
export function formatINR(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹0.00';
  }

  // Indian number formatting: 1,23,456.78
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date nicely for human readability
 */
export function formatDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '-';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format input date to YYYY-MM-DD for HTML date inputs
 */
export function toInputDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
  return d.toISOString().split('T')[0];
}
