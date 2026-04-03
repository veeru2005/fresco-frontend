import { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Product } from '@/data/mockData';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Search, Trash2, PackageSearch } from 'lucide-react';

const UNIT_OPTIONS = ['kg', 'gm', 'dozen', 'half dozen', 'liter', 'ml'];
const MAX_IMAGE_UPLOAD_BYTES = 1024 * 1024;
const TARGET_IMAGE_UPLOAD_BYTES = 950 * 1024;

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
    price: '',
    unit: 'kg',
    description: '',
  });
  const { toast } = useToast();
  const canManageProducts = user?.isSuperAdmin === true;

  // Filter products based on search query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const token = localStorage.getItem('fresco_token');
        const res = await fetch(`${VITE_API_BASE_URL}/api/admin/products`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (res.ok) {
          const data = await res.json();
          setProducts(data);
        }
      } catch (error) {
        console.error('Error loading products:', error);
      }
    };

    loadProducts();
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
        setProducts(products.filter(v => v.id !== id));
        toast({ title: 'Success', description: 'Product deleted', variant: 'success' });
        window.dispatchEvent(new Event('fresco_products_updated'));
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

    setEditingProduct(product);
    clearSelectedImage();
    setFormData({
      name: product.name,
      price: product.price.toString(),
      unit: (product as any).unit || 'kg',
      description: product.description,
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
      price: '',
      unit: 'kg',
      description: '',
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!canManageProducts) {
      toast({ title: 'View only access', description: 'Only super admins can update products', variant: 'destructive' });
      return;
    }

    const formPayload = new FormData();
    if (!formData.name.trim() || Number(formData.price) <= 0) {
      toast({
        title: 'Missing required fields',
        description: 'Please provide product name and price.',
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

    formPayload.append('name', formData.name.trim());
    formPayload.append('price', String(Number(formData.price)));
    formPayload.append('unit', formData.unit || 'kg');
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
          setProducts(products.map(v => (v.id || (v as any)._id) === editingProductId ? updated : v));
          toast({ title: 'Success', description: 'Product updated successfully!', variant: 'default' });
          window.dispatchEvent(new Event('fresco_products_updated'));
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
          setProducts([created, ...products]);
          toast({ title: 'Success', description: 'Product added successfully!', variant: 'default' });
          window.dispatchEvent(new Event('fresco_products_updated'));
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
      const product = products.find(v => v.id === id);
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
        setProducts(products.map(v => v.id === id ? updated : v));
        toast({
          title: 'Updated',
          description: `Product marked ${updated.available ? 'available' : 'unavailable'}`,
          variant: 'default',
        });
        window.dispatchEvent(new Event('fresco_products_updated'));
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
        {filteredProducts.map(product => (
          <Card key={product.id} className="w-[96%] mx-auto sm:w-full overflow-hidden border-2 border-[#255c45] rounded-3xl transition-all duration-300 hover:shadow-xl flex flex-col h-full">
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
                  ₹{Number(product.price || 0)}
                  <span className="text-muted-foreground font-semibold text-sm">/{(product as any).unit || 'kg'}</span>
                </p>
              </div>
              <p
                className={`text-sm !text-[0.9rem] mb-auto line-clamp-3 text-muted-foreground leading-relaxed ${
                  canManageProducts ? 'min-h-[64px]' : 'min-h-[40px]'
                }`}
              >
                {product.description || 'No description available'}
              </p>
              <div className="flex flex-col gap-2 mt-4">
                {canManageProducts ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        onClick={() => toggleAvailability(product.id)} 
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
                    <Button onClick={() => handleRequestDelete(product.id)} variant="destructive" size="sm" className="w-full text-sm">
                      Delete
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-0.5">View Access Only</p>
                )}
              </div>
            </div>
          </Card>
        ))}
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
        <DialogContent className="w-[92vw] sm:w-[95vw] max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-[28px] border-2 border-[#255c45] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="h-12 rounded-xl sm:rounded-2xl border-2 border-[#255c45] px-4 focus-visible:ring-0 focus-visible:border-[#255c45] focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <select
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full h-12 appearance-none rounded-xl sm:rounded-2xl border-2 border-[#255c45] bg-white px-4 pr-10 text-sm shadow-sm transition-colors focus:outline-none focus:border-[#255c45] focus:ring-0 bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20fill=%22none%22%20viewBox=%220%200%2024%2024%22%20stroke-width=%222%22%20stroke=%22%23255c45%22%3E%3Cpath%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22%20d=%22M19.5%208.25l-7.5%207.5-7.5-7.5%22%20/%3E%3C/svg%3E')] bg-[position:right_1rem_center] bg-[length:1.25rem_1.25rem]"
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
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
                <div className="flex flex-col md:flex-row gap-4 md:items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-[#255c45]/60 bg-white px-3 py-2.5">
                      <Button
                        type="button"
                        className="h-10 rounded-xl border border-amber-300 bg-amber-400 px-5 text-slate-900 hover:bg-amber-500"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Choose File
                      </Button>
                      <span className="text-sm text-foreground truncate">
                        {imageFile ? imageFile.name : 'No file chosen'}
                      </span>
                    </div>

                    {(imageFile || editingProduct?.image) && (
                      <div className="flex flex-wrap items-center gap-2">
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
                    )}
                  </div>

                  {(imageFile || editingProduct?.image) && (
                    <div className="w-full md:w-auto shrink-0">
                      <img
                        src={imagePreviewUrl || editingProduct?.image}
                        alt="Selected product preview"
                        className="w-full md:w-36 h-24 rounded-xl border border-[#255c45] object-cover bg-muted"
                      />
                    </div>
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Choose a file from your computer. It will be uploaded to Cloudinary automatically.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                className="h-11 rounded-xl sm:rounded-2xl border border-amber-300 bg-amber-400 px-6 text-slate-900 hover:bg-amber-500"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </Button>
              <Button className="h-11 rounded-xl sm:rounded-2xl px-6" onClick={handleUpdate} disabled={isSaving}>
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
