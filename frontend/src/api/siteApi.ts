import { apiClient } from './client';

export interface SiteAgent {
  _id: string;
  name: string;
  email: string;
  isActive?: boolean;
}

export interface Site {
  _id: string;
  name: string;
  code?: string;
  location: string;
  description?: string;
  assignedAgents: SiteAgent[];
  status: 'active' | 'completed';
  createdAt: string;
  updatedAt: string;
  totalExpenses: number;
  totalPaid: number;
  outstandingAmount: number;
  transactionCount: number;
  latestTransactionDate?: string | null;
}

export interface CreateOrUpdateSiteDto {
  name: string;
  code?: string;
  location: string;
  description?: string;
  assignedAgents?: string[];
  status?: 'active' | 'completed';
}

export const siteApi = {
  getSites: async (): Promise<Site[]> => {
    const res = await apiClient.get<{ sites: Site[] }>('/sites');
    return res.data.sites;
  },

  getSiteById: async (id: string): Promise<Site> => {
    const res = await apiClient.get<{ site: Site }>(`/sites/${id}`);
    return res.data.site;
  },

  createSite: async (data: CreateOrUpdateSiteDto): Promise<Site> => {
    const res = await apiClient.post<{ site: Site }>('/sites', data);
    return res.data.site;
  },

  updateSite: async (id: string, data: Partial<CreateOrUpdateSiteDto>): Promise<Site> => {
    const res = await apiClient.put<{ site: Site }>(`/sites/${id}`, data);
    return res.data.site;
  },

  deleteSite: async (id: string): Promise<void> => {
    await apiClient.delete(`/sites/${id}`);
  },
};
