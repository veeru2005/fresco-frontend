import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Product } from '@/data/mockData';
import { Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addToCart } from '@/lib/cart';
import { getPricingOptionByUnit, getProductPricingOptions, getPrimaryPricingOption } from '@/lib/pricing';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

type ProductAction = 'cart' | 'buy_now';

const sortProductsByDisplayOrder = (items: Product[]) =>
  items
    .map((product, index) => ({ product, index }))
    .sort((a, b) => {
      const aOrder = Number((a.product as any).displayOrder);
      const bOrder = Number((b.product as any).displayOrder);
      const aValid = Number.isFinite(aOrder) && aOrder > 0;
      const bValid = Number.isFinite(bOrder) && bOrder > 0;

      if (aValid && bValid && aOrder !== bOrder) {
        return aOrder - bOrder;
      }

      if (aValid !== bValid) {
        return aValid ? -1 : 1;
      }

      return a.index - b.index;
    })
    .map(({ product }) => product);

const Booking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [sizePicker, setSizePicker] = useState<{
    open: boolean;
    product: Product | null;
    action: ProductAction | null;
    unit: string;
  }>({
    open: false,
    product: null,
    action: null,
    unit: '',
  });

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
          const sortedProducts = sortProductsByDisplayOrder(data);
          setProducts(sortedProducts);
          // Also store in localStorage as backup
          localStorage.setItem('fresco_products', JSON.stringify(sortedProducts));
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch products from backend, using localStorage', error);
      }

      // Fallback to localStorage
      const storedProducts = localStorage.getItem('fresco_products');
      if (storedProducts) {
        const parsedProducts = JSON.parse(storedProducts) as Product[];
        setProducts(sortProductsByDisplayOrder(parsedProducts));
      } else {
        // Import and use default products
        import('@/data/mockData').then((module) => {
          setProducts(sortProductsByDisplayOrder(module.products));
        });
      }
    };

    void loadProducts();

    // reload products when admin updates them in another part of the app
    const onUpdate = () => {
      void loadProducts();
    };
    window.addEventListener('fresco_products_updated', onUpdate);
    return () => window.removeEventListener('fresco_products_updated', onUpdate);
  }, []);

  useEffect(() => {
    setSelectedUnits((prev) => {
      const next: Record<string, string> = {};

      products.forEach((product) => {
        const options = getProductPricingOptions(product);
        const preferred = getPricingOptionByUnit(product, prev[product.id]);
        next[product.id] = preferred.unit || options[0]?.unit || getPrimaryPricingOption(product).unit;
      });

      return next;
    });
  }, [products]);

  const getSelectedPricing = (product: Product) => {
    return getPricingOptionByUnit(product, selectedUnits[product.id]);
  };
  const pickerOptions = sizePicker.product ? getProductPricingOptions(sizePicker.product) : [];

  const handleUnitChange = (productId: string, unit: string) => {
    setSelectedUnits((prev) => ({ ...prev, [productId]: unit }));
  };

  const handleBuyNow = (product: Product, unitOverride?: string) => {
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

    const selectedPricing = getPricingOptionByUnit(product, unitOverride || selectedUnits[product.id]);
    const selectedProduct = {
      ...product,
      price: Number(selectedPricing.price || product.price || 0),
      unit: selectedPricing.unit,
    };

    localStorage.removeItem('selected_cart');
    localStorage.setItem('checkout_source', 'buy_now');
    localStorage.setItem('selected_product', JSON.stringify(selectedProduct));
    localStorage.setItem('selected_quantity', '1');
    toast({
      title: 'Product Selected',
      description: `${product.name} has been selected. Please enter delivery details.`,
    });
    navigate('/delivery-details');
  };

  const handleAddToCart = (product: Product, unitOverride?: string) => {
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

    const selectedPricing = getPricingOptionByUnit(product, unitOverride || selectedUnits[product.id]);

    addToCart(
      {
        id: product.id,
        name: product.name,
        type: product.type,
        price: Number(selectedPricing.price || product.price || 0),
        image: product.image,
        unit: selectedPricing.unit,
        available: product.available,
      },
      1
    );

    toast({
      title: 'Added to cart',
      description: `${product.name} added successfully.`,
      variant: 'success',
    });
  };

  const closeSizePicker = () => {
    setSizePicker({ open: false, product: null, action: null, unit: '' });
  };

  const requestProductAction = (product: Product, action: ProductAction) => {
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
        description: 'Please sign in to continue.',
        variant: 'destructive',
      });
      navigate('/signin', { state: { redirectTo: '/products' } });
      return;
    }

    const options = getProductPricingOptions(product);
    if (options.length <= 1) {
      const defaultUnit = options[0]?.unit || getPrimaryPricingOption(product).unit;
      setSelectedUnits((prev) => ({ ...prev, [product.id]: defaultUnit }));

      if (action === 'cart') {
        handleAddToCart(product, defaultUnit);
      } else {
        handleBuyNow(product, defaultUnit);
      }
      return;
    }

    const currentSelection = getPricingOptionByUnit(product, selectedUnits[product.id]).unit || options[0].unit;
    setSizePicker({
      open: true,
      product,
      action,
      unit: currentSelection,
    });
  };

  const confirmSizePickerAction = () => {
    if (!sizePicker.product || !sizePicker.action) return;

    const chosenUnit = sizePicker.unit || getPrimaryPricingOption(sizePicker.product).unit;
    const product = sizePicker.product;
    const action = sizePicker.action;

    setSelectedUnits((prev) => ({ ...prev, [product.id]: chosenUnit }));
    closeSizePicker();

    if (action === 'cart') {
      handleAddToCart(product, chosenUnit);
    } else {
      handleBuyNow(product, chosenUnit);
    }
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
            filteredProducts.map((product) => {
              const pricingOptions = getProductPricingOptions(product);
              const selectedPricing = getSelectedPricing(product);
              const displayPricingOptions = pricingOptions.length ? pricingOptions : [selectedPricing];

              return (
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

                  <div className="px-4 py-6 sm:px-5 flex flex-col flex-1">
                      <div className="mb-2 flex items-start justify-between gap-3 sm:block">
                        <h3 className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-base font-semibold leading-snug sm:overflow-visible sm:whitespace-normal sm:break-words">{product.name}</h3>
                        <span className="shrink-0 inline-flex items-baseline gap-1 whitespace-nowrap text-lg font-bold leading-none text-[#2f7d5b] sm:mt-1 sm:w-fit sm:flex">
                        ₹{Number(selectedPricing.price || 0)}
                        <span className="text-sm font-semibold text-muted-foreground">/{selectedPricing.unit || '1 kg'}</span>
                      </span>
                    </div>

                    <p className="text-muted-foreground text-sm min-h-[55px] leading-relaxed">
                      {product.description}
                    </p>

                    {displayPricingOptions.length > 0 && (
                      <div className="mt-1 mb-0 w-full min-h-[40px]">
                        <div
                          className={`grid ${
                            displayPricingOptions.length >= 3
                              ? 'grid-cols-3 gap-1.5'
                              : displayPricingOptions.length === 2
                                ? 'grid-cols-2 gap-3'
                                : 'grid-cols-1'
                          }`}
                        >
                          {displayPricingOptions.map((option) => {
                            const isSelected = option.unit === selectedPricing.unit;
                            return (
                              <button
                                key={`${product.id}-${option.unit}`}
                                type="button"
                                onClick={() => handleUnitChange(product.id, option.unit)}
                                disabled={!product.available}
                                className={`w-full whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                                  isSelected
                                    ? 'border-[#255c45] bg-[#255c45] text-white'
                                    : 'border-[#255c45] bg-emerald-50 text-[#255c45] hover:bg-emerald-100'
                                } ${!product.available ? 'opacity-70 cursor-not-allowed' : ''}`}
                              >
                                {option.unit}: ₹{Number(option.price || 0)}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {displayPricingOptions.length > 1 && product.available && (
                      <p className="mb-1 text-center text-[11px] text-muted-foreground sm:text-s">
                        Select your preferred quantity.
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-1 w-full">
                      <Button
                        onClick={() => requestProductAction(product, 'cart')}
                        disabled={!product.available}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        Cart
                      </Button>
                      <Button
                        onClick={() => requestProductAction(product, 'buy_now')}
                        disabled={!product.available}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
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

        <Dialog open={sizePicker.open} onOpenChange={(open) => !open && closeSizePicker()}>
          <DialogContent className="w-[92vw] max-w-sm rounded-2xl border-2 border-[#255c45] p-4">
            <DialogHeader>
              <DialogTitle className="text-left text-xl">Choose Size</DialogTitle>
            </DialogHeader>

            {sizePicker.product && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{sizePicker.product.name}</p>

                <div
                  className={`grid ${
                    pickerOptions.length >= 3
                      ? 'grid-cols-3 gap-2'
                      : pickerOptions.length === 2
                        ? 'grid-cols-2 gap-2.5'
                        : 'grid-cols-1'
                  }`}
                >
                  {pickerOptions.map((option) => {
                    const isChosen = option.unit === sizePicker.unit;

                    return (
                      <button
                        key={`picker-${sizePicker.product?.id}-${option.unit}`}
                        type="button"
                        onClick={() => setSizePicker((prev) => ({ ...prev, unit: option.unit }))}
                        className={`w-full whitespace-nowrap rounded-full border px-2 py-2 text-[13px] font-semibold transition-colors sm:px-3 sm:text-sm ${
                          isChosen
                            ? 'border-[#255c45] bg-[#255c45] text-white'
                            : 'border-[#255c45] bg-emerald-50 text-[#255c45] hover:bg-emerald-100'
                        }`}
                      >
                        {option.unit}: ₹{Number(option.price || 0)}
                      </button>
                    );
                  })}
                </div>

                <p className="-my-0 text-center text-[11px] leading-5 text-muted-foreground sm:text-xs">
                  Select your preferred quantity.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-0">
                  <Button type="button" className="border-0 bg-amber-500 text-slate-900 hover:bg-amber-600" onClick={closeSizePicker}>
                    Cancel
                  </Button>
                  <Button type="button" className="bg-[#255c45] hover:bg-[#214f3b]" onClick={confirmSizePickerAction}>
                    Continue
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Booking;
