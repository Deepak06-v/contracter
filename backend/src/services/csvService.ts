import { ITransaction } from '../models/Transaction';
import { calculateOutstandingAmount } from './calculationService';

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) {
    return '""';
  }
  let str = String(val).trim();

  // Protect against CSV injection in Excel (=, +, -, @, \t, \r)
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes by doubling them
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export function generateTransactionsCsv(transactions: any[]): string {
  const headers = [
    'Date',
    'Site Name',
    'Site Code',
    'Title / Description',
    'Category',
    'Material / Item',
    'Quantity',
    'Unit',
    'Unit Price (₹)',
    'Total Amount (₹)',
    'Amount Paid (₹)',
    'Outstanding Balance (₹)',
    'Payment Status',
    'Supplier / Payee',
    'Notes',
    'Recorded By',
    'Created At',
  ];

  const rows: string[] = [headers.map(escapeCsvField).join(',')];

  for (const tx of transactions) {
    const siteName = tx.site?.name || 'Unknown Site';
    const siteCode = tx.site?.code || '';
    const creatorName = tx.createdBy?.name || tx.createdBy?.email || 'Unknown';
    const dateFormatted = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
    const createdFormatted = tx.createdAt ? new Date(tx.createdAt).toISOString() : '';
    const outstanding = calculateOutstandingAmount(tx.totalAmount, tx.amountPaid);

    const row = [
      dateFormatted,
      siteName,
      siteCode,
      tx.title || '',
      tx.category || '',
      tx.materialName || '',
      tx.quantity !== undefined && tx.quantity !== null ? tx.quantity : '',
      tx.unit || '',
      tx.unitPrice !== undefined && tx.unitPrice !== null ? tx.unitPrice.toFixed(2) : '',
      Number(tx.totalAmount || 0).toFixed(2),
      Number(tx.amountPaid || 0).toFixed(2),
      outstanding.toFixed(2),
      tx.paymentStatus || '',
      tx.supplier || '',
      tx.notes || '',
      creatorName,
      createdFormatted,
    ];

    rows.push(row.map(escapeCsvField).join(','));
  }

  // Prepend UTF-8 BOM for Excel compatibility
  return '\uFEFF' + rows.join('\r\n');
}
