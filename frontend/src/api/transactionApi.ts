import { apiClient } from './client';

export type TransactionCategory =
  | 'Materials'
  | 'Labour'
  | 'Transport'
  | 'Equipment'
  | 'Miscellaneous';

export type PaymentStatus = 'Paid' | 'Partially Paid' | 'Unpaid';

export interface ProofPhoto {
  storage: 'local' | 'cloudinary';
  filename: string;
  originalName: string;
  path: string;
  mimetype: string;
  size: number;
}

export interface Transaction {
  _id: string;
  site: {
    _id: string;
    name: string;
    code?: string;
    location?: string;
  };
  date: string;
  title: string;
  category: TransactionCategory;
  materialName?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  totalAmount: number;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  supplier?: string;
  notes?: string;
  proofPhoto: ProofPhoto;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  lastEditedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TransactionSummary {
  totalExpenses: number;
  totalPaid: number;
  totalOutstanding: number;
  count: number;
}

export interface TransactionFilterParams {
  siteId?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  paymentStatus?: string;
  search?: string;
  sortBy?: 'date' | 'amount';
  sortOrder?: 'asc' | 'desc';
}

export const transactionApi = {
  getTransactions: async (
    params?: TransactionFilterParams
  ): Promise<{ summary: TransactionSummary; transactions: Transaction[] }> => {
    const res = await apiClient.get<{ summary: TransactionSummary; transactions: Transaction[] }>(
      '/transactions',
      { params }
    );
    return res.data;
  },

  getTransactionById: async (
    id: string
  ): Promise<{
    transaction: Transaction;
    outstandingAmount: number;
    discrepancy: { hasDiscrepancy: boolean; suggestedAmount: number | null; difference: number | null };
  }> => {
    const res = await apiClient.get(`/transactions/${id}`);
    return res.data;
  },

  createTransaction: async (formData: FormData): Promise<{ transaction: Transaction }> => {
    const res = await apiClient.post<{ transaction: Transaction }>('/transactions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  updateTransaction: async (id: string, formData: FormData): Promise<{ transaction: Transaction }> => {
    const res = await apiClient.put<{ transaction: Transaction }>(`/transactions/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiClient.delete(`/transactions/${id}`);
  },

  /**
   * Helper to construct authenticated photo stream URL or fetch photo blob
   */
  getPhotoUrl: (txId: string): string => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return `${baseUrl}/transactions/${txId}/photo`;
  },

  getPhotoBlob: async (txId: string): Promise<string> => {
    const res = await apiClient.get(`/transactions/${txId}/photo`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(res.data);
  },
};
