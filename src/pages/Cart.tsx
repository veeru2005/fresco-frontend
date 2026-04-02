import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCart, updateCartQty, removeFromCart, saveCart, type CartItem } from '@/lib/cart';
import { previewOffers, type OfferPreviewResponse } from '@/lib/offers';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const FREE_DELIVERY_THRESHOLD = 250;
const DELIVERY_CHARGE = 20;

const Cart = () => {
  const { isAuthenticated, isAuthReady } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>(() => getCart());
  const [isCartReady, setIsCartReady] = useState(false);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});
  const [offerPreview, setOfferPreview] = useState<OfferPreviewResponse | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCouponCode, setAppliedCouponCode] = useState(() => localStorage.getItem('fresco_applied_coupon') || '');
  const [offersLoading, setOffersLoading] = useState(false);

  const syncCartAvailability = async (silent = false) => {
    if (!silent) {
      setIsCartReady(false);
    }

    try {
      const currentCart = getCart();
      if (!currentCart.length) {
        setItems([]);
        return;
      }

      let products: any[] = [];
      try {
        const res = await fetch(`${VITE_API_BASE_URL}/api/products`);
        if (res.ok) {
          products = await res.json();
        }
      } catch {
        // Fallback to local products below.
      }

      if (!products.length) {
        try {
          const stored = localStorage.getItem('fresco_products');
          products = stored ? JSON.parse(stored) : [];
        } catch {
          products = [];
        }
      }

      const productMap = new Map(products.map((p) => [String(p.id || p._id), p]));
      const synced = currentCart.map((item) => {
        const product = productMap.get(String(item.id));
        return {
          ...item,
          unit: product?.unit || item.unit || 'kg',
          available: product ? Boolean(product.available) : item.available ?? true,
        };
      });

      saveCart(synced);
      setItems(synced);
    } finally {
      if (!silent) {
        setIsCartReady(true);
      }
    }
  };

  useEffect(() => {
    if (!isAuthReady) return;

    if (!isAuthenticated) {
      setItems([]);
      setOfferPreview(null);
      setIsCartReady(true);
      return;
    }

    void syncCartAvailability(false);

    const onProductsUpdate = () => {
      void syncCartAvailability(true);
    };

    window.addEventListener('fresco_products_updated', onProductsUpdate);
    return () => window.removeEventListener('fresco_products_updated', onProductsUpdate);
  }, [isAuthReady, isAuthenticated]);

  const subtotal = useMemo(
    () => items.filter((item) => item.available !== false).reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const totalPayable = subtotal + deliveryCharge;
  // Apply offer values only when user explicitly applied one from the cart UI.
  const selectedOfferPreview = offerPreview?.applied?.source === 'COUPON' ? offerPreview : null;
  const effectiveDelivery = Number(selectedOfferPreview?.deliveryCharge ?? deliveryCharge);
  const effectiveDiscount = Number(selectedOfferPreview?.discountAmount || 0);
  const effectiveTotal = Number(selectedOfferPreview?.payableAmount ?? totalPayable);

  const loadOfferPreview = async (couponCode?: string) => {
    if (!isAuthenticated || subtotal <= 0) {
      setOfferPreview(null);
      return;
    }

    try {
      setOffersLoading(true);
      const data = await previewOffers({
        subtotal,
        deliveryCharge,
        couponCode: couponCode || undefined,
      });
      setOfferPreview(data);
    } catch {
      setOfferPreview(null);
    } finally {
      setOffersLoading(false);
    }
  };

  const refresh = () => setItems(getCart());

  const welcomeOffer = useMemo(
    () => offerPreview?.offers?.find((offer) => offer.type === 'WELCOME') || null,
    [offerPreview]
  );

  const milestoneOffer = useMemo(
    () => offerPreview?.offers?.find((offer) => offer.type === 'EVERY_5_DELIVERED') || null,
    [offerPreview]
  );

  const activeCoupons = useMemo(
    () => offerPreview?.offers?.filter((offer) => offer.type === 'COUPON') || [],
    [offerPreview]
  );

  const appliedSource = offerPreview?.applied?.source;
  const appliedType = String(offerPreview?.applied?.type || '').toUpperCase();
  const appliedCode = String(offerPreview?.applied?.code || '').toUpperCase();
  const isWelcomeApplied = appliedSource === 'COUPON' && (appliedType === 'WELCOME' || appliedCode === 'WELCOME30');
  const isMilestoneApplied =
    appliedSource === 'COUPON' && (appliedType === 'EVERY_5_DELIVERED' || appliedCode === 'MILESTONE');

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const item of items) {
      nextDrafts[item.id] = String(item.quantity);
    }
    setQtyDrafts(nextDrafts);
  }, [items]);

  useEffect(() => {
    if (!items.length) {
      setOfferPreview(null);
      return;
    }
    loadOfferPreview(appliedCouponCode || undefined);
  }, [subtotal, deliveryCharge, isAuthenticated, items.length, appliedCouponCode]);

  const onQtyChange = (id: string, qty: number) => {
    updateCartQty(id, qty);
    refresh();
  };

  const onQtyInputChange = (id: string, value: string) => {
    if (value === '') {
      setQtyDrafts((prev) => ({ ...prev, [id]: '' }));
      return;
    }

    if (!/^\d+$/.test(value)) return;

    setQtyDrafts((prev) => ({ ...prev, [id]: value }));
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return;
    onQtyChange(id, Math.max(1, parsed));
  };

  const onQtyInputBlur = (id: string) => {
    const draft = qtyDrafts[id];
    if (draft === '' || !/^\d+$/.test(draft)) {
      const existing = items.find((item) => item.id === id);
      setQtyDrafts((prev) => ({ ...prev, [id]: String(existing?.quantity ?? 1) }));
    }
  };

  const onRemove = (id: string) => {
    removeFromCart(id);
    refresh();
  };

  const onCheckout = () => {
    if (!items.length) return;

    const hasOutOfStock = items.some((item) => item.available === false);
    if (hasOutOfStock) {
      toast({
        title: 'Out of stock items in cart',
        description: 'Please remove out-of-stock items before checkout.',
        variant: 'destructive',
      });
      return;
    }

    const first = items[0];
    localStorage.setItem('checkout_source', 'cart');
    localStorage.setItem('selected_cart', JSON.stringify(items));
    localStorage.setItem('selected_product', JSON.stringify(first));
    localStorage.setItem(
      'checkout_offer',
      JSON.stringify({
        couponCode: appliedCouponCode || null,
      })
    );
    navigate('/delivery-details');
  };

  const onApplyCoupon = async () => {
    const normalized = couponInput.trim().toUpperCase();
    if (!normalized) {
      setAppliedCouponCode('');
      localStorage.removeItem('fresco_applied_coupon');
      loadOfferPreview(undefined);
      return;
    }

    await applyCouponCode(normalized);
  };

  const applyCouponCode = async (code: string) => {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) return;

    try {
      setOffersLoading(true);
      const data = await previewOffers({
        subtotal,
        deliveryCharge,
        couponCode: normalized,
      });

      setOfferPreview(data);

      if (data.coupon?.status !== 'valid') {
        toast({
          title: 'Coupon invalid',
          description: data.coupon?.reason || 'Could not apply coupon',
          variant: 'destructive',
        });
        setAppliedCouponCode('');
        localStorage.removeItem('fresco_applied_coupon');
        setCouponInput('');
        return;
      }

      setAppliedCouponCode(normalized);
      localStorage.setItem('fresco_applied_coupon', normalized);
      setCouponInput('');
      toast({ title: 'Coupon applied', description: `${normalized} applied successfully.` });
    } catch {
      toast({ title: 'Coupon failed', description: 'Could not validate coupon right now.', variant: 'destructive' });
    } finally {
      setOffersLoading(false);
    }
  };

  const onApplyWelcomeCoupon = () => {
    void applyCouponCode('WELCOME30');
  };

  const onApplyMilestoneCoupon = () => {
    void applyCouponCode('MILESTONE');
  };

  if (!isAuthReady || (isAuthenticated && !isCartReady)) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-5xl">
          <Card className="w-full p-8 sm:p-10 text-center border-2 border-[#255c45]">
            <p className="text-lg font-semibold">Loading your cart...</p>
            <p className="text-muted-foreground mt-2">Please wait while we prepare your items.</p>
          </Card>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-10 text-center border-2 border-[#255c45]">
            <ShoppingBag className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-3">Sign in to view your cart</h1>
            <p className="text-muted-foreground mb-6">Please sign in to add items and continue checkout.</p>
            <div className="flex justify-center gap-3">
              <Link to="/signin" state={{ redirectTo: '/cart' }}>
                <Button>Sign In</Button>
              </Link>
              <Link to="/products">
                <Button variant="outline">Browse Products</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <Card className="w-full p-8 sm:p-10 text-center border-2 border-[#255c45]">
            <ShoppingBag className="w-14 h-14 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-4xl font-bold mb-3">Your Fresco cart is empty</h1>
            <p className="text-muted-foreground mb-6">Check out our fresh produce and add some items to your cart!</p>
            <Link to="/products">
              <Button className="bg-emerald-700 hover:bg-emerald-800">
                Start Shopping
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 pb-44 lg:pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Cart</h1>

        <section className="mb-5 space-y-3">
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-lg font-bold">Available offers for you</p>
              </div>
            </div>

            <div className="flex overflow-x-auto overflow-y-hidden overscroll-x-contain touch-pan-x snap-x snap-mandatory gap-3 pb-3 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {welcomeOffer && (
                <div className="w-[260px] sm:w-[280px] shrink-0 snap-start rounded-xl border-2 border-[#255c45] bg-white p-2.5 min-h-[96px] flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#1f3f31]">First Order Welcome</p>
                    <p className="text-xs font-semibold text-[#1a8f68] shrink-0">Save Rs {welcomeOffer.originalDiscount || welcomeOffer.discountAmount || 30}</p>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold tracking-wide text-[#255c45]">WELCOME30</p>
                      <p className="text-[11px] leading-tight text-muted-foreground mt-0.5 truncate">
                        {welcomeOffer.eligible ? 'Eligible now on this order' : welcomeOffer.reason}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={isWelcomeApplied ? () => {
                        setAppliedCouponCode('');
                        localStorage.removeItem('fresco_applied_coupon');
                      } : onApplyWelcomeCoupon}
                      disabled={offersLoading || (!welcomeOffer.eligible && !isWelcomeApplied)}
                      className={`h-7 px-3 text-[11px] font-medium shrink-0 ${
                        isWelcomeApplied
                          ? 'bg-[#1a8f68] hover:bg-[#157152] text-white'
                          : welcomeOffer.eligible
                            ? 'bg-[#255c45] hover:bg-[#214f3b] text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isWelcomeApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </div>
                </div>
              )}

              {milestoneOffer && (
                <div className="w-[260px] sm:w-[280px] shrink-0 snap-start rounded-xl border-2 border-[#255c45] bg-white p-2.5 min-h-[96px] flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#1f3f31]">Every 5 Delivered Orders</p>
                    <p className="text-xs font-semibold text-[#1a8f68] shrink-0">Save Rs {milestoneOffer.originalDiscount || milestoneOffer.discountAmount || 50}</p>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold tracking-wide text-[#255c45]">MILESTONE</p>
                      <p className="text-[11px] leading-tight text-muted-foreground mt-0.5 truncate">
                        {milestoneOffer.eligible ? 'Eligible now on this order' : milestoneOffer.reason}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={isMilestoneApplied ? () => {
                        setAppliedCouponCode('');
                        localStorage.removeItem('fresco_applied_coupon');
                      } : onApplyMilestoneCoupon}
                      disabled={offersLoading || (!milestoneOffer.eligible && !isMilestoneApplied)}
                      className={`h-7 px-3 text-[11px] font-medium shrink-0 ${
                        isMilestoneApplied
                          ? 'bg-[#1a8f68] hover:bg-[#157152] text-white'
                          : milestoneOffer.eligible
                            ? 'bg-[#255c45] hover:bg-[#214f3b] text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isMilestoneApplied ? 'Applied' : 'Apply'}
                    </Button>
                  </div>
                </div>
              )}

              {activeCoupons.map((coupon, idx) => (
                <div key={idx} className="w-[260px] sm:w-[280px] shrink-0 snap-start rounded-xl border-2 border-[#255c45] bg-white p-2.5 min-h-[96px] flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-[#1f3f31] line-clamp-1">{coupon.title}</p>
                    <p className="text-xs font-semibold text-[#1a8f68] shrink-0">Save Rs {coupon.discountAmount || '?'}</p>
                  </div>
                  <div className="mt-1 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-base font-bold tracking-wide text-[#255c45]">{coupon.code}</p>
                      <p className="text-[11px] leading-tight text-muted-foreground mt-0.5 truncate">
                        {coupon.eligible ? 'Eligible now on this order' : coupon.reason || `Add Rs ${Math.max(0, (coupon.minPurchase || 0) - subtotal)} more`}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={appliedSource === 'COUPON' && appliedCode === String(coupon.code || '').toUpperCase() ? () => {
                        setAppliedCouponCode('');
                        localStorage.removeItem('fresco_applied_coupon');
                      } : () => { if (coupon.code) void applyCouponCode(coupon.code); }}
                      disabled={offersLoading || (!coupon.eligible && !(appliedSource === 'COUPON' && appliedCode === String(coupon.code || '').toUpperCase()))}
                      className={`h-7 px-3 text-[11px] font-medium shrink-0 ${
                        appliedSource === 'COUPON' && appliedCode === String(coupon.code || '').toUpperCase()
                          ? 'bg-[#1a8f68] hover:bg-[#157152] text-white'
                          : coupon.eligible
                            ? 'bg-[#255c45] hover:bg-[#214f3b] text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {appliedSource === 'COUPON' && appliedCode === String(coupon.code || '').toUpperCase() ? 'Applied' : 'Apply'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        <div className="space-y-4">
          {items.map((item) => (
            <Card key={item.id} className="p-3 sm:p-4 border-2 border-[#255c45]">
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(190px,1fr)_170px] gap-3 sm:gap-4 lg:items-center">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex gap-3 sm:gap-4 items-center min-w-0">
                    <img src={item.image} alt={item.name} className={`w-20 h-20 rounded-md object-cover border-2 border-[#255c45] ${item.available === false ? 'grayscale opacity-70' : ''}`} />
                    <div>
                    <p className="font-semibold text-lg">{item.name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price}/{item.unit || 'kg'}</p>
                    <p className={`text-xs font-semibold mt-1 ${item.available === false ? 'text-red-600' : 'text-emerald-700'}`}>
                      {item.available === false ? 'Out of Stock' : 'In Stock'}
                    </p>
                    </div>
                  </div>

                  <p className="font-bold text-2xl lg:hidden shrink-0">₹{item.price * item.quantity}</p>
                </div>

                <div className="hidden lg:flex lg:items-center lg:justify-center">
                  <div className="h-10 rounded-md border-2 border-[#255c45] overflow-hidden bg-white inline-flex items-stretch">
                    <button
                      type="button"
                      className="w-10 text-lg font-semibold border-r border-[#255c45] disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => onQtyChange(item.id, item.quantity - 1)}
                      disabled={item.available === false || item.quantity <= 1}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={qtyDrafts[item.id] ?? String(item.quantity)}
                      onChange={(e) => onQtyInputChange(item.id, e.target.value)}
                      onBlur={() => onQtyInputBlur(item.id)}
                      disabled={item.available === false}
                      className="w-16 text-center text-base font-semibold bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <button
                      type="button"
                      className="w-10 text-lg font-semibold border-l border-[#255c45] disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => onQtyChange(item.id, item.quantity + 1)}
                      disabled={item.available === false}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="hidden lg:block text-right lg:justify-self-end">
                  <p className="font-bold text-xl">₹{item.price * item.quantity}</p>
                  <Button className="hidden lg:inline-flex mt-2 bg-red-600 hover:bg-red-700 text-white" onClick={() => onRemove(item.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>

                <div className="lg:hidden flex items-center justify-between gap-3">
                  <div className="h-11 rounded-md border-2 border-[#255c45] overflow-hidden bg-white inline-flex items-stretch">
                      <button
                        type="button"
                        className="w-10 text-lg font-semibold border-r border-[#255c45] disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => onQtyChange(item.id, item.quantity - 1)}
                        disabled={item.available === false || item.quantity <= 1}
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={qtyDrafts[item.id] ?? String(item.quantity)}
                        onChange={(e) => onQtyInputChange(item.id, e.target.value)}
                        onBlur={() => onQtyInputBlur(item.id)}
                        disabled={item.available === false}
                        className="w-16 text-center text-base font-semibold bg-white outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        className="w-10 text-lg font-semibold border-l border-[#255c45] disabled:opacity-40 disabled:cursor-not-allowed"
                        onClick={() => onQtyChange(item.id, item.quantity + 1)}
                        disabled={item.available === false}
                      >
                        +
                      </button>
                  </div>
                  <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => onRemove(item.id)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="p-5 mt-6 border-2 border-[#255c45] space-y-4">
          <div className="flex items-stretch w-full rounded-xl border-2 border-[#255c45] bg-white overflow-hidden focus-within:ring-1 focus-within:ring-[#255c45]">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Enter coupon code"
              className="h-11 flex-1 min-w-0 px-3 sm:px-4 bg-transparent text-sm sm:text-base font-medium outline-none"
            />
            <Button type="button" className="h-11 rounded-none px-3 sm:px-6 bg-[#255c45] hover:bg-[#214f3b] text-white shrink-0 font-semibold text-[13px] sm:text-sm" onClick={onApplyCoupon} disabled={offersLoading}>
              Apply Coupon
            </Button>
          </div>

          {offerPreview?.applied && offerPreview.applied.source === 'COUPON' && (
            <div className="flex items-center justify-between text-sm bg-[#e8f3ed] border border-[#255c45] rounded-md px-3 py-2 text-[#255c45]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#1a8f68]">'{offerPreview.applied.code}' applied</span>
                <span className="font-bold">(-₹{offerPreview.applied.discountAmount})</span>
              </div>
              <button 
                className="text-xs underline font-semibold hover:text-[#1a8f68]"
                onClick={() => {
                  setAppliedCouponCode('');
                  localStorage.removeItem('fresco_applied_coupon');
                  setCouponInput('');
                  loadOfferPreview(undefined);
                }}
              >
                Remove
              </button>
            </div>
          )}

          {amountToFreeDelivery > 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-300 rounded-md px-3 py-2">
              Add <span className="font-semibold">₹{amountToFreeDelivery}</span> more to get <span className="font-semibold">FREE Delivery</span>.
            </p>
          ) : (
            <p className="text-sm text-[#255c45] bg-emerald-50 border border-[#255c45] rounded-md px-3 py-2 font-semibold">
              FREE Delivery unlocked.
            </p>
          )}

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Subtotal</p>
            <p className="font-semibold">₹{subtotal}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Delivery Charges</p>
            {effectiveDelivery === 0 ? (
              <p className="font-semibold text-[#255c45] inline-flex items-center gap-2">
                <span className="line-through text-muted-foreground">₹{DELIVERY_CHARGE}</span>
                FREE
              </p>
            ) : (
              <p className="font-semibold">₹{effectiveDelivery}</p>
            )}
          </div>

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">Discount</p>
            <p className="font-semibold text-[#255c45]">-₹{effectiveDiscount}</p>
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <p className="text-xl font-bold">Total</p>
            <p className="text-xl font-bold">₹{effectiveTotal}</p>
          </div>

          <div className="pt-1 hidden lg:flex justify-end">
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:bg-slate-300 disabled:text-slate-500"
              onClick={onCheckout}
              disabled={items.some((item) => item.available === false)}
            >
              Place Order
            </Button>
          </div>
        </Card>
      </div>

      {/* Mobile fixed checkout bar */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+80px)] z-20 lg:hidden">
        <div className="flex w-full items-center justify-between gap-3 border-t border-b border-[#255c45] bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold leading-none">₹{effectiveTotal}</p>
          </div>
          <Button
            className="h-11 shrink-0 bg-amber-500 px-5 text-slate-900 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500"
            onClick={onCheckout}
            disabled={items.some((item) => item.available === false)}
          >
            Place Order
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
