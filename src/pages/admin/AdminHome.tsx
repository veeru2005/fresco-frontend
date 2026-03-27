import { Card } from '@/components/ui/card';
import { useCallback, useEffect, useState } from 'react';
import { Leaf, Package, Users, MessageSquare, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const VITE_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

const AdminHome = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super-admin';
  const [productsCount, setProductsCount] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);

  const loadDashboardStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${VITE_API_BASE_URL}/api/admin/dashboard-stats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 401) {
          localStorage.removeItem('fresco_token');
          localStorage.removeItem('fresco_user');
          toast({
            title: 'Session expired',
            description: 'Please sign in again to continue.',
            variant: 'destructive',
          });
          navigate('/signin', { replace: true, state: { redirectTo: '/admin' } });
          return;
        }

        throw new Error(`Failed to load dashboard stats (${res.status})`);
      }

      const data = await res.json();
      setProductsCount(Number(data.productsCount || 0));
      setOrdersCount(Number(data.ordersCount || 0));
      setCustomersCount(Number(data.customersCount || 0));
      setAdminsCount(Number(data.adminsCount || 0));
      setFeedbackCount(Number(data.feedbackCount || 0));
    } catch (error) {
      console.error('Error loading admin dashboard stats:', error);
      toast({
        title: 'Dashboard load failed',
        description: 'Could not fetch latest counts and feedback.',
        variant: 'destructive',
      });
    }
  }, [navigate, toast]);

  useEffect(() => {
    loadDashboardStats();
  }, [loadDashboardStats]);

  return (
    <>
      <section className="relative bg-gradient-to-br from-[#1f5b3f] via-[#2f7656] to-[#5ea06e] text-white py-10 sm:py-12 md:py-14 lg:py-16 overflow-hidden">
         <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dv5qxkxmc/image/upload/v1774415349/photo-1542838132-92c53300491e_wdxh2g.jpg')] bg-cover bg-[center_20%] opacity-32"></div>
         <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/30 to-[#103626]/55 backdrop-blur-[2px]"></div>
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,214,10,0.16),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.12),transparent_45%)]"></div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-8 sm:pt-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold leading-tight">
              Welcome back, {user?.username || 'Admin'}!
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/90">
              {isSuperAdmin
                ? 'Super Admin access: full control of products, orders, customers, and feedback.'
                : 'Admin access: view data and update order status from the admin console.'}
            </p>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">{isSuperAdmin ? 'Super Admin Dashboard' : 'Admin Dashboard'}</h1>
        <p className="text-muted-foreground">Live overview of your organic store</p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-6`}>
        <Card className="p-8 border-2 border-emerald-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-emerald-100">
              <Leaf className="w-8 h-8 text-emerald-700" />
            </div>
            <h3 className="text-xl font-semibold">Products</h3>
            <p className="text-3xl font-extrabold text-emerald-700">{productsCount}</p>
          </div>
        </Card>

        <Card className="p-8 border-2 border-amber-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-amber-100">
              <Package className="w-8 h-8 text-amber-700" />
            </div>
            <h3 className="text-xl font-semibold">Orders</h3>
            <p className="text-3xl font-extrabold text-amber-700">{ordersCount}</p>
          </div>
        </Card>

        {isSuperAdmin && (
          <Card className="p-8 border-2 border-lime-500">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-4 rounded-full bg-lime-100">
                <Users className="w-8 h-8 text-lime-700" />
              </div>
              <h3 className="text-xl font-semibold">Customers</h3>
              <p className="text-3xl font-extrabold text-lime-700">{customersCount}</p>
            </div>
          </Card>
        )}

        <Card className="p-8 border-2 border-cyan-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-cyan-100">
              <UserCog className="w-8 h-8 text-cyan-700" />
            </div>
            <h3 className="text-xl font-semibold">Admins</h3>
            <p className="text-3xl font-extrabold text-cyan-700">{adminsCount}</p>
          </div>
        </Card>

        <Card className="p-8 border-2 border-orange-500">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-full bg-orange-100">
              <MessageSquare className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold">Unread Feedback</h3>
            <p className="text-3xl font-extrabold text-orange-700">{feedbackCount}</p>
          </div>
        </Card>
      </div>
    </div>
    </>
  );
};

export default AdminHome;
