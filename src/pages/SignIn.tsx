import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';
import Lottie from 'lottie-react';

const GOOGLE_SCRIPT_ID = 'google-identity-script';

const isValidGoogleClientId = (clientId?: string) =>
  !!clientId &&
  clientId.endsWith('.apps.googleusercontent.com') &&
  !clientId.includes('YOUR_GOOGLE_OAUTH_CLIENT_ID');

const ensureGoogleScript = () =>
  new Promise<void>((resolve, reject) => {
    const loaded = (window as any).google?.accounts?.id;
    if (loaded) {
      resolve();
      return;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google script')), {
        once: true,
      });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = GOOGLE_SCRIPT_ID;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.body.appendChild(script);
  });

const SignIn = () => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const googleButtonHostRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const { signInWithGoogle, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const getPostAuthRedirect = useCallback(() => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('fresco_user') || '{}');
      if (storedUser?.isAdmin) return '/admin';
    } catch {
      // Fall back to in-memory user if localStorage parsing fails.
    }

    if (user?.isAdmin) return '/admin';

    const explicitRedirect = (location.state as any)?.redirectTo;
    if (explicitRedirect) return explicitRedirect;

    return '/dashboard';
  }, [location.state, user]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getPostAuthRedirect());
    }
  }, [getPostAuthRedirect, isAuthenticated, navigate]);

  useEffect(() => {
    fetch('/Login.json')
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((err) => console.error('Error loading animation:', err));
  }, []);

  useEffect(() => {
    ensureGoogleScript().catch(() => {
      // Surface full failure only on click; keep page usable.
    });
  }, []);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!isValidGoogleClientId(clientId)) return;

    let isMounted = true;
    ensureGoogleScript()
      .then(() => {
        if (!isMounted) return;
        const googleObj = (window as any).google;
        const host = googleButtonHostRef.current;
        if (!googleObj?.accounts?.id || !host) return;

        googleObj.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (!response?.credential) {
              setLoading(false);
              toast({
                title: 'Google Sign-In Failed',
                description: 'No credential received from Google.',
                variant: 'destructive',
              });
              return;
            }

            const result = await signInWithGoogle(response.credential, 'signin');
            setLoading(false);

            if (result.success) {
              toast({ title: 'Signed in with Google', description: 'Welcome to Fresco Organics!', variant: 'success' });
              navigate(getPostAuthRedirect());
            } else {
              toast({ title: 'Google Sign-In Failed', description: result.error || 'Please try again.', variant: 'destructive' });
            }
          },
          ux_mode: 'popup',
        });

        host.innerHTML = '';
        googleObj.accounts.id.renderButton(host, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'pill',
        });
        setGoogleReady(true);
      })
      .catch(() => {
        setGoogleReady(false);
      });

    return () => {
      isMounted = false;
    };
  }, [getPostAuthRedirect, navigate, signInWithGoogle, toast]);

  const handleGoogleSignInFallback = () => {
    if (!googleReady) {
      toast({
        title: 'Google Sign-In Unavailable',
        description: 'Google button is still loading. Please try again in a moment.',
        variant: 'destructive',
      });
      return;
    }

    const googleObj = (window as any).google;
    googleObj?.accounts?.id?.prompt?.();
  };

  return (
    <div className="min-h-full flex items-start justify-center px-4 pt-8 sm:pt-10 bg-background sm:bg-gradient-to-br sm:from-primary/10 sm:via-background sm:to-secondary/10">
      <div className="w-full max-w-[460px] mx-auto">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-amber-400 p-3 rounded-2xl shadow-sm">
            <ShoppingCart className="w-7 h-7 text-[#2f7656]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#2f7656] leading-none">
            Fresco <span className="text-amber-500 !text-2xl sm:!text-3xl !font-bold">Organics</span>
          </p>
        </div>

        <Card className="w-full p-6 sm:p-8 shadow-xl border-2 border-[#2f7656] rounded-3xl">
          <div className="flex flex-col items-center gap-5">
            <div className="text-center w-full">
              <h1 className="text-2xl sm:text-3xl font-bold">Login</h1>
              <p className="text-muted-foreground mt-2">Sign in instantly with Google</p>
            </div>

            <div className="w-full max-w-[300px]">
              {animationData && (
                <Lottie
                  animationData={animationData}
                  loop
                  style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}
                />
              )}
            </div>

            <div className="flex flex-col items-center w-full gap-5">
              <div className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 flex items-center justify-center gap-3 border-2 border-[#255c45] hover:bg-muted font-bold text-lg rounded-xl shadow-lg"
                  onClick={handleGoogleSignInFallback}
                  disabled={loading}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {loading ? 'Signing in...' : 'Sign in with Google'}
                </Button>
                <div
                  ref={googleButtonHostRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    pointerEvents: googleReady ? 'auto' : 'none',
                  }}
                  aria-hidden="true"
                />
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary font-bold hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignIn;
