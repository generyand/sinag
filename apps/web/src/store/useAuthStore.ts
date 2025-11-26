import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@sinag/shared';

/**
 * Authentication state interface for the global auth store
 */
interface AuthState {
  /** Current authenticated user or null if not authenticated */
  user: User | null;
  /** JWT access token or null if not authenticated */
  token: string | null;
  /** Whether the user is currently authenticated */
  isAuthenticated: boolean;
  /** Whether the user must change their password on next login */
  mustChangePassword: boolean;
  /** Set the current user and mark as authenticated */
  setUser: (user: User) => void;
  /** Set the JWT access token */
  setToken: (token: string) => void;
  /** Set the must change password flag */
  setMustChangePassword: (mustChange: boolean) => void;
  /** Clear all authentication data and mark as not authenticated */
  logout: () => void;
  /** Initialize auth state from stored data (for persistence) */
  initialize: (user: User | null, token: string | null) => void;
  /** Hydrate auth state from persisted data */
  hydrate: () => void;
  /** Force clear all persisted data */
  clearPersistedData: () => void;
}

/**
 * Set auth token in cookies for middleware access
 */
const setAuthCookie = (token: string | null) => {
  if (typeof window === 'undefined') return; // Server-side check
  
  if (token) {
    // Set cookie with token (expires in 7 days)
    document.cookie = `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Strict`;
  } else {
    // Remove cookie
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};

/**
 * Zustand store for managing global authentication state
 * 
 * This store holds the current user, JWT token, and authentication status.
 * It provides actions for login, logout, and managing the forced password change flow.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      mustChangePassword: false,

      setUser: (user) => set({ 
        user, 
        isAuthenticated: true,
        mustChangePassword: user.must_change_password 
      }),

      setToken: (token) => {
        // Set cookie for middleware access
        setAuthCookie(token);
        set({ token });
        // Also set isAuthenticated if we have both user and token
        const currentState = get();
        if (currentState.user && token) {
          set({ isAuthenticated: true });
        }
      },

      setMustChangePassword: (mustChange) => set({ mustChangePassword: mustChange }),

      logout: () => {
        // Clear cookie
        setAuthCookie(null);
        // Clear localStorage manually to ensure complete cleanup
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          sessionStorage.clear();
          // Force clear any other potential storage
          Object.keys(localStorage).forEach(key => {
            if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('user') || key.toLowerCase().includes('token')) {
              localStorage.removeItem(key);
            }
          });
        }
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          mustChangePassword: false 
        });
      },

      initialize: (user, token) => {
        // Set cookie if token exists
        setAuthCookie(token);
        set({
          user,
          token,
          isAuthenticated: !!user && !!token,
          mustChangePassword: user?.must_change_password || false
        });
      },

      // Hydrate auth state from persisted data
      hydrate: () => {
        if (typeof window === 'undefined') return;
        
        try {
          const stored = localStorage.getItem('auth-storage');
          if (stored) {
            const parsed = JSON.parse(stored);
            const state = parsed.state;
            
            if (state?.user && state?.token) {
              // Set cookie for middleware access
              setAuthCookie(state.token);
              // Update state
              set({
                user: state.user,
                token: state.token,
                isAuthenticated: true,
                mustChangePassword: state.mustChangePassword || false
              });
              console.log('Auth state hydrated successfully');
            } else {
              console.log('No valid auth data found in storage');
            }
          } else {
            console.log('No auth storage found');
          }
        } catch (error) {
          console.error('Error hydrating auth state:', error);
        }
      },

      // Force clear all persisted data
      clearPersistedData: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          sessionStorage.clear();
          // Force clear any other potential storage
          Object.keys(localStorage).forEach(key => {
            if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('user') || key.toLowerCase().includes('token')) {
              localStorage.removeItem(key);
            }
          });
        }
        setAuthCookie(null);
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false,
          mustChangePassword: false 
        });
      },
    }),
    {
      name: 'auth-storage', // This matches what the API client expects
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        mustChangePassword: state.mustChangePassword,
      }),
      // Version 3: Force reset for role redefinition (MLGOO_DILG, ASSESSOR, VALIDATOR)
      // and validator_area_id field rename (was governance_area_id)
      version: 3, // Increment version to force reset after role structure changes
    }
  )
); 