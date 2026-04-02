import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SolidUserIcon from '@/components/SolidUserIcon';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Mail, Smartphone } from 'lucide-react';
import {
  ALL_COUNTRIES,
  findCountryByName,
  findStateByName,
  getCitiesByCountryAndStateName,
  getStatesByCountryName,
} from '@/lib/locationOptions';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.role === 'super-admin');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gender: '',
    country: '',
  });

  const hasMatchedCountry = useMemo(() => Boolean(findCountryByName(formData.country)), [formData.country]);
  const states = useMemo(() => getStatesByCountryName(formData.country), [formData.country]);
  const hasMatchedState = useMemo(
    () => Boolean(findStateByName(formData.country, formData.state)),
    [formData.country, formData.state]
  );
  const cities = useMemo(
    () => getCitiesByCountryAndStateName(formData.country, formData.state),
    [formData.country, formData.state]
  );

  const onCountryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, country: value, state: '', city: '' }));
  };

  const onStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value, city: '' }));
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const token = localStorage.getItem('fresco_token');
        const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (response.ok) {
          const profile = await response.json();
          setFormData({
            fullName: profile.fullName || profile.name || user?.username || '',
            email: profile.email || user?.email || '',
            mobileNumber: profile.mobileNumber || '',
            address: profile.address || '',
            city: profile.city || '',
            state: profile.state || '',
            pincode: profile.pincode || '',
            gender: profile.gender || '',
            country: profile.country || '',
          });
          return;
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      }

      setFormData((prev) => ({
        ...prev,
        fullName: user?.fullName || user?.username || '',
        email: user?.email || '',
        mobileNumber: user?.mobileNumber || '',
        address: user?.address || '',
        city: user?.city || '',
        state: user?.state || '',
        pincode: user?.pincode || '',
        gender: user?.gender || '',
        country: user?.country || '',
      }));
    };

    loadProfile().finally(() => setLoading(false));
  }, [user]);

  const validate = () => {
    if (!formData.fullName.trim()) return 'Please enter your full name.';
    if (!/^\d{10}$/.test(formData.mobileNumber.trim())) return 'Please enter a valid 10-digit mobile number.';
    if (!formData.address.trim()) return 'Please enter your address.';
    if (!formData.city.trim()) return 'Please enter your city.';
    if (!formData.state.trim()) return 'Please enter your state.';
    if (!/^\d{6}$/.test(formData.pincode.trim())) return 'Please enter a valid 6-digit pincode.';
    if (!formData.gender.trim()) return 'Please select your gender.';
    if (!formData.country.trim()) return 'Please enter your country.';
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;

    const validationError = validate();
    if (validationError) {
      toast({ title: 'Validation error', description: validationError, variant: 'destructive' });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          ...(isSuperAdmin ? { email: formData.email } : {}),
          mobileNumber: formData.mobileNumber,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gender: formData.gender,
          country: formData.country,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Profile save failed';
        try {
          const payload = await response.json();
          if (payload?.error) {
            errorMessage = payload.error;
          }
        } catch {
          // Keep fallback error message.
        }
        throw new Error(errorMessage);
      }

      const rawUser = localStorage.getItem('fresco_user');
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          const merged = {
            ...parsed,
            fullName: formData.fullName,
            ...(isSuperAdmin ? { email: formData.email } : {}),
            mobileNumber: formData.mobileNumber,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            gender: formData.gender,
            country: formData.country,
          };
          localStorage.setItem('fresco_user', JSON.stringify(merged));
        } catch {
          // Ignore local cache update failure.
        }
      }

      toast({ title: 'Profile updated', description: 'Your profile details were saved successfully.', variant: 'success' });
      setIsEditing(false);
    } catch (error) {
      toast({
        title: 'Save failed',
        description: error instanceof Error ? error.message : 'Could not save profile details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 pb-10 sm:pb-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal and delivery details</p>
        </div>

        <Card className="border-2 border-[#255c45] p-5 sm:p-7">
          {loading ? (
            <p className="text-muted-foreground">Loading profile...</p>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border-2 border-[#255c45] bg-[#255c45]/5 p-3">
                <span className="inline-flex h-10 w-10 shrink-0 aspect-square items-center justify-center rounded-full bg-amber-400 text-[#255c45]">
                  <SolidUserIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-semibold">{user?.username || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{user?.role || 'user'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="profile-full-name">Full Name *</Label>
                  <Input
                    id="profile-full-name"
                    value={formData.fullName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="Enter your full name"
                    
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="profile-email">Email</Label>
                  <Input
                    id="profile-email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    disabled={!isEditing || !isSuperAdmin}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-mobile">Mobile Number *</Label>
                  <Input
                    id="profile-mobile"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mobileNumber: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    
                    disabled={!isEditing || !isSuperAdmin}
                    placeholder="10-digit mobile"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-gender">Gender *</Label>
                  <Select
                    value={formData.gender || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, gender: value }))}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="profile-gender" className="h-10 border-[#255c45] disabled:bg-slate-50">
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
                  <Label htmlFor="profile-address">Address *</Label>
                  <Textarea
                    id="profile-address"
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    rows={3}
                    placeholder="Enter your complete address"
                    
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-country">Country *</Label>
                  <Select value={formData.country || undefined} onValueChange={onCountryChange} disabled={!isEditing}>
                    <SelectTrigger id="profile-country" className="h-10 border-[#255c45] disabled:bg-slate-50">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-xl border-[#255c45] bg-white">
                      {ALL_COUNTRIES.map((country) => (
                        <SelectItem key={country.isoCode} value={country.name}>
                          {country.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-state">State *</Label>
                  <Select
                    value={formData.state || undefined}
                    onValueChange={onStateChange}
                    disabled={!isEditing || !hasMatchedCountry}
                  >
                    <SelectTrigger id="profile-state" className="h-10 border-[#255c45] disabled:bg-slate-50">
                      <SelectValue placeholder={hasMatchedCountry ? 'Select state' : 'Select country first'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)] rounded-xl border-[#255c45] bg-white sm:w-auto sm:min-w-[var(--radix-select-trigger-width)]">
                      {states.map((state) => (
                        <SelectItem key={`${state.countryCode}-${state.isoCode}`} value={state.name} className="truncate">
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-city">City *</Label>
                  <Select
                    value={formData.city || undefined}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, city: value }))}
                    disabled={!isEditing || !hasMatchedState}
                  >
                    <SelectTrigger id="profile-city" className="h-10 border-[#255c45] disabled:bg-slate-50">
                      <SelectValue placeholder={hasMatchedState ? 'Select city' : 'Select state first'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72 rounded-xl border-[#255c45] bg-white">
                      {cities.map((city) => (
                        <SelectItem key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>
                          {city.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="profile-pincode">Pincode *</Label>
                  <Input
                    id="profile-pincode"
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6),
                      }))
                    }
                    placeholder="6-digit pincode"
                    maxLength={6}
                    
                    disabled={!isEditing}
                    required
                  />
                </div>
              </div>

              {!isEditing ? (
                <div className="pt-2">
                  <Button
                    type="button"
                    className="w-full bg-gradient-hero hover:opacity-90"
                    onClick={() => setIsEditing(true)}
                  >
                    Edit Profile
                  </Button>
                </div>
              ) : (
                <div className="flex gap-3 pt-6">
                  <Button
                    type="button"
                    className="w-full border border-amber-300 bg-amber-400 text-slate-900 hover:bg-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-hero hover:opacity-90"
                    disabled={saving}
                  >
                    {saving ? 'Saving profile...' : 'Save Profile'}
                  </Button>
                </div>
              )}
            </form>
          )}
        </Card>

        {!isSuperAdmin && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="border-2 border-[#255c45] p-5 flex flex-col items-center justify-between text-center gap-4">
              <div className="w-full">
                <h3 className="flex items-center justify-center gap-2 font-semibold text-lg text-[#255c45]">
                  <Mail className="h-5 w-5" />
                  Email Address
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Update your email address</p>
              </div>
              <Button
                type="button"
                className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                onClick={() => toast({ title: 'Coming Soon', description: 'Change email feature will be available soon.'})}
              >
                Change Email
              </Button>
            </Card>
            <Card className="border-2 border-[#255c45] p-5 flex flex-col items-center justify-between text-center gap-4">
              <div className="w-full">
                <h3 className="flex items-center justify-center gap-2 font-semibold text-lg text-[#255c45]">
                  <Smartphone className="h-5 w-5" />
                  Mobile Number
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Update your mobile number</p>
              </div>
              <Button
                type="button"
                className="w-full bg-gradient-hero hover:opacity-90 transition-opacity"
                onClick={() => toast({ title: 'Coming Soon', description: 'Change mobile number feature will be available soon.'})}
              >
                Change Mobile
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;
