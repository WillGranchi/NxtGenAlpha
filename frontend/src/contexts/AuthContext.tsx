import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import TradingAPI from '../services/api';

interface User {
  id: number;
  email: string;
  name: string;
  theme: 'light' | 'dark';
  profile_picture_url?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void; // Google OAuth login
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTheme: (theme: 'light' | 'dark') => Promise<void>;
  updateProfile: (name?: string, email?: string, profilePictureUrl?: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for token in URL (from OAuth callback) or errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      // Handle OAuth errors
      console.error('OAuth error:', error, errorDescription);
      // Show user-friendly error (could use toast notification here)
      alert(`Authentication failed: ${errorDescription || error}. Please try again.`);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }
    
    if (token) {
      // Store token in cookie (backend sets it, but we can also store in localStorage as backup)
      localStorage.setItem('auth_token', token);
      // Remove token from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      // Reload user data
      loadUser();
    }
  }, []);

  // Load user on mount and when token changes
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setIsLoading(true);
      const response = await TradingAPI.getCurrentUser();
      
      if (response.authenticated && response.user) {
        setUser(response.user);
        
        // Sync theme to localStorage and apply
        if (response.user.theme) {
          localStorage.setItem('theme', response.user.theme);
          applyTheme(response.user.theme);
        }
      } else {
        setUser(null);
        // Check localStorage for theme preference
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
          applyTheme(savedTheme);
        }
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const applyTheme = (theme: 'light' | 'dark') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const login = async () => {
    try {
      // Redirect to Google OAuth login
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      window.location.href = `${apiUrl}/api/auth/google/login`;
    } catch (error) {
      console.error('Failed to initiate login:', error);
      // Show user-friendly error message
      alert('Failed to initiate login. Please check that the backend is running and Google OAuth is configured.');
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await TradingAPI.login(email, password);
      if (response.user) {
        // Set user immediately from response
        setUser(response.user);
        // Verify authentication by loading user (but don't clear if it fails)
        try {
          const verifyResponse = await TradingAPI.getCurrentUser();
          if (verifyResponse.authenticated && verifyResponse.user) {
            setUser(verifyResponse.user);
          }
          // If verification fails but we have user from login, keep it
        } catch (verifyError) {
          console.warn('User verification failed, but keeping user from login response');
        }
      } else {
        // If no user in response, try to load it
        await loadUser();
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      setUser(null);
      throw error; // Re-throw to let the component handle it
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name?: string) => {
    try {
      setIsLoading(true);
      const response = await TradingAPI.signup(email, password, name);
      if (response.user) {
        // Set user immediately from response
        setUser(response.user);
        // Verify authentication by loading user (but don't clear if it fails)
        try {
          const verifyResponse = await TradingAPI.getCurrentUser();
          if (verifyResponse.authenticated && verifyResponse.user) {
            setUser(verifyResponse.user);
          }
          // If verification fails but we have user from signup, keep it
        } catch (verifyError) {
          console.warn('User verification failed, but keeping user from signup response');
        }
      } else {
        // If no user in response, try to load it
        await loadUser();
      }
    } catch (error: any) {
      console.error('Signup failed:', error);
      setUser(null);
      throw error; // Re-throw to let the component handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await TradingAPI.logout();
      localStorage.removeItem('auth_token');
      setUser(null);
      // Redirect to home or reload
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to logout:', error);
      // Still clear local state even if API call fails
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const updateTheme = async (theme: 'light' | 'dark') => {
    try {
      if (user) {
        await TradingAPI.updateTheme(theme);
        setUser({ ...user, theme });
      }
      localStorage.setItem('theme', theme);
      applyTheme(theme);
    } catch (error) {
      console.error('Failed to update theme:', error);
      // Still apply theme locally
      localStorage.setItem('theme', theme);
      applyTheme(theme);
    }
  };

  const refreshUser = async () => {
    await loadUser();
  };

  const updateProfile = async (name?: string, email?: string, profilePictureUrl?: string) => {
    try {
      const response = await TradingAPI.updateProfile(name, email, profilePictureUrl);
      if (response.user) {
        setUser(response.user);
        // Apply theme if it changed
        if (response.user.theme) {
          localStorage.setItem('theme', response.user.theme);
          applyTheme(response.user.theme);
        }
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      await TradingAPI.changePassword(currentPassword, newPassword);
    } catch (error) {
      console.error('Failed to change password:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    loginWithEmail,
    signup,
    logout,
    updateTheme,
    updateProfile,
    changePassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

