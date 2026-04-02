import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
import { Package, MapPin, Clock, CheckCircle, XCircle } from 'lucide-react';

const Tracking = () => {
  const location = useLocation();
  const [orderId, setOrderId] = useState('');
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { toast } = useToast();

  // Auto-load order if orderId is passed via navigation state
  useEffect(() => {
    const stateOrderId = (location.state as any)?.orderId;
    if (stateOrderId) {
      setOrderId(stateOrderId);
      setIsInitialLoad(true);
      // Automatically track the order
      fetchOrder(stateOrderId);
    } else {
      setIsInitialLoad(false);
    }
  }, [location.state]);

  // Auto-refresh order details every 10 seconds when tracking
  useEffect(() => {
    if (!orderDetails) return;

    const fetchOrderDetails = async () => {
      try {
        const token = localStorage.getItem('fresco_token');
        const response = await fetch(`${VITE_API_BASE_URL}/api/orders/${encodeURIComponent(orderDetails.orderId)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (response.ok) {
          const order = await response.json();
          setOrderDetails(order);
        }
      } catch (error) {
        console.error('Error refreshing order:', error);
      }
    };

    const interval = setInterval(fetchOrderDetails, 10000);
    return () => clearInterval(interval);
  }, [orderDetails?.orderId]);

  // Listen for order updates from admin
  useEffect(() => {
    if (!orderDetails) return;

    const handleOrderUpdate = () => {
      // Immediately refresh when admin updates
      const fetchOrderDetails = async () => {
        try {
          const token = localStorage.getItem('fresco_token');
          const response = await fetch(`${VITE_API_BASE_URL}/api/orders/${encodeURIComponent(orderDetails.orderId)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (response.ok) {
            const order = await response.json();
            setOrderDetails(order);
          }
        } catch (error) {
          console.error('Error refreshing order:', error);
        }
      };
      fetchOrderDetails();
    };

    window.addEventListener('travelease:ordersUpdated', handleOrderUpdate);
    return () => window.removeEventListener('travelease:ordersUpdated', handleOrderUpdate);
  }, [orderDetails?.orderId]);

  const fetchOrder = async (orderIdToFetch: string) => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('fresco_token');
      const response = await fetch(`${VITE_API_BASE_URL}/api/orders/${encodeURIComponent(orderIdToFetch)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (response.ok) {
        const order = await response.json();
        setOrderDetails(order);
        setIsInitialLoad(false);
      } else if (response.status === 404) {
        toast({
          title: 'Order Not Found',
          description: 'No order found with this ID. Please check and try again.',
          variant: 'destructive',
        });
        setOrderDetails(null);
        setIsInitialLoad(false);
      } else {
        throw new Error('Failed to fetch order');
      }
    } catch (error) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: 'Failed to track order. Please try again.',
        variant: 'destructive',
      });
      setOrderDetails(null);
      setIsInitialLoad(false);
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderId) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an order ID.',
        variant: 'destructive',
      });
      return;
    }

    fetchOrder(orderId);
  };

  const getStatusStep = (status: string) => {
    const statusMap: { [key: string]: number } = {
      'BOOKING_CONFIRMED': 1,
      'VEHICLE_PREPARED': 2,
      'ON_THE_WAY': 3,
      'DELIVERED': 4
    };
    return statusMap[status] || 0;
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      'BOOKING_CONFIRMED': 'Order Confirmed',
      'VEHICLE_PREPARED': 'Product Prepared',
      'ON_THE_WAY': 'On The Way',
      'DELIVERED': 'Delivered',
      'CANCELLED': 'Cancelled',
      'CANCELED': 'Cancelled'
    };
    return labels[status] || status;
  };

  return (
    <div className="min-h-screen py-6 sm:py-16 md:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
        {loading && isInitialLoad && (
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Loading...</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Please wait while we fetch your order details
            </p>
          </div>
        )}
        
        {!loading && !orderDetails && !isInitialLoad && (
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">Track Your Order</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Please navigate from My Orders page to track your order
            </p>
          </div>
        )}

        {orderDetails && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom duration-500">
            <Card className="p-6 sm:p-8 border-2 border-[#2f7d5b]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Order Information</h2>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Order ID</p>
                      <p className="font-semibold break-all">{orderDetails.orderId}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Product</p>
                      <p className="font-semibold">{orderDetails.productName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Date</p>
                      <p className="font-semibold">
                        {new Date(orderDetails.bookingDate).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current Status</p>
                      <p className={`font-semibold ${orderDetails.orderStatus === 'CANCELLED' || orderDetails.orderStatus === 'CANCELED' ? 'text-red-600' : 'text-primary'}`}>
                        {getStatusLabel(orderDetails.orderStatus)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-semibold">
                        {orderDetails.paymentMethod || 'Cash on Delivery'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <p className="font-semibold">
                        {String(orderDetails.paymentStatus || (String(orderDetails.orderStatus || '').toUpperCase() === 'DELIVERED' ? 'COMPLETED' : 'PENDING')).toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Amount</p>
                      <p className="font-semibold">₹{Number(orderDetails.paymentAmount || orderDetails.totalAmount || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered Date</p>
                      <p className="font-semibold">
                        {String(orderDetails.orderStatus || '').toUpperCase() === 'DELIVERED'
                          ? new Date(orderDetails.deliveredDate || orderDetails.endDate || orderDetails.bookingDate).toLocaleDateString('en-IN', {
                              dateStyle: 'medium'
                            })
                          : 'Not delivered yet'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="lg:border-l lg:border-[#2f7d5b]/35 lg:pl-8">
                  <h3 className="text-lg font-bold mb-6">Tracking Progress</h3>
                
                <div className="relative">
                  {/* Steps */}
                  <div>
                    {(() => {
                      const isCancelled = orderDetails.orderStatus === 'CANCELLED' || orderDetails.orderStatus === 'CANCELED';
                      
                      let steps = [
                        {
                          label: 'Order Confirmed',
                          description: 'Your order has been confirmed and payment processed',
                          icon: CheckCircle,
                        }
                      ];

                      if (isCancelled) {
                        steps.push({
                          label: 'Order Cancelled',
                          description: 'Your order has been cancelled',
                          icon: XCircle,
                        });
                      } else {
                        steps.push(
                          {
                            label: 'Product Prepared',
                            description: 'Product has been prepared and ready for dispatch',
                            icon: Package,
                          },
                          {
                            label: 'On The Way',
                            description: 'Product is on the way to your delivery location',
                            icon: MapPin,
                          },
                          {
                            label: 'Delivered',
                            description: 'Product has been delivered to your location',
                            icon: CheckCircle,
                          }
                        );
                      }

                      return steps.map((step, index, arr) => {
                        const stepNumber = index + 1;
                        let isDone = false;
                        let nextDone = false;
                        let isErrorStep = false;
                        let lineClass = 'bg-border';
                        
                        if (isCancelled) {
                           if (index === 0) {
                             isDone = true;
                             nextDone = true;
                             lineClass = 'bg-red-500';
                           }
                           if (index === 1) {
                             isDone = true;
                             isErrorStep = true;
                           }
                        } else {
                           isDone = getStatusStep(orderDetails.orderStatus) >= stepNumber;
                           nextDone = getStatusStep(orderDetails.orderStatus) >= stepNumber + 1;
                           lineClass = nextDone ? 'bg-[#2f7d5b]' : 'bg-border';
                        }

                        const isLast = index === arr.length - 1;
                        const StepIcon = step.icon;

                        return (
                          <div key={index} className={`relative flex items-start gap-4 ${isCancelled && index === 0 ? 'pb-[200px]' : 'pb-8'} last:pb-0`}>
                            {!isLast && (
                              <div
                                className={`absolute left-6 top-12 bottom-0 w-0.5 ${lineClass}`}
                              ></div>
                            )}
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center z-10 ${
                                isErrorStep ? 'bg-red-500 text-white' : (isDone ? 'bg-[#2f7d5b] text-white' : 'bg-muted text-muted-foreground')
                              }`}
                            >
                              <StepIcon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 pt-2">
                              <h4 className={`font-semibold text-lg ${isErrorStep ? 'text-red-500' : ''}`}>{step.label}</h4>
                              <p className={`text-sm ${isErrorStep ? 'text-red-400' : 'text-muted-foreground'}`}>{step.description}</p>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
              </div>
            </Card>

            <Card className="p-6 bg-[#edf7f2] border-[2.5px] border-[#255c45] shadow-sm">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-1">Need Help?</h4>
                  <p className="text-sm text-muted-foreground">
                    Contact our 24/7 support team at <span className="text-primary font-semibold">+91 9110380467</span> or email us at{' '}
                    <span className="text-primary font-semibold">frescoorganics20@gmail.com</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Tracking;
