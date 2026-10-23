import { apiClient } from './client';
import { Transaction } from './transactionApi';

export interface SiteSummary {
  _id: string;
  name: string;
  code?: string;
  location: string;
  status: 'active' | 'completed';
  assignedAgents: { _id: string; name: string; email: string }[];
  totalExpenses: number;
  totalPaid: number;
  outstandingAmount: number;
  transactionCount: number;
  latestTransactionDate?: string | null;
}

export interface DashboardStats {
  activeSitesCount: number;
  totalSitesCount: number;
  totalExpenses: number;
  totalPaid: number;
  totalOutstanding: number;
  transactionCount: number;
  period: string;
  recentTransactions: Transaction[];
  siteSummaries: SiteSummary[];
}

export const dashboardApi = {
  getStats: async (period: string = 'all'): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats', {
      params: { period },
    });
    return res.data;
  },
};
