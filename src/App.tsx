import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Suspense, lazy, useEffect, useLayoutEffect, useRef } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

const queryClient = new QueryClient();
const SignIn = lazy(() => import("./pages/SignIn"));
const SignUp = lazy(() => import("./pages/SignUp"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Booking = lazy(() => import("./pages/Booking"));
const Cart = lazy(() => import("./pages/Cart"));
const DeliveryDetails = lazy(() => import("./pages/DeliveryDetails"));
const Payment = lazy(() => import("./pages/Payment"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const Tracking = lazy(() => import("./pages/Tracking"));
const Feedback = lazy(() => import("./pages/Feedback"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const MyOrders = lazy(() => import("./pages/MyOrders"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminHome = lazy(() => import("./pages/admin/AdminHome"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminCustomers = lazy(() => import("./pages/admin/Customers"));
const AdminFeedback = lazy(() => import("./pages/admin/Feedback"));
const Admins = lazy(() => import("./pages/admin/Admins"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RoleBasedHome = () => {
  const { isAuthReady, isAuthenticated, user } = useAuth();

  if (!isAuthReady) {
    return <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading...</div>;
  }

  if (isAuthenticated && (user?.isAdmin || user?.isSuperAdmin)) {
    return <Navigate to="/admin" replace />;
  }

  return <Dashboard />;
};

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
          <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading...</div>}>
            <Routes>
              <Route path="/" element={<RoleBasedHome />} />
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/dashboard" element={<RoleBasedHome />} />
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
          </Suspense>
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
