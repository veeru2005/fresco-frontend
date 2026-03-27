import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getCart, updateCartQty, removeFromCart, saveCart, type CartItem } from '@/lib/cart';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const FREE_DELIVERY_THRESHOLD = 250;
const DELIVERY_CHARGE = 20;

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [qtyDrafts, setQtyDrafts] = useState<Record<string, string>>({});

  const syncCartAvailability = async () => {
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
  };

  useEffect(() => {
    syncCartAvailability();

    const onProductsUpdate = () => {
      syncCartAvailability();
    };

    window.addEventListener('fresco_products_updated', onProductsUpdate);
    return () => window.removeEventListener('fresco_products_updated', onProductsUpdate);
  }, []);

  const subtotal = useMemo(
    () => items.filter((item) => item.available !== false).reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const deliveryCharge = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const totalPayable = subtotal + deliveryCharge;

  const refresh = () => setItems(getCart());

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    for (const item of items) {
      nextDrafts[item.id] = String(item.quantity);
    }
    setQtyDrafts(nextDrafts);
  }, [items]);

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
    navigate('/delivery-details');
  };

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
        <div className="container mx-auto px-4 max-w-3xl">
          <Card className="p-10 text-center border-2 border-[#255c45]">
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
    <div className="min-h-screen py-6 pb-36 lg:pb-12">
      <div className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">Cart</h1>

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

        <Card className="p-5 mt-6 border-2 border-[#255c45] space-y-3">
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
            {deliveryCharge === 0 ? (
              <p className="font-semibold text-[#255c45] inline-flex items-center gap-2">
                <span className="line-through text-muted-foreground">₹{DELIVERY_CHARGE}</span>
                FREE
              </p>
            ) : (
              <p className="font-semibold">₹{deliveryCharge}</p>
            )}
          </div>

          <div className="h-px bg-border" />

          <div className="flex items-center justify-between">
            <p className="text-xl font-bold">Total</p>
            <p className="text-xl font-bold">₹{totalPayable}</p>
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
      <div className="lg:hidden fixed inset-x-0 z-20 border-t border-[#d9e2e6] bg-white bottom-[calc(env(safe-area-inset-bottom,0px)+84px)]">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold leading-none">₹{totalPayable}</p>
          </div>
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:bg-slate-300 disabled:text-slate-500 px-6 h-11"
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
