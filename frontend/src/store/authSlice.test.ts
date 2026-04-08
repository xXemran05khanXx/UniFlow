import authReducer, { clearError, initializeAuth } from './authSlice';

jest.mock('../services/api', () => ({
    authAPI: {
        login: jest.fn(),
        register: jest.fn(),
        logout: jest.fn(),
        getProfile: jest.fn()
    }
}));

describe('authSlice', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('initializes auth state from localStorage', () => {
        localStorage.setItem('token', 'test-token');
        localStorage.setItem(
            'user',
            JSON.stringify({ _id: 'u1', name: 'Admin User', email: 'admin@uniflow.test', role: 'admin' })
        );

        const nextState = authReducer(undefined, initializeAuth());

        expect(nextState.isAuthenticated).toBe(true);
        expect(nextState.token).toBe('test-token');
        expect(nextState.user?.role).toBe('admin');
    });

    it('clears previous error', () => {
        const stateWithError = {
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Something failed'
        };

        const nextState = authReducer(stateWithError as any, clearError());

        expect(nextState.error).toBeNull();
    });
});
