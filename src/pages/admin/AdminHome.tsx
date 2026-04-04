import { Card } from '@/components/ui/card';
import { useCallback, useEffect, useState } from 'react';
import { Leaf, Package, Users, MessageSquare, UserCog, Trash2, TicketPercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import ConfirmActionDialog from "@/components/ConfirmActionDialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AdminHome = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super-admin';
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [offerSettings, setOfferSettings] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [savingOfferSettings, setSavingOfferSettings] = useState(false);
  const [hasPendingOfferChanges, setHasPendingOfferChanges] = useState(false);
  const [generatingCoupon, setGeneratingCoupon] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    name: '',
    discountAmount: '0',
    minPurchase: '0',
    maxUses: '0',
    perUserLimit: '1',
    isPublic: false,
  });

  const loadDashboardStats = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/dashboard-stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          signOut();
          toast({
            title: 'Session expired',
            description: 'Please sign in again to continue.',
            variant: 'destructive',
          });
          navigate('/signin', { replace: true, state: { redirectTo: '/admin' } });
          return;
        }

        throw new Error(`Failed to load dashboard stats (${res.status})`);
      }

      const data = await res.json();
      setProductsCount(Number(data.productsCount || 0));
      setOrdersCount(Number(data.ordersCount || 0));
      setCustomersCount(Number(data.customersCount || 0));
      setAdminsCount(Number(data.adminsCount || 0));
      setFeedbackCount(Number(data.feedbackCount || 0));
    } catch (error) {
      console.error('Error loading admin dashboard stats:', error);
      if (!silent) {
        toast({
          title: 'Dashboard load failed',
          description: 'Could not fetch latest counts and feedback.',
          variant: 'destructive',
        });
      }
    }
  }, [navigate, signOut, toast]);

  useEffect(() => {
    loadDashboardStats();

    const refreshOnFocus = () => {
      loadDashboardStats({ silent: true });
    };

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        loadDashboardStats({ silent: true });
      }
    };

    const intervalId = window.setInterval(() => {
      loadDashboardStats({ silent: true });
    }, 15000);

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [loadDashboardStats]);

  const loadOfferData = useCallback(async () => {
    if (!isSuperAdmin) return;
    try {
      const token = localStorage.getItem('fresco_token');
      const [settingsRes, couponsRes] = await Promise.all([
        fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/settings`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/coupons`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setOfferSettings(settingsData);
        setHasPendingOfferChanges(false);
      }

      if (couponsRes.ok) {
        const couponsData = await couponsRes.json();
        setCoupons(Array.isArray(couponsData) ? couponsData : []);
      }
    } catch {
      toast({
        title: 'Offer data load failed',
        description: 'Could not load offer settings right now.',
        variant: 'destructive',
      });
    }
  }, [isSuperAdmin, toast]);

  useEffect(() => {
    loadOfferData();
  }, [loadOfferData]);

  const updateOfferSettings = async (newSettings?: any) => {
    if (!isSuperAdmin) return;
    const settingsToSave = newSettings || offerSettings;
    if (!settingsToSave) return;
    if (!hasPendingOfferChanges) return;
    try {
      setSavingOfferSettings(true);
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          welcome: settingsToSave.welcome,
          deliveredMilestone: settingsToSave.deliveredMilestone,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to update (${res.status})`);
      }

      const updated = await res.json();
      setOfferSettings(updated);
      setHasPendingOfferChanges(false);
      toast({ title: 'Offer settings saved', description: 'Discount rules updated successfully.' });
    } catch {
      toast({ title: 'Save failed', description: 'Could not update offer settings.', variant: 'destructive' });
    } finally {
      setSavingOfferSettings(false);
    }
  };

  const generateCoupon = async () => {
    if (!isSuperAdmin) return;
    try {
      setGeneratingCoupon(true);
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          code: couponForm.code || undefined,
          name: couponForm.name || undefined,
          discountAmount: Number(couponForm.discountAmount || 0),
          minPurchase: Number(couponForm.minPurchase || 0),
          maxUses: Number(couponForm.maxUses || 0),
          perUserLimit: Number(couponForm.perUserLimit || 1),
          isPublic: Boolean(couponForm.isPublic),
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || `Failed to create coupon (${res.status})`);
      }

      toast({ title: 'Coupon generated', description: 'New coupon is now active.' });
      setCouponForm((prev) => ({ ...prev, code: '', name: '', isPublic: false }));
      await loadOfferData();
    } catch (error: any) {
      toast({ title: 'Coupon create failed', description: error?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setGeneratingCoupon(false);
    }
  };

  const toggleCouponVisibility = async (couponId: string, isPublic: boolean) => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/coupons/${couponId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ isPublic }),
      });

      if (!res.ok) throw new Error('update failed');
      await loadOfferData();
    } catch {
      toast({ title: 'Coupon update failed', description: 'Could not update coupon visibility.', variant: 'destructive' });
    }
  };

  const [couponToDelete, setCouponToDelete] = useState<string | null>(null);

  const deleteCoupon = async () => {
    if (!couponToDelete) return;
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/offers/super-admin/coupons/${couponToDelete}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error('delete failed');
      toast({ title: 'Coupon deleted', description: 'The coupon has been permanently removed.' });
      setCouponToDelete(null);
      await loadOfferData();
    } catch {
      toast({ title: 'Coupon delete failed', description: 'Could not delete coupon right now.', variant: 'destructive' });
    }
  };

  return (
    <>
      <section className="relative -mt-16 md:-mt-20 bg-gradient-to-br from-[#1f5b3f] via-[#2f7656] to-[#5ea06e] text-white pt-[calc(4rem+2.5rem)] sm:pt-[calc(4rem+3rem)] md:pt-[calc(5rem+3.5rem)] lg:pt-[calc(5rem+4rem)] pb-10 sm:pb-12 md:pb-14 lg:pb-16 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dv5qxkxmc/image/upload/v1774415349/photo-1542838132-92c53300491e_wdxh2g.jpg')] bg-cover bg-[center_20%] opacity-32"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-[#103626]/55 backdrop-blur-[2px]"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,214,10,0.16),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.12),transparent_45%)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 sm:pt-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold leading-tight">
              Welcome back, {user?.username || 'Admin'}!
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90">
              {isSuperAdmin
                ? 'Super Admin access: full control of products, orders, customers, and feedback.'
                : 'Admin access: view data and update order status from the admin console.'}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl lg:text-4xl font-bold">{isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
        <p className="text-muted-foreground">Live overview of your organic store</p>
      </div>

      <div className={`grid grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-3'} gap-3 sm:gap-6`}>
        <Card className="p-4 sm:p-8 flex items-center justify-center border-2 border-emerald-500 aspect-square sm:aspect-auto sm:min-h-[140px] lg:min-h-0">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-emerald-100">
              <Leaf className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold">Products</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{productsCount}</p>
          </div>
        </Card>

        <Card className="p-4 sm:p-8 flex items-center justify-center border-2 border-amber-500 aspect-square sm:aspect-auto sm:min-h-[140px] lg:min-h-0">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-amber-100">
              <Package className="w-6 h-6 text-amber-700" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold">Orders</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-700">{ordersCount}</p>
          </div>
        </Card>

        {isSuperAdmin && (
          <Card className="p-4 sm:p-8 flex items-center justify-center border-2 border-lime-500 aspect-square sm:aspect-auto sm:min-h-[140px] lg:min-h-0">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-lime-100">
                <Users className="w-6 h-6 text-lime-700" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold">Customers</h3>
              <p className="text-2xl sm:text-3xl font-extrabold text-lime-700">{customersCount}</p>
            </div>
          </Card>
        )}

        {isSuperAdmin && (
          <Card className="p-4 sm:p-8 flex items-center justify-center border-2 border-cyan-500 aspect-square sm:aspect-auto sm:min-h-[140px] lg:min-h-0">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 rounded-full bg-cyan-100">
                <UserCog className="w-6 h-6 text-cyan-700" />
              </div>
              <h3 className="text-base sm:text-xl font-semibold">Admins</h3>
              <p className="text-2xl sm:text-3xl font-extrabold text-cyan-700">{adminsCount}</p>
            </div>
          </Card>
        )}

        <Card
          className={`border-2 flex items-center justify-center border-orange-500 ${
            isSuperAdmin
              ? 'col-span-2 aspect-auto min-h-[120px] p-4 sm:p-8 lg:col-span-1 lg:min-h-0'
              : 'col-span-2 sm:col-span-1 p-4 sm:p-8 aspect-auto min-h-[120px] sm:aspect-square lg:aspect-auto'
          }`}
        >
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="p-3 rounded-full bg-orange-100">
              <MessageSquare className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-base sm:text-xl font-semibold">Unread Feedback</h3>
            <p className="text-2xl sm:text-3xl font-extrabold text-orange-700">{feedbackCount}</p>
          </div>
        </Card>
      </div>

      {isSuperAdmin && offerSettings && (
        <>
          <div className="mt-12 mb-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold">Coupons & Offers</h2>
            <p className="text-base sm:text-lg text-muted-foreground">Manage automatic rules and create custom discount codes</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-end">
          <Card className="p-6 border-2 border-[#255c45] space-y-4 flex flex-col">
            <h2 className="text-xl font-bold">Offer Rule Controls</h2>

            <div className="rounded-md border border-[#255c45] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">Welcome Offer</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {offerSettings.welcome?.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <Switch
                    checked={Boolean(offerSettings.welcome?.enabled)}
                    onCheckedChange={(checked) => {
                      setOfferSettings((prev: any) => {
                        setHasPendingOfferChanges(true);
                        return {
                          ...prev,
                          welcome: { ...prev.welcome, enabled: checked },
                        };
                      });
                    }}
                  />
                </div>
              </div>
              
              {offerSettings.welcome?.enabled && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Discount Amount (Rs)</label>
                    <Input
                      type="number"
                      value={offerSettings.welcome?.discountAmount || 0}
                      onChange={(e) =>
                        setOfferSettings((prev: any) => {
                          setHasPendingOfferChanges(true);
                          return {
                            ...prev,
                            welcome: { ...prev.welcome, discountAmount: Number(e.target.value || 0) },
                          };
                        })
                      }
                      placeholder="Discount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Min Purchase (Rs)</label>
                    <Input
                      type="number"
                      value={offerSettings.welcome?.minPurchase || 0}
                      onChange={(e) =>
                        setOfferSettings((prev: any) => {
                          setHasPendingOfferChanges(true);
                          return {
                            ...prev,
                            welcome: { ...prev.welcome, minPurchase: Number(e.target.value || 0) },
                          };
                        })
                      }
                      placeholder="Min purchase"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-[#255c45] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-lg">Every N Delivered Orders Offer</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {offerSettings.deliveredMilestone?.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <Switch
                    checked={Boolean(offerSettings.deliveredMilestone?.enabled)}
                    onCheckedChange={(checked) => {
                      setOfferSettings((prev: any) => {
                        setHasPendingOfferChanges(true);
                        return {
                          ...prev,
                          deliveredMilestone: { ...prev.deliveredMilestone, enabled: checked },
                        };
                      });
                    }}
                  />
                </div>
              </div>
              
              {offerSettings.deliveredMilestone?.enabled && (
                <div className="pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Every N Orders</label>
                      <Input
                        type="number"
                        value={offerSettings.deliveredMilestone?.everyNDeliveredOrders || 5}
                        onChange={(e) =>
                          setOfferSettings((prev: any) => {
                            setHasPendingOfferChanges(true);
                            return {
                              ...prev,
                              deliveredMilestone: {
                                ...prev.deliveredMilestone,
                                everyNDeliveredOrders: Number(e.target.value || 1),
                              },
                            };
                          })
                        }
                        placeholder="Every N"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Discount Amount (Rs)</label>
                      <Input
                        type="number"
                        value={offerSettings.deliveredMilestone?.discountAmount || 0}
                        onChange={(e) =>
                          setOfferSettings((prev: any) => {
                            setHasPendingOfferChanges(true);
                            return {
                              ...prev,
                              deliveredMilestone: {
                                ...prev.deliveredMilestone,
                                discountAmount: Number(e.target.value || 0),
                              },
                            };
                          })
                        }
                        placeholder="Discount"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 mt-4">
                    <label className="text-xs font-semibold text-muted-foreground">Min Purchase (Rs)</label>
                    <Input
                      type="number"
                      value={offerSettings.deliveredMilestone?.minPurchase || 0}
                      onChange={(e) =>
                        setOfferSettings((prev: any) => {
                          setHasPendingOfferChanges(true);
                          return {
                            ...prev,
                            deliveredMilestone: {
                              ...prev.deliveredMilestone,
                              minPurchase: Number(e.target.value || 0),
                            },
                          };
                        })
                      }
                      placeholder="Min purchase"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => updateOfferSettings()}
              className="bg-[#255c45] hover:bg-[#214f3b] w-full mt-4"
              disabled={savingOfferSettings || !hasPendingOfferChanges}
            >
              {savingOfferSettings ? 'Saving...' : 'Save Offer Settings'}
            </Button>
          </Card>

          <Card className="p-6 border-2 border-[#255c45] space-y-4 flex flex-col">
            <div>
              <h2 className="text-xl font-bold mb-4">Coupon Generator</h2>

              <div className="rounded-md border border-[#255c45] p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Discount Code</label>
                    <Input
                      value={couponForm.code}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                      placeholder="e.g. SUMMER50"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Discount Amount (Rs)</label>
                    <Input
                      type="number"
                      value={couponForm.discountAmount}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, discountAmount: e.target.value }))}
                      placeholder="e.g. 50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Max Uses (Total)</label>
                    <Input
                      type="number"
                      value={couponForm.maxUses}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                      placeholder="0 = Unlimited uses"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-muted-foreground">Per-User Limit</label>
                    <Input
                      type="number"
                      value={couponForm.perUserLimit}
                      onChange={(e) => setCouponForm((prev) => ({ ...prev, perUserLimit: e.target.value }))}
                      placeholder="How many times 1 user can apply it"
                    />
                  </div>
                </div>
                <div className="mt-3.5 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Min Purchase (Rs)</label>
                  <Input
                    type="number"
                    value={couponForm.minPurchase}
                    onChange={(e) => setCouponForm((prev) => ({ ...prev, minPurchase: e.target.value }))}
                    placeholder="e.g. 500"
                  />
                </div>
                <div className="mt-1.5 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Visibility</label>
                  <Select
                    value={couponForm.isPublic ? 'true' : 'false'}
                    onValueChange={(val) => setCouponForm((prev) => ({ ...prev, isPublic: val === 'true' }))}
                  >
                    <SelectTrigger className="bg-white border-[#255c45]">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-[#255c45] bg-white">
                      <SelectItem value="false">Hide (exclusive code)</SelectItem>
                      <SelectItem value="true">Show in all users' carts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Button
              onClick={generateCoupon}
              className="bg-[#255c45] hover:bg-[#214f3b] w-full mt-4"
              disabled={generatingCoupon || !couponForm.code.trim()}
            >
              {generatingCoupon ? 'Generating...' : 'Generate Coupon'}
            </Button>
          </Card>
        </div>
        </>
      )}

      {isSuperAdmin && offerSettings && (
        <div className="mt-8 mb-12">
          <h3 className="text-[1.625rem] sm:text-3xl font-bold mb-4 text-center sm:text-left">Generated Coupons</h3>
          <div className="flex flex-wrap gap-4">
            {coupons.map((coupon) => (
              <div key={coupon.id} className="w-full sm:w-[320px] shrink-0 rounded-xl border-2 border-[#255c45] bg-white p-3 min-h-[110px] flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#1f3f31] line-clamp-1 tracking-wide">{coupon.code}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 text-white rounded-full shrink-0 ${coupon.isPublic ? 'bg-[#255c45]' : 'bg-slate-500'}`}>
                      {coupon.isPublic ? 'Visible' : 'Hidden'}
                    </span>
                  </div>
                  <div className="mt-1.5 min-w-0">
                    <p className="text-sm font-semibold text-[#1a8f68]">Save Rs {coupon.discountAmount} (Min Rs {coupon.minPurchase})</p>
                    <p className="text-xs leading-tight text-muted-foreground mt-1 flex flex-col gap-[2px]">
                      <span>Used: {coupon.usedCount} / {coupon.maxUses || '∞'} times</span>
                      <span>Limit: {coupon.perUserLimit} per user</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="default"
                    className={`h-8 px-1 sm:px-2 text-[10px] sm:text-xs font-medium shrink-0 ${coupon.isPublic ? 'bg-slate-500 hover:bg-slate-600 text-white' : 'bg-[#255c45] hover:bg-[#214f3b] text-white'}`}
                    onClick={() => toggleCouponVisibility(coupon.id, !coupon.isPublic)}
                  >
                    {coupon.isPublic ? 'Hide Tag' : 'Show Tag'}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setCouponToDelete(coupon.id)}
                    title="Delete coupon"
                    className="h-8 px-1 sm:px-2 text-[10px] sm:text-xs font-medium bg-red-500 hover:bg-red-600 gap-1 shrink-0"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
            {!coupons.length && (
              <div className="w-full">
                <Card className="w-full p-6 sm:p-8 text-center border-2 border-[#255c45]">
                  <TicketPercent className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <h3 className="text-2xl font-bold mb-2">No coupons generated</h3>
                  <p className="text-muted-foreground">Generated discount codes will appear here.</p>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    
    <ConfirmActionDialog
      open={!!couponToDelete}
      onOpenChange={(open) => !open && setCouponToDelete(null)}
      title="Delete Coupon"
      description="Are you sure you want to delete this discount code? Users currently checking out won't be able to use it. This cannot be undone."
      confirmLabel="Delete"
      onConfirm={deleteCoupon}
    />
    </>
  );
};

export default AdminHome;
