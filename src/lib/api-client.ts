import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import type { ApiError } from '@/types';

// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const TOKEN_KEY = 'auth_token';
const PROJECT_HEADER = 'X-Project-Id';

// Token Management (in-memory for security, with cookie fallback for persistence)
let accessToken: string | null = null;
let currentProjectId: number | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    // Only use secure cookies on HTTPS; allows HTTP in development/non-HTTPS deployments
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    Cookies.set(TOKEN_KEY, token, { secure: isSecure, sameSite: 'lax' });
  } else {
    Cookies.remove(TOKEN_KEY);
  }
};

export const getAccessToken = (): string | null => {
  if (accessToken) return accessToken;
  const cookieToken = Cookies.get(TOKEN_KEY);
  if (cookieToken) {
    accessToken = cookieToken;
  }
  return accessToken;
};

export const clearAccessToken = () => {
  accessToken = null;
  Cookies.remove(TOKEN_KEY);
};

export const setCurrentProjectId = (projectId: number | null) => {
  currentProjectId = projectId;
  if (projectId !== null) {
    localStorage.setItem('current_project_id', String(projectId));
  } else {
    localStorage.removeItem('current_project_id');
  }
};

export const getCurrentProjectId = (): number | null => {
  if (currentProjectId !== null) return currentProjectId;
  if (typeof window !== 'undefined') {
    const storedProjectId = localStorage.getItem('current_project_id');
    if (storedProjectId) {
      const parsed = parseInt(storedProjectId, 10);
      if (!isNaN(parsed)) {
        currentProjectId = parsed;
      }
    }
  }
  return currentProjectId;
};

export const clearCurrentProjectId = () => {
  currentProjectId = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('current_project_id');
  }
};

// Create Axios Instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add Authorization header
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add Project ID header
    const projectId = getCurrentProjectId();
    if (projectId !== null && config.headers) {
      config.headers[PROJECT_HEADER] = String(projectId);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      clearAccessToken();
      clearCurrentProjectId();
      
      // Redirect to login (only in browser)
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login';
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      // Could redirect to a forbidden page or show a toast
      if (typeof window !== 'undefined' && !originalRequest?.url?.includes('/auth/')) {
        window.location.href = '/forbidden';
      }
    }

    // Handle Project Suspended
    if (error.response?.status === 423) {
      if (typeof window !== 'undefined') {
        window.location.href = '/project-suspended';
      }
    }

    return Promise.reject(error);
  }
);

// API Helper Functions
export const api = {
  get: <T>(url: string, params?: Record<string, unknown> | object) =>
    apiClient.get<T>(url, { params }).then((res) => res.data),

  post: <T>(url: string, data?: unknown) =>
    apiClient.post<T>(url, data).then((res) => res.data),

  put: <T>(url: string, data?: unknown) =>
    apiClient.put<T>(url, data).then((res) => res.data),

  patch: <T>(url: string, data?: unknown) =>
    apiClient.patch<T>(url, data).then((res) => res.data),

  delete: <T>(url: string) =>
    apiClient.delete<T>(url).then((res) => res.data),

  // File upload with progress
  upload: <T>(
    url: string,
    formData: FormData,
    onProgress?: (progress: number) => void
  ) =>
    apiClient
      .post<T>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentage = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentage);
          }
        },
      })
      .then((res) => res.data),
};

export default apiClient;
