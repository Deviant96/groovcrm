import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

let accessToken: string | null = localStorage.getItem('gc_access_token');
let refreshToken: string | null = localStorage.getItem('gc_refresh_token');
let refreshPromise: Promise<string | null> | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (access) localStorage.setItem('gc_access_token', access);
  else localStorage.removeItem('gc_access_token');
  if (refresh) localStorage.setItem('gc_refresh_token', refresh);
  else localStorage.removeItem('gc_refresh_token');
}

export function getRefreshToken() {
  return refreshToken;
}

export function clearTokens() {
  setTokens(null, null);
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshToken) return null;
  try {
    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
    accessToken = data.accessToken;
    localStorage.setItem('gc_access_token', data.accessToken);
    return data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
