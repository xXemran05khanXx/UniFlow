export const getApiBaseUrl = (): string => {
    const fromReactEnv = process.env.REACT_APP_API_URL;
    const fromViteStyleEnv = (process.env as Record<string, string | undefined>).VITE_API_URL;

    return fromReactEnv || fromViteStyleEnv || 'http://localhost:5000/api';
};

export const getAuthToken = (): string | null => localStorage.getItem('token');

export const buildAuthHeaders = (extra: Record<string, string> = {}): HeadersInit => {
    const token = getAuthToken();

    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra
    };
};

export const getApiErrorMessage = (error: any, fallbackMessage: string): string => {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallbackMessage
    );
};

export const safeUnwrapApiData = <T>(payload: any): T => {
    if (payload == null) return payload as T;

    if (payload.data !== undefined && payload.data !== null) {
        return payload.data as T;
    }

    if (payload.success !== undefined && payload.message && typeof payload.message === 'object') {
        return payload.message as T;
    }

    return payload as T;
};
