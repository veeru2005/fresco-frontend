export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  image: string;
  description: string;
  available: boolean;
  capacity: number;
  features: string[] | string; // Can be array from mock data or string from backend
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  status: 'booked' | 'on-the-way' | 'arriving' | 'completed';
  estimatedArrival: string;
  bookingDate: string;
  amount: number;
  paymentMethod: string;
}

export interface Feedback {
  id: string;
  username: string;
  rating: number;
  review: string;
  date: string;
}

export const products: Product[] = [
  {
    id: 'p1',
    name: 'Sweet Potato',
    type: 'Vegetable',
    price: 60,
    image: 'https://images.unsplash.com/photo-1596097635121-14b63b7a0c19?w=800&auto=format&fit=crop',
    description: 'Farm fresh, naturally sweet and packed with vitamins. Perfect for roasting, boiling, or making fries.',
    available: true,
    capacity: 1,
    features: ['Naturally Sweet', 'Farm Fresh', 'Vitamin Rich']
  },
  {
    id: 'p2',
    name: 'Banana',
    type: 'Fruit',
    price: 40,
    image: 'https://images.unsplash.com/photo-1574226516831-e1dff420e37f?w=800&auto=format&fit=crop',
    description: 'Premium quality bananas, naturally ripened and rich in potassium for your daily energy boost.',
    available: true,
    capacity: 1,
    features: ['Naturally Ripened', 'High Potassium', 'Fresh Stock']
  },
  {
    id: 'p3',
    name: 'Tomato',
    type: 'Vegetable',
    price: 55,
    image: 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=800&auto=format&fit=crop',
    description: 'Juicy red tomatoes sourced daily from local farms. Great for curries, salads, and sauces.',
    available: true,
    capacity: 1,
    features: ['Locally Sourced', 'Juicy', 'Daily Harvest']
  },
  {
    id: 'p4',
    name: 'Carrot',
    type: 'Vegetable',
    price: 48,
    image: 'https://images.unsplash.com/photo-1447175008436-054170c2e979?w=800&auto=format&fit=crop',
    description: 'Crunchy orange carrots rich in beta-carotene. Perfect for salads, soups, and juices.',
    available: true,
    capacity: 1,
    features: ['Crunchy', 'Vitamin A', 'Farm Fresh']
  },
  {
    id: 'p5',
    name: 'Spinach',
    type: 'Leafy Green',
    price: 35,
    image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&auto=format&fit=crop',
    description: 'Fresh spinach bundles loaded with iron and nutrients for a healthy lifestyle.',
    available: false,
    capacity: 1,
    features: ['Iron Rich', 'Leafy Fresh', 'Locally Sourced']
  },
  {
    id: 'p6',
    name: 'Apple',
    type: 'Fruit',
    price: 120,
    image: 'https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800&auto=format&fit=crop',
    description: 'Crisp and sweet apples handpicked for premium freshness and taste.',
    available: true,
    capacity: 1,
    features: ['Premium Grade', 'Crisp Texture', 'Naturally Sweet']
  }
];

// Initialize/migrate products in localStorage
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('fresco_products');

  if (!stored) {
    localStorage.setItem('fresco_products', JSON.stringify(products));
  } else {
    try {
      const parsed = JSON.parse(stored);
      const hasLegacyCarData = Array.isArray(parsed) && parsed.some((item) => {
        const type = String(item?.type || '').toLowerCase();
        return ['suv', 'convertible', 'minivan', 'sedan', 'compact', '4x4'].includes(type);
      });

      if (hasLegacyCarData) {
        localStorage.setItem('fresco_products', JSON.stringify(products));
      }
    } catch {
      localStorage.setItem('fresco_products', JSON.stringify(products));
    }
  }
}

export const mockFeedbacks: Feedback[] = [
  // default feedbacks removed — start with an empty list
];
 
