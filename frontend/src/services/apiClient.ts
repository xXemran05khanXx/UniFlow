import axios, { AxiosRequestConfig, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
};

// Create the main axios instance
const apiClient = axios.create(API_CONFIG);

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add authentication token to requests
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log outgoing requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    // Log successful responses in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }

    return response;
  },
  (error: AxiosError) => {
    // Handle different types of errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth data and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        
        case 403:
          // Forbidden - show error message
          console.error('Access forbidden:', data);
          break;
        
        case 404:
          // Not found
          console.error('Resource not found:', error.config?.url);
          break;
        
        case 422:
          // Validation errors
          console.error('Validation errors:', data);
          break;
        
        case 500:
          // Server error
          console.error('Server error:', data);
          break;
        
        default:
          console.error(`HTTP ${status}:`, data);
      }
    } else if (error.request) {
      // Network error
      console.error('Network error:', error.message);
    } else {
      // Other errors
      console.error('Error:', error.message);
    }

    return Promise.reject(error);
  }
);

// Generic API request function
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await apiClient.request<T>({
      method,
      url,
      data,
      ...config,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Convenience methods
export const get = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>('GET', url, undefined, config);

export const post = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>('POST', url, data, config);

export const put = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>('PUT', url, data, config);

export const patch = <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>('PATCH', url, data, config);

export const del = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  apiRequest<T>('DELETE', url, undefined, config);

// File upload helper
export const uploadFile = async (
  url: string,
  file: File,
  fieldName: string = 'file',
  onProgress?: (progress: number) => void
): Promise<any> => {
  const formData = new FormData();
  formData.append(fieldName, file);

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(progress);
      }
    },
  });
};

// Download file helper
export const downloadFile = async (
  url: string,
  filename: string,
  config?: AxiosRequestConfig
): Promise<void> => {
  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
      ...config,
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
};

export default apiClient;
