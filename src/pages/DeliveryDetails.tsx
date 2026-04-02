import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import {
  ALL_COUNTRIES,
  findCountryByName,
  findStateByName,
  getCitiesByCountryAndStateName,
  getStatesByCountryName,
} from '@/lib/locationOptions';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type DeliveryAddress = {
  name: string;
  mobile: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gender: string;
  country: string;
};

const EMPTY_ADDRESS: DeliveryAddress = {
  name: '',
  mobile: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  gender: '',
  country: '',
};

const DELIVERY_ADDRESSES_KEY = 'delivery_addresses';
const DELIVERY_SELECTED_INDEX_KEY = 'delivery_selected_address_index';
const DELIVERY_DETAILS_KEY = 'delivery_details';
const MAX_STORED_ADDRESSES = 2;

const normalizeAddress = (data: Partial<DeliveryAddress> = {}): DeliveryAddress => ({
  name: String(data.name || '').trim(),
  mobile: String(data.mobile || '').trim(),
  address: String(data.address || '').trim(),
  city: String(data.city || '').trim(),
  state: String(data.state || '').trim(),
  pincode: String(data.pincode || '').trim(),
  gender: String(data.gender || '').trim(),
  country: String(data.country || '').trim(),
});

const isAddressComplete = (data: Partial<DeliveryAddress>) => {
  const normalized = normalizeAddress(data);
  return Boolean(
    normalized.name &&
    normalized.mobile &&
    normalized.address &&
    normalized.city &&
    normalized.state &&
    normalized.pincode &&
    normalized.gender &&
    normalized.country
  );
};

const isValidMobile = (mobile: string) => /^\d{10}$/.test(mobile);
const isValidPincode = (pincode: string) => /^\d{6}$/.test(pincode);

const areAddressesEqual = (a: DeliveryAddress, b: DeliveryAddress) =>
  a.name === b.name &&
  a.mobile === b.mobile &&
  a.address === b.address &&
  a.city === b.city &&
  a.state === b.state &&
  a.pincode === b.pincode &&
  a.gender === b.gender &&
  a.country === b.country;

const DeliveryDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [showAddressForm, setShowAddressForm] = useState(true);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState<DeliveryAddress>(EMPTY_ADDRESS);

  const hasSavedAddresses = addresses.length > 0;
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

  const storageUserKey = useMemo(() => {
    try {
      const cachedUser = JSON.parse(localStorage.getItem('fresco_user') || '{}');
      const base = String(user?.email || user?.username || cachedUser?.email || cachedUser?.username || 'guest')
        .trim()
        .toLowerCase();
      return base.replace(/[^a-z0-9@._-]/g, '_');
    } catch {
      return String(user?.email || user?.username || 'guest').trim().toLowerCase() || 'guest';
    }
  }, [user?.email, user?.username]);

  const addressesStorageKey = `${DELIVERY_ADDRESSES_KEY}_${storageUserKey}`;
  const selectedIndexStorageKey = `${DELIVERY_SELECTED_INDEX_KEY}_${storageUserKey}`;

  const persistAddresses = (nextAddresses: DeliveryAddress[], nextSelectedIndex: number) => {
    localStorage.setItem(addressesStorageKey, JSON.stringify(nextAddresses));
    localStorage.setItem(selectedIndexStorageKey, String(nextSelectedIndex));
    localStorage.setItem(DELIVERY_DETAILS_KEY, JSON.stringify(nextAddresses[nextSelectedIndex]));
  };

  const parseStoredAddresses = (): DeliveryAddress[] => {
    const raw = localStorage.getItem(addressesStorageKey) || localStorage.getItem(DELIVERY_ADDRESSES_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((address) => normalizeAddress(address || {}))
        .filter((address) => isAddressComplete(address))
        .slice(0, MAX_STORED_ADDRESSES);
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const initializeAddress = async () => {
      const product = localStorage.getItem('selected_product');
      if (!product) {
        navigate('/products');
        return;
      }
      setSelectedProduct(JSON.parse(product));

      const profile = await fetchUserProfile();
      const normalizedProfile = profile && isAddressComplete(profile) ? normalizeAddress(profile) : null;

      let mergedAddresses = parseStoredAddresses();

      if (normalizedProfile?.mobile) {
        mergedAddresses = mergedAddresses.filter((address) => address.mobile === normalizedProfile.mobile);
      }

      // Migrate legacy single-address storage if needed.
      if (!mergedAddresses.length) {
        const legacyAddress = localStorage.getItem(DELIVERY_DETAILS_KEY);
        if (legacyAddress) {
          try {
            const normalizedLegacy = normalizeAddress(JSON.parse(legacyAddress));
            if (
              isAddressComplete(normalizedLegacy) &&
              (!normalizedProfile?.mobile || normalizedLegacy.mobile === normalizedProfile.mobile)
            ) {
              mergedAddresses = [normalizedLegacy];
            }
          } catch {
            // Ignore malformed local storage payloads.
          }
        }
      }

      // Always prioritize the latest saved profile from DB for the signed-in user.
      if (normalizedProfile) {
        const existingIndex = mergedAddresses.findIndex((address) => areAddressesEqual(address, normalizedProfile));
        if (existingIndex >= 0) {
          mergedAddresses[existingIndex] = normalizedProfile;
        } else {
          mergedAddresses = [normalizedProfile, ...mergedAddresses].slice(0, MAX_STORED_ADDRESSES);
        }
      }

      if (mergedAddresses.length) {
        const storedIndex = Number(
          localStorage.getItem(selectedIndexStorageKey) || localStorage.getItem(DELIVERY_SELECTED_INDEX_KEY)
        );
        const safeIndex = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < mergedAddresses.length
          ? storedIndex
          : 0;

        setAddresses(mergedAddresses);
        setSelectedAddressIndex(safeIndex);
        setFormData(mergedAddresses[safeIndex]);
        setShowAddressForm(false);
        setEditingAddressIndex(null);
        persistAddresses(mergedAddresses, safeIndex);
      } else {
        setAddresses([]);
        setSelectedAddressIndex(0);
        setFormData(EMPTY_ADDRESS);
        setShowAddressForm(true);
        setEditingAddressIndex(null);
      }
    };

    initializeAddress();
  }, [navigate, user?.email, user?.username, addressesStorageKey, selectedIndexStorageKey]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const profile = await response.json();
        return normalizeAddress({
          name: profile.fullName || profile.name || '',
          mobile: profile.mobileNumber || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
          gender: profile.gender || '',
          country: profile.country || '',
        });
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const saveUserProfile = async (addressToSave: DeliveryAddress) => {
    const token = localStorage.getItem('fresco_token');
    if (!token) return false;

    try {
      const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: addressToSave.name,
          mobileNumber: addressToSave.mobile,
          address: addressToSave.address,
          city: addressToSave.city,
          state: addressToSave.state,
          pincode: addressToSave.pincode,
          gender: addressToSave.gender,
          country: addressToSave.country,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  };

  const saveAddress = async (e: FormEvent) => {
    e.preventDefault();
    const normalizedAddress = normalizeAddress(formData);

    if (!isAddressComplete(normalizedAddress)) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidMobile(normalizedAddress.mobile)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid 10-digit mobile number.',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidPincode(normalizedAddress.pincode)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid 6-digit pincode.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const profileSaved = await saveUserProfile(normalizedAddress);
    setLoading(false);

    if (!profileSaved) {
      toast({
        title: 'Save Failed',
        description: 'Could not save address to your account. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    let nextAddresses = [...addresses];
    let nextSelectedIndex = selectedAddressIndex;

    if (editingAddressIndex !== null && editingAddressIndex < nextAddresses.length) {
      nextAddresses[editingAddressIndex] = normalizedAddress;
      nextSelectedIndex = editingAddressIndex;
    } else if (nextAddresses.length < MAX_STORED_ADDRESSES) {
      nextAddresses = [...nextAddresses, normalizedAddress];
      nextSelectedIndex = nextAddresses.length - 1;
    } else {
      nextAddresses[nextSelectedIndex] = normalizedAddress;
    }

    setAddresses(nextAddresses);
    setSelectedAddressIndex(nextSelectedIndex);
    setFormData(nextAddresses[nextSelectedIndex]);
    setEditingAddressIndex(null);
    setShowAddressForm(false);
    persistAddresses(nextAddresses, nextSelectedIndex);

    toast({
      title: 'Address Saved',
      description: 'Confirm address to continue to payment.',
    });
  };

  const openNewAddressForm = () => {
    setEditingAddressIndex(null);
    setFormData(EMPTY_ADDRESS);
    setShowAddressForm(true);
  };

  const openModifyAddressForm = (index: number) => {
    setEditingAddressIndex(index);
    setFormData(addresses[index]);
    setShowAddressForm(true);
  };

  const onCountryChange = (value: string) => {
    setFormData((prev) => ({ ...prev, country: value, state: '', city: '' }));
  };

  const onStateChange = (value: string) => {
    setFormData((prev) => ({ ...prev, state: value, city: '' }));
  };

  const goBackToSavedAddresses = () => {
    if (!addresses.length) return;
    setShowAddressForm(false);
    setEditingAddressIndex(null);
    setFormData(addresses[selectedAddressIndex]);
  };

  const selectAddress = (index: number) => {
    setSelectedAddressIndex(index);
    setFormData(addresses[index]);
    persistAddresses(addresses, index);
  };

  const confirmAddress = () => {
    const selectedAddress = addresses[selectedAddressIndex];
    if (!selectedAddress) {
      toast({
        title: 'Address Required',
        description: 'Please add and select a delivery address first.',
        variant: 'destructive',
      });
      setShowAddressForm(true);
      return;
    }

    localStorage.setItem(selectedIndexStorageKey, String(selectedAddressIndex));
    localStorage.setItem(DELIVERY_DETAILS_KEY, JSON.stringify(selectedAddress));
    navigate('/payment');
  };

  if (!selectedProduct) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6 sm:py-8 px-4 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 sm:mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">Delivery Details</h1>
          <p className="text-muted-foreground">Enter your delivery address for your order</p>
        </div>

        <Card className="border-2 border-[#255c45] shadow-sm">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex items-center gap-2 text-2xl sm:text-base">
                <MapPin className="w-5 h-5 text-primary" />
                {showAddressForm
                  ? editingAddressIndex !== null
                    ? `Modify Address ${editingAddressIndex + 1}`
                    : 'Add Address'
                  : 'Saved Addresses'}
              </span>

              {showAddressForm && hasSavedAddresses && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-[#255c45]"
                  onClick={goBackToSavedAddresses}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}

              {!showAddressForm && addresses.length < MAX_STORED_ADDRESSES && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-[#255c45]"
                  onClick={openNewAddressForm}
                >
                  Add New Address
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 sm:space-y-2">
            {showAddressForm ? (
              <form onSubmit={saveAddress} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number *</Label>
                  <Input
                    id="mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                    placeholder="Enter 10-digit mobile number"
                    maxLength={10}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="h-10 w-full appearance-none rounded-md border border-[#255c45] bg-white px-3 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:border-[#255c45] focus:ring-0 bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke-width=%222%22%20stroke=%22%23255c45%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-[length:1rem_1rem]"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter your complete address"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">Country *</Label>
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => onCountryChange(e.target.value)}
                      className="h-10 w-full appearance-none rounded-md border border-[#255c45] bg-white px-3 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:border-[#255c45] focus:ring-0 bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke-width=%222%22%20stroke=%22%23255c45%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-[length:1rem_1rem]"
                      required
                    >
                      <option value="">Select country</option>
                      {ALL_COUNTRIES.map((country) => (
                        <option key={country.isoCode} value={country.name}>
                          {country.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State *</Label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={(e) => onStateChange(e.target.value)}
                      disabled={!hasMatchedCountry}
                      className="h-10 w-full appearance-none rounded-md border border-[#255c45] bg-white px-3 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:border-[#255c45] focus:ring-0 bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke-width=%222%22%20stroke=%22%23255c45%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-[length:1rem_1rem] disabled:bg-muted/50 disabled:text-muted-foreground"
                      required
                    >
                      <option value="">{hasMatchedCountry ? 'Select state' : 'Select country first'}</option>
                      {states.map((state) => (
                        <option key={`${state.countryCode}-${state.isoCode}`} value={state.name}>
                          {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City *</Label>
                    <select
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      disabled={!hasMatchedState}
                      className="h-10 w-full appearance-none rounded-md border border-[#255c45] bg-white px-3 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:border-[#255c45] focus:ring-0 bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke-width=%222%22%20stroke=%22%23255c45%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20/%3E%3C/svg%3E')] bg-[position:right_0.75rem_center] bg-[length:1rem_1rem] disabled:bg-muted/50 disabled:text-muted-foreground"
                      required
                    >
                      <option value="">{hasMatchedState ? 'Select city' : 'Select state first'}</option>
                      {cities.map((city) => (
                        <option key={`${city.name}-${city.latitude}-${city.longitude}`} value={city.name}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      placeholder="Enter 6-digit pincode"
                      maxLength={6}
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90" disabled={loading}>
                  {loading ? 'Saving Address...' : editingAddressIndex !== null ? 'Update Address' : 'Save Address'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="space-y-3">
                  {addresses.map((address, index) => {
                    const isSelected = selectedAddressIndex === index;
                    return (
                      <div
                        key={`${address.mobile}-${index}`}
                        className={`rounded-lg border-2 p-5 sm:p-6 transition-colors ${
                          isSelected ? 'border-[#255c45] bg-primary/5' : 'border-[#255c45]/40 bg-muted/10'
                        }`}
                      >
                        <p className="font-semibold">{address.name}</p>
                        <p className="text-muted-foreground">{address.mobile}</p>
                        <p className="text-muted-foreground">Gender: {address.gender}</p>
                        <p className="text-muted-foreground">{address.address}</p>
                        <p className="text-muted-foreground">Country: {address.country} | State: {address.state}</p>
                        <p className="text-muted-foreground">City: {address.city} | Pincode: {address.pincode}</p>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          {isSelected ? (
                            <span className="inline-flex h-8 sm:h-9 items-center rounded-md bg-[#255c45] px-3 text-xs sm:text-sm font-semibold text-white">
                              Selected Address
                            </span>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-8 sm:h-9 border-2 border-[#255c45] px-3 text-xs sm:text-sm"
                              onClick={() => selectAddress(index)}
                            >
                              Select Address
                            </Button>
                          )}

                          <Button
                            type="button"
                            variant="outline"
                            className="ml-auto h-8 sm:h-9 border-2 border-[#255c45] px-3 text-xs sm:text-sm"
                            onClick={() => openModifyAddressForm(index)}
                          >
                            Modify Address
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-sm text-muted-foreground">You can save up to 2 addresses and choose one for this order.</p>

                <Button type="button" onClick={confirmAddress} className="w-full bg-gradient-hero hover:opacity-90">
                  Confirm Address
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryDetails;
