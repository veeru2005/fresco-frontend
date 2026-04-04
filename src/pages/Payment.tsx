import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { MapPin } from 'lucide-react';
import { clearCart, removeFromCartByUnit } from '@/lib/cart';
import { formatCityStatePincode } from '@/lib/locationOptions';
import { previewOffers, type OfferPreviewResponse } from '@/lib/offers';
import { getPrimaryPricingOption, normalizeUnitLabel } from '@/lib/pricing';
import Lottie from 'lottie-react';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const FREE_DELIVERY_THRESHOLD = 250;
const DELIVERY_CHARGE = 20;

const resolveUnitLabel = (value?: string) => normalizeUnitLabel(value || '', '');

const resolveOrderItemUnit = (item: any, fallbackProduct?: any) => {
  const directUnit = resolveUnitLabel(item?.unit);
  if (directUnit) return directUnit;

  const sourceProduct = item?.pricingOptions ? item : fallbackProduct;
  if (sourceProduct) {
    const normalizedProductUnit = resolveUnitLabel(sourceProduct?.unit);
    if (normalizedProductUnit) return normalizedProductUnit;

    const normalizedPrimaryUnit = resolveUnitLabel(getPrimaryPricingOption(sourceProduct).unit);
    if (normalizedPrimaryUnit) return normalizedPrimaryUnit;
  }

  return '1 kg';
};

const Payment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [checkoutSource, setCheckoutSource] = useState<'cart' | 'buy_now'>('buy_now');
  const [orderAnimData, setOrderAnimData] = useState<any>(null);
  const [orderConfirmedAnimData, setOrderConfirmedAnimData] = useState<any>(null);
  const [showSuccessFlow, setShowSuccessFlow] = useState(false);
  const [successStep, setSuccessStep] = useState<'order' | 'confirmed'>('order');
  const [couponCode, setCouponCode] = useState('');
  const [offerPreview, setOfferPreview] = useState<OfferPreviewResponse | null>(null);
  const buyNowQty = Math.max(1, Number(localStorage.getItem('selected_quantity') || 1));
  const subtotal = checkoutSource === 'cart'
    ? cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0)
    : Number(product?.price || 0) * buyNowQty;
  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const totalPayable = subtotal + deliveryCharge;
  const effectiveDiscount = Number(offerPreview?.discountAmount || 0);
  const effectiveDelivery = Number(offerPreview?.deliveryCharge ?? deliveryCharge);
  const effectiveTotal = Number(offerPreview?.payableAmount ?? totalPayable);
  const buyNowUnit = resolveOrderItemUnit(product, product);
  const orderItemsForDisplay =
    checkoutSource === 'cart' && cartItems.length
      ? cartItems.map((item) => ({
          id: String(item.id || item._id || item.name || 'item'),
          name: String(item.name || 'Product'),
          type: String(item.type || item.category || 'Item'),
          image: String(item.image || product?.image || ''),
          quantity: Math.max(1, Number(item.quantity || 1)),
          unit: resolveOrderItemUnit(item, item),
          unitPrice: Number(item.price || 0),
        }))
      : product
      ? [
          {
            id: String(product.id || product._id || product.name || 'buy-now'),
            name: String(product.name || 'Product'),
            type: String(product.type || product.category || 'Item'),
            image: String(product.image || ''),
            quantity: buyNowQty,
            unit: buyNowUnit,
            unitPrice: Number(product.price || 0),
          },
        ]
      : [];

  useEffect(() => {
    const savedProduct = localStorage.getItem('selected_product');
    const savedDelivery = localStorage.getItem('delivery_details');
    const savedCart = localStorage.getItem('selected_cart');
    const savedCheckoutSource = localStorage.getItem('checkout_source');
    const savedOffer = localStorage.getItem('checkout_offer');

    if (!savedProduct || !savedDelivery) {
      navigate('/products');
      return;
    }

    setProduct(JSON.parse(savedProduct));
    setDeliveryDetails(JSON.parse(savedDelivery));

    if (savedCheckoutSource === 'cart') {
      setCheckoutSource('cart');
    } else {
      setCheckoutSource('buy_now');
    }

    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        setCartItems(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCartItems([]);
      }
    }

    if (savedOffer) {
      try {
        const parsed = JSON.parse(savedOffer);
        setCouponCode(String(parsed?.couponCode || ''));
      } catch {
        setCouponCode('');
      }
    }
  }, [navigate]);

  useEffect(() => {
    const loadPricing = async () => {
      if (!product) return;
      try {
        const pricing = await previewOffers({
          subtotal,
          deliveryCharge,
          couponCode: couponCode || undefined,
        });
        setOfferPreview(pricing);
      } catch {
        setOfferPreview(null);
      }
    };

    loadPricing();
  }, [product, subtotal, deliveryCharge, couponCode]);

  useEffect(() => {
    const loadAnimations = async () => {
      try {
        const [orderRes, confirmedRes] = await Promise.all([
          fetch('/order.json'),
          fetch('/Order Confirmed 2.json'),
        ]);

        if (orderRes.ok) {
          const orderJson = await orderRes.json();
          setOrderAnimData(orderJson);
        }

        if (confirmedRes.ok) {
          const confirmedJson = await confirmedRes.json();
          setOrderConfirmedAnimData(confirmedJson);
        }
      } catch {
        // If animation files fail to load, fallback flow navigates directly to success page.
      }
    };

    loadAnimations();
  }, []);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !deliveryDetails) return;

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const token = localStorage.getItem('fresco_token');
      const addressLine = String(deliveryDetails.address || '').trim();
      const cityStatePincodeLine = formatCityStatePincode(
        String(deliveryDetails.city || ''),
        String(deliveryDetails.state || ''),
        String(deliveryDetails.pincode || '')
      );
      const fullAddress = [
        addressLine,
        cityStatePincodeLine,
        String(deliveryDetails.country || '').trim(),
      ]
        .filter(Boolean)
        .join('\n');
      const normalizedDeliveryDetails = {
        name: String(deliveryDetails.name || '').trim(),
        mobile: String(deliveryDetails.mobile || '').trim(),
        gender: String(deliveryDetails.gender || '').trim(),
        address: addressLine,
        city: String(deliveryDetails.city || '').trim(),
        state: String(deliveryDetails.state || '').trim(),
        pincode: String(deliveryDetails.pincode || '').trim(),
        country: String(deliveryDetails.country || '').trim(),
      };

      const normalizedItems = checkoutSource === 'cart'
        ? cartItems.filter((item) => item?.id).map((item) => ({
            product: String(item.id),
            quantity: Math.max(1, Number(item.quantity || 1)),
            unit: resolveOrderItemUnit(item, item),
            unitPrice: Number(item.price || 0),
          }))
        : [{ product: String(product.id), quantity: buyNowQty, unit: buyNowUnit, unitPrice: Number(product.price || 0) }];

      const safeItems = normalizedItems.length
        ? normalizedItems
        : [{ product: String(product.id), quantity: buyNowQty, unit: buyNowUnit, unitPrice: Number(product.price || 0) }];

      const safeSubtotalAmount = subtotal > 0 ? subtotal : Number(product.price || 0) * buyNowQty;
      const safeDeliveryCharge = Number(offerPreview?.deliveryCharge ?? (safeSubtotalAmount >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE));
      const safeTotalAmount = Number(offerPreview?.payableAmount ?? (safeSubtotalAmount + safeDeliveryCharge));

      const orderPayload = {
        products: safeItems,
        subtotalAmount: safeSubtotalAmount,
        deliveryCharge: safeDeliveryCharge,
        totalAmount: safeTotalAmount,
        productName: checkoutSource === 'cart' && cartItems.length > 1
          ? `${cartItems[0].name} +${cartItems.length - 1} more`
          : product.name,
        productImage: product.image,
        username: user?.username || 'guest',
        address: fullAddress,
        mobileNumber: deliveryDetails.mobile,
        gender: deliveryDetails.gender,
        country: deliveryDetails.country,
        paymentAmount: safeTotalAmount,
        paymentStatus: 'PENDING',
        paymentMethod: 'Cash on Delivery',
        couponCode: couponCode || undefined,
      };

      const response = await fetch(`${VITE_API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(orderPayload),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to place order. Please try again.';
        try {
          const payload = await response.json();
          if (payload?.details) {
            errorMessage = String(payload.details);
          } else if (payload?.error) {
            errorMessage = String(payload.error);
          }
        } catch {
          // Keep fallback message when response body is not JSON.
        }
        throw new Error(errorMessage);
      }

      const orderData = await response.json();
      window.dispatchEvent(new CustomEvent('travelease:ordersUpdated', { detail: orderData }));

      if (checkoutSource === 'cart') {
        clearCart();
      } else if (product?.id) {
        removeFromCartByUnit(String(product.id), buyNowUnit);
      }

      localStorage.removeItem('selected_cart');
      localStorage.removeItem('selected_product');
      localStorage.removeItem('selected_quantity');
      localStorage.removeItem('delivery_details');
      localStorage.removeItem('checkout_source');
      localStorage.removeItem('checkout_offer');

      const playSuccessFlow = async () => {
        if (!orderAnimData && !orderConfirmedAnimData) {
          navigate('/payment-success', { state: { order: orderData, deliveryDetails: normalizedDeliveryDetails } });
          return;
        }

        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

        setShowSuccessFlow(true);
        setSuccessStep('order');
        await wait(6000);

        setSuccessStep('confirmed');
        await wait(3000);

        navigate('/payment-success', { state: { order: orderData, deliveryDetails: normalizedDeliveryDetails } });
      };

      await playSuccessFlow();
    } catch (error) {
      console.error('Order placement error:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product || !deliveryDetails) {
    return null;
  }

  const deliveryCityStatePincodeLine = formatCityStatePincode(
    String(deliveryDetails.city || ''),
    String(deliveryDetails.state || ''),
    String(deliveryDetails.pincode || '')
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-6 px-4 sm:px-6">
      {showSuccessFlow && (
        <div className="fixed inset-0 z-[70] bg-white flex items-center justify-center px-4">
          <div className="w-full max-w-sm sm:max-w-md">
            {successStep === 'order' && orderAnimData ? (
              <Lottie animationData={orderAnimData} loop autoplay />
            ) : successStep === 'confirmed' && orderConfirmedAnimData ? (
              <Lottie animationData={orderConfirmedAnimData} loop autoplay />
            ) : (
              <p className="text-center text-lg font-semibold text-[#255c45]">Processing your order...</p>
            )}
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Place Order</h1>
          <p className="text-muted-foreground">Cash on Delivery (COD) only</p>
        </div>

        <Card className="p-5 sm:p-7 space-y-7 border-2 border-[#255c45] shadow-sm">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Order Details</h2>
            <div className="space-y-3">
              {orderItemsForDisplay.map((item, index) => (
                <div key={`${item.id}-${index}`} className="flex items-center gap-3">
                  <img src={item.image} alt={item.name} className="w-14 h-14 rounded-lg object-cover border border-border" />
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.type} | Qty: {item.quantity} x ₹{item.unitPrice}
                      {item.unit ? ` / ${item.unit}` : ''}
                    </p>
                  </div>
                  <p className="ml-auto font-bold">₹{item.unitPrice * item.quantity}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Delivery Address
              </h3>
            </div>
            <div className="text-sm space-y-1.5 rounded-lg border border-[#255c45] bg-muted/30 p-4">
              <p className="font-semibold">{deliveryDetails.name}</p>
              <p className="text-muted-foreground">{deliveryDetails.mobile}</p>
              {deliveryDetails.gender ? (
                <p className="text-muted-foreground">Gender: {deliveryDetails.gender}</p>
              ) : null}
              <p className="text-muted-foreground">Address: {deliveryDetails.address}</p>
              {deliveryCityStatePincodeLine ? (
                <p className="text-muted-foreground">{deliveryCityStatePincodeLine}</p>
              ) : null}
              <p className="text-muted-foreground">Country: {deliveryDetails.country}</p>
            </div>
          </div>

          <div className="pt-3 border-t border-border space-y-4">
            {amountToFreeDelivery > 0 ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Add <span className="font-semibold">₹{amountToFreeDelivery}</span> more to unlock <span className="font-semibold">FREE Delivery</span>.
              </div>
            ) : (
              <div className="rounded-lg border border-[#255c45] bg-emerald-50 px-3 py-2 text-sm text-[#255c45] font-semibold">
                FREE Delivery unlocked on this order.
              </div>
            )}

            <div className="rounded-lg border border-[#255c45] p-3 space-y-2">
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

              {offerPreview?.applied ? (
                <div className="text-xs text-[#255c45] font-semibold">
                  Applied: {offerPreview.applied.title}
                  {offerPreview.applied.code ? ` (${offerPreview.applied.code})` : ''}
                </div>
              ) : null}

              <div className="h-px bg-border" />

              <div className="flex items-center justify-between">
                <p className="font-semibold">Total Payable</p>
                <p className="font-bold text-lg">₹{effectiveTotal}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handlePlaceOrder}>
            <Button type="submit" className="w-full bg-gradient-hero hover:opacity-90" disabled={loading}>
              {loading
                ? 'Placing order...'
                : `Place Order (COD) - ₹${effectiveTotal}`}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Payment;
