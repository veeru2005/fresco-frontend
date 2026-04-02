export interface CartItem {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  unit?: string;
  available?: boolean;
  quantity: number;
}

const LEGACY_CART_KEY = 'fresco_cart';
const CART_KEY_PREFIX = 'fresco_cart';

const getAuthenticatedCartKey = (): string => {
  if (typeof window === 'undefined') return LEGACY_CART_KEY;

  const rawUser = localStorage.getItem('fresco_user');
  if (!rawUser) return LEGACY_CART_KEY;

  try {
    const parsed = JSON.parse(rawUser) as { email?: string; username?: string; name?: string };
    const identifier = String(parsed?.email || parsed?.username || parsed?.name || '').trim().toLowerCase();
    if (!identifier) return LEGACY_CART_KEY;
    return `${CART_KEY_PREFIX}:${encodeURIComponent(identifier)}`;
  } catch {
    return LEGACY_CART_KEY;
  }
};

const migrateLegacyCartIfNeeded = (targetKey: string) => {
  if (typeof window === 'undefined' || targetKey === LEGACY_CART_KEY) return;

  const legacy = localStorage.getItem(LEGACY_CART_KEY);
  if (!legacy) return;

  const target = localStorage.getItem(targetKey);
  const targetItems = target ? JSON.parse(target) : [];
  const legacyItems = JSON.parse(legacy);

  if (!target || targetItems.length === 0) {
    localStorage.setItem(targetKey, legacy);
  } else if (Array.isArray(targetItems) && Array.isArray(legacyItems)) {
    // Merge logic: Add legacy items to target if not already present
    const merged = [...targetItems];
    for (const lItem of legacyItems) {
      const exists = merged.find(m => m.id === lItem.id);
      if (exists) {
        exists.quantity += lItem.quantity;
      } else {
        merged.push(lItem);
      }
    }
    localStorage.setItem(targetKey, JSON.stringify(merged));
  }

  localStorage.removeItem(LEGACY_CART_KEY);
};

const notifyCartUpdated = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('fresco:cartUpdated', { detail: { items } }));
};

export const getCart = (): CartItem[] => {
  if (typeof window === 'undefined') return [];

  const key = getAuthenticatedCartKey();
  if (key !== LEGACY_CART_KEY) {
    migrateLegacyCartIfNeeded(key);
  }

  const raw = localStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveCart = (items: CartItem[]) => {
  if (typeof window === 'undefined') return;
  const key = getAuthenticatedCartKey();
  localStorage.setItem(key, JSON.stringify(items));
  notifyCartUpdated(items);
};

export const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number) => {
  const safeQty = Math.max(1, quantity);
  const cart = getCart();
  const existingIndex = cart.findIndex((c) => c.id === item.id);

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += safeQty;
  } else {
    cart.push({ ...item, quantity: safeQty });
  }

  saveCart(cart);
};

export const updateCartQty = (id: string, quantity: number) => {
  const cart = getCart();
  const next = cart
    .map((item) => (item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item));
  saveCart(next);
};

export const removeFromCart = (id: string) => {
  const cart = getCart().filter((item) => item.id !== id);
  saveCart(cart);
};

export const clearCart = () => {
  if (typeof window === 'undefined') return;

  const key = getAuthenticatedCartKey();
  localStorage.removeItem(key);
  notifyCartUpdated([]);
};
