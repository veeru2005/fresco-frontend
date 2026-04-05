import { Link } from 'react-router-dom';
import { Instagram, Mail, MapPin, Phone, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Footer = () => {
  const { user, isAuthenticated } = useAuth();
  const linkedinProfileUrl = 'https://www.linkedin.com/in/veerendra-chowdary-sunkavalli-513b58309/';
  return (
    <footer className="bg-[#2f7656] border-t-2 border-amber-300/80 mt-auto text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 pb-[calc(env(safe-area-inset-bottom,0px)+6rem)] md:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative h-11 w-11 rounded-[10px] overflow-hidden bg-white shrink-0 shadow-sm">
                <img src="https://res.cloudinary.com/dv5qxkxmc/image/upload/v1775308892/2_oast1m.jpg" alt="Fresco Organics logo" className="h-full w-full object-cover scale-110" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">Fresco</span>
                <span className="text-2xl font-bold text-amber-400">Organics</span>
              </div>
            </div>
            <p className="text-sm text-white/80">
              Fresh organic fruits and vegetables<br />
              delivered with care from farm to<br />
              doorstep.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="https://www.instagram.com/fresco_organics_/" className="p-2 rounded-lg bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-1.5 hover:shadow-lg" aria-label="Instagram">
                <Instagram className="w-[20px] h-[20px]" />
              </a>
              <a href="https://chat.whatsapp.com/JNEHTwemdSX5LWENyAOOmd?mode=gi_t" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[#25D366] text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-1.5 hover:shadow-lg" aria-label="WhatsApp">
                <svg className="w-[20px] h-[20px]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M13.601 2.326A7.854 7.854 0 0 0 8.02 0C3.664 0 .128 3.535.128 7.892c0 1.393.364 2.754 1.054 3.954L0 16l4.274-1.121a7.86 7.86 0 0 0 3.745.952h.003c4.355 0 7.891-3.536 7.891-7.892a7.86 7.86 0 0 0-2.312-5.613zM8.022 14.5h-.002a6.53 6.53 0 0 1-3.327-.91l-.239-.142-2.536.666.677-2.473-.156-.254a6.52 6.52 0 0 1-1.002-3.492c0-3.605 2.933-6.538 6.54-6.538 1.746 0 3.387.68 4.622 1.916a6.495 6.495 0 0 1 1.913 4.626c-.001 3.606-2.934 6.538-6.49 6.538zm3.586-4.881c-.196-.098-1.158-.571-1.338-.636-.18-.066-.311-.098-.442.098s-.507.636-.622.767c-.114.131-.229.147-.425.049-.196-.098-.827-.305-1.576-.973-.582-.519-.975-1.16-1.089-1.356-.114-.196-.012-.302.086-.4.088-.088.196-.229.294-.343.098-.115.13-.197.196-.328.065-.131.032-.246-.017-.344-.049-.098-.442-1.066-.605-1.459-.159-.383-.32-.331-.442-.337l-.376-.007c-.13 0-.343.049-.523.246s-.687.672-.687 1.639.703 1.901.801 2.032c.098.131 1.385 2.115 3.357 2.964.469.202.835.322 1.12.412.471.149.9.128 1.24.078.378-.056 1.158-.473 1.322-.93.164-.458.164-.85.114-.931-.049-.082-.179-.131-.376-.229z" />
                </svg>
              </a>
              <a href="https://www.youtube.com/@frescoorganics" target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-[#ff0000] text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-1.5 hover:shadow-lg" aria-label="YouTube">
                <svg viewBox="0 0 24 24" className="w-[20px] h-[20px]" aria-hidden="true">
                  <rect x="1.5" y="5.25" width="21" height="13.5" rx="4" fill="#ffffff" />
                  <path d="M10 9.5L15 12L10 14.5V9.5Z" fill="#ff0000" />
                </svg>
              </a>
              <a href="https://www.linkedin.com/company/frescoorganics/" className="p-2 rounded-[6px] bg-[#0a66c2] text-white transition-all duration-300 hover:opacity-90 hover:-translate-y-1.5 hover:shadow-lg" aria-label="LinkedIn">
                <svg viewBox="0 0 32 32" className="w-[20px] h-[20px]" aria-hidden="true">
                  <path
                    fill="currentColor"
                    d="M28.778 1.004h-25.56c-0.008 0-0.017-0-0.027-0-1.199 0-2.172 0.964-2.186 2.159v25.672c0.014 1.196 0.987 2.161 2.186 2.161 0.010 0 0.019-0 0.029-0h25.555c0.008 0 0.018 0 0.028 0 1.2 0 2.175-0.963 2.194-2.159l0-0.002v-25.67c-0.019-1.197-0.994-2.161-2.195-2.161-0.010 0-0.019 0-0.029 0h0.001zM9.9 26.562h-4.454v-14.311h4.454zM7.674 10.293c-1.425 0-2.579-1.155-2.579-2.579s1.155-2.579 2.579-2.579c1.424 0 2.579 1.154 2.579 2.578v0c0 0.001 0 0.002 0 0.004 0 1.423-1.154 2.577-2.577 2.577-0.001 0-0.002 0-0.003 0h0zM26.556 26.562h-4.441v-6.959c0-1.66-0.034-3.795-2.314-3.795-2.316 0-2.669 1.806-2.669 3.673v7.082h-4.441v-14.311h4.266v1.951h0.058c0.828-1.395 2.326-2.315 4.039-2.315 0.061 0 0.121 0.001 0.181 0.003l-0.009-0c4.5 0 5.332 2.962 5.332 6.817v7.855z"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Quick Links</h3>
            <ul className="space-y-3 text-sm -ml-2 [&_a:hover]:translate-x-2">
              {isAuthenticated ? (
                user?.isAdmin ? (
                  <>
                    <li>
                      <Link to="/admin" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Admin Dashboard
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/products" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Products
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/orders" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Orders
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/customers" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Customers
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/admin/feedback" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Feedback
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <Link to="/" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Home
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/products" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Products
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/cart" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Cart
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
              
                    <li>
                      <Link to="/about" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        About Us
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
              
                    <li>
                      <Link to="/my-orders" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        My Orders
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                    <li>
                      <Link to="/feedback" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Feedback
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                      </Link>
                    </li>
                  </>
                )
              ) : (
                <>
                  <li>
                    <Link to="/" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Home
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/products" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Products
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/cart" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        Cart
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  </li>
                  <li>
                    <Link to="/about" className="group flex w-fit items-center text-white/80 hover:text-amber-400 transition-all duration-300">
                        About Us
                        <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
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

        <div className="border-t border-white/20 mt-8 pt-6 pb-4 text-sm text-white/70">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:justify-between w-full mx-auto">
            <p className="text-center sm:text-left whitespace-nowrap">&copy; {new Date().getFullYear()} Fresco Organics. All rights reserved.</p>
            <div className="flex w-full flex-nowrap items-center justify-center sm:justify-end gap-1 whitespace-nowrap text-[0.90rem] sm:text-sm leading-tight tracking-tight px-1">
              <span>Developed by</span>
              <a
                href={linkedinProfileUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-inherit hover:text-inherit cursor-pointer"
              >
                <span className="inline-flex items-center justify-center rounded-[4px] bg-[#0a66c2] p-[3px] text-white">
                  <svg
                    viewBox="0 0 32 32"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3"
                    aria-hidden="true"
                  >
                    <path
                      fill="currentColor"
                      d="M28.778 1.004h-25.56c-0.008 0-0.017-0-0.027-0-1.199 0-2.172 0.964-2.186 2.159v25.672c0.014 1.196 0.987 2.161 2.186 2.161 0.010 0 0.019-0 0.029-0h25.555c0.008 0 0.018 0 0.028 0 1.2 0 2.175-0.963 2.194-2.159l0-0.002v-25.67c-0.019-1.197-0.994-2.161-2.195-2.161-0.010 0-0.019 0-0.029 0h0.001zM9.9 26.562h-4.454v-14.311h4.454zM7.674 10.293c-1.425 0-2.579-1.155-2.579-2.579s1.155-2.579 2.579-2.579c1.424 0 2.579 1.154 2.579 2.578v0c0 0.001 0 0.002 0 0.004 0 1.423-1.154 2.577-2.577 2.577-0.001 0-0.002 0-0.003 0h0zM26.556 26.562h-4.441v-6.959c0-1.66-0.034-3.795-2.314-3.795-2.316 0-2.669 1.806-2.669 3.673v7.082h-4.441v-14.311h4.266v1.951h0.058c0.828-1.395 2.326-2.315 4.039-2.315 0.061 0 0.121 0.001 0.181 0.003l-0.009-0c4.5 0 5.332 2.962 5.332 6.817v7.855z"
                    />
                  </svg>
                </span>
                <span className="text-amber-300">S. Veerendra Chowdary</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
