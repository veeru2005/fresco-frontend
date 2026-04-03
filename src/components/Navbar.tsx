import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SolidUserIcon from '@/components/SolidUserIcon';
import {
  Menu,
  X,
  LogOut,
  ShoppingCart,
  House,
  Package,
  BookMarked,
  ClipboardList,
  MessageSquare,
  LayoutDashboard,
  Truck,
  Users,
  ShieldCheck,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCart } from '@/lib/cart';

const iconByName: Record<string, any> = {
  Home: House,
  Products: Package,
  Cart: ShoppingCart,
  'About Us': BookMarked,
  'My Orders': ClipboardList,
  Feedback: MessageSquare,
  'Admin Dashboard': LayoutDashboard,
  Orders: Truck,
  Customers: Users,
  Admins: ShieldCheck,
};

const renderNavIcon = (name: string, cartCount = 0, unreadFeedbackCount = 0) => {
  const Icon = iconByName[name] || Package;

  if (name === 'Cart') {
    return (
      <span className="relative inline-flex">
        <Icon className="w-4 h-4" />
        {cartCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center px-1 border border-white/50">
            {cartCount > 99 ? '99+' : cartCount}
          </span>
        )}
      </span>
    );
  }

  if (name === 'Feedback') {
    return (
      <span className="relative inline-flex">
        <Icon className="w-4 h-4" />
        {unreadFeedbackCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold leading-[18px] text-center px-1 border border-white/50">
            {unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount}
          </span>
        )}
      </span>
    );
  }

  return <Icon className="w-4 h-4" />;
};

const Navbar = () => {
  const { isAuthenticated, signOut, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [unreadFeedbackCount, setUnreadFeedbackCount] = useState(0);

  const syncCartCount = () => {
    if (!isAuthenticated) {
      setCartCount(0);
      return;
    }
    const total = getCart().reduce((sum, item) => sum + Math.max(0, Number(item.quantity || 0)), 0);
    setCartCount(total);
  };

  const handleLogout = () => {
    signOut();
    navigate('/', { replace: true });
  };

  const navLinks = isAuthenticated
    ? user?.isSuperAdmin
      ? [
          { name: 'Admin Dashboard', path: '/admin' },
          { name: 'Customers', path: '/admin/customers' },
          { name: 'Products', path: '/admin/products' },
          { name: 'Orders', path: '/admin/orders' },
          { name: 'Admins', path: '/admin/admins' },
          { name: 'Feedback', path: '/admin/feedback' },
        ]
      : user?.isAdmin
      ? [
          { name: 'Admin Dashboard', path: '/admin' },
          { name: 'Products', path: '/admin/products' },
          { name: 'Orders', path: '/admin/orders' },
          { name: 'Feedback', path: '/admin/feedback' },
        ]
      : [
          { name: 'Home', path: '/' },
          { name: 'About Us', path: '/about' },
          { name: 'Products', path: '/products' },
          { name: 'My Orders', path: '/my-orders' },
          { name: 'Feedback', path: '/feedback' },
          { name: 'Cart', path: '/cart' },
        ]
    : [
        { name: 'Home', path: '/' },
        { name: 'About Us', path: '/about' },
        { name: 'Products', path: '/products' },
        { name: 'Cart', path: '/cart' },
      ];

  const isAdminUser = Boolean(user?.isAdmin || user?.isSuperAdmin);
  const mobileBottomNames = user?.isSuperAdmin
    ? ['Admin Dashboard', 'Products', 'Orders', 'Admins', 'Feedback']
    : user?.isAdmin
    ? ['Admin Dashboard', 'Products', 'Orders', 'Feedback']
    : isAuthenticated
    ? ['Home', 'About Us', 'Products', 'My Orders', 'Cart']
    : ['Home', 'About Us', 'Products', 'Cart'];
  const mobileBottomLinks = navLinks.filter((link) => mobileBottomNames.includes(link.name));
  const mobileMenuLinksRaw = isAdminUser
    ? navLinks.filter((link) => !mobileBottomNames.includes(link.name))
    : navLinks.filter((link) => link.name === 'Feedback');
  const mobileMenuOrder = ['Feedback'];
  const mobileMenuLinks = [...mobileMenuLinksRaw].sort((a, b) => {
    const aIndex = mobileMenuOrder.indexOf(a.name);
    const bIndex = mobileMenuOrder.indexOf(b.name);
    const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex;
    const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex;
    return aRank - bRank;
  });
  const getMobileBottomLabel = (name: string) => (name === 'Admin Dashboard' ? 'Dashboard' : name);

  const isActive = (path: string) => location.pathname === path;

  const fetchUnreadFeedbackCount = async () => {
    if (!isAdminUser) { setUnreadFeedbackCount(0); return; }
    try {
      const token = localStorage.getItem('fresco_token');
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/admin/feedback`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.filter((f: any) => !f.isRead).length : 0;
        setUnreadFeedbackCount(count);
      }
    } catch (e) {
      console.error('Error fetching unread feedback count:', e);
    }
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    syncCartCount();
    fetchUnreadFeedbackCount();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('fresco_cart') || e.key === 'fresco_user') {
        syncCartCount();
      }
    };

    const onCartUpdated = () => syncCartCount();
    const onFeedbackUpdated = () => fetchUnreadFeedbackCount();
    window.addEventListener('storage', onStorage);
    window.addEventListener('fresco:cartUpdated', onCartUpdated as EventListener);
    window.addEventListener('fresco:feedbackUpdated', onFeedbackUpdated as EventListener);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('fresco:cartUpdated', onCartUpdated as EventListener);
      window.removeEventListener('fresco:feedbackUpdated', onFeedbackUpdated as EventListener);
    };
  }, [isAuthenticated, user?.email, user?.username]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#255c45] border-b border-white/20 shadow-sm text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="bg-amber-400 p-2 rounded-lg group-hover:scale-110 transition-transform duration-300 shadow-sm">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-[#255c45]" />
              </div>
              <span className="flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl font-bold text-white">Fresco</span>
                <span className="text-xl sm:text-2xl font-bold text-amber-400">Organics</span>
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path}>
                  <Button
                    variant={isActive(link.path) ? 'default' : 'ghost'}
                    className={`${isActive(link.path) ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 hover:text-slate-900' : 'text-white hover:bg-white/10 hover:text-white'} font-semibold inline-flex items-center gap-2`}
                  >
                    {renderNavIcon(link.name, cartCount, unreadFeedbackCount)}
                    {link.name}
                  </Button>
                </Link>
              ))}
            </div>

            {/* Auth Buttons */}
            <div className="hidden lg:flex items-center gap-2">
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="flex items-center p-1 pr-3 gap-2 text-white hover:text-white hover:bg-white/10 rounded-full border-2 border-white focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-white"
                    >
                      <span className="inline-flex h-8 w-8 shrink-0 aspect-square items-center justify-center rounded-full bg-amber-400 text-[#255c45]">
                        <SolidUserIcon className="w-5 h-5 flex-shrink-0" />
                      </span>
                      <span className="text-sm font-semibold !text-white">{user?.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 border-2 border-[#255c45] p-1.5">
                    <DropdownMenuItem
                      onClick={() => navigate('/profile')}
                      className="cursor-pointer font-semibold !bg-amber-400 !text-slate-900 hover:!bg-amber-500 hover:!text-slate-900 focus:!bg-amber-500 focus:!text-slate-900 data-[highlighted]:!bg-amber-500 data-[highlighted]:!text-slate-900 rounded-md transition-colors w-full"
                    >
                      <SolidUserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-[#94a3b8]/70" />
                    <DropdownMenuItem 
                      onClick={handleLogout} 
                      className="cursor-pointer font-semibold !bg-red-500 !text-white hover:!bg-red-600 hover:!text-white focus:!bg-red-600 focus:!text-white data-[highlighted]:!bg-red-600 data-[highlighted]:!text-white rounded-md transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/signin">
                    <Button variant="ghost" className="font-semibold !text-white border border-white/35 hover:bg-white/10 hover:!text-white focus-visible:!text-white inline-flex items-center gap-2 rounded-full px-4">
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold rounded-full px-5 inline-flex items-center gap-2 shadow-md">
                      <UserPlus className="w-4 h-4" />
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-x-0 top-16 md:top-20 bottom-0 z-40">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative bg-[#255c45] text-white border-t border-white/20 shadow-xl animate-in slide-in-from-top duration-200 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+12px)]">
            <div className="container mx-auto px-4 py-5">

              <div className="flex flex-col gap-2 items-center text-center">
                {mobileMenuLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive(link.path) ? 'default' : 'ghost'}
                      className={`w-full justify-center font-semibold inline-flex items-center gap-2 ${isActive(link.path) ? 'bg-amber-400 text-slate-900 hover:bg-amber-300 hover:text-slate-900' : 'text-white hover:bg-white/10 hover:text-white'}`}
                    >
                      {renderNavIcon(link.name, cartCount, unreadFeedbackCount)}
                      {link.name}
                      {link.name === 'Cart' && cartCount > 0 ? `(${cartCount > 99 ? '99+' : cartCount})` : ''}
                      {link.name === 'Feedback' && unreadFeedbackCount > 0 ? `(${unreadFeedbackCount > 99 ? '99+' : unreadFeedbackCount})` : ''}
                    </Button>
                  </Link>
                ))}

                {isAuthenticated && mobileMenuLinks.length > 0 && <div className="w-full h-px bg-white/35 my-2" />}

                {isAuthenticated ? (
                  <>
                    <div className="flex items-center justify-center gap-2 px-3 py-2 w-full">
                      <span className="inline-flex h-8 w-8 shrink-0 aspect-square items-center justify-center rounded-full bg-amber-400 text-[#255c45]">
                        <SolidUserIcon className="w-5 h-5 flex-shrink-0" />
                      </span>
                      <span className="text-sm font-semibold !text-white">{user?.username}</span>
                    </div>
                    <div className="w-full flex items-center justify-between gap-3 mt-2">
                      <Link
                        to="/profile"
                        className="flex-1"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                      <Button className="w-full justify-center font-semibold bg-amber-400 text-slate-900 hover:bg-amber-300 transition-colors shadow-md">
                          <SolidUserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                          Profile
                        </Button>
                      </Link>
                      <Button
                        onClick={() => {
                          handleLogout();
                          setMobileMenuOpen(false);
                        }}
                        className="flex-1 justify-center font-semibold bg-red-500 text-white hover:bg-red-600 hover:text-white border-red-500 transition-colors"
                      >
                        <LogOut className="w-4 h-4 mr-2 flex-shrink-0" />
                        Logout
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full flex items-center gap-3">
                      <Link to="/signin" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                        <Button variant="ghost" className="w-full justify-center font-semibold !text-white border border-white/35 hover:bg-white/10 hover:!text-white focus-visible:!text-white inline-flex items-center gap-2">
                          <LogIn className="w-4 h-4" />
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/signup" className="flex-1" onClick={() => setMobileMenuOpen(false)}>
                        <Button className="w-full justify-center bg-amber-400 text-slate-900 hover:bg-amber-300 font-semibold inline-flex items-center gap-2">
                          <UserPlus className="w-4 h-4" />
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      {mobileBottomLinks.length > 0 && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-[#255c45] border-t border-white/20 shadow-[0_-8px_24px_rgba(0,0,0,0.2)] px-2 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]">
          <div className="rounded-2xl border border-white/20 bg-[#255c45] shadow-lg px-2 py-2">
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${mobileBottomLinks.length}, minmax(0, 1fr))` }}
            >
              {mobileBottomLinks.map((link) => {
                const active = isActive(link.path);
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-xs font-semibold transition-colors ${
                      active ? 'bg-amber-400 text-slate-900' : 'text-white/90'
                    }`}
                  >
                    <span className={active ? 'text-slate-900' : 'text-white/90'}>{renderNavIcon(link.name, cartCount, unreadFeedbackCount)}</span>
                    <span className="leading-none text-[11px] text-center whitespace-nowrap">{getMobileBottomLabel(link.name)}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
