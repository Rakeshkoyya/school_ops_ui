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
  withCredentials: true,  // Enable sending cookies for session persistence
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
    const requestUrl = originalRequest?.url || '';

    // Handle 401 Unauthorized
    // Don't redirect for auth endpoints like /auth/session, /auth/login, /auth/google
    // These are expected to return 401 when session is invalid
    if (error.response?.status === 401) {
      const isAuthEndpoint = requestUrl.includes('/auth/');
      
      if (!isAuthEndpoint) {
        clearAccessToken();
        clearCurrentProjectId();
        
        // Redirect to login (only in browser)
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login';
        }
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      // Skip redirect for blob/download requests (e.g., export) – they handle errors themselves
      const isBlobRequest = originalRequest?.responseType === 'blob';
      if (typeof window !== 'undefined' && !requestUrl.includes('/auth/') && !isBlobRequest) {
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

// Session restoration types
interface SessionRestoreResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface GoogleAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  is_new_user: boolean;
  user_id: number;
  email: string | null;
}

/**
 * Attempt to restore session from HTTP-only refresh token cookie.
 * This should be called on app initialization to check if user has a valid session.
 * 
 * @returns access_token if session is valid, null otherwise
 */
export const restoreSession = async (): Promise<string | null> => {
  try {
    const response = await apiClient.get<SessionRestoreResponse>('/auth/session');
    const token = response.data.access_token;
    setAccessToken(token);
    return token;
  } catch {
    // No valid session - clear any stale tokens
    clearAccessToken();
    return null;
  }
};

/**
 * Authenticate with Google OAuth.
 * 
 * @param code - Authorization code from Google
 * @param redirectUri - The redirect URI used in the OAuth flow
 * @returns GoogleAuthResponse with access_token and user info
 */
export const authenticateWithGoogle = async (
  code: string,
  redirectUri: string
): Promise<GoogleAuthResponse> => {
  const response = await apiClient.post<GoogleAuthResponse>('/auth/google', {
    code,
    redirect_uri: redirectUri,
  });
  
  // Store the access token
  setAccessToken(response.data.access_token);
  
  return response.data;
};

export default apiClient;
