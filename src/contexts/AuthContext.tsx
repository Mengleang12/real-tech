import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  roles?: string[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  permissions: string[];
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isModerator: boolean;
  isAdminOrModerator: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      verifyToken(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Fetch permissions when user/token changes
  useEffect(() => {
    if (token && user) {
      fetchPermissions(token);
    } else {
      setPermissions([]);
    }
  }, [token, user?.id]);

  const fetchPermissions = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/permissions`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
    }
  };

  const verifyToken = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/me`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        
        if (response.status === 403 && (data.status === 'banned' || data.status === 'suspended')) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          setToken(null);
          setUser(null);
          sessionStorage.setItem('ban_info', JSON.stringify({
            status: data.status,
            reason: data.reason,
            suspendedUntil: data.suspended_until,
          }));
          window.location.href = '/auth';
          return;
        }
        
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
        return;
      }
      
      const data = await response.json();
      
      if (data.user) {
        setUser(data.user);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
      }
    } catch (error) {
      console.error('Token verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        return { error: new Error(data.error || data.message || 'Registration failed') };
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await response.json();
      
      if (response.status === 403 && (data.status === 'banned' || data.status === 'suspended')) {
        return { error: new Error(data.error || 'Your account has been restricted.') };
      }
      
      if (!response.ok || data.error) {
        return { error: new Error(data.error || data.message || 'Login failed') };
      }
      
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
    setPermissions([]);
  };

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
  };

  const hasRole = (role: string) => user?.roles?.includes(role) || false;
  const hasPermission = (permission: string) => permissions.includes(permission);

  const isSuperAdmin = hasRole('super_admin');
  const isAdmin = hasRole('admin') || isSuperAdmin;
  const isModerator = hasRole('moderator');
  const isAdminOrModerator = isAdmin || isModerator || permissions.length > 0;

  return (
    <AuthContext.Provider value={{ 
      user, token, loading, permissions, signUp, signIn, signOut, updateUser,
      hasRole, hasPermission, isAdmin, isSuperAdmin, isModerator, isAdminOrModerator
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const getAuthHeader = () => {
  const token = localStorage.getItem('auth_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
