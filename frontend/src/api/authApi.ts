import { apiClient } from './client';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'contractor' | 'agent';
  isActive?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: UserProfile;
}

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<LoginResponse> => {
    const res = await apiClient.post<LoginResponse>('/auth/login', credentials);
    return res.data;
  },

  getCurrentUser: async (): Promise<{ user: UserProfile }> => {
    const res = await apiClient.get<{ user: UserProfile }>('/auth/me');
    return res.data;
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },
};
