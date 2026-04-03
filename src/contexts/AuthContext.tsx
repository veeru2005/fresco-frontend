import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const SESSION_EXPIRY_KEY = 'fresco_session_expires_at';

interface User {
  id?: string;
  username: string;
  email: string;
  role?: 'user' | 'admin' | 'super-admin';
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  profilePic?: string;
  fullName?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gender?: string;
  country?: string;
}

interface ProfilePayload {
  fullName: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gender: string;
  country: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAuthReady: boolean;
  signIn: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    idToken: string,
    mode?: 'signin' | 'signup',
    profile?: Partial<ProfilePayload>
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem('fresco_user');
    localStorage.removeItem('fresco_token');
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  }, []);

  const getTokenPayload = (token?: string): Record<string, unknown> | null => {
    if (!token) return null;
    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;
      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
      return JSON.parse(atob(padded));
    } catch {
      return null;
    }
  };

  const getRoleFromToken = (token?: string): string | null => {
    const payload = getTokenPayload(token);
    return typeof payload?.role === 'string' ? payload.role.toLowerCase() : null;
  };

  const getTokenExpiryMs = (token?: string): number | null => {
    const payload = getTokenPayload(token);
    const exp = payload?.exp;
    return typeof exp === 'number' ? exp * 1000 : null;
  };

  const computeSessionExpiry = (token?: string): number => {
    const maxSessionExpiry = Date.now() + SESSION_DURATION_MS;
    const tokenExpiry = getTokenExpiryMs(token);
    return tokenExpiry ? Math.min(maxSessionExpiry, tokenExpiry) : maxSessionExpiry;
  };

  const applyAuthPayload = (data: any, fallbackUsername?: string) => {
    const role = String(data.role || data.user?.role || getRoleFromToken(data.token) || 'user').toLowerCase();
    const usernameValue = data.username || data.user?.name || fallbackUsername || 'user';
    const emailValue = data.email || data.user?.email || '';

    const userData = {
      id: data.user?.id,
      username: usernameValue,
      email: emailValue,
      role: role as User['role'],
      isAdmin: role === 'admin' || role === 'super-admin',
      isSuperAdmin: role === 'super-admin',
      profilePic: `https://api.dicebear.com/7.x/avataaars/svg?seed=${usernameValue}`,
      fullName: data.user?.fullName || '',
      mobileNumber: data.user?.mobileNumber || '',
      address: data.user?.address || '',
      city: data.user?.city || '',
      state: data.user?.state || '',
      pincode: data.user?.pincode || '',
      gender: data.user?.gender || '',
      country: data.user?.country || '',
    };

    setUser(userData);
    localStorage.setItem('fresco_user', JSON.stringify(userData));
    if (data.token) {
      localStorage.setItem('fresco_token', data.token);
      localStorage.setItem(SESSION_EXPIRY_KEY, String(computeSessionExpiry(data.token)));
    } else {
      clearStoredAuth();
    }
  };

  const signOut = useCallback(() => {
    setUser(null);
    clearStoredAuth();
  }, [clearStoredAuth]);

  useEffect(() => {
    const storedUser = localStorage.getItem('fresco_user');
    const storedToken = localStorage.getItem('fresco_token');
    const rawSessionExpiry = localStorage.getItem(SESSION_EXPIRY_KEY);

    if (!storedUser || !storedToken || !rawSessionExpiry) {
      clearStoredAuth();
      setIsAuthReady(true);
      return;
    }

    const storedSessionExpiry = Number(rawSessionExpiry);
    const tokenExpiry = getTokenExpiryMs(storedToken);
    const effectiveExpiry =
      Number.isFinite(storedSessionExpiry) && storedSessionExpiry > 0
        ? tokenExpiry
          ? Math.min(storedSessionExpiry, tokenExpiry)
          : storedSessionExpiry
        : null;

    if (!effectiveExpiry || effectiveExpiry <= Date.now()) {
      clearStoredAuth();
      setIsAuthReady(true);
      return;
    }

    localStorage.setItem(SESSION_EXPIRY_KEY, String(effectiveExpiry));

    try {
      const parsedUser = JSON.parse(storedUser) as User & {
        name?: string;
        role?: string;
        isAdmin?: boolean;
        isSuperAdmin?: boolean;
      };
      const normalizedRole = String(parsedUser?.role || 'user').toLowerCase();
      const normalizedUser: User = {
        id: parsedUser?.id,
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
        fullName: parsedUser?.fullName || '',
        mobileNumber: parsedUser?.mobileNumber || '',
        address: parsedUser?.address || '',
        city: parsedUser?.city || '',
        state: parsedUser?.state || '',
        pincode: parsedUser?.pincode || '',
        gender: parsedUser?.gender || '',
        country: parsedUser?.country || '',
      };
      setUser(normalizedUser);
      localStorage.setItem('fresco_user', JSON.stringify(normalizedUser));
    } catch {
      clearStoredAuth();
    }

    setIsAuthReady(true);
  }, [clearStoredAuth]);

  useEffect(() => {
    if (!user) return;

    const storedSessionExpiry = Number(localStorage.getItem(SESSION_EXPIRY_KEY));
    if (!Number.isFinite(storedSessionExpiry) || storedSessionExpiry <= Date.now()) {
      signOut();
      return;
    }

    const timeoutId = window.setTimeout(() => {
      signOut();
    }, storedSessionExpiry - Date.now());

    return () => window.clearTimeout(timeoutId);
  }, [user, signOut]);

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

      let errorMessage = '';
      if (!res.ok) {
        try {
          const payload = await res.json();
          errorMessage = payload?.error || '';
        } catch {
          errorMessage = await res.text();
        }
      }

      if (res.ok) {
        const data = await res.json();
        applyAuthPayload(data, username);
        return { success: true };
      } else if (res.status === 404) {
        return { success: false, error: errorMessage || 'User not found. Please sign up first.' };
      } else if (res.status === 401) {
        return { success: false, error: errorMessage || 'Invalid username or password.' };
      } else {
        return { success: false, error: errorMessage || 'Sign in failed. Please try again.' };
      }
    } catch (error) {
      console.error('Sign in error - backend not available:', error);
      return { success: false, error: 'Sign in failed. Something went wrong. Please ensure the backend is running.' };
    }
  };

  const signInWithGoogle = async (
    idToken: string,
    mode: 'signin' | 'signup' = 'signin',
    profile?: Partial<ProfilePayload>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${VITE_API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, mode, ...(profile || {}) }),
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

      if (profile && Object.keys(profile).length > 0) {
        setUser((prev) => {
          if (!prev) return prev;
          const merged = {
            ...prev,
            fullName: String(profile.fullName || prev.fullName || '').trim(),
            mobileNumber: String(profile.mobileNumber || prev.mobileNumber || '').trim(),
            address: String(profile.address || prev.address || '').trim(),
            city: String(profile.city || prev.city || '').trim(),
            state: String(profile.state || prev.state || '').trim(),
            pincode: String(profile.pincode || prev.pincode || '').trim(),
            gender: String(profile.gender || prev.gender || '').trim(),
            country: String(profile.country || prev.country || '').trim(),
          };
          localStorage.setItem('fresco_user', JSON.stringify(merged));
          return merged;
        });
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Google sign-in failed. Please try again.' };
    }
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
