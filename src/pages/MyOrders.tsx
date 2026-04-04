import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, Package, Navigation, Search, ShoppingBag } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';
import ConfirmActionDialog from '@/components/ConfirmActionDialog';
import { normalizeUnitLabel } from '@/lib/pricing';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const getDisplayUnit = (value: unknown) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return normalizeUnitLabel(raw, '') || raw;
};

const formatOrderedItemLabel = (item: any) => {
  const itemName = String(item?.name || 'Item');
  const quantity = Math.max(1, Number(item?.quantity || 1));
  const unit = getDisplayUnit(item?.unit);

  if (unit) {
    return quantity > 1 ? `${itemName} ${quantity} x ${unit}` : `${itemName} (${unit})`;
  }

  return `${itemName} x${quantity}`;
};

const MyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedOrderIds, setExpandedOrderIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    const loadOrders = async (isBackground = false) => {
      if (!user?.username) {
        if (!isBackground) setLoading(false);
        return;
      }

      try {
        if (!isBackground) setLoading(true);
        const token = localStorage.getItem('fresco_token');
        const response = await fetch(`${VITE_API_BASE_URL}/api/orders/my-orders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (response.ok) {
          const data = await response.json();
          setOrders(data);
        } else {
          console.error('Failed to fetch orders');
          setOrders([]);
        }
      } catch (err) {
        console.error('Error loading orders:', err);
        setOrders([]);
      } finally {
        if (!isBackground) setLoading(false);
      }
    };

    loadOrders();

    // Auto-refresh every 15 seconds to show updated order status
    const interval = setInterval(() => loadOrders(true), 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Listen for orders added elsewhere (e.g., payment page) and reload
  useEffect(() => {
    function onOrdersUpdated() {
      if (user?.username) {
        const token = localStorage.getItem('fresco_token');
        fetch(`${VITE_API_BASE_URL}/api/orders/my-orders`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
          .then(res => res.ok ? res.json() : [])
          .then(data => setOrders(data))
          .catch(err => console.error('Error reloading orders:', err));
      }
    }

    window.addEventListener('travelease:ordersUpdated', onOrdersUpdated);
    return () => window.removeEventListener('travelease:ordersUpdated', onOrdersUpdated);
  }, [user]);

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'BOOKING_CONFIRMED': 'Order Confirmed',
      'VEHICLE_PREPARED': 'Product Prepared',
      'ON_THE_WAY': 'On The Way',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'CANCELED': 'Cancelled',
    };
    return labels[status] || status;
  };

  const getStatusTone = (status: string) => {
    const normalized = String(status || '').toUpperCase();
    if (normalized === 'DELIVERED') {
      return {
        dot: 'bg-green-600',
        text: 'text-green-800',
        note: 'Your order has been delivered.',
      };
    }
    if (normalized === 'CANCELLED' || normalized === 'CANCELED') {
      return {
        dot: 'bg-red-500',
        text: 'text-red-700',
        note: 'This order was cancelled.',
      };
    }
    if (normalized === 'ON_THE_WAY') {
      return {
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        note: 'Your order is on the way.',
      };
    }
    return {
      dot: 'bg-blue-600',
      text: 'text-blue-700',
      note: 'Your order is being processed.',
    };
  };

  const handleTrackOrder = (orderId: string) => {
    navigate('/tracking', { state: { orderId } });
  };

  const handleCancelOrder = async () => {
    if (!orderToCancel) return;
    const orderId = orderToCancel;
    try {
      setCancellingId(orderId);
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const updatedOrder = await response.json();
        setOrders(curr => curr.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
      } else {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.error || 'Failed to cancel the order. Please try again.');
      }
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert('Error cancelling order. Please try again later.');
    } finally {
      setCancellingId(null);
      setIsCancelDialogOpen(false);
      setOrderToCancel(null);
    }
  };

  const openCancelDialog = (orderId: string) => {
    setOrderToCancel(orderId);
    setIsCancelDialogOpen(true);
  };

  const filteredOrders = useMemo(() => {
    const ordered = [...orders].sort((a, b) => {
      const aTime = new Date(a.bookingDate || a.booking_date || 0).getTime();
      const bTime = new Date(b.bookingDate || b.booking_date || 0).getTime();
      return bTime - aTime;
    });

    const q = searchQuery.trim().toLowerCase();

    return ordered.filter((order) => {
      const normalizedStatus = String(order.orderStatus || '').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || normalizedStatus === statusFilter;
      if (!matchesStatus) return false;

      if (!q) return true;
      return (
        String(order.orderId || order.id || '').toLowerCase().includes(q) ||
        String(order.productName || '').toLowerCase().includes(q) ||
        String(order.mobileNumber || '').toLowerCase().includes(q) ||
        getStatusLabel(normalizedStatus).toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery, statusFilter]);

  return (
    <div className="min-h-screen bg-slate-100/70 py-6 pb-14 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">Track order status and delivery updates</p>
        </div>

        <div className="mb-5 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders by product, order id, mobile..."
              className="pl-9 h-11 bg-white border-2 border-[#255c45] focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <div className="relative">
            <select
              className="h-11 w-full appearance-none rounded-md border-2 border-[#255c45] bg-white pl-3 pr-9 text-sm focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="BOOKING_CONFIRMED">Order Confirmed</option>
              <option value="VEHICLE_PREPARED">Product Prepared</option>
              <option value="ON_THE_WAY">On The Way</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">Loading your orders...</p>
            </CardContent>
          </Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="w-full p-6 sm:p-8 text-center border-2 border-[#255c45]">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-2xl font-bold mb-2">No matching orders</h3>
            <p className="text-muted-foreground">Try changing search or status filter</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const status = String(order.orderStatus || 'BOOKING_CONFIRMED').toUpperCase();
              const tone = getStatusTone(status);
              const displayPaymentStatus = status === 'DELIVERED' ? 'COMPLETED' : 'PENDING';
              const orderedItems = Array.isArray(order.orderedItems) ? order.orderedItems : [];
              const hasMultipleItems = orderedItems.length > 1;
              const isExpanded = expandedOrderIds.has(String(order.id));
              const orderedItemsLabel = orderedItems
                .map((item: any) => formatOrderedItemLabel(item))
                .join(', ');

              return (
                <Card key={order.id} className="bg-white border-2 border-[#255c45] shadow-sm">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-[minmax(0,1fr)_180px_minmax(280px,360px)] gap-4 items-start">
                      <div className="col-span-2 lg:col-span-1 flex items-start gap-3 min-w-0">
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
                          <p className="text-sm text-muted-foreground">Order ID: {order.orderId || order.id}</p>
                          {orderedItems.length > 0 && (
                            <p className="text-sm text-muted-foreground truncate">Items: {orderedItemsLabel}</p>
                          )}
                          <p className="text-sm text-muted-foreground">Ordered on {formatDateDDMMYYYY(order.bookingDate || order.booking_date)}</p>
                          {hasMultipleItems ? (
                            <button
                              type="button"
                              onClick={() => toggleOrderItems(String(order.id))}
                              className="hidden lg:inline-flex mt-1 items-center gap-1 text-sm font-semibold text-[#255c45]"
                            >
                              {isExpanded ? 'Hide items' : 'View items'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="col-span-1 lg:self-center lg:justify-self-center text-left lg:text-center">
                        <p className="font-semibold text-lg">₹{order.paymentAmount || order.amount || 0}</p>
                        <p className="text-xs text-muted-foreground mt-1">TOTAL PAYMENT</p>
                        <p className="text-xs text-muted-foreground mt-1">{displayPaymentStatus}</p>
                      </div>

                      <div className="col-span-1 space-y-2 justify-self-end text-right min-w-[150px] lg:min-w-[280px] lg:justify-self-end">
                        <div className="flex flex-col gap-1 items-end">
                          <p className={`text-base font-semibold flex items-center gap-2 lg:hidden ${tone.text}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${tone.dot}`} />
                            {getStatusLabel(status)}
                          </p>
                          <p className="text-sm text-muted-foreground mb-1">{tone.note}</p>
                          <p className={`hidden lg:flex text-sm font-semibold items-center gap-2 ${tone.text}`}>
                            <span className={`w-2 h-2 rounded-full ${tone.dot}`} />
                            {getStatusLabel(status)}
                          </p>
                        </div>
                        <div className="pt-2 flex flex-col items-end gap-3 lg:pt-2 lg:flex-row lg:items-center lg:justify-end">
                          <div className="hidden lg:flex items-center gap-2 ml-auto">
                            {(status === 'BOOKING_CONFIRMED' || status === 'VEHICLE_PREPARED') && (
                              <Button
                                onClick={() => openCancelDialog(String(order.id))}
                                size="sm"
                                disabled={cancellingId === String(order.id)}
                                variant="destructive"
                                className="bg-red-600 text-white hover:bg-red-700 font-medium"
                              >
                                {cancellingId === String(order.id) ? 'Cancelling...' : 'Cancel Order'}
                              </Button>
                            )}
                            <Button
                              onClick={() => handleTrackOrder(order.orderId || order.id)}
                              size="sm"
                              className="bg-[#255c45] text-white hover:bg-[#1f4a37]"
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Track Order
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="col-span-2 lg:hidden -mt-1 pt-1">
                        {hasMultipleItems ? (
                          <div className="grid grid-cols-3 items-center">
                            <button
                              type="button"
                              onClick={() => toggleOrderItems(String(order.id))}
                              className="justify-self-start inline-flex items-center gap-1 text-sm font-semibold text-[#255c45]"
                            >
                              {isExpanded ? 'Hide items' : 'View items'}
                              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>

                            {(status === 'BOOKING_CONFIRMED' || status === 'VEHICLE_PREPARED') ? (
                              <Button
                                onClick={() => openCancelDialog(String(order.id))}
                                size="sm"
                                disabled={cancellingId === String(order.id)}
                                variant="destructive"
                                className="justify-self-center bg-red-600 text-white hover:bg-red-700 font-medium h-8 px-2 text-xs"
                              >
                                {cancellingId === String(order.id) ? '...' : 'Cancel'}
                              </Button>
                            ) : (
                              <span />
                            )}

                            <Button
                              onClick={() => handleTrackOrder(order.orderId || order.id)}
                              size="sm"
                              className="justify-self-end bg-[#255c45] text-white hover:bg-[#1f4a37] h-8 px-2 text-xs"
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Track
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            {(status === 'BOOKING_CONFIRMED' || status === 'VEHICLE_PREPARED') ? (
                              <Button
                                onClick={() => openCancelDialog(String(order.id))}
                                size="sm"
                                disabled={cancellingId === String(order.id)}
                                variant="destructive"
                                className="bg-red-600 text-white hover:bg-red-700 font-medium h-8 px-2 text-xs"
                              >
                                {cancellingId === String(order.id) ? '...' : 'Cancel'}
                              </Button>
                            ) : (
                              <span />
                            )}

                            <Button
                              onClick={() => handleTrackOrder(order.orderId || order.id)}
                              size="sm"
                              className="bg-[#255c45] text-white hover:bg-[#1f4a37] h-8 px-2 text-xs"
                            >
                              <Navigation className="w-3 h-3 mr-1" />
                              Track
                            </Button>
                          </div>
                        )}
                      </div>

                      {hasMultipleItems && isExpanded && (
                        <div className="col-span-2 lg:col-span-3 mt-1 border-t border-[#255c45] pt-3 space-y-2">
                          {orderedItems.map((item: any, idx: number) => (
                            <div key={`${order.id}-${item.productId || idx}`} className="flex items-center justify-between gap-3 rounded-md border border-[#255c45] px-3 py-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <img
                                  src={item.image || 'https://placehold.co/48x48?text=Item'}
                                  alt={item.name || 'Item'}
                                  className="w-10 h-10 rounded object-cover border border-[#255c45] shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name || 'Item'}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Qty: {Math.max(1, Number(item.quantity || 1))}
                                    {getDisplayUnit(item.unit) ? ` (${getDisplayUnit(item.unit)})` : ''}
                                    {` • ₹${Number(item.unitPrice || 0)} each`}
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm font-semibold shrink-0">₹{Number(item.itemAmount || 0)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmActionDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Cancel Order"
        description="Are you sure you want to cancel this order? This action cannot be undone."
        confirmLabel={cancellingId ? "Cancelling..." : "Cancel Order"}
        cancelLabel="Keep Order"
        onConfirm={handleCancelOrder}
      />
    </div>
  );
};

export default MyOrders;
