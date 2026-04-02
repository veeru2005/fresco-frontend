import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useLayoutEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Cart from "./pages/Cart";
import DeliveryDetails from "./pages/DeliveryDetails";
import Payment from "./pages/Payment";
import PaymentSuccess from "./pages/PaymentSuccess";
import Tracking from "./pages/Tracking";
import Feedback from "./pages/Feedback";
import AboutUs from "./pages/AboutUs";
import MyOrders from "./pages/MyOrders";
import Profile from "./pages/Profile";
import AdminHome from "./pages/admin/AdminHome";
import AdminProducts from "./pages/admin/Products";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import AdminFeedback from "./pages/admin/Feedback";
import Admins from "./pages/admin/Admins";
import { useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isMobileViewRef = useRef<boolean | null>(null);
  const hideFooterRoutes = [
    '/signin',
    '/signup',
    '/products',
    '/cart',
    '/feedback',
    '/tracking',
    '/my-orders',
    '/my-bookings',
    '/profile',
    '/delivery-details',
    '/payment',
    '/payment-success',
  ];
  const shouldHideFooter =
    location.pathname.startsWith('/admin') || hideFooterRoutes.includes(location.pathname);
  const useCompactMobileBottom = ['/signin'].includes(location.pathname);

  useEffect(() => {
    if (!('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    isMobileViewRef.current = window.innerWidth < 1024;

    const handleResize = () => {
      const isMobileNow = window.innerWidth < 1024;
      if (isMobileViewRef.current !== isMobileNow) {
        isMobileViewRef.current = isMobileNow;
        window.scrollTo(0, 0);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className={`flex-1 ${useCompactMobileBottom ? 'mobile-safe-bottom-compact' : 'mobile-safe-bottom'} pt-16 md:pt-20`}>
        <div key={`${location.pathname}${location.search}`} className="page-transition-enter">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/products" element={<Booking />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/delivery-details" element={<ProtectedRoute><DeliveryDetails /></ProtectedRoute>} />
            <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
            <Route path="/tracking" element={<ProtectedRoute><Tracking /></ProtectedRoute>} />
            <Route path="/feedback" element={<ProtectedRoute><Feedback /></ProtectedRoute>} />
            <Route path="/my-orders" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/my-bookings" element={<ProtectedRoute><MyOrders /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* Admin routes (protected) */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminHome /></ProtectedRoute>} />
            <Route path="/admin/products" element={<ProtectedRoute requireAdmin><AdminProducts /></ProtectedRoute>} />
            <Route path="/admin/orders" element={<ProtectedRoute requireAdmin><AdminOrders /></ProtectedRoute>} />
            <Route path="/admin/customers" element={<ProtectedRoute requireSuperAdmin><AdminCustomers /></ProtectedRoute>} />
            <Route path="/admin/admins" element={<ProtectedRoute requireSuperAdmin><Admins /></ProtectedRoute>} />
            <Route path="/admin/feedback" element={<ProtectedRoute requireAdmin><AdminFeedback /></ProtectedRoute>} />

            <Route path="/about" element={<AboutUs />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </main>
      {!shouldHideFooter && <Footer />}
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
          <AuthProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
