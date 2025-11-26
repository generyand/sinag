// API utilities for file uploads and other operations
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore } from "../store/useAuthStore";

// Get the appropriate API base URL based on environment
const getBaseURL = () => {
  const isServer = typeof window === 'undefined';
  
  // Server-side (Next.js SSR/API Routes running in Docker)
  if (isServer) {
    // In Docker, use the internal service name
    // This comes from docker-compose.yml environment variable
    return process.env.API_BASE_URL || 'http://api:8000';
  }
  
  // Client-side (browser) - use the public environment variable
  // This is exposed by NEXT_PUBLIC_ prefix and accessible to the browser
  // Browser needs localhost because it runs on the host machine, not in Docker
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
};

const axiosInstance = axios.create({
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token and set dynamic base URL
axiosInstance.interceptors.request.use(
  (config) => {
    // Set base URL dynamically based on environment (server vs browser)
    config.baseURL = getBaseURL();
    
    // Get token directly from Zustand store
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Don't redirect if we're already on the login page
      if (
        typeof window !== "undefined" &&
        window.location.pathname !== "/login"
      ) {
        // Clear auth data using the store
        useAuthStore.getState().logout();
        // Show toast notification (only in browser)
        if (typeof window !== "undefined") {
          import('./toast').then(({ showWarning }) => {
            showWarning('Session expired', {
              description: 'Please log in again to continue.',
            });
          });
        }
        // Redirect to login
        window.location.href = "/login";
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403 && typeof window !== "undefined") {
      import('./toast').then(({ showError }) => {
        showError('Access denied', {
          description: 'You do not have permission to perform this action.',
        });
      });
    }

    // Handle 429 Rate Limit
    if (error.response?.status === 429 && typeof window !== "undefined") {
      const retryAfter = error.response.headers['retry-after'];
      import('./toast').then(({ showWarning }) => {
        showWarning('Too many requests', {
          description: retryAfter
            ? `Please wait ${retryAfter} seconds before trying again.`
            : 'Please wait a moment and try again.',
        });
      });
    }

    // Handle 500 Server Error
    if (error.response?.status === 500 && typeof window !== "undefined") {
      import('./toast').then(({ showError }) => {
        showError('Server error', {
          description: 'Something went wrong on our end. Please try again later.',
        });
      });
    }

    // Handle Network Errors
    if (error.message === 'Network Error' && typeof window !== "undefined") {
      import('./toast').then(({ showError }) => {
        showError('Network error', {
          description: 'Unable to connect to the server. Please check your internet connection.',
        });
      });
    }

    return Promise.reject(error);
  }
);

/**
 * Mutator function for Orval-generated API client
 * This is the main function that handles all API requests
 */
export const mutator = async <T = unknown, D = unknown>(
  config: AxiosRequestConfig<D>,
  options?: AxiosRequestConfig<D>
): Promise<T> => {
  try {
    const response: AxiosResponse<T> = await axiosInstance({
      ...config,
      ...options,
    });
    return response.data;
  } catch (error) {
    // Re-throw the error for React Query to handle
    throw error;
  }
};

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadWithProgressOptions {
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal;
}

export async function uploadWithProgress(
  url: string,
  file: File,
  options: UploadWithProgressOptions = {}
): Promise<{ url: string; name: string; size: number }> {
  const { onProgress, signal } = options;

  // Simulate upload progress but cap at 95% until completion
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress = Math.min(progress + 5, 95);
      onProgress?.({ loaded: progress, total: 100, percentage: progress });
    }, 200);

    const complete = () => {
      clearInterval(interval);
      onProgress?.({ loaded: 100, total: 100, percentage: 100 });
      resolve({
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      });
    };

    // Simulate completion after a short delay (replace with real upload completion)
    const doneTimer = setTimeout(complete, 2000);

    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        clearInterval(interval);
        clearTimeout(doneTimer);
      });
    }
  });
}

/**
 * Decode a JWT token (without verification) to extract the payload.
 * Used for server-side role checks in Next.js server components.
 */
export function decodeJwtPayload(
  token: string
): Record<string, unknown> | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    // Use atob if available (browser/edge), otherwise Buffer (Node.js)
    let decoded: string;
    if (typeof atob === "function") {
      decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    } else {
      // Node.js polyfill
      decoded = Buffer.from(payload, "base64").toString("utf-8");
    }
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Axios instance configured with auth interceptors.
 * Use for direct API calls when generated hooks are not suitable.
 */
export const api = axiosInstance;

// Additional API utilities can be added here
export const apiClient = {
  uploadWithProgress,

  // Base fetch wrapper
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    return response;
  },

  // GET request
  async get<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await this.fetch(url, { ...options, method: "GET" });
    return response.json();
  },

  // POST request
  async post<T = unknown>(
    url: string,
    data: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // PUT request
  async put<T = unknown>(
    url: string,
    data: unknown,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.fetch(url, {
      ...options,
      method: "PUT",
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // DELETE request
  async delete<T = unknown>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await this.fetch(url, { ...options, method: "DELETE" });
    return response.json();
  },
};
