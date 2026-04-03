import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Product } from '@/data/mockData';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addToCart } from '@/lib/cart';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const Booking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qty, setQty] = useState<Record<string, number>>({});

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const loadProducts = async () => {
      try {
        // Try to fetch from backend first
        const res = await fetch(`${VITE_API_BASE_URL}/api/products`);
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
          // Also store in localStorage as backup
          localStorage.setItem('fresco_products', JSON.stringify(data));
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch products from backend, using localStorage', error);
      }

      // Fallback to localStorage
      const storedProducts = localStorage.getItem('fresco_products');
      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      } else {
        // Import and use default products
        import('@/data/mockData').then((module) => {
          setProducts(module.products);
        });
      }
    };

    loadProducts();

    // reload products when admin updates them in another part of the app
    const onUpdate = () => {
      const stored = localStorage.getItem('fresco_products');
      if (stored) setProducts(JSON.parse(stored));
    };
    window.addEventListener('fresco_products_updated', onUpdate);
    return () => window.removeEventListener('fresco_products_updated', onUpdate);
  }, []);

  const handleBuyNow = (product: Product) => {
    if (!product.available) {
      toast({
        title: 'Product Unavailable',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to add items and continue checkout.',
        variant: 'destructive',
      });
      navigate('/signin', { state: { redirectTo: '/products' } });
      return;
    }

    localStorage.removeItem('selected_cart');
    localStorage.setItem('checkout_source', 'buy_now');
    localStorage.setItem('selected_product', JSON.stringify(product));
    localStorage.setItem('selected_quantity', String(qty[product.id] || 1));
    toast({
      title: 'Product Selected',
      description: `${product.name} has been selected. Please enter delivery details.`,
    });
    navigate('/delivery-details');
  };

  const handleAddToCart = (product: Product) => {
    if (!product.available) {
      toast({
        title: 'Product Unavailable',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
      });
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: 'Sign In Required',
        description: 'Please sign in to add items to cart.',
        variant: 'destructive',
      });
      navigate('/signin', { state: { redirectTo: '/products' } });
      return;
    }

    addToCart(
      {
        id: product.id,
        name: product.name,
        type: product.type,
        price: product.price,
        image: product.image,
        unit: (product as any).unit || 'kg',
        available: product.available,
      },
      qty[product.id] || 1
    );

    toast({
      title: 'Added to cart',
      description: `${product.name} added successfully.`,
      variant: 'success',
    });
  };

  const setProductQty = (id: string, delta: number) => {
    setQty((prev) => {
      const next = (prev[id] || 1) + delta;
      return { ...prev, [id]: Math.max(1, next) };
    });
  };

  return (
    <div className="min-h-screen py-6 pb-12 sm:py-16 sm:pb-10 md:py-10 md:pb-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">Products</h1>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder="Search products by name, type, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 py-6 text-base"
              />
            </div>
          </div>
          <p className="text-muted-foreground text-base sm:text-lg">
            Browse our selection of locally-sourced products. Freshness guaranteed with every order.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
            <Card
              key={product.id}
              className={`w-[96%] mx-auto sm:w-full overflow-hidden border-2 border-[#2f7d5b] rounded-3xl transition-all duration-300 flex flex-col h-full ${
                product.available ? 'hover:shadow-xl' : 'opacity-70 saturate-50'
              }`}
            >
              <div className="relative h-56 overflow-hidden bg-muted">
                <img
                  src={product.image}
                  alt={product.name}
                  className={`w-full h-full object-cover ${product.available ? '' : 'grayscale'}`}
                />
                <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${product.available ? 'bg-[#2f7d5b] text-white' : 'bg-red-500 text-white'}`}>
                  {product.available ? 'In Stock' : 'Out of Stock'}
                </div>
              </div>

              <div className="px-5 py-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-snug break-words">{product.name}</h3>
                  </div>
                  <span className="shrink-0 text-lg font-bold text-[#2f7d5b] whitespace-nowrap inline-flex items-baseline gap-1 leading-none">
                    ₹{Number(product.price || 0)}
                    <span className="text-sm font-semibold text-muted-foreground">/{(product as any).unit || 'kg'}</span>
                  </span>
                </div>

                <p className="text-muted-foreground text-sm mb-auto min-h-[60px] leading-relaxed">
                  {product.description}
                </p>

                <div className={`mt-3 mx-auto w-[92%] flex items-center justify-between border border-foreground rounded-lg px-2.5 py-1.5 mb-2 bg-white ${product.available ? '' : 'bg-muted/60 opacity-60'}`}>
                  <button
                    type="button"
                    className="text-xl font-semibold text-foreground px-2 py-0.5 flex items-center justify-center leading-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 rounded-sm transition-colors"
                    onClick={() => setProductQty(product.id, -1)}
                    disabled={!product.available}
                  >
                    -
                  </button>
                  <span className="font-semibold text-base text-slate-700 min-w-[2ch] text-center">{qty[product.id] || 1}</span>
                  <button
                    type="button"
                    className="text-xl font-semibold text-foreground px-2 py-0.5 flex items-center justify-center leading-none disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 rounded-sm transition-colors"
                    onClick={() => setProductQty(product.id, 1)}
                    disabled={!product.available}
                  >
                    +
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1 mx-auto w-[92%]">
                  <Button
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.available}
                    className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    Cart
                  </Button>
                  <Button
                    onClick={() => handleBuyNow(product)}
                    disabled={!product.available}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    Buy Now
                  </Button>
                </div>
              </div>
            </Card>
          ))
          ) : (
            <div className="col-span-full">
              <Card className="w-full border-2 border-[#255c45]">
                <div className="p-6 sm:p-8 text-center">
                  <Search className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                  <h3 className="text-2xl font-bold mb-2">No products found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? 'Try adjusting your search terms'
                      : 'No products available at the moment'
                    }
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Booking;
