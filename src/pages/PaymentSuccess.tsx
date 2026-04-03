import { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { buildDeliveryAddressLines } from '@/lib/locationOptions';

type DeliveryDetailsState = {
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
};

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const order = location.state?.order;
  const deliveryDetails = (location.state?.deliveryDetails || null) as DeliveryDetailsState | null;

  useEffect(() => {
    if (!order) {
      navigate('/products');
    }
  }, [order, navigate]);

  if (!order) return null;

  const deliveryAddressLines = (() => {
    if (deliveryDetails) {
      const lines = buildDeliveryAddressLines({
        address: deliveryDetails.address,
        city: deliveryDetails.city,
        state: deliveryDetails.state,
        pincode: deliveryDetails.pincode,
        country: deliveryDetails.country || order.country,
      });

      if (lines.length) return lines;
    }

    const rawAddress = String(order.address || '').trim();
    if (!rawAddress) {
      return order.country ? [String(order.country)] : [];
    }

    return rawAddress
      .split('\n')
      .map((line: string) => line.trim())
      .filter(Boolean);
  })();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8">
      <Card className="w-full max-w-3xl p-6 sm:p-8 md:p-10 border-2 border-[#255c45]">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-success/10 p-4 rounded-full">
              <CheckCircle className="w-16 h-16 sm:w-20 sm:h-20 text-success" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 text-[#1f6a49]">Order Confirmed!</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Your order has been confirmed. Thanks for shopping with Fresco Organics!
            </p>
          </div>

          <Card className="p-6 bg-muted/30 text-left space-y-4 border-2 border-[#255c45]">
            <h2 className="text-xl font-bold text-center mb-4">Order Details</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-semibold">{order.orderId}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Product</p>
                <p className="font-semibold">{order.productName}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-semibold">{order.paymentMethod}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold text-primary text-lg">₹{order.paymentAmount}</p>
              </div>
              
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Order Date</p>
                <p className="font-semibold">
                  {new Date(order.bookingDate).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
              </div>

              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">Delivery Address</p>
                <div className="font-semibold space-y-1">
                  {deliveryAddressLines.map((line: string, index: number) => (
                    <p key={`delivery-line-${index}`} className="leading-relaxed">
                      {line}
                    </p>
                  ))}
                  {order.mobileNumber ? <p>Mobile: {order.mobileNumber}</p> : null}
                  {order.gender ? <p>Gender: {order.gender}</p> : null}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Link to="/my-orders" className="flex-1">
              <Button className="w-full bg-gradient-hero hover:opacity-90">
                View My Orders
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            
            <Link to="/tracking" state={{ orderId: order.orderId }} className="flex-1">
              <Button variant="outline" className="w-full border-black text-black hover:border-black hover:text-black">
                Track Order
              </Button>
            </Link>
          </div>

          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              A confirmation email has been sent to your registered email address.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
