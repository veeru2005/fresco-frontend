const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export type OfferItem = {
  type: string;
  title: string;
  code?: string;
  eligible: boolean;
  minPurchase: number;
  discountAmount: number;
  reason: string;
  deliveredOrdersCompleted?: number;
  originalDiscount?: number;
};

export type OfferPreviewResponse = {
  subtotal: number;
  deliveryCharge: number;
  offers: OfferItem[];
  coupon?: {
    code: string;
    status: 'valid' | 'invalid';
    reason: string;
    discountAmount: number;
  } | null;
  applied?: {
    source: 'AUTO' | 'COUPON';
    type: string;
    title: string;
    discountAmount: number;
    code?: string;
  } | null;
  discountAmount: number;
  payableAmount: number;
};

export async function previewOffers(payload: {
  subtotal: number;
  deliveryCharge: number;
  couponCode?: string;
}): Promise<OfferPreviewResponse> {
  const token = localStorage.getItem('fresco_token');
  const res = await fetch(`${VITE_API_BASE_URL}/api/offers/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to preview offers (${res.status})`);
  }

  return res.json();
}
