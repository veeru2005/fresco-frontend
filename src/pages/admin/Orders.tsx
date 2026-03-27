import { useEffect, useMemo, useState } from 'react';
import { formatDateDDMMYYYY } from '@/lib/date';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { ChevronDown, Search, ShoppingBag, Trash2 } from 'lucide-react';

interface Order {
  id: string;
  orderId: string;
  productName: string;
  productImage?: string;
  orderedItems?: Array<{
    productId?: string;
    name: string;
    image?: string;
    quantity: number;
    unitPrice?: number;
    itemAmount?: number;
  }>;
  username: string;
  address: string;
  mobileNumber: string;
  paymentAmount: number;
  paymentStatus: string;
  startDate: string;
  endDate: string;
  bookingDate: string;
  deliveredDate?: string | null;
  paymentMethod?: string;
  orderStatus: string;
}

const AdminOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDeleteOrderId, setPendingDeleteOrderId] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const isSuperAdmin = user?.isSuperAdmin;
  const canDeleteOrders = isSuperAdmin;
  const orderStatusOptions = [
    { value: 'BOOKING_CONFIRMED', label: 'Order Confirmed' },
    { value: 'VEHICLE_PREPARED', label: 'Product Prepared' },
    { value: 'ON_THE_WAY', label: 'On The Way' },
    { value: 'DELIVERED', label: 'Delivered' },
  ];

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return [...orders]
      .sort((a, b) => {
        const aTime = new Date(a.bookingDate || 0).getTime();
        const bTime = new Date(b.bookingDate || 0).getTime();
        return bTime - aTime;
      })
      .filter((order) => {
        if (!q) return true;
        return (
          String(order.orderId || '').toLowerCase().includes(q) ||
          String(order.productName || '').toLowerCase().includes(q) ||
          String(order.username || '').toLowerCase().includes(q) ||
          String(order.mobileNumber || '').includes(searchQuery)
        );
      });
  }, [orders, searchQuery]);

  useEffect(() => {
    loadOrders();
  }, []);

  const toggleOrderItems = (orderId: string) => {
    setExpandedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        setErrorMsg(null);
      } else {
        setErrorMsg('Failed to load orders from server');
      }
    } catch (err) {
      console.error('Error loading orders:', err);
      setErrorMsg('Error connecting to server');
    } finally {
      setLoading(false);
    }
  };

  // Listen for new orders created in other pages
  useEffect(() => {
    function onOrdersUpdated() {
      loadOrders();
    }

    window.addEventListener('travelease:ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('travelease:ordersUpdated', onOrdersUpdated);
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('fresco_token');
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Optimistically update the UI
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o.id === orderId
            ? {
                ...o,
                orderStatus: newStatus,
                deliveredDate: newStatus === 'DELIVERED' ? new Date().toISOString() : null,
                paymentStatus: newStatus === 'DELIVERED' ? 'COMPLETED' : 'PENDING',
              }
            : o
        )
      );

      const response = await fetch(`${VITE_API_BASE_URL}/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderStatus: newStatus })
      });

      if (response.ok) {
        toast({
          title: 'Status Updated',
          description: 'Order status has been updated successfully',
        });
        // Notify other pages about the update
        window.dispatchEvent(new CustomEvent('travelease:ordersUpdated'));
        // Reload to ensure consistency
        await loadOrders();
      } else {
        // Revert on failure
        await loadOrders();
        toast({
          title: 'Update Failed',
          description: 'Failed to update order status',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating order status:', error);
      // Revert on error
      await loadOrders();
      toast({
        title: 'Error',
        description: 'Failed to update order status',
        variant: 'destructive',
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!isSuperAdmin) return;

    try {
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/orders/admin/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
        toast({ title: 'Deleted', description: 'Order deleted successfully' });
      } else {
        const payload = await response.json().catch(() => ({}));
        toast({ title: 'Delete failed', description: payload?.error || 'Failed to delete order', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Delete failed', description: 'Failed to delete order', variant: 'destructive' });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'BOOKING_CONFIRMED': 'Order Confirmed',
      'VEHICLE_PREPARED': 'Product Prepared',
      'ON_THE_WAY': 'On The Way',
      'DELIVERED': 'Delivered'
    };
    return labels[status] || status;
  };

  const getStatusTone = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'DELIVERED') {
      return { dot: 'bg-green-600', text: 'text-green-800', note: 'Order has been delivered.' };
    }
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
      return { dot: 'bg-red-500', text: 'text-red-700', note: 'Order was cancelled.' };
    }
    if (normalized === 'ON_THE_WAY') {
      return { dot: 'bg-amber-500', text: 'text-amber-700', note: 'Order is on the way.' };
    }
    return { dot: 'bg-blue-600', text: 'text-blue-700', note: 'Order is in progress.' };
  };

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8 lg:pb-20">
        <div className="mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Orders</h1>
              <p className="text-muted-foreground">Manage customer orders</p>
            </div>
            <div className="relative w-full md:w-80 rounded-2xl border-2 border-[#255c45] overflow-hidden">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by order ID, product, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl border-0 shadow-none focus-visible:ring-0 focus-visible:border-0"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <Card className="mb-4 border-2 border-[#255c45]">
            <div className="p-4 text-sm text-red-600">{errorMsg}</div>
          </Card>
        )}

        {loading ? (
          <Card className="border-2 border-[#255c45]">
            <div className="p-8 text-center text-muted-foreground">Loading orders...</div>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-2 border-[#255c45]">
            <div className="p-8 text-center text-muted-foreground">
              {searchQuery ? 'No orders found matching your search' : 'No orders found'}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const status = String(order.orderStatus || 'BOOKING_CONFIRMED').toUpperCase();
              const statusTone = getStatusTone(status);
              const isDelivered = status === 'DELIVERED';
              const displayPaymentStatus = isDelivered ? 'COMPLETED' : 'PENDING';
              const orderedItems = Array.isArray(order.orderedItems) ? order.orderedItems : [];
              const hasMultipleItems = orderedItems.length > 1;
              const isExpanded = expandedOrderIds.has(String(order.id));
              const orderedItemsLabel = orderedItems
                .map((item) => `${item.name} x${Math.max(1, Number(item.quantity || 1))}`)
                .join(', ');

              return (
                  <Card key={order.id} className="bg-white border-2 border-[#255c45] shadow-sm">
                  <div className="p-4">
                        <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_170px_minmax(300px,380px)] gap-4 items-start">
                        <div className="col-span-2 lg:col-span-1 flex items-center gap-3 min-w-0">
                        {hasMultipleItems ? (
                          <div className="w-20 h-20 rounded-md border-2 border-[#255c45] bg-emerald-50 shrink-0 flex items-center justify-center">
                            <ShoppingBag className="w-9 h-9 text-[#255c45]" />
                          </div>
                        ) : (
                          <img
                            src={order.productImage || 'https://placehold.co/84x84?text=Item'}
                            alt={order.productName || 'Product'}
                            className="w-20 h-20 rounded-md object-cover border-2 border-[#255c45] shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-base truncate">{hasMultipleItems ? `${orderedItems.length} Items (Total Order)` : (order.productName || 'Product')}</p>
                          <p className="text-sm text-muted-foreground">Order ID: {order.orderId}</p>
                          {orderedItems.length > 0 && (
                            <p className="text-sm text-muted-foreground truncate">Items: {orderedItemsLabel}</p>
                          )}
                          <p className="text-sm text-muted-foreground">User: {order.username}</p>
                          <p className="text-sm text-muted-foreground">Mobile: {order.mobileNumber}</p>
                          {hasMultipleItems && (
                            <button
                              type="button"
                              onClick={() => toggleOrderItems(String(order.id))}
                              className="mt-1 hidden lg:inline-flex items-center gap-1 text-sm font-semibold text-[#255c45]"
                            >
                              {isExpanded ? 'Hide items' : 'View items'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="col-span-1 lg:self-center lg:justify-self-center text-left lg:text-center">
                        <p className="font-semibold text-lg">₹{order.paymentAmount}</p>
                        <p className="text-xs text-muted-foreground mt-1">{displayPaymentStatus}</p>
                        <p className="text-xs text-muted-foreground mt-1">Ordered: {formatDateDDMMYYYY(order.bookingDate)}</p>
                      </div>

                      <div className="col-span-1 space-y-2 justify-self-end text-right min-w-[150px] lg:min-w-[300px]">
                        <p className={`text-base font-semibold flex items-center justify-end gap-2 ${statusTone.text}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${statusTone.dot}`} />
                          {getStatusLabel(status)}
                        </p>
                        <p className="text-sm text-muted-foreground">{statusTone.note}</p>

                        <div className="hidden lg:flex pt-1 lg:justify-end">
                            <div className="grid grid-cols-[210px_auto] items-center gap-2 w-full sm:w-auto">
                              <Select
                                value={order.orderStatus || 'BOOKING_CONFIRMED'}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-full h-10 min-h-10 px-2.5 text-sm border-2 border-[#255c45] focus:ring-0 focus:ring-offset-0 focus:border-[#255c45]">
                                  <SelectValue>
                                    {getStatusLabel(order.orderStatus || 'BOOKING_CONFIRMED')}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-sm">
                                  {orderStatusOptions.map((statusOption) => (
                                    <SelectItem
                                      key={statusOption.value}
                                      value={statusOption.value}
                                      className="py-1.5 text-sm"
                                    >
                                      {statusOption.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {canDeleteOrders && (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteOrderId(order.id)}
                                  className="inline-flex h-10 justify-center shrink-0 items-center rounded-md bg-red-600 px-3 text-white hover:bg-red-700 whitespace-nowrap"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </button>
                              )}
                            </div>
                        </div>
                      </div>

                      <div className="col-span-2 lg:hidden pt-1">
                        <div className="flex flex-col gap-2 w-full">
                          {hasMultipleItems && (
                            <div className="flex items-center w-full">
                              <button
                                type="button"
                                onClick={() => toggleOrderItems(String(order.id))}
                                className="inline-flex items-center gap-1 text-sm font-semibold text-[#255c45]"
                              >
                                {isExpanded ? 'Hide items' : 'View items'}
                                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center gap-2 w-full">
                            <div className="flex-1 min-w-0">
                              <Select
                                value={order.orderStatus || 'BOOKING_CONFIRMED'}
                                onValueChange={(value) => updateOrderStatus(order.id, value)}
                              >
                                <SelectTrigger className="w-full h-10 min-h-10 px-2.5 text-sm border-2 border-[#255c45] focus:ring-0 focus:ring-offset-0 focus:border-[#255c45]">
                                  <SelectValue>
                                    {getStatusLabel(order.orderStatus || 'BOOKING_CONFIRMED')}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent className="text-sm">
                                  {orderStatusOptions.map((statusOption) => (
                                    <SelectItem
                                      key={statusOption.value}
                                      value={statusOption.value}
                                      className="py-1.5 text-sm"
                                    >
                                      {statusOption.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {canDeleteOrders && (
                              <button
                                type="button"
                                onClick={() => setPendingDeleteOrderId(order.id)}
                                className="inline-flex h-10 justify-center shrink-0 items-center rounded-md bg-red-600 px-3 text-white hover:bg-red-700 whitespace-nowrap"
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {hasMultipleItems && isExpanded && (
                        <div className="col-span-2 lg:col-span-3 mt-1 border-t border-[#255c45] pt-3 space-y-2">
                          {orderedItems.map((item, idx) => (
                            <div key={`${order.id}-${item.productId || idx}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-[#255c45] px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0 col-span-2">
                                <img
                                  src={item.image || 'https://placehold.co/48x48?text=Item'}
                                  alt={item.name || 'Item'}
                                  className="w-12 h-12 rounded object-cover border border-[#255c45] shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm leading-tight break-words">{item.name || 'Item'}</p>
                                  <p className="text-xs text-muted-foreground">Qty: {Math.max(1, Number(item.quantity || 1))}</p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold text-right shrink-0">₹{Number(item.itemAmount || 0)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmActionDialog
        open={!!pendingDeleteOrderId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteOrderId(null);
        }}
        title="Delete order?"
        description="This action cannot be undone. Do you want to continue?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (!pendingDeleteOrderId) return;
          deleteOrder(pendingDeleteOrderId);
          setPendingDeleteOrderId(null);
        }}
      />
    </ErrorBoundary>
  );
};

export default AdminOrders;
