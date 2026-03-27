import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Footer = () => {
  const { user, isAuthenticated } = useAuth();
  const linkedinProfileUrl = 'https://www.linkedin.com/in/veerendra-chowdary-sunkavalli-513b58309/';
  return (
    <footer className="bg-[#2f7656] border-t border-white/15 mt-auto text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] md:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Fresco Organics</h3>
            <p className="text-sm text-white/80">
              Fresh organic fruits and vegetables delivered with care from farm to doorstep.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-white/15 hover:bg-amber-400 hover:text-slate-900 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/15 hover:bg-amber-400 hover:text-slate-900 transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/15 hover:bg-amber-400 hover:text-slate-900 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-white/15 hover:bg-amber-400 hover:text-slate-900 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {isAuthenticated ? (
                user?.isAdmin ? (
                  <>
                    <li>
                      <Link to="/admin" className="text-white/80 hover:text-amber-300 transition-colors">Admin Dashboard</Link>
                    </li>
                    <li>
                      <Link to="/admin/products" className="text-white/80 hover:text-amber-300 transition-colors">Products</Link>
                    </li>
                    <li>
                      <Link to="/admin/orders" className="text-white/80 hover:text-amber-300 transition-colors">Orders</Link>
                    </li>
                    <li>
                      <Link to="/admin/customers" className="text-white/80 hover:text-amber-300 transition-colors">Customers</Link>
                    </li>
                    <li>
                      <Link to="/admin/feedback" className="text-white/80 hover:text-amber-300 transition-colors">Feedback</Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/" className="text-white/80 hover:text-amber-300 transition-colors">Home</Link>
                    </li>
                    <li>
                      <Link to="/products" className="text-white/80 hover:text-amber-300 transition-colors">Products</Link>
                    </li>
                    <li>
                      <Link to="/cart" className="text-white/80 hover:text-amber-300 transition-colors">Cart</Link>
                    </li>
              
                    <li>
                      <Link to="/about" className="text-white/80 hover:text-amber-300 transition-colors">About Us</Link>
                    </li>
              
                    <li>
                      <Link to="/my-orders" className="text-white/80 hover:text-amber-300 transition-colors">My Orders</Link>
                    </li>
                      <li>
                      <Link to="/feedback" className="text-white/80 hover:text-amber-300 transition-colors">Feedback</Link>
                    </li>
                  </>
                )
              ) : (
                <>
                  <li>
                    <Link to="/" className="text-white/80 hover:text-amber-300 transition-colors">Home</Link>
                  </li>
                  <li>
                    <Link to="/products" className="text-white/80 hover:text-amber-300 transition-colors">Products</Link>
                  </li>
                  <li>
                    <Link to="/cart" className="text-white/80 hover:text-amber-300 transition-colors">Cart</Link>
                  </li>
                  <li>
                    <Link to="/about" className="text-white/80 hover:text-amber-300 transition-colors">About Us</Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Delivery Areas</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span className="text-white/80">Mangalagiri</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span className="text-white/80">Vadeswaram</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span className="text-white/80">KL University</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span className="text-white/80">WhatsApp +91 9110380467</span>
              </li>
               <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-300 flex-shrink-0" />
                <span className="text-white/80">frescoorganics20@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/20 mt-8 pt-6 pb-2 text-sm text-white/70">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between w-full mx-auto">
            <p className="text-center sm:text-left whitespace-nowrap">&copy; {new Date().getFullYear()} Fresco Organics. All rights reserved.</p>
            <div className="flex w-full flex-nowrap items-center justify-center sm:justify-end gap-1 whitespace-nowrap text-[0.55rem] sm:text-sm leading-tight tracking-tight px-1">
              <span>Developed by</span>
              <a
                href={linkedinProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-inherit hover:text-inherit cursor-pointer"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 32 32"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    fill="#000000"
                    d="M28.778 1.004h-25.56c-0.008 0-0.017-0-0.027-0-1.199 0-2.172 0.964-2.186 2.159v25.672c0.014 1.196 0.987 2.161 2.186 2.161 0.010 0 0.019-0 0.029-0h25.555c0.008 0 0.018 0 0.028 0 1.2 0 2.175-0.963 2.194-2.159l0-0.002v-25.67c-0.019-1.197-0.994-2.161-2.195-2.161-0.010 0-0.019 0-0.029 0h0.001zM9.9 26.562h-4.454v-14.311h4.454zM7.674 10.293c-1.425 0-2.579-1.155-2.579-2.579s1.155-2.579 2.579-2.579c1.424 0 2.579 1.154 2.579 2.578v0c0 0.001 0 0.002 0 0.004 0 1.423-1.154 2.577-2.577 2.577-0.001 0-0.002 0-0.003 0h0zM26.556 26.562h-4.441v-6.959c0-1.66-0.034-3.795-2.314-3.795-2.316 0-2.669 1.806-2.669 3.673v7.082h-4.441v-14.311h4.266v1.951h0.058c0.828-1.395 2.326-2.315 4.039-2.315 0.061 0 0.121 0.001 0.181 0.003l-0.009-0c4.5 0 5.332 2.962 5.332 6.817v7.855z"
                  />
                </svg>
                <span className="text-inherit">S. Veerendra Chowdary</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
