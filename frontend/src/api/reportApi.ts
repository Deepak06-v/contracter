import { apiClient } from './client';
import { TransactionFilterParams } from './transactionApi';

export const reportApi = {
  downloadTransactionsCsv: async (params?: TransactionFilterParams): Promise<void> => {
    const res = await apiClient.get('/reports/transactions/export', {
      params,
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `construction_ledger_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
