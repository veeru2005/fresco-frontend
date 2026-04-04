import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/data/mockData';
import {
  getAllowedPricingUnits,
  PRODUCT_UNIT_OPTIONS,
  getMaxAllowedPricingOptions,
  getPrimaryPricingOption,
  getProductPricingOptions,
  normalizeUnitLabel,
  sanitizePricingOptionsForSave,
} from '@/lib/pricing';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Search, Trash2, PackageSearch } from 'lucide-react';

const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024;
const TARGET_IMAGE_UPLOAD_BYTES = 950 * 1024;
const MAX_PRICING_OPTIONS = 3;

type PricingDraft = {
  unit: string;
  price: string;
};

const getProductId = (product: Partial<Product>) => String(product.id || (product as any)._id || '');

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

const withSequentialDisplayOrder = (items: Product[]) =>
  items.map((product, index) => ({
    ...product,
    displayOrder: index + 1,
  }));

const buildPricingDraftsFromProduct = (product?: Partial<Product> | null): PricingDraft[] => {
  const options = getProductPricingOptions(product || {});
  if (options.length) {
    return options.slice(0, MAX_PRICING_OPTIONS).map((option) => ({
      unit: option.unit,
      price: String(option.price),
    }));
  }

  const primary = getPrimaryPricingOption(product || {});
  return [{ unit: primary.unit || '1 kg', price: String(primary.price || '') }];
};

const blobToImage = (blob: Blob) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load selected image'));
    };
    image.src = objectUrl;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to compress image'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });

const compressImageToLimit = async (file: File) => {
  if (file.size <= MAX_IMAGE_UPLOAD_BYTES) {
    return { file, compressed: false };
  }

  const image = await blobToImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Your browser does not support image compression');
  }

  const maxDimension = 1400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.86;
  let outputBlob = await canvasToBlob(canvas, quality);

  while (outputBlob.size > TARGET_IMAGE_UPLOAD_BYTES && quality > 0.45) {
    quality -= 0.08;
    outputBlob = await canvasToBlob(canvas, quality);
  }

  if (outputBlob.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error('Image is too large. Please choose a smaller image (max 1MB).');
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'product-image';
  const compressedFile = new File([outputBlob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  return { file: compressedFile, compressed: true };
};

const AdminProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    pricingOptions: [{ unit: '1 kg', price: '' }] as PricingDraft[],
    description: '',
    displayPosition: '1',
  });
  const { toast } = useToast();
  const canManageProducts = user?.isSuperAdmin === true;

  const maxDisplayPositionForForm = Math.max(1, products.length + (editingProduct ? 0 : 1));

  const syncProductsSnapshot = (nextProducts: Product[], notify = false) => {
    const sortedProducts = sortProductsByDisplayOrder(nextProducts);
    setProducts(sortedProducts);
    localStorage.setItem('fresco_products', JSON.stringify(sortedProducts));
    if (notify) {
      window.dispatchEvent(new Event('fresco_products_updated'));
    }
  };

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getReorderedProductsByPosition = (items: Product[], productId: string, targetPosition: number) => {
    const fromIndex = items.findIndex((item) => getProductId(item) === productId);
    if (fromIndex < 0) {
      return withSequentialDisplayOrder(items);
    }

    const boundedTargetPosition = Math.max(1, Math.min(targetPosition, items.length));
    const targetIndex = boundedTargetPosition - 1;
    const reorderedProducts = [...items];
    const [movedProduct] = reorderedProducts.splice(fromIndex, 1);
    reorderedProducts.splice(targetIndex, 0, movedProduct);
    return withSequentialDisplayOrder(reorderedProducts);
  };

  const persistProductOrder = async (orderedProducts: Product[]) => {
    const token = localStorage.getItem('fresco_token');
    const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products/order`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        productIds: orderedProducts.map((product) => getProductId(product)),
      }),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to update product order';
      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorMessage = String(errorData.error);
        }
      } catch {
        const errorText = await res.text();
        if (errorText) {
          errorMessage = errorText;
        }
      }

      throw new Error(errorMessage);
    }

    const savedProducts = await res.json();
    syncProductsSnapshot(savedProducts, true);
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const token = localStorage.getItem('fresco_token');
        const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (res.ok) {
          const data = await res.json();
          syncProductsSnapshot(data);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    void loadProducts();
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  const clearSelectedImage = () => {
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImageSelection = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setImageFile(null);
      return;
    }

    try {
      const { file: processedFile, compressed } = await compressImageToLimit(selectedFile);
      setImageFile(processedFile);

      if (compressed) {
        toast({
          title: 'Image optimized',
          description: 'Large image was compressed automatically for upload.',
          variant: 'default',
        });
      }
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Please choose a smaller image';
      toast({ title: 'Image upload error', description, variant: 'destructive' });
      clearSelectedImage();
    }
  };

  const updatePricingDraft = (index: number, key: keyof PricingDraft, value: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingOptions: prev.pricingOptions.map((option, optionIndex) =>
        optionIndex === index ? { ...option, [key]: value } : option
      ),
    }));
  };

  const addPricingDraft = () => {
    setFormData((prev) => {
      const dynamicMax = getMaxAllowedPricingOptions(prev.pricingOptions.map((option) => option.unit));
      if (!dynamicMax || prev.pricingOptions.length >= dynamicMax) return prev;

      const normalizedUnits = prev.pricingOptions
        .map((option) => normalizeUnitLabel(option.unit || ''))
        .filter(Boolean);
      const allowedUnits = getAllowedPricingUnits(normalizedUnits);
      if (!allowedUnits.length) return prev;

      const usedUnits = new Set(
        prev.pricingOptions
          .map((option) => normalizeUnitLabel(option.unit || ''))
          .filter(Boolean)
      );
      const nextUnit =
        allowedUnits.find((unit) => !usedUnits.has(normalizeUnitLabel(unit))) || allowedUnits[0];

      return {
        ...prev,
        pricingOptions: [...prev.pricingOptions, { unit: nextUnit, price: '' }],
      };
    });
  };

  const removePricingDraft = (index: number) => {
    setFormData((prev) => {
      if (prev.pricingOptions.length <= 1) return prev;

      return {
        ...prev,
        pricingOptions: prev.pricingOptions.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  };

  const handleDelete = async (id: string) => {
    if (!canManageProducts) {
      toast({ title: 'Access denied', description: 'Only super admins can delete products', variant: 'destructive' });
      return;
    }

    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (res.ok) {
        const nextProducts = withSequentialDisplayOrder(
          products.filter((product) => getProductId(product) !== id)
        );
        syncProductsSnapshot(nextProducts, true);
        toast({ title: 'Success', description: 'Product deleted', variant: 'success' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete product', variant: 'destructive' });
    }
  };

  const openEdit = (product: Product) => {
    if (!canManageProducts) {
      toast({ title: 'View only access', description: 'Only super admins can edit products', variant: 'destructive' });
      return;
    }

    const existingPositionIndex = products.findIndex((item) => getProductId(item) === getProductId(product));
    const existingPosition =
      existingPositionIndex >= 0 ? existingPositionIndex + 1 : Math.max(1, Number((product as any).displayOrder || 1));

    setEditingProduct(product);
    clearSelectedImage();
    setFormData({
      name: product.name,
      pricingOptions: buildPricingDraftsFromProduct(product),
      description: product.description,
      displayPosition: String(existingPosition),
    });
    setIsEditOpen(true);
  };
  
  const openAdd = () => {
    if (!canManageProducts) {
      toast({ title: 'View only access', description: 'Only super admins can add products', variant: 'destructive' });
      return;
    }

    setEditingProduct(null);
    clearSelectedImage();
    setFormData({
      name: '',
      pricingOptions: [{ unit: '1 kg', price: '' }],
      description: '',
      displayPosition: String(Math.max(1, products.length + 1)),
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!canManageProducts) {
      toast({ title: 'View only access', description: 'Only super admins can update products', variant: 'destructive' });
      return;
    }

    const formPayload = new FormData();
    if (!formData.name.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide product name.',
        variant: 'destructive',
      });
      return;
    }

    const hasIncompletePricing = formData.pricingOptions.some((option) => {
      const unit = normalizeUnitLabel(option.unit || '');
      const price = Number(option.price);
      return !unit || !Number.isFinite(price) || price <= 0;
    });

    if (hasIncompletePricing) {
      toast({
        title: 'Invalid pricing options',
        description: 'Each pricing option must include a valid unit and a price greater than 0.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedUnits = formData.pricingOptions.map((option) => normalizeUnitLabel(option.unit || '')).filter(Boolean);
    const allowedUnits = getAllowedPricingUnits(normalizedUnits);
    if (!allowedUnits.length) {
      toast({
        title: 'Mixed unit types are not allowed',
        description: 'Keep one product in a single unit family only: kg pair, dozen pair, or litre/ml set.',
        variant: 'destructive',
      });
      return;
    }

    if (new Set(normalizedUnits).size !== normalizedUnits.length) {
      toast({
        title: 'Duplicate units not allowed',
        description: 'Please keep each pricing option unit unique.',
        variant: 'destructive',
      });
      return;
    }

    const dynamicMax = getMaxAllowedPricingOptions(normalizedUnits);
    if (formData.pricingOptions.length > dynamicMax) {
      toast({
        title: 'Too many pricing options',
        description:
          dynamicMax === 3
            ? 'Liquid units allow up to 3 options (1 litre, 500 ml, 250 ml).'
            : 'For kg/dozen units you can save up to 2 options.',
        variant: 'destructive',
      });
      return;
    }

    const pricingOptions = sanitizePricingOptionsForSave(formData.pricingOptions);
    if (!pricingOptions.length) {
      toast({
        title: 'Pricing required',
        description: 'Please add at least one valid pricing option.',
        variant: 'destructive',
      });
      return;
    }

    if (!editingProduct && !imageFile) {
      toast({
        title: 'Image required',
        description: 'Please upload a product image from your local machine.',
        variant: 'destructive',
      });
      return;
    }

    const rawDisplayPosition = Number(formData.displayPosition);
    const targetDisplayPosition = Math.trunc(rawDisplayPosition);
    const maxDisplayPosition = Math.max(1, products.length + (editingProduct ? 0 : 1));
    if (!Number.isFinite(rawDisplayPosition) || targetDisplayPosition < 1 || targetDisplayPosition > maxDisplayPosition) {
      toast({
        title: 'Invalid display position',
        description: `Please enter a display position between 1 and ${maxDisplayPosition}.`,
        variant: 'destructive',
      });
      return;
    }

    formPayload.append('name', formData.name.trim());
    formPayload.append('pricingOptions', JSON.stringify(pricingOptions));
    formPayload.append('price', String(pricingOptions[0].price));
    formPayload.append('unit', pricingOptions[0].unit || '1 kg');
    formPayload.append('description', formData.description || '');
    if (imageFile) {
      formPayload.append('imageFile', imageFile);
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('fresco_token');
      
      if (editingProduct) {
        const editingProductId = editingProduct.id || (editingProduct as any)._id;
        if (!editingProductId) {
          toast({ title: 'Error', description: 'Invalid product ID', variant: 'destructive' });
          return;
        }

        const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products/${editingProductId}`, {
          method: 'PUT',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formPayload,
        });
        
        if (res.ok) {
          const updated = await res.json();
          const nextProducts = products.map(v => getProductId(v) === editingProductId ? updated : v);
          const reorderedProducts = getReorderedProductsByPosition(nextProducts, editingProductId, targetDisplayPosition);
          let reorderWarning = '';

          try {
            await persistProductOrder(reorderedProducts);
          } catch (orderError) {
            syncProductsSnapshot(nextProducts, true);
            reorderWarning =
              orderError instanceof Error
                ? orderError.message
                : 'Saved product, but failed to apply display position.';
          }

          toast({
            title: reorderWarning ? 'Product updated with warning' : 'Success',
            description: reorderWarning || 'Product updated successfully!',
            variant: reorderWarning ? 'destructive' : 'default',
          });
          setIsEditOpen(false);
          setEditingProduct(null);
          clearSelectedImage();
        } else {
          let errorMessage = 'Failed to update product';
          try {
            const errorData = await res.json();
            if (errorData?.error) {
              errorMessage = errorData.error;
            }
          } catch {
            const errorText = await res.text();
            if (errorText) {
              errorMessage = errorText;
            }
          }

          if (res.status === 403) {
            errorMessage = 'Access denied. Super admin privileges required to update products.';
          }

          toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        }
      } else {
        const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formPayload,
        });
        
        if (res.ok) {
          const created = await res.json();
          const nextProducts = [...products, created];
          const createdProductId = getProductId(created);
          const reorderedProducts = getReorderedProductsByPosition(nextProducts, createdProductId, targetDisplayPosition);
          let reorderWarning = '';

          try {
            await persistProductOrder(reorderedProducts);
          } catch (orderError) {
            syncProductsSnapshot(nextProducts, true);
            reorderWarning =
              orderError instanceof Error
                ? orderError.message
                : 'Saved product, but failed to apply display position.';
          }

          toast({
            title: reorderWarning ? 'Product added with warning' : 'Success',
            description: reorderWarning || 'Product added successfully!',
            variant: reorderWarning ? 'destructive' : 'default',
          });
          setIsEditOpen(false);
          setEditingProduct(null);
          clearSelectedImage();
        } else {
          const errorText = await res.text();
          console.error('Error response:', errorText);
          toast({ title: 'Error', description: 'Failed to add product', variant: 'destructive' });
        }
      }
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: 'Error', description: 'Failed to save product', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestDelete = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = () => {
    if (!confirmDeleteId) return;
    handleDelete(confirmDeleteId);
    setConfirmDeleteId(null);
  };

  const toggleAvailability = async (id: string) => {
    if (!canManageProducts) {
      toast({ title: 'View only access', description: 'Only super admins can update availability', variant: 'destructive' });
      return;
    }

    try {
      const product = products.find(v => getProductId(v) === id);
      if (!product) return;

      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          available: !product.available,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        const nextProducts = products.map(v => getProductId(v) === id ? updated : v);
        syncProductsSnapshot(nextProducts, true);
        toast({
          title: 'Updated',
          description: `Product marked ${updated.available ? 'available' : 'unavailable'}`,
          variant: 'default',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update product availability',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update product availability',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 pt-8 pb-12 sm:pb-10 lg:pb-20">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Product Management</h1>
            <p className="text-muted-foreground">
              {canManageProducts ? 'Super admin access: add, edit and delete products' : 'Admin access: view-only products'}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-[300px] h-10 rounded-xl border-2 border-[#255c45]">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-full rounded-xl border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />
            </div>
            {canManageProducts && (
              <Button onClick={openAdd} className="h-10 rounded-xl bg-[#255c45] hover:bg-[#214f3b] text-white whitespace-nowrap px-4">+ Add Product</Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
        {filteredProducts.map((product) => {
          const productId = getProductId(product);
          const pricingOptions = getProductPricingOptions(product);
          const primaryPricing = pricingOptions[0] || getPrimaryPricingOption(product);
          const displayPricingOptions = pricingOptions.length ? pricingOptions : [primaryPricing];

          return (
          <Card key={productId} className="w-[96%] mx-auto sm:w-full overflow-hidden border-2 border-[#255c45] rounded-3xl transition-all duration-300 hover:shadow-xl flex flex-col h-full">
            <div className="relative">
              <img
                src={product.image}
                alt={product.name}
                className={`w-full h-56 object-cover ${product.available ? '' : 'grayscale'}`}
              />
              {!product.available && (
                <div className="absolute inset-0 bg-black/35"></div>
              )}
              <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium ${product.available ? 'bg-[#255c45] text-white' : 'bg-red-500 text-white'}`}>
                {product.available ? 'In Stock' : 'Out of Stock'}
              </div>
            </div>
            <div className={`p-6 flex flex-col flex-1 ${canManageProducts ? '' : 'pb-3'}`}>
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base leading-snug break-words">{product.name || 'N/A'}</h3>
                </div>
                <p className="shrink-0 font-bold text-[#255c45] text-lg leading-none inline-flex items-baseline gap-1">
                  ₹{Number(primaryPricing.price || 0)}
                  <span className="text-muted-foreground font-semibold text-sm">/{primaryPricing.unit || '1 kg'}</span>
                </p>
              </div>
              <p
                className={`text-sm !text-[0.9rem] mb-1 line-clamp-3 text-muted-foreground leading-relaxed ${
                  canManageProducts ? 'min-h-[48px]' : 'min-h-[40px]'
                }`}
              >
                {product.description || 'No description available'}
              </p>
              {displayPricingOptions.length > 0 && (
                <div
                  className={`mt-0.5 grid ${
                    displayPricingOptions.length >= 3
                      ? 'grid-cols-3 gap-1.5'
                      : displayPricingOptions.length === 2
                        ? 'grid-cols-2 gap-3'
                        : 'grid-cols-1'
                  }`}
                >
                  {displayPricingOptions.map((option) => (
                    <span
                      key={`${productId}-${option.unit}`}
                      className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-[#255c45] bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#255c45]"
                    >
                      {option.unit}: ₹{option.price}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-auto flex flex-col gap-2 pt-3">
                {canManageProducts ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => toggleAvailability(productId)} 
                        variant="outline" 
                        className="w-full h-11 text-sm border-[#255c45]"
                        size="sm"
                      >
                        {product.available ? 'Out of Stock' : 'In Stock'}
                      </Button>
                      <Button onClick={() => openEdit(product)} variant="outline" size="sm" className="w-full h-11 text-sm border-[#255c45]">
                        Edit
                      </Button>
                    </div>
                    <Button onClick={() => handleRequestDelete(productId)} variant="destructive" size="sm" className="w-full text-sm">
                      Delete
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-0.5">View Access Only</p>
                )}
              </div>
            </div>
          </Card>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-full">
            <Card className="w-full p-6 sm:p-8 text-center border-2 border-[#255c45]">
              <PackageSearch className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-2xl font-bold mb-2">{searchQuery ? 'No matching products' : 'No products available'}</h3>
              <p className="text-muted-foreground">{searchQuery ? 'Try adjusting your search query.' : 'There are currently no products available.'}</p>
            </Card>
          </div>
        )}
      </div>
      {/* Edit/Add Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[92vw] sm:w-[95vw] max-w-2xl max-h-[92vh] overflow-hidden rounded-2xl sm:rounded-[28px] border-2 border-[#255c45] p-0 flex flex-col gap-0">
          <DialogHeader className="shrink-0 border-b border-[#255c45]/20 bg-slate-100/95 px-4 pt-3.5 pb-2.5 sm:px-5 sm:pt-3 sm:pb-2.5">
            <DialogTitle className="w-full text-center text-[1.45rem] sm:text-[1.68rem] leading-tight">{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4 sm:px-6 sm:pt-5 sm:pb-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 focus-visible:ring-0 focus-visible:border-[#255c45] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 py-3 focus-visible:ring-0 focus-visible:border-[#255c45] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Pricing Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-10 rounded-xl border-2 border-[#255c45] bg-white text-[#255c45] hover:bg-emerald-50 hover:text-[#255c45]"
                    onClick={addPricingDraft}
                    disabled={formData.pricingOptions.length >= getMaxAllowedPricingOptions(formData.pricingOptions.map((option) => option.unit))}
                  >
                    + Add option
                  </Button>
                </div>

                <div className="space-y-3">
                  {formData.pricingOptions.map((option, index) => {
                    const currentRowUnit = normalizeUnitLabel(option.unit || '');
                    const unitsFromOtherRows = formData.pricingOptions
                      .map((entry, entryIndex) =>
                        entryIndex === index ? '' : normalizeUnitLabel(entry.unit || '')
                      )
                      .filter(Boolean);
                    const allowedUnitsForRow = getAllowedPricingUnits(unitsFromOtherRows);
                    const blockedUnits = new Set(
                      formData.pricingOptions
                        .map((entry, entryIndex) =>
                          entryIndex === index ? '' : normalizeUnitLabel(entry.unit || '')
                        )
                        .filter(Boolean)
                    );

                    return (
                    <div key={`pricing-row-${index}`} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_140px_auto] gap-3 items-end rounded-xl border-2 border-[#255c45] bg-white p-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Unit</Label>
                        <Select value={option.unit} onValueChange={(value) => updatePricingDraft(index, 'unit', value)}>
                          <SelectTrigger className="h-11 rounded-xl border-2 border-[#255c45] px-3 text-sm shadow-sm focus:border-[#255c45] focus:ring-0">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72 rounded-2xl border-[#255c45] bg-white">
                            {PRODUCT_UNIT_OPTIONS.map((unit) => {
                                const normalizedUnit = normalizeUnitLabel(unit);
                                const isDuplicate = blockedUnits.has(normalizedUnit);
                                const isOutsideFamily =
                                  allowedUnitsForRow.length > 0 && !allowedUnitsForRow.includes(normalizedUnit);
                                const isCurrent = normalizedUnit === currentRowUnit;
                                const isBlocked = !isCurrent && (isDuplicate || isOutsideFamily);

                              return (
                                <SelectItem
                                  key={unit}
                                  value={unit}
                                  disabled={isBlocked}
                                  className={`text-base focus:bg-amber-400 focus:text-slate-900 data-[state=checked]:bg-amber-400 data-[state=checked]:text-slate-900 ${
                                    isBlocked ? 'opacity-50 text-muted-foreground' : ''
                                  }`}
                                >
                                  {unit}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Price</Label>
                        <Input
                          type="number"
                          min="1"
                          value={option.price}
                          onChange={(e) => updatePricingDraft(index, 'price', e.target.value)}
                          className="h-11 rounded-xl border-2 border-[#255c45] px-3 focus-visible:ring-0 focus-visible:border-[#255c45] focus:outline-none"
                        />
                      </div>

                      <Button
                        type="button"
                        className="h-11 border-0 bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300 disabled:text-white"
                        onClick={() => removePricingDraft(index)}
                        disabled={formData.pricingOptions.length <= 1}
                      >
                        Remove
                      </Button>
                    </div>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground">
                  Add between 1 and 3 unit-price options. Keep units in one family only (kg pair, dozen pair, or litre/ml set).
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageFile">Upload Image</Label>
                <input
                  id="imageFile"
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    void handleImageSelection(selectedFile);
                  }}
                />
                <div className="rounded-xl sm:rounded-2xl border-2 border-[#255c45] bg-background p-3">
                  <div className="flex min-w-0 flex-col gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 overflow-hidden rounded-xl border border-black bg-white px-3 py-2.5">
                        <Button
                          type="button"
                          className="h-10 shrink-0 rounded-xl border border-amber-300 bg-amber-400 px-5 text-slate-900 hover:bg-amber-500"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Choose File
                        </Button>
                        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm text-foreground" title={imageFile ? imageFile.name : 'No file chosen'}>
                          {imageFile ? imageFile.name : 'No file chosen'}
                        </span>
                      </div>
                    </div>

                    {(imageFile || editingProduct?.image) && (
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex flex-col items-start justify-end gap-2">
                          {imageFile && (
                            <Button type="button" variant="destructive" size="sm" onClick={clearSelectedImage}>
                              <Trash2 className="w-4 h-4" />
                              Remove selected image
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            className="border border-amber-300 bg-amber-400 text-slate-900 hover:bg-amber-500"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            Change image
                          </Button>
                        </div>

                        <div className="w-36 shrink-0">
                          <img
                            src={imagePreviewUrl || editingProduct?.image}
                            alt="Selected product preview"
                            className="w-36 h-24 rounded-xl border border-[#255c45] object-cover bg-muted"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Choose a file from your computer. It will be uploaded to Cloudinary automatically.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayPosition">Display Position</Label>
                <Input
                  id="displayPosition"
                  type="number"
                  min={1}
                  max={maxDisplayPositionForForm}
                  value={formData.displayPosition}
                  onChange={(e) => setFormData({ ...formData, displayPosition: e.target.value })}
                  className="h-12 rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 focus-visible:ring-0 focus-visible:border-[#255c45] focus:outline-none"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a position from 1 to {maxDisplayPositionForForm}. The selected product will move there and the others will shift automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-[#255c45]/20 bg-slate-100/95 px-4 py-3 sm:px-6 sm:py-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="h-11 w-full rounded-xl sm:rounded-2xl border border-amber-300 bg-amber-400 px-6 text-slate-900 hover:bg-amber-500"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button className="h-11 w-full rounded-xl sm:rounded-2xl px-6" onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteId(null);
        }}
        title="Delete product?"
        description="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminProducts;
