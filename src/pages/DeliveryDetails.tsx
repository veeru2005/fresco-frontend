import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { MapPin, ArrowRight } from 'lucide-react';

const DeliveryDetails = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(true);
  const [hasSavedAddress, setHasSavedAddress] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const isAddressComplete = (data: any) => {
    return Boolean(
      data?.name &&
      data?.mobile &&
      data?.address &&
      data?.city &&
      data?.state &&
      data?.pincode
    );
  };

  useEffect(() => {
    const initializeAddress = async () => {
      const product = localStorage.getItem('selected_product');
      if (!product) {
        navigate('/products');
        return;
      }
      setSelectedProduct(JSON.parse(product));

      // Always fetch latest saved address from DB for the logged-in user first.
      const username = user?.username || JSON.parse(localStorage.getItem('fresco_user') || '{}')?.username;
      if (username) {
        const profile = await fetchUserProfile();
        if (profile && isAddressComplete(profile)) {
          setHasSavedAddress(true);
          setShowAddressForm(false);
          localStorage.setItem('delivery_details', JSON.stringify(profile));
          return;
        }
      }

      // Fallback to local saved details if DB profile is empty.
      const savedDetails = localStorage.getItem('delivery_details');
      if (savedDetails) {
        const saved = JSON.parse(savedDetails);
        const normalized = {
          name: saved.name || '',
          mobile: saved.mobile || '',
          address: saved.address || '',
          city: saved.city || '',
          state: saved.state || '',
          pincode: saved.pincode || '',
        };

        setFormData(normalized);

        if (isAddressComplete(normalized)) {
          setHasSavedAddress(true);
          setShowAddressForm(false);
          return;
        }
      }

      setShowAddressForm(true);
      setHasSavedAddress(false);
    };

    initializeAddress();
  }, [navigate, user?.username]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile/me`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const profile = await response.json();
        const normalized = {
          name: profile.fullName || '',
          mobile: profile.mobileNumber || '',
          address: profile.address || '',
          city: profile.city || '',
          state: profile.state || '',
          pincode: profile.pincode || '',
        };
        setFormData(normalized);
        return normalized;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  const saveUserProfile = async () => {
    const username = user?.username || JSON.parse(localStorage.getItem('fresco_user') || '{}')?.username;
    if (!username) return false;

    try {
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/user-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          username,
          fullName: formData.name,
          mobileNumber: formData.mobile,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Error saving user profile:', error);
      return false;
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.mobile || !formData.address || !formData.city || !formData.state || !formData.pincode) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.mobile.length !== 10 || !/^\d+$/.test(formData.mobile)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid 10-digit mobile number.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.pincode.length !== 6 || !/^\d+$/.test(formData.pincode)) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid 6-digit pincode.',
        variant: 'destructive',
      });
      return;
    }

    // Save user profile to database
    setLoading(true);
    const profileSaved = await saveUserProfile();
    setLoading(false);

    if (!profileSaved) {
      toast({
        title: 'Save Failed',
        description: 'Could not save address to your account. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    localStorage.setItem('delivery_details', JSON.stringify(formData));

    setHasSavedAddress(true);
    setShowAddressForm(false);

    toast({
      title: 'Address Saved',
      description: 'Confirm address to continue to payment.',
    });
  };

  const confirmAddress = () => {
    localStorage.setItem('delivery_details', JSON.stringify(formData));
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
                {showAddressForm ? 'Add Address' : 'Saved Address'}
              </span>
              {!showAddressForm && hasSavedAddress && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-[#255c45]"
                  onClick={() => setShowAddressForm(true)}
                >
                  Modify Address
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
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      placeholder="Enter 10-digit mobile number"
                      maxLength={10}
                      required
                    />
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
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="City"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="State"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode *</Label>
                    <Input
                      id="pincode"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="Enter 6-digit pincode"
                      maxLength={6}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90" disabled={loading}>
                    {loading ? 'Saving Address...' : 'Save Address'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
            </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-lg border-2 border-[#255c45] p-5 sm:p-6 bg-muted/20">
                  <p className="font-semibold">{formData.name}</p>
                  <p className="text-muted-foreground">{formData.mobile}</p>
                  <p className="text-muted-foreground">{formData.address}</p>
                  <p className="text-muted-foreground">{formData.city}, {formData.state} - {formData.pincode}</p>
                </div>

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
