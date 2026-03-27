import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

interface User {
  username: string;
  email: string;
  role?: 'user' | 'admin' | 'super-admin';
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  profilePic?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (idToken: string, mode?: 'signin' | 'signup') => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getRoleFromToken = (token?: string): string | null => {
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      const payload = JSON.parse(atob(padded));
      return typeof payload?.role === 'string' ? payload.role.toLowerCase() : null;
    } catch {
      return null;
    }
  };

  const applyAuthPayload = (data: any, fallbackUsername?: string) => {
    const role = String(data.role || data.user?.role || getRoleFromToken(data.token) || 'user').toLowerCase();
    const usernameValue = data.username || data.user?.name || fallbackUsername || 'user';
    const emailValue = data.email || data.user?.email || '';
    const userData = {
      username: usernameValue,
      email: emailValue,
      role: role as User['role'],
      isAdmin: role === 'admin' || role === 'super-admin',
      isSuperAdmin: role === 'super-admin',
      profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${usernameValue}`,
    };

    setUser(userData);
    localStorage.setItem('fresco_user', JSON.stringify(userData));
    if (data.token) {
      localStorage.setItem('fresco_token', data.token);
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('fresco_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User & {
          name?: string;
          role?: string;
          isAdmin?: boolean;
          isSuperAdmin?: boolean;
        };
        const normalizedRole = String(parsedUser?.role || 'user').toLowerCase();
        const normalizedUser: User = {
          username: parsedUser?.username || parsedUser?.name || 'user',
          email: parsedUser?.email || '',
          role: normalizedRole as User['role'],
          isAdmin:
            parsedUser?.isAdmin === true ||
            parsedUser?.isSuperAdmin === true ||
            normalizedRole === 'admin' ||
            normalizedRole === 'super-admin',
          isSuperAdmin: parsedUser?.isSuperAdmin === true || normalizedRole === 'super-admin',
          profilePic:
            parsedUser?.profilePic ||
            `https://api.dicebear.com/7.x/avataaars/svg?seed=${parsedUser?.username || parsedUser?.name || 'user'}`,
        };
        setUser(normalizedUser);
        localStorage.setItem('fresco_user', JSON.stringify(normalizedUser));
      } catch {
        localStorage.removeItem('fresco_user');
      }
    }
    setIsAuthReady(true);
  }, []);

  const signUp = async (username: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      if (res.ok) {
        return { success: true };
      } else if (res.status === 409) {
        return { success: false, error: 'Username already exists. Please choose another one.' };
      } else {
        const errorText = await res.text();
        return { success: false, error: errorText || 'Sign up failed. Please try again.' };
      }
    } catch (error) {
      console.error('Sign up error - backend not available:', error);
      return { success: false, error: 'Sign up failed. Something went wrong. Please ensure the backend is running.' };
    }
  };

  const signIn = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        applyAuthPayload(data, username);
        return { success: true };
      } else if (res.status === 401) {
        return { success: false, error: 'Invalid username or password.' };
      } else {
        const errorText = await res.text();
        return { success: false, error: errorText || 'Sign in failed. Please try again.' };
      }
    } catch (error) {
      console.error('Sign in error - backend not available:', error);
      return { success: false, error: 'Sign in failed. Something went wrong. Please ensure the backend is running.' };
    }
  };

  const signInWithGoogle = async (
    idToken: string,
    mode: 'signin' | 'signup' = 'signin'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, mode }),
      });

      if (!res.ok) {
        let errorMessage = 'Google sign-in failed';
        try {
          const payload = await res.json();
          errorMessage = payload?.error || errorMessage;
        } catch {
          const errorText = await res.text();
          if (errorText) errorMessage = errorText;
        }
        return { success: false, error: errorMessage };
      }

      const data = await res.json();
      applyAuthPayload(data);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('fresco_user');
    localStorage.removeItem('fresco_token');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isAuthReady, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
