import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart } from 'lucide-react';
import Lottie from 'lottie-react';
import {
  ALLOWED_SERVICE_LOCATIONS,
  DEFAULT_COUNTRY,
  DEFAULT_STATE,
  getAllowedPincodesForCity,
  isAllowedPincodeForCity,
  isAllowedServiceLocation,
} from '@/lib/locationOptions';
import { getGoogleClientIdForCurrentOrigin, getGoogleOriginConfigMessage } from '@/lib/googleAuth';

const GOOGLE_SCRIPT_ID = 'google-identity-script';

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

const getProfileValidationError = (profile: {
  fullName: string;
  mobileNumber: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gender: string;
  country: string;
}) => {
  if (!profile.fullName.trim()) return 'Please enter your full name.';
  if (!/^\d{10}$/.test(profile.mobileNumber.trim())) return 'Please enter a valid 10-digit mobile number.';
  if (!profile.address.trim()) return 'Please enter your address.';
  if (!isAllowedServiceLocation(profile.city)) return 'Please select city from the allowed locations.';
  if (profile.state.trim() !== DEFAULT_STATE) return 'State must be Andhra Pradesh.';
  if (!/^\d{6}$/.test(profile.pincode.trim())) return 'Please enter a valid 6-digit pincode.';
  if (!isAllowedPincodeForCity(profile.city, profile.pincode)) {
    const allowed = getAllowedPincodesForCity(profile.city);
    return allowed.length
      ? `Pincode must be ${allowed.join(', ')} for ${profile.city}.`
      : 'Selected city is not serviceable.';
  }
  if (!profile.gender.trim()) return 'Please select your gender.';
  if (profile.country.trim() !== DEFAULT_COUNTRY) return 'Country must be India.';
  return null;
};

const SignUp = () => {
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [pendingGoogleCredential, setPendingGoogleCredential] = useState<string | null>(null);
  const googleButtonHostRef = useRef<HTMLDivElement | null>(null);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleUnavailableReason, setGoogleUnavailableReason] = useState('Google button is still loading. Please try again in a moment.');
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: DEFAULT_STATE,
    pincode: '',
    gender: '',
    country: DEFAULT_COUNTRY,
  });
  const [mobileError, setMobileError] = useState<string | null>(null);

  const profileFormRef = useRef(profileForm);
  const { signInWithGoogle, isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    profileFormRef.current = profileForm;
  }, [profileForm]);

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

  const handleGoogleCredential = useCallback(
    (response: any) => {
      if (!response?.credential) {
        toast({
          title: 'Google Sign-Up Failed',
          description: 'No credential received from Google.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const payloadPart = response.credential.split('.')[1];
        const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(normalized));
        if (decoded?.name && !profileFormRef.current.fullName) {
          setProfileForm((prev) => ({ ...prev, fullName: decoded.name }));
        }
      } catch {
        // Ignore parse errors safely.
      }

      setPendingGoogleCredential(response.credential);
    },
    [toast]
  );

  const initializeGoogleButton = useCallback(async () => {
    const clientId = getGoogleClientIdForCurrentOrigin();
    if (!clientId) {
      setGoogleReady(false);
      setGoogleUnavailableReason(getGoogleOriginConfigMessage());
      return false;
    }

    try {
      await ensureGoogleScript();

      const googleObj = (window as any).google;
      const host = googleButtonHostRef.current;
      if (!googleObj?.accounts?.id || !host) {
        setGoogleReady(false);
        return false;
      }

      googleObj.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
      });

      host.innerHTML = '';
      googleObj.accounts.id.renderButton(host, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signup_with',
        shape: 'pill',
      });

      setGoogleReady(true);
      setGoogleUnavailableReason('Google button is still loading. Please try again in a moment.');
      return true;
    } catch {
      setGoogleReady(false);
      setGoogleUnavailableReason('Google sign-up failed to initialize. Please check your network and OAuth origin settings.');
      return false;
    }
  }, [handleGoogleCredential]);

  useEffect(() => {
    void initializeGoogleButton();
  }, [initializeGoogleButton]);

  const handleCompleteSignUp = async () => {
    if (!pendingGoogleCredential) return;

    const profilePayload = {
      ...profileForm,
      country: DEFAULT_COUNTRY,
      state: DEFAULT_STATE,
    };

    const validationError = getProfileValidationError(profilePayload);
    if (validationError) {
      toast({
        title: 'Profile details required',
        description: validationError,
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
  const result = await signInWithGoogle(pendingGoogleCredential, 'signup', profilePayload);
    setLoading(false);

    if (result.success) {
      toast({ title: 'Account ready', description: 'Signed up successfully.', variant: 'success' });
      navigate(getPostAuthRedirect());
    } else {
      if (result.error?.toLowerCase().includes('mobile')) {
         setMobileError(result.error);
         toast({ title: 'Sign-Up Failed', description: 'Please provide a different mobile number.', variant: 'destructive' });
      } else {
        toast({ title: 'Sign-Up Failed', description: result.error || 'Please try again.', variant: 'destructive' });
        // If the backend says account already exists (409), we might want to reset or redirect
        if (result.error?.includes('Account already exists')) {
           navigate('/signin');
        }
      }
    }
  };

  const handleGoogleSignUpFallback = async () => {
    const ready = googleReady || (await initializeGoogleButton());
    if (!ready) {
      toast({
        title: 'Google Sign-Up Unavailable',
        description: googleUnavailableReason,
        variant: 'destructive',
      });
      return;
    }

    const googleObj = (window as any).google;
    googleObj?.accounts?.id?.prompt?.();
  };

  return (
    <div className="min-h-full flex items-start justify-center px-4 pb-24 pt-6 sm:pb-16 sm:pt-8 lg:pb-20 bg-background sm:bg-gradient-to-br sm:from-primary/10 sm:via-background sm:to-secondary/10">
      <div className="w-full max-w-[460px] mx-auto">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="bg-amber-400 p-3 rounded-2xl shadow-sm">
            <ShoppingCart className="w-7 h-7 text-[#2f7656]" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#2f7656] leading-none">
            Fresco <span className="text-amber-500 !text-2xl sm:!text-3xl !font-bold">Organics</span>
          </p>
        </div>

        <Card className="w-full rounded-3xl border-[2.5px] border-[#255c45] p-5 shadow-xl sm:p-7">
          <div className="flex flex-col items-center gap-4 sm:gap-5">
            <div className="text-center w-full">
              <h1 className="text-2xl sm:text-3xl font-bold">{!pendingGoogleCredential ? 'Signup' : 'Complete Profile'}</h1>
              <p className="text-muted-foreground mt-2">
                {!pendingGoogleCredential ? 'Continue with Google to start' : 'Almost there! Fill in your delivery details'}
              </p>
            </div>

            {!pendingGoogleCredential && (
              <div className="w-full max-w-[250px] sm:max-w-[300px]">
                {animationData && (
                  <Lottie
                    animationData={animationData}
                    loop
                    style={{ width: '100%', margin: '0 auto' }}
                  />
                )}
              </div>
            )}

            {pendingGoogleCredential && (
            <div className="flex flex-col items-center w-full gap-4 sm:gap-5">
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={profileForm.fullName}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="mobileNumber">Mobile Number *</Label>
                  <Input
                    id="mobileNumber"
                    value={profileForm.mobileNumber}
                    onChange={(e) => {
                      setMobileError(null);
                      setProfileForm((prev) => ({
                        ...prev,
                        mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                      }));
                    }}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    required
                    className={mobileError ? 'border-red-500 focus-visible:ring-red-500' : ''}
                  />
                  {mobileError && <p className="text-sm font-medium text-red-500 mt-1">{mobileError}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select
                    value={profileForm.gender || undefined}
                    onValueChange={(value) => setProfileForm((prev) => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger id="gender" className="h-10 border-[#255c45]">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-xl border-[#255c45] bg-white">
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address *</Label>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    If you are a faculty member or student at KL University, please mention your cabin or room number.
                  </p>
                  <Textarea
                    id="address"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter your full address"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" value={DEFAULT_COUNTRY} disabled readOnly className="h-10 border-[#255c45] disabled:bg-slate-50" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="state">State *</Label>
                  <Input id="state" value={DEFAULT_STATE} disabled readOnly className="h-10 border-[#255c45] disabled:bg-slate-50" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">City *</Label>
                  <Select
                    value={profileForm.city || undefined}
                    onValueChange={(value) => setProfileForm((prev) => ({ ...prev, city: value, pincode: '' }))}
                  >
                    <SelectTrigger id="city" className="h-10 border-[#255c45]">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-xl border-[#255c45] bg-white">
                      {ALLOWED_SERVICE_LOCATIONS.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={profileForm.pincode}
                    onChange={(e) =>
                      setProfileForm((prev) => ({
                        ...prev,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    placeholder="6-digit pincode"
                    maxLength={6}
                    required
                  />
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    {profileForm.city
                      ? `Allowed pincode for ${profileForm.city}: ${getAllowedPincodesForCity(profileForm.city).join(', ') || 'N/A'}`
                      : 'Select city first to see allowed pincode.'}
                  </p>
                </div>
              </div>
              
              <div className="w-full mt-4">
                <Button
                  type="button"
                  className="w-full h-12 bg-[#255c45] hover:bg-[#1a4030] text-white font-bold text-lg rounded-xl shadow-lg"
                  onClick={handleCompleteSignUp}
                  disabled={loading}
                >
                  {loading ? 'Setting up account...' : 'Complete Sign Up'}
                </Button>
              </div>
            </div>
            )}

            {!pendingGoogleCredential && (
              <div className="relative w-full">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 sm:h-14 flex items-center justify-center gap-3 border-2 border-[#255c45] hover:bg-muted font-bold text-base sm:text-lg rounded-xl shadow-lg relative overflow-hidden"
                  onClick={handleGoogleSignUpFallback}
                  disabled={loading}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {loading ? 'Please wait...' : 'Sign up with Google'}
                  <div
                    ref={googleButtonHostRef}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      zIndex: 10,
                      pointerEvents: googleReady ? 'auto' : 'none',
                    }}
                    className="cursor-pointer"
                  />
                </Button>
              </div>
            )}

            {!pendingGoogleCredential && (
              <div className="text-center text-sm">
                <span className="text-muted-foreground font-medium">Already have an account? </span>
                <Link to="/signin" className="text-primary font-bold hover:underline">
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default SignUp;
