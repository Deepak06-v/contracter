import { apiClient } from './client';

export interface AssignedSiteRef {
  _id: string;
  name: string;
  code?: string;
  status: string;
}

export interface AgentUser {
  _id: string;
  name: string;
  email: string;
  role: 'agent';
  isActive: boolean;
  createdAt: string;
  assignedSites: AssignedSiteRef[];
}

export const agentApi = {
  getAgents: async (): Promise<AgentUser[]> => {
    const res = await apiClient.get<{ agents: AgentUser[] }>('/agents');
    return res.data.agents;
  },

  createAgent: async (data: {
    name: string;
    email: string;
    password: string;
    assignedSiteIds?: string[];
  }): Promise<AgentUser> => {
    const res = await apiClient.post<{ agent: AgentUser }>('/agents', data);
    return res.data.agent;
  },

  updateAgent: async (
    id: string,
    data: {
      name?: string;
      email?: string;
      isActive?: boolean;
      assignedSiteIds?: string[];
    }
  ): Promise<AgentUser> => {
    const res = await apiClient.put<{ agent: AgentUser }>(`/agents/${id}`, data);
    return res.data.agent;
  },

  toggleStatus: async (id: string): Promise<{ isActive: boolean }> => {
    const res = await apiClient.put<{ isActive: boolean }>(`/agents/${id}/status`);
    return res.data;
  },
};
