import api, { clearTokens, getRefreshToken, setTokens } from './api';
import type {
  Paginated,
  Prospect,
  ProspectFilters,
  Template,
  User,
} from '@/types';

export const authApi = {
  login: (email: string, password: string, rememberMe = false) =>
    api.post<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      email,
      password,
      rememberMe,
    }),
  logout: () => api.post('/auth/logout', { refreshToken: getRefreshToken() }),
  me: () => api.get<User>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const prospectApi = {
  list: (params: ProspectFilters) => api.get<Paginated<Prospect>>('/prospects', { params }),
  get: (id: string) => api.get<Prospect>(`/prospects/${id}`),
  create: (data: Partial<Prospect>) => api.post<Prospect>('/prospects', data),
  update: (id: string, data: Partial<Prospect>) => api.patch<Prospect>(`/prospects/${id}`, data),
  remove: (id: string) => api.delete(`/prospects/${id}`),
  bulkStatus: (ids: string[], status: string) => api.post('/prospects/bulk/status', { ids, status }),
  bulkDelete: (ids: string[]) => api.post('/prospects/bulk/delete', { ids }),
  addNote: (id: string, content: string) => api.post(`/prospects/${id}/notes`, { content }),
  deleteNote: (id: string, noteId: string) => api.delete(`/prospects/${id}/notes/${noteId}`),
  followUps: () => api.get<{ today: Prospect[]; overdue: Prospect[] }>('/prospects/follow-ups'),
  stats: () => api.get<{ total: number; withFollowUp: number; byStatus: Record<string, number> }>('/prospects/stats'),
  search: (q: string) => api.get<Prospect[]>('/prospects/search', { params: { q } }),
};

export const templateApi = {
  list: () => api.get<Template[]>('/templates'),
  get: (id: string) => api.get<Template>(`/templates/${id}`),
  create: (data: Partial<Template>) => api.post<Template>('/templates', data),
  update: (id: string, data: Partial<Template>) => api.patch<Template>(`/templates/${id}`, data),
  remove: (id: string) => api.delete(`/templates/${id}`),
  preview: (payload: Record<string, unknown>) => api.post<{ preview: string }>('/templates/preview', payload),
};

export const whatsappApi = {
  generate: (payload: { prospectId: string; templateId?: string; message?: string }) =>
    api.post<{ url: string; message: string; phone: string }>('/whatsapp/generate', payload),
};

export const importApi = {
  parse: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{
      headers: string[];
      rows: Record<string, string | null>[];
      rowCount: number;
      suggestedMapping: Record<string, string | undefined>;
    }>('/import/parse', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  preview: (payload: unknown) => api.post('/import/preview', payload),
  confirm: (payload: unknown) => api.post<{ imported: number }>('/import/confirm', payload),
};

export const exportApi = {
  downloadCsv: async () => {
    const res = await api.get('/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'groovcrm-prospects.csv';
    a.click();
    URL.revokeObjectURL(url);
  },
};

export { setTokens, clearTokens, getRefreshToken };
